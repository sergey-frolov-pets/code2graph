<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import { generateValidWizardDiagram } from "@/composables/useLlmPlantUmlGenerate";
import { useLocale } from "@/composables/useLocale";
import {
  buildManualScaffold,
  buildWizardPrompt,
  createDefaultTypeParams,
  DEFAULT_WIZARD_STATE,
  getWizardLanguagesForMode,
  getWizardStepTitleKey,
  getWizardSteps,
  getWizardTypesForLanguage,
  isWizardDiagramType,
  isWizardLanguage,
  WIZARD_CREATION_MODES,
  WIZARD_DIAGRAM_DIRECTIONS,
  WIZARD_DIAGRAM_THEMES,
  WIZARD_TYPE_PARAM_FIELDS,
  type WizardParamField,
  type WizardState,
} from "@/constants/llm-wizard";
import { LlmClientError } from "@/services/llm/llm-types";
import { renderGraphmlToSvg } from "@/services/graphml/graphml-engine";
import { renderMermaidToSvg } from "@/services/mermaid/mermaid-engine";
import { renderPlantUmlPreviewSvg } from "@/utils/llm-preview";

const props = defineProps<{
  open: boolean;
  layout: LayoutEngine;
  renderMode: RenderMode;
  diagramDarkMode: boolean;
  openSettings?: () => void;
}>();

const emit = defineEmits<{
  close: [];
  apply: [payload: { source: string; label: string }];
}>();

const { t, locale } = useLocale();

const stepIndex = ref(0);
const wizardState = ref<WizardState>({ ...DEFAULT_WIZARD_STATE, typeParams: createDefaultTypeParams() });
const isGenerating = ref(false);
const errorMessage = ref("");
const resultSource = ref("");
const resultExplanation = ref("");
const previewSvg = ref("");
const isPreviewLoading = ref(false);

const wizardSteps = computed(() => getWizardSteps(wizardState.value));
const currentStepId = computed(() => wizardSteps.value[stepIndex.value] ?? "mode");
const totalSteps = computed(() => wizardSteps.value.length);

const stepTitle = computed(() => t(getWizardStepTitleKey(currentStepId.value)));

const languageOptions = computed(() =>
  getWizardLanguagesForMode(wizardState.value.creationMode).map((id) => ({
    id,
    label: t(`llm.wizard.language.${id}`),
  })),
);

const typeOptions = computed(() =>
  getWizardTypesForLanguage(wizardState.value.language).map((id) => ({
    id,
    label: t(`llm.wizard.type.${id}`),
  })),
);

const directionOptions = computed(() =>
  WIZARD_DIAGRAM_DIRECTIONS.map((id) => ({
    id,
    label: t(`llm.wizard.direction.${id}`),
  })),
);

const themeOptions = computed(() =>
  WIZARD_DIAGRAM_THEMES.map((id) => ({
    id,
    label: t(`llm.wizard.theme.${id}`),
  })),
);

const paramFields = computed((): WizardParamField[] =>
  WIZARD_TYPE_PARAM_FIELDS[wizardState.value.diagramType],
);

const isAiMode = computed(() => wizardState.value.creationMode === "ai");
const selectedModeDescription = computed(() =>
  t(`llm.wizard.mode.${wizardState.value.creationMode}Desc`),
);
const isManualResultReady = computed(
  () => !isAiMode.value && currentStepId.value === "result" && resultSource.value.length > 0,
);

const canGoNext = computed(() => {
  if (currentStepId.value === "context") {
    return wizardState.value.contextText.trim().length > 0;
  }

  if (currentStepId.value === "prompt") {
    return wizardState.value.promptText.trim().length > 0;
  }

  return stepIndex.value < totalSteps.value - 1;
});

function resetWizard(): void {
  stepIndex.value = 0;
  wizardState.value = {
    ...DEFAULT_WIZARD_STATE,
    typeParams: createDefaultTypeParams(),
  };
  isGenerating.value = false;
  errorMessage.value = "";
  resultSource.value = "";
  resultExplanation.value = "";
  previewSvg.value = "";
  isPreviewLoading.value = false;
}

function clampStepIndex(): void {
  const maxIndex = Math.max(0, wizardSteps.value.length - 1);
  if (stepIndex.value > maxIndex) {
    stepIndex.value = maxIndex;
  }
}

function syncLanguageForMode(): void {
  const allowed = getWizardLanguagesForMode(wizardState.value.creationMode);
  if (!allowed.includes(wizardState.value.language)) {
    wizardState.value.language = allowed[0];
  }
}

function syncModeForLanguage(): void {
  if (
    wizardState.value.language === "graphml" &&
    wizardState.value.creationMode === "ai"
  ) {
    wizardState.value.creationMode = "manual";
  }
}

function syncTypeForLanguage(): void {
  const allowed = getWizardTypesForLanguage(wizardState.value.language);
  if (!allowed.includes(wizardState.value.diagramType)) {
    wizardState.value.diagramType = allowed[0];
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetWizard();
    }
  },
);

