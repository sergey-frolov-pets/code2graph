<script setup lang="ts">
import WizardContextStep from "@/components/wizard/steps/WizardContextStep.vue";
import WizardResultStep from "@/components/wizard/steps/WizardResultStep.vue";
import type {
  WizardState,
  WizardStepId,
} from "@/constants/llm-wizard";
import type { LlmEditConversationMessage } from "@/types/llm-edit-conversation";

const wizardState = defineModel<WizardState>("wizardState", { required: true });

defineProps<{
  currentStepId: WizardStepId | string;
  isGenerating: boolean;
  errorMessage: string;
  resultExplanation: string;
  planningMessages: LlmEditConversationMessage[];
  isPlanningChatBusy: boolean;
  showRefineChat: boolean;
  refineMessages: LlmEditConversationMessage[];
  isRefineChatBusy: boolean;
}>();

const emit = defineEmits<{
  "planning-send": [content: string];
  "planning-clear": [];
  "refine-send": [content: string];
  "refine-clear": [];
}>();
</script>

<template>
  <WizardContextStep
    v-if="currentStepId === 'context'"
    v-model:wizard-state="wizardState"
    :planning-messages="planningMessages"
    :is-planning-chat-busy="isPlanningChatBusy"
    @planning-send="emit('planning-send', $event)"
    @planning-clear="emit('planning-clear')"
  />

  <WizardResultStep
    v-else-if="currentStepId === 'result'"
    :is-generating="isGenerating"
    :error-message="errorMessage"
    :result-explanation="resultExplanation"
    :show-refine-chat="showRefineChat"
    :refine-messages="refineMessages"
    :is-refine-chat-busy="isRefineChatBusy"
    @refine-send="emit('refine-send', $event)"
    @refine-clear="emit('refine-clear')"
  />
</template>
