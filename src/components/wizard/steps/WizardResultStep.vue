<script setup lang="ts">
import LoadingState from "@/components/ui/LoadingState.vue";
import { useActiveLlmLabel } from "@/composables/useActiveLlmLabel";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  isGenerating: boolean;
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
    <p v-if="!isGenerating && !errorMessage" class="wizard-chat-lead">
      {{ t("llm.wizard.resultChatMovedHint") }}
    </p>
  </div>
</template>

<style src="../wizard-modal.css"></style>
<style scoped>
.wizard-step__loading {
  min-height: 120px;
}

.wizard-chat-lead {
  margin: 10px 0 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.4;
}
</style>
