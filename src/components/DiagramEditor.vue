<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
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

const EDITOR_LINE_HEIGHT = 1.45;
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
  canUndo?: boolean;
  canRedo?: boolean;
}>();

const emit = defineEmits<{
  fileLoaded: [payload: { content: string; fileName: string }];
  importError: [message: string];
  savePuml: [];
  validateSyntax: [];
  cleared: [];
  undo: [];
  redo: [];
  aiPatch: [payload: { start: number; end: number }];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const gutterRef = ref<HTMLTextAreaElement | null>(null);
const highlightsRef = ref<HTMLDivElement | null>(null);
const isDragOver = ref(false);
const isFullscreen = ref(false);
const snippetsOpen = ref(false);
const selectionStart = ref(0);
const selectionEnd = ref(0);

const { confirm } = useAppDialog();
const { t, locale } = useLocale();

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
}));

const sourceLines = computed(() => source.value.split(/\r?\n/));

const lineCount = computed(() => Math.max(sourceLines.value.length, 1));

const lineNumbersText = computed(() =>
  Array.from({ length: lineCount.value }, (_, index) => String(index + 1)).join(
    "\n",
  ),
);

const errorLineSet = computed(() => new Set(props.errorLines ?? []));

const canClear = computed(() => Boolean(source.value.trim()));

const validateLabel = computed(() =>
  props.isValidating ? t("editor.validating") : t("editor.validate"),
);

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

  emit("aiPatch", {
    start: selectionStart.value,
    end: selectionEnd.value,
  });
}

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
  emit("cleared");
}

function loadSample(id: SampleDiagramId): void {
  const sample = getSampleDiagramSource(id, locale.value);
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

  const start = textarea?.selectionStart ?? source.value.length;
  const end = textarea?.selectionEnd ?? source.value.length;
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

  const cursorPosition = before.length + snippetText.length;
  void nextTick(() => {
    if (!textareaRef.value) {
      return;
    }
    textareaRef.value.focus();
    textareaRef.value.setSelectionRange(cursorPosition, cursorPosition);
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

  const isMeta = event.ctrlKey || event.metaKey;
  if (isMeta && event.key.toLowerCase() === "z" && !event.shiftKey && props.canUndo) {
    event.preventDefault();
    emit("undo");
    return;
  }

  if (
    isMeta &&
    (event.key.toLowerCase() === "y" ||
      (event.key.toLowerCase() === "z" && event.shiftKey)) &&
    props.canRedo
  ) {
    event.preventDefault();
    emit("redo");
    return;
  }

  if (isSnippetsHotkey(event)) {
    event.preventDefault();
    snippetsOpen.value = !snippetsOpen.value;
  }
}

watch(isFullscreen, (value) => {
  document.body.style.overflow = value ? "hidden" : "";
});

onMounted(() => {
  window.addEventListener("keydown", onEditorKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onEditorKeydown);
  document.body.style.overflow = "";
});

watch(
  () => source.value,
  async () => {
    await nextTick();
    syncScroll();
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
          :label="t('app.savePuml')"
          primary
          format
          :disabled="!canSave"
          @click="emit('savePuml')"
        >
          <FileBadgeIcon format="PUML" />
        </IconButton>
        <IconButton
          :label="t('editor.aiPatch')"
          :disabled="!hasTextSelection"
          @click="requestAiPatch"
        >
          <ActionIcon name="ai" />
        </IconButton>
        <IconButton
          :label="validateLabel"
          :disabled="isValidating || isRendering"
          @click="emit('validateSyntax')"
        >
          <ActionIcon name="check" />
        </IconButton>
        <IconButton
          :label="t('editor.undo')"
          :disabled="!props.canUndo"
          @click="emit('undo')"
        >
          <ActionIcon name="undo" />
        </IconButton>
        <IconButton
          :label="t('editor.redo')"
          :disabled="!props.canRedo"
          @click="emit('redo')"
        >
          <ActionIcon name="redo" />
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
        <textarea
          ref="gutterRef"
          class="code-editor__gutter"
          :value="lineNumbersText"
          readonly
          tabindex="-1"
          aria-hidden="true"
        />

        <div class="code-editor__input-wrap">
          <div
            ref="highlightsRef"
            class="code-editor__highlights"
            aria-hidden="true"
          >
            <div
              v-for="(line, index) in sourceLines"
              :key="index"
              class="code-editor__line"
              :class="{ 'is-error': errorLineSet.has(index + 1) }"
            >
              {{ line || " " }}
            </div>
          </div>
          <textarea
            ref="textareaRef"
            @select="updateSelectionState"
            @keyup="updateSelectionState"
            @mouseup="updateSelectionState"
            v-model="source"
            class="code-editor__textarea"
            wrap="off"
            spellcheck="false"
            autocomplete="off"
            autocapitalize="off"
            :placeholder="t('editor.placeholder')"
            @scroll="syncScroll"
          />
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
    var(--gutter-chars) * 1ch + var(--gutter-padding-inline) * 2
  );
  min-height: 0;
  padding-inline: var(--gutter-padding-inline);
  border-right: 1px solid var(--border);
  background: var(--surface-muted);
  color: var(--text-muted);
  text-align: right;
  resize: none;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}

.code-editor__gutter:focus {
  outline: none;
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
  color: transparent;
  background: transparent;
}

.code-editor__line {
  display: block;
  white-space: pre;
}

.code-editor__line.is-error {
  background: color-mix(in srgb, var(--danger) 14%, transparent);
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
  color: var(--text);
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
