<script setup lang="ts">
import { computed, toRef } from "vue";
import AppModal from "@/components/AppModal.vue";
import LoadingState from "@/components/ui/LoadingState.vue";
import WizardOnboardingBanner from "@/components/wizard/WizardOnboardingBanner.vue";
import WizardAiSetupPanel from "@/components/wizard/WizardAiSetupPanel.vue";
import WizardLivePreview from "@/components/wizard/WizardLivePreview.vue";
import WizardProgressSteps from "@/components/wizard/WizardProgressSteps.vue";
import WizardStepContent from "@/components/wizard/WizardStepContent.vue";
import WizardModalFooter from "@/components/wizard/WizardModalFooter.vue";
import { useDiagramWizardFlow } from "@/composables/wizard/useDiagramWizardFlow";
import { useCodeGraphWizardFlow } from "@/composables/code-graph/useCodeGraphWizardFlow";
import { useActiveLlmLabel } from "@/composables/useActiveLlmLabel";
import { useWizardOnboarding } from "@/composables/wizard/useWizardOnboarding";
import { useLocale } from "@/composables/useLocale";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import type { CodeGraphDiagramType } from "@/constants/code-graph";

const props = defineProps<{
  open: boolean;
  documentKey: string;
  layout: LayoutEngine;
  renderMode: RenderMode;
  diagramDarkMode: boolean;
}>();

const emit = defineEmits<{
  close: [];
  apply: [payload: { source: string; label: string }];
  "apply-new-tab": [payload: { source: string; label: string }];
}>();

const { t, locale } = useLocale();
const { showWizardBanner, dismissWizardBanner } = useWizardOnboarding();
const { activeLlmDetail } = useActiveLlmLabel();

const {
  stepIndex,
  wizardState,
  isGenerating,
  errorMessage,
  resultSource,
  resultExplanation,
  previewSvg,
  isPreviewLoading,
  aiSetupVisible,
  aiSetupReason,
  showLivePreviewPanel,
  currentStepId,
  totalSteps,
  stepTitle,
  structuralElementOptions,
  showBackButton,
  languageOptions,
  typeOptions,
  directionOptions,
  paramFields,
  isAiMode,
  selectedModeDescription,
  isManualResultReady,
  canGoNext,
  wizardSteps,
  onModeSelect,
  onLanguageSelect,
  onTypeSelect,
  onDirectionSelect,
  onParamChange,
  onStructuralToggle,
  goBack,
  goNext,
  handleApply,
  handleTransferToEditor,
  handleRegenerate,
  handleAiSetupRetry,
  planningMessages,
  isPlanningChatBusy,
  sendPlanningChatMessage,
  clearPlanningChat,
  refineMessages,
  isRefineChatBusy,
  sendRefineChatMessage,
  clearRefineChat,
  showRefineChat,
} = useDiagramWizardFlow({
  open: toRef(props, "open"),
  documentKey: toRef(props, "documentKey"),
  layout: toRef(props, "layout"),
  renderMode: toRef(props, "renderMode"),
  diagramDarkMode: toRef(props, "diagramDarkMode"),
  locale,
  t,
  onApply: (payload) => emit("apply", payload),
  onClose: () => emit("close"),
});

const codeGraph = useCodeGraphWizardFlow({
  open: toRef(props, "open"),
  layout: toRef(props, "layout"),
  renderMode: toRef(props, "renderMode"),
  diagramDarkMode: toRef(props, "diagramDarkMode"),
  t,
  onApplyNewTab: (payload) => emit("apply-new-tab", payload),
  onClose: () => emit("close"),
});

const isFromCodeMode = computed(
  () => wizardState.value.creationMode === "fromCode",
);

const effectiveErrorMessage = computed(() =>
  isFromCodeMode.value ? codeGraph.errorMessage.value : errorMessage.value,
);

const effectiveResultSource = computed(() =>
  isFromCodeMode.value ? codeGraph.resultSource.value : resultSource.value,
);

