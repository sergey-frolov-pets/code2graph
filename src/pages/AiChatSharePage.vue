<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useLocale } from "@/composables/useLocale";
import {
  fetchAiChatShare,
  readAiChatShareToken,
} from "@/services/library/api/ai-chat-share";
import type { AiChatShareSnapshot } from "@/types/ai-chat-session";

const { t } = useLocale();
const snapshot = ref<AiChatShareSnapshot | null>(null);
const errorMessage = ref("");
const isLoading = ref(true);

async function copySource(): Promise<void> {
  if (!snapshot.value?.source) {
    return;
  }
  try {
    await navigator.clipboard.writeText(snapshot.value.source);
  } catch {
    // ignore
  }
}

onMounted(async () => {
  const token = readAiChatShareToken(window.location.search);
  if (!token) {
    errorMessage.value = t("aiChat.shareNotFound");
    isLoading.value = false;
    return;
  }
  try {
    snapshot.value = await fetchAiChatShare(token);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("aiChat.shareNotFound");
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <main class="ai-chat-share-page">
    <p v-if="isLoading">{{ t("app.loading") }}</p>
    <p v-else-if="errorMessage" role="alert">{{ errorMessage }}</p>
    <template v-else-if="snapshot">
      <h1>{{ snapshot.title }}</h1>
      <p class="ai-chat-share-page__meta">
        {{ t("aiChat.sharedReadOnly") }} · {{ snapshot.diagramFormat }}
      </p>

      <section class="ai-chat-share-page__transcript">
        <article
          v-for="(message, index) in snapshot.messages"
          :key="index"
          class="ai-chat-share-page__message"
          :class="`ai-chat-share-page__message--${message.role}`"
        >
          <strong>{{
            message.role === "user" ? t("llm.chat.roleUser") : t("llm.chat.roleAssistant")
          }}</strong>
          <p>{{ message.content }}</p>
        </article>
      </section>

      <section v-if="snapshot.source" class="ai-chat-share-page__source">
        <div class="ai-chat-share-page__source-head">
          <h2>{{ t("editor.title") }}</h2>
          <button class="btn" type="button" @click="copySource">
            {{ t("library.shareCopy") }}
          </button>
        </div>
        <pre>{{ snapshot.source }}</pre>
      </section>
    </template>
  </main>
</template>

<style scoped>
.ai-chat-share-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-chat-share-page__meta {
  color: var(--text-muted);
  margin: 0;
}

.ai-chat-share-page__transcript {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-chat-share-page__message {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--surface-muted);
}

.ai-chat-share-page__message p {
  white-space: pre-wrap;
  margin: 6px 0 0;
}

.ai-chat-share-page__source pre {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
  background: var(--surface-muted);
}

.ai-chat-share-page__source-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
