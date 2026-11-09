export const LIBRARY_DB_NAME = "code2graph-library";
export const LIBRARY_DB_VERSION = 3;

export const LIBRARY_STORE_SECTIONS = "sections";
export const LIBRARY_STORE_DIAGRAMS = "diagrams";
export const LIBRARY_STORE_DIAGRAM_DETAILS = "diagramDetails";
export const LIBRARY_STORE_META = "meta";
export const LIBRARY_STORE_DATA_LINKS = "localDataLinks";

export function upgradeLibraryDatabase(
  db: IDBDatabase,
  transaction?: IDBTransaction | null,
): void {
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
  if (!db.objectStoreNames.contains(LIBRARY_STORE_DATA_LINKS)) {
    const links = db.createObjectStore(LIBRARY_STORE_DATA_LINKS, {
      keyPath: "diagramId",
    });
    links.createIndex("slug", "slug", { unique: false });
    return;
  }

  if (!transaction) {
    return;
  }

  const links = transaction.objectStore(LIBRARY_STORE_DATA_LINKS);
  if (!links.indexNames.contains("slug")) {
    links.createIndex("slug", "slug", { unique: false });
    return;
  }

  if (links.index("slug").unique) {
    links.deleteIndex("slug");
    links.createIndex("slug", "slug", { unique: false });
  }
}