watch(
  () => wizardState.value.creationMode,
  () => {
    syncLanguageForMode();
    syncTypeForLanguage();
    clampStepIndex();
  },
);

watch(
  () => wizardState.value.language,
  () => {
    syncModeForLanguage();
    syncTypeForLanguage();
    clampStepIndex();
  },
);

watch(
  () => wizardState.value.diagramType,
  () => {
    clampStepIndex();
  },
);

watch(
  () => [
    wizardState.value.creationMode,
    wizardState.value.language,
    wizardState.value.diagramType,
    wizardState.value.theme,
    wizardState.value.direction,
    wizardState.value.typeParams,
    wizardState.value.contextText,
    wizardState.value.typeSpecificText,
  ],
  () => {
    if (currentStepId.value === "prompt" || wizardSteps.value.includes("prompt")) {
      const promptStepIndex = wizardSteps.value.indexOf("prompt");
      if (promptStepIndex >= 0 && stepIndex.value <= promptStepIndex) {
        wizardState.value.promptText = buildWizardPrompt(wizardState.value);
      }
    }
  },
  { deep: true },
);

function onModeSelect(mode: string): void {
  if (mode === "ai" || mode === "manual") {
    wizardState.value.creationMode = mode;
  }
}

function onLanguageSelect(language: string): void {
  if (isWizardLanguage(language)) {
    wizardState.value.language = language;
  }
}

function onTypeSelect(diagramType: string): void {
  if (isWizardDiagramType(diagramType)) {
    wizardState.value.diagramType = diagramType;
  }
}

function onThemeSelect(theme: WizardState["theme"]): void {
  wizardState.value.theme = theme;
}

function onDirectionSelect(direction: WizardState["direction"]): void {
  wizardState.value.direction = direction;
}

function onParamChange(paramId: WizardParamField["id"], event: Event): void {
  const raw = Number((event.target as HTMLInputElement).value);
  const field = paramFields.value.find((item) => item.id === paramId);
  if (!field || Number.isNaN(raw)) {
    return;
  }

  wizardState.value.typeParams[paramId] = Math.min(field.max, Math.max(field.min, raw));
}

function goBack(): void {
  if (stepIndex.value > 0) {
    stepIndex.value -= 1;
  }
}

async function loadPreview(source: string): Promise<void> {
  isPreviewLoading.value = true;
  try {
    if (wizardState.value.language === "graphml") {
      previewSvg.value = await renderGraphmlToSvg(source, {
        dark: props.diagramDarkMode,
        direction: wizardState.value.direction,
      });
    } else if (wizardState.value.language === "mermaid") {
      previewSvg.value = await renderMermaidToSvg(
        source,
        { dark: props.diagramDarkMode },
        props.renderMode,
      );
    } else {
      previewSvg.value = await renderPlantUmlPreviewSvg(
        source,
        props.layout,
        props.diagramDarkMode,
        props.renderMode,
      );
    }
  } catch (error) {
    previewSvg.value = "";
    errorMessage.value =
      error instanceof Error ? error.message : t("llm.wizard.previewError");
  } finally {
    isPreviewLoading.value = false;
  }
}

async function prepareManualResult(): Promise<void> {
  errorMessage.value = "";
  resultExplanation.value = "";
  resultSource.value = buildManualScaffold(wizardState.value, locale.value);
  await loadPreview(resultSource.value);
}

async function generateDiagram(): Promise<void> {
  isGenerating.value = true;
  errorMessage.value = "";
  resultSource.value = "";
  resultExplanation.value = "";
  previewSvg.value = "";

  try {
    const result = await generateValidWizardDiagram(
      wizardState.value.promptText,
      wizardState.value.language,
      props.layout,
      props.diagramDarkMode,
      props.renderMode,
      { openSettings: props.openSettings },
      "You create new diagrams from structured wizard requirements.",
    );

    resultSource.value = result.plantuml;
    resultExplanation.value = result.explanation ?? "";
    await loadPreview(result.plantuml);
  } catch (error) {
    errorMessage.value =
      error instanceof LlmClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : t("llm.wizard.generateError");
  } finally {
    isGenerating.value = false;
  }
}

function goNext(): void {
  if (currentStepId.value === "prompt") {
    wizardState.value.promptText =
      wizardState.value.promptText.trim() || buildWizardPrompt(wizardState.value);
    stepIndex.value += 1;
    void generateDiagram();
    return;
  }

  if (currentStepId.value === "params" && !isAiMode.value) {
    stepIndex.value += 1;
    void prepareManualResult();
    return;
  }

  if (canGoNext.value && stepIndex.value < totalSteps.value - 1) {
    stepIndex.value += 1;
  }
}

function onApply(): void {
  if (!resultSource.value) {
    return;
  }

  const modeLabel =
    wizardState.value.creationMode === "ai"
      ? t("llm.wizard.mode.ai")
      : t("llm.wizard.mode.manual");

  emit("apply", {
    source: resultSource.value,
    label: t("llm.wizard.historyLabel", {
      mode: modeLabel,
      type: t(`llm.wizard.type.${wizardState.value.diagramType}`),
    }),
  });
  emit("close");
}
</script>

