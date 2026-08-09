import type {
  CreateDiagramVersionPayload,
  DiagramVersion,
} from "@/types/diagram-versions";
import {
  getFromObjectStore,
  runIndexedTransaction,
} from "@/storage/idb/idb-core";
import {
  upgradeVersionsDatabase,
  VERSIONS_DB_NAME,
  VERSIONS_DB_VERSION,
  VERSIONS_INDEX_DOCUMENT_KEY,
  VERSIONS_STORE,
} from "@/storage/versions/versions-db";

function runTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return runIndexedTransaction(
    VERSIONS_DB_NAME,
    VERSIONS_DB_VERSION,
    upgradeVersionsDatabase,
    VERSIONS_STORE,
    mode,
    (stores) => callback(stores[VERSIONS_STORE]),
  );
}

function getVersionsByDocumentKey(
  store: IDBObjectStore,
  documentKey: string,
): Promise<DiagramVersion[]> {
  return new Promise((resolve, reject) => {
    const index = store.index(VERSIONS_INDEX_DOCUMENT_KEY);
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
    (a, b) =>
      b.versionNumber - a.versionNumber || b.createdAt.localeCompare(a.createdAt),
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
    getFromObjectStore<DiagramVersion>(store, versionId),
  );
}
