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
import EditorFoldRegionsModal from "@/components/editor/EditorFoldRegionsModal.vue";
import { useLocale } from "@/composables/useLocale";
import type { EditorFontSize } from "@/constants/editor-settings";
import type { SampleSelection } from "@/constants/sample-diagrams";
import {
  DIAGRAM_FILE_ACCEPT,
  getDiagramFormatDefinition,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import { useEditorAutocomplete } from "@/composables/useEditorAutocomplete";
import { useCodeFolds } from "@/composables/editor/useCodeFolds";
import { useEditorDisplayModel } from "@/composables/editor/useEditorDisplayModel";
import { useEditorFileImport } from "@/composables/editor/useEditorFileImport";
import { useEditorSelection } from "@/composables/editor/useEditorSelection";
import "./editor/editor-code.css";

const source = defineModel<string>({ required: true });
const diagramFormat = defineModel<DiagramFormat>("diagramFormat", {
  required: true,
});

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
  fileLoaded: [payload: { content: string; fileName: string; format: DiagramFormat }];
  importError: [message: string];
  savePuml: [];
  saveToLibrary: [];
  openVersions: [];
  validateSyntax: [];
  cleared: [];
  undo: [];
  redo: [];
  convert: [];
  aiPatch: [payload: { start: number; end: number }];
  aiSyntaxAsk: [];
}>();

const { t } = useLocale();

const formatDefinition = computed(() =>
  getDiagramFormatDefinition(diagramFormat.value),
);
const isReadOnly = computed(() => !formatDefinition.value.editable);
const effectiveSyntaxHighlight = computed(
  () =>
    props.syntaxHighlightEnabled &&
    (diagramFormat.value === "plantuml" ||
      diagramFormat.value === "mermaid" ||
      diagramFormat.value === "graphml"),
);
const editorPlaceholder = computed(() => {
  if (diagramFormat.value === "graphml") {
    return t("editor.placeholderGraphml");
  }
  if (diagramFormat.value === "mermaid") {
    return t("editor.placeholderMermaid");
  }
  return t("editor.placeholder");
});
const effectiveAutocomplete = computed(
  () =>
    props.autocompleteEnabled &&
    (diagramFormat.value === "plantuml" || diagramFormat.value === "mermaid"),
);

const gutterComponentRef = ref<InstanceType<typeof EditorCodeGutter> | null>(
  null,
);
const regionsModalRef = ref<InstanceType<typeof EditorFoldRegionsModal> | null>(
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
} = useCodeFolds({ source, textareaRef, syncScroll });

const regionsButtonEl = computed(
  () => gutterComponentRef.value?.regionsButtonEl ?? null,
);

function toggleRegionsModal(): void {
  regionsModalOpen.value = !regionsModalOpen.value;
}

function onGutterLineTap(sourceLine: number): void {
  regionsModalRef.value?.handleLineTap(sourceLine);
}

function onRegionSubmit(payload: {
  fromLine: number;
  toLine: number | null;
  label?: string;
}): void {
  addRegion(payload);
}

function onRegionNavigate(line: number): void {
  scrollToSourceLine(line);
}

const {
  displayText,
  gutterRows,
  visibleEditorLines,
  editorStyle,
  useLineVirtualization,
} = useEditorDisplayModel({
  source,
  folds,
  syntaxHighlightEnabled: effectiveSyntaxHighlight,
  diagramFormat,
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
  diagramFormat,
  resetFolds,
  onFileLoaded: (payload) => emit("fileLoaded", payload),
  onImportError: (message) => emit("importError", message),
  onCleared: () => emit("cleared"),
});

const { updateSelectionState, requestAiPatch, insertSnippetAtCursor } =
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
  diagramFormat,
  folds,
  textareaRef,
  editorFontSize: toRef(props, "editorFontSize"),
  enabled: effectiveAutocomplete,
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
      :format-definition="formatDefinition"
      :can-save="canSave"
      :is-validating="isValidating"
      :is-rendering="isRendering"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :can-clear="canClear"
      :can-convert="canClear"
      :can-ai-patch="canClear"
      :can-ai-syntax-ask="canClear"
      :snippets-open="snippetsOpen"
      :is-fullscreen="isFullscreen"
      @open-file="openFilePicker"
      @open-versions="emit('openVersions')"
      @save-puml="emit('savePuml')"
      @save-to-library="emit('saveToLibrary')"
      @ai-patch="requestAiPatch"
      @ai-syntax-ask="emit('aiSyntaxAsk')"
      @validate-syntax="emit('validateSyntax')"
      @undo="emit('undo')"
      @redo="emit('redo')"
      @convert="emit('convert')"
      @clear="requestClear"
      @toggle-snippets="snippetsOpen = !snippetsOpen"
      @load-sample="loadSample($event as SampleSelection)"
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
        :accept="DIAGRAM_FILE_ACCEPT"
        @change="handleSelectedFile"
      />

      <div class="code-editor">
        <EditorCodeGutter
          ref="gutterComponentRef"
          :gutter-rows="gutterRows"
          :use-line-virtualization="useLineVirtualization"
          :is-line-in-fold-selection="isLineInFoldSelection"
          :regions-modal-open="regionsModalOpen"
          @gutter-mouse-down="onGutterMouseDown"
          @gutter-mouse-enter="onGutterMouseEnter"
          @fold-toggle-click="onFoldToggleClick"
          @fold-remove="removeFold"
          @gutter-line-tap="onGutterLineTap"
          @open-regions-modal="toggleRegionsModal"
        />

        <EditorCodeSurface
          ref="codeSurfaceRef"
          :source="source"
          :folds="folds"
          :display-text="displayText"
          :visible-editor-lines="visibleEditorLines"
          :use-line-virtualization="useLineVirtualization"
          :syntax-highlight-enabled="effectiveSyntaxHighlight"
          :autocomplete-enabled="effectiveAutocomplete"
          :read-only="isReadOnly"
          :placeholder="editorPlaceholder"
          :error-lines="errorLines ?? []"
          :autocomplete="autocomplete"
          @update:source="source = $event"
          @scroll="onTextareaScroll"
          @select="updateSelectionState"
          @mouseup="updateSelectionState"
          @toggle-snippets="snippetsOpen = !snippetsOpen"
        />
      </div>

      <p class="drop-hint">
        {{
          isReadOnly
            ? t("editor.dropHintViewOnly")
            : t("editor.dropHint")
        }}
      </p>
    </div>

    <SnippetsPanel
      :open="snippetsOpen"
      @close="snippetsOpen = false"
      @insert="insertSnippetAtCursor"
    />

    <EditorFoldRegionsModal
      ref="regionsModalRef"
      :open="regionsModalOpen"
      :anchor-el="regionsButtonEl"
      :regions="sortedRegions"
      :line-count="lineCount"
      @close="regionsModalOpen = false"
      @submit="onRegionSubmit"
      @remove="removeFold($event)"
      @navigate="onRegionNavigate"
    />
  </section>
</template>
