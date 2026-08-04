import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  LIBRARY_CACHE_KEY,
  LIBRARY_SEARCH_DEBOUNCE_MS,
  type CreateDiagramPayload,
  type CreateSectionPayload,
  type DiagramDto,
  type DiagramListItemDto,
  type LibraryExportBundle,
  type SectionDto,
  type UpdateDiagramPayload,
} from "@/constants/diagram-library";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import {
  checkApiHealth,
  createDiagram,
  createSection,
  deleteDiagram,
  deleteSection,
  fetchDiagram,
  fetchDiagrams,
  fetchSections,
  uploadDiagramFile,
} from "@/utils/diagram-api";
import {
  buildSectionTree,
  createLocalDiagram,
  createLocalSection,
  deleteLocalDiagram,
  deleteLocalSection,
  getCacheMeta,
  importLocalLibrarySelection,
  loadAllDiagramDetailsFromCache,
  loadDiagramDetailFromCache,
  loadDiagramsFromCache,
  loadSectionsFromCache,
  reloadLocalLibraryState,
  saveDiagramDetailToCache,
  saveDiagramsToCache,
  saveSectionsToCache,
  searchLocalLibrary,
  setCacheMeta,
  updateLocalDiagram,
} from "@/utils/diagram-store";
import {
  buildLocalExportBundle,
  downloadLibraryBundle,
  parseLibraryImportFile,
} from "@/utils/library-import-export";
import { assertPumlFileSize, readFileAsText as readPumlFile } from "@/utils/puml-files";

