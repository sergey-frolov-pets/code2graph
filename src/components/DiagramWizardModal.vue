<script setup lang="ts">
import { computed, onMounted, toRef, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { reportTablePasteError } from "@/composables/useTablePasteError";
import WizardExampleGallery from "@/components/wizard/WizardExampleGallery.vue";
import WizardOnboardingBanner from "@/components/wizard/WizardOnboardingBanner.vue";
import WizardLivePreview from "@/components/wizard/WizardLivePreview.vue";
import WizardProgressSteps from "@/components/wizard/WizardProgressSteps.vue";
import WizardStepContent from "@/components/wizard/WizardStepContent.vue";
import WizardModalFooter from "@/components/wizard/WizardModalFooter.vue";
import { useDiagramWizardFlow } from "@/composables/wizard/useDiagramWizardFlow";
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

const props = defineProps<{
  open: boolean;
  documentKey: string;
  layout: LayoutEngine;
  renderMode: RenderMode;
  diagramDarkMode: boolean;
}>();

const emit = defineEmits<{
  close: [];
  openSettings: [];
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

function onBuilderPasteError(error: TablePasteErrorInfo): void {
  reportTablePasteError(error);
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
  builderState,
  applyTarget,
  isBuilderMode,
  errorMessage,
  resultSource,
  previewSvg,
  isPreviewLoading,
  showLivePreviewPanel,
  currentStepId,
  totalSteps,
  stepTitle,
  showBackButton,
  canGoNext,
  wizardSteps,
  openGalleryExample,
  handleBuilderChange,
  handleBuilderPasteSource,
  selectStep,
  goBack,
  goNext,
  handleApply,
} = useDiagramWizardFlow({
  open: toRef(props, "open"),
  documentKey: toRef(props, "documentKey"),
  layout: toRef(props, "layout"),
  renderMode: toRef(props, "renderMode"),
  diagramDarkMode: toRef(props, "diagramDarkMode"),
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

const showLivePreview = computed(() => showLivePreviewPanel.value);
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

    <div
      v-if="!galleryVisible && !isBuilderMode"
      class="wizard-top-bar"
    >
      <p class="wizard-step-title">
        {{ stepTitle }}
      </p>
    </div>

    <WizardExampleGallery
      v-if="galleryVisible"
      @choose="openGalleryExample"
    />
    <div
      v-if="!galleryVisible && !isBuilderMode"
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
      v-if="!galleryVisible && !isBuilderMode"
      class="wizard-step-meta"
    >
      {{ t("llm.wizard.stepCounter", { current: stepIndex + 1, total: totalSteps }) }}
    </p>

    <p v-if="!galleryVisible && errorMessage" class="wizard-error">
      {{ errorMessage }}
    </p>

    <div
      v-if="!galleryVisible"
      class="wizard-body"
      :class="{ 'wizard-body--with-preview': showLivePreview }"
    >
      <div class="wizard-body__main">
        <WizardStepContent
          v-model:builder-state="builderState"
          :current-step-id="currentStepId"
          :result-source="resultSource"
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


    <template #footer>
      <WizardModalFooter
        v-model:apply-target="applyTarget"
        :current-step-id="currentStepId"
        :gallery="galleryVisible"
        :is-builder-mode="isBuilderMode"
        :can-go-next="canGoNext"
        :show-back-button="showBackButton"
        :result-source="resultSource"
        @back="goBack"
        @close="emit('close')"
        @next="goNext"
        @apply="handleApply"
      />
    </template>
  </AppModal>
</template>

<style src="./wizard/wizard-modal.css"></style>
