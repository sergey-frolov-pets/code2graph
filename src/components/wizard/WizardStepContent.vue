<script setup lang="ts">
import WizardModeStep from "@/components/wizard/steps/WizardModeStep.vue";
import WizardLanguageStep from "@/components/wizard/steps/WizardLanguageStep.vue";
import WizardTypeStep from "@/components/wizard/steps/WizardTypeStep.vue";
import WizardDirectionStep from "@/components/wizard/steps/WizardDirectionStep.vue";
import WizardStyleStep from "@/components/wizard/steps/WizardStyleStep.vue";
import WizardParamsStep from "@/components/wizard/steps/WizardParamsStep.vue";
import WizardContextStep from "@/components/wizard/steps/WizardContextStep.vue";
import WizardPromptStep from "@/components/wizard/steps/WizardPromptStep.vue";
import WizardResultStep from "@/components/wizard/steps/WizardResultStep.vue";
import type {
  WizardDiagramDirection,
  WizardDiagramTheme,
  WizardParamField,
  WizardState,
  WizardStepId,
  WizardStructuralElementId,
} from "@/constants/llm-wizard";

const wizardState = defineModel<WizardState>("wizardState", { required: true });

defineProps<{
  currentStepId: WizardStepId | string;
  isAiMode: boolean;
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
  themeOptions: Array<{ id: WizardDiagramTheme; label: string }>;
  paramFields: WizardParamField[];
  structuralElementOptions: Array<{ id: WizardStructuralElementId; label: string }>;
}>();

const emit = defineEmits<{
  "mode-select": [mode: string];
  "language-select": [language: string];
  "type-select": [diagramType: string];
  "direction-select": [direction: WizardState["direction"]];
  "theme-select": [theme: WizardState["theme"]];
  "param-change": [paramId: WizardParamField["id"], event: Event];
  "structural-toggle": [elementId: WizardStructuralElementId, event: Event];
}>();
</script>

<template>
  <WizardModeStep
    v-if="currentStepId === 'mode'"
    :wizard-state="wizardState"
    :selected-mode-description="selectedModeDescription"
    @mode-select="emit('mode-select', $event)"
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

  <WizardStyleStep
    v-else-if="currentStepId === 'style'"
    :wizard-state="wizardState"
    :theme-options="themeOptions"
    @theme-select="emit('theme-select', $event)"
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
  />

  <WizardPromptStep
    v-else-if="currentStepId === 'prompt'"
    v-model:wizard-state="wizardState"
  />

  <WizardResultStep
    v-else
    :is-generating="isGenerating"
    :is-manual-result-ready="isManualResultReady"
    :error-message="errorMessage"
    :result-explanation="resultExplanation"
    :preview-svg="previewSvg"
    :is-preview-loading="isPreviewLoading"
  />
</template>
