<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";

defineProps<{
  isGenerating: boolean;
  isManualResultReady: boolean;
  errorMessage: string;
  resultExplanation: string;
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p v-if="isGenerating" class="wizard-status">{{ t("llm.wizard.generating") }}</p>
    <p v-if="errorMessage" class="wizard-error">{{ errorMessage }}</p>
    <p v-if="resultExplanation" class="wizard-explanation">{{ resultExplanation }}</p>
    <p v-if="isManualResultReady" class="wizard-hint">{{ t("llm.wizard.manualResultHint") }}</p>
  </div>
</template>

<style src="../wizard-modal.css"></style>
