<script setup lang="ts">
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useActiveLlmLabel } from "@/composables/useActiveLlmLabel";
import { useLocale } from "@/composables/useLocale";
import type { WizardStepId } from "@/constants/llm-wizard";
import type { BuilderApplyTarget } from "@/services/diagram-builder";

const applyTarget = defineModel<BuilderApplyTarget>("applyTarget", {
  default: "new-tab",
});

defineProps<{
  currentStepId: WizardStepId | string;
  gallery: boolean;
  isBuilderMode?: boolean;
  isGenerating: boolean;
  canGoNext: boolean;
  showBackButton: boolean;
  resultSource: string;
}>();

const emit = defineEmits<{
  back: [];
  close: [];
  next: [];
  apply: [];
  regenerate: [];
}>();

const { t } = useLocale();
const { generatingLabel } = useActiveLlmLabel();
</script>

<template>
  <div class="wizard-footer">
    <div class="wizard-footer__start">
      <IconButton
        v-if="showBackButton"
        :label="t('llm.wizard.back')"
        extra-class="wizard-footer__btn"
        :disabled="isGenerating"
        @click="emit('back')"
      >
        <ActionIcon name="back" />
      </IconButton>
    </div>

    <div class="wizard-footer__end">
      <label
        v-if="!gallery && (isBuilderMode || currentStepId === 'result')"
        class="wizard-footer__target"
      >
        <span class="sr-only">{{ t("builder.applyTarget.label") }}</span>
        <select
          v-model="applyTarget"
          class="select wizard-footer__target-select"
          :aria-label="t('builder.applyTarget.label')"
          data-testid="wizard-apply-target-select"
        >
          <option value="current">{{ t("builder.applyTarget.current") }}</option>
          <option value="new-tab">{{ t("builder.applyTarget.newTab") }}</option>
        </select>
      </label>

      <IconButton
        :label="t('app.cancel')"
        extra-class="wizard-footer__btn"
        @click="emit('close')"
      >
        <ActionIcon name="close" />
      </IconButton>

      <IconButton
        v-if="!gallery && currentStepId === 'context'"
        :label="isGenerating ? generatingLabel : t('llm.wizard.generate')"
        extra-class="wizard-footer__btn"
        primary
        :disabled="!canGoNext || isGenerating"
        @click="emit('next')"
      >
        <ActionIcon name="ai" />
      </IconButton>

      <IconButton
        v-if="!gallery && isBuilderMode && canGoNext"
        :label="t('llm.wizard.next')"
        extra-class="wizard-footer__btn"
        @click="emit('next')"
      >
        <ActionIcon name="next" />
      </IconButton>

      <IconButton
        v-if="!gallery && (currentStepId === 'result' || isBuilderMode)"
        :label="t('llm.wizard.apply')"
        extra-class="wizard-footer__btn"
        primary
        :disabled="!resultSource || isGenerating"
        data-testid="wizard-apply-button"
        @click="emit('apply')"
      >
        <ActionIcon name="check" />
      </IconButton>

      <IconButton
        v-if="!gallery && currentStepId === 'result' && !isGenerating"
        :label="t('llm.wizard.regenerate')"
        extra-class="wizard-footer__btn"
        @click="emit('regenerate')"
      >
        <ActionIcon name="refresh" />
      </IconButton>
    </div>
  </div>
</template>

<style scoped>
.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.wizard-footer__start,
.wizard-footer__end {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.wizard-footer__end {
  margin-left: auto;
  justify-content: flex-end;
}

.wizard-footer__target {
  display: inline-flex;
  align-items: center;
  margin: 0;
}

.wizard-footer__target-select {
  height: 36px;
  min-height: 36px;
  padding: 0 28px 0 10px;
  font-size: 0.82rem;
}
</style>
