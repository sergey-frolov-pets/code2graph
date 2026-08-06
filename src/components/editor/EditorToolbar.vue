<script setup lang="ts">
import { computed } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import FileBadgeIcon from "@/components/icons/FileBadgeIcon.vue";
import IconButton from "@/components/IconButton.vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import PanelFullscreenButton from "@/components/PanelFullscreenButton.vue";
import { useLocale } from "@/composables/useLocale";
import {
  SAMPLE_DIAGRAM_IDS,
  getSampleDiagramSource,
  type SampleDiagramId,
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
  canAiPatch: boolean;
  snippetsOpen: boolean;
  isFullscreen: boolean;
}>();

const emit = defineEmits<{
  openFile: [];
  openVersions: [];
  savePuml: [];
  saveToLibrary: [];
  aiPatch: [];
  validateSyntax: [];
  undo: [];
  redo: [];
  clear: [];
  toggleSnippets: [];
  loadSample: [id: SampleDiagramId];
  toggleFullscreen: [];
}>();

const { t, locale } = useLocale();

const sampleOptions = computed(() =>
  SAMPLE_DIAGRAM_IDS.map((id) => ({
    id,
    label: t(`samples.${id}`),
    source: getSampleDiagramSource(id, locale.value),
  })),
);

const validateLabel = computed(() =>
  props.isValidating ? t("editor.validating") : t("editor.validate"),
);

const saveLabel = computed(() =>
  props.formatDefinition.id === "mermaid"
    ? t("editor.saveMermaid")
    : t("app.savePuml"),
);

const openFileLabel = computed(() => {
  if (props.formatDefinition.id === "graphml") {
    return t("editor.openGraphml");
  }
  if (props.formatDefinition.id === "mermaid") {
    return t("editor.openMermaid");
  }
  return t("editor.openPuml");
});
</script>

<template>
  <header class="panel-header">
    <h2 class="panel-title" :title="t('editor.titleTooltip')">
      {{ t("editor.title") }}
      <span
        v-if="!formatDefinition.editable"
        class="panel-title__badge"
      >
        {{ t("editor.viewOnly") }}
      </span>
    </h2>
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
        <FileBadgeIcon :format="formatDefinition.id === 'mermaid' ? 'PUML' : 'PUML'" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.editable"
        :label="t('editor.saveToLibrary')"
        :disabled="!canSave"
        @click="emit('saveToLibrary')"
      >
        <ActionIcon name="library" />
      </IconButton>
      <IconButton
        v-if="formatDefinition.supportsAiPatch"
        :label="t('editor.aiPatch')"
        :disabled="!canAiPatch"
        prevent-mousedown-default
        @click="emit('aiPatch')"
      >
        <ActionIcon name="ai" />
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
            @change="
              emit(
                'loadSample',
                ($event.target as HTMLSelectElement).value as SampleDiagramId,
              )
            "
          >
            <option value="" selected disabled>{{ t("editor.samples") }}</option>
            <option
              v-for="sample in sampleOptions"
              :key="sample.id"
              :value="sample.id"
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
.panel-title__badge {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 600;
  vertical-align: middle;
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
