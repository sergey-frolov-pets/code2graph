import { computed, nextTick, ref, type Ref } from "vue";
import type { CodeFoldRegion } from "@/utils/code-folds";
import {
  mapDisplayOffsetToSourceOffset,
  mapSourceOffsetToDisplayOffset,
} from "@/utils/code-folds";
import {
  extractWordPrefix,
  getCompletions,
  type CompletionItem,
} from "@/utils/plantuml-autocomplete";

const LINE_HEIGHT_RATIO = 1.45;

export interface CaretCoordinates {
  top: number;
  left: number;
}

export interface CompletionContext {
  sourceLine: number;
  column: number;
  prefix: string;
  replaceStartColumn: number;
}

export function useEditorAutocomplete(options: {
  source: Ref<string>;
  folds: Ref<CodeFoldRegion[]>;
  textareaRef: Ref<HTMLTextAreaElement | null>;
  editorFontSize: Ref<string>;
}) {
  const suggestions = ref<CompletionItem[]>([]);
  const activeIndex = ref(0);
  const isOpen = ref(false);
  const caretCoords = ref<CaretCoordinates>({ top: 0, left: 0 });
  const completionContext = ref<CompletionContext | null>(null);

  const hasSuggestions = computed(() => suggestions.value.length > 0);

  function close(): void {
    isOpen.value = false;
    suggestions.value = [];
    activeIndex.value = 0;
    completionContext.value = null;
  }

  function resolveSourcePosition(displayOffset: number): {
    sourceLine: number;
    column: number;
    lineText: string;
  } {
    const lines = options.source.value.split(/\r?\n/);
    const sourceOffset = mapDisplayOffsetToSourceOffset(
      displayOffset,
      options.source.value,
      options.folds.value,
    );

    let consumed = 0;
    for (let index = 0; index < lines.length; index += 1) {
      const lineLength = lines[index]?.length ?? 0;
      const lineEnd = consumed + lineLength;

      if (sourceOffset <= lineEnd) {
        return {
          sourceLine: index + 1,
          column: sourceOffset - consumed,
          lineText: lines[index] ?? "",
        };
      }

      consumed = lineEnd + 1;
    }

    const lastLine = lines.length;
    return {
      sourceLine: Math.max(lastLine, 1),
      column: lines[lastLine - 1]?.length ?? 0,
      lineText: lines[lastLine - 1] ?? "",
    };
  }

  function measureCaretCoordinates(
    textarea: HTMLTextAreaElement,
    displayOffset: number,
  ): CaretCoordinates {
    const textBefore = textarea.value.slice(0, displayOffset);
    const lines = textBefore.split("\n");
    const lineIndex = Math.max(lines.length - 1, 0);
    const column = lines[lineIndex]?.length ?? 0;
    const style = window.getComputedStyle(textarea);
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const fontSize =
      Number.parseFloat(style.fontSize) ||
      Number.parseFloat(options.editorFontSize.value) ||
      14;
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    let measuredWidth = fontSize * 0.6;
    if (context) {
      context.font = style.font;
      measuredWidth = context.measureText("m").width || measuredWidth;
    }

    return {
      top: paddingTop + (lineIndex + 1) * lineHeight - textarea.scrollTop,
      left: paddingLeft + column * measuredWidth - textarea.scrollLeft,
    };
  }

  function refresh(): void {
    const textarea = options.textareaRef.value;
    if (!textarea || document.activeElement !== textarea) {
      close();
      return;
    }

    const displayOffset = textarea.selectionStart ?? 0;
    const position = resolveSourcePosition(displayOffset);
    const prefix = extractWordPrefix(position.lineText, position.column);

    const items = getCompletions({
      lines: options.source.value.split(/\r?\n/),
      lineNumber: position.sourceLine,
      column: position.column,
      prefix,
    });

    if (items.length === 0) {
      close();
      return;
    }

    suggestions.value = items;
    activeIndex.value = 0;
    completionContext.value = {
      sourceLine: position.sourceLine,
      column: position.column,
      prefix,
      replaceStartColumn: position.column - prefix.length,
    };
    caretCoords.value = measureCaretCoordinates(textarea, displayOffset);
    isOpen.value = true;
  }

  function moveSelection(delta: number): void {
    if (!hasSuggestions.value) {
      return;
    }

    const total = suggestions.value.length;
    activeIndex.value = (activeIndex.value + delta + total) % total;
  }

  function applySelected(): boolean {
    const textarea = options.textareaRef.value;
    const context = completionContext.value;
    const selected = suggestions.value[activeIndex.value];

    if (!textarea || !context || !selected) {
      return false;
    }

    const lines = options.source.value.split(/\r?\n/);
    const lineIndex = context.sourceLine - 1;
    const currentLine = lines[lineIndex] ?? "";
    const before = currentLine.slice(0, context.replaceStartColumn);
    const after = currentLine.slice(context.column);
    lines[lineIndex] = `${before}${selected.insertText}${after}`;
    options.source.value = lines.join("\n");

    const sourceCursor =
      lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length + 1, 0) +
      before.length +
      selected.insertText.length;

    close();

    void nextTick(() => {
      if (!textarea) {
        return;
      }

      const displayCursor = mapSourceOffsetToDisplayOffset(
        sourceCursor,
        options.source.value,
        options.folds.value,
      );
      textarea.focus();
      textarea.setSelectionRange(displayCursor, displayCursor);
    });

    return true;
  }

  function handleKeydown(event: KeyboardEvent): boolean {
    if (!isOpen.value || !hasSuggestions.value) {
      return false;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1);
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1);
      return true;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      return applySelected();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return true;
    }

    return false;
  }

  function selectIndex(index: number): void {
    activeIndex.value = index;
    applySelected();
  }

  return {
    suggestions,
    activeIndex,
    isOpen,
    caretCoords,
    hasSuggestions,
    close,
    refresh,
    handleKeydown,
    selectIndex,
    applySelected,
  };
}
