<script setup lang="ts">
import {
  WIZARD_CREATION_MODES,
  type WizardDiagramDirection,
  type WizardDiagramTheme,
  type WizardParamField,
  type WizardState,
  type WizardStepId,
  type WizardStructuralElementId,
} from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";

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

const { t } = useLocale();
</script>

<template>
  <div v-if="currentStepId === 'mode'" class="wizard-step">
    <p class="wizard-hint">{{ t("llm.wizard.modeHint") }}</p>
    <div
      class="wizard-mode-toggle"
      role="radiogroup"
      :aria-label="t('llm.wizard.step.mode')"
    >
      <button
        v-for="mode in WIZARD_CREATION_MODES"
        :key="mode"
        class="wizard-mode-toggle__option"
        :class="{ 'is-active': wizardState.creationMode === mode }"
        type="button"
        role="radio"
        :aria-checked="wizardState.creationMode === mode"
        @click="emit('mode-select', mode)"
      >
        {{ t(`llm.wizard.mode.${mode}`) }}
      </button>
    </div>
    <p class="wizard-mode-toggle__desc">{{ selectedModeDescription }}</p>
  </div>

  <div v-else-if="currentStepId === 'language'" class="wizard-step">
    <p class="wizard-field__label">{{ t("llm.wizard.diagramLanguage") }}</p>
    <div
      class="wizard-radio-list"
      role="radiogroup"
      :aria-label="t('llm.wizard.diagramLanguage')"
    >
      <button
        v-for="option in languageOptions"
        :key="option.id"
        class="wizard-radio-list__option"
        :class="{ 'is-active': wizardState.language === option.id }"
        type="button"
        role="radio"
        :aria-checked="wizardState.language === option.id"
        @click="emit('language-select', option.id)"
      >
        {{ option.label }}
      </button>
    </div>
    <p v-if="isAiMode" class="wizard-hint">{{ t("llm.wizard.languageAiHint") }}</p>
    <p v-if="wizardState.language === 'graphml'" class="wizard-hint">
      {{ t("llm.wizard.languageGraphmlHint") }}
    </p>
  </div>

  <div v-else-if="currentStepId === 'type'" class="wizard-step">
    <p class="wizard-field__label">{{ t("llm.wizard.diagramType") }}</p>
    <div
      class="wizard-radio-list wizard-radio-list--grid"
      role="radiogroup"
      :aria-label="t('llm.wizard.diagramType')"
    >
      <button
        v-for="option in typeOptions"
        :key="option.id"
        class="wizard-radio-list__option wizard-radio-list__option--stacked"
        :class="{ 'is-active': wizardState.diagramType === option.id }"
        type="button"
        role="radio"
        :aria-checked="wizardState.diagramType === option.id"
        @click="emit('type-select', option.id)"
      >
        <span class="wizard-radio-list__label">{{ option.label }}</span>
        <span class="wizard-radio-list__desc">{{ option.description }}</span>
      </button>
    </div>
  </div>

  <div v-else-if="currentStepId === 'direction'" class="wizard-step">
    <p class="wizard-field__label">{{ t("llm.wizard.direction") }}</p>
    <div
      class="wizard-mode-toggle"
      role="radiogroup"
      :aria-label="t('llm.wizard.direction')"
    >
      <button
        v-for="option in directionOptions"
        :key="option.id"
        class="wizard-mode-toggle__option"
        :class="{ 'is-active': wizardState.direction === option.id }"
        type="button"
        role="radio"
        :aria-checked="wizardState.direction === option.id"
        @click="emit('direction-select', option.id)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>

  <div v-else-if="currentStepId === 'style'" class="wizard-step">
    <p class="wizard-field__label">{{ t("llm.wizard.theme") }}</p>
    <div
      class="wizard-mode-toggle"
      role="radiogroup"
      :aria-label="t('llm.wizard.theme')"
    >
      <button
        v-for="option in themeOptions"
        :key="option.id"
        class="wizard-mode-toggle__option"
        :class="{ 'is-active': wizardState.theme === option.id }"
        type="button"
        role="radio"
        :aria-checked="wizardState.theme === option.id"
        @click="emit('theme-select', option.id)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>

  <div v-else-if="currentStepId === 'params'" class="wizard-step">
    <p class="wizard-hint">{{ t("llm.wizard.paramsHint") }}</p>
    <label
      v-for="field in paramFields"
      :key="field.id"
      class="wizard-field wizard-field--inline"
    >
      <span class="wizard-field__label">{{ t(`llm.wizard.param.${field.id}`) }}</span>
      <input
        class="wizard-input"
        type="number"
        :min="field.min"
        :max="field.max"
        :value="wizardState.typeParams[field.id]"
        @change="emit('param-change', field.id, $event)"
      />
      <span class="wizard-field__hint">
        {{ t("llm.wizard.paramRange", { min: field.min, max: field.max }) }}
      </span>
    </label>

    <div v-if="structuralElementOptions.length > 0" class="wizard-structural">
      <p class="wizard-field__label">{{ t("llm.wizard.structuralElements") }}</p>
      <div class="wizard-structural__grid">
        <label
          v-for="option in structuralElementOptions"
          :key="option.id"
          class="wizard-structural__item"
        >
          <input
            type="checkbox"
            :checked="wizardState.structuralElements[option.id]"
            @change="emit('structural-toggle', option.id, $event)"
          />
          <span>{{ option.label }}</span>
        </label>
      </div>
    </div>

    <label v-if="!isAiMode" class="wizard-field">
      <span class="wizard-field__label">{{ t("llm.wizard.details") }}</span>
      <textarea
        v-model="wizardState.typeSpecificText"
        class="wizard-textarea"
        rows="3"
        :placeholder="t(`llm.wizard.detailsPlaceholder.${wizardState.diagramType}`)"
      />
    </label>
  </div>

  <div v-else-if="currentStepId === 'context'" class="wizard-step">
    <label class="wizard-field">
      <span class="wizard-field__label">
        {{ isAiMode ? t("llm.wizard.description") : t("llm.wizard.context") }}
      </span>
      <textarea
        v-model="wizardState.contextText"
        class="wizard-textarea"
        rows="6"
        :placeholder="
          isAiMode
            ? t('llm.wizard.descriptionPlaceholder')
            : t('llm.wizard.contextPlaceholder')
        "
      />
    </label>
  </div>

  <div v-else-if="currentStepId === 'prompt'" class="wizard-step">
    <label class="wizard-field">
      <span class="wizard-field__label">{{ t("llm.wizard.prompt") }}</span>
      <textarea
        v-model="wizardState.promptText"
        class="wizard-textarea"
        rows="10"
      />
    </label>
  </div>

  <div v-else class="wizard-step">
    <p v-if="isGenerating" class="wizard-status">{{ t("llm.wizard.generating") }}</p>
    <p v-if="errorMessage" class="wizard-error">{{ errorMessage }}</p>
    <p v-if="resultExplanation" class="wizard-explanation">{{ resultExplanation }}</p>
    <p v-if="isManualResultReady" class="wizard-hint">{{ t("llm.wizard.manualResultHint") }}</p>

    <div v-if="previewSvg || isPreviewLoading" class="wizard-preview-wrap">
      <div class="wizard-preview" :class="{ 'is-loading': isPreviewLoading }">
        <div v-if="isPreviewLoading">{{ t("app.loading") }}</div>
        <div v-else class="wizard-preview__svg" v-html="previewSvg" />
      </div>
    </div>
  </div>
</template>
