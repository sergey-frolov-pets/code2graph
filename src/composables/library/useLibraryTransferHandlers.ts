import { computed, ref, type Ref } from "vue";
import type { TranslateFn } from "@/locales/types";
import type {
  DiagramDto,
  LibraryExportBundle,
  SectionDto,
} from "@/constants/diagram-library";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import { loadCustomSnippets, replaceCustomSnippets } from "@/storage/snippets";
import {
  loadAllDiagramDetailsFromCache,
  replaceLocalLibrary,
} from "@/storage/diagram-store";
import {
  AppBackupFormatError,
  applyBackupSettings,
  buildAppBackup,
  diffBackupDiagrams,
  diffBackupSnippets,
  downloadAppBackup,
  mergeSelectedSnippets,
  parseAppBackup,
  type AppBackupFile,
  type AppBackupRestoreMode,
  type DiagramBackupDiff,
  type SnippetBackupDiff,
} from "@/utils/app-backup";
import type { LibraryTab } from "./useLibraryBrowseFlow";

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;

export function useLibraryTransferHandlers(options: {
  library: DiagramLibrary;
  activeTab: Ref<LibraryTab>;
  uploadError: Ref<string>;
  resetBrowseFlow: () => void;
  t: TranslateFn;
}) {
  const { library, activeTab, uploadError, resetBrowseFlow, t } = options;

  const transferSections = ref<SectionDto[]>([]);
  const transferDiagrams = ref<DiagramDto[]>([]);
  const serverTransferSections = ref<SectionDto[]>([]);
  const serverTransferDiagrams = ref<DiagramDto[]>([]);
  const importBundle = ref<LibraryExportBundle | null>(null);
  const pendingRestore = ref<AppBackupFile | null>(null);
  const syncBackup = ref<AppBackupFile | null>(null);
  const syncDiagramDiffs = ref<DiagramBackupDiff[]>([]);
  const syncSnippetDiffs = ref<SnippetBackupDiff[]>([]);
  const backupError = ref("");
  const isTransferProcessing = ref(false);

  const canSyncOnline = computed(() => Boolean(getLibraryApiBaseUrl()));

  async function loadTransferData(): Promise<void> {
    const data = await library.loadTransferData();
    transferSections.value = data.sections;
    transferDiagrams.value = data.diagrams;

    if (canSyncOnline.value) {
      const serverData = await library.loadServerTransferData();
      serverTransferSections.value = serverData.sections;
      serverTransferDiagrams.value = serverData.diagrams;
    } else {
      serverTransferSections.value = [];
      serverTransferDiagrams.value = [];
    }
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

  async function onPushToServer(payload: {
    sectionIds: Set<string>;
    diagramIds: Set<string>;
  }): Promise<void> {
    isTransferProcessing.value = true;
    uploadError.value = "";
    try {
      await library.pushSelectionToServer(
        payload.sectionIds,
        payload.diagramIds,
      );
      await loadTransferData();
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.syncPushError");
    } finally {
      isTransferProcessing.value = false;
    }
  }

  async function onPullFromServer(payload: {
    sectionIds: Set<string>;
    diagramIds: Set<string>;
  }): Promise<void> {
    isTransferProcessing.value = true;
    uploadError.value = "";
    try {
      await library.pullSelectionFromServer(
        payload.sectionIds,
        payload.diagramIds,
      );
      await loadTransferData();
      activeTab.value = "browse";
      resetBrowseFlow();
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.syncPullError");
    } finally {
      isTransferProcessing.value = false;
    }
  }

  function backupErrorMessage(error: unknown): string {
    if (error instanceof AppBackupFormatError) {
      return t("library.backupErrorInvalid");
    }
    return t("library.backupErrorRead");
  }

  async function refreshSyncDiffs(): Promise<void> {
    const backup = syncBackup.value;
    if (!backup) {
      syncDiagramDiffs.value = [];
      syncSnippetDiffs.value = [];
      return;
    }

    const localDiagrams = await loadAllDiagramDetailsFromCache();
    syncDiagramDiffs.value = diffBackupDiagrams(
      localDiagrams,
      backup.library.diagrams,
    );
    syncSnippetDiffs.value = diffBackupSnippets(
      loadCustomSnippets(),
      backup.snippets,
    );
  }

  async function onSaveBackup(): Promise<void> {
    isTransferProcessing.value = true;
    backupError.value = "";
    try {
      downloadAppBackup(await buildAppBackup());
    } catch (error) {
      backupError.value = backupErrorMessage(error);
    } finally {
      isTransferProcessing.value = false;
    }
  }

  async function onRestoreFile(file: File): Promise<void> {
    backupError.value = "";
    try {
      pendingRestore.value = parseAppBackup(await file.text());
      syncBackup.value = null;
      syncDiagramDiffs.value = [];
      syncSnippetDiffs.value = [];
    } catch (error) {
      pendingRestore.value = null;
      backupError.value = backupErrorMessage(error);
    }
  }

  function onRestoreCancel(): void {
    pendingRestore.value = null;
  }

  async function onRestoreConfirm(mode: AppBackupRestoreMode): Promise<void> {
    const backup = pendingRestore.value;
    if (!backup) {
      return;
    }

    isTransferProcessing.value = true;
    backupError.value = "";
    try {
      if (mode === "save-and-replace") {
        downloadAppBackup(await buildAppBackup());
      }
      await replaceLocalLibrary(backup.library.sections, backup.library.diagrams);
      replaceCustomSnippets(backup.snippets);
      applyBackupSettings(backup.settings);
      window.location.reload();
    } catch (error) {
      backupError.value = backupErrorMessage(error);
      isTransferProcessing.value = false;
    }
  }

  async function onSyncFile(file: File): Promise<void> {
    backupError.value = "";
    try {
      syncBackup.value = parseAppBackup(await file.text());
      pendingRestore.value = null;
      await refreshSyncDiffs();
    } catch (error) {
      syncBackup.value = null;
      syncDiagramDiffs.value = [];
      syncSnippetDiffs.value = [];
      backupError.value = backupErrorMessage(error);
    }
  }

  async function onSyncApply(payload: {
    diagramIds: Set<string>;
    snippetIds: Set<string>;
  }): Promise<void> {
    const backup = syncBackup.value;
    if (!backup) {
      return;
    }
    if (payload.diagramIds.size === 0 && payload.snippetIds.size === 0) {
      return;
    }

    isTransferProcessing.value = true;
    backupError.value = "";
    try {
      if (payload.diagramIds.size > 0) {
        await library.copyBackupDiagramsIntoLibrary(
          backup.library.sections,
          backup.library.diagrams,
          payload.diagramIds,
        );
        await loadTransferData();
      }
      if (payload.snippetIds.size > 0) {
        replaceCustomSnippets(
          mergeSelectedSnippets(
            loadCustomSnippets(),
            backup.snippets,
            payload.snippetIds,
          ),
        );
      }
      await refreshSyncDiffs();
    } catch (error) {
      backupError.value = backupErrorMessage(error);
    } finally {
      isTransferProcessing.value = false;
    }
  }

  function resetImportBundle(): void {
    importBundle.value = null;
    pendingRestore.value = null;
    syncBackup.value = null;
    syncDiagramDiffs.value = [];
    syncSnippetDiffs.value = [];
    backupError.value = "";
  }

  return {
    transferSections,
    transferDiagrams,
    serverTransferSections,
    serverTransferDiagrams,
    canSyncOnline,
    importBundle,
    pendingRestore,
    syncBackup,
    syncDiagramDiffs,
    syncSnippetDiffs,
    backupError,
    isTransferProcessing,
    loadTransferData,
    onExportSelection,
    onImportFile,
    onImportSelection,
    onPushToServer,
    onPullFromServer,
    onSaveBackup,
    onRestoreFile,
    onRestoreCancel,
    onRestoreConfirm,
    onSyncFile,
    onSyncApply,
    resetImportBundle,
  };
}
