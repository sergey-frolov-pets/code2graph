<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import EditorColorPopover from "@/components/editor/EditorColorPopover.vue";
import { useLocale } from "@/composables/useLocale";
import type { VisibleEditorLine } from "@/composables/editor/useEditorDisplayModel";
import type { useEditorAutocomplete } from "@/composables/useEditorAutocomplete";
import type { CompletionKind } from "@/utils/completion-types";
import type { CodeFoldRegion } from "@/utils/code-folds";
import {
  mapSourceOffsetToDisplayOffset,
  mergeDisplayTextIntoSource,
} from "@/utils/code-folds";
import { applyDisplayedEditorTab } from "@/utils/editor-indent";
import { isSnippetsHotkey } from "@/constants/snippets-settings";
import { getLanguageModule } from "@/languages/registry";
import { detectDiagramFormat } from "@/utils/diagram-format";
import { applyEnterAtLineEnd } from "@/utils/editor-enter-indent";
import { findHexColorAt } from "@/utils/editor-color-token";

const props = defineProps<{
  source: string;
  folds: CodeFoldRegion[];
  displayText: string;
  visibleEditorLines: VisibleEditorLine[];
  useLineVirtualization: boolean;
  syntaxHighlightEnabled: boolean;
  autocompleteEnabled: boolean;
  readOnly: boolean;
  placeholder?: string;
  errorLines: number[];
  autocomplete: ReturnType<typeof useEditorAutocomplete>;
}>();

const emit = defineEmits<{
  "update:source": [value: string];
  scroll: [];
  select: [];
  mouseup: [];
  toggleSnippets: [];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const highlightsRef = ref<HTMLDivElement | null>(null);
const colorEdit = ref<{
  start: number;
  end: number;
  hex: string;
  top: number;
  left: number;
} | null>(null);

defineExpose({
  get textareaEl() {
    return textareaRef.value;
  },
  get highlightsEl() {
    return highlightsRef.value;
  },
});

const { t } = useLocale();

const errorLineSet = computed(() => new Set(props.errorLines));

function completionKindLabel(kind: CompletionKind): string {
  return t(`editor.completion.${kind}`);
}

function onPaste(event: ClipboardEvent): void {
  const pasted = event.clipboardData?.getData("text/plain") ?? "";
  if (!pasted.trim()) {
    return;
  }

  const textarea = textareaRef.value;
  if (!textarea) {
    return;
  }

  const pastedFormat = detectDiagramFormat(pasted);
  const currentFormat = detectDiagramFormat(props.source);
  const hasFullSelection =
    textarea.selectionStart === 0 &&
    textarea.selectionEnd >= props.source.length;

  if (
    pastedFormat !== currentFormat &&
    getLanguageModule(pastedFormat).isCompleteSource(pasted) &&
    !hasFullSelection
  ) {
    event.preventDefault();
    emit("update:source", pasted.trim());
    void nextTick(() => {
      props.autocomplete.refresh();
    });
  }
}

function onDisplayInput(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;
  emit(
    "update:source",
    mergeDisplayTextIntoSource(textarea.value, props.source, props.folds),
  );
  void nextTick(() => {
    props.autocomplete.refresh();
  });
}

function isPlainTabKey(event: KeyboardEvent): boolean {
  return (
    event.key === "Tab" &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.isComposing
  );
}

function applyTabEdit(outdent: boolean): void {
  const textarea = textareaRef.value;
  if (!textarea) {
    return;
  }

  const edit = applyDisplayedEditorTab({
    source: props.source,
    folds: props.folds,
    displayText: textarea.value,
    selectionStart: textarea.selectionStart,
    selectionEnd: textarea.selectionEnd,
    outdent,
  });

  if (!edit) {
    return;
  }

  if (edit.source !== props.source) {
    emit("update:source", edit.source);
  }

  void nextTick(() => {
    const current = textareaRef.value;
    if (!current) {
      return;
    }

    current.focus();
    current.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    emit("select");
    props.autocomplete.refresh();
  });
}

function onTextareaKeydown(event: KeyboardEvent): void {
  if (props.autocomplete.handleKeydown(event)) {
    return;
  }

  if (isPlainTabKey(event)) {
    if (props.readOnly) {
      return;
    }

    event.preventDefault();
    applyTabEdit(event.shiftKey);
    return;
  }

  if (isSnippetsHotkey(event)) {
    event.preventDefault();
    emit("toggleSnippets");
    return;
  }

  tryContinueIndentOnEnter(event);
}

function tryContinueIndentOnEnter(event: KeyboardEvent): void {
  if (!isPlainEnter(event) || props.readOnly) {
    return;
  }

  const textarea = textareaRef.value;
  if (!textarea || textarea.selectionStart !== textarea.selectionEnd) {
    return;
  }

  const edited = applyEnterAtLineEnd(
    textarea.value,
    textarea.selectionStart,
    props.source,
    props.folds,
  );
  if (!edited) {
    return;
  }

  event.preventDefault();
  const sourceCursor = edited.sourceCursor;
  emit("update:source", edited.source);

  void nextTick(() => {
    const el = textareaRef.value;
    if (!el) {
      return;
    }

    const displayCursor = mapSourceOffsetToDisplayOffset(
      sourceCursor,
      props.source,
      props.folds,
    );
    el.focus();
    el.setSelectionRange(displayCursor, displayCursor);
    revealCaret(el, displayCursor);
    props.autocomplete.refresh();
    emit("select");
  });
}

function isPlainEnter(event: KeyboardEvent): boolean {
  return (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing
  );
}

function revealCaret(textarea: HTMLTextAreaElement, caret: number): void {
  const lineIndex = textarea.value.slice(0, caret).split("\n").length - 1;
  const style = getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    return;
  }

  const paddingTop = Number.parseFloat(style.paddingTop);
  const topInset = Number.isFinite(paddingTop) ? paddingTop : 0;
  const caretTop = topInset + lineIndex * lineHeight;
  const caretBottom = caretTop + lineHeight;

  if (caretTop < textarea.scrollTop) {
    textarea.scrollTop = caretTop;
    return;
  }

  if (caretBottom > textarea.scrollTop + textarea.clientHeight) {
    textarea.scrollTop = caretBottom - textarea.clientHeight;
  }
}