export function useDiagramLibrary() {
  const { libraryApiUrl, isLocalMode } = useLibraryApiUrl();

  const sections = ref<SectionDto[]>([]);
  const flatSections = ref<SectionDto[]>([]);
  const diagrams = ref<DiagramListItemDto[]>([]);
  const selectedDiagram = ref<DiagramDto | null>(null);
  const selectedSectionId = ref<string | null>(null);
  const searchQuery = ref("");
  const tagFilter = ref("");
  const languageFilter = ref("");
  const isLoading = ref(false);
  const isSyncing = ref(false);
  const isOnline = ref(navigator.onLine);
  const apiAvailable = ref(false);
  const usingCache = ref(false);
  const lastSyncedAt = ref<string | null>(null);
  const errorMessage = ref("");

  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  const sectionTree = computed(() => buildSectionTree(flatSections.value));
  const shouldUseServer = computed(
    () => Boolean(libraryApiUrl.value) && isOnline.value,
  );

  const allTags = computed(() => {
    const tags = new Set<string>();
    for (const diagram of diagrams.value) {
      for (const tag of diagram.tags) {
        tags.add(tag);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  });

  function updateOnlineStatus(): void {
    isOnline.value = navigator.onLine;
  }

  async function applyLocalState(): Promise<void> {
    const state = await reloadLocalLibraryState();
    flatSections.value = state.flatSections;
    sections.value = state.sections;
    diagrams.value = state.diagrams;
    usingCache.value = isLocalMode.value || !apiAvailable.value;
  }

  async function loadFromCache(): Promise<void> {
    const [cachedSections, cachedDiagrams, syncedAt] = await Promise.all([
      loadSectionsFromCache(),
      loadDiagramsFromCache(),
      getCacheMeta(LIBRARY_CACHE_KEY),
    ]);

    if (cachedSections.length > 0) {
      flatSections.value = cachedSections;
      sections.value = buildSectionTree(cachedSections);
    }

    if (cachedDiagrams.length > 0) {
      diagrams.value = cachedDiagrams;
    }

    usingCache.value = isLocalMode.value || cachedSections.length > 0;
    lastSyncedAt.value = syncedAt;
  }

  async function syncFromServer(): Promise<void> {
    if (!shouldUseServer.value) {
      apiAvailable.value = false;
      await applyLocalState();
      return;
    }

    isSyncing.value = true;
    errorMessage.value = "";

    try {
      apiAvailable.value = await checkApiHealth(libraryApiUrl.value);
      if (!apiAvailable.value) {
        usingCache.value = true;
        await applyLocalState();
        return;
      }

      const [sectionsResponse, diagramsResponse] = await Promise.all([
        fetchSections(libraryApiUrl.value),
        fetchDiagrams(
          {
            q: searchQuery.value.trim() || undefined,
            sectionId: selectedSectionId.value ?? undefined,
            tag: tagFilter.value.trim() || undefined,
            language: languageFilter.value.trim() || undefined,
          },
          libraryApiUrl.value,
        ),
      ]);

      flatSections.value = sectionsResponse.flat;
      sections.value = sectionsResponse.sections;
      diagrams.value = diagramsResponse.diagrams;

      await Promise.all([
        saveSectionsToCache(sectionsResponse.flat),
        saveDiagramsToCache(diagramsResponse.diagrams),
      ]);

      const syncedAt = new Date().toISOString();
      await setCacheMeta(LIBRARY_CACHE_KEY, syncedAt);
      lastSyncedAt.value = syncedAt;
      usingCache.value = false;
    } catch (error) {
      usingCache.value = true;
      await applyLocalState();
      errorMessage.value =
        error instanceof Error ? error.message : "Sync failed";
    } finally {
      isSyncing.value = false;
    }
  }

  async function refresh(): Promise<void> {
    isLoading.value = true;
    errorMessage.value = "";
    try {
      if (isLocalMode.value) {
        await applyLocalState();
        usingCache.value = true;
        apiAvailable.value = false;
        return;
      }

      await loadFromCache();
      await syncFromServer();
    } finally {
      isLoading.value = false;
    }
  }

  async function searchDiagrams(): Promise<void> {
    if (isLocalMode.value || !shouldUseServer.value || !apiAvailable.value) {
      diagrams.value = await searchLocalLibrary({
        q: searchQuery.value,
        sectionId: selectedSectionId.value,
        tag: tagFilter.value,
        language: languageFilter.value,
      });
      usingCache.value = true;
      return;
    }

    try {
      const response = await fetchDiagrams(
        {
          q: searchQuery.value.trim() || undefined,
          sectionId: selectedSectionId.value ?? undefined,
          tag: tagFilter.value.trim() || undefined,
          language: languageFilter.value.trim() || undefined,
        },
        libraryApiUrl.value,
      );
      diagrams.value = response.diagrams;
      await saveDiagramsToCache(response.diagrams);
      usingCache.value = false;
    } catch {
      diagrams.value = await searchLocalLibrary({
        q: searchQuery.value,
        sectionId: selectedSectionId.value,
        tag: tagFilter.value,
        language: languageFilter.value,
      });
      usingCache.value = true;
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

  async function selectSection(sectionId: string | null): Promise<void> {
    selectedSectionId.value = sectionId;
    selectedDiagram.value = null;
    await searchDiagrams();
  }

  async function selectDiagram(diagramId: string): Promise<void> {
    isLoading.value = true;
    try {
      if (shouldUseServer.value && apiAvailable.value) {
        try {
          const diagram = await fetchDiagram(diagramId, libraryApiUrl.value);
          selectedDiagram.value = diagram;
          await saveDiagramDetailToCache(diagram);
          return;
        } catch {
          // fallback to local cache below
        }
      }

      const cached = await loadDiagramDetailFromCache(diagramId);
      selectedDiagram.value = cached;
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : "Failed to load diagram";
    } finally {
      isLoading.value = false;
    }
  }

  async function addSection(payload: CreateSectionPayload): Promise<SectionDto> {
    if (shouldUseServer.value) {
      try {
        const section = await createSection(payload, libraryApiUrl.value);
        await refresh();
        return section;
      } catch {
        // fallback to local storage
      }
    }

    const section = await createLocalSection(payload);
    await applyLocalState();
    usingCache.value = true;
    return section;
  }

  async function removeSection(sectionId: string): Promise<void> {
    if (shouldUseServer.value && apiAvailable.value) {
      try {
        await deleteSection(sectionId, libraryApiUrl.value);
        if (selectedSectionId.value === sectionId) {
          selectedSectionId.value = null;
        }
        await refresh();
        return;
      } catch {
        // fallback to local storage
      }
    }

    await deleteLocalSection(sectionId);
    if (selectedSectionId.value === sectionId) {
      selectedSectionId.value = null;
    }
    await applyLocalState();
    await searchDiagrams();
    usingCache.value = true;
  }

  async function addDiagram(payload: CreateDiagramPayload): Promise<DiagramDto> {
    if (shouldUseServer.value) {
      try {
        const diagram = await createDiagram(payload, libraryApiUrl.value);
        await refresh();
        return diagram;
      } catch {
        // fallback to local storage
      }
    }

    const diagram = await createLocalDiagram(payload);
    await applyLocalState();
    await searchDiagrams();
    usingCache.value = true;
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
    },
  ): Promise<DiagramDto> {
    assertPumlFileSize(file);

    if (shouldUseServer.value) {
      try {
        const diagram = await uploadDiagramFile(
          file,
          metadata,
          libraryApiUrl.value,
        );
        await refresh();
        return diagram;
      } catch {
        // fallback to local storage
      }
    }

    const content = await readPumlFile(file);
    const tags = metadata.tags ?? [];
    const title =
      metadata.title?.trim() ||
      file.name.replace(/\.(puml|plantuml|txt)$/i, "") ||
      "Diagram";

    return addDiagram({
      title,
      description: metadata.description?.trim() ?? "",
      tags,
      language: (metadata.language as CreateDiagramPayload["language"]) ?? "plantuml",
      sectionId: metadata.sectionId ?? null,
      source: content,
      fileName: file.name,
    });
  }

  async function removeDiagram(diagramId: string): Promise<void> {
    if (shouldUseServer.value && apiAvailable.value) {
      try {
        await deleteDiagram(diagramId, libraryApiUrl.value);
        if (selectedDiagram.value?.id === diagramId) {
          selectedDiagram.value = null;
        }
        await refresh();
        return;
      } catch {
        // fallback to local storage
      }
    }

    await deleteLocalDiagram(diagramId);
    if (selectedDiagram.value?.id === diagramId) {
      selectedDiagram.value = null;
    }
    await applyLocalState();
    await searchDiagrams();
    usingCache.value = true;
  }

  async function updateDiagram(
    diagramId: string,
    payload: UpdateDiagramPayload,
  ): Promise<DiagramDto> {
    const diagram = await updateLocalDiagram(diagramId, payload);
    await applyLocalState();
    await searchDiagrams();
    if (selectedDiagram.value?.id === diagramId) {
      selectedDiagram.value = diagram;
    }
    usingCache.value = true;
    return diagram;
  }

  async function loadTransferData(): Promise<{
    sections: SectionDto[];
    diagrams: DiagramDto[];
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
    selectedDiagram.value = null;
    await applyLocalState();
    await searchDiagrams();
    usingCache.value = true;
  }

  onMounted(() => {
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  });

  onUnmounted(() => {
    window.removeEventListener("online", updateOnlineStatus);
    window.removeEventListener("offline", updateOnlineStatus);
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
  });

  return {
    sections,
    flatSections,
    sectionTree,
    diagrams,
    selectedDiagram,
    selectedSectionId,
    searchQuery,
    tagFilter,
    languageFilter,
    allTags,
    isLoading,
    isSyncing,
    isOnline,
    isLocalMode,
    apiAvailable,
    usingCache,
    lastSyncedAt,
    errorMessage,
    refresh,
    scheduleSearch,
    searchDiagrams,
    selectSection,
    selectDiagram,
    addSection,
    removeSection,
    addDiagram,
    addDiagramFromFile,
    removeDiagram,
    updateDiagram,
    loadTransferData,
    exportLibrarySelection,
    parseImportBundle,
    importLibrarySelection,
  };
}
