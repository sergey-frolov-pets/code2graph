<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import { generateValidPlantUmlPatch } from "@/composables/useLlmPlantUmlGenerate";
import { useLocale } from "@/composables/useLocale";
import { LlmClientError } from "@/services/llm/llm-types";
import {
  buildSimpleDiffPreview,
  extractSelectionFragment,
  renderPlantUmlPreviewSvg,
} from "@/utils/llm-preview";

const props = defineProps<{
  open: boolean;
  source: string;
  selectionStart: number;
  selectionEnd: number;
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

const userPrompt = ref("");
const isGenerating = ref(false);
const errorMessage = ref("");
const resultPlantUml = ref("");
const resultReplacement = ref("");
const resultHasChanges = ref(false);
const resultExplanation = ref("");
const previewSvg = ref("");
const isPreviewLoading = ref(false);

const selectedFragment = computed(() =>
  extractSelectionFragment(props.source, props.selectionStart, props.selectionEnd),
);

const hasSelection = computed(
  () => props.selectionEnd > props.selectionStart && selectedFragment.value.length > 0,
);

const diffPreview = computed(() => {
  if (!resultPlantUml.value) {
    return "";
  }

  if (!resultHasChanges.value) {
    return t("llm.patch.noChanges");
  }

  if (
    resultReplacement.value &&
    resultReplacement.value !== selectedFragment.value
  ) {
    return buildSimpleDiffPreview(
      selectedFragment.value,
      resultReplacement.value,
    ).slice(0, 2400);
  }

  return buildSimpleDiffPreview(props.source, resultPlantUml.value).slice(0, 2400);
});

const canApplyPatch = computed(
  () => Boolean(resultPlantUml.value) && resultHasChanges.value && !isGenerating.value,
);

function resetState(): void {
  userPrompt.value = "";
  errorMessage.value = "";
  resultPlantUml.value = "";
  resultReplacement.value = "";
  resultHasChanges.value = false;
  resultExplanation.value = "";
  previewSvg.value = "";
  isGenerating.value = false;
  isPreviewLoading.value = false;
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetState();
    }
  },
);

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
      error instanceof Error ? error.message : t("llm.patch.previewError");
  } finally {
    isPreviewLoading.value = false;
  }
}

async function onGenerate(): Promise<void> {
  if (!hasSelection.value || !userPrompt.value.trim()) {
    return;
  }

  isGenerating.value = true;
  errorMessage.value = "";
  resultPlantUml.value = "";
  resultReplacement.value = "";
  resultHasChanges.value = false;
  resultExplanation.value = "";
  previewSvg.value = "";

  try {
    const result = await generateValidPlantUmlPatch(
      props.source,
      props.selectionStart,
      props.selectionEnd,
      selectedFragment.value,
      userPrompt.value,
      props.layout,
      props.diagramDarkMode,
      props.renderMode,
      { openSettings: props.openSettings },
    );

    resultPlantUml.value = result.plantuml;
    resultReplacement.value = result.replacement ?? "";
    resultHasChanges.value = result.hasChanges;
    resultExplanation.value = result.explanation ?? "";

    if (!result.hasChanges) {
      errorMessage.value = t("llm.patch.noChangesHint");
    }

    await loadPreview(result.plantuml);
  } catch (error) {
    errorMessage.value =
      error instanceof LlmClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : t("llm.patch.generateError");
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
    label: t("llm.patch.historyLabel", { prompt: userPrompt.value.slice(0, 40) }),
  });
  emit("close");
}
</script>

<template>
  <AppModal
    :open="open"
    wide
    :title="t('llm.patch.title')"
    @close="emit('close')"
  >
    <p class="llm-modal-lead">{{ t("llm.patch.lead") }}</p>

    <label class="llm-field">
      <span class="llm-field__label">{{ t("llm.patch.selection") }}</span>
      <pre class="llm-code-block">{{ selectedFragment || t("llm.patch.noSelection") }}</pre>
    </label>

    <label class="llm-field">
      <span class="llm-field__label">{{ t("llm.patch.prompt") }}</span>
      <textarea
        v-model="userPrompt"
        class="llm-textarea"
        rows="4"
        :placeholder="t('llm.patch.promptPlaceholder')"
      />
    </label>

    <p v-if="errorMessage" class="llm-error">{{ errorMessage }}</p>

    <div v-if="resultExplanation" class="llm-explanation">
      {{ resultExplanation }}
    </div>

    <div v-if="diffPreview" class="llm-field">
      <span class="llm-field__label">{{ t("llm.patch.diff") }}</span>
      <pre class="llm-code-block llm-code-block--diff">{{ diffPreview }}</pre>
    </div>

    <div v-if="previewSvg || isPreviewLoading" class="llm-preview-wrap">
      <span class="llm-field__label">{{ t("llm.patch.preview") }}</span>
      <div class="llm-preview" :class="{ 'is-loading': isPreviewLoading }">
        <div v-if="isPreviewLoading">{{ t("app.loading") }}</div>
        <div v-else class="llm-preview__svg" v-html="previewSvg" />
      </div>
    </div>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.cancel") }}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="!hasSelection || !userPrompt.trim() || isGenerating"
        @click="onGenerate"
      >
        {{ isGenerating ? t("llm.patch.generating") : t("llm.patch.generate") }}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="!canApplyPatch"
        @click="onApply"
      >
        {{ t("llm.patch.apply") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.llm-modal-lead {
  margin: 0 0 12px;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.4;
}

.llm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.llm-field__label {
  font-size: 0.86rem;
  color: var(--text-muted);
}

.llm-textarea {
  width: 100%;
  min-height: 88px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text);
  resize: vertical;
}

.llm-code-block {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.45;
  max-height: 140px;
  overflow: auto;
  white-space: pre-wrap;
}

.llm-code-block--diff {
  max-height: 120px;
}

.llm-error {
  margin: 0 0 12px;
  color: var(--danger);
  font-size: 0.86rem;
}

.llm-explanation {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface-muted);
  font-size: 0.86rem;
  line-height: 1.4;
}

.llm-preview-wrap {
  margin-bottom: 8px;
}

.llm-preview {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--preview-bg);
  min-height: 120px;
  max-height: 280px;
  overflow: auto;
  padding: 8px;
}

.llm-preview.is-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.llm-preview__svg :deep(svg) {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
