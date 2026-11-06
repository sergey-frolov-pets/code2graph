import { computed, ref } from "vue";
import type { DiagramFormat } from "@/constants/diagram-formats";

export interface EditorHistoryEntry {
  before: string;
  after: string;
  beforeFormat?: DiagramFormat;
  afterFormat?: DiagramFormat;
  label: string;
  timestamp: number;
}

export interface EditorHistorySnapshot {
  source: string;
  format?: DiagramFormat;
}

export const MIN_EDITOR_HISTORY_ENTRIES = 10;
const MAX_EDITOR_HISTORY_ENTRIES = 50;

interface DocumentHistoryStacks {
  undo: EditorHistoryEntry[];
  redo: EditorHistoryEntry[];
}

const DEFAULT_DOCUMENT_ID = "current";
const activeDocumentId = ref(DEFAULT_DOCUMENT_ID);
const stacks = ref<Record<string, DocumentHistoryStacks>>({});

function stacksFor(documentId: string): DocumentHistoryStacks {
  const existing = stacks.value[documentId];
  if (existing) {
    return existing;
  }

  const created: DocumentHistoryStacks = { undo: [], redo: [] };
  stacks.value = {
    ...stacks.value,
    [documentId]: created,
  };
  return created;
}

export function useEditorHistory() {
  const activeUndo = computed(
    () => stacks.value[activeDocumentId.value]?.undo ?? [],
  );
  const activeRedo = computed(
    () => stacks.value[activeDocumentId.value]?.redo ?? [],
  );
  const canUndo = computed(() => activeUndo.value.length > 0);
  const canRedo = computed(() => activeRedo.value.length > 0);
  const lastUndoLabel = computed(() => activeUndo.value.at(-1)?.label ?? "");
  const lastRedoLabel = computed(() => activeRedo.value.at(-1)?.label ?? "");

  function setActiveDocument(documentId: string): void {
    if (!documentId || documentId === activeDocumentId.value) {
      return;
    }

    const previousId = activeDocumentId.value;
    activeDocumentId.value = documentId;

    const previous = stacks.value[previousId];
    const destination = stacks.value[documentId];
    const adoptBootHistory =
      previousId === DEFAULT_DOCUMENT_ID &&
      previous !== undefined &&
      (previous.undo.length > 0 || previous.redo.length > 0) &&
      destination === undefined;

    if (!adoptBootHistory) {
      stacksFor(documentId);
      return;
    }

    const next = { ...stacks.value, [documentId]: previous };
    delete next[DEFAULT_DOCUMENT_ID];
    stacks.value = next;
  }

  function forgetDocument(documentId: string): void {
    if (!stacks.value[documentId]) {
      return;
    }

    const next = { ...stacks.value };
    delete next[documentId];
    stacks.value = next;
  }

  function pushHistoryEntry(
    entry: Pick<
      EditorHistoryEntry,
      "before" | "after" | "label" | "beforeFormat" | "afterFormat"
    >,
  ): void {
    const documentStacks = stacksFor(activeDocumentId.value);
    documentStacks.undo = [
      ...documentStacks.undo,
      {
        ...entry,
        timestamp: Date.now(),
      },
    ].slice(-Math.max(MIN_EDITOR_HISTORY_ENTRIES, MAX_EDITOR_HISTORY_ENTRIES));
    documentStacks.redo = [];
  }

  function undo(
    currentSource: string,
    currentFormat?: DiagramFormat,
  ): EditorHistorySnapshot | null {
    const entry = stacksFor(activeDocumentId.value).undo.at(-1);
    if (!entry) {
      return null;
    }

    if (currentSource !== entry.after) {
      return null;
    }

    if (
      entry.afterFormat !== undefined &&
      currentFormat !== undefined &&
      currentFormat !== entry.afterFormat
    ) {
      return null;
    }

    const documentStacks = stacksFor(activeDocumentId.value);
    documentStacks.undo = documentStacks.undo.slice(0, -1);
    documentStacks.redo = [
      ...documentStacks.redo,
      {
        before: entry.before,
        after: entry.after,
        beforeFormat: entry.beforeFormat,
        afterFormat: entry.afterFormat,
        label: entry.label,
        timestamp: Date.now(),
      },
    ];

    return {
      source: entry.before,
      format: entry.beforeFormat,
    };
  }

  function redo(
    currentSource: string,
    currentFormat?: DiagramFormat,
  ): EditorHistorySnapshot | null {
    const entry = stacksFor(activeDocumentId.value).redo.at(-1);
    if (!entry) {
      return null;
    }

    if (currentSource !== entry.before) {
      return null;
    }

    if (
      entry.beforeFormat !== undefined &&
      currentFormat !== undefined &&
      currentFormat !== entry.beforeFormat
    ) {
      return null;
    }

    const documentStacks = stacksFor(activeDocumentId.value);
    documentStacks.redo = documentStacks.redo.slice(0, -1);
    documentStacks.undo = [
      ...documentStacks.undo,
      {
        before: entry.before,
        after: entry.after,
        beforeFormat: entry.beforeFormat,
        afterFormat: entry.afterFormat,
        label: entry.label,
        timestamp: Date.now(),
      },
    ];

    return {
      source: entry.after,
      format: entry.afterFormat,
    };
  }

  function clearHistory(): void {
    const documentStacks = stacksFor(activeDocumentId.value);
    documentStacks.undo = [];
    documentStacks.redo = [];
  }

  return {
    canUndo,
    canRedo,
    lastUndoLabel,
    lastRedoLabel,
    setActiveDocument,
    forgetDocument,
    pushHistoryEntry,
    undo,
    redo,
    clearHistory,
  };
}
