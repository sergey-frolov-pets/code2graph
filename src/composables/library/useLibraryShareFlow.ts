import { ref, type Ref } from "vue";
import { PENDING_SHARE_STORAGE_KEY } from "@/constants/library-share";
import {
  fetchShareDiagramPreview,
  fetchShareResource,
} from "@/services/library/api";
import type { BrowseStep } from "@/composables/library/useLibraryBrowseFlow";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;

export interface ShareResourceRef {
  type: "section" | "diagram";
  id: string;
  title: string;
}

export function useLibraryShareFlow(options: {
  library: DiagramLibrary;
  browseStep: Ref<BrowseStep>;
  uploadError: Ref<string>;
  resetEditForm: () => void;
  browseDiagramPick: (diagramId: string) => Promise<void>;
  goBack: () => void;
  openShareDiagramPreview: (token: string, diagramId: string) => Promise<void>;
  t: (key: string) => string;
}) {
  const {
    library,
    browseStep,
    uploadError,
    resetEditForm,
    browseDiagramPick,
    goBack,
    openShareDiagramPreview,
    t,
  } = options;

  const isShareModalOpen = ref(false);
  const shareResource = ref<ShareResourceRef | null>(null);
  const activeShareToken = ref("");
  const shareBrowseContext = ref<{
    token: string;
    canDownload: boolean;
    downloadsRemaining: number | null;
  } | null>(null);

  function openShareModal(
    type: "section" | "diagram",
    id: string,
    title: string,
  ): void {
    shareResource.value = { type, id, title };
    isShareModalOpen.value = true;
  }

  function closeShareModal(): void {
    isShareModalOpen.value = false;
    shareResource.value = null;
  }

  function clearShareBrowseContext(clearActiveToken = true): void {
    shareBrowseContext.value = null;
    if (clearActiveToken) {
      activeShareToken.value = "";
    }
  }

  function onShareCreated(url: string, setUploadError: (message: string) => void): void {
    setUploadError(`${t("library.shareReady")}: ${url}`);
  }

  async function handleDiagramPick(diagramId: string): Promise<void> {
    if (shareBrowseContext.value) {
      try {
        await openShareDiagramPreview(
          shareBrowseContext.value.token,
          diagramId,
        );
      } catch (error) {
        uploadError.value =
          error instanceof Error ? error.message : t("library.shareOpenError");
      }
      return;
    }

    await browseDiagramPick(diagramId);
  }

  async function handleGoBack(): Promise<void> {
    if (browseStep.value === "diagrams" && shareBrowseContext.value) {
      clearShareBrowseContext();
      browseStep.value = "sections";
      resetEditForm();
      void library.refresh();
      return;
    }

    goBack();
  }

  async function handleIncomingShareToken(token: string): Promise<void> {
    try {
      const payload = await fetchShareResource(token);
      if (payload.resourceType === "diagram" && payload.diagram) {
        await openShareDiagramPreview(token, payload.diagram.id);
        return;
      }

      if (payload.resourceType === "section") {
        uploadError.value = t("library.shareSectionHint");
        shareBrowseContext.value = {
          token,
          canDownload: payload.canDownload ?? false,
          downloadsRemaining: payload.link?.downloadsRemaining ?? null,
        };
        activeShareToken.value = token;
        library.selectedSectionId.value = payload.sectionId ?? null;
        library.diagrams.value = payload.diagrams ?? [];
        browseStep.value = "diagrams";
      }
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.shareOpenError");
    }
  }

  function consumePendingShareToken(): string | null {
    const pendingShare = sessionStorage.getItem(PENDING_SHARE_STORAGE_KEY);
    if (!pendingShare) {
      return null;
    }

    sessionStorage.removeItem(PENDING_SHARE_STORAGE_KEY);
    return pendingShare;
  }

  return {
    isShareModalOpen,
    shareResource,
    activeShareToken,
    shareBrowseContext,
    openShareModal,
    closeShareModal,
    clearShareBrowseContext,
    onShareCreated,
    handleDiagramPick,
    handleGoBack,
    handleIncomingShareToken,
    consumePendingShareToken,
  };
}

export async function loadShareDiagramPreview(
  token: string,
  diagramId: string,
): Promise<Awaited<ReturnType<typeof fetchShareDiagramPreview>>> {
  return fetchShareDiagramPreview(token, diagramId);
}
