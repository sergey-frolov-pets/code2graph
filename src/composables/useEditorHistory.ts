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

const MAX_EDITOR_HISTORY_ENTRIES = 50;

const undoStack = ref<EditorHistoryEntry[]>([]);
const redoStack = ref<EditorHistoryEntry[]>([]);

export function useEditorHistory() {
  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);
  const lastUndoLabel = computed(() => undoStack.value.at(-1)?.label ?? "");
  const lastRedoLabel = computed(() => redoStack.value.at(-1)?.label ?? "");

  function pushHistoryEntry(
    entry: Pick<
      EditorHistoryEntry,
      "before" | "after" | "label" | "beforeFormat" | "afterFormat"
    >,
  ): void {
    undoStack.value = [
      ...undoStack.value,
      {
        ...entry,
        timestamp: Date.now(),
      },
    ].slice(-MAX_EDITOR_HISTORY_ENTRIES);

    redoStack.value = [];
  }

  function undo(
    currentSource: string,
    currentFormat?: DiagramFormat,
  ): EditorHistorySnapshot | null {
    const entry = undoStack.value.at(-1);
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

    undoStack.value = undoStack.value.slice(0, -1);
    redoStack.value = [
      ...redoStack.value,
      {
        before: entry.after,
        after: entry.before,
        beforeFormat: entry.afterFormat,
        afterFormat: entry.beforeFormat,
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
    const entry = redoStack.value.at(-1);
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

    redoStack.value = redoStack.value.slice(0, -1);
    undoStack.value = [
      ...undoStack.value,
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
    undoStack.value = [];
    redoStack.value = [];
  }

  return {
    canUndo,
    canRedo,
    lastUndoLabel,
    lastRedoLabel,
    pushHistoryEntry,
    undo,
    redo,
    clearHistory,
  };
}
