<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useLocale } from "@/composables/useLocale";
import type { VisibleEditorLine } from "@/composables/editor/useEditorDisplayModel";
import type { useEditorAutocomplete } from "@/composables/useEditorAutocomplete";
import type { CompletionKind } from "@/utils/plantuml-autocomplete";
import type { CodeFoldRegion } from "@/utils/code-folds";
import { mergeDisplayTextIntoSource } from "@/utils/code-folds";
import { isSnippetsHotkey } from "@/constants/snippets-settings";

const props = defineProps<{
  source: string;
  folds: CodeFoldRegion[];
  displayText: string;
  visibleEditorLines: VisibleEditorLine[];
  syntaxHighlightEnabled: boolean;
  autocompleteEnabled: boolean;
  readOnly: boolean;
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

function onTextareaKeydown(event: KeyboardEvent): void {
  if (props.autocomplete.handleKeydown(event)) {
    return;
  }

  if (isSnippetsHotkey(event)) {
    event.preventDefault();
    emit("toggleSnippets");
  }
}

function onTextareaKeyup(event: KeyboardEvent): void {
  emit("select");
  if (
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    event.key === "ArrowUp" ||
    event.key === "ArrowDown" ||
    event.key === "Home" ||
    event.key === "End"
  ) {
    props.autocomplete.refresh();
  }
}

function onTextareaClick(): void {
  emit("select");
  props.autocomplete.refresh();
}

function onTextareaBlur(): void {
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
          'is-fold-placeholder': line.kind === 'placeholder',
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
      :placeholder="readOnly ? t('editor.placeholderViewOnly') : t('editor.placeholder')"
      @input="onDisplayInput"
      @keydown="onTextareaKeydown"
      @keyup="onTextareaKeyup"
      @click="onTextareaClick"
      @blur="onTextareaBlur"
      @scroll="onTextareaScroll"
      @select="emit('select')"
      @mouseup="emit('mouseup')"
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
