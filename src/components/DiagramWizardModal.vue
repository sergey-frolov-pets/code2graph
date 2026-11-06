<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import TablePasteErrorModal from "@/components/TablePasteErrorModal.vue";
import LoadingState from "@/components/ui/LoadingState.vue";
import WizardExampleGallery from "@/components/wizard/WizardExampleGallery.vue";
import WizardOnboardingBanner from "@/components/wizard/WizardOnboardingBanner.vue";
import WizardAiSetupPanel from "@/components/wizard/WizardAiSetupPanel.vue";
import WizardLivePreview from "@/components/wizard/WizardLivePreview.vue";
import WizardProgressSteps from "@/components/wizard/WizardProgressSteps.vue";
import WizardStepContent from "@/components/wizard/WizardStepContent.vue";
import WizardModalFooter from "@/components/wizard/WizardModalFooter.vue";
import { useDiagramWizardFlow } from "@/composables/wizard/useDiagramWizardFlow";
import { useActiveLlmLabel } from "@/composables/useActiveLlmLabel";
import { useWizardOnboarding } from "@/composables/wizard/useWizardOnboarding";
import { useLocale } from "@/composables/useLocale";
import {
  diagramAnalyticsKind,
  resolveDiagramTypeSlug,
  trackEvent,
} from "@/analytics";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import type { BuilderApplyTarget } from "@/services/diagram-builder";
import type { TablePasteErrorInfo } from "@/services/table-paste/types";

const props = withDefaults(
  defineProps<{
    open: boolean;
    documentKey: string;
    layout: LayoutEngine;
    renderMode: RenderMode;
    diagramDarkMode: boolean;
    currentEditorSource?: string;
    currentEditorFormat?: DiagramFormat;
    startInBuilder?: boolean;
  }>(),
  {
    currentEditorSource: "",
    currentEditorFormat: "plantuml",
    startInBuilder: false,
  },
);

const emit = defineEmits<{
  close: [];
  apply: [
    payload: {
      source: string;
      label: string;
      format: DiagramFormat;
      target?: BuilderApplyTarget;
    },
  ];
}>();

const { t, locale } = useLocale();
const { showWizardBanner, dismissWizardBanner } = useWizardOnboarding();
const { activeLlmDetail } = useActiveLlmLabel();

const pasteErrorInfo = ref<TablePasteErrorInfo | null>(null);
const pasteErrorModalOpen = ref(false);

function onBuilderPasteError(error: TablePasteErrorInfo): void {
  pasteErrorInfo.value = error;
  pasteErrorModalOpen.value = true;
}

function trackWizardOpen(): void {
  trackEvent("wizard-open", "Wizard: new diagram");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      trackWizardOpen();
    }
  },
);

onMounted(() => {
  if (props.open) {
    trackWizardOpen();
  }
});

const {
  stepIndex,
  galleryVisible,
  wizardState,
  builderState,
  applyTarget,
  isBuilderMode,
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
  showBackButton,
  canGoNext,
  wizardSteps,
  openGalleryExample,
  openCurrentDiagramInBuilder,
  handleBuilderChange,
  handleBuilderPasteSource,
  selectStep,
  goBack,
  goNext,
  handleApply,
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
  currentEditorSource: toRef(props, "currentEditorSource"),
  currentEditorFormat: toRef(props, "currentEditorFormat"),
  startInBuilder: toRef(props, "startInBuilder"),
  locale,
  t,
  onApply: (payload) => {
    const type = resolveDiagramTypeSlug(payload.source, payload.format);
    const kind = diagramAnalyticsKind(payload.format, type);
    const label = type ? `${payload.format} / ${type}` : payload.format;
    trackEvent(`wizard-apply-${kind}`, `Wizard apply: ${label}`);
    emit("apply", payload);
  },
  onClose: () => emit("close"),
});

const showLivePreview = computed(
  () => showLivePreviewPanel.value && !aiSetupVisible.value,
);

