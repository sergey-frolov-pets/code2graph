import type {
  CreateDiagramPayload,
  CreateSectionPayload,
  DiagramDto,
  DiagramListItemDto,
  LibraryExportBundle,
  SectionDto,
  UpdateDiagramPayload,
  UpdateSectionPayload,
} from "@/constants/diagram-library";
import { resolvePumlFileName } from "@/utils/puml-files";

const DB_NAME = "vueplantuml-library";
const DB_VERSION = 1;

const STORE_SECTIONS = "sections";
const STORE_DIAGRAMS = "diagrams";
const STORE_DIAGRAM_DETAILS = "diagramDetails";
const STORE_META = "meta";

interface MetaRecord {
  key: string;
  value: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SECTIONS)) {
        db.createObjectStore(STORE_SECTIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_DIAGRAMS)) {
        db.createObjectStore(STORE_DIAGRAMS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_DIAGRAM_DETAILS)) {
        db.createObjectStore(STORE_DIAGRAM_DETAILS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function runTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (stores: Record<string, IDBObjectStore>) => Promise<T> | T,
): Promise<T> {
  return openDatabase().then(
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

function getAllFromStore<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB getAll failed"));
  });
}

export async function saveSectionsToCache(sections: SectionDto[]): Promise<void> {
  await runTransaction(STORE_SECTIONS, "readwrite", async (stores) => {
    const store = stores[STORE_SECTIONS];
    store.clear();
    for (const section of sections) {
      store.put(section);
    }
  });
}

export async function loadSectionsFromCache(): Promise<SectionDto[]> {
  return runTransaction(STORE_SECTIONS, "readonly", (stores) =>
    getAllFromStore<SectionDto>(stores[STORE_SECTIONS]),
  );
}

export async function saveDiagramsToCache(
  diagrams: DiagramListItemDto[],
): Promise<void> {
  await runTransaction(STORE_DIAGRAMS, "readwrite", async (stores) => {
    const store = stores[STORE_DIAGRAMS];
    store.clear();
    for (const diagram of diagrams) {
      store.put(diagram);
    }
  });
}

export async function loadDiagramsFromCache(): Promise<DiagramListItemDto[]> {
  return runTransaction(STORE_DIAGRAMS, "readonly", (stores) =>
    getAllFromStore<DiagramListItemDto>(stores[STORE_DIAGRAMS]),
  );
}

export async function saveDiagramDetailToCache(diagram: DiagramDto): Promise<void> {
  await runTransaction(STORE_DIAGRAM_DETAILS, "readwrite", (stores) => {
    stores[STORE_DIAGRAM_DETAILS].put(diagram);
  });
}

export async function loadDiagramDetailFromCache(
  diagramId: string,
): Promise<DiagramDto | null> {
  return runTransaction(STORE_DIAGRAM_DETAILS, "readonly", (stores) =>
    new Promise((resolve, reject) => {
      const request = stores[STORE_DIAGRAM_DETAILS].get(diagramId);
      request.onsuccess = () => resolve((request.result as DiagramDto) ?? null);
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB get failed"));
    }),
  );
}

export async function loadAllDiagramDetailsFromCache(): Promise<DiagramDto[]> {
  return runTransaction(STORE_DIAGRAM_DETAILS, "readonly", (stores) =>
    getAllFromStore<DiagramDto>(stores[STORE_DIAGRAM_DETAILS]),
  );
}

function toDiagramListItem(diagram: DiagramDto): DiagramListItemDto {
  return {
    id: diagram.id,
    sectionId: diagram.sectionId,
    title: diagram.title,
    description: diagram.description,
    tags: diagram.tags,
    language: diagram.language,
    fileName: diagram.fileName,
    byteSize: diagram.byteSize,
    createdAt: diagram.createdAt,
    updatedAt: diagram.updatedAt,
  };
}

export function collectSectionSubtree(
  rootId: string,
  sections: SectionDto[],
): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const section of sections) {
      if (section.parentId && ids.has(section.parentId) && !ids.has(section.id)) {
        ids.add(section.id);
        changed = true;
      }
    }
  }

  return ids;
}

