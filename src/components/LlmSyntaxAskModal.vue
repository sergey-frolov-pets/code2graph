<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { askPlantUmlSyntaxQuestion } from "@/services/llm/llm-plantuml-generate";
import { useLocale } from "@/composables/useLocale";
import { LlmClientError } from "@/services/llm/llm-types";

const props = defineProps<{
  open: boolean;
  source: string;
  initialQuestion?: string;
  openSettings?: () => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();

const userQuestion = ref("");
const isAsking = ref(false);
const errorMessage = ref("");
const answer = ref("");

const hasSource = computed(() => props.source.trim().length > 0);

const canAsk = computed(
  () => hasSource.value && userQuestion.value.trim().length > 0 && !isAsking.value,
);

function resetState(): void {
  userQuestion.value = props.initialQuestion ?? "";
  errorMessage.value = "";
  answer.value = "";
  isAsking.value = false;
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetState();
    }
  },
);

watch(
  () => props.initialQuestion,
  (question) => {
    if (props.open && question) {
      userQuestion.value = question;
    }
  },
);

async function onAsk(): Promise<void> {
  if (!canAsk.value) {
    return;
  }

  isAsking.value = true;
  errorMessage.value = "";
  answer.value = "";

  try {
    const result = await askPlantUmlSyntaxQuestion(
      props.source,
      userQuestion.value,
      { openSettings: props.openSettings },
    );
    answer.value = result.answer;
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
</script>

<template>
  <AppModal
    :open="open"
    wide
    :title="t('llm.syntaxAsk.title')"
    @close="emit('close')"
  >
    <p class="llm-modal-lead">{{ t("llm.syntaxAsk.lead") }}</p>

    <label class="llm-field">
      <span class="llm-field__label">{{ t("llm.syntaxAsk.question") }}</span>
      <textarea
        v-model="userQuestion"
        class="llm-textarea"
        rows="4"
        :placeholder="t('llm.syntaxAsk.questionPlaceholder')"
      />
    </label>

    <p v-if="errorMessage" class="llm-error">{{ errorMessage }}</p>

    <div v-if="answer" class="llm-field">
      <span class="llm-field__label">{{ t("llm.syntaxAsk.answer") }}</span>
      <pre class="llm-code-block llm-code-block--answer">{{ answer }}</pre>
    </div>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.close") }}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="!canAsk"
        @click="onAsk"
      >
        {{ isAsking ? t("llm.syntaxAsk.asking") : t("llm.syntaxAsk.ask") }}
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
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
}

.llm-code-block--answer {
  font-family: inherit;
  font-size: 0.9rem;
}

.llm-error {
  margin: 0 0 12px;
  color: var(--danger);
  font-size: 0.86rem;
}
</style>