const canEditCurrentDiagram = computed(
  () => (props.currentEditorSource ?? "").trim().length > 0,
);
</script>

<template>
  <AppModal
    :open="open"
    wide
    :title="t('llm.wizard.title')"
    test-id="diagram-wizard-modal"
    @close="emit('close')"
  >
    <WizardOnboardingBanner
      :open="showWizardBanner"
      @dismiss="dismissWizardBanner"
    />

    <div class="wizard-top-bar">
      <p class="wizard-step-title">
        {{ galleryVisible ? t("llm.wizard.gallery.heading") : stepTitle }}
      </p>
      <button
        v-if="galleryVisible && canEditCurrentDiagram"
        type="button"
        class="btn builder-btn"
        data-testid="wizard-edit-current-diagram-btn"
        @click="openCurrentDiagramInBuilder"
      >
        {{ t("builder.editCurrentFromGallery") }}
      </button>
    </div>

    <WizardExampleGallery
      v-if="galleryVisible"
      @choose="openGalleryExample"
    />
    <div
      v-if="!galleryVisible"
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
    <WizardProgressSteps
      v-if="!galleryVisible"
      :steps="wizardSteps"
      :step-index="stepIndex"
      :clickable="isBuilderMode"
      @select-step="selectStep"
    />
    <p
      v-if="!galleryVisible"
      class="wizard-step-meta"
    >
      {{ t("llm.wizard.stepCounter", { current: stepIndex + 1, total: totalSteps }) }}
    </p>

    <WizardAiSetupPanel
      v-if="!galleryVisible && aiSetupVisible"
      :reason="aiSetupReason"
      @retry="handleAiSetupRetry"
    />

    <LoadingState
      v-if="!galleryVisible && isGenerating && currentStepId !== 'result'"
      compact
      class="wizard-generating-banner"
      :message="t('llm.wizard.generating')"
      :detail="activeLlmDetail"
    />

    <div
      v-if="!galleryVisible"
      class="wizard-body"
      :class="{ 'wizard-body--with-preview': showLivePreview }"
    >
      <div class="wizard-body__main">
        <WizardStepContent
          v-model:wizard-state="wizardState"
          v-model:builder-state="builderState"
          :current-step-id="currentStepId"
          :is-generating="isGenerating"
          :error-message="errorMessage"
          :result-explanation="resultExplanation"
          :result-source="resultSource"
          :planning-messages="planningMessages"
          :is-planning-chat-busy="isPlanningChatBusy"
          :show-refine-chat="showRefineChat"
          :refine-messages="refineMessages"
          :is-refine-chat-busy="isRefineChatBusy"
          @planning-send="sendPlanningChatMessage"
          @planning-clear="clearPlanningChat"
          @refine-send="sendRefineChatMessage"
          @refine-clear="clearRefineChat"
          @builder-change="handleBuilderChange"
          @builder-paste-source="handleBuilderPasteSource"
          @builder-paste-error="onBuilderPasteError"
        />
      </div>

      <WizardLivePreview
        v-if="showLivePreview"
        :preview-svg="previewSvg"
        :is-preview-loading="isPreviewLoading"
        :source-code="isBuilderMode ? resultSource : undefined"
      />
    </div>

    <TablePasteErrorModal
      :open="pasteErrorModalOpen"
      :error="pasteErrorInfo"
      @close="pasteErrorModalOpen = false"
    />

    <template #footer>
      <WizardModalFooter
        v-model:apply-target="applyTarget"
        :current-step-id="currentStepId"
        :gallery="galleryVisible"
        :is-builder-mode="isBuilderMode"
        :is-generating="isGenerating"
        :can-go-next="canGoNext"
        :show-back-button="showBackButton"
        :result-source="resultSource"
        @back="goBack"
        @close="emit('close')"
        @next="goNext"
        @apply="handleApply"
        @regenerate="handleRegenerate"
      />
    </template>
  </AppModal>
</template>

<style src="./wizard/wizard-modal.css"></style>