const effectivePreviewSvg = computed(() =>
  isFromCodeMode.value ? codeGraph.previewSvg.value : previewSvg.value,
);

const effectivePreviewLoading = computed(() =>
  isFromCodeMode.value ? codeGraph.isPreviewLoading.value : isPreviewLoading.value,
);

const effectiveShowLivePreview = computed(() => {
  if (isFromCodeMode.value) {
    return ["codeDiagramType", "codeIrReview", "result"].includes(String(currentStepId.value));
  }

  return showLivePreviewPanel.value && !aiSetupVisible.value;
});

const effectiveCanGoNext = computed(() => {
  if (!isFromCodeMode.value) {
    return canGoNext.value;
  }

  switch (currentStepId.value) {
    case "codeSource":
      return Boolean(codeGraph.ingest.project.value);
    case "codeTree":
      return Boolean(codeGraph.ingest.projectTree.value);
    case "codeDiagramType":
      return true;
    case "codeIrReview":
      return Boolean(codeGraph.irReview.editableIr.value);
    case "codeBatch":
      return true;
    default:
      return stepIndex.value < totalSteps.value - 1;
  }
});

async function handleCodeGraphNext(): Promise<void> {
  if (currentStepId.value === "codeDiagramType") {
    await codeGraph.previewCurrentSelection();
    if (codeGraph.errorMessage.value) {
      return;
    }
  }

  if (currentStepId.value === "codeBatch") {
    await codeGraph.runBatchGeneration();
  }

  goNext();
}

async function handleNextClick(): Promise<void> {
  if (isFromCodeMode.value) {
    await handleCodeGraphNext();
    return;
  }

  goNext();
}

function handleApplyClick(): void {
  if (isFromCodeMode.value) {
    codeGraph.applySingleResult();
    return;
  }

  handleApply();
}
</script>

