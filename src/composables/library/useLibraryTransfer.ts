import {
  LIBRARY_EXPORT_VERSION,
  type LibraryExportBundle,
  type SectionDto,
} from "@/constants/diagram-library";
import {
  checkServerAvailability,
  fetchLibraryFromServer,
} from "@/services/library/library-sync-service";
import {
  createDiagram,
  createSection,
  fetchDiagram,
} from "@/utils/diagram-api";
import {
  buildLocalExportBundle,
  downloadLibraryBundle,
  parseLibraryImportFile,
} from "@/utils/library-import-export";
import {
  importLocalLibrarySelection,
  loadAllDiagramDetailsFromCache,
  loadSectionsFromCache,
  saveDiagramDetailToCache,
} from "@/utils/diagram-store";
import type { LibraryCatalog } from "./useLibraryCatalog";
import type { LibraryMutations } from "./useLibraryMutations";
import type { LibrarySync } from "./useLibrarySync";

function sortSectionsForPush(sections: SectionDto[]): SectionDto[] {
  const ids = new Set(sections.map((section) => section.id));
  const result: SectionDto[] = [];
  const added = new Set<string>();

  while (result.length < sections.length) {
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
        result.push(section);
        added.add(section.id);
        progressed = true;
      }
    }
    if (!progressed) {
      break;
    }
  }

  return result;
}

export function useLibraryTransfer(
  catalog: LibraryCatalog,
  sync: Pick<LibrarySync, "applyLocalState">,
  mutations: Pick<LibraryMutations, "searchDiagrams">,
) {
  async function loadTransferData(): Promise<{
    sections: Awaited<ReturnType<typeof loadSectionsFromCache>>;
    diagrams: Awaited<ReturnType<typeof loadAllDiagramDetailsFromCache>>;
  }> {
    const [sections, diagrams] = await Promise.all([
      loadSectionsFromCache(),
      loadAllDiagramDetailsFromCache(),
    ]);
    return { sections, diagrams };
  }

  async function exportLibrarySelection(
    sectionIds: ReadonlySet<string>,
    diagramIds: ReadonlySet<string>,
  ): Promise<void> {
    const bundle = await buildLocalExportBundle(sectionIds, diagramIds);
    downloadLibraryBundle(bundle);
  }

  function parseImportBundle(content: string): LibraryExportBundle {
    return parseLibraryImportFile(content);
  }

  async function importLibrarySelection(
    bundle: LibraryExportBundle,
    sectionIds: ReadonlySet<string>,
    diagramIds: ReadonlySet<string>,
  ): Promise<void> {
    await importLocalLibrarySelection(bundle, sectionIds, diagramIds);
    catalog.selectedDiagram.value = null;
    await sync.applyLocalState();
    await mutations.searchDiagrams();
    catalog.usingCache.value = true;
  }

  async function pushSelectionToServer(
    sectionIds: ReadonlySet<string>,
    diagramIds: ReadonlySet<string>,
  ): Promise<void> {
    const apiUrl = catalog.libraryApiUrl.value;
    if (!apiUrl) {
      throw new Error("Library server URL is not configured");
    }

    const available = await checkServerAvailability(apiUrl);
    if (!available) {
      throw new Error("Library server is unavailable");
    }

    const [localSections, localDiagrams] = await Promise.all([
      loadSectionsFromCache(),
      loadAllDiagramDetailsFromCache(),
    ]);

    const sectionsToPush = sortSectionsForPush(
      localSections.filter((section) => sectionIds.has(section.id)),
    );
    const diagramsToPush = localDiagrams.filter((diagram) =>
      diagramIds.has(diagram.id),
    );
    const sectionIdMap = new Map<string, string>();

    for (const section of sectionsToPush) {
      const parentId =
        section.parentId && sectionIds.has(section.parentId)
          ? sectionIdMap.get(section.parentId) ?? null
          : null;
      const created = await createSection(
        {
          title: section.title,
          parentId,
          sortOrder: section.sortOrder,
        },
        apiUrl,
      );
      sectionIdMap.set(section.id, created.id);
    }

    for (const diagram of diagramsToPush) {
      let sectionId: string | null = null;
      if (diagram.sectionId && sectionIds.has(diagram.sectionId)) {
        sectionId = sectionIdMap.get(diagram.sectionId) ?? null;
      } else if (diagram.sectionId && sectionIdMap.has(diagram.sectionId)) {
        sectionId = sectionIdMap.get(diagram.sectionId) ?? null;
      }

      await createDiagram(
        {
          title: diagram.title,
          description: diagram.description,
          tags: diagram.tags,
          language: diagram.language,
          sectionId,
          source: diagram.source,
          fileName: diagram.fileName,
        },
        apiUrl,
      );
    }
  }

  async function pullSelectionFromServer(
    sectionIds: ReadonlySet<string>,
    diagramIds: ReadonlySet<string>,
  ): Promise<void> {
    const apiUrl = catalog.libraryApiUrl.value;
    if (!apiUrl) {
      throw new Error("Library server URL is not configured");
    }

    const available = await checkServerAvailability(apiUrl);
    if (!available) {
      throw new Error("Library server is unavailable");
    }

    const fetched = await fetchLibraryFromServer(apiUrl, {});
    const flatSections = fetched.flatSections.filter((section) =>
      sectionIds.has(section.id),
    );
    const diagramListItems = fetched.diagrams.filter((diagram) =>
      diagramIds.has(diagram.id),
    );

    const diagrams = await Promise.all(
      diagramListItems.map((item) => fetchDiagram(item.id, apiUrl)),
    );

    const bundle: LibraryExportBundle = {
      version: LIBRARY_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      sections: flatSections,
      diagrams,
    };

    await importLocalLibrarySelection(bundle, sectionIds, diagramIds);
    catalog.selectedDiagram.value = null;
    await sync.applyLocalState();
    await mutations.searchDiagrams();
    catalog.usingCache.value = true;
  }

  async function loadServerTransferData(): Promise<{
    sections: Awaited<ReturnType<typeof loadSectionsFromCache>>;
    diagrams: Awaited<ReturnType<typeof loadAllDiagramDetailsFromCache>>;
  }> {
    const apiUrl = catalog.libraryApiUrl.value;
    if (!apiUrl) {
      return { sections: [], diagrams: [] };
    }

    const available = await checkServerAvailability(apiUrl);
    if (!available) {
      return { sections: [], diagrams: [] };
    }

    const fetched = await fetchLibraryFromServer(apiUrl, {});
    const diagramDetails = await Promise.all(
      fetched.diagrams.map((item) => fetchDiagram(item.id, apiUrl)),
    );

    for (const diagram of diagramDetails) {
      await saveDiagramDetailToCache(diagram);
    }

    return {
      sections: fetched.flatSections,
      diagrams: diagramDetails,
    };
  }

  return {
    loadTransferData,
    exportLibrarySelection,
    parseImportBundle,
    importLibrarySelection,
    pushSelectionToServer,
    pullSelectionFromServer,
    loadServerTransferData,
  };
}
