import { computed, ref, watch, type Ref } from "vue";
import {
  detectFormatFromFileName,
  getDiagramFormatDefinition,
  isDiagramFormat,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import {
  STORAGE_KEY_DIAGRAM_FORMAT,
  STORAGE_KEY_FILE_NAME,
} from "@/constants";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import { readStorageItem, writeStorageItem } from "@/core/safe-storage";
import { extractLeadingMermaidDiagram } from "@/utils/mermaid-source";
import {
  detectDiagramFormat,
  detectDiagramFormatFromSource,
} from "@/utils/diagram-format";
import {
  resolveDiagramFileName,
  saveDiagramSource,
} from "@/utils/diagram-files";
import {
  consumeSharedLaunch,
  setupLaunchQueue,
} from "@/composables/usePumlShare";

export interface UseDiagramDocumentOptions {
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  error: Ref<string>;
  syntaxErrorLines: Ref<number[]>;
  persistSettings: () => void;
  scheduleRender: () => void;
  clearHistory: () => void;
}

function readPersistedDiagramFormat(): DiagramFormat | null {
  const saved = readStorageItem(STORAGE_KEY_DIAGRAM_FORMAT);
  if (saved && isDiagramFormat(saved)) {
    return saved;
  }

  return null;
}

function readPersistedFileName(): string | null {
  const saved = readStorageItem(STORAGE_KEY_FILE_NAME);
  return saved?.trim() ? saved : null;
}

function reconcileDiagramFormat(
  content: string,
  fileName: string,
  currentFormat: DiagramFormat,
): DiagramFormat {
  const fromSource = detectDiagramFormatFromSource(content);
  if (fromSource) {
    return fromSource;
  }

  const fromFileName = detectFormatFromFileName(fileName);
  if (fromFileName === "mermaid" || fromFileName === "graphml") {
    return fromFileName;
  }

  return currentFormat;
}

export function useDiagramDocument(options: UseDiagramDocumentOptions) {
  const {
    source,
    diagramFormat,
    error,
    syntaxErrorLines,
    persistSettings,
    scheduleRender,
    clearHistory,
  } = options;
  const { prompt } = useAppDialog();
  const { t } = useLocale();

  const loadedFileName = ref("diagram.puml");
  const canSave = computed(() => {
    const definition = getDiagramFormatDefinition(diagramFormat.value);
    return Boolean(source.value.trim()) && definition.supportsSaveSource;
  });

  function persistDocumentMetadata(): void {
    writeStorageItem(STORAGE_KEY_DIAGRAM_FORMAT, diagramFormat.value);
    writeStorageItem(STORAGE_KEY_FILE_NAME, loadedFileName.value);
  }

  function persistAll(): void {
    persistSettings();
    persistDocumentMetadata();
  }

  function applyDiagramFormat(
    content: string,
    fileName: string,
    format?: DiagramFormat,
  ): void {
    diagramFormat.value =
      format ?? detectDiagramFormat(content, fileName);
    loadedFileName.value = resolveDiagramFileName(
      fileName,
      diagramFormat.value,
    );
  }

  function applyLoadedSource(
    content: string,
    fileName: string,
    format?: DiagramFormat,
  ): void {
    source.value = content;
    applyDiagramFormat(content, fileName, format);
    error.value = "";
    syntaxErrorLines.value = [];
    clearHistory();
    persistAll();
    scheduleRender();
  }

  function onEditorCleared(): void {
    diagramFormat.value = "plantuml";
    loadedFileName.value = getDiagramFormatDefinition("plantuml").defaultFileName;
    syntaxErrorLines.value = [];
    error.value = "";
    clearHistory();
    persistAll();
    scheduleRender();
  }

  function restoreDocumentMetadata(): void {
    const savedFormat = readPersistedDiagramFormat();
    const savedFileName = readPersistedFileName();

    if (savedFormat) {
      diagramFormat.value = savedFormat;
    }

    if (savedFileName) {
      loadedFileName.value = resolveDiagramFileName(
        savedFileName,
        diagramFormat.value,
      );
    }
  }

  async function initializeIncomingSources(): Promise<void> {
    setupLaunchQueue((payload) => {
      applyLoadedSource(payload.content, payload.fileName);
    });

    const shared = await consumeSharedLaunch();
    if (shared) {
      applyLoadedSource(shared.content, shared.fileName);
    }
  }

  async function saveDiagram(): Promise<void> {
    if (!canSave.value) {
      return;
    }

    const definition = getDiagramFormatDefinition(diagramFormat.value);
    const fileName = await prompt({
      title: t("app.saveDiagram"),
      message: t("app.fileName"),
      value: loadedFileName.value,
      confirmLabel: t("app.save"),
      placeholder: definition.defaultFileName,
    });

    if (fileName === null) {
      return;
    }

    const resolvedName = resolveDiagramFileName(fileName, diagramFormat.value);
    loadedFileName.value = resolvedName;
    saveDiagramSource(source.value, resolvedName, diagramFormat.value);
    persistDocumentMetadata();
  }

  function onVersionRestore(content: string): void {
    source.value = content;
    diagramFormat.value = reconcileDiagramFormat(
      content,
      loadedFileName.value,
      diagramFormat.value,
    );
    loadedFileName.value = resolveDiagramFileName(
      loadedFileName.value,
      diagramFormat.value,
    );
    syntaxErrorLines.value = [];
    error.value = "";
    persistAll();
    scheduleRender();
  }

  function prepareRestoredSource(): void {
    const content = source.value;
    if (!content.trim()) {
      return;
    }

    const cleaned = extractLeadingMermaidDiagram(content);
    if (cleaned !== content) {
      source.value = cleaned;
    }

    const reconciled = reconcileDiagramFormat(
      source.value,
      loadedFileName.value,
      diagramFormat.value,
    );
    if (reconciled !== diagramFormat.value) {
      diagramFormat.value = reconciled;
    }

    loadedFileName.value = resolveDiagramFileName(
      loadedFileName.value,
      diagramFormat.value,
    );
    persistDocumentMetadata();
  }

  watch(source, (content) => {
    if (!content.trim()) {
      return;
    }

    const cleaned = extractLeadingMermaidDiagram(content);
    if (cleaned !== content) {
      source.value = cleaned;
      return;
    }

    const fromSource = detectDiagramFormatFromSource(cleaned);
    if (!fromSource || fromSource === diagramFormat.value) {
      return;
    }

    diagramFormat.value = fromSource;
    loadedFileName.value = resolveDiagramFileName(
      loadedFileName.value,
      fromSource,
    );
    scheduleRender();
  });

  watch([diagramFormat, loadedFileName], () => {
    persistDocumentMetadata();
  });

  return {
    loadedFileName,
    canSave,
    applyLoadedSource,
    onEditorCleared,
    initializeIncomingSources,
    restoreDocumentMetadata,
    prepareRestoredSource,
    savePuml: saveDiagram,
    onVersionRestore,
  };
}
