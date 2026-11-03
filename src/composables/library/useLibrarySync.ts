import { onMounted, onUnmounted } from "vue";
import type { LibraryCatalog } from "./useLibraryCatalog";
import {
  cacheLibrarySnapshot,
  checkServerAvailability,
  fetchLibraryFromServer,
  loadCachedLibrary,
  loadLocalLibrary,
} from "@/services/library/library-sync-service";

export function useLibrarySync(catalog: LibraryCatalog) {
  function updateOnlineStatus(): void {
    catalog.isOnline.value = navigator.onLine;
  }

  async function applyLocalState(): Promise<void> {
    const state = await loadLocalLibrary();
    catalog.flatSections.value = state.flatSections;
    catalog.sections.value = state.sections;
    catalog.diagrams.value = state.diagrams;
    catalog.usingCache.value =
      catalog.isLocalMode.value || !catalog.apiAvailable.value;
  }

  async function loadFromCache(): Promise<void> {
    const cached = await loadCachedLibrary();

    if (cached.hasCachedSections) {
      catalog.flatSections.value = cached.flatSections;
      catalog.sections.value = cached.sections;
    }

    if (cached.hasCachedDiagrams) {
      catalog.diagrams.value = cached.diagrams;
    }

    catalog.usingCache.value =
      catalog.isLocalMode.value || cached.hasCachedSections;
    catalog.lastSyncedAt.value = cached.syncedAt;
  }

  async function syncFromServer(): Promise<void> {
    if (!catalog.shouldUseServer.value) {
      catalog.apiAvailable.value = false;
      await applyLocalState();
      return;
    }

    catalog.isSyncing.value = true;
    catalog.errorMessage.value = "";

    try {
      catalog.apiAvailable.value = await checkServerAvailability(
        catalog.libraryApiUrl.value,
      );
      if (!catalog.apiAvailable.value) {
        catalog.usingCache.value = true;
        await applyLocalState();
        return;
      }

      const fetched = await fetchLibraryFromServer(
        catalog.libraryApiUrl.value,
        {
          q: catalog.searchQuery.value,
          sectionId: catalog.selectedSectionId.value,
          tag: catalog.tagFilter.value,
          language: catalog.languageFilter.value,
        },
      );

      catalog.flatSections.value = fetched.flatSections;
      catalog.sections.value = fetched.sections;
      catalog.diagrams.value = fetched.diagrams;

      const syncedAt = await cacheLibrarySnapshot(
        fetched.flatSections,
        fetched.diagrams,
      );
      catalog.lastSyncedAt.value = syncedAt;
      catalog.usingCache.value = false;
    } catch (error) {
      catalog.usingCache.value = true;
      await applyLocalState();
      catalog.errorMessage.value =
        error instanceof Error ? error.message : "Sync failed";
    } finally {
      catalog.isSyncing.value = false;
    }
  }

  async function refresh(): Promise<void> {
    catalog.isLoading.value = true;
    catalog.errorMessage.value = "";
    try {
      if (catalog.isLocalMode.value) {
        await applyLocalState();
        catalog.usingCache.value = true;
        catalog.apiAvailable.value = false;
        return;
      }

      await loadFromCache();
      await syncFromServer();
    } finally {
      catalog.isLoading.value = false;
    }
  }

  onMounted(() => {
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  });

  onUnmounted(() => {
    window.removeEventListener("online", updateOnlineStatus);
    window.removeEventListener("offline", updateOnlineStatus);
  });

  return {
    applyLocalState,
    loadFromCache,
    syncFromServer,
    refresh,
  };
}

export type LibrarySync = ReturnType<typeof useLibrarySync>;
