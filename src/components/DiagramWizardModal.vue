<script setup lang="ts">
import { toRef } from "vue";
import AppModal from "@/components/AppModal.vue";
import WizardOnboardingBanner from "@/components/wizard/WizardOnboardingBanner.vue";
import WizardAiSetupPanel from "@/components/wizard/WizardAiSetupPanel.vue";
import WizardLivePreview from "@/components/wizard/WizardLivePreview.vue";
import WizardProgressSteps from "@/components/wizard/WizardProgressSteps.vue";
import WizardStepContent from "@/components/wizard/WizardStepContent.vue";
import WizardModalFooter from "@/components/wizard/WizardModalFooter.vue";
import { useDiagramWizardFlow } from "@/composables/wizard/useDiagramWizardFlow";
import { useWizardOnboarding } from "@/composables/wizard/useWizardOnboarding";
import { useLocale } from "@/composables/useLocale";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";

const props = defineProps<{
  open: boolean;
  layout: LayoutEngine;
  renderMode: RenderMode;
  diagramDarkMode: boolean;
}>();

const emit = defineEmits<{
  close: [];
  apply: [payload: { source: string; label: string }];
}>();

const { t, locale } = useLocale();
const { showWizardBanner, dismissWizardBanner } = useWizardOnboarding();

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
  themeOptions,
  paramFields,
  isAiMode,
  selectedModeDescription,
  isManualResultReady,
  canGoNext,
  wizardSteps,
  onModeSelect,
  onLanguageSelect,
  onTypeSelect,
  onThemeSelect,
  onDirectionSelect,
  onParamChange,
  onStructuralToggle,
  goBack,
  goNext,
  handleApply,
  handleTransferToEditor,
  handleRegenerate,
  handleAiSetupRetry,
} = useDiagramWizardFlow({
  open: toRef(props, "open"),
  layout: toRef(props, "layout"),
  renderMode: toRef(props, "renderMode"),
  diagramDarkMode: toRef(props, "diagramDarkMode"),
  locale,
  t,
  onApply: (payload) => emit("apply", payload),
  onClose: () => emit("close"),
});
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

    <div
      class="wizard-body"
      :class="{ 'wizard-body--with-preview': showLivePreviewPanel && !aiSetupVisible }"
    >
      <div class="wizard-body__main">
        <WizardStepContent
          v-model:wizard-state="wizardState"
          :current-step-id="currentStepId"
          :is-ai-mode="isAiMode"
          :is-generating="isGenerating"
          :is-manual-result-ready="isManualResultReady"
          :error-message="errorMessage"
          :result-explanation="resultExplanation"
          :preview-svg="previewSvg"
          :is-preview-loading="isPreviewLoading"
          :selected-mode-description="selectedModeDescription"
          :language-options="languageOptions"
          :type-options="typeOptions"
          :direction-options="directionOptions"
          :theme-options="themeOptions"
          :param-fields="paramFields"
          :structural-element-options="structuralElementOptions"
          @mode-select="onModeSelect($event)"
          @language-select="onLanguageSelect($event)"
          @type-select="onTypeSelect($event)"
          @direction-select="onDirectionSelect($event)"
          @theme-select="onThemeSelect($event)"
          @param-change="onParamChange"
          @structural-toggle="onStructuralToggle"
        />
      </div>

      <WizardLivePreview
        v-if="showLivePreviewPanel && !aiSetupVisible"
        :preview-svg="previewSvg"
        :is-preview-loading="isPreviewLoading"
      />
    </div>

    <template #footer>
      <WizardModalFooter
        :current-step-id="currentStepId"
        :is-ai-mode="isAiMode"
        :is-generating="isGenerating"
        :can-go-next="canGoNext"
        :show-back-button="showBackButton"
        :result-source="resultSource"
        @back="goBack"
        @close="emit('close')"
        @transfer-to-editor="handleTransferToEditor"
        @next="goNext"
        @apply="handleApply"
        @regenerate="handleRegenerate"
      />
    </template>
  </AppModal>
</template>

<style src="./wizard/wizard-modal.css"></style>
