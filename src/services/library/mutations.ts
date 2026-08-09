import {
  type CreateDiagramPayload,
  type CreateSectionPayload,
  type DiagramDto,
  type DiagramVisibility,
  type UpdateDiagramPayload,
  type UpdateSectionPayload,
} from "@/constants/diagram-library";
import { getDiagramFormatDefinition } from "@/constants/diagram-formats";
import {
  createDiagram,
  createSection,
  deleteDiagram,
  deleteSection,
  fetchDiagram,
  updateSection,
  updateDiagram as updateDiagramApi,
  uploadDiagramFile,
} from "@/services/library/api";
import { detectDiagramFormat } from "@/utils/diagram-format";
import {
  assertDiagramFileSize,
  readFileAsText,
} from "@/utils/diagram-files";
import {
  createLocalDiagram,
  createLocalSection,
  deleteLocalDiagram,
  deleteLocalSection,
  loadDiagramDetailFromCache,
  saveDiagramDetailToCache,
  updateLocalDiagram,
  updateLocalSection,
} from "@/storage/diagram-store";
import type { LibraryCatalog } from "@/composables/library/useLibraryCatalog";
import type { LibrarySync } from "@/composables/library/useLibrarySync";

export interface LibraryMutationContext {
  catalog: LibraryCatalog;
  sync: Pick<LibrarySync, "applyLocalState" | "refresh">;
  searchDiagrams: () => Promise<void>;
}

export async function selectLibraryDiagram(
  ctx: LibraryMutationContext,
  diagramId: string,
): Promise<void> {
  const { catalog } = ctx;
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

export async function addLibrarySection(
  ctx: LibraryMutationContext,
  payload: CreateSectionPayload,
) {
  const { catalog, sync } = ctx;
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

export async function removeLibrarySection(
  ctx: LibraryMutationContext,
  sectionId: string,
): Promise<void> {
  const { catalog, sync, searchDiagrams } = ctx;
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

export async function editLibrarySection(
  ctx: LibraryMutationContext,
  sectionId: string,
  payload: UpdateSectionPayload,
) {
  const { catalog, sync } = ctx;
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

export async function addLibraryDiagram(
  ctx: LibraryMutationContext,
  payload: CreateDiagramPayload,
): Promise<DiagramDto> {
  const { catalog, sync, searchDiagrams } = ctx;
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

export async function addLibraryDiagramFromFile(
  ctx: LibraryMutationContext,
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

  const { catalog } = ctx;
  if (catalog.shouldUseServer.value) {
    try {
      const diagram = await uploadDiagramFile(
        file,
        metadata,
        catalog.libraryApiUrl.value,
      );
      await ctx.sync.refresh();
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

  return addLibraryDiagram(ctx, {
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

export async function removeLibraryDiagram(
  ctx: LibraryMutationContext,
  diagramId: string,
): Promise<void> {
  const { catalog, sync, searchDiagrams } = ctx;
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

export async function updateLibraryDiagram(
  ctx: LibraryMutationContext,
  diagramId: string,
  payload: UpdateDiagramPayload,
): Promise<DiagramDto> {
  const { catalog, sync, searchDiagrams } = ctx;
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
