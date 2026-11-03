<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import LlmChatPanel from "@/components/llm/LlmChatPanel.vue";
import LoadingState from "@/components/ui/LoadingState.vue";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import {
  generateValidPlantUmlFullEdit,
  generateValidPlantUmlPatch,
} from "@/services/llm/llm-plantuml-edit";
import { requestsStructuralDiagramEdit } from "@/constants/llm-wizard";
import { useActiveLlmLabel } from "@/composables/useActiveLlmLabel";
import { useLlmConversation } from "@/composables/useLlmConversation";
import { useLocale } from "@/composables/useLocale";
import { LlmClientError } from "@/services/llm/llm-types";
import { toLlmChatMessages } from "@/utils/llm-edit-conversation";
import {
  buildSimpleDiffPreview,
  extractSelectionFragment,
  renderPlantUmlPreviewSvg,
} from "@/utils/llm-preview";

const props = defineProps<{
  open: boolean;
  source: string;
  documentKey: string;
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
const { activeLlmDetail } = useActiveLlmLabel();

const documentKeyRef = computed(() => props.documentKey);
const conversation = useLlmConversation(documentKeyRef, "patch");

const lastUserPrompt = ref("");
const isGenerating = ref(false);
const errorMessage = ref("");
const resultPlantUml = ref("");
const resultReplacement = ref("");
const resultHasChanges = ref(false);
const resultExplanation = ref("");
const previewSvg = ref("");
const isPreviewLoading = ref(false);

const hasSource = computed(() => props.source.trim().length > 0);

const isFullDiagramMode = computed(
  () => props.selectionEnd <= props.selectionStart,
);

const useWholeDiagramEdit = computed(
  () =>
    isFullDiagramMode.value ||
    requestsStructuralDiagramEdit(lastUserPrompt.value),
);

const selectedFragment = computed(() =>
  extractSelectionFragment(props.source, props.selectionStart, props.selectionEnd),
);

const hasSelection = computed(
  () =>
    !isFullDiagramMode.value &&
    props.selectionEnd > props.selectionStart &&
    selectedFragment.value.length > 0,
);

const modalLead = computed(() =>
  useWholeDiagramEdit.value ? t("llm.patch.leadFull") : t("llm.patch.lead"),
);

const selectionLabel = computed(() =>
  useWholeDiagramEdit.value
    ? t("llm.patch.wholeDiagram")
    : selectedFragment.value || t("llm.patch.noSelection"),
);

const diffPreview = computed(() => {
  if (!resultPlantUml.value) {
    return "";
  }

  if (!resultHasChanges.value) {
    return t("llm.patch.noChanges");
  }

  if (
    hasSelection.value &&
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

function resetResultState(): void {
  errorMessage.value = "";
  resultPlantUml.value = "";
  resultReplacement.value = "";
  resultHasChanges.value = false;
  resultExplanation.value = "";
  previewSvg.value = "";
  isGenerating.value = false;
  isPreviewLoading.value = false;
  lastUserPrompt.value = "";
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetResultState();
      void conversation.load();
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

function assistantContentFromResult(
  result: {
    needsClarification?: boolean;
    clarificationQuestion?: string;
    explanation?: string;
    hasChanges: boolean;
  },
): string {
  if (result.needsClarification && result.clarificationQuestion) {
    return result.clarificationQuestion;
  }

  return (
    result.explanation?.trim() ||
    (result.hasChanges
      ? t("llm.patch.assistantApplied")
      : t("llm.patch.assistantNoChanges"))
  );
}

async function onChatSend(prompt: string): Promise<void> {
  if (!hasSource.value || isGenerating.value) {
    return;
  }

  lastUserPrompt.value = prompt;
  const priorMessages = toLlmChatMessages(conversation.messages.value);

  isGenerating.value = true;
  errorMessage.value = "";
  resultPlantUml.value = "";
  resultReplacement.value = "";
  resultHasChanges.value = false;
  resultExplanation.value = "";
  previewSvg.value = "";

  try {
    const handlers = { openSettings: props.openSettings };
    const result = useWholeDiagramEdit.value
      ? await generateValidPlantUmlFullEdit(
          props.source,
          prompt,
          props.layout,
          props.diagramDarkMode,
          props.renderMode,
          handlers,
          priorMessages,
        )
      : await generateValidPlantUmlPatch(
          props.source,
          props.selectionStart,
          props.selectionEnd,
          selectedFragment.value,
          prompt,
          props.layout,
          props.diagramDarkMode,
          props.renderMode,
          handlers,
          priorMessages,
        );

    await conversation.appendTurn(
      prompt,
      assistantContentFromResult(result),
    );

    if (result.needsClarification) {
      return;
    }

    resultPlantUml.value = result.plantuml;
    resultReplacement.value = result.replacement ?? "";
    resultHasChanges.value = result.hasChanges;
    resultExplanation.value = result.explanation ?? "";

    if (!result.hasChanges) {
      errorMessage.value = useWholeDiagramEdit.value
        ? t("llm.patch.noChangesHintFull")
        : t("llm.patch.noChangesHint");
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
    label: t("llm.patch.historyLabel", {
      prompt: lastUserPrompt.value.slice(0, 40),
    }),
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
    <p class="llm-modal-lead">{{ modalLead }}</p>

    <label class="llm-field">
      <span class="llm-field__label">{{ t("llm.patch.selection") }}</span>
      <pre
        class="llm-code-block"
        :class="{ 'llm-code-block--muted': isFullDiagramMode }"
      >{{ selectionLabel }}</pre>
    </label>

    <LlmChatPanel
      :messages="conversation.messages.value"
      :is-busy="isGenerating"
      :placeholder="t('llm.patch.promptPlaceholder')"
      show-clear
      @send="onChatSend"
      @clear="conversation.clear()"
    />

    <p v-if="errorMessage" class="llm-error">{{ errorMessage }}</p>

    <LoadingState
      v-if="isGenerating"
      compact
      :message="t('llm.patch.generating')"
      :detail="activeLlmDetail"
    />

    <div v-if="resultExplanation && resultHasChanges" class="llm-explanation">
      {{ resultExplanation }}
    </div>

    <div v-if="diffPreview && resultHasChanges" class="llm-field">
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

.llm-code-block--muted {
  font-family: inherit;
  font-size: 0.86rem;
  color: var(--text-muted);
  max-height: none;
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
