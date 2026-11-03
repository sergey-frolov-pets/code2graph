import {
  LIBRARY_CACHE_KEY,
  type DiagramListItemDto,
  type DiagramSortOption,
  type SectionDto,
} from "@/constants/diagram-library";
import { buildSectionTree } from "@/shared/library/section-tree";
import {
  checkApiHealth,
  fetchDiagrams,
  fetchSections,
} from "@/services/library/api";
import {
  getCacheMeta,
  loadDiagramsFromCache,
  loadSectionsFromCache,
  reloadLocalLibraryState,
  saveDiagramsToCache,
  saveSectionsToCache,
  setCacheMeta,
} from "@/storage/diagram-store";

export interface LibraryFetchFilters {
  q?: string;
  sectionId?: string | null;
  tag?: string;
  language?: string;
  minRating?: number;
  minVotes?: number;
  sortBy?: DiagramSortOption;
}

function trimFilter(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function positiveNumber(value: number | undefined): number | undefined {
  if (value === undefined || value <= 0 || Number.isNaN(value)) {
    return undefined;
  }
  return value;
}

export function buildServerFetchFilters(
  filters: LibraryFetchFilters,
): {
  q?: string;
  sectionId?: string;
  tag?: string;
  language?: string;
  minRating?: number;
  minVotes?: number;
  sortBy?: DiagramSortOption;
} {
  return {
    q: trimFilter(filters.q ?? ""),
    sectionId: filters.sectionId ?? undefined,
    tag: trimFilter(filters.tag ?? ""),
    language: trimFilter(filters.language ?? ""),
    minRating: positiveNumber(filters.minRating),
    minVotes: positiveNumber(filters.minVotes),
    sortBy: filters.sortBy,
  };
}

export async function checkServerAvailability(apiUrl: string): Promise<boolean> {
  return checkApiHealth(apiUrl);
}

export async function fetchLibraryFromServer(
  apiUrl: string,
  filters: LibraryFetchFilters,
): Promise<{
  flatSections: SectionDto[];
  sections: SectionDto[];
  diagrams: DiagramListItemDto[];
}> {
  const [sectionsResponse, diagramsResponse] = await Promise.all([
    fetchSections(apiUrl),
    fetchDiagrams(buildServerFetchFilters(filters), apiUrl),
  ]);

  return {
    flatSections: sectionsResponse.flat,
    sections: sectionsResponse.sections,
    diagrams: diagramsResponse.diagrams,
  };
}

export async function cacheLibrarySnapshot(
  flatSections: SectionDto[],
  diagrams: DiagramListItemDto[],
): Promise<string> {
  await Promise.all([
    saveSectionsToCache(flatSections),
    saveDiagramsToCache(diagrams),
  ]);

  const syncedAt = new Date().toISOString();
  await setCacheMeta(LIBRARY_CACHE_KEY, syncedAt);
  return syncedAt;
}

export async function loadCachedLibrary(): Promise<{
  flatSections: SectionDto[];
  sections: SectionDto[];
  diagrams: DiagramListItemDto[];
  syncedAt: string | null;
  hasCachedSections: boolean;
  hasCachedDiagrams: boolean;
}> {
  const [cachedSections, cachedDiagrams, syncedAt] = await Promise.all([
    loadSectionsFromCache(),
    loadDiagramsFromCache(),
    getCacheMeta(LIBRARY_CACHE_KEY),
  ]);

  return {
    flatSections: cachedSections,
    sections:
      cachedSections.length > 0 ? buildSectionTree(cachedSections) : [],
    diagrams: cachedDiagrams,
    syncedAt,
    hasCachedSections: cachedSections.length > 0,
    hasCachedDiagrams: cachedDiagrams.length > 0,
  };
}

export async function loadLocalLibrary(): Promise<{
  flatSections: SectionDto[];
  sections: SectionDto[];
  diagrams: DiagramListItemDto[];
}> {
  const state = await reloadLocalLibraryState();
  return {
    flatSections: state.flatSections,
    sections: state.sections,
    diagrams: state.diagrams,
  };
}
