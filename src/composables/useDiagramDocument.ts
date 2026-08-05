import { computed, ref, type Ref } from "vue";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import { savePumlSource, resolvePumlFileName } from "@/utils/puml-files";
import {
  consumeSharedLaunch,
  setupLaunchQueue,
} from "@/composables/usePumlShare";

export interface UseDiagramDocumentOptions {
  source: Ref<string>;
  error: Ref<string>;
  syntaxErrorLines: Ref<number[]>;
  persistSettings: () => void;
  scheduleRender: () => void;
  clearHistory: () => void;
}

export function useDiagramDocument(options: UseDiagramDocumentOptions) {
  const { source, error, syntaxErrorLines, persistSettings, scheduleRender, clearHistory } =
    options;
  const { prompt } = useAppDialog();
  const { t } = useLocale();

  const loadedFileName = ref("diagram.puml");
  const canSave = computed(() => Boolean(source.value.trim()));

  function applyLoadedSource(content: string, fileName: string): void {
    source.value = content;
    loadedFileName.value = fileName;
    error.value = "";
    syntaxErrorLines.value = [];
    clearHistory();
    persistSettings();
    scheduleRender();
  }

  function onEditorCleared(): void {
    loadedFileName.value = "diagram.puml";
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

  async function savePuml(): Promise<void> {
    if (!canSave.value) {
      return;
    }

    const fileName = await prompt({
      title: t("app.savePuml"),
      message: t("app.fileName"),
      value: loadedFileName.value,
      confirmLabel: t("app.save"),
      placeholder: "diagram.puml",
    });

    if (fileName === null) {
      return;
    }

    const resolvedName = resolvePumlFileName(fileName);
    loadedFileName.value = resolvedName;
    savePumlSource(source.value, resolvedName);
  }

  function onVersionRestore(content: string): void {
    source.value = content;
    syntaxErrorLines.value = [];
    error.value = "";
    persistSettings();
    scheduleRender();
  }

  return {
    loadedFileName,
    canSave,
    applyLoadedSource,
    onEditorCleared,
    initializeIncomingSources,
    savePuml,
    onVersionRestore,
  };
}
