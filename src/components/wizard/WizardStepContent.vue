<script setup lang="ts">
import WizardModeStep from "@/components/wizard/steps/WizardModeStep.vue";
import WizardLanguageStep from "@/components/wizard/steps/WizardLanguageStep.vue";
import WizardTypeStep from "@/components/wizard/steps/WizardTypeStep.vue";
import WizardDirectionStep from "@/components/wizard/steps/WizardDirectionStep.vue";
import WizardParamsStep from "@/components/wizard/steps/WizardParamsStep.vue";
import WizardContextStep from "@/components/wizard/steps/WizardContextStep.vue";
import WizardPromptStep from "@/components/wizard/steps/WizardPromptStep.vue";
import WizardResultStep from "@/components/wizard/steps/WizardResultStep.vue";
import WizardCodeSourceStep from "@/components/wizard/steps/WizardCodeSourceStep.vue";
import WizardCodeTreeStep from "@/components/wizard/steps/WizardCodeTreeStep.vue";
import WizardCodeDiagramTypeStep from "@/components/wizard/steps/WizardCodeDiagramTypeStep.vue";
import WizardCodeIrReviewStep from "@/components/wizard/steps/WizardCodeIrReviewStep.vue";
import WizardCodeBatchStep from "@/components/wizard/steps/WizardCodeBatchStep.vue";
import type { CodeGraphDiagramType } from "@/constants/code-graph";
import type {
  WizardDiagramDirection,
  WizardParamField,
  WizardState,
  WizardStepId,
  WizardStructuralElementId,
} from "@/constants/llm-wizard";
import type { CodeGraphBatchItem } from "@/composables/code-graph/useCodeAnalysisQueue";
import type { DiagramIR } from "@/services/conversion/diagram-ir";
import type { ProjectTreeNode } from "@/services/code-graph/ir/code-project-ir";
import type { LlmEditConversationMessage } from "@/types/llm-edit-conversation";

const wizardState = defineModel<WizardState>("wizardState", { required: true });

defineProps<{
  currentStepId: WizardStepId | string;
  isAiMode: boolean;
  isFromCodeMode: boolean;
  isGenerating: boolean;
  isManualResultReady: boolean;
  errorMessage: string;
  resultExplanation: string;
  previewSvg: string;
  isPreviewLoading: boolean;
  selectedModeDescription: string;
  languageOptions: Array<{ id: string; label: string }>;
  typeOptions: Array<{ id: string; label: string; description: string }>;
  directionOptions: Array<{ id: WizardDiagramDirection; label: string }>;
  paramFields: WizardParamField[];
  structuralElementOptions: Array<{ id: WizardStructuralElementId; label: string }>;
  planningMessages: LlmEditConversationMessage[];
  isPlanningChatBusy: boolean;
  showRefineChat: boolean;
  refineMessages: LlmEditConversationMessage[];
  isRefineChatBusy: boolean;
  codeSourceTab: "zip" | "folder" | "github";
  codeGithubUrl: string;
  codeGithubToken: string;
  codeGithubEnabled: boolean;
  codeIngestLoading: boolean;
  codeProjectTree: ProjectTreeNode | null;
  codeProgressCompleted: number;
  codeProgressTotal: number;
  codeCurrentPath: string;
  codeDiagramType: CodeGraphDiagramType;
  codeDiagramTypeOptions: Array<{
    id: CodeGraphDiagramType;
    label: string;
    description: string;
    allowed: boolean;
  }>;
  codeEditableIr: DiagramIR | null;
  codeBatchQueue: CodeGraphBatchItem[];
  codeBatchEnabled: boolean;
  codeBatchRunning: boolean;
  codeBatchProgress: number;
}>();

const emit = defineEmits<{
  "mode-select": [mode: string];
  "language-select": [language: string];
  "type-select": [diagramType: string];
  "direction-select": [direction: WizardState["direction"]];
  "param-change": [paramId: WizardParamField["id"], event: Event];
  "structural-toggle": [elementId: WizardStructuralElementId, event: Event];
  "planning-send": [content: string];
  "planning-clear": [];
  "refine-send": [content: string];
  "refine-clear": [];
  "update:codeSourceTab": [value: "zip" | "folder" | "github"];
  "update:codeGithubUrl": [value: string];
  "update:codeGithubToken": [value: string];
  "code-zip-selected": [file: File];
  "code-folder-picker": [];
  "code-folder-input": [fileList: FileList];
  "code-github-load": [];
  "code-tree-toggle": [nodeId: string, checked: boolean];
  "code-diagram-type-select": [diagramType: CodeGraphDiagramType];
  "code-ir-label-update": [nodeId: string, label: string];
  "code-batch-add": [];
  "code-batch-run": [];
}>();
</script>

