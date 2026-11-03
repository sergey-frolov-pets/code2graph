<script setup lang="ts">
import LlmChatPanel from "@/components/llm/LlmChatPanel.vue";
import LoadingState from "@/components/ui/LoadingState.vue";
import { useActiveLlmLabel } from "@/composables/useActiveLlmLabel";
import { useLocale } from "@/composables/useLocale";
import type { LlmEditConversationMessage } from "@/types/llm-edit-conversation";

defineProps<{
  isGenerating: boolean;
  isManualResultReady: boolean;
  errorMessage: string;
  resultExplanation: string;
  showRefineChat: boolean;
  refineMessages: LlmEditConversationMessage[];
  isRefineChatBusy: boolean;
}>();

const emit = defineEmits<{
  "refine-send": [content: string];
  "refine-clear": [];
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

    <div v-if="showRefineChat && !isGenerating" class="wizard-refine-chat">
      <p class="wizard-chat-lead">{{ t("llm.wizard.refineChatLead") }}</p>
      <LlmChatPanel
        :messages="refineMessages"
        :is-busy="isRefineChatBusy"
        :placeholder="t('llm.wizard.refineChatPlaceholder')"
        show-clear
        @send="emit('refine-send', $event)"
        @clear="emit('refine-clear')"
      />
    </div>
  </div>
</template>

<style src="../wizard-modal.css"></style>

<style scoped>
.wizard-step__loading {
  min-height: 120px;
}

.wizard-refine-chat {
  margin-top: 12px;
}

.wizard-chat-lead {
  margin: 0 0 10px;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.4;
}
</style>
