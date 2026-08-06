import { onUnmounted } from "vue";
import { useLibraryCatalog } from "./library/useLibraryCatalog";
import { useLibraryMutations } from "./library/useLibraryMutations";
import { useLibrarySync } from "./library/useLibrarySync";
import { useLibraryTransfer } from "./library/useLibraryTransfer";

let libraryInstance: ReturnType<typeof createDiagramLibrary> | null = null;

function createDiagramLibrary() {
  const catalog = useLibraryCatalog();
  const sync = useLibrarySync(catalog);
  const mutations = useLibraryMutations(catalog, sync);
  const transfer = useLibraryTransfer(catalog, sync, mutations);

  onUnmounted(() => {
    mutations.teardownSearchDebounce();
  });

  return {
    sections: catalog.sections,
    flatSections: catalog.flatSections,
    sectionTree: catalog.sectionTree,
    diagrams: catalog.diagrams,
    selectedDiagram: catalog.selectedDiagram,
    selectedSectionId: catalog.selectedSectionId,
    searchQuery: catalog.searchQuery,
    tagFilter: catalog.tagFilter,
    languageFilter: catalog.languageFilter,
    allTags: catalog.allTags,
    isLoading: catalog.isLoading,
    isSyncing: catalog.isSyncing,
    isOnline: catalog.isOnline,
    isLocalMode: catalog.isLocalMode,
    libraryTarget: catalog.libraryTarget,
    apiAvailable: catalog.apiAvailable,
    usingCache: catalog.usingCache,
    lastSyncedAt: catalog.lastSyncedAt,
    errorMessage: catalog.errorMessage,
    refresh: sync.refresh,
    scheduleSearch: mutations.scheduleSearch,
    searchDiagrams: mutations.searchDiagrams,
    selectSection: mutations.selectSection,
    selectDiagram: mutations.selectDiagram,
    addSection: mutations.addSection,
    removeSection: mutations.removeSection,
    editSection: mutations.editSection,
    addDiagram: mutations.addDiagram,
    addDiagramFromFile: mutations.addDiagramFromFile,
    removeDiagram: mutations.removeDiagram,
    updateDiagram: mutations.updateDiagram,
    loadTransferData: transfer.loadTransferData,
    exportLibrarySelection: transfer.exportLibrarySelection,
    parseImportBundle: transfer.parseImportBundle,
    importLibrarySelection: transfer.importLibrarySelection,
    pushSelectionToServer: transfer.pushSelectionToServer,
    pullSelectionFromServer: transfer.pullSelectionFromServer,
    loadServerTransferData: transfer.loadServerTransferData,
  };
}

export function useDiagramLibrary() {
  if (!libraryInstance) {
    libraryInstance = createDiagramLibrary();
  }

  return libraryInstance;
}
