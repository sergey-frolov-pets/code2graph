<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import { generateValidPlantUml } from "@/composables/useLlmPlantUmlGenerate";
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

const paramFields = computed((): WizardParamField[] =>
  WIZARD_TYPE_PARAM_FIELDS[wizardState.value.diagramType],
);

const isAiMode = computed(() => wizardState.value.creationMode === "ai");
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

function onLanguageChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (isWizardLanguage(value)) {
    wizardState.value.language = value;
  }
}

function onTypeChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value;
  if (isWizardDiagramType(value)) {
    wizardState.value.diagramType = value;
  }
}

function onThemeChange(event: Event): void {
  wizardState.value.theme = (event.target as HTMLSelectElement).value as WizardState["theme"];
}

function onDirectionChange(event: Event): void {
  wizardState.value.direction = (event.target as HTMLSelectElement).value as WizardState["direction"];
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
    if (wizardState.value.language === "mermaid") {
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
    const result = await generateValidPlantUml(
      wizardState.value.promptText,
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
      <div class="wizard-mode-grid">
        <button
          v-for="mode in WIZARD_CREATION_MODES"
          :key="mode"
          class="wizard-mode-card"
          :class="{ 'is-selected': wizardState.creationMode === mode }"
          type="button"
          @click="onModeSelect(mode)"
        >
          <span class="wizard-mode-card__title">{{ t(`llm.wizard.mode.${mode}`) }}</span>
          <span class="wizard-mode-card__desc">{{ t(`llm.wizard.mode.${mode}Desc`) }}</span>
        </button>
      </div>
    </div>

    <div v-else-if="currentStepId === 'language'" class="wizard-step">
      <label class="wizard-field">
        <span class="wizard-field__label">{{ t("llm.wizard.diagramLanguage") }}</span>
        <select
          class="select"
          :value="wizardState.language"
          @change="onLanguageChange"
        >
          <option v-for="option in languageOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>
      </label>
      <p v-if="isAiMode" class="wizard-hint">{{ t("llm.wizard.languageAiHint") }}</p>
    </div>

    <div v-else-if="currentStepId === 'type'" class="wizard-step">
      <label class="wizard-field">
        <span class="wizard-field__label">{{ t("llm.wizard.diagramType") }}</span>
        <select
          class="select"
          :value="wizardState.diagramType"
          @change="onTypeChange"
        >
          <option v-for="option in typeOptions" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <div v-else-if="currentStepId === 'direction'" class="wizard-step">
      <label class="wizard-field">
        <span class="wizard-field__label">{{ t("llm.wizard.direction") }}</span>
        <select
          class="select"
          :value="wizardState.direction"
          @change="onDirectionChange"
        >
          <option
            v-for="direction in WIZARD_DIAGRAM_DIRECTIONS"
            :key="direction"
            :value="direction"
          >
            {{ t(`llm.wizard.direction.${direction}`) }}
          </option>
        </select>
      </label>
    </div>

    <div v-else-if="currentStepId === 'style'" class="wizard-step">
      <label class="wizard-field">
        <span class="wizard-field__label">{{ t("llm.wizard.theme") }}</span>
        <select class="select" :value="wizardState.theme" @change="onThemeChange">
          <option
            v-for="theme in WIZARD_DIAGRAM_THEMES"
            :key="theme"
            :value="theme"
          >
            {{ t(`llm.wizard.theme.${theme}`) }}
          </option>
        </select>
      </label>
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

.wizard-mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.wizard-mode-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-muted);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.wizard-mode-card:hover {
  border-color: var(--primary);
}

.wizard-mode-card.is-selected {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--surface-muted));
}

.wizard-mode-card__title {
  font-weight: 600;
}

.wizard-mode-card__desc {
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.35;
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
