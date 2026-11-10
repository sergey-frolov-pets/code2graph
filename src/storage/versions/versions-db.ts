export const VERSIONS_DB_NAME = "code2graph-versions";
export const VERSIONS_DB_VERSION = 3;
export const VERSIONS_STORE = "versions";
export const LLM_EDIT_CONVERSATIONS_STORE = "llmEditConversations";
export const AI_CHAT_SESSIONS_STORE = "aiChatSessions";
export const VERSIONS_INDEX_DOCUMENT_KEY = "documentKey";

export function upgradeVersionsDatabase(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(VERSIONS_STORE)) {
    const store = db.createObjectStore(VERSIONS_STORE, { keyPath: "id" });
    store.createIndex(VERSIONS_INDEX_DOCUMENT_KEY, "documentKey", {
      unique: false,
    });
  }

  if (!db.objectStoreNames.contains(LLM_EDIT_CONVERSATIONS_STORE)) {
    db.createObjectStore(LLM_EDIT_CONVERSATIONS_STORE, { keyPath: "documentKey" });
  }

  if (!db.objectStoreNames.contains(AI_CHAT_SESSIONS_STORE)) {
    const store = db.createObjectStore(AI_CHAT_SESSIONS_STORE, { keyPath: "id" });
    store.createIndex("documentKey", "documentKey", { unique: false });
    store.createIndex("updatedAt", "updatedAt", { unique: false });
  }
}
