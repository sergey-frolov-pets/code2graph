import type { LibraryCatalog } from "./useLibraryCatalog";
import type { LibrarySync } from "./useLibrarySync";
import { useLibrarySearch } from "./useLibrarySearch";
import {
  addLibraryDiagram,
  addLibraryDiagramFromFile,
  addLibrarySection,
  editLibrarySection,
  removeLibraryDiagram,
  removeLibrarySection,
  selectLibraryDiagram,
  updateLibraryDiagram,
  type LibraryMutationContext,
} from "@/services/library/mutations";

export function useLibraryMutations(
  catalog: LibraryCatalog,
  sync: Pick<LibrarySync, "applyLocalState" | "refresh">,
) {
  const {
    searchDiagrams,
    scheduleSearch,
    teardownSearchDebounce,
    selectSection,
  } = useLibrarySearch(catalog);

  const ctx: LibraryMutationContext = {
    catalog,
    sync,
    searchDiagrams,
  };

  return {
    searchDiagrams,
    scheduleSearch,
    teardownSearchDebounce,
    selectSection,
    selectDiagram: (diagramId: string) => selectLibraryDiagram(ctx, diagramId),
    addSection: (payload: Parameters<typeof addLibrarySection>[1]) =>
      addLibrarySection(ctx, payload),
    removeSection: (sectionId: string) => removeLibrarySection(ctx, sectionId),
    editSection: (
      sectionId: string,
      payload: Parameters<typeof editLibrarySection>[2],
    ) => editLibrarySection(ctx, sectionId, payload),
    addDiagram: (payload: Parameters<typeof addLibraryDiagram>[1]) =>
      addLibraryDiagram(ctx, payload),
    addDiagramFromFile: (
      file: File,
      metadata: Parameters<typeof addLibraryDiagramFromFile>[2],
    ) => addLibraryDiagramFromFile(ctx, file, metadata),
    removeDiagram: (diagramId: string) => removeLibraryDiagram(ctx, diagramId),
    updateDiagram: (
      diagramId: string,
      payload: Parameters<typeof updateLibraryDiagram>[2],
    ) => updateLibraryDiagram(ctx, diagramId, payload),
  };
}

export type LibraryMutations = ReturnType<typeof useLibraryMutations>;
