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
  MERMAID_SAMPLE_IDS,
  PLANTUML_SAMPLE_IDS,
  type MermaidSampleId,
  type PlantUmlSampleId,
  type SampleSelection,
} from "@/constants/sample-diagrams";
import type { DiagramFormatDefinition } from "@/constants/diagram-formats";
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
  toggleFullscreen: [];
}>();

const { t } = useLocale();

const plantUmlSampleOptions = computed(() =>
  PLANTUML_SAMPLE_IDS.map((id) => ({
    value: `plantuml:${id}`,
    label: t(`samples.plantuml.${id}`),
  })),
);

const mermaidSampleOptions = computed(() =>
  MERMAID_SAMPLE_IDS.map((id) => ({
    value: `mermaid:${id}`,
    label: t(`samples.mermaid.${id}`),
  })),
);

const validateLabel = computed(() =>
  props.isValidating ? t("editor.validating") : t("editor.validate"),
);

const formatBadgeLabel = computed(() =>
  t(`editor.format.${props.formatDefinition.id}`),
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

const titleTooltip = computed(() =>
  t(`editor.titleTooltip.${props.formatDefinition.id}`),
);

const saveLabel = computed(() => {
  if (props.formatDefinition.id === "mermaid") {
    return t("editor.saveMermaid");
  }
  if (props.formatDefinition.id === "graphml") {
    return t("editor.saveGraphml");
  }
  return t("app.savePuml");
});

const saveBadgeFormat = computed<"PUML" | "MMD" | "GML">(() => {
  if (props.formatDefinition.id === "mermaid") {
    return "MMD";
  }
  if (props.formatDefinition.id === "graphml") {
    return "GML";
  }
  return "PUML";
});

const openFileLabel = computed(() => {
  if (props.formatDefinition.id === "graphml") {
    return t("editor.openGraphml");
  }
  if (props.formatDefinition.id === "mermaid") {
    return t("editor.openMermaid");
  }
  return t("editor.openPuml");
});

function parseSampleSelection(value: string): SampleSelection | null {
  const separatorIndex = value.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }

  const format = value.slice(0, separatorIndex);
  const id = value.slice(separatorIndex + 1);

  if (
    format === "plantuml" &&
    (PLANTUML_SAMPLE_IDS as readonly string[]).includes(id)
  ) {
    return { format: "plantuml", id: id as PlantUmlSampleId };
  }

  if (
    format === "mermaid" &&
    (MERMAID_SAMPLE_IDS as readonly string[]).includes(id)
  ) {
    return { format: "mermaid", id: id as MermaidSampleId };
  }

  return null;
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
      <span class="panel-title__badge panel-title__badge--format" :title="titleTooltip">
        {{ formatBadgeLabel }}
      </span>
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
        v-if="formatDefinition.supportsSamples"
        :label="t('editor.samplesTooltip')"
      >
        <label class="sample-select-wrap">
          <span class="sr-only">{{ t("editor.sampleOption") }}</span>
          <select
            class="select sample-select"
            :title="t('editor.samplesTooltip')"
            @change="onSampleChange"
          >
            <option value="" selected disabled>{{ t("editor.samples") }}</option>
            <optgroup :label="t('editor.samplesPlantUml')">
              <option
                v-for="sample in plantUmlSampleOptions"
                :key="sample.value"
                :value="sample.value"
              >
                {{ sample.label }}
              </option>
            </optgroup>
            <optgroup :label="t('editor.samplesMermaid')">
              <option
                v-for="sample in mermaidSampleOptions"
                :key="sample.value"
                :value="sample.value"
              >
                {{ sample.label }}
              </option>
            </optgroup>
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
