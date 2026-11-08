import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { parseAppRoute } from "@/router";
import {
  applyTableFromClipboardText,
  type TablePasteErrorInfo,
} from "@/services/table-paste";
import { DATA_LINK_CHANGED_EVENT } from "@/services/local-data-link/constants";
import {
  pickSpreadsheetFile,
  readPermittedFile,
} from "@/services/local-data-link/file-access";
import {
  DataLinkReadError,
  readSpreadsheetFileToTsv,
} from "@/services/local-data-link/read-spreadsheet";
import {
  clearDataLinkSetupHint,
  publishDataLinkSetupHint,
} from "@/services/local-data-link/setup-hint";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";
import { loadDiagramDetailFromCache } from "@/storage/diagram-store";
import {
  findLocalDataLinkBySlug,
  getLocalDataLink,
  saveLocalDataLink,
  type LocalDataLinkRecord,
} from "@/storage/local-data-links";
import type { TranslateFn } from "@/locales/types";

export interface DiagramDataLinkUi {
  chooserOpen: Ref<boolean>;
  filePathLabel: Ref<string>;
  sheetRange: Ref<string>;
  clipboardReady: Ref<boolean>;
  busy: Ref<boolean>;
  errorMessage: Ref<string>;
  canRefresh: Ref<boolean>;
  expandSignal: Ref<number>;
  pasteErrorOpen: Ref<boolean>;
  pasteError: Ref<TablePasteErrorInfo | null>;
  applyFromClipboard: () => Promise<void>;
  applyFromFile: () => Promise<void>;
  closeChooser: () => void;
  closePasteError: () => void;
  refresh: () => Promise<void>;
  openFromHash: () => Promise<void>;
}

function startClipboardRead(): Promise<string | null> {
  if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
    return Promise.resolve(null);
  }
  return navigator.clipboard.readText().then(
    (text) => text,
    () => null,
  );
}

