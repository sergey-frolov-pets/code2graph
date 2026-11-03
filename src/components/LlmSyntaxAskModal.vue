<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import LlmChatPanel from "@/components/llm/LlmChatPanel.vue";
import { askPlantUmlSyntaxQuestion } from "@/services/llm/llm-plantuml-generate";
import { useLlmConversation } from "@/composables/useLlmConversation";
import { useLocale } from "@/composables/useLocale";
import { LlmClientError } from "@/services/llm/llm-types";
import { toLlmChatMessages } from "@/utils/llm-edit-conversation";

const props = defineProps<{
  open: boolean;
  source: string;
  documentKey: string;
  initialQuestion?: string;
  openSettings?: () => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();

const documentKeyRef = toRef(props, "documentKey");
const conversation = useLlmConversation(documentKeyRef, "syntax-ask");

const isAsking = ref(false);
const errorMessage = ref("");
const pendingInitialQuestion = ref("");

const hasSource = computed(() => props.source.trim().length > 0);

function resetTransientState(): void {
  errorMessage.value = "";
  isAsking.value = false;
  pendingInitialQuestion.value = props.initialQuestion?.trim() ?? "";
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetTransientState();
      void conversation.load();
    }
  },
);

watch(
  () => props.initialQuestion,
  (question) => {
    if (props.open && question?.trim()) {
      pendingInitialQuestion.value = question.trim();
    }
  },
);

async function onChatSend(question: string): Promise<void> {
  if (!hasSource.value || isAsking.value) {
    return;
  }

  isAsking.value = true;
  errorMessage.value = "";

  try {
    const priorMessages = toLlmChatMessages(conversation.messages.value);
    const result = await askPlantUmlSyntaxQuestion(
      props.source,
      question,
      { openSettings: props.openSettings },
      priorMessages,
    );

    const assistantContent =
      result.clarificationQuestion?.trim() || result.answer?.trim() || "";

    if (!assistantContent) {
      throw new LlmClientError("validation_failed", t("llm.syntaxAsk.askError"));
    }

    await conversation.appendTurn(question, assistantContent);
  } catch (error) {
    errorMessage.value =
      error instanceof LlmClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : t("llm.syntaxAsk.askError");
  } finally {
    isAsking.value = false;
  }
}

watch(
  [() => props.open, () => conversation.isLoading.value],
  ([isOpen, loading]) => {
    if (!isOpen || loading || isAsking.value) {
      return;
    }

    const initial = pendingInitialQuestion.value.trim();
    if (initial && conversation.messages.value.length === 0) {
      pendingInitialQuestion.value = "";
      void onChatSend(initial);
    }
  },
);
</script>

<template>
  <AppModal
    :open="open"
    wide
    :title="t('llm.syntaxAsk.title')"
    @close="emit('close')"
  >
    <p class="llm-modal-lead">{{ t("llm.syntaxAsk.lead") }}</p>

    <LlmChatPanel
      :messages="conversation.messages.value"
      :is-busy="isAsking"
      :placeholder="t('llm.syntaxAsk.questionPlaceholder')"
      show-clear
      @send="onChatSend"
      @clear="conversation.clear()"
    />

    <p v-if="errorMessage" class="llm-error">{{ errorMessage }}</p>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.close") }}
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

.llm-error {
  margin: 0 0 12px;
  color: var(--danger);
  font-size: 0.86rem;
}
</style>