function onTextareaKeyup(event: KeyboardEvent): void {
  emit("select");
  const textarea = textareaRef.value;
  const isNav =
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    event.key === "ArrowUp" ||
    event.key === "ArrowDown" ||
    event.key === "Home" ||
    event.key === "End";
  if (!isNav || !textarea) {
    return;
  }

  // Пока тянется выделение, не пересчитываем подсказки: это сбрасывает кадр
  // и Shift+стрелка не успевает дойти до конца строки.
  if (textarea.selectionStart !== textarea.selectionEnd) {
    props.autocomplete.close();
    return;
  }

  props.autocomplete.refresh();
}

function openColorPickerAtCaret(event: MouseEvent): void {
  if (props.readOnly) {
    colorEdit.value = null;
    return;
  }

  const textarea = textareaRef.value;
  if (!textarea || textarea.selectionStart !== textarea.selectionEnd) {
    return;
  }

  const token = findHexColorAt(textarea.value, textarea.selectionStart);
  if (!token) {
    colorEdit.value = null;
    return;
  }

  const margin = 8;
  const width = 240;
  const left = Math.min(event.clientX, window.innerWidth - width - margin);
  const top = Math.min(event.clientY + 12, window.innerHeight - 160);
  colorEdit.value = {
    start: token.start,
    end: token.end,
    hex: token.value,
    top: Math.max(margin, top),
    left: Math.max(margin, left),
  };
}

