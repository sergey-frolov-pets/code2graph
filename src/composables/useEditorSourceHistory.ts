import { onUnmounted, watch, type ComputedRef, type Ref } from "vue";
import type { DiagramFormat } from "@/constants/diagram-formats";

const SOURCE_HISTORY_DEBOUNCE_MS = 400;

export interface UseEditorSourceHistoryOptions {
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  pushHistoryEntry: (entry: {
    before: string;
    after: string;
    label: string;
  }) => void;
  historyEditLabel: ComputedRef<string>;
  isSuppressed: Ref<boolean>;
}

export function useEditorSourceHistory(
  options: UseEditorSourceHistoryOptions,
): {
  flushPendingHistory: () => void;
  cancelPendingHistory: () => void;
} {
  const {
    source,
    pushHistoryEntry,
    historyEditLabel,
    isSuppressed,
  } = options;

  let pendingBefore: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function flushPendingHistory(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (pendingBefore === null || isSuppressed.value) {
      pendingBefore = null;
      return;
    }

    const before = pendingBefore;
    const after = source.value;
    pendingBefore = null;

    if (before === after) {
      return;
    }

    pushHistoryEntry({
      before,
      after,
      label: historyEditLabel.value,
    });
  }

  function cancelPendingHistory(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    pendingBefore = null;
  }

  function scheduleFlush(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      flushPendingHistory();
    }, SOURCE_HISTORY_DEBOUNCE_MS);
  }

  watch(
    () => source.value,
    (_newValue, oldValue) => {
      if (isSuppressed.value) {
        pendingBefore = null;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        return;
      }

      if (pendingBefore === null) {
        pendingBefore = oldValue;
      }

      scheduleFlush();
    },
  );

  onUnmounted(() => {
    flushPendingHistory();
  });

  return {
    flushPendingHistory,
    cancelPendingHistory,
  };
}
