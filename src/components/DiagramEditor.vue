<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, toRef, watch } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import FileBadgeIcon from "@/components/icons/FileBadgeIcon.vue";
import IconButton from "@/components/IconButton.vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import PanelFullscreenButton from "@/components/PanelFullscreenButton.vue";
import SnippetsPanel from "@/components/SnippetsPanel.vue";
import {
  getSampleDiagramSource,
  isSampleDiagramSource,
  SAMPLE_DIAGRAM_IDS,
  type SampleDiagramId,
} from "@/constants/sample-diagrams";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import type { EditorFontSize } from "@/constants/editor-settings";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";
import {
  loadPumlFromFile,
  PUML_FILE_ACCEPT,
  resolvePumlFileName,
} from "@/utils/puml-files";
import {
  isSnippetsHotkey,
  SNIPPETS_KEYBOARD_SHORTCUT,
} from "@/constants/snippets-settings";
import {
  adjustFoldsAfterSourceChange,
  buildDisplayText,
  buildFoldPlaceholder,
  buildVisibleLines,
  canAddFold,
  createFoldId,
  type CodeFoldRegion,
  type VisibleLine,
  mergeDisplayTextIntoSource,
  mapDisplayOffsetToSourceOffset,
  mapSourceOffsetToDisplayOffset,
} from "@/utils/code-folds";
import { renderHighlightedLine } from "@/utils/plantuml-highlight";
import { useEditorAutocomplete } from "@/composables/useEditorAutocomplete";
import type { CompletionKind } from "@/utils/plantuml-autocomplete";

const EDITOR_LINE_HEIGHT = 1.45;
const FOLD_TOGGLE_WIDTH = "14px";
const EDITOR_PADDING = "12px";
const GUTTER_PADDING_INLINE = "6px";

const source = defineModel<string>({ required: true });

const props = defineProps<{
  errorLines?: number[];
  editorFontSize: EditorFontSize;
  editorFontFamily: string;
  canSave: boolean;
  isValidating: boolean;
  isRendering: boolean;
}>();