export async function updateLocalSection(
  sectionId: string,
  payload: UpdateSectionPayload,
): Promise<SectionDto> {
  const sections = await loadSectionsFromCache();
  const existing = sections.find((section) => section.id === sectionId);
  if (!existing) {
    throw new Error("Section not found");
  }

  const updated: SectionDto = {
    ...existing,
    title: payload.title?.trim() || existing.title,
    parentId:
      payload.parentId !== undefined ? payload.parentId : existing.parentId,
    sortOrder: payload.sortOrder ?? existing.sortOrder,
    updatedAt: new Date().toISOString(),
  };

  await runTransaction(STORE_SECTIONS, "readwrite", (stores) => {
    stores[STORE_SECTIONS].put(updated);
  });

  return updated;
}

export async function createLocalSection(
  payload: CreateSectionPayload,
): Promise<SectionDto> {
  const now = new Date().toISOString();
  const section: SectionDto = {
    id: crypto.randomUUID(),
    parentId: payload.parentId,
    title: payload.title.trim(),
    sortOrder: payload.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  await runTransaction(STORE_SECTIONS, "readwrite", (stores) => {
    stores[STORE_SECTIONS].put(section);
  });

  return section;
}

export async function deleteLocalSection(sectionId: string): Promise<void> {
  const sections = await loadSectionsFromCache();
  const sectionIds = collectSectionSubtree(sectionId, sections);
  const diagrams = await loadDiagramsFromCache();
  const diagramIdsToDelete = diagrams
    .filter((diagram) => diagram.sectionId && sectionIds.has(diagram.sectionId))
    .map((diagram) => diagram.id);

  await runTransaction(
    [STORE_SECTIONS, STORE_DIAGRAMS, STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      for (const id of sectionIds) {
        stores[STORE_SECTIONS].delete(id);
      }
      for (const id of diagramIdsToDelete) {
        stores[STORE_DIAGRAMS].delete(id);
        stores[STORE_DIAGRAM_DETAILS].delete(id);
      }
    },
  );
}

export async function createLocalDiagram(
  payload: CreateDiagramPayload,
): Promise<DiagramDto> {
  const now = new Date().toISOString();
  const source = payload.source;
  const diagram: DiagramDto = {
    id: crypto.randomUUID(),
    sectionId: payload.sectionId,
    title: payload.title.trim() || "Diagram",
    description: payload.description.trim(),
    tags: payload.tags,
    language: payload.language,
    source,
    fileName: resolvePumlFileName(payload.fileName),
    byteSize: new TextEncoder().encode(source).length,
    createdAt: now,
    updatedAt: now,
  };

  await runTransaction(
    [STORE_DIAGRAMS, STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      stores[STORE_DIAGRAMS].put(toDiagramListItem(diagram));
      stores[STORE_DIAGRAM_DETAILS].put(diagram);
    },
  );

  return diagram;
}

export async function deleteLocalDiagram(diagramId: string): Promise<void> {
  await runTransaction(
    [STORE_DIAGRAMS, STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      stores[STORE_DIAGRAMS].delete(diagramId);
      stores[STORE_DIAGRAM_DETAILS].delete(diagramId);
    },
  );
}

export async function updateLocalDiagram(
  diagramId: string,
  payload: UpdateDiagramPayload,
): Promise<DiagramDto> {
  const existing = await loadDiagramDetailFromCache(diagramId);
  if (!existing) {
    throw new Error("Diagram not found");
  }

  const source = payload.source ?? existing.source;
  const updated: DiagramDto = {
    ...existing,
    title: payload.title?.trim() || existing.title,
    description:
      payload.description !== undefined
        ? payload.description.trim()
        : existing.description,
    tags: payload.tags ?? existing.tags,
    sectionId:
      payload.sectionId !== undefined ? payload.sectionId : existing.sectionId,
    fileName: payload.fileName
      ? resolvePumlFileName(payload.fileName)
      : existing.fileName,
    source,
    byteSize: new TextEncoder().encode(source).length,
    updatedAt: new Date().toISOString(),
  };

  await runTransaction(
    [STORE_DIAGRAMS, STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      stores[STORE_DIAGRAMS].put(toDiagramListItem(updated));
      stores[STORE_DIAGRAM_DETAILS].put(updated);
    },
  );

  return updated;
}

export async function importLocalLibrarySelection(
  bundle: LibraryExportBundle,
  sectionIds: ReadonlySet<string>,
  diagramIds: ReadonlySet<string>,
): Promise<void> {
  const plainBundle = JSON.parse(
    JSON.stringify(bundle),
  ) as LibraryExportBundle;

  const sectionsToImport = plainBundle.sections.filter((section) =>
    sectionIds.has(section.id),
  );
  const diagramsToImport = plainBundle.diagrams.filter((diagram) =>
    diagramIds.has(diagram.id),
  );
  const importedSectionIds = new Set(sectionsToImport.map((section) => section.id));

  await runTransaction(
    [STORE_SECTIONS, STORE_DIAGRAMS, STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      for (const section of sectionsToImport) {
        const parentId =
          section.parentId && importedSectionIds.has(section.parentId)
            ? section.parentId
            : null;
        stores[STORE_SECTIONS].put({
          id: section.id,
          parentId,
          title: section.title,
          sortOrder: section.sortOrder,
          createdAt: section.createdAt,
          updatedAt: section.updatedAt,
        });
      }

      for (const diagram of diagramsToImport) {
        const sectionId =
          diagram.sectionId && importedSectionIds.has(diagram.sectionId)
            ? diagram.sectionId
            : null;
        const normalized: DiagramDto = {
          id: diagram.id,
          sectionId,
          title: diagram.title,
          description: diagram.description,
          tags: [...diagram.tags],
          language: diagram.language,
          source: diagram.source,
          fileName: diagram.fileName,
          byteSize: diagram.byteSize,
          createdAt: diagram.createdAt,
          updatedAt: diagram.updatedAt,
        };
        stores[STORE_DIAGRAMS].put(toDiagramListItem(normalized));
        stores[STORE_DIAGRAM_DETAILS].put(normalized);
      }
    },
  );
}

export async function searchLocalLibrary(params: {
  q?: string;
  sectionId?: string | null;
  tag?: string;
  language?: string;
}): Promise<DiagramListItemDto[]> {
  const [diagrams, details] = await Promise.all([
    loadDiagramsFromCache(),
    loadAllDiagramDetailsFromCache(),
  ]);

  const sourceById = new Map(details.map((diagram) => [diagram.id, diagram.source]));
  const query = params.q?.trim().toLowerCase() ?? "";
  const tag = params.tag?.trim().toLowerCase() ?? "";
  const language = params.language?.trim() ?? "";
  const sectionId = params.sectionId ?? null;
  const sectionIds = sectionId
    ? collectSectionSubtree(sectionId, await loadSectionsFromCache())
    : null;

  return diagrams.filter((diagram) => {
    if (sectionIds && (!diagram.sectionId || !sectionIds.has(diagram.sectionId))) {
      return false;
    }
    if (language && diagram.language !== language) {
      return false;
    }
    if (tag && !diagram.tags.some((item) => item.toLowerCase() === tag)) {
      return false;
    }
    if (!query) {
      return true;
    }

    const source = sourceById.get(diagram.id) ?? "";
    return (
      diagram.title.toLowerCase().includes(query) ||
      diagram.description.toLowerCase().includes(query) ||
      source.toLowerCase().includes(query)
    );
  });
}

export async function reloadLocalLibraryState(): Promise<{
  flatSections: SectionDto[];
  sections: SectionDto[];
  diagrams: DiagramListItemDto[];
}> {
  const flatSections = await loadSectionsFromCache();
  return {
    flatSections,
    sections: buildSectionTree(flatSections),
    diagrams: await loadDiagramsFromCache(),
  };
}

export async function setCacheMeta(key: string, value: string): Promise<void> {
  await runTransaction(STORE_META, "readwrite", (stores) => {
    stores[STORE_META].put({ key, value } satisfies MetaRecord);
  });
}

export async function getCacheMeta(key: string): Promise<string | null> {
  return runTransaction(STORE_META, "readonly", (stores) =>
    new Promise((resolve, reject) => {
      const request = stores[STORE_META].get(key);
      request.onsuccess = () => {
        const record = request.result as MetaRecord | undefined;
        resolve(record?.value ?? null);
      };
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB get meta failed"));
    }),
  );
}

export function buildSectionTree(flatSections: SectionDto[]): SectionDto[] {
  const byId = new Map(
    flatSections.map((section) => [section.id, { ...section, children: [] as SectionDto[] }]),
  );
  const roots: SectionDto[] = [];

  for (const section of byId.values()) {
    if (section.parentId && byId.has(section.parentId)) {
      byId.get(section.parentId)!.children!.push(section);
    } else {
      roots.push(section);
    }
  }

  const sortRecursive = (items: SectionDto[]): void => {
    items.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
    );
    for (const item of items) {
      if (item.children?.length) {
        sortRecursive(item.children);
      }
    }
  };

  sortRecursive(roots);
  return roots;
}
