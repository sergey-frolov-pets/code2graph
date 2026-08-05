import { ref, type Ref } from "vue";
import type {
  DiagramDto,
  LibraryExportBundle,
  SectionDto,
} from "@/constants/diagram-library";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import type { LibraryTab } from "./useLibraryBrowseFlow";

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;

export function useLibraryTransferHandlers(options: {
  library: DiagramLibrary;
  activeTab: Ref<LibraryTab>;
  uploadError: Ref<string>;
  resetBrowseFlow: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { library, activeTab, uploadError, resetBrowseFlow, t } = options;

  const transferSections = ref<SectionDto[]>([]);
  const transferDiagrams = ref<DiagramDto[]>([]);
  const importBundle = ref<LibraryExportBundle | null>(null);
  const isTransferProcessing = ref(false);

  async function loadTransferData(): Promise<void> {
    const data = await library.loadTransferData();
    transferSections.value = data.sections;
    transferDiagrams.value = data.diagrams;
  }

  async function onExportSelection(payload: {
    sectionIds: Set<string>;
    diagramIds: Set<string>;
  }): Promise<void> {
    isTransferProcessing.value = true;
    uploadError.value = "";
    try {
      await library.exportLibrarySelection(
        payload.sectionIds,
        payload.diagramIds,
      );
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.exportError");
    } finally {
      isTransferProcessing.value = false;
    }
  }

  async function onImportFile(file: File): Promise<void> {
    uploadError.value = "";
    try {
      const content = await file.text();
      importBundle.value = library.parseImportBundle(content);
    } catch (error) {
      importBundle.value = null;
      uploadError.value =
        error instanceof Error ? error.message : t("library.importError");
    }
  }

  async function onImportSelection(payload: {
    sectionIds: Set<string>;
    diagramIds: Set<string>;
  }): Promise<void> {
    if (!importBundle.value) return;
    isTransferProcessing.value = true;
    uploadError.value = "";
    try {
      await library.importLibrarySelection(
        importBundle.value,
        payload.sectionIds,
        payload.diagramIds,
      );
      importBundle.value = null;
      await loadTransferData();
      activeTab.value = "browse";
      resetBrowseFlow();
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.importError");
    } finally {
      isTransferProcessing.value = false;
    }
  }

  function resetImportBundle(): void {
    importBundle.value = null;
  }

  return {
    transferSections,
    transferDiagrams,
    importBundle,
    isTransferProcessing,
    loadTransferData,
    onExportSelection,
    onImportFile,
    onImportSelection,
    resetImportBundle,
  };
}