<template>
  <AppModal
    :open="open"
    wide
    :title="t('llm.wizard.title')"
    @close="emit('close')"
  >
    <WizardOnboardingBanner
      :open="showWizardBanner"
      @dismiss="dismissWizardBanner"
    />

    <p class="wizard-step-title">{{ stepTitle }}</p>
    <div
      class="wizard-progress"
      role="progressbar"
      :aria-valuenow="stepIndex + 1"
      :aria-valuemin="1"
      :aria-valuemax="totalSteps"
      :aria-label="t('llm.wizard.stepCounter', { current: stepIndex + 1, total: totalSteps })"
    >
      <div
        class="wizard-progress__bar"
        :style="{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }"
      />
    </div>
    <WizardProgressSteps :steps="wizardSteps" :step-index="stepIndex" />
    <p class="wizard-step-meta">
      {{ t("llm.wizard.stepCounter", { current: stepIndex + 1, total: totalSteps }) }}
    </p>

    <WizardAiSetupPanel
      v-if="aiSetupVisible && isAiMode"
      :reason="aiSetupReason"
      @retry="handleAiSetupRetry"
    />

    <LoadingState
      v-if="isGenerating && isAiMode && currentStepId !== 'result'"
      compact
      class="wizard-generating-banner"
      :message="t('llm.wizard.generating')"
      :detail="activeLlmDetail"
    />

    <div
      class="wizard-body"
      :class="{ 'wizard-body--with-preview': effectiveShowLivePreview && !aiSetupVisible }"
    >
      <div class="wizard-body__main">
        <WizardStepContent
          v-model:wizard-state="wizardState"
          :current-step-id="currentStepId"
          :is-ai-mode="isAiMode"
          :is-from-code-mode="isFromCodeMode"
          :is-generating="isGenerating"
          :is-manual-result-ready="isManualResultReady"
          :error-message="effectiveErrorMessage"
          :result-explanation="resultExplanation"
          :preview-svg="effectivePreviewSvg"
          :is-preview-loading="effectivePreviewLoading"
          :selected-mode-description="selectedModeDescription"
          :language-options="languageOptions"
          :type-options="typeOptions"
          :direction-options="directionOptions"
          :param-fields="paramFields"
          :structural-element-options="structuralElementOptions"
          :planning-messages="planningMessages"
          :is-planning-chat-busy="isPlanningChatBusy"
          :show-refine-chat="showRefineChat"
          :refine-messages="refineMessages"
          :is-refine-chat-busy="isRefineChatBusy"
          :code-source-tab="codeGraph.sourceTab.value"
          :code-github-url="codeGraph.githubUrl.value"
          :code-github-token="codeGraph.ingest.githubToken.value"
          :code-github-enabled="codeGraph.gate.limits.value.githubEnabled"
          :code-ingest-loading="codeGraph.ingest.isLoading.value"
          :code-project-tree="codeGraph.ingest.projectTree.value"
          :code-progress-completed="codeGraph.ingest.progress.value.completed"
          :code-progress-total="codeGraph.ingest.progress.value.total"
          :code-current-path="codeGraph.ingest.progress.value.currentPath"
          :code-diagram-type="codeGraph.selectedDiagramType.value"
          :code-diagram-type-options="codeGraph.diagramTypeOptions.value"
          :code-editable-ir="codeGraph.irReview.editableIr.value"
          :code-batch-queue="codeGraph.batch.queue.value"
          :code-batch-enabled="codeGraph.gate.limits.value.batchEnabled"
          :code-batch-running="codeGraph.batch.isRunning.value"
          :code-batch-progress="codeGraph.batch.progressPercent.value"
          :code-hybrid-enabled="codeGraph.gate.limits.value.hybridLlmEnabled"
          :code-use-hybrid-llm="codeGraph.useHybridLlm.value"
          @mode-select="onModeSelect($event)"
          @language-select="onLanguageSelect($event)"
          @type-select="onTypeSelect($event)"
          @direction-select="onDirectionSelect($event)"
          @param-change="onParamChange"
          @structural-toggle="onStructuralToggle"
          @planning-send="sendPlanningChatMessage"
          @planning-clear="clearPlanningChat"
          @refine-send="sendRefineChatMessage"
          @refine-clear="clearRefineChat"
          @update:code-source-tab="codeGraph.sourceTab.value = $event"
          @update:code-github-url="codeGraph.githubUrl.value = $event"
          @update:code-github-token="codeGraph.ingest.githubToken.value = $event"
          @code-zip-selected="codeGraph.handleZipUpload($event)"
          @code-folder-picker="codeGraph.handleFolderPicker()"
          @code-folder-input="codeGraph.handleFolderInput($event)"
          @code-github-load="codeGraph.handleGitHubLoad()"
          @code-tree-toggle="(nodeId, checked) => codeGraph.toggleTreeNode(nodeId, checked)"
          @code-diagram-type-select="codeGraph.selectedDiagramType.value = $event as CodeGraphDiagramType"
          @code-ir-label-update="codeGraph.irReview.updateNodeLabel($event[0], $event[1])"
          @code-batch-add="codeGraph.addCurrentToBatch()"
          @code-batch-run="codeGraph.runBatchGeneration()"
          @update:code-use-hybrid-llm="codeGraph.useHybridLlm.value = $event"
        />
      </div>

      <WizardLivePreview
        v-if="effectiveShowLivePreview && !aiSetupVisible"
        :preview-svg="effectivePreviewSvg"
        :is-preview-loading="effectivePreviewLoading"
      />
    </div>

    <template #footer>
      <WizardModalFooter
        :current-step-id="currentStepId"
        :is-ai-mode="isAiMode"
        :is-from-code-mode="isFromCodeMode"
        :is-generating="isGenerating"
        :can-go-next="effectiveCanGoNext"
        :show-back-button="showBackButton"
        :result-source="effectiveResultSource"
        @back="goBack"
        @close="emit('close')"
        @transfer-to-editor="handleTransferToEditor"
        @next="handleNextClick"
        @apply="handleApplyClick"
        @regenerate="handleRegenerate"
      />
    </template>
  </AppModal>
</template>

<style src="./wizard/wizard-modal.css"></style>
