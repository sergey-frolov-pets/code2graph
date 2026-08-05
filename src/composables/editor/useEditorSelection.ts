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
  onAiPatch: (payload: { start: number; end: number }) => void;
}) {
  const { source, folds, textareaRef, displayText, syncScroll, onAiPatch } =
    options;

  const selectionStart = ref(0);
  const selectionEnd = ref(0);

  const hasTextSelection = computed(
    () => selectionEnd.value > selectionStart.value,
  );

  function updateSelectionState(): void {
    const textarea = textareaRef.value;
    if (!textarea) {
      selectionStart.value = 0;
      selectionEnd.value = 0;
      return;
    }

    selectionStart.value = textarea.selectionStart;
    selectionEnd.value = textarea.selectionEnd;
  }

  function requestAiPatch(): void {
    updateSelectionState();
    if (!hasTextSelection.value) {
      return;
    }

    onAiPatch({
      start: selectionStart.value,
      end: selectionEnd.value,
    });
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

  return {
    hasTextSelection,
    updateSelectionState,
    requestAiPatch,
    insertSnippetAtCursor,
  };
}
