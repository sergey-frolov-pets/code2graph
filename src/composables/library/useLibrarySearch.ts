import {
  LIBRARY_SEARCH_DEBOUNCE_MS,
  RATINGS_SECTION_ID,
} from "@/constants/diagram-library";
import { buildServerFetchFilters } from "@/services/library/library-sync-service";
import { fetchDiagrams } from "@/services/library/api";
import {
  saveDiagramsToCache,
  searchLocalLibrary,
} from "@/storage/diagram-store";
import type { LibraryCatalog } from "./useLibraryCatalog";

export function useLibrarySearch(catalog: LibraryCatalog) {
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  async function searchDiagrams(): Promise<void> {
    if (
      catalog.isLocalMode.value ||
      !catalog.shouldUseServer.value ||
      !catalog.apiAvailable.value
    ) {
      catalog.diagrams.value = await searchLocalLibrary({
        q: catalog.searchQuery.value,
        sectionId: catalog.selectedSectionId.value,
        tag: catalog.tagFilter.value,
        language: catalog.languageFilter.value,
      });
      catalog.usingCache.value = true;
      return;
    }

    try {
      const response = await fetchDiagrams(
        buildServerFetchFilters({
          q: catalog.searchQuery.value,
          sectionId: catalog.selectedSectionId.value,
          tag: catalog.tagFilter.value,
          language: catalog.languageFilter.value,
          minRating: catalog.minRatingFilter.value,
          minVotes: catalog.minVotesFilter.value,
          sortBy: catalog.sortByFilter.value,
        }),
        catalog.libraryApiUrl.value,
      );
      catalog.diagrams.value = response.diagrams;
      await saveDiagramsToCache(response.diagrams);
      catalog.usingCache.value = false;
    } catch {
      catalog.diagrams.value = await searchLocalLibrary({
        q: catalog.searchQuery.value,
        sectionId: catalog.selectedSectionId.value,
        tag: catalog.tagFilter.value,
        language: catalog.languageFilter.value,
      });
      catalog.usingCache.value = true;
    }
  }

  function scheduleSearch(): void {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = setTimeout(() => {
      void searchDiagrams();
    }, LIBRARY_SEARCH_DEBOUNCE_MS);
  }

  function teardownSearchDebounce(): void {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
  }

  async function selectSection(sectionId: string | null): Promise<void> {
    catalog.selectedSectionId.value = sectionId;
    catalog.selectedDiagram.value = null;
    if (sectionId === RATINGS_SECTION_ID) {
      catalog.diagrams.value = [];
      return;
    }
    await searchDiagrams();
  }

  return {
    searchDiagrams,
    scheduleSearch,
    teardownSearchDebounce,
    selectSection,
  };
}