const emit = defineEmits<{
  fileLoaded: [payload: { content: string; fileName: string }];
  importError: [message: string];
  savePuml: [];
  openVersions: [];
  validateSyntax: [];
  cleared: [];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const gutterRef = ref<HTMLDivElement | null>(null);
const highlightsRef = ref<HTMLDivElement | null>(null);
const isDragOver = ref(false);
const isFullscreen = ref(false);
const snippetsOpen = ref(false);
const folds = ref<CodeFoldRegion[]>([]);
const foldDragStart = ref<number | null>(null);
const foldDragEnd = ref<number | null>(null);

const { confirm } = useAppDialog();
const { t, locale } = useLocale();

const autocomplete = useEditorAutocomplete({
  source,
  folds,
  textareaRef,
  editorFontSize: toRef(props, "editorFontSize"),
});

function completionKindLabel(kind: CompletionKind): string {
  return t(`editor.completion.${kind}`);
}

const sampleOptions = computed(() =>
  SAMPLE_DIAGRAM_IDS.map((id) => ({
    id,
    label: t(`samples.${id}`),
    source: getSampleDiagramSource(id, locale.value),
  })),
);

const gutterDigitCount = computed(() => String(lineCount.value).length);

const editorStyle = computed(() => ({
  "--editor-font-size": props.editorFontSize,
  "--editor-font-family": props.editorFontFamily,
  "--editor-line-height": String(EDITOR_LINE_HEIGHT),
  "--editor-padding": EDITOR_PADDING,
  "--gutter-chars": String(gutterDigitCount.value),
  "--gutter-padding-inline": GUTTER_PADDING_INLINE,
  "--fold-toggle-width": FOLD_TOGGLE_WIDTH,
}));

const sourceLines = computed(() => source.value.split(/\r?\n/));

const lineCount = computed(() => Math.max(sourceLines.value.length, 1));

const displayText = computed(() =>
  buildDisplayText(sourceLines.value, folds.value),
);

const visibleLines = computed(() =>
  buildVisibleLines(lineCount.value, folds.value),
);

const foldsByStartLine = computed(() => {
  const map = new Map<number, CodeFoldRegion>();

  for (const fold of folds.value) {
    map.set(fold.startLine, fold);
  }

  return map;
});

interface GutterRow {
  key: string;
  sourceLine: number;
  lineNumber: number | null;
  visibleLine: VisibleLine;
  fold: CodeFoldRegion | null;
}

const gutterRows = computed<GutterRow[]>(() =>
  visibleLines.value.map((visibleLine, index) => ({
    key: `${visibleLine.kind}-${visibleLine.sourceLine}-${index}`,
    sourceLine: visibleLine.sourceLine,
    lineNumber:
      visibleLine.kind === "source" ? visibleLine.sourceLine : null,
    visibleLine,
    fold:
      visibleLine.kind === "source"
        ? (foldsByStartLine.value.get(visibleLine.sourceLine) ?? null)
        : null,
  })),
);

const visibleEditorLines = computed(() =>
  visibleLines.value.map((item, index) => {
    const rawLine =
      item.kind === "placeholder"
        ? ""
        : (sourceLines.value[item.sourceLine - 1] ?? "");
    const text =
      item.kind === "placeholder"
        ? buildFoldPlaceholder(item.hiddenLineCount ?? 0)
        : rawLine || " ";

    return {
      key: `${item.kind}-${item.sourceLine}-${index}`,
      kind: item.kind,
      sourceLine: item.sourceLine,
      text,
      html:
        item.kind === "placeholder"
          ? undefined
          : renderHighlightedLine(rawLine || " "),
    };
  }),
);

const errorLineSet = computed(() => new Set(props.errorLines ?? []));

const canClear = computed(() => Boolean(source.value.trim()));

const validateLabel = computed(() =>
  props.isValidating ? t("editor.validating") : t("editor.validate"),
);

async function requestClear(): Promise<void> {
  if (!canClear.value) {
    return;
  }

  if (isSampleDiagramSource(source.value)) {
    clearEditor();
    return;
  }

  const confirmed = await confirm({
    title: t("editor.clearTitle"),
    message: t("editor.clearMessage"),
    confirmLabel: t("editor.clear"),
    variant: "danger",
  });

  if (confirmed) {
    clearEditor();
  }
}

function clearEditor(): void {
  source.value = "";
  folds.value = [];
  emit("cleared");
}

function resetFolds(): void {
  folds.value = [];
}

function loadSample(id: SampleDiagramId): void {
  const sample = getSampleDiagramSource(id, locale.value);
  resetFolds();
  source.value = sample;
  emit("fileLoaded", {
    content: sample,
    fileName: resolvePumlFileName(`${t(`samples.${id}`)}.puml`),
  });
}

function openFilePicker(): void {
  fileInputRef.value?.click();
}

async function handleSelectedFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";

  if (!file) {
    return;
  }

  await importFile(file);
}

async function importFile(file: File): Promise<void> {
  try {
    const loaded = await loadPumlFromFile(file);
    resetFolds();
    source.value = loaded.content;
    emit("fileLoaded", loaded);
  } catch (importError) {
    emit(
      "importError",
      resolveLocalizedErrorMessage(importError, t, "file.openFailed"),
    );
  }
}

function onDragOver(event: DragEvent): void {
  event.preventDefault();
  isDragOver.value = true;
}

function onDragLeave(): void {
  isDragOver.value = false;
}

async function onDrop(event: DragEvent): Promise<void> {
  event.preventDefault();
  isDragOver.value = false;

  const file = event.dataTransfer?.files?.[0];
  if (!file) {
    return;
  }

  await importFile(file);
}

