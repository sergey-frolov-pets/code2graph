import { AI_CHAT_MAX_SESSIONS_PER_DOCUMENT } from "@/constants/ai-chat";
import type { AiChatSession } from "@/types/ai-chat-session";
import {
  getAllFromObjectStore,
  runIndexedTransaction,
} from "@/storage/idb/idb-core";
import {
  AI_CHAT_SESSIONS_STORE,
  upgradeVersionsDatabase,
  VERSIONS_DB_NAME,
  VERSIONS_DB_VERSION,
} from "@/storage/versions/versions-db";
import { isSameAiChatDocument, sortAiChatSessions } from "@/utils/ai-chat-session";

function runAiChatTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return runIndexedTransaction(
    VERSIONS_DB_NAME,
    VERSIONS_DB_VERSION,
    upgradeVersionsDatabase,
    AI_CHAT_SESSIONS_STORE,
    mode,
    (stores) => callback(stores[AI_CHAT_SESSIONS_STORE]),
  );
}

export async function listAiChatSessions(
  documentKey?: string,
): Promise<AiChatSession[]> {
  const all = await runAiChatTransaction("readonly", (store) =>
    getAllFromObjectStore<AiChatSession>(store),
  );
  const filtered = documentKey
    ? all.filter((session) => isSameAiChatDocument(session.documentKey, documentKey))
    : all;
  return sortAiChatSessions(filtered);
}

/** IndexedDB structured clone не принимает Vue Proxy — в стор кладём плоский JSON. */
function cloneAiChatSessionForStorage(session: AiChatSession): AiChatSession {
  return JSON.parse(JSON.stringify(session)) as AiChatSession;
}

export async function putAiChatSession(
  session: AiChatSession,
): Promise<AiChatSession> {
  return runAiChatTransaction("readwrite", async (store) => {
    const all = await getAllFromObjectStore<AiChatSession>(store);
    const sameDocument = all
      .filter(
        (entry) =>
          isSameAiChatDocument(entry.documentKey, session.documentKey) &&
          entry.id !== session.id,
      )
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    // Лимит на документ: самые старые незакреплённые удаляются первыми.
    const overflow =
      sameDocument.length + 1 - AI_CHAT_MAX_SESSIONS_PER_DOCUMENT;
    if (overflow > 0) {
      const removable = sameDocument.filter((entry) => !entry.pinned);
      for (const entry of removable.slice(0, overflow)) {
        store.delete(entry.id);
      }
    }
    store.put(cloneAiChatSessionForStorage(session));
    return session;
  });
}

export async function deleteAiChatSessions(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  await runAiChatTransaction("readwrite", (store) => {
    for (const id of ids) {
      store.delete(id);
    }
  });
}

export async function deleteUnpinnedAiChatSessions(
  documentKey?: string,
): Promise<void> {
  const sessions = await listAiChatSessions(documentKey);
  await deleteAiChatSessions(
    sessions.filter((session) => !session.pinned).map((session) => session.id),
  );
}
