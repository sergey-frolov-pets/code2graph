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
    beforeFormat?: DiagramFormat;
    afterFormat?: DiagramFormat;
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
    diagramFormat,
    pushHistoryEntry,
    historyEditLabel,
    isSuppressed,
  } = options;

  let pendingBefore: string | null = null;
  let pendingBeforeFormat: DiagramFormat | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function flushPendingHistory(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (pendingBefore === null || isSuppressed.value) {
      pendingBefore = null;
      pendingBeforeFormat = null;
      return;
    }

    const before = pendingBefore;
    const beforeFormat = pendingBeforeFormat ?? diagramFormat.value;
    const after = source.value;
    const afterFormat = diagramFormat.value;
    pendingBefore = null;
    pendingBeforeFormat = null;

    if (before === after && beforeFormat === afterFormat) {
      return;
    }

    pushHistoryEntry({
      before,
      after,
      label: historyEditLabel.value,
      ...(beforeFormat === afterFormat
        ? {}
        : { beforeFormat, afterFormat }),
    });
  }

  function cancelPendingHistory(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    pendingBefore = null;
    pendingBeforeFormat = null;
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
        pendingBeforeFormat = null;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        return;
      }

      if (pendingBefore === null) {
        pendingBefore = oldValue;
        pendingBeforeFormat = diagramFormat.value;
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
