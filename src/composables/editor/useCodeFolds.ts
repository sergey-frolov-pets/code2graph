import { nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import {
  adjustFoldsAfterSourceChange,
  canAddFold,
  createFoldId,
  type CodeFoldRegion,
  mapDisplayOffsetToSourceOffset,
  mapSourceOffsetToDisplayOffset,
} from "@/utils/code-folds";

export function useCodeFolds(options: {
  source: Ref<string>;
  textareaRef: Ref<HTMLTextAreaElement | null>;
  syncScroll: () => void;
}) {
  const { source, textareaRef, syncScroll } = options;

  const folds = ref<CodeFoldRegion[]>([]);
  const foldDragStart = ref<number | null>(null);
  const foldDragEnd = ref<number | null>(null);

  function resetFolds(): void {
    folds.value = [];
  }

  function isLineInFoldSelection(sourceLine: number): boolean {
    if (foldDragStart.value === null || foldDragEnd.value === null) {
      return false;
    }

    const start = Math.min(foldDragStart.value, foldDragEnd.value);
    const end = Math.max(foldDragStart.value, foldDragEnd.value);

    return sourceLine >= start && sourceLine <= end;
  }

  function onGutterMouseDown(sourceLine: number, event: MouseEvent): void {
    if (event.button !== 0 || event.shiftKey) {
      return;
    }

    event.preventDefault();
    foldDragStart.value = sourceLine;
    foldDragEnd.value = sourceLine;
  }

  function onGutterMouseEnter(sourceLine: number): void {
    if (foldDragStart.value !== null) {
      foldDragEnd.value = sourceLine;
    }
  }

  function finishFoldDrag(): void {
    if (foldDragStart.value === null || foldDragEnd.value === null) {
      foldDragStart.value = null;
      foldDragEnd.value = null;
      return;
    }

    const start = Math.min(foldDragStart.value, foldDragEnd.value);
    const end = Math.max(foldDragStart.value, foldDragEnd.value);

    if (end > start && canAddFold(folds.value, start, end)) {
      folds.value = [
        ...folds.value,
        {
          id: createFoldId(),
          startLine: start,
          endLine: end,
          collapsed: true,
        },
      ];
    }

    foldDragStart.value = null;
    foldDragEnd.value = null;
  }

  function toggleFold(fold: CodeFoldRegion): void {
    const textarea = textareaRef.value;
    const sourceCursor = textarea
      ? mapDisplayOffsetToSourceOffset(
          textarea.selectionStart,
          source.value,
          folds.value,
        )
      : source.value.length;

    folds.value = folds.value.map((entry) =>
      entry.id === fold.id ? { ...entry, collapsed: !entry.collapsed } : entry,
    );

    void nextTick(() => {
      if (!textareaRef.value) {
        return;
      }

      const displayCursor = mapSourceOffsetToDisplayOffset(
        sourceCursor,
        source.value,
        folds.value,
      );
      textareaRef.value.setSelectionRange(displayCursor, displayCursor);
      syncScroll();
    });
  }

  function removeFold(foldId: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    folds.value = folds.value.filter((fold) => fold.id !== foldId);
  }

  function onFoldToggleClick(fold: CodeFoldRegion, event: MouseEvent): void {
    if (event.shiftKey) {
      removeFold(fold.id, event);
      return;
    }

    toggleFold(fold);
  }

  function adjustFoldsForSourceChange(
    newSource: string,
    oldSource: string | undefined,
  ): void {
    const newLines = newSource.split(/\r?\n/);
    const oldLines = (oldSource ?? "").split(/\r?\n/);

    if (newLines.length !== oldLines.length) {
      folds.value = adjustFoldsAfterSourceChange(
        folds.value,
        oldLines,
        newLines,
      );
    }
  }

  onMounted(() => {
    document.addEventListener("mouseup", finishFoldDrag);
  });

  onUnmounted(() => {
    document.removeEventListener("mouseup", finishFoldDrag);
  });

  watch(
    () => source.value,
    (newSource, oldSource) => {
      adjustFoldsForSourceChange(newSource, oldSource);
      void nextTick(syncScroll);
    },
  );

  return {
    folds,
    resetFolds,
    isLineInFoldSelection,
    onGutterMouseDown,
    onGutterMouseEnter,
    onFoldToggleClick,
    removeFold,
    adjustFoldsForSourceChange,
  };
}
