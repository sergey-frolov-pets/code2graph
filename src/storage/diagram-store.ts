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
import { DATA_LINK_CHANGED_EVENT } from "@/services/local-data-link/constants";
import {
  LIBRARY_DB_NAME,
  LIBRARY_DB_VERSION,
  LIBRARY_STORE_DATA_LINKS,
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

function sectionRecord(section: SectionDto, parentId: string | null): SectionDto {
  return {
    id: section.id,
    parentId,
    title: section.title,
    sortOrder: section.sortOrder,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

function diagramRecord(diagram: DiagramDto, sectionId: string | null): DiagramDto {
  return {
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
}

function orderSectionsParentsFirst(sections: readonly SectionDto[]): SectionDto[] {
  const ids = new Set(sections.map((section) => section.id));
  const ordered: SectionDto[] = [];
  const added = new Set<string>();

  while (ordered.length < sections.length) {
    let progressed = false;
    for (const section of sections) {
      if (added.has(section.id)) {
        continue;
      }
      if (
        !section.parentId ||
        !ids.has(section.parentId) ||
        added.has(section.parentId)
      ) {
        ordered.push(section);
        added.add(section.id);
        progressed = true;
      }
    }
    if (!progressed) {
      for (const section of sections) {
        if (!added.has(section.id)) {
          ordered.push(section);
          added.add(section.id);
        }
      }
      break;
    }
  }

  return ordered;
}

function notifyDataLinksChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(DATA_LINK_CHANGED_EVENT));
}

export async function replaceLocalLibrary(
  sections: readonly SectionDto[],
  diagrams: readonly DiagramDto[],
): Promise<void> {
  const plainSections = JSON.parse(JSON.stringify(sections)) as SectionDto[];
  const plainDiagrams = JSON.parse(JSON.stringify(diagrams)) as DiagramDto[];
  const existing = await loadDiagramsFromCache();
  const nextIds = new Set(plainDiagrams.map((diagram) => diagram.id));
  const removedIds = existing
    .map((diagram) => diagram.id)
    .filter((id) => !nextIds.has(id));
  const sectionIds = new Set(plainSections.map((section) => section.id));

  await runTransaction(
    [
      LIBRARY_STORE_SECTIONS,
      LIBRARY_STORE_DIAGRAMS,
      LIBRARY_STORE_DIAGRAM_DETAILS,
      LIBRARY_STORE_DATA_LINKS,
    ],
    "readwrite",
    (stores) => {
      stores[LIBRARY_STORE_SECTIONS].clear();
      stores[LIBRARY_STORE_DIAGRAMS].clear();
      stores[LIBRARY_STORE_DIAGRAM_DETAILS].clear();

      for (const section of plainSections) {
        const parentId =
          section.parentId && sectionIds.has(section.parentId)
            ? section.parentId
            : null;
        stores[LIBRARY_STORE_SECTIONS].put(sectionRecord(section, parentId));
      }

      for (const diagram of plainDiagrams) {
        const sectionId =
          diagram.sectionId && sectionIds.has(diagram.sectionId)
            ? diagram.sectionId
            : null;
        const normalized = diagramRecord(diagram, sectionId);
        stores[LIBRARY_STORE_DIAGRAMS].put(toDiagramListItem(normalized));
        stores[LIBRARY_STORE_DIAGRAM_DETAILS].put(normalized);
      }

      for (const id of removedIds) {
        stores[LIBRARY_STORE_DATA_LINKS].delete(id);
      }
    },
  );

  if (removedIds.length > 0) {
    notifyDataLinksChanged();
  }
}

export async function copyBackupDiagrams(
  fileSections: readonly SectionDto[],
  fileDiagrams: readonly DiagramDto[],
  diagramIds: ReadonlySet<string>,
): Promise<void> {
  const selected = (
    JSON.parse(JSON.stringify(fileDiagrams)) as DiagramDto[]
  ).filter((diagram) => diagramIds.has(diagram.id));
  if (selected.length === 0) {
    return;
  }

  const plainSections = JSON.parse(JSON.stringify(fileSections)) as SectionDto[];
  const localSections = await loadSectionsFromCache();
  const localSectionIds = new Set(localSections.map((section) => section.id));
  const fileSectionById = new Map(plainSections.map((section) => [section.id, section]));
  const missingSectionIds = new Set<string>();

  for (const diagram of selected) {
    let parentId = diagram.sectionId;
    const seen = new Set<string>();
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      if (localSectionIds.has(parentId)) {
        break;
      }
      const section = fileSectionById.get(parentId);
      if (!section) {
        break;
      }
      missingSectionIds.add(section.id);
      parentId = section.parentId;
    }
  }

  const sectionsToCreate = orderSectionsParentsFirst(
    plainSections.filter((section) => missingSectionIds.has(section.id)),
  );

  await runTransaction(
    [LIBRARY_STORE_SECTIONS, LIBRARY_STORE_DIAGRAMS, LIBRARY_STORE_DIAGRAM_DETAILS],
    "readwrite",
    (stores) => {
      const created = new Set<string>();
      for (const section of sectionsToCreate) {
        const parentId =
          section.parentId &&
          (localSectionIds.has(section.parentId) || created.has(section.parentId))
            ? section.parentId
            : null;
        stores[LIBRARY_STORE_SECTIONS].put(sectionRecord(section, parentId));
        created.add(section.id);
      }

      const availableSectionIds = new Set([...localSectionIds, ...created]);
      for (const diagram of selected) {
        const sectionId =
          diagram.sectionId && availableSectionIds.has(diagram.sectionId)
            ? diagram.sectionId
            : null;
        const normalized = diagramRecord(diagram, sectionId);
        stores[LIBRARY_STORE_DIAGRAMS].put(toDiagramListItem(normalized));
        stores[LIBRARY_STORE_DIAGRAM_DETAILS].put(normalized);
      }
    },
  );
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
