import { ref, type Ref } from "vue";
import type { TranslateFn } from "@/locales/types";
import { downloadShareResource } from "@/services/library/api";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import type { useLibraryDiagramPreview } from "@/composables/useLibraryDiagramPreview";
import { loadShareDiagramPreview } from "@/composables/library/useLibraryShareFlow";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;
type LibraryDiagramPreview = ReturnType<typeof useLibraryDiagramPreview>;

export function useLibraryPreviewFlow(options: {
  library: DiagramLibrary;
  preview: LibraryDiagramPreview;
  uploadError: Ref<string>;
  activeShareToken: Ref<string>;
  renderMode: Ref<RenderMode>;
  layout: Ref<LayoutEngine>;
  diagramDarkMode: Ref<boolean>;
  onOpenDiagram: (payload: {
    content: string;
    fileName: string;
    format?: DiagramFormat;
    diagramId?: string;
  }) => void;
  onCloseLibrary: () => void;
  t: TranslateFn;
}) {
  const {
    library,
    preview,
    uploadError,
    activeShareToken,
    renderMode,
    layout,
    diagramDarkMode,
    onOpenDiagram,
    onCloseLibrary,
    t,
  } = options;

  const isPreviewModalOpen = ref(false);
  const previewTitle = ref("");
  const previewCanDownload = ref(false);
  const previewDownloadsRemaining = ref<number | null>(null);
  const isPreviewDownloading = ref(false);
  const activePreviewDiagramId = ref("");

  async function openShareDiagramPreview(
    token: string,
    diagramId: string,
  ): Promise<void> {
    const sharePreview = await loadShareDiagramPreview(token, diagramId);
    previewTitle.value = sharePreview.diagram.title;
    previewCanDownload.value = sharePreview.canDownload;
    previewDownloadsRemaining.value =
      sharePreview.link.downloadsRemaining;
    activeShareToken.value = token;
    activePreviewDiagramId.value = diagramId;
    isPreviewModalOpen.value = true;
    preview.resetPreview();
    await preview.renderPreview(sharePreview.diagram.source, {
      watermarked: true,
      fileName: sharePreview.diagram.fileName,
      language: sharePreview.diagram.language,
      renderMode: renderMode.value,
      dark: diagramDarkMode.value,
      layout: layout.value,
    });
  }

  async function onPreviewDiagram(): Promise<void> {
    if (!library.selectedDiagram.value) {
      return;
    }

    let diagram = library.selectedDiagram.value;
    if (!diagram.source?.trim()) {
      await library.selectDiagram(diagram.id);
      if (!library.selectedDiagram.value?.source?.trim()) {
        uploadError.value = t("library.previewSourceMissing");
        return;
      }
      diagram = library.selectedDiagram.value;
    }

    preview.resetPreview();
    previewTitle.value = diagram.title;
    previewCanDownload.value = true;
    previewDownloadsRemaining.value = null;
    activeShareToken.value = "";
    activePreviewDiagramId.value = diagram.id;
    isPreviewModalOpen.value = true;
    await preview.renderPreview(diagram.source, {
      watermarked: true,
      fileName: diagram.fileName,
      language: diagram.language,
      renderMode: renderMode.value,
      dark: diagramDarkMode.value,
      layout: layout.value,
    });
  }

  function closePreviewModal(): void {
    isPreviewModalOpen.value = false;
    preview.resetPreview();
    activeShareToken.value = "";
    activePreviewDiagramId.value = "";
  }

  async function onPreviewDownload(): Promise<void> {
    const diagramId =
      activePreviewDiagramId.value || library.selectedDiagram.value?.id;
    if (!diagramId) {
      return;
    }

    if (activeShareToken.value) {
      isPreviewDownloading.value = true;
      try {
        const result = await downloadShareResource(
          activeShareToken.value,
          diagramId,
        );
        previewDownloadsRemaining.value = result.link.downloadsRemaining;
        onOpenDiagram({
          content: result.diagram.source,
          fileName: result.diagram.fileName,
          format: resolveLibraryDiagramFormat(
            result.diagram.source,
            result.diagram.fileName,
            result.diagram.language,
          ),
          diagramId: result.diagram.id,
        });
        closePreviewModal();
        onCloseLibrary();
      } catch (error) {
        uploadError.value =
          error instanceof Error ? error.message : t("library.downloadError");
      } finally {
        isPreviewDownloading.value = false;
      }
      return;
    }

    if (!library.selectedDiagram.value) {
      return;
    }

    onOpenDiagram({
      content: library.selectedDiagram.value.source,
      fileName: library.selectedDiagram.value.fileName,
      format: resolveLibraryDiagramFormat(
        library.selectedDiagram.value.source,
        library.selectedDiagram.value.fileName,
        library.selectedDiagram.value.language,
      ),
      diagramId: library.selectedDiagram.value.id,
    });
    closePreviewModal();
    onCloseLibrary();
  }

  return {
    isPreviewModalOpen,
    previewTitle,
    previewCanDownload,
    previewDownloadsRemaining,
    isPreviewDownloading,
    activePreviewDiagramId,
    openShareDiagramPreview,
    onPreviewDiagram,
    closePreviewModal,
    onPreviewDownload,
  };
}
