<script setup lang="ts">
import { ref, toRef } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import WizardProgressSteps from "@/components/wizard/WizardProgressSteps.vue";
import { reportTablePasteError } from "@/composables/useTablePasteError";
import WizardStepContent from "@/components/wizard/WizardStepContent.vue";
import { useInlineDiagramBuilder } from "@/composables/wizard/useInlineDiagramBuilder";
import { useLocale } from "@/composables/useLocale";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { TablePasteErrorInfo } from "@/services/table-paste/types";

const source = defineModel<string>("source", { required: true });

const props = defineProps<{
  format: DiagramFormat;
}>();

const { t } = useLocale();
const active = ref(true);

const {
  stepIndex,
  steps,
  currentStepId,
  canGoNext,
  builderState,
  selectStep,
  goBack,
  goNext,
  handleBuilderChange,
  handleBuilderPasteSource,
} = useInlineDiagramBuilder({
  active,
  source,
  format: toRef(props, "format"),
});

function onBuilderPasteError(error: TablePasteErrorInfo): void {
  reportTablePasteError(error);
}
</script>

<template>
  <div
    class="inline-builder"
    data-testid="inline-diagram-builder"
  >
    <header class="inline-builder__header">
      <h3 class="inline-builder__title">
        {{ t("editor.surface.builderTitle") }}
      </h3>
      <p class="inline-builder__lead">
        {{ t("editor.surface.builderLead") }}
      </p>
    </header>

    <WizardProgressSteps
      :steps="steps"
      :step-index="stepIndex"
      clickable
      @select-step="selectStep"
    />

    <div class="inline-builder__scroll">
      <WizardStepContent
        v-model:builder-state="builderState"
        :current-step-id="currentStepId"
        :result-source="source"
        @builder-change="handleBuilderChange"
        @builder-paste-source="handleBuilderPasteSource"
        @builder-paste-error="onBuilderPasteError"
      />
    </div>

    <div class="inline-builder__nav">
      <IconButton
        v-if="stepIndex > 0"
        :label="t('llm.wizard.back')"
        @click="goBack"
      >
        <ActionIcon name="back" />
      </IconButton>
      <IconButton
        v-if="canGoNext"
        :label="t('llm.wizard.next')"
        @click="goNext"
      >
        <ActionIcon name="next" />
      </IconButton>
    </div>

  </div>
</template>

<style src="../wizard/wizard-modal.css"></style>

<style scoped>
.inline-builder {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 10px;
}

.inline-builder__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
}

.inline-builder__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
}

.inline-builder__lead {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.inline-builder__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.inline-builder__nav {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
</style>