<template>
  <WizardModeStep
    v-if="currentStepId === 'mode'"
    :wizard-state="wizardState"
    :selected-mode-description="selectedModeDescription"
    @mode-select="emit('mode-select', $event)"
  />

  <WizardCodeSourceStep
    v-else-if="currentStepId === 'codeSource'"
    :source-tab="codeSourceTab"
    :github-url="codeGithubUrl"
    :github-token="codeGithubToken"
    :github-enabled="codeGithubEnabled"
    :is-loading="codeIngestLoading"
    :error-message="errorMessage"
    @update:source-tab="emit('update:codeSourceTab', $event)"
    @update:github-url="emit('update:codeGithubUrl', $event)"
    @update:github-token="emit('update:codeGithubToken', $event)"
    @zip-selected="emit('code-zip-selected', $event)"
    @folder-picker="emit('code-folder-picker')"
    @folder-input="emit('code-folder-input', $event)"
    @github-load="emit('code-github-load')"
  />

  <WizardCodeTreeStep
    v-else-if="currentStepId === 'codeTree'"
    :tree="codeProjectTree"
    :progress-completed="codeProgressCompleted"
    :progress-total="codeProgressTotal"
    :current-path="codeCurrentPath"
    @toggle="(nodeId, checked) => emit('code-tree-toggle', nodeId, checked)"
  />

  <WizardCodeDiagramTypeStep
    v-else-if="currentStepId === 'codeDiagramType'"
    :selected-diagram-type="codeDiagramType"
    :options="codeDiagramTypeOptions"
    @select="emit('code-diagram-type-select', $event)"
  />

  <WizardCodeIrReviewStep
    v-else-if="currentStepId === 'codeIrReview'"
    :ir="codeEditableIr"
    @update-label="(nodeId, label) => emit('code-ir-label-update', nodeId, label)"
  />

  <WizardCodeBatchStep
    v-else-if="currentStepId === 'codeBatch'"
    :queue="codeBatchQueue"
    :batch-enabled="codeBatchEnabled"
    :is-running="codeBatchRunning"
    :progress-percent="codeBatchProgress"
    @add="emit('code-batch-add')"
    @run="emit('code-batch-run')"
  />

  <WizardLanguageStep
    v-else-if="currentStepId === 'language'"
    :wizard-state="wizardState"
    :is-ai-mode="isAiMode"
    :language-options="languageOptions"
    @language-select="emit('language-select', $event)"
  />

  <WizardTypeStep
    v-else-if="currentStepId === 'type'"
    :wizard-state="wizardState"
    :type-options="typeOptions"
    @type-select="emit('type-select', $event)"
  />

  <WizardDirectionStep
    v-else-if="currentStepId === 'direction'"
    :wizard-state="wizardState"
    :direction-options="directionOptions"
    @direction-select="emit('direction-select', $event)"
  />

  <WizardParamsStep
    v-else-if="currentStepId === 'params'"
    v-model:wizard-state="wizardState"
    :is-ai-mode="isAiMode"
    :param-fields="paramFields"
    :structural-element-options="structuralElementOptions"
    @param-change="(paramId, event) => emit('param-change', paramId, event)"
    @structural-toggle="(elementId, event) => emit('structural-toggle', elementId, event)"
  />

  <WizardContextStep
    v-else-if="currentStepId === 'context'"
    v-model:wizard-state="wizardState"
    :is-ai-mode="isAiMode"
    :planning-messages="planningMessages"
    :is-planning-chat-busy="isPlanningChatBusy"
    @planning-send="emit('planning-send', $event)"
    @planning-clear="emit('planning-clear')"
  />

  <WizardPromptStep
    v-else-if="currentStepId === 'prompt'"
    v-model:wizard-state="wizardState"
  />

  <WizardResultStep
    v-else-if="currentStepId === 'result'"
    :is-generating="isGenerating"
    :is-manual-result-ready="isManualResultReady"
    :error-message="errorMessage"
    :result-explanation="resultExplanation"
    :show-refine-chat="showRefineChat"
    :refine-messages="refineMessages"
    :is-refine-chat-busy="isRefineChatBusy"
    @refine-send="emit('refine-send', $event)"
    @refine-clear="emit('refine-clear')"
  />
</template>
