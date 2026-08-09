<script setup lang="ts">
import LoadingState from "@/components/ui/LoadingState.vue";
import { useActiveLlmLabel } from "@/composables/useActiveLlmLabel";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  isGenerating: boolean;
  isManualResultReady: boolean;
  errorMessage: string;
  resultExplanation: string;
}>();

const { t } = useLocale();
const { activeLlmDetail } = useActiveLlmLabel();
</script>

<template>
  <div class="wizard-step">
    <LoadingState
      v-if="isGenerating"
      class="wizard-step__loading"
      :message="t('llm.wizard.generating')"
      :detail="activeLlmDetail"
    />
    <p v-if="errorMessage" class="wizard-error">{{ errorMessage }}</p>
    <p v-if="resultExplanation" class="wizard-explanation">{{ resultExplanation }}</p>
    <p v-if="isManualResultReady" class="wizard-hint">{{ t("llm.wizard.manualResultHint") }}</p>
  </div>
</template>

<style src="../wizard-modal.css"></style>

<style scoped>
.wizard-step__loading {
  min-height: 120px;
}
</style>
