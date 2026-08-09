<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import {
  generateValidPlantUmlFullEdit,
  generateValidPlantUmlPatch,
} from "@/services/llm/llm-plantuml-edit";
import { requestsStructuralDiagramEdit } from "@/constants/llm-wizard";
import { useLocale } from "@/composables/useLocale";
import { LlmClientError } from "@/services/llm/llm-types";
import {
  appendLlmEditConversationMessages,
  clearLlmEditConversation,
  getLlmEditConversation,
} from "@/storage/llm-edit-conversation";
import type { LlmEditConversationMessage } from "@/types/llm-edit-conversation";
import {
  createLlmEditConversationMessage,
  toLlmChatMessages,
} from "@/utils/llm-edit-conversation";
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

const userPrompt = ref("");
const chatHistory = ref<LlmEditConversationMessage[]>([]);
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
  () => isFullDiagramMode.value || requestsStructuralDiagramEdit(userPrompt.value),
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

const hasChatHistory = computed(() => chatHistory.value.length > 0);

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

const canGenerate = computed(
  () => hasSource.value && userPrompt.value.trim().length > 0 && !isGenerating.value,
);

const canApplyPatch = computed(
  () => Boolean(resultPlantUml.value) && resultHasChanges.value && !isGenerating.value,
);

function resetGenerationState(): void {
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

async function loadConversationHistory(): Promise<void> {
  const documentKey = props.documentKey.trim();
  if (!documentKey) {
    chatHistory.value = [];
    return;
  }

  const conversation = await getLlmEditConversation(documentKey);
  chatHistory.value = conversation?.messages ?? [];
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetGenerationState();
      void loadConversationHistory();
    }
  },
);

async function persistConversationTurn(
  prompt: string,
  explanation: string | undefined,
  hasChanges: boolean,
): Promise<void> {
  const documentKey = props.documentKey.trim();
  if (!documentKey) {
    return;
  }

  const assistantContent =
    explanation?.trim() ||
    (hasChanges
      ? t("llm.patch.assistantApplied")
      : t("llm.patch.assistantNoChanges"));

  const updated = await appendLlmEditConversationMessages(documentKey, [
    createLlmEditConversationMessage("user", prompt),
    createLlmEditConversationMessage("assistant", assistantContent),
  ]);

  chatHistory.value = updated.messages;
}

async function onClearChatHistory(): Promise<void> {
  const documentKey = props.documentKey.trim();
  if (!documentKey) {
    chatHistory.value = [];
    return;
  }

  await clearLlmEditConversation(documentKey);
  chatHistory.value = [];
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
      error instanceof Error ? error.message : t("llm.patch.previewError");
  } finally {
    isPreviewLoading.value = false;
  }
}

async function onGenerate(): Promise<void> {
  if (!canGenerate.value) {
    return;
  }

  const prompt = userPrompt.value.trim();
  const priorMessages = toLlmChatMessages(chatHistory.value);

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

    resultPlantUml.value = result.plantuml;
    resultReplacement.value = result.replacement ?? "";
    resultHasChanges.value = result.hasChanges;
    resultExplanation.value = result.explanation ?? "";

    await persistConversationTurn(prompt, result.explanation, result.hasChanges);

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
    <p class="llm-modal-lead">{{ modalLead }}</p>

    <div v-if="hasChatHistory" class="llm-chat-history">
      <div class="llm-chat-history__header">
        <span class="llm-field__label">{{ t("llm.patch.chatHistory") }}</span>
        <button
          class="llm-chat-history__clear"
          type="button"
          @click="onClearChatHistory"
        >
          {{ t("llm.patch.clearChatHistory") }}
        </button>
      </div>
      <div class="llm-chat-history__messages">
        <div
          v-for="(message, index) in chatHistory"
          :key="`${message.createdAt}-${index}`"
          class="llm-chat-history__message"
          :class="`llm-chat-history__message--${message.role}`"
        >
          <span class="llm-chat-history__role">
            {{
              message.role === "user"
                ? t("llm.patch.chatRoleUser")
                : t("llm.patch.chatRoleAssistant")
            }}
          </span>
          <p class="llm-chat-history__content">{{ message.content }}</p>
        </div>
      </div>
    </div>

    <label class="llm-field">
      <span class="llm-field__label">{{ t("llm.patch.selection") }}</span>
      <pre
        class="llm-code-block"
        :class="{ 'llm-code-block--muted': isFullDiagramMode }"
      >{{ selectionLabel }}</pre>
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
        :disabled="!canGenerate"
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

.llm-chat-history {
  margin-bottom: 12px;
}

.llm-chat-history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.llm-chat-history__clear {
  border: none;
  padding: 0;
  background: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
}

.llm-chat-history__clear:hover {
  color: var(--text);
}

.llm-chat-history__messages {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
}

.llm-chat-history__message {
  margin: 0;
}

.llm-chat-history__role {
  display: block;
  margin-bottom: 2px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.llm-chat-history__content {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.4;
  white-space: pre-wrap;
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
