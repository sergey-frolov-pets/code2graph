<script setup lang="ts">
import { computed } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import FileBadgeIcon from "@/components/icons/FileBadgeIcon.vue";
import IconButton from "@/components/IconButton.vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import ToolbarOverflowMenu from "@/components/ui/ToolbarOverflowMenu.vue";
import PanelFullscreenButton from "@/components/PanelFullscreenButton.vue";
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
import { DIAGRAM_LANGUAGE_MODULES, getLanguageModule } from "@/languages/registry";
import { isLocaleKey } from "@/locales/types";
import { SNIPPETS_KEYBOARD_SHORTCUT } from "@/constants/snippets-settings";

const props = defineProps<{
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
  snippetsOpen: boolean;
  isFullscreen: boolean;
}>();

const emit = defineEmits<{
  openFile: [];
  openVersions: [];
  savePuml: [];
  saveToLibrary: [];
  aiPatch: [];
  aiSyntaxAsk: [];
  validateSyntax: [];
  undo: [];
  redo: [];
  clear: [];
  convert: [];
  toggleSnippets: [];
  loadSample: [selection: SampleSelection];
  changeFormat: [format: DiagramFormat];
  toggleFullscreen: [];
}>();

const { t } = useLocale();

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
      },
    ];
  }),
);

const validateLabel = computed(() =>
  props.isValidating ? t("editor.validating") : t("editor.validate"),
);

const showAiAssistantMenu = computed(
  () =>
    props.formatDefinition.supportsAiPatch &&
    props.formatDefinition.supportsAiSyntaxAsk,
);

const aiAssistantMenuGroups = computed(() => [
  {
    id: "ai",
    label: "",
    actions: [
      {
        id: "patch",
        label: t("editor.aiPatch"),
        icon: "ai" as const,
        disabled: !props.canAiPatch,
      },
      {
        id: "syntax-ask",
        label: t("editor.aiSyntaxAsk"),
        icon: "syntax-help" as const,
        disabled: !props.canAiSyntaxAsk,
      },
    ],
  },
]);

function onAiAssistantAction(actionId: string): void {
  if (actionId === "patch") {
    emit("aiPatch");
    return;
  }

  if (actionId === "syntax-ask") {
    emit("aiSyntaxAsk");
  }
}

const titleTooltip = computed(() => t(languageModule.value.titleTooltipKey));

const saveLabel = computed(() => t(languageModule.value.saveFileKey));

const saveBadgeFormat = computed(() => languageModule.value.fileBadge);

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
      <h2 class="panel-title panel-title--editor" :title="titleTooltip">
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
      <IconButton :label="openFileLabel" @click="emit('openFile')">
        <ActionIcon name="folder-open" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="t('editor.versions')"
        @click="emit('openVersions')"
      >
        <ActionIcon name="history" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.supportsSaveSource"
        :label="saveLabel"
        primary
        format
        :disabled="!canSave"
        @click="emit('savePuml')"
      >
        <FileBadgeIcon :format="saveBadgeFormat" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="t('editor.saveToLibrary')"
        primary
        format
        :disabled="!canSave"
        @click="emit('saveToLibrary')"
      >
        <ActionIcon name="library" />
      </IconButton>
      <ToolbarOverflowMenu
        v-if="showAiAssistantMenu"
        :label="t('editor.aiAssistant')"
        icon="ai"
        :groups="aiAssistantMenuGroups"
        @action="onAiAssistantAction"
      />
      <IconButton
        v-else-if="formatDefinition.supportsAiPatch"
        :label="t('editor.aiPatch')"
        :disabled="!canAiPatch"
        prevent-mousedown-default
        @click="emit('aiPatch')"
      >
        <ActionIcon name="ai" />
      </IconButton>
      <IconButton
        v-else-if="formatDefinition.supportsAiSyntaxAsk"
        :label="t('editor.aiSyntaxAsk')"
        :disabled="!canAiSyntaxAsk"
        prevent-mousedown-default
        @click="emit('aiSyntaxAsk')"
      >
        <ActionIcon name="syntax-help" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.supportsSyntaxValidation"
        :label="validateLabel"
        :disabled="isValidating || isRendering"
        @click="emit('validateSyntax')"
      >
        <ActionIcon name="check" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="t('editor.undo')"
        :disabled="!canUndo"
        @click="emit('undo')"
      >
        <ActionIcon name="undo" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="t('editor.redo')"
        :disabled="!canRedo"
        @click="emit('redo')"
      >
        <ActionIcon name="redo" />
      </IconButton>
      <IconButton
        :label="t('editor.convertTooltip')"
        :disabled="!canConvert"
        @click="emit('convert')"
      >
        <ActionIcon name="transfer" />
      </IconButton>
      <IconButton
        :label="t('editor.clear')"
        :disabled="!canClear"
        @click="emit('clear')"
      >
        <ActionIcon name="trash" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.supportsSnippets"
        :label="`${t('editor.snippets')} (${SNIPPETS_KEYBOARD_SHORTCUT})`"
        :pressed="snippetsOpen"
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
