import { computed, nextTick, ref, type ComputedRef, type Ref } from "vue";
import type { CodeFoldRegion } from "@/utils/code-folds";
import {
  mapDisplayOffsetToSourceOffset,
  mapSourceOffsetToDisplayOffset,
} from "@/utils/code-folds";

export function useEditorSelection(options: {
  source: Ref<string>;
  folds: Ref<CodeFoldRegion[]>;
  textareaRef: Ref<HTMLTextAreaElement | null>;
  displayText: ComputedRef<string>;
  syncScroll: () => void;
}) {
  const { source, folds, textareaRef, displayText, syncScroll } = options;

  const selectionStart = ref(0);
  const selectionEnd = ref(0);

  const hasTextSelection = computed(
    () => selectionEnd.value > selectionStart.value,
  );

  function mapDisplaySelectionToSource(
    displayStart: number,
    displayEnd: number,
  ): { start: number; end: number } {
    return {
      start: mapDisplayOffsetToSourceOffset(
        displayStart,
        source.value,
        folds.value,
      ),
      end: mapDisplayOffsetToSourceOffset(
        displayEnd,
        source.value,
        folds.value,
      ),
    };
  }

  function updateSelectionState(): void {
    const textarea = textareaRef.value;
    if (!textarea) {
      selectionStart.value = 0;
      selectionEnd.value = 0;
      return;
    }

    const mapped = mapDisplaySelectionToSource(
      textarea.selectionStart,
      textarea.selectionEnd,
    );
    selectionStart.value = mapped.start;
    selectionEnd.value = mapped.end;
  }

  function insertSnippetAtCursor(content: string): void {
    const textarea = textareaRef.value;
    const trimmed = content.trimEnd();
    if (!trimmed) {
      return;
    }

    const displayStart = textarea?.selectionStart ?? displayText.value.length;
    const displayEnd = textarea?.selectionEnd ?? displayText.value.length;
    const start = mapDisplayOffsetToSourceOffset(
      displayStart,
      source.value,
      folds.value,
    );
    const end = mapDisplayOffsetToSourceOffset(
      displayEnd,
      source.value,
      folds.value,
    );
    const before = source.value.slice(0, start);
    const after = source.value.slice(end);

    const needsLeadingNewline =
      before.length > 0 && !before.endsWith("\n") && !trimmed.startsWith("@");
    const needsTrailingNewline =
      after.length > 0 && !after.startsWith("\n") && !trimmed.endsWith("\n");
    const snippetText =
      (needsLeadingNewline ? "\n" : "") +
      trimmed +
      (trimmed.endsWith("\n") ? "" : "\n") +
      (needsTrailingNewline ? "" : "");

    source.value = before + snippetText + after;

    const sourceCursor = before.length + snippetText.length;
    void nextTick(() => {
      if (!textareaRef.value) {
        return;
      }

      const displayCursor = mapSourceOffsetToDisplayOffset(
        sourceCursor,
        source.value,
        folds.value,
      );
      textareaRef.value.focus();
      textareaRef.value.setSelectionRange(displayCursor, displayCursor);
      syncScroll();
    });
  }

  function getCaretOffsetInSource(): number | undefined {
    const textarea = textareaRef.value;
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      return undefined;
    }

    const textareaFocused =
      textarea !== null && document.activeElement === textarea;
    if (textareaFocused && textarea) {
      return mapDisplayOffsetToSourceOffset(
        textarea.selectionStart,
        source.value,
        folds.value,
      );
    }

    if (selectionStart.value === selectionEnd.value) {
      return selectionStart.value;
    }

    return undefined;
  }

  function getSelectionRangeInSource(): { start: number; end: number } {
    const textarea = textareaRef.value;
    if (textarea) {
      const liveDisplayStart = textarea.selectionStart;
      const liveDisplayEnd = textarea.selectionEnd;
      if (liveDisplayEnd > liveDisplayStart) {
        return mapDisplaySelectionToSource(liveDisplayStart, liveDisplayEnd);
      }
    }
    if (selectionEnd.value > selectionStart.value) {
      return { start: selectionStart.value, end: selectionEnd.value };
    }
    return { start: 0, end: 0 };
  }

  return {
    hasTextSelection,
    updateSelectionState,
    insertSnippetAtCursor,
    getCaretOffsetInSource,
    getSelectionRangeInSource,
  };
}