function syncScroll(): void {
  const textarea = textareaRef.value;
  if (!textarea) {
    return;
  }

  if (gutterRef.value) {
    gutterRef.value.scrollTop = textarea.scrollTop;
  }

  if (highlightsRef.value) {
    highlightsRef.value.scrollTop = textarea.scrollTop;
    highlightsRef.value.scrollLeft = textarea.scrollLeft;
  }

  if (autocomplete.isOpen.value) {
    autocomplete.refresh();
  }
}

function onDisplayInput(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;
  source.value = mergeDisplayTextIntoSource(
    textarea.value,
    source.value,
    folds.value,
  );
  void nextTick(() => {
    autocomplete.refresh();
  });
}

function onTextareaKeydown(event: KeyboardEvent): void {
  if (autocomplete.handleKeydown(event)) {
    return;
  }

  if (isSnippetsHotkey(event)) {
    event.preventDefault();
    snippetsOpen.value = !snippetsOpen.value;
  }
}

function onTextareaKeyup(event: KeyboardEvent): void {
  if (
    event.key === "ArrowLeft" ||
    event.key === "ArrowRight" ||
    event.key === "ArrowUp" ||
    event.key === "ArrowDown" ||
    event.key === "Home" ||
    event.key === "End"
  ) {
    autocomplete.refresh();
  }
}

function onTextareaClick(): void {
  autocomplete.refresh();
}

function onTextareaBlur(): void {
  autocomplete.close();
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

function toggleFullscreen(): void {
  isFullscreen.value = !isFullscreen.value;
}

function toggleSnippetsPanel(): void {
  snippetsOpen.value = !snippetsOpen.value;
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

  const nextSource = before + snippetText + after;
  source.value = nextSource;

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

function onSnippetInsert(content: string): void {
  insertSnippetAtCursor(content);
}

function onEditorKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && isFullscreen.value) {
    isFullscreen.value = false;
    return;
  }
}

watch(isFullscreen, (value) => {
  document.body.style.overflow = value ? "hidden" : "";
});

onMounted(() => {
  window.addEventListener("keydown", onEditorKeydown);
  document.addEventListener("mouseup", finishFoldDrag);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onEditorKeydown);
  document.removeEventListener("mouseup", finishFoldDrag);
  document.body.style.overflow = "";
});

watch(
  () => source.value,
  (newSource, oldSource) => {
    const newLines = newSource.split(/\r?\n/);
    const oldLines = (oldSource ?? "").split(/\r?\n/);

    if (newLines.length !== oldLines.length) {
      folds.value = adjustFoldsAfterSourceChange(
        folds.value,
        oldLines,
        newLines,
      );
    }

    void nextTick(() => {
      syncScroll();
    });
  },
);
</script>