export function createDiagramDataLinkUi(options: {
  t: TranslateFn;
  linkedLibraryDiagramId: Ref<string | null>;
  activeMobilePanel: Ref<"editor" | "preview">;
  openLibraryModal: () => void;
  onFileLoaded: (payload: {
    content: string;
    fileName: string;
    format?: DiagramFormat;
    diagramId?: string;
  }) => void;
}): DiagramDataLinkUi {
  const chooserOpen = ref(false);
  const filePathLabel = ref("");
  const sheetRange = ref("");
  const clipboardReady = ref(false);
  const busy = ref(false);
  const errorMessage = ref("");
  const canRefresh = ref(false);
  const expandSignal = ref(0);
  const pasteErrorOpen = ref(false);
  const pasteError = ref<TablePasteErrorInfo | null>(null);
  let activeLink: LocalDataLinkRecord | null = null;
  let acceptedClipboard = "";
  let requestSerial = 0;

  async function refreshAvailability(): Promise<void> {
    const diagramId = options.linkedLibraryDiagramId.value;
    if (!diagramId) {
      canRefresh.value = false;
      return;
    }
    const link = await getLocalDataLink(diagramId);
    canRefresh.value = Boolean(link);
    if (link && activeLink?.diagramId === link.diagramId) {
      activeLink = link;
    }
  }

  function onLinksChanged(): void {
    void refreshAvailability();
  }

  watch(options.linkedLibraryDiagramId, () => {
    void refreshAvailability();
  });

  function closeChooser(): void {
    if (busy.value) {
      return;
    }
    chooserOpen.value = false;
    errorMessage.value = "";
  }

  function closePasteError(): void {
    pasteErrorOpen.value = false;
    pasteError.value = null;
  }

  function readErrorMessage(error: unknown): string {
    if (error instanceof DataLinkReadError) {
      if (error.code === "bad_range") {
        return options.t("library.dataLink.rangeInvalid");
      }
      if (error.code === "empty") {
        return options.t("library.dataLink.emptyRange");
      }
      if (error.code === "sheet_missing") {
        return options.t("library.dataLink.sheetMissing", {
          sheet: error.sheet ?? "",
        });
      }
    }
    return options.t("library.dataLink.fileReadError");
  }

  async function openChooser(
    link: LocalDataLinkRecord,
    clipboardPromise: Promise<string | null>,
  ): Promise<void> {
    const serial = ++requestSerial;
    activeLink = link;
    filePathLabel.value = link.filePathLabel;
    sheetRange.value = link.sheetRange;
    clipboardReady.value = false;
    acceptedClipboard = "";
    errorMessage.value = "";
    chooserOpen.value = true;

    const diagram = await loadDiagramDetailFromCache(link.diagramId);
    const clipboardText = await clipboardPromise;
    if (serial !== requestSerial || !diagram || !clipboardText?.trim()) {
      return;
    }

    const format = resolveLibraryDiagramFormat(
      diagram.source,
      diagram.fileName,
      diagram.language,
    );
    const result = applyTableFromClipboardText({
      clipboardText,
      source: diagram.source,
      format,
    });
    if (serial !== requestSerial || !result.ok) {
      return;
    }
    acceptedClipboard = clipboardText;
    clipboardReady.value = true;
  }

  async function applyText(text: string): Promise<void> {
    const link = activeLink;
    if (!link) {
      return;
    }
    const diagram = await loadDiagramDetailFromCache(link.diagramId);
    if (!diagram) {
      publishDataLinkSetupHint(link.slug);
      options.openLibraryModal();
      chooserOpen.value = false;
      return;
    }

    const format = resolveLibraryDiagramFormat(
      diagram.source,
      diagram.fileName,
      diagram.language,
    );
    const result = applyTableFromClipboardText({
      clipboardText: text,
      source: diagram.source,
      format,
    });
    if (!result.ok) {
      pasteError.value = result.error;
      pasteErrorOpen.value = true;
      return;
    }

    options.onFileLoaded({
      content: result.fullSource,
      fileName: diagram.fileName,
      format,
      diagramId: diagram.id,
    });
    chooserOpen.value = false;
    errorMessage.value = "";
    expandSignal.value += 1;
    options.activeMobilePanel.value = "preview";
  }

  async function applyFromClipboard(): Promise<void> {
    if (!clipboardReady.value || !acceptedClipboard || busy.value) {
      return;
    }
    busy.value = true;
    try {
      await applyText(acceptedClipboard);
    } finally {
      busy.value = false;
    }
  }

  async function applyFromFile(): Promise<void> {
    const link = activeLink;
    if (!link || busy.value) {
      return;
    }
    busy.value = true;
    errorMessage.value = "";
    try {
      let handle = link.fileHandle;
      let file = handle ? await readPermittedFile(handle) : null;
      if (!file) {
        const picked = await pickSpreadsheetFile(link.fileHandle);
        if (picked.status === "cancelled") {
          return;
        }
        if (picked.status === "unsupported") {
          errorMessage.value = options.t("library.dataLink.pickerUnsupported");
          return;
        }
        handle = picked.handle;
        file = await handle.getFile();
        const next = { ...link, fileHandle: handle, fileName: file.name };
        await saveLocalDataLink(next);
        activeLink = next;
      }
      const tsv = await readSpreadsheetFileToTsv(
        file,
        link.sheetRange,
        link.untilEmptyRow,
      );
      await applyText(tsv);
    } catch (error) {
      errorMessage.value = readErrorMessage(error);
    } finally {
      busy.value = false;
    }
  }

  async function refresh(): Promise<void> {
    const diagramId = options.linkedLibraryDiagramId.value;
    if (!diagramId) {
      return;
    }
    const clipboardPromise = startClipboardRead();
    const link = await getLocalDataLink(diagramId);
    if (!link) {
      canRefresh.value = false;
      return;
    }
    await openChooser(link, clipboardPromise);
  }

  async function openFromHash(): Promise<void> {
    const parsed = parseAppRoute({
      hash: window.location.hash,
      pathname: window.location.pathname,
      search: window.location.search,
    });
    if (parsed.name !== "diagram" || !parsed.diagramSlug) {
      return;
    }
    const clipboardPromise = startClipboardRead();
    const link = await findLocalDataLinkBySlug(parsed.diagramSlug);
    if (!link) {
      publishDataLinkSetupHint(parsed.diagramSlug);
      options.openLibraryModal();
      return;
    }
    const diagram = await loadDiagramDetailFromCache(link.diagramId);
    if (!diagram) {
      publishDataLinkSetupHint(parsed.diagramSlug);
      options.openLibraryModal();
      return;
    }

    clearDataLinkSetupHint();
    const format = resolveLibraryDiagramFormat(
      diagram.source,
      diagram.fileName,
      diagram.language,
    );
    options.onFileLoaded({
      content: diagram.source,
      fileName: diagram.fileName,
      format,
      diagramId: diagram.id,
    });
    canRefresh.value = true;
    await openChooser(link, clipboardPromise);
  }

  function onHashChange(): void {
    void openFromHash();
  }

  onMounted(() => {
    window.addEventListener(DATA_LINK_CHANGED_EVENT, onLinksChanged);
    window.addEventListener("hashchange", onHashChange);
  });
  onUnmounted(() => {
    window.removeEventListener(DATA_LINK_CHANGED_EVENT, onLinksChanged);
    window.removeEventListener("hashchange", onHashChange);
  });

  return {
    chooserOpen,
    filePathLabel,
    sheetRange,
    clipboardReady,
    busy,
    errorMessage,
    canRefresh,
    expandSignal,
    pasteErrorOpen,
    pasteError,
    applyFromClipboard,
    applyFromFile,
    closeChooser,
    closePasteError,
    refresh,
    openFromHash,
  };
}
