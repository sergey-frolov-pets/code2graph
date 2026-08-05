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
import {
  buildSectionTree,
  collectSectionSubtree,
} from "@/shared/library/section-tree";
import {
  getAllFromObjectStore,
  getFromObjectStore,
  runIndexedTransaction,
} from "@/storage/idb/idb-core";
import {
  LIBRARY_DB_NAME,
  LIBRARY_DB_VERSION,
  LIBRARY_STORE_DIAGRAM_DETAILS,
  LIBRARY_STORE_DIAGRAMS,
  LIBRARY_STORE_META,
  LIBRARY_STORE_SECTIONS,
  upgradeLibraryDatabase,
} from "@/storage/library/library-db";
import { resolvePumlFileName } from "@/utils/puml-files";

export { buildSectionTree, collectSectionSubtree } from "@/shared/library/section-tree";

interface MetaRecord {
  key: string;
  value: string;
}

function runTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (stores: Record<string, IDBObjectStore>) => Promise<T> | T,
): Promise<T> {
  return runIndexedTransaction(
    LIBRARY_DB_NAME,
    LIBRARY_DB_VERSION,
    upgradeLibraryDatabase,
    storeNames,
    mode,
    callback,
  );
}

export async function saveSectionsToCache(sections: SectionDto[]): Promise<void> {
  await runTransaction(LIBRARY_STORE_SECTIONS, "readwrite", async (stores) => {
    const store = stores[LIBRARY_STORE_SECTIONS];
    store.clear();
    for (const section of sections) {
      store.put(section);
    }
  });
}

export async function loadSectionsFromCache(): Promise<SectionDto[]> {
  return runTransaction(LIBRARY_STORE_SECTIONS, "readonly", (stores) =>
    getAllFromObjectStore<SectionDto>(stores[LIBRARY_STORE_SECTIONS]),
  );
}

export async function saveDiagramsToCache(
  diagrams: DiagramListItemDto[],
): Promise<void> {
  await runTransaction(LIBRARY_STORE_DIAGRAMS, "readwrite", async (stores) => {
    const store = stores[LIBRARY_STORE_DIAGRAMS];
    store.clear();
    for (const diagram of diagrams) {
      store.put(diagram);
    }
  });
}

export async function loadDiagramsFromCache(): Promise<DiagramListItemDto[]> {
  return runTransaction(LIBRARY_STORE_DIAGRAMS, "readonly", (stores) =>
    getAllFromObjectStore<DiagramListItemDto>(stores[LIBRARY_STORE_DIAGRAMS]),
  );
}

export async function saveDiagramDetailToCache(diagram: DiagramDto): Promise<void> {
  await runTransaction(LIBRARY_STORE_DIAGRAM_DETAILS, "readwrite", (stores) => {
    stores[LIBRARY_STORE_DIAGRAM_DETAILS].put(diagram);
  });
}

export async function loadDiagramDetailFromCache(
  diagramId: string,
): Promise<DiagramDto | null> {
  return runTransaction(LIBRARY_STORE_DIAGRAM_DETAILS, "readonly", (stores) =>
    getFromObjectStore<DiagramDto>(stores[LIBRARY_STORE_DIAGRAM_DETAILS], diagramId),
  );
}

export async function loadAllDiagramDetailsFromCache(): Promise<DiagramDto[]> {
  return runTransaction(LIBRARY_STORE_DIAGRAM_DETAILS, "readonly", (stores) =>
    getAllFromObjectStore<DiagramDto>(stores[LIBRARY_STORE_DIAGRAM_DETAILS]),
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

  await runTransaction(LIBRARY_STORE_SECTIONS, "readwrite", (stores) => {
    stores[LIBRARY_STORE_SECTIONS].put(updated);
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

  await runTransaction(LIBRARY_STORE_SECTIONS, "readwrite", (stores) => {
    stores[LIBRARY_STORE_SECTIONS].put(section);
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
    [LIBRARY_STORE_SECTIONS, LIBRARY_STORE_DIAGRAMS, LIBRARY_STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      for (const id of sectionIds) {
        stores[LIBRARY_STORE_SECTIONS].delete(id);
      }
      for (const id of diagramIdsToDelete) {
        stores[LIBRARY_STORE_DIAGRAMS].delete(id);
        stores[LIBRARY_STORE_DIAGRAM_DETAILS].delete(id);
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
    [LIBRARY_STORE_DIAGRAMS, LIBRARY_STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      stores[LIBRARY_STORE_DIAGRAMS].put(toDiagramListItem(diagram));
      stores[LIBRARY_STORE_DIAGRAM_DETAILS].put(diagram);
    },
  );

  return diagram;
}

export async function deleteLocalDiagram(diagramId: string): Promise<void> {
  await runTransaction(
    [LIBRARY_STORE_DIAGRAMS, LIBRARY_STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      stores[LIBRARY_STORE_DIAGRAMS].delete(diagramId);
      stores[LIBRARY_STORE_DIAGRAM_DETAILS].delete(diagramId);
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
    [LIBRARY_STORE_DIAGRAMS, LIBRARY_STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      stores[LIBRARY_STORE_DIAGRAMS].put(toDiagramListItem(updated));
      stores[LIBRARY_STORE_DIAGRAM_DETAILS].put(updated);
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
    [LIBRARY_STORE_SECTIONS, LIBRARY_STORE_DIAGRAMS, LIBRARY_STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      for (const section of sectionsToImport) {
        const parentId =
          section.parentId && importedSectionIds.has(section.parentId)
            ? section.parentId
            : null;
        stores[LIBRARY_STORE_SECTIONS].put({
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
        stores[LIBRARY_STORE_DIAGRAMS].put(toDiagramListItem(normalized));
        stores[LIBRARY_STORE_DIAGRAM_DETAILS].put(normalized);
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
  await runTransaction(LIBRARY_STORE_META, "readwrite", (stores) => {
    stores[LIBRARY_STORE_META].put({ key, value } satisfies MetaRecord);
  });
}

export async function getCacheMeta(key: string): Promise<string | null> {
  const record = await runTransaction(LIBRARY_STORE_META, "readonly", (stores) =>
    getFromObjectStore<MetaRecord>(stores[LIBRARY_STORE_META], key),
  );
  return record?.value ?? null;
}
