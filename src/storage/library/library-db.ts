export const LIBRARY_DB_NAME = "code2graph-library";
export const LIBRARY_DB_VERSION = 1;

export const LIBRARY_STORE_SECTIONS = "sections";
export const LIBRARY_STORE_DIAGRAMS = "diagrams";
export const LIBRARY_STORE_DIAGRAM_DETAILS = "diagramDetails";
export const LIBRARY_STORE_META = "meta";

export function upgradeLibraryDatabase(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(LIBRARY_STORE_SECTIONS)) {
    db.createObjectStore(LIBRARY_STORE_SECTIONS, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(LIBRARY_STORE_DIAGRAMS)) {
    db.createObjectStore(LIBRARY_STORE_DIAGRAMS, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(LIBRARY_STORE_DIAGRAM_DETAILS)) {
    db.createObjectStore(LIBRARY_STORE_DIAGRAM_DETAILS, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(LIBRARY_STORE_META)) {
    db.createObjectStore(LIBRARY_STORE_META, { keyPath: "key" });
  }
}
