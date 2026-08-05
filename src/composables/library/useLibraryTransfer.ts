import type { LibraryExportBundle } from "@/constants/diagram-library";
import {
  buildLocalExportBundle,
  downloadLibraryBundle,
  parseLibraryImportFile,
} from "@/utils/library-import-export";
import {
  importLocalLibrarySelection,
  loadAllDiagramDetailsFromCache,
  loadSectionsFromCache,
} from "@/utils/diagram-store";
import type { LibraryCatalog } from "./useLibraryCatalog";
import type { LibraryMutations } from "./useLibraryMutations";
import type { LibrarySync } from "./useLibrarySync";

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

  return {
    loadTransferData,
    exportLibrarySelection,
    parseImportBundle,
    importLibrarySelection,
  };
}
