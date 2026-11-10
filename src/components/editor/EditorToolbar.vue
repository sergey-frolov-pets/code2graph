<script setup lang="ts">
import { computed } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import FileBadgeIcon from "@/components/icons/FileBadgeIcon.vue";
import IconButton from "@/components/IconButton.vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import PanelFullscreenButton from "@/components/PanelFullscreenButton.vue";
import { useFeatureGate } from "@/composables/useFeatureGate";
import { useLocale } from "@/composables/useLocale";
import {
  listSampleIds,
  parseSampleSelection,
  type SampleSelection,
} from "@/constants/sample-diagrams";
import {
  isDiagramFormat,
  type DiagramFormat,
  type DiagramFormatDefinition,
} from "@/constants/diagram-formats";
import { isMermaidExtSampleId } from "@/constants/mermaid-sample-diagrams";
import { DIAGRAM_LANGUAGE_MODULES, getLanguageModule } from "@/languages/registry";
import { isLocaleKey } from "@/locales/types";
import { SNIPPETS_KEYBOARD_SHORTCUT } from "@/constants/snippets-settings";

const props = withDefaults(
  defineProps<{
    formatDefinition: DiagramFormatDefinition;
    canSave: boolean;
    isValidating: boolean;
    isRendering: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
    canClear: boolean;
    canConvert: boolean;
    canPasteTable?: boolean;
    canRefreshData?: boolean;
    snippetsOpen: boolean;
    isFullscreen: boolean;
    surfaceMode: "code" | "builder" | "ai-chat";
    builderAvailable: boolean;
    aiChatAvailable?: boolean;
    canToggleSessionFile?: boolean;
    sessionFileShowsBaseline?: boolean;
  }>(),
  {
    canToggleSessionFile: false,
    sessionFileShowsBaseline: false,
  },
);

const emit = defineEmits<{
  openFile: [];
  openVersions: [];
  savePuml: [];
  saveToLibrary: [];
  pasteTable: [];
  refreshData: [];
  setSurfaceMode: [mode: "code" | "builder" | "ai-chat"];
  validateSyntax: [];
  undo: [];
  redo: [];
  clear: [];
  convert: [];
  toggleSnippets: [];
  loadSample: [selection: SampleSelection];
  changeFormat: [format: DiagramFormat];
  toggleFullscreen: [];
  toggleSessionFile: [];
}>();

const { t } = useLocale();
const allowCopySource = useFeatureGate("editor.copySource");
const allowSnippets = useFeatureGate("editor.snippets");

const languageModule = computed(() =>
  getLanguageModule(props.formatDefinition.id),
);

const sampleOptions = computed(() =>
  listSampleIds(props.formatDefinition.id).flatMap((id) => {
    const key = `samples.${props.formatDefinition.id}.${id}`;
    if (!isLocaleKey(key)) {
      return [];
    }

    return [
      {
        value: `${props.formatDefinition.id}:${id}`,
        label: t(key),
        ext: props.formatDefinition.id === "mermaid" && isMermaidExtSampleId(id),
      },
    ];
  }),
);


const titleTooltip = computed(() => t(languageModule.value.titleTooltipKey));

const saveLabel = computed(() => t(languageModule.value.saveFileKey));

const saveBadgeFormat = computed(() => languageModule.value.fileBadge);

const openFileLabel = computed(() => t(languageModule.value.openFileKey));

const canCopySource = computed(() => props.canSave && allowCopySource.value);

const sessionToggleLabel = computed(() =>
  props.sessionFileShowsBaseline
    ? t("editor.sessionToggleFileCurrent")
    : t("editor.sessionToggleFile"),
);

function onFormatChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (!isDiagramFormat(value) || value === props.formatDefinition.id) {
    return;
  }

  emit("changeFormat", value);
}

function onSampleChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  const selection = parseSampleSelection(value);
  if (!selection) {
    return;
  }
  emit("loadSample", selection);
  (event.target as HTMLSelectElement).value = "";
}
</script>

