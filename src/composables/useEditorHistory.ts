import { computed, ref } from "vue";

export interface EditorHistoryEntry {
  before: string;
  after: string;
  label: string;
  timestamp: number;
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
    entry: Pick<EditorHistoryEntry, "before" | "after" | "label">,
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

  function undo(currentSource: string): string | null {
    const entry = undoStack.value.at(-1);
    if (!entry) {
      return null;
    }

    if (currentSource !== entry.after) {
      return null;
    }

    undoStack.value = undoStack.value.slice(0, -1);
    redoStack.value = [
      ...redoStack.value,
      {
        before: entry.after,
        after: entry.before,
        label: entry.label,
        timestamp: Date.now(),
      },
    ];

    return entry.before;
  }

  function redo(currentSource: string): string | null {
    const entry = redoStack.value.at(-1);
    if (!entry) {
      return null;
    }

    if (currentSource !== entry.before) {
      return null;
    }

    redoStack.value = redoStack.value.slice(0, -1);
    undoStack.value = [
      ...undoStack.value,
      {
        before: entry.before,
        after: entry.after,
        label: entry.label,
        timestamp: Date.now(),
      },
    ];

    return entry.after;
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
