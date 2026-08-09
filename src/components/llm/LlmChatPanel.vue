<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { LlmEditConversationMessage } from "@/types/llm-edit-conversation";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  messages: LlmEditConversationMessage[];
  isBusy?: boolean;
  placeholder?: string;
  showClear?: boolean;
}>();

const emit = defineEmits<{
  send: [content: string];
  clear: [];
}>();

const { t } = useLocale();

const draft = ref("");
const messagesEl = ref<HTMLElement | null>(null);

const canSend = computed(
  () => draft.value.trim().length > 0 && !props.isBusy,
);

const hasMessages = computed(() => props.messages.length > 0);

function scrollToBottom(): void {
  nextTick(() => {
    const element = messagesEl.value;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  });
}

watch(
  () => props.messages.length,
  () => scrollToBottom(),
);

watch(
  () => props.isBusy,
  (busy) => {
    if (!busy) {
      scrollToBottom();
    }
  },
);

function onSend(): void {
  const content = draft.value.trim();
  if (!content || props.isBusy) {
    return;
  }

  draft.value = "";
  emit("send", content);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    onSend();
  }
}
</script>

<template>
  <div class="llm-chat-panel">
    <div v-if="hasMessages" class="llm-chat-panel__header">
      <span class="llm-chat-panel__title">{{ t("llm.chat.title") }}</span>
      <button
        v-if="showClear"
        class="llm-chat-panel__clear"
        type="button"
        :disabled="isBusy"
        @click="emit('clear')"
      >
        {{ t("llm.chat.clear") }}
      </button>
    </div>

    <div
      ref="messagesEl"
      class="llm-chat-panel__messages"
      :class="{ 'llm-chat-panel__messages--empty': !hasMessages }"
    >
      <p v-if="!hasMessages" class="llm-chat-panel__empty">
        {{ t("llm.chat.empty") }}
      </p>
      <div
        v-for="(message, index) in messages"
        :key="`${message.createdAt}-${index}`"
        class="llm-chat-panel__message"
        :class="`llm-chat-panel__message--${message.role}`"
      >
        <span class="llm-chat-panel__role">
          {{
            message.role === "user"
              ? t("llm.chat.roleUser")
              : t("llm.chat.roleAssistant")
          }}
        </span>
        <p class="llm-chat-panel__content">{{ message.content }}</p>
      </div>
      <p v-if="isBusy" class="llm-chat-panel__thinking">{{ t("llm.chat.thinking") }}</p>
    </div>

    <div class="llm-chat-panel__composer">
      <textarea
        v-model="draft"
        class="llm-chat-panel__input"
        rows="3"
        :placeholder="placeholder ?? t('llm.chat.inputPlaceholder')"
        :disabled="isBusy"
        @keydown="onKeydown"
      />
      <button
        class="btn btn-primary llm-chat-panel__send"
        type="button"
        :disabled="!canSend"
        @click="onSend"
      >
        {{ isBusy ? t("llm.chat.sending") : t("llm.chat.send") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.llm-chat-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.llm-chat-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.llm-chat-panel__title {
  font-size: 0.86rem;
  color: var(--text-muted);
}

.llm-chat-panel__clear {
  border: none;
  padding: 0;
  background: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: underline;
}

.llm-chat-panel__clear:hover:not(:disabled) {
  color: var(--text);
}

.llm-chat-panel__clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.llm-chat-panel__messages {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
  max-height: 280px;
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
}

.llm-chat-panel__messages--empty {
  align-items: center;
  justify-content: center;
}

.llm-chat-panel__empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.86rem;
  text-align: center;
}

.llm-chat-panel__message--assistant .llm-chat-panel__content {
  color: var(--text);
}

.llm-chat-panel__role {
  display: block;
  margin-bottom: 2px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.llm-chat-panel__content {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.45;
  white-space: pre-wrap;
}

.llm-chat-panel__thinking {
  margin: 0;
  font-size: 0.84rem;
  color: var(--text-muted);
}

.llm-chat-panel__composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.llm-chat-panel__input {
  width: 100%;
  min-height: 72px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text);
  resize: vertical;
}

.llm-chat-panel__input:disabled {
  opacity: 0.7;
}

.llm-chat-panel__send {
  align-self: flex-end;
}
</style>
