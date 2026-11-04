<script setup lang="ts">
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useActiveLlmLabel } from "@/composables/useActiveLlmLabel";
import { useLocale } from "@/composables/useLocale";
import type { WizardStepId } from "@/constants/llm-wizard";

defineProps<{
  currentStepId: WizardStepId | string;
  gallery: boolean;
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
        v-if="!gallery && currentStepId === 'result'"
        :label="t('llm.wizard.apply')"
        extra-class="wizard-footer__btn"
        primary
        :disabled="!resultSource || isGenerating"
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
  gap: 8px;
}

.wizard-footer__end {
  margin-left: auto;
  justify-content: flex-end;
}
</style>
