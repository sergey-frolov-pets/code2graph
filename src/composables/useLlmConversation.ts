import { ref, watch, type Ref } from "vue";
import type { LlmConversationKind } from "@/constants/llm-conversation";
import {
  appendLlmEditConversationMessages,
  clearLlmEditConversation,
  getLlmEditConversation,
} from "@/storage/llm-edit-conversation";
import type { LlmEditConversationMessage } from "@/types/llm-edit-conversation";
import { buildLlmConversationKey } from "@/utils/llm-conversation-key";
import { createLlmEditConversationMessage } from "@/utils/llm-edit-conversation";

export function useLlmConversation(
  documentKey: Ref<string>,
  kind: LlmConversationKind,
) {
  const messages = ref<LlmEditConversationMessage[]>([]);
  const isLoading = ref(false);

  function conversationKey(): string {
    return buildLlmConversationKey(documentKey.value, kind);
  }

  async function load(): Promise<void> {
    const key = conversationKey();
    if (!key) {
      messages.value = [];
      return;
    }

    isLoading.value = true;
    try {
      const conversation = await getLlmEditConversation(key);
      messages.value = conversation?.messages ?? [];
    } finally {
      isLoading.value = false;
    }
  }

  async function appendTurn(
    userContent: string,
    assistantContent: string,
  ): Promise<void> {
    const key = conversationKey();
    if (!key) {
      messages.value = [
        ...messages.value,
        createLlmEditConversationMessage("user", userContent),
        createLlmEditConversationMessage("assistant", assistantContent),
      ];
      return;
    }

    const updated = await appendLlmEditConversationMessages(key, [
      createLlmEditConversationMessage("user", userContent),
      createLlmEditConversationMessage("assistant", assistantContent),
    ]);

    messages.value = updated.messages;
  }

  async function clear(): Promise<void> {
    const key = conversationKey();
    if (key) {
      await clearLlmEditConversation(key);
    }

    messages.value = [];
  }

  watch(documentKey, () => {
    void load();
  });

  return {
    messages,
    isLoading,
    load,
    appendTurn,
    clear,
  };
}
