import { computed, ref, type Ref } from "vue";
import {
  getDefaultFileNameForSample,
  getSampleSource,
  isSampleDiagramSource,
  type SampleSelection,
} from "@/constants/sample-diagrams";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";
import { loadDiagramFromFile, resolveDiagramFileName } from "@/utils/diagram-files";

export function useEditorFileImport(options: {
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  resetFolds: () => void;
  onFileLoaded: (payload: {
    content: string;
    fileName: string;
    format: DiagramFormat;
  }) => void;
  onImportError: (message: string) => void;
  onCleared: () => void;
}) {
  const { source, diagramFormat, resetFolds, onFileLoaded, onImportError, onCleared } =
    options;

  const { confirm } = useAppDialog();
  const { t, locale } = useLocale();

  const fileInputRef = ref<HTMLInputElement | null>(null);
  const isDragOver = ref(false);

  const canClear = computed(() => Boolean(source.value.trim()));

  function openFilePicker(): void {
    fileInputRef.value?.click();
  }

  async function importFile(file: File): Promise<void> {
    try {
      const loaded = await loadDiagramFromFile(file);
      resetFolds();
      source.value = loaded.content;
      diagramFormat.value = loaded.format;
      onFileLoaded(loaded);
    } catch (importError) {
      onImportError(
        resolveLocalizedErrorMessage(importError, t, "file.openFailed"),
      );
    }
  }

  async function handleSelectedFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    await importFile(file);
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    isDragOver.value = true;
  }

  function onDragLeave(): void {
    isDragOver.value = false;
  }

  async function onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    isDragOver.value = false;

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    await importFile(file);
  }

  function loadSample(selection: SampleSelection): void {
    const sample = getSampleSource(selection, locale.value);
    const labelKey =
      selection.format === "mermaid"
        ? `samples.mermaid.${selection.id}`
        : `samples.plantuml.${selection.id}`;

    resetFolds();
    source.value = sample;
    diagramFormat.value = selection.format;
    onFileLoaded({
      content: sample,
      fileName: resolveDiagramFileName(
        getDefaultFileNameForSample(selection, t(labelKey)),
        selection.format,
      ),
      format: selection.format,
    });
  }

  function clearEditor(): void {
    source.value = "";
    diagramFormat.value = "plantuml";
    resetFolds();
    onCleared();
  }

  async function requestClear(): Promise<void> {
    if (!canClear.value) {
      return;
    }

    if (isSampleDiagramSource(source.value)) {
      clearEditor();
      return;
    }

    const confirmed = await confirm({
      title: t("editor.clearTitle"),
      message: t("editor.clearMessage"),
      confirmLabel: t("editor.clear"),
      variant: "danger",
    });

    if (confirmed) {
      clearEditor();
    }
  }

  return {
    fileInputRef,
    isDragOver,
    canClear,
    openFilePicker,
    handleSelectedFile,
    onDragOver,
    onDragLeave,
    onDrop,
    loadSample,
    requestClear,
  };
}
