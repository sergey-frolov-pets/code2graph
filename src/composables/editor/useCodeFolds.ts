import { computed, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import type { DiagramFormat } from "@/constants/diagram-formats";
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
import {
  applyAutoFoldCollapsedState,
  detectAutoFoldRegions,
  getAutoFoldStateKey,
} from "@/utils/auto-fold-regions";
import { EDITOR_LINE_HEIGHT } from "@/composables/editor/useEditorDisplayModel";

function mergeManualAndAutoFolds(
  manualFolds: CodeFoldRegion[],
  autoFolds: CodeFoldRegion[],
): CodeFoldRegion[] {
  const merged = [...manualFolds];

  for (const autoFold of autoFolds) {
    if (canAddFold(merged, autoFold.startLine, autoFold.endLine)) {
      merged.push(autoFold);
    }
  }

  return sortRegions(merged);
}

export function useCodeFolds(options: {
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  textareaRef: Ref<HTMLTextAreaElement | null>;
  syncScroll: () => void;
}) {
  const { source, diagramFormat, textareaRef, syncScroll } = options;

  const manualFolds = ref<CodeFoldRegion[]>([]);
  const autoFoldCollapsedState = ref(new Map<string, boolean>());
  const foldDragStart = ref<number | null>(null);
  const foldDragEnd = ref<number | null>(null);
  const regionsModalOpen = ref(false);

  const autoFolds = computed(() =>
    applyAutoFoldCollapsedState(
      detectAutoFoldRegions(source.value, diagramFormat.value),
      autoFoldCollapsedState.value,
    ),
  );

  const folds = computed(() =>
    mergeManualAndAutoFolds(manualFolds.value, autoFolds.value),
  );

  const sortedRegions = computed(() => sortRegions(folds.value));

  const lineCount = computed(() =>
    Math.max(source.value.split(/\r?\n/).length, 1),
  );

  function resetFolds(): void {
    manualFolds.value = [];
    autoFoldCollapsedState.value = new Map();
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

    if (end > start && canAddFold(manualFolds.value, start, end)) {
      manualFolds.value = [
        ...manualFolds.value,
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

  function rememberAutoFoldState(fold: CodeFoldRegion, collapsed: boolean): void {
    const nextState = new Map(autoFoldCollapsedState.value);
    nextState.set(getAutoFoldStateKey(fold), collapsed);
    autoFoldCollapsedState.value = nextState;
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

    if (fold.auto) {
      rememberAutoFoldState(fold, !fold.collapsed);
    } else {
      manualFolds.value = manualFolds.value.map((entry) =>
        entry.id === fold.id ? { ...entry, collapsed: !entry.collapsed } : entry,
      );
    }

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
    manualFolds.value = manualFolds.value.filter((fold) => fold.id !== foldId);
  }

  function onFoldToggleClick(fold: CodeFoldRegion, event: MouseEvent): void {
    if (event.shiftKey) {
      if (fold.auto) {
        return;
      }

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
        manualFolds.value,
        payload.fromLine,
        payload.toLine,
        lineCount.value,
      )
    ) {
      return false;
    }

    if (payload.toLine === null) {
      manualFolds.value = [
        ...manualFolds.value,
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
      manualFolds.value = [
        ...manualFolds.value,
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

    manualFolds.value = [
      ...manualFolds.value,
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
      manualFolds.value = adjustFoldsAfterSourceChange(
        manualFolds.value,
        oldLines,
        newLines,
      );
    }

    manualFolds.value = manualFolds.value.filter(
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
    ) => canAddRegion(manualFolds.value, fromLine, toLine, lineCount.value),
    canAddBookmark: (line: number) =>
      canAddBookmark(manualFolds.value, line, lineCount.value),
  };
}
