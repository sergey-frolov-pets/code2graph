import { computed, ref } from "vue";
import type {
  DiagramDto,
  DiagramListItemDto,
  SectionDto,
} from "@/constants/diagram-library";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { buildSectionTree } from "@/shared/library/section-tree";

export function useLibraryCatalog() {
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

  return {
    libraryApiUrl,
    isLocalMode,
    sections,
    flatSections,
    diagrams,
    selectedDiagram,
    selectedSectionId,
    searchQuery,
    tagFilter,
    languageFilter,
    isLoading,
    isSyncing,
    isOnline,
    apiAvailable,
    usingCache,
    lastSyncedAt,
    errorMessage,
    sectionTree,
    shouldUseServer,
    allTags,
  };
}

export type LibraryCatalog = ReturnType<typeof useLibraryCatalog>;
