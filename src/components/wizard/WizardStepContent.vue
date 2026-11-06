<script setup lang="ts">
import BuilderCanvasAxesStep from "@/components/wizard/steps/BuilderCanvasAxesStep.vue";
import BuilderDataTableStep from "@/components/wizard/steps/BuilderDataTableStep.vue";
import BuilderOptionsStep from "@/components/wizard/steps/BuilderOptionsStep.vue";
import WizardContextStep from "@/components/wizard/steps/WizardContextStep.vue";
import WizardResultStep from "@/components/wizard/steps/WizardResultStep.vue";
import type {
  WizardState,
  WizardStepId,
} from "@/constants/llm-wizard";
import type { DiagramBuilderState } from "@/services/diagram-builder";
import type { TablePasteErrorInfo } from "@/services/table-paste/types";
import type { LlmEditConversationMessage } from "@/types/llm-edit-conversation";

const wizardState = defineModel<WizardState>("wizardState", { required: true });
const builderState = defineModel<DiagramBuilderState>("builderState");

defineProps<{
  currentStepId: WizardStepId | string;
  isGenerating: boolean;
  errorMessage: string;
  resultExplanation: string;
  resultSource?: string;
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
  "builder-change": [];
  "builder-paste-source": [source: string];
  "builder-paste-error": [error: TablePasteErrorInfo];
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

  <BuilderDataTableStep
    v-else-if="currentStepId === 'builder-data' && builderState"
    v-model:builder-state="builderState"
    :current-source="resultSource ?? ''"
    @change="emit('builder-change')"
    @paste-applied-source="emit('builder-paste-source', $event)"
    @paste-error="emit('builder-paste-error', $event)"
  />

  <BuilderCanvasAxesStep
    v-else-if="currentStepId === 'builder-canvas' && builderState"
    v-model:builder-state="builderState"
    @change="emit('builder-change')"
  />

  <BuilderOptionsStep
    v-else-if="currentStepId === 'builder-options' && builderState"
    v-model:builder-state="builderState"
    @change="emit('builder-change')"
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
