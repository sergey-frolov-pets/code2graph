import type {
  CreateDiagramVersionPayload,
  DiagramVersion,
} from "@/types/diagram-versions";

const DB_NAME = "vueplantuml-versions";
const DB_VERSION = 1;
const STORE_VERSIONS = "versions";
const INDEX_DOCUMENT_KEY = "documentKey";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
        const store = db.createObjectStore(STORE_VERSIONS, { keyPath: "id" });
        store.createIndex(INDEX_DOCUMENT_KEY, "documentKey", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_VERSIONS, mode);
        const store = transaction.objectStore(STORE_VERSIONS);

        Promise.resolve(callback(store))
          .then(resolve)
          .catch(reject);

        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("IndexedDB transaction failed"));
        };
      }),
  );
}

function getVersionsByDocumentKey(
  store: IDBObjectStore,
  documentKey: string,
): Promise<DiagramVersion[]> {
  return new Promise((resolve, reject) => {
    const index = store.index(INDEX_DOCUMENT_KEY);
    const request = index.getAll(documentKey);
    request.onsuccess = () => resolve(request.result as DiagramVersion[]);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB index getAll failed"));
  });
}

function sortVersionsByNumber(
  versions: DiagramVersion[],
): DiagramVersion[] {
  return [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function listDiagramVersions(
  documentKey: string,
): Promise<DiagramVersion[]> {
  const trimmedKey = documentKey.trim();
  if (!trimmedKey) {
    return [];
  }

  return runTransaction("readonly", async (store) => {
    const versions = await getVersionsByDocumentKey(store, trimmedKey);
    return sortVersionsByNumber(versions);
  });
}

export async function createDiagramVersion(
  payload: CreateDiagramVersionPayload,
): Promise<DiagramVersion> {
  const documentKey = payload.documentKey.trim();
  if (!documentKey) {
    throw new Error("Document key is required");
  }

  const source = payload.source;
  if (!source.trim()) {
    throw new Error("Source is required");
  }

  const now = new Date().toISOString();
  const comment = payload.comment?.trim() ?? "";

  return runTransaction("readwrite", async (store) => {
    const existing = await getVersionsByDocumentKey(store, documentKey);
    const maxNumber = existing.reduce(
      (max, version) => Math.max(max, version.versionNumber),
      0,
    );

    const version: DiagramVersion = {
      id: crypto.randomUUID(),
      documentKey,
      versionNumber: maxNumber + 1,
      comment,
      source,
      createdAt: now,
    };

    store.put(version);
    return version;
  });
}

export async function deleteDiagramVersion(versionId: string): Promise<void> {
  await runTransaction("readwrite", (store) => {
    store.delete(versionId);
  });
}

export async function deleteDiagramVersionsForDocument(
  documentKey: string,
): Promise<void> {
  const trimmedKey = documentKey.trim();
  if (!trimmedKey) {
    return;
  }

  await runTransaction("readwrite", async (store) => {
    const versions = await getVersionsByDocumentKey(store, trimmedKey);
    for (const version of versions) {
      store.delete(version.id);
    }
  });
}

export async function getDiagramVersion(
  versionId: string,
): Promise<DiagramVersion | null> {
  return runTransaction("readonly", (store) =>
    new Promise((resolve, reject) => {
      const request = store.get(versionId);
      request.onsuccess = () =>
        resolve((request.result as DiagramVersion) ?? null);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB get failed"));
    }),
  );
}