<template>
  <section
    class="panel editor-panel"
    :class="{ 'is-fullscreen': isFullscreen }"
    :style="editorStyle"
  >
    <header class="panel-header">
      <h2 class="panel-title" :title="t('editor.titleTooltip')">{{ t("editor.title") }}</h2>
      <div class="panel-header__toolbar">
        <IconButton :label="t('editor.openPuml')" @click="openFilePicker">
          <ActionIcon name="folder-open" />
        </IconButton>
        <IconButton
          :label="t('editor.versions')"
          @click="emit('openVersions')"
        >
          <ActionIcon name="history" />
        </IconButton>
        <IconButton
          :label="t('app.savePuml')"
          primary
          format
          :disabled="!canSave"
          @click="emit('savePuml')"
        >
          <FileBadgeIcon format="PUML" />
        </IconButton>
        <IconButton
          :label="validateLabel"
          :disabled="isValidating || isRendering"
          @click="emit('validateSyntax')"
        >
          <ActionIcon name="check" />
        </IconButton>
        <IconButton
          :label="t('editor.clear')"
          :disabled="!canClear"
          @click="requestClear"
        >
          <ActionIcon name="trash" />
        </IconButton>
        <IconButton
          :label="`${t('editor.snippets')} (${SNIPPETS_KEYBOARD_SHORTCUT})`"
          :pressed="snippetsOpen"
          @click="toggleSnippetsPanel"
        >
          <ActionIcon name="snippets" />
        </IconButton>
        <TooltipWrap :label="t('editor.samplesTooltip')">
          <label class="sample-select-wrap">
            <span class="sr-only">{{ t("editor.sampleOption") }}</span>
            <select
              class="select sample-select"
              :title="t('editor.samplesTooltip')"
              @change="loadSample(($event.target as HTMLSelectElement).value as SampleDiagramId)"
            >
              <option value="" selected disabled>{{ t("editor.samples") }}</option>
              <option
                v-for="sample in sampleOptions"
                :key="sample.id"
                :value="sample.id"
              >
                {{ sample.label }}
              </option>
            </select>
          </label>
        </TooltipWrap>
      </div>
      <PanelFullscreenButton :active="isFullscreen" @toggle="toggleFullscreen" />
    </header>

    <div
      class="panel-body editor-dropzone"
      :class="{ 'is-drag-over': isDragOver }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <input
        ref="fileInputRef"
        class="sr-only"
        type="file"
        :accept="PUML_FILE_ACCEPT"
        @change="handleSelectedFile"
      />

      <div class="code-editor">
        <div
          ref="gutterRef"
          class="code-editor__gutter"
          :title="t('editor.foldCreate')"
          aria-hidden="true"
        >
          <div
            v-for="row in gutterRows"
            :key="row.key"
            class="code-editor__gutter-line"
            :class="{
              'is-fold-selection': isLineInFoldSelection(row.sourceLine),
              'is-placeholder': row.visibleLine.kind === 'placeholder',
            }"
            @mousedown="onGutterMouseDown(row.sourceLine, $event)"
            @mouseenter="onGutterMouseEnter(row.sourceLine)"
          >
            <button
              v-if="row.fold"
              type="button"
              class="code-editor__fold-toggle"
              :title="
                row.fold.collapsed
                  ? `${t('editor.foldToggle')} · ${t('editor.foldRemove')}`
                  : `${t('editor.foldToggle')} · ${t('editor.foldRemove')}`
              "
              :aria-label="t('editor.foldToggle')"
              @mousedown.stop
              @mouseup.stop
              @click.stop="onFoldToggleClick(row.fold, $event)"
              @contextmenu.prevent="removeFold(row.fold.id, $event)"
            >
              {{ row.fold.collapsed ? "\u25B6" : "\u25BC" }}
            </button>
            <span v-else class="code-editor__fold-spacer" aria-hidden="true" />
            <span class="code-editor__gutter-number">
              <template v-if="row.lineNumber !== null">
                {{ row.lineNumber }}
              </template>
              <template v-else>⋯</template>
            </span>
          </div>
        </div>

        <div class="code-editor__input-wrap">
          <div
            ref="highlightsRef"
            class="code-editor__highlights"
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
                v-if="line.html"
                class="code-editor__line-content"
                v-html="line.html"
              />
              <template v-else>{{ line.text }}</template>
            </div>
          </div>
          <textarea
            ref="textareaRef"
            :value="displayText"
            class="code-editor__textarea"
            wrap="off"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            :placeholder="t('editor.placeholder')"
            @input="onDisplayInput"
            @keydown="onTextareaKeydown"
            @keyup="onTextareaKeyup"
            @click="onTextareaClick"
            @blur="onTextareaBlur"
            @scroll="syncScroll"
          />
          <ul
            v-if="autocomplete.isOpen.value && autocomplete.hasSuggestions.value"
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
              <span
                v-if="item.detailKey"
                class="code-editor__completion-detail"
              >
                {{ t(item.detailKey) }}
              </span>
              <span v-else class="code-editor__completion-detail">
                {{ completionKindLabel(item.kind) }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <p class="drop-hint">{{ t("editor.dropHint") }}</p>
    </div>

    <SnippetsPanel
      :open="snippetsOpen"
      @close="snippetsOpen = false"
      @insert="onSnippetInsert"
    />
  </section>
</template>

<style scoped>
.sample-select-wrap {
  display: inline-flex;
  flex: 1 1 auto;
  min-width: 96px;
  margin: 0;
}

.sample-select {
  width: 100%;
  min-width: 0;
  height: 32px;
  min-height: 32px;
  padding: 0 8px;
  font-size: 0.78rem;
}

.editor-dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.editor-dropzone.is-drag-over .code-editor {
  outline: 2px solid color-mix(in srgb, var(--accent) 35%, transparent);
}

.code-editor {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex: 1;
  min-height: 200px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
}

.code-editor__gutter,
.code-editor__highlights,
.code-editor__textarea {
  box-sizing: border-box;
  margin: 0;
  padding: var(--editor-padding);
  border: 0;
  font-family: var(--editor-font-family, var(--font-mono));
  font-size: var(--editor-font-size);
  line-height: var(--editor-line-height);
  tab-size: 2;
  white-space: pre;
  overflow: auto;
}

.code-editor__gutter {
  flex: 0 0 auto;
  align-self: stretch;
  width: calc(
    var(--fold-toggle-width) + var(--gutter-chars) * 1ch +
      var(--gutter-padding-inline) * 2 + 4px
  );
  min-height: 0;
  padding-block: var(--editor-padding);
  padding-inline: var(--gutter-padding-inline);
  border-right: 1px solid var(--border);
  background: var(--surface-muted);
  color: var(--text-muted);
  overflow: hidden;
  user-select: none;
}

.code-editor__gutter-line {
  display: flex;
  align-items: baseline;
  gap: 2px;
  min-height: calc(1em * var(--editor-line-height));
  white-space: pre;
  cursor: default;
}

.code-editor__gutter-line.is-fold-selection {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
}

.code-editor__gutter-line.is-placeholder {
  color: color-mix(in srgb, var(--text-muted) 80%, var(--accent));
}

.code-editor__fold-toggle {
  flex: 0 0 var(--fold-toggle-width);
  width: var(--fold-toggle-width);
  height: 1em;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  line-height: inherit;
  cursor: pointer;
}

.code-editor__fold-toggle:hover {
  color: var(--text);
}

.code-editor__fold-spacer {
  flex: 0 0 var(--fold-toggle-width);
  width: var(--fold-toggle-width);
}

.code-editor__gutter-number {
  flex: 1 1 auto;
  text-align: right;
  font-family: var(--editor-font-family, var(--font-mono));
  font-size: var(--editor-font-size);
  line-height: var(--editor-line-height);
}

.code-editor__input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.code-editor__highlights {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: transparent;
}

.code-editor__line {
  display: block;
  white-space: pre;
}

.code-editor__line.is-error {
  background: color-mix(in srgb, var(--danger) 14%, transparent);
}

.code-editor__line.is-fold-placeholder {
  color: var(--text-muted);
  background: color-mix(in srgb, var(--surface-muted) 70%, transparent);
}

.code-editor__textarea {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: var(--text);
}

.code-editor__textarea::selection {
  background: color-mix(in srgb, var(--accent) 28%, transparent);
}

.code-editor__completions {
  position: absolute;
  z-index: 3;
  min-width: 180px;
  max-width: min(360px, 100%);
  max-height: 220px;
  margin: 0;
  padding: 4px;
  list-style: none;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.code-editor__completion-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-family: var(--editor-font-family, var(--font-mono));
  font-size: calc(var(--editor-font-size) * 0.92);
  line-height: 1.35;
}

.code-editor__completion-item.is-active,
.code-editor__completion-item:hover {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}

.code-editor__completion-label {
  color: var(--text);
  white-space: nowrap;
}

.code-editor__completion-detail {
  color: var(--text-muted);
  font-size: 0.82em;
  white-space: nowrap;
}

.code-editor__completion-item.is-kind-context .code-editor__completion-label {
  color: var(--accent);
  font-weight: 600;
}

.drop-hint {
  flex-shrink: 0;
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
