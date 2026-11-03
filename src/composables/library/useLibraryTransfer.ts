import type { LibraryCatalog } from "./useLibraryCatalog";
import type { LibraryMutations } from "./useLibraryMutations";
import type { LibrarySync } from "./useLibrarySync";
import {
  exportLibrarySelection,
  importLibrarySelection,
  loadLibraryTransferData,
  loadServerLibraryTransferData,
  parseLibraryImportBundle,
  pullLibrarySelectionFromServer,
  pushLibrarySelectionToServer,
  type LibraryTransferContext,
} from "@/services/library/transfer";

export function useLibraryTransfer(
  catalog: LibraryCatalog,
  sync: Pick<LibrarySync, "applyLocalState">,
  mutations: Pick<LibraryMutations, "searchDiagrams">,
) {
  const ctx: LibraryTransferContext = {
    catalog,
    sync,
    searchDiagrams: mutations.searchDiagrams,
  };

  return {
    loadTransferData: () => loadLibraryTransferData(),
    exportLibrarySelection,
    parseImportBundle: parseLibraryImportBundle,
    importLibrarySelection: (
      bundle: Parameters<typeof importLibrarySelection>[1],
      sectionIds: ReadonlySet<string>,
      diagramIds: ReadonlySet<string>,
    ) => importLibrarySelection(ctx, bundle, sectionIds, diagramIds),
    pushSelectionToServer: (
      sectionIds: ReadonlySet<string>,
      diagramIds: ReadonlySet<string>,
    ) => pushLibrarySelectionToServer(ctx, sectionIds, diagramIds),
    pullSelectionFromServer: (
      sectionIds: ReadonlySet<string>,
      diagramIds: ReadonlySet<string>,
    ) => pullLibrarySelectionFromServer(ctx, sectionIds, diagramIds),
    loadServerTransferData: () => loadServerLibraryTransferData(catalog),
  };
}
