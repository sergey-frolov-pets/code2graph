import {
  DATA_LINK_CHANGED_EVENT,
  DATA_LINK_SLUG_PATTERN,
} from "@/services/local-data-link/constants";
import {
  getAllFromObjectStore,
  getFromObjectStore,
  runIndexedTransaction,
} from "@/storage/idb/idb-core";
import {
  LIBRARY_DB_NAME,
  LIBRARY_DB_VERSION,
  LIBRARY_STORE_DATA_LINKS,
  upgradeLibraryDatabase,
} from "@/storage/library/library-db";

export interface LocalDataLinkRecord {
  diagramId: string;
  slug: string;
  filePathLabel: string;
  sheetRange: string;
  untilEmptyRow: boolean;
  fileName: string;
  fileHandle: FileSystemFileHandle | null;
}

export class LocalDataLinkSlugTakenError extends Error {
  readonly code = "slug_taken";
}

const SLUG_INDEX = "slug";

function runTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return runIndexedTransaction(
    LIBRARY_DB_NAME,
    LIBRARY_DB_VERSION,
    upgradeLibraryDatabase,
    LIBRARY_STORE_DATA_LINKS,
    mode,
    (stores) => callback(stores[LIBRARY_STORE_DATA_LINKS]!),
  );
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function notifyDataLinkChanged(): void {
  window.dispatchEvent(new CustomEvent(DATA_LINK_CHANGED_EVENT));
}

export function normalizeDataLinkSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function isDataLinkSlug(value: string): boolean {
  return DATA_LINK_SLUG_PATTERN.test(value);
}

export async function getLocalDataLink(
  diagramId: string,
): Promise<LocalDataLinkRecord | null> {
  return runTransaction("readonly", (store) =>
    getFromObjectStore<LocalDataLinkRecord>(store, diagramId),
  );
}

export async function findLocalDataLinkBySlug(
  slug: string,
): Promise<LocalDataLinkRecord | null> {
  const normalized = normalizeDataLinkSlug(slug);
  return runTransaction("readonly", (store) =>
    requestResult(
      store.index(SLUG_INDEX).get(normalized) as IDBRequest<
        LocalDataLinkRecord | undefined
      >,
    ).then((record) => record ?? null),
  );
}

export async function listLocalDataLinks(): Promise<LocalDataLinkRecord[]> {
  return runTransaction("readonly", (store) =>
    getAllFromObjectStore<LocalDataLinkRecord>(store),
  );
}

async function putRecord(record: LocalDataLinkRecord): Promise<void> {
  await runTransaction("readwrite", (store) => requestResult(store.put(record)));
}

export async function saveLocalDataLink(
  record: LocalDataLinkRecord,
): Promise<void> {
  const slug = normalizeDataLinkSlug(record.slug);
  if (!isDataLinkSlug(slug)) {
    throw new Error("invalid_slug");
  }

  const taken = await findLocalDataLinkBySlug(slug);
  if (taken && taken.diagramId !== record.diagramId) {
    throw new LocalDataLinkSlugTakenError("slug_taken");
  }

  const next: LocalDataLinkRecord = { ...record, slug };
  try {
    await putRecord(next);
  } catch {
    await putRecord({ ...next, fileHandle: null });
  }
  notifyDataLinkChanged();
}

export async function deleteLocalDataLink(diagramId: string): Promise<void> {
  await runTransaction("readwrite", (store) =>
    requestResult(store.delete(diagramId)),
  );
  notifyDataLinkChanged();
}
