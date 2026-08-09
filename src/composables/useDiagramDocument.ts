import { computed, ref, watch, type Ref } from "vue";
import {
  getDiagramFormatDefinition,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import { extractLeadingMermaidDiagram } from "@/utils/mermaid-source";
import { detectDiagramFormat } from "@/utils/diagram-format";
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

  function applyDiagramFormat(
    content: string,
    fileName: string,
    format?: DiagramFormat,
  ): void {
    diagramFormat.value = format ?? detectDiagramFormat(content, fileName);
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
    persistSettings();
    scheduleRender();
  }

  function onEditorCleared(): void {
    diagramFormat.value = "plantuml";
    loadedFileName.value = getDiagramFormatDefinition("plantuml").defaultFileName;
    syntaxErrorLines.value = [];
    error.value = "";
    clearHistory();
    persistSettings();
    scheduleRender();
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
  }

  function onVersionRestore(content: string): void {
    source.value = content;
    diagramFormat.value = detectDiagramFormat(content, loadedFileName.value);
    syntaxErrorLines.value = [];
    error.value = "";
    persistSettings();
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

    const detected = detectDiagramFormat(source.value, loadedFileName.value);
    if (detected === diagramFormat.value) {
      return;
    }

    diagramFormat.value = detected;
    loadedFileName.value = resolveDiagramFileName(loadedFileName.value, detected);
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

    const detected = detectDiagramFormat(cleaned, loadedFileName.value);
    if (detected === diagramFormat.value) {
      return;
    }

    diagramFormat.value = detected;
    loadedFileName.value = resolveDiagramFileName(loadedFileName.value, detected);
    scheduleRender();
  });

  return {
    loadedFileName,
    canSave,
    applyLoadedSource,
    onEditorCleared,
    initializeIncomingSources,
    prepareRestoredSource,
    savePuml: saveDiagram,
    onVersionRestore,
  };
}
