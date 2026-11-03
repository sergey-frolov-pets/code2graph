import { LLM_EDIT_CONVERSATION_MAX_MESSAGES } from "@/constants/llm-edit-conversation";
import type {
  LlmEditConversation,
  LlmEditConversationMessage,
} from "@/types/llm-edit-conversation";
import { getFromObjectStore, runIndexedTransaction } from "@/storage/idb/idb-core";
import {
  LLM_EDIT_CONVERSATIONS_STORE,
  upgradeVersionsDatabase,
  VERSIONS_DB_NAME,
  VERSIONS_DB_VERSION,
} from "@/storage/versions/versions-db";

function runConversationTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return runIndexedTransaction(
    VERSIONS_DB_NAME,
    VERSIONS_DB_VERSION,
    upgradeVersionsDatabase,
    LLM_EDIT_CONVERSATIONS_STORE,
    mode,
    (stores) => callback(stores[LLM_EDIT_CONVERSATIONS_STORE]),
  );
}

function normalizeDocumentKey(documentKey: string): string {
  return documentKey.trim();
}

export function pruneLlmEditConversationMessages(
  messages: LlmEditConversationMessage[],
  maxMessages = LLM_EDIT_CONVERSATION_MAX_MESSAGES,
): LlmEditConversationMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  return messages.slice(messages.length - maxMessages);
}

export async function getLlmEditConversation(
  documentKey: string,
): Promise<LlmEditConversation | null> {
  const trimmedKey = normalizeDocumentKey(documentKey);
  if (!trimmedKey) {
    return null;
  }

  return runConversationTransaction("readonly", (store) =>
    getFromObjectStore<LlmEditConversation>(store, trimmedKey),
  );
}

export async function appendLlmEditConversationMessages(
  documentKey: string,
  newMessages: LlmEditConversationMessage[],
): Promise<LlmEditConversation> {
  const trimmedKey = normalizeDocumentKey(documentKey);
  if (!trimmedKey) {
    throw new Error("Document key is required");
  }

  if (newMessages.length === 0) {
    const existing = await getLlmEditConversation(trimmedKey);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    return {
      documentKey: trimmedKey,
      messages: [],
      updatedAt: now,
    };
  }

  const now = new Date().toISOString();

  return runConversationTransaction("readwrite", async (store) => {
    const existing =
      (await getFromObjectStore<LlmEditConversation>(store, trimmedKey)) ?? {
        documentKey: trimmedKey,
        messages: [],
        updatedAt: now,
      };

    const conversation: LlmEditConversation = {
      documentKey: trimmedKey,
      messages: pruneLlmEditConversationMessages([
        ...existing.messages,
        ...newMessages,
      ]),
      updatedAt: now,
    };

    store.put(conversation);
    return conversation;
  });
}

export async function clearLlmEditConversation(documentKey: string): Promise<void> {
  const trimmedKey = normalizeDocumentKey(documentKey);
  if (!trimmedKey) {
    return;
  }

  await runConversationTransaction("readwrite", (store) => {
    store.delete(trimmedKey);
  });
}

export async function deleteLlmEditConversationForDocument(
  documentKey: string,
): Promise<void> {
  await clearLlmEditConversation(documentKey);
}
