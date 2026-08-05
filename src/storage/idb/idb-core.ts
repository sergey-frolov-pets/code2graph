export function openIndexedDatabase(
  name: string,
  version: number,
  onUpgrade: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onupgradeneeded = () => {
      onUpgrade(request.result);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

export function runIndexedTransaction<T>(
  dbName: string,
  dbVersion: number,
  onUpgrade: (db: IDBDatabase) => void,
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (stores: Record<string, IDBObjectStore>) => Promise<T> | T,
): Promise<T> {
  return openIndexedDatabase(dbName, dbVersion, onUpgrade).then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        const transaction = db.transaction(names, mode);
        const stores: Record<string, IDBObjectStore> = {};
        for (const name of names) {
          stores[name] = transaction.objectStore(name);
        }

        Promise.resolve(callback(stores))
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

export function getAllFromObjectStore<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB getAll failed"));
  });
}

export function getFromObjectStore<T>(
  store: IDBObjectStore,
  key: IDBValidKey,
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB get failed"));
  });
}
