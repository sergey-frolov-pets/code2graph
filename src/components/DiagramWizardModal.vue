<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import { generateValidPlantUml } from "@/composables/useLlmPlantUmlGenerate";
import { useLocale } from "@/composables/useLocale";
import {
  buildWizardPrompt,
  DEFAULT_WIZARD_STATE,
  isWizardDiagramType,
  WIZARD_DIAGRAM_DIRECTIONS,
  WIZARD_DIAGRAM_THEMES,
  WIZARD_DIAGRAM_TYPES,
  type WizardState,
} from "@/constants/llm-wizard";
import { LlmClientError } from "@/services/llm/llm-types";
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
  apply: [payload: { plantuml: string; label: string }];
}>();

const { t } = useLocale();

const stepIndex = ref(0);
const wizardState = ref<WizardState>({ ...DEFAULT_WIZARD_STATE });
const isGenerating = ref(false);
const errorMessage = ref("");
const resultPlantUml = ref("");
const resultExplanation = ref("");
const previewSvg = ref("");
const isPreviewLoading = ref(false);

const totalSteps = 6;

const stepTitle = computed(() => {
  const keys = [
    "llm.wizard.step.type",
    "llm.wizard.step.style",
    "llm.wizard.step.context",
    "llm.wizard.step.details",
    "llm.wizard.step.prompt",
    "llm.wizard.step.result",
  ];
  return t(keys[stepIndex.value] ?? "llm.wizard.title");
});

const typeOptions = computed(() =>
  WIZARD_DIAGRAM_TYPES.map((id) => ({
    id,
    label: t(`llm.wizard.type.${id}`),
  })),
);

const canGoNext = computed(() => {
  if (stepIndex.value === 2) {
    return wizardState.value.contextText.trim().length > 0;
  }

  if (stepIndex.value === 4) {
    return wizardState.value.promptText.trim().length > 0;
  }

  return stepIndex.value < totalSteps - 1;
});

function resetWizard(): void {
  stepIndex.value = 0;
  wizardState.value = { ...DEFAULT_WIZARD_STATE };
  isGenerating.value = false;
  errorMessage.value = "";
  resultPlantUml.value = "";
  resultExplanation.value = "";
  previewSvg.value = "";
  isPreviewLoading.value = false;
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
  () => [
    wizardState.value.diagramType,
    wizardState.value.theme,
    wizardState.value.direction,
    wizardState.value.contextText,
    wizardState.value.typeSpecificText,
  ],
  () => {
    if (stepIndex.value < 4) {
      wizardState.value.promptText = buildWizardPrompt(wizardState.value);
    }
  },
  { deep: true },
);

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

function goBack(): void {
  if (stepIndex.value > 0) {
    stepIndex.value -= 1;
  }
}

function goNext(): void {
  if (stepIndex.value === 4) {
    wizardState.value.promptText = wizardState.value.promptText.trim() || buildWizardPrompt(wizardState.value);
    void generateDiagram();
    return;
  }

  if (canGoNext.value && stepIndex.value < totalSteps - 1) {
    stepIndex.value += 1;
  }
}

async function loadPreview(plantuml: string): Promise<void> {
  isPreviewLoading.value = true;
  try {
    previewSvg.value = await renderPlantUmlPreviewSvg(
      plantuml,
      props.layout,
      props.diagramDarkMode,
      props.renderMode,
    );
  } catch (error) {
    previewSvg.value = "";
    errorMessage.value =
      error instanceof Error ? error.message : t("llm.wizard.previewError");
  } finally {
    isPreviewLoading.value = false;
  }
}

async function generateDiagram(): Promise<void> {
  isGenerating.value = true;
  errorMessage.value = "";
  resultPlantUml.value = "";
  resultExplanation.value = "";
  previewSvg.value = "";
  stepIndex.value = 5;

  try {
    const result = await generateValidPlantUml(
      wizardState.value.promptText,
      props.layout,
      props.diagramDarkMode,
      props.renderMode,
      { openSettings: props.openSettings },
      "You create new PlantUML diagrams from structured wizard requirements.",
    );

    resultPlantUml.value = result.plantuml;
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

function onApply(): void {
  if (!resultPlantUml.value) {
    return;
  }

  emit("apply", {
    plantuml: resultPlantUml.value,
    label: t("llm.wizard.historyLabel", {
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

    <div v-if="stepIndex === 0" class="wizard-step">
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

    <div v-else-if="stepIndex === 1" class="wizard-step">
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
            {{ direction }}
          </option>
        </select>
      </label>
    </div>

    <div v-else-if="stepIndex === 2" class="wizard-step">
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

    <div v-else-if="stepIndex === 3" class="wizard-step">
      <label class="wizard-field">
        <span class="wizard-field__label">{{ t("llm.wizard.details") }}</span>
        <textarea
          v-model="wizardState.typeSpecificText"
          class="wizard-textarea"
          rows="5"
          :placeholder="t(`llm.wizard.detailsPlaceholder.${wizardState.diagramType}`)"
        />
      </label>
    </div>

    <div v-else-if="stepIndex === 4" class="wizard-step">
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
        v-if="stepIndex < 4"
        class="btn btn-primary"
        type="button"
        :disabled="!canGoNext"
        @click="goNext"
      >
        {{ t("llm.wizard.next") }}
      </button>
      <button
        v-else-if="stepIndex === 4"
        class="btn btn-primary"
        type="button"
        :disabled="!canGoNext || isGenerating"
        @click="goNext"
      >
        {{ isGenerating ? t("llm.wizard.generating") : t("llm.wizard.generate") }}
      </button>
      <button
        v-else
        class="btn btn-primary"
        type="button"
        :disabled="!resultPlantUml || isGenerating"
        @click="onApply"
      >
        {{ t("llm.wizard.apply") }}
      </button>
      <button
        v-if="stepIndex === 5 && !isGenerating"
        class="btn"
        type="button"
        @click="generateDiagram"
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

.wizard-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.wizard-field__label {
  font-size: 0.86rem;
  color: var(--text-muted);
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
