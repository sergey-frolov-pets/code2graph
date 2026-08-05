import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import {
  adjustFoldsAfterSourceChange,
  canAddBookmark,
  canAddFold,
  canAddRegion,
  createFoldId,
  isBookmark,
  normalizeLineRange,
  sortRegions,
  type CodeFoldRegion,
  mapDisplayOffsetToSourceOffset,
  mapSourceOffsetToDisplayOffset,
} from "@/utils/code-folds";
import { EDITOR_LINE_HEIGHT } from "@/composables/editor/useEditorDisplayModel";

export function useCodeFolds(options: {
  source: Ref<string>;
  textareaRef: Ref<HTMLTextAreaElement | null>;
  syncScroll: () => void;
}) {
  const { source, textareaRef, syncScroll } = options;

  const folds = ref<CodeFoldRegion[]>([]);
  const foldDragStart = ref<number | null>(null);
  const foldDragEnd = ref<number | null>(null);
  const regionsModalOpen = ref(false);

  const sortedRegions = computed(() => sortRegions(folds.value));

  const lineCount = computed(() =>
    Math.max(source.value.split(/\r?\n/).length, 1),
  );

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
    if (regionsModalOpen.value || event.button !== 0 || event.shiftKey) {
      return;
    }

    event.preventDefault();
    foldDragStart.value = sourceLine;
    foldDragEnd.value = sourceLine;
  }

  function onGutterMouseEnter(sourceLine: number): void {
    if (regionsModalOpen.value || foldDragStart.value === null) {
      return;
    }

    foldDragEnd.value = sourceLine;
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
    if (isBookmark(fold)) {
      scrollToSourceLine(fold.startLine);
      return;
    }

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

  function removeFold(foldId: string, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    folds.value = folds.value.filter((fold) => fold.id !== foldId);
  }

  function onFoldToggleClick(fold: CodeFoldRegion, event: MouseEvent): void {
    if (event.shiftKey) {
      removeFold(fold.id, event);
      return;
    }

    toggleFold(fold);
  }

  function addRegion(payload: {
    fromLine: number;
    toLine: number | null;
    label?: string;
  }): boolean {
    const trimmedLabel = payload.label?.trim();
    const label = trimmedLabel ? trimmedLabel : undefined;

    if (
      !canAddRegion(
        folds.value,
        payload.fromLine,
        payload.toLine,
        lineCount.value,
      )
    ) {
      return false;
    }

    if (payload.toLine === null) {
      folds.value = [
        ...folds.value,
        {
          id: createFoldId(),
          startLine: payload.fromLine,
          endLine: payload.fromLine,
          collapsed: false,
          label,
        },
      ];
      return true;
    }

    const { startLine, endLine } = normalizeLineRange(
      payload.fromLine,
      payload.toLine,
    );

    if (isBookmark({ startLine, endLine })) {
      folds.value = [
        ...folds.value,
        {
          id: createFoldId(),
          startLine,
          endLine,
          collapsed: false,
          label,
        },
      ];
      return true;
    }

    folds.value = [
      ...folds.value,
      {
        id: createFoldId(),
        startLine,
        endLine,
        collapsed: true,
        label,
      },
    ];
    return true;
  }

  function scrollToSourceLine(lineNumber: number): void {
    const textarea = textareaRef.value;
    if (!textarea) {
      return;
    }

    const sourceLines = source.value.split(/\r?\n/);
    const targetLine = Math.min(Math.max(lineNumber, 1), sourceLines.length);
    const lineStartOffset = sourceLines
      .slice(0, targetLine - 1)
      .reduce((offset, line) => offset + line.length + 1, 0);

    const displayOffset = mapSourceOffsetToDisplayOffset(
      lineStartOffset,
      source.value,
      folds.value,
    );

    const computedStyle = getComputedStyle(textarea);
    const fontSize = Number.parseFloat(computedStyle.fontSize);
    const paddingTop = Number.parseFloat(computedStyle.paddingTop);
    const lineHeight = fontSize * EDITOR_LINE_HEIGHT;
    const displayTextBefore = source.value.slice(0, displayOffset);
    const displayLineIndex = displayTextBefore.split(/\r?\n/).length - 1;

    textarea.scrollTop = Math.max(
      0,
      displayLineIndex * lineHeight - textarea.clientHeight / 3 + paddingTop,
    );
    textarea.setSelectionRange(displayOffset, displayOffset);
    textarea.focus();
    syncScroll();
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

    folds.value = folds.value.filter(
      (fold) =>
        fold.startLine >= 1 &&
        fold.endLine >= 1 &&
        fold.startLine <= newLines.length &&
        fold.endLine <= newLines.length,
    );
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
    sortedRegions,
    lineCount,
    regionsModalOpen,
    resetFolds,
    isLineInFoldSelection,
    onGutterMouseDown,
    onGutterMouseEnter,
    onFoldToggleClick,
    removeFold,
    addRegion,
    scrollToSourceLine,
    adjustFoldsForSourceChange,
    canAddRegion: (
      fromLine: number,
      toLine: number | null,
    ) => canAddRegion(folds.value, fromLine, toLine, lineCount.value),
    canAddBookmark: (line: number) =>
      canAddBookmark(folds.value, line, lineCount.value),
  };
}
