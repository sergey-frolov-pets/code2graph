export const VERSIONS_DB_NAME = "vueplantuml-versions";
export const VERSIONS_DB_VERSION = 1;
export const VERSIONS_STORE = "versions";
export const VERSIONS_INDEX_DOCUMENT_KEY = "documentKey";

export function upgradeVersionsDatabase(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(VERSIONS_STORE)) {
    const store = db.createObjectStore(VERSIONS_STORE, { keyPath: "id" });
    store.createIndex(VERSIONS_INDEX_DOCUMENT_KEY, "documentKey", {
      unique: false,
    });
  }
}
