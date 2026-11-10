<script setup lang="ts">
import { computed, onMounted } from "vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import ToolbarOverflowMenu from "@/components/ui/ToolbarOverflowMenu.vue";
import type { ToolbarMenuAction } from "@/components/ui/ToolbarOverflowMenu.vue";
import PanelFullscreenButton from "@/components/PanelFullscreenButton.vue";
import { useHasActiveLlm } from "@/composables/useHasActiveLlm";
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
    canAiPatch: boolean;
    canAiSyntaxAsk: boolean;
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
  aiPatch: [];
  aiSyntaxAsk: [];
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
const { hasActiveLlm, refreshActiveLlmAvailability } = useHasActiveLlm();
const allowAi = useFeatureGate("editor.ai");
const allowCopySource = useFeatureGate("editor.copySource");
const allowSnippets = useFeatureGate("editor.snippets");

onMounted(() => {
  void refreshActiveLlmAvailability();
});

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

const showAiControls = computed(
  () =>
    allowAi.value &&
    hasActiveLlm.value &&
    (props.formatDefinition.supportsAiPatch ||
      props.formatDefinition.supportsAiSyntaxAsk ||
      props.formatDefinition.supportsSyntaxValidation),
);

const aiAssistantMenuGroups = computed(() => {
  const actions: ToolbarMenuAction[] = [];
  if (props.formatDefinition.supportsAiPatch) {
    actions.push({
      id: "patch",
      label: t("editor.aiPatch"),
      icon: "ai",
      disabled: !props.canAiPatch,
    });
  }
  if (props.formatDefinition.supportsAiSyntaxAsk) {
    actions.push({
      id: "syntax-ask",
      label: t("editor.aiSyntaxAsk"),
      icon: "syntax-help",
      disabled: !props.canAiSyntaxAsk,
    });
  }
  if (props.formatDefinition.supportsSyntaxValidation) {
    actions.push({
      id: "validate",
      label: t("editor.validate"),
      icon: "syntax-help",
      disabled: props.isValidating,
    });
  }
  return [{ id: "ai", label: "", actions }];
});

function onAiAssistantAction(actionId: string): void {
  if (actionId === "patch") {
    emit("aiPatch");
    return;
  }

  if (actionId === "syntax-ask") {
    emit("aiSyntaxAsk");
    return;
  }

  if (actionId === "validate") {
    emit("validateSyntax");
  }
}

const fileMenuGroups = computed(() => {
  const actions: ToolbarMenuAction[] = [
    {
      id: "open",
      label: openFileLabel.value,
      icon: "folder-open" as const,
    },
  ];

  if (props.formatDefinition.editable) {
    actions.push({
      id: "versions",
      label: t("editor.versions"),
      icon: "history" as const,
    });
  }

  if (props.formatDefinition.supportsSaveSource) {
    actions.push({
      id: "save",
      label: saveLabel.value,
      icon: "save" as const,
      disabled: !props.canSave || !allowCopySource.value,
    });
  }

  if (props.formatDefinition.editable) {
    actions.push({
      id: "save-library",
      label: t("editor.saveToLibrary"),
      icon: "library" as const,
      disabled: !props.canSave || !allowCopySource.value,
    });
  }

  return [{ id: "file", label: "", actions }];
});

const editMenuGroups = computed(() => {
  const actions: ToolbarMenuAction[] = [];

  if (props.formatDefinition.editable && props.canPasteTable) {
    actions.push({
      id: "paste-table",
      label: t("editor.pasteTable"),
      icon: "table-paste" as const,
      disabled: props.isRendering,
    });
  }

  if (props.canRefreshData) {
    actions.push({
      id: "refresh-data",
      label: t("library.refreshDiagramData"),
      icon: "refresh" as const,
      disabled: props.isRendering,
    });
  }

  if (props.formatDefinition.editable) {
    actions.push(
      {
        id: "session",
        label: props.sessionFileShowsBaseline
          ? t("editor.sessionToggleFileCurrent")
          : t("editor.sessionToggleFile"),
        icon: "session-compare" as const,
        disabled: !props.canToggleSessionFile,
        pressed: props.sessionFileShowsBaseline,
      },
      {
        id: "undo",
        label: t("editor.undo"),
        icon: "undo" as const,
        disabled: !props.canUndo,
      },
      {
        id: "redo",
        label: t("editor.redo"),
        icon: "redo" as const,
        disabled: !props.canRedo,
      },
    );
  }

  actions.push(
    {
      id: "convert",
      label: t("editor.convertTooltip"),
      icon: "transfer" as const,
      disabled: !props.canConvert,
    },
    {
      id: "clear",
      label: t("editor.clear"),
      icon: "trash" as const,
      disabled: !props.canClear,
    },
  );

  if (props.formatDefinition.supportsSnippets) {
    actions.push({
      id: "snippets",
      label: `${t("editor.snippets")} (${SNIPPETS_KEYBOARD_SHORTCUT})`,
      icon: "snippets" as const,
      disabled: !allowSnippets.value,
      pressed: props.snippetsOpen,
    });
  }

  return [{ id: "edit", label: "", actions }];
});

function onFileAction(actionId: string): void {
  if (actionId === "open") emit("openFile");
  if (actionId === "versions") emit("openVersions");
  if (actionId === "save") emit("savePuml");
  if (actionId === "save-library") emit("saveToLibrary");
}

function onEditAction(actionId: string): void {
  if (actionId === "paste-table") emit("pasteTable");
  if (actionId === "refresh-data") emit("refreshData");
  if (actionId === "session") emit("toggleSessionFile");
  if (actionId === "undo") emit("undo");
  if (actionId === "redo") emit("redo");
  if (actionId === "convert") emit("convert");
  if (actionId === "clear") emit("clear");
  if (actionId === "snippets") emit("toggleSnippets");
}

const titleTooltip = computed(() => t(languageModule.value.titleTooltipKey));

const saveLabel = computed(() => t(languageModule.value.saveFileKey));

const openFileLabel = computed(() => t(languageModule.value.openFileKey));

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
      <ToolbarOverflowMenu
        :label="t('editor.fileMenu')"
        icon="folder-open"
        :groups="fileMenuGroups"
        @action="onFileAction"
      />
      <ToolbarOverflowMenu
        :label="t('editor.editMenu')"
        icon="edit"
        :groups="editMenuGroups"
        @action="onEditAction"
      />
      <ToolbarOverflowMenu
        v-if="showAiControls"
        :label="t('editor.aiAssistant')"
        icon="ai"
        :groups="aiAssistantMenuGroups"
        @action="onAiAssistantAction"
      />
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
