import {
  LIBRARY_SEARCH_DEBOUNCE_MS,
  RATINGS_SECTION_ID,
  type CreateDiagramPayload,
  type CreateSectionPayload,
  type DiagramDto,
  type DiagramVisibility,
  type UpdateDiagramPayload,
  type UpdateSectionPayload,
} from "@/constants/diagram-library";
import { buildServerFetchFilters } from "@/services/library/library-sync-service";
import {
  createDiagram,
  createSection,
  deleteDiagram,
  deleteSection,
  fetchDiagram,
  fetchDiagrams,
  updateSection,
  updateDiagram as updateDiagramApi,
  uploadDiagramFile,
} from "@/utils/diagram-api";
import {
  createLocalDiagram,
  createLocalSection,
  deleteLocalDiagram,
  deleteLocalSection,
  loadDiagramDetailFromCache,
  saveDiagramDetailToCache,
  saveDiagramsToCache,
  searchLocalLibrary,
  updateLocalDiagram,
  updateLocalSection,
} from "@/utils/diagram-store";
import { getDiagramFormatDefinition } from "@/constants/diagram-formats";
import { detectDiagramFormat } from "@/utils/diagram-format";
import {
  assertDiagramFileSize,
  readFileAsText,
} from "@/utils/diagram-files";
import type { LibraryCatalog } from "./useLibraryCatalog";
import type { LibrarySync } from "./useLibrarySync";