function applyColorEdit(hex: string): void {
  const edit = colorEdit.value;
  const textarea = textareaRef.value;
  if (!edit || !textarea) {
    colorEdit.value = null;
    return;
  }

  const next = `${textarea.value.slice(0, edit.start)}${hex}${textarea.value.slice(edit.end)}`;
  colorEdit.value = null;
  emit(
    "update:source",
    mergeDisplayTextIntoSource(next, props.source, props.folds),
  );
}

function onTextareaClick(event: MouseEvent): void {
  emit("select");
  props.autocomplete.refresh();
  openColorPickerAtCaret(event);
}

function onTextareaBlur(): void {
  emit("select");
  props.autocomplete.close();
}

function onTextareaScroll(): void {
  emit("scroll");
}
</script>

<template>
  <div class="code-editor__input-wrap">
    <div
      ref="highlightsRef"
      class="code-editor__highlights"
      :class="{ 'is-syntax-disabled': !syntaxHighlightEnabled }"
      aria-hidden="true"
    >
      <div
        v-for="line in visibleEditorLines"
        :key="line.key"
        class="code-editor__line"
        :class="{
          'is-error':
            line.kind === 'source' && errorLineSet.has(line.sourceLine),
          'is-session-deleted': line.sessionRole === 'deleted',
          'is-fold-placeholder': line.kind === 'placeholder',
          'editor-virtual-line': useLineVirtualization,
        }"
      >
        <span
          v-if="syntaxHighlightEnabled && line.html"
          class="code-editor__line-content"
          v-html="line.html"
        />
        <template v-else-if="syntaxHighlightEnabled">{{ line.text }}</template>
        <span
          v-else-if="line.kind === 'placeholder'"
          class="code-editor__line-spacer"
        >
          {{ line.text }}
        </span>
        <span v-else class="code-editor__line-spacer" aria-hidden="true"> </span>
      </div>
    </div>
    <textarea
      ref="textareaRef"
      :value="displayText"
      class="code-editor__textarea"
      :class="{
        'is-plain-text': !syntaxHighlightEnabled,
        'is-read-only': readOnly,
      }"
      wrap="off"
      spellcheck="false"
      autocomplete="off"
      autocapitalize="off"
      :readonly="readOnly"
      :placeholder="
        placeholder ??
        (readOnly ? t('editor.placeholderViewOnly') : t('editor.placeholder'))
      "
      @input="onDisplayInput"
      @paste="onPaste"
      @keydown="onTextareaKeydown"
      @keyup="onTextareaKeyup"
      @click="onTextareaClick"
      @blur="onTextareaBlur"
      @scroll="onTextareaScroll"
      @select="emit('select')"
      @mouseup="emit('mouseup')"
    />
    <EditorColorPopover
      v-if="colorEdit"
      :hex="colorEdit.hex"
      :top="colorEdit.top"
      :left="colorEdit.left"
      @apply="applyColorEdit"
      @cancel="colorEdit = null"
    />
    <ul
      v-if="
        autocompleteEnabled &&
        autocomplete.isOpen.value &&
        autocomplete.hasSuggestions.value
      "
      class="code-editor__completions"
      role="listbox"
      :style="{
        top: `${autocomplete.caretCoords.value.top}px`,
        left: `${autocomplete.caretCoords.value.left}px`,
      }"
    >
      <li
        v-for="(item, index) in autocomplete.suggestions.value"
        :key="`${item.label}-${index}`"
        class="code-editor__completion-item"
        :class="{
          'is-active': index === autocomplete.activeIndex.value,
          [`is-kind-${item.kind}`]: true,
        }"
        role="option"
        :aria-selected="index === autocomplete.activeIndex.value"
        @mousedown.prevent="autocomplete.selectIndex(index)"
      >
        <span class="code-editor__completion-label">{{ item.label }}</span>
        <span v-if="item.detailKey" class="code-editor__completion-detail">
          {{ t(item.detailKey) }}
        </span>
        <span v-else class="code-editor__completion-detail">
          {{ completionKindLabel(item.kind) }}
        </span>
      </li>
    </ul>
  </div>
</template>
