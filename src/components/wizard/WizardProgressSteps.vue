<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import { getWizardStepTitleKey, type WizardStepId } from "@/constants/llm-wizard";

defineProps<{
  steps: WizardStepId[];
  stepIndex: number;
}>();

const { t } = useLocale();
</script>

<template>
  <ol class="wizard-progress-steps" :aria-label="t('llm.wizard.progressLabel')">
    <li
      v-for="(stepId, index) in steps"
      :key="stepId"
      class="wizard-progress-steps__item"
      :class="{
        'is-done': index < stepIndex,
        'is-current': index === stepIndex,
      }"
      :aria-current="index === stepIndex ? 'step' : undefined"
    >
      <span class="wizard-progress-steps__index">{{ index + 1 }}</span>
      <span class="wizard-progress-steps__label">{{ t(getWizardStepTitleKey(stepId)) }}</span>
    </li>
  </ol>
</template>

<style src="./wizard-modal.css"></style>