export function useLibraryMutations(
  catalog: LibraryCatalog,
  sync: Pick<LibrarySync, "applyLocalState" | "refresh">,
) {
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

  async function selectDiagram(diagramId: string): Promise<void> {
    catalog.isLoading.value = true;
    try {
      if (catalog.shouldUseServer.value && catalog.apiAvailable.value) {
        try {
          const diagram = await fetchDiagram(
            diagramId,
            catalog.libraryApiUrl.value,
          );
          catalog.selectedDiagram.value = diagram;
          await saveDiagramDetailToCache(diagram);
          return;
        } catch {
          // fallback to local cache below
        }
      }

      const cached = await loadDiagramDetailFromCache(diagramId);
      catalog.selectedDiagram.value = cached;
    } catch (error) {
      catalog.errorMessage.value =
        error instanceof Error ? error.message : "Failed to load diagram";
    } finally {
      catalog.isLoading.value = false;
    }
  }

  async function addSection(payload: CreateSectionPayload) {
    if (catalog.shouldUseServer.value) {
      try {
        const section = await createSection(
          payload,
          catalog.libraryApiUrl.value,
        );
        await sync.refresh();
        return section;
      } catch {
        // fallback to local storage
      }
    }

    const section = await createLocalSection(payload);
    await sync.applyLocalState();
    catalog.usingCache.value = true;
    return section;
  }

  async function removeSection(sectionId: string): Promise<void> {
    if (catalog.shouldUseServer.value && catalog.apiAvailable.value) {
      try {
        await deleteSection(sectionId, catalog.libraryApiUrl.value);
        if (catalog.selectedSectionId.value === sectionId) {
          catalog.selectedSectionId.value = null;
        }
        await sync.refresh();
        return;
      } catch {
        // fallback to local storage
      }
    }

    await deleteLocalSection(sectionId);
    if (catalog.selectedSectionId.value === sectionId) {
      catalog.selectedSectionId.value = null;
    }
    await sync.applyLocalState();
    await searchDiagrams();
    catalog.usingCache.value = true;
  }

  async function editSection(
    sectionId: string,
    payload: UpdateSectionPayload,
  ) {
    if (catalog.shouldUseServer.value && catalog.apiAvailable.value) {
      try {
        const section = await updateSection(
          sectionId,
          payload,
          catalog.libraryApiUrl.value,
        );
        await sync.refresh();
        return section;
      } catch {
        // fallback to local storage
      }
    }

    const section = await updateLocalSection(sectionId, payload);
    await sync.applyLocalState();
    catalog.usingCache.value = true;
    return section;
  }

  async function addDiagram(payload: CreateDiagramPayload): Promise<DiagramDto> {
    if (catalog.shouldUseServer.value) {
      try {
        const diagram = await createDiagram(
          payload,
          catalog.libraryApiUrl.value,
        );
        await sync.refresh();
        return diagram;
      } catch {
        // fallback to local storage
      }
    }

    const diagram = await createLocalDiagram(payload);
    await sync.applyLocalState();
    await searchDiagrams();
    catalog.usingCache.value = true;
    return diagram;
  }

  async function addDiagramFromFile(
    file: File,
    metadata: {
      title?: string;
      description?: string;
      tags?: string[];
      language?: string;
      sectionId?: string | null;
      visibility?: DiagramVisibility;
    },
  ): Promise<DiagramDto> {
    assertDiagramFileSize(file);

    if (catalog.shouldUseServer.value) {
      try {
        const diagram = await uploadDiagramFile(
          file,
          metadata,
          catalog.libraryApiUrl.value,
        );
        await sync.refresh();
        return diagram;
      } catch {
        // fallback to local storage
      }
    }

    const content = await readFileAsText(file);
    const detectedFormat = detectDiagramFormat(content, file.name);
    const tags = metadata.tags ?? [];
    const title =
      metadata.title?.trim() ||
      file.name.replace(/\.(puml|plantuml|txt|mmd|mermaid|graphml)$/i, "") ||
      "Diagram";

    return addDiagram({
      title,
      description: metadata.description?.trim() ?? "",
      tags,
      language:
        (metadata.language as CreateDiagramPayload["language"]) ??
        getDiagramFormatDefinition(detectedFormat).language,
      sectionId: metadata.sectionId ?? null,
      source: content,
      fileName: file.name,
      visibility: metadata.visibility,
    });
  }

  async function removeDiagram(diagramId: string): Promise<void> {
    if (catalog.shouldUseServer.value && catalog.apiAvailable.value) {
      try {
        await deleteDiagram(diagramId, catalog.libraryApiUrl.value);
        if (catalog.selectedDiagram.value?.id === diagramId) {
          catalog.selectedDiagram.value = null;
        }
        await sync.refresh();
        return;
      } catch {
        // fallback to local storage
      }
    }

    await deleteLocalDiagram(diagramId);
    if (catalog.selectedDiagram.value?.id === diagramId) {
      catalog.selectedDiagram.value = null;
    }
    await sync.applyLocalState();
    await searchDiagrams();
    catalog.usingCache.value = true;
  }

  async function updateDiagram(
    diagramId: string,
    payload: UpdateDiagramPayload,
  ): Promise<DiagramDto> {
    if (catalog.shouldUseServer.value && catalog.apiAvailable.value) {
      try {
        const diagram = await updateDiagramApi(
          diagramId,
          payload,
          catalog.libraryApiUrl.value,
        );
        await saveDiagramDetailToCache(diagram);
        if (catalog.selectedDiagram.value?.id === diagramId) {
          catalog.selectedDiagram.value = diagram;
        }
        await sync.refresh();
        return diagram;
      } catch {
        // fallback to local storage
      }
    }

    const diagram = await updateLocalDiagram(diagramId, payload);
    await sync.applyLocalState();
    await searchDiagrams();
    if (catalog.selectedDiagram.value?.id === diagramId) {
      catalog.selectedDiagram.value = diagram;
    }
    catalog.usingCache.value = true;
    return diagram;
  }

  return {
    searchDiagrams,
    scheduleSearch,
    teardownSearchDebounce,
    selectSection,
    selectDiagram,
    addSection,
    removeSection,
    editSection,
    addDiagram,
    addDiagramFromFile,
    removeDiagram,
    updateDiagram,
  };
}

export type LibraryMutations = ReturnType<typeof useLibraryMutations>;
