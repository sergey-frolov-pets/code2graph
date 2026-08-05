<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  toRef,
  watch,
} from "vue";
import SnippetsPanel from "@/components/SnippetsPanel.vue";
import EditorToolbar from "@/components/editor/EditorToolbar.vue";
import EditorCodeGutter from "@/components/editor/EditorCodeGutter.vue";
import EditorCodeSurface from "@/components/editor/EditorCodeSurface.vue";
import { useLocale } from "@/composables/useLocale";
import type { EditorFontSize } from "@/constants/editor-settings";
import type { SampleDiagramId } from "@/constants/sample-diagrams";
import { PUML_FILE_ACCEPT } from "@/utils/puml-files";
import { useEditorAutocomplete } from "@/composables/useEditorAutocomplete";
import { useCodeFolds } from "@/composables/editor/useCodeFolds";
import { useEditorDisplayModel } from "@/composables/editor/useEditorDisplayModel";
import { useEditorFileImport } from "@/composables/editor/useEditorFileImport";
import { useEditorSelection } from "@/composables/editor/useEditorSelection";
import "./editor/editor-code.css";

const source = defineModel<string>({ required: true });

const props = defineProps<{
  errorLines?: number[];
  editorFontSize: EditorFontSize;
  editorFontFamily: string;
  syntaxHighlightEnabled: boolean;
  autocompleteEnabled: boolean;
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
  openVersions: [];
  validateSyntax: [];
  cleared: [];
  undo: [];
  redo: [];
  aiPatch: [payload: { start: number; end: number }];
}>();

const { t } = useLocale();

const gutterComponentRef = ref<InstanceType<typeof EditorCodeGutter> | null>(
  null,
);
const codeSurfaceRef = ref<InstanceType<typeof EditorCodeSurface> | null>(null);
const isFullscreen = ref(false);
const snippetsOpen = ref(false);

const textareaRef = computed(
  () => codeSurfaceRef.value?.textareaEl ?? null,
);

function syncScroll(): void {
  const textarea = textareaRef.value;
  if (!textarea) {
    return;
  }

  const gutterEl = gutterComponentRef.value?.gutterEl;
  if (gutterEl) {
    gutterEl.scrollTop = textarea.scrollTop;
  }

  const highlightsEl = codeSurfaceRef.value?.highlightsEl;
  if (highlightsEl) {
    highlightsEl.scrollTop = textarea.scrollTop;
    highlightsEl.scrollLeft = textarea.scrollLeft;
  }
}

const {
  folds,
  resetFolds,
  isLineInFoldSelection,
  onGutterMouseDown,
  onGutterMouseEnter,
  onFoldToggleClick,
  removeFold,
} = useCodeFolds({ source, textareaRef, syncScroll });

const {
  displayText,
  gutterRows,
  visibleEditorLines,
  editorStyle,
} = useEditorDisplayModel({
  source,
  folds,
  syntaxHighlightEnabled: toRef(props, "syntaxHighlightEnabled"),
  editorFontSize: toRef(props, "editorFontSize"),
  editorFontFamily: toRef(props, "editorFontFamily"),
});

const {
  fileInputRef,
  isDragOver,
  canClear,
  openFilePicker,
  handleSelectedFile,
  onDragOver,
  onDragLeave,
  onDrop,
  loadSample,
  requestClear,
} = useEditorFileImport({
  source,
  resetFolds,
  onFileLoaded: (payload) => emit("fileLoaded", payload),
  onImportError: (message) => emit("importError", message),
  onCleared: () => emit("cleared"),
});

const { hasTextSelection, updateSelectionState, requestAiPatch, insertSnippetAtCursor } =
  useEditorSelection({
    source,
    folds,
    textareaRef,
    displayText,
    syncScroll,
    onAiPatch: (payload) => emit("aiPatch", payload),
  });

const autocomplete = useEditorAutocomplete({
  source,
  folds,
  textareaRef,
  editorFontSize: toRef(props, "editorFontSize"),
  enabled: toRef(props, "autocompleteEnabled"),
});

function onTextareaScroll(): void {
  syncScroll();
  if (autocomplete.isOpen.value) {
    autocomplete.refresh();
  }
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
  }
}

watch(
  () => props.autocompleteEnabled,
  (enabled) => {
    if (!enabled) {
      autocomplete.close();
    }
  },
);

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
</script>

<template>
  <section
    class="panel editor-panel"
    :class="{ 'is-fullscreen': isFullscreen }"
    :style="editorStyle"
  >
    <EditorToolbar
      :can-save="canSave"
      :is-validating="isValidating"
      :is-rendering="isRendering"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :can-clear="canClear"
      :has-text-selection="hasTextSelection"
      :snippets-open="snippetsOpen"
      :is-fullscreen="isFullscreen"
      @open-file="openFilePicker"
      @open-versions="emit('openVersions')"
      @save-puml="emit('savePuml')"
      @ai-patch="requestAiPatch"
      @validate-syntax="emit('validateSyntax')"
      @undo="emit('undo')"
      @redo="emit('redo')"
      @clear="requestClear"
      @toggle-snippets="snippetsOpen = !snippetsOpen"
      @load-sample="loadSample($event as SampleDiagramId)"
      @toggle-fullscreen="isFullscreen = !isFullscreen"
    />

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
        <EditorCodeGutter
          ref="gutterComponentRef"
          :gutter-rows="gutterRows"
          :is-line-in-fold-selection="isLineInFoldSelection"
          @gutter-mouse-down="onGutterMouseDown"
          @gutter-mouse-enter="onGutterMouseEnter"
          @fold-toggle-click="onFoldToggleClick"
          @fold-remove="removeFold"
        />

        <EditorCodeSurface
          ref="codeSurfaceRef"
          :source="source"
          :folds="folds"
          :display-text="displayText"
          :visible-editor-lines="visibleEditorLines"
          :syntax-highlight-enabled="syntaxHighlightEnabled"
          :autocomplete-enabled="autocompleteEnabled"
          :error-lines="errorLines ?? []"
          :autocomplete="autocomplete"
          @update:source="source = $event"
          @scroll="onTextareaScroll"
          @select="updateSelectionState"
          @mouseup="updateSelectionState"
          @toggle-snippets="snippetsOpen = !snippetsOpen"
        />
      </div>

      <p class="drop-hint">{{ t("editor.dropHint") }}</p>
    </div>

    <SnippetsPanel
      :open="snippetsOpen"
      @close="snippetsOpen = false"
      @insert="insertSnippetAtCursor"
    />
  </section>
</template>