<template>
  <AppModal
    :open="open"
    wide
    :title="t('llm.wizard.title')"
    @close="emit('close')"
  >
    <p class="wizard-step-title">{{ stepTitle }}</p>
    <p class="wizard-step-meta">
      {{ t("llm.wizard.stepCounter", { current: stepIndex + 1, total: totalSteps }) }}
    </p>

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
          @click="onModeSelect(mode)"
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
          @click="onLanguageSelect(option.id)"
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
          class="wizard-radio-list__option"
          :class="{ 'is-active': wizardState.diagramType === option.id }"
          type="button"
          role="radio"
          :aria-checked="wizardState.diagramType === option.id"
          @click="onTypeSelect(option.id)"
        >
          {{ option.label }}
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
          @click="onDirectionSelect(option.id)"
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
          @click="onThemeSelect(option.id)"
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
          @change="onParamChange(field.id, $event)"
        />
        <span class="wizard-field__hint">
          {{ t("llm.wizard.paramRange", { min: field.min, max: field.max }) }}
        </span>
      </label>

      <label v-if="isAiMode" class="wizard-field">
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
        <span class="wizard-field__label">{{ t("llm.wizard.context") }}</span>
        <textarea
          v-model="wizardState.contextText"
          class="wizard-textarea"
          rows="6"
          :placeholder="t('llm.wizard.contextPlaceholder')"
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

    <template #footer>
      <button
        class="btn"
        type="button"
        :disabled="stepIndex === 0 || isGenerating"
        @click="goBack"
      >
        {{ t("llm.wizard.back") }}
      </button>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.cancel") }}
      </button>
      <button
        v-if="currentStepId !== 'result' && currentStepId !== 'prompt'"
        class="btn btn-primary"
        type="button"
        :disabled="!canGoNext || isGenerating"
        @click="goNext"
      >
        {{ t("llm.wizard.next") }}
      </button>
      <button
        v-if="currentStepId === 'prompt'"
        class="btn btn-primary"
        type="button"
        :disabled="!canGoNext || isGenerating"
        @click="goNext"
      >
        {{ isGenerating ? t("llm.wizard.generating") : t("llm.wizard.generate") }}
      </button>
      <button
        v-if="currentStepId === 'result'"
        class="btn btn-primary"
        type="button"
        :disabled="!resultSource || isGenerating"
        @click="onApply"
      >
        {{ t("llm.wizard.apply") }}
      </button>
      <button
        v-if="currentStepId === 'result' && isAiMode && !isGenerating"
        class="btn"
        type="button"
        @click="generateDiagram"
      >
        {{ t("llm.wizard.regenerate") }}
      </button>
      <button
        v-if="currentStepId === 'result' && !isAiMode && !isGenerating"
        class="btn"
        type="button"
        @click="prepareManualResult"
      >
        {{ t("llm.wizard.regenerate") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.wizard-step-title {
  margin: 0 0 4px;
  font-weight: 600;
}

.wizard-step-meta {
  margin: 0 0 14px;
  font-size: 0.84rem;
  color: var(--text-muted);
}

.wizard-step {
  min-height: 180px;
}

.wizard-hint {
  margin: 0 0 12px;
  font-size: 0.86rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.wizard-mode-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-muted);
}

.wizard-mode-toggle__option {
  min-height: 40px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.wizard-mode-toggle__option:hover:not(.is-active) {
  color: var(--text);
  background: color-mix(in srgb, var(--text) 4%, transparent);
}

.wizard-mode-toggle__option.is-active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--accent) 35%, transparent);
}

.wizard-mode-toggle__desc {
  margin: 12px 0 0;
  font-size: 0.86rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.wizard-radio-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-muted);
}

.wizard-radio-list--grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wizard-radio-list__option {
  min-height: 40px;
  padding: 8px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}

.wizard-radio-list__option:hover:not(.is-active) {
  color: var(--text);
  background: color-mix(in srgb, var(--text) 4%, transparent);
}

.wizard-radio-list__option.is-active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--accent) 35%, transparent);
}

.wizard-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.wizard-field--inline {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
}

.wizard-field__label {
  font-size: 0.86rem;
  color: var(--text-muted);
  min-width: 140px;
}

.wizard-field__hint {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.wizard-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface-muted);
  color: var(--text);
}

.wizard-textarea {
  width: 100%;
  min-height: 120px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.45;
  resize: vertical;
}

.wizard-status {
  margin: 0 0 12px;
  color: var(--text-muted);
}

.wizard-error {
  margin: 0 0 12px;
  color: var(--danger);
  font-size: 0.86rem;
}

.wizard-explanation {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface-muted);
  font-size: 0.86rem;
  line-height: 1.4;
}

.wizard-preview-wrap {
  margin-top: 8px;
}

.wizard-preview {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--preview-bg);
  min-height: 160px;
  max-height: 320px;
  overflow: auto;
  padding: 8px;
}

.wizard-preview.is-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.wizard-preview__svg :deep(svg) {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