<template>
  <header class="panel-header">
    <div class="panel-title-group">
      <div
        v-if="builderAvailable || aiChatAvailable"
        class="editor-surface-switch"
        role="radiogroup"
        :aria-label="t('editor.surface.label')"
      >
        <button
          type="button"
          class="editor-surface-switch__option"
          role="radio"
          :aria-checked="surfaceMode === 'code'"
          :class="{ 'is-active': surfaceMode === 'code' }"
          data-testid="editor-surface-code"
          @click="emit('setSurfaceMode', 'code')"
        >
          {{ t("editor.title") }}
        </button>
        <button
          v-if="builderAvailable"
          type="button"
          class="editor-surface-switch__option"
          role="radio"
          :aria-checked="surfaceMode === 'builder'"
          :class="{ 'is-active': surfaceMode === 'builder' }"
          data-testid="editor-surface-builder"
          @click="emit('setSurfaceMode', 'builder')"
        >
          {{ t("editor.surface.builder") }}
        </button>
        <button
          v-if="aiChatAvailable"
          type="button"
          class="editor-surface-switch__option"
          role="radio"
          :aria-checked="surfaceMode === 'ai-chat'"
          :class="{ 'is-active': surfaceMode === 'ai-chat' }"
          data-testid="editor-surface-ai-chat"
          @click="emit('setSurfaceMode', 'ai-chat')"
        >
          {{ t("editor.surface.aiChat") }}
        </button>
      </div>
      <h2
        v-else
        class="panel-title panel-title--editor"
        :title="titleTooltip"
      >
        {{ t("editor.title") }}
      </h2>
      <label class="format-select-wrap">
        <span class="sr-only">{{ t("editor.language") }}</span>
        <select
          class="select format-select"
          :value="formatDefinition.id"
          :title="titleTooltip"
          :aria-label="t('editor.language')"
          @change="onFormatChange"
        >
          <option
            v-for="module in DIAGRAM_LANGUAGE_MODULES"
            :key="module.id"
            :value="module.id"
          >
            {{ t(module.labelKey) }}
          </option>
        </select>
      </label>
      <span
        v-if="!formatDefinition.editable"
        class="panel-title__badge panel-title__badge--muted"
      >
        {{ t("editor.viewOnly") }}
      </span>
    </div>

    <div class="panel-header__toolbar">
      <IconButton
        :label="openFileLabel"
        data-testid="editor-open-file"
        @click="emit('openFile')"
      >
        <ActionIcon name="folder-open" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="t('editor.versions')"
        data-testid="editor-versions"
        @click="emit('openVersions')"
      >
        <ActionIcon name="history" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.supportsSaveSource"
        :label="saveLabel"
        primary
        format
        :disabled="!canCopySource"
        data-testid="editor-save-file"
        @click="emit('savePuml')"
      >
        <FileBadgeIcon :format="saveBadgeFormat" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="t('editor.saveToLibrary')"
        primary
        format
        :disabled="!canCopySource"
        data-testid="editor-save-library"
        @click="emit('saveToLibrary')"
      >
        <ActionIcon name="library" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable && canPasteTable"
        :label="t('editor.pasteTable')"
        :disabled="isRendering"
        data-testid="editor-paste-table-button"
        @click="emit('pasteTable')"
      >
        <ActionIcon name="table-paste" />
      </IconButton>
      <IconButton
        v-if="canRefreshData"
        :label="t('library.refreshDiagramData')"
        :disabled="isRendering"
        data-testid="editor-refresh-data-button"
        @click="emit('refreshData')"
      >
        <ActionIcon name="refresh" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="sessionToggleLabel"
        :pressed="sessionFileShowsBaseline"
        :disabled="!canToggleSessionFile"
        data-testid="editor-session-file-toggle"
        @click="emit('toggleSessionFile')"
      >
        <ActionIcon name="session-compare" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="t('editor.undo')"
        :disabled="!canUndo"
        data-testid="editor-undo"
        @click="emit('undo')"
      >
        <ActionIcon name="undo" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="t('editor.redo')"
        :disabled="!canRedo"
        data-testid="editor-redo"
        @click="emit('redo')"
      >
        <ActionIcon name="redo" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.supportsSyntaxValidation"
        :label="t('editor.validate')"
        :disabled="isValidating"
        data-testid="editor-validate"
        @click="emit('validateSyntax')"
      >
        <ActionIcon name="syntax-help" />
      </IconButton>
      <IconButton
        :label="t('editor.convertTooltip')"
        :disabled="!canConvert"
        data-testid="editor-convert"
        @click="emit('convert')"
      >
        <ActionIcon name="transfer" />
      </IconButton>
      <IconButton
        :label="t('editor.clear')"
        :disabled="!canClear"
        data-testid="editor-clear"
        @click="emit('clear')"
      >
        <ActionIcon name="trash" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.supportsSnippets"
        :label="`${t('editor.snippets')} (${SNIPPETS_KEYBOARD_SHORTCUT})`"
        :pressed="snippetsOpen"
        :disabled="!allowSnippets"
        data-testid="editor-snippets"
        @click="emit('toggleSnippets')"
      >
        <ActionIcon name="snippets" />
      </IconButton>
      <TooltipWrap
        v-if="formatDefinition.supportsSamples && sampleOptions.length > 0"
        :label="t('editor.samplesTooltip')"
      >
        <label class="sample-select-wrap">
          <span class="sr-only">{{ t("editor.sampleOption") }}</span>
          <select
            class="select sample-select"
            :title="t('editor.samplesTooltip')"
            value=""
            @change="onSampleChange"
          >
            <option
              value=""
              selected
              disabled
            >
              {{ t("editor.samples") }}
            </option>
            <option
              v-for="sample in sampleOptions"
              :key="sample.value"
              :value="sample.value"
              :class="{ 'sample-option--ext': sample.ext }"
              :style="sample.ext ? { fontStyle: 'italic' } : undefined"
            >
              {{ sample.label }}
            </option>
          </select>
        </label>
      </TooltipWrap>
    </div>

    <PanelFullscreenButton
      :active="isFullscreen"
      @toggle="emit('toggleFullscreen')"
    />
  </header>
</template>

<style scoped>
.panel-title-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  min-width: 0;
  overflow: visible;
}

.editor-surface-switch {
  display: inline-flex;
  align-items: stretch;
  flex: 0 0 auto;
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface);
}

.editor-surface-switch__option {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
  padding: 5px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.editor-surface-switch__option.is-active {
  background: color-mix(in srgb, var(--accent) 18%, var(--surface));
  color: var(--accent);
}

.panel-title--editor {
  max-width: none;
  overflow: visible;
  flex: 0 0 auto;
}

.panel-title__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  flex-shrink: 0;
}

.panel-title__badge--format {
  border: 1px solid var(--border);
  background: var(--surface-muted);
  color: var(--text-muted);
}

.panel-title__badge--muted {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
}

.format-select-wrap {
  display: inline-flex;
  margin: 0;
  flex: 0 0 auto;
}

.format-select {
  height: 28px;
  min-height: 28px;
  max-width: 132px;
  padding: 0 24px 0 8px;
  font-size: 0.72rem;
  font-weight: 600;
}

.sample-select-wrap {
  display: inline-flex;
  flex: 1 1 auto;
  min-width: 96px;
  margin: 0;
}

.sample-select {
  width: 100%;
  min-width: 0;
  height: 32px;
  min-height: 32px;
  padding: 0 8px;
  font-size: 0.78rem;
}

.sample-option--ext {
  font-style: italic;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
