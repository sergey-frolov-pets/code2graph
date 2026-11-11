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
import InlineDiagramBuilder from "@/components/editor/InlineDiagramBuilder.vue";
import AiChatPanel from "@/components/llm/AiChatPanel.vue";
import type { LayoutEngine } from "@/constants";
import {
  DEFAULT_RENDER_MODE,
  type RenderMode,
} from "@/constants/render-settings";
import EditorCodeGutter from "@/components/editor/EditorCodeGutter.vue";
import EditorCodeSurface from "@/components/editor/EditorCodeSurface.vue";
import EditorFoldOnboardingBanner from "@/components/editor/EditorFoldOnboardingBanner.vue";
import EditorFoldRegionsModal from "@/components/editor/EditorFoldRegionsModal.vue";
import { reportTablePasteError } from "@/composables/useTablePasteError";
import { isFeatureAllowed } from "@/composables/useFeatureGate";
import { trackClipboardPaste } from "@/analytics";
import { useLocale } from "@/composables/useLocale";
import { useHasActiveLlm } from "@/composables/useHasActiveLlm";
import { useFeatureGate } from "@/composables/useFeatureGate";
import {
  SESSION_CHANGE_TRACKING_ENABLED,
  type EditorFontSize,
} from "@/constants/editor-settings";
import {
  DIAGRAM_FILE_ACCEPT,
  getDiagramFormatDefinition,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import { getLanguageModule } from "@/languages/registry";
import {
  applyTableFromClipboardText,
  createClipboardReadError,
  supportsTablePaste,
} from "@/services/table-paste";
import { supportsDiagramBuilder } from "@/services/diagram-builder";
import { useEditorFoldOnboarding } from "@/composables/wizard/useWizardOnboarding";
import { useEditorAutocomplete } from "@/composables/useEditorAutocomplete";
import { useCodeFolds } from "@/composables/editor/useCodeFolds";
import { useEditorDisplayModel } from "@/composables/editor/useEditorDisplayModel";
import { useEditorFileImport } from "@/composables/editor/useEditorFileImport";
import { useEditorSelection } from "@/composables/editor/useEditorSelection";
import { useSessionChanges } from "@/composables/editor/useSessionChanges";
import type { CodeFoldRegion } from "@/utils/code-folds";
import {
  applySessionViewEdit,
  buildSessionProjection,
  offsetOfWorkingLine,
  sessionViewText,
  splitSourceLines,
} from "@/services/editor/session-changes";
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
  canRefreshData?: boolean;
  aiDocumentKey?: string;
  layout?: LayoutEngine;
  renderMode?: RenderMode;
  diagramDarkMode?: boolean;
  renderError?: string;
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
  aiApplySource: [payload: { source: string; label: string; format?: DiagramFormat }];
  openSettings: [];
  "editor-focus": [];
  "editor-blur": [];
  "editor-fullscreen": [active: boolean];
  refreshData: [];
}>();

const { t } = useLocale();
const { showFoldOnboarding, dismissFoldOnboarding } = useEditorFoldOnboarding();

const formatDefinition = computed(() =>
  getDiagramFormatDefinition(diagramFormat.value),
);
const languageModule = computed(() => getLanguageModule(diagramFormat.value));
const isReadOnly = computed(() => !formatDefinition.value.editable);
const effectiveSyntaxHighlight = computed(
  () =>
    props.syntaxHighlightEnabled && languageModule.value.supportsSyntaxHighlight,
);
const editorPlaceholder = computed(() => t(languageModule.value.placeholderKey));
const effectiveAutocomplete = computed(
  () =>
    props.autocompleteEnabled && languageModule.value.supportsAutocomplete,
);
const canPasteTable = computed(() =>
  supportsTablePaste(source.value, diagramFormat.value),
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
export type EditorSurfaceMode = "code" | "builder" | "ai-chat";

const surfaceMode = ref<EditorSurfaceMode>("code");
const builderAvailable = computed(
  () =>
    formatDefinition.value.editable &&
    supportsDiagramBuilder(formatDefinition.value.id),
);
const { hasActiveLlm, refreshActiveLlmAvailability } = useHasActiveLlm();
const allowAiChat = useFeatureGate("editor.ai");

/**
 * ИИ-чат скрываем, если формат нередактируем (read-only GraphML),
 * не подключён ни один LLM (активный провайдер без согласия/ключа/прокси)
 * или ИИ запрещён тарифом/правами (`editor.ai`).
 */
const aiChatAvailable = computed(
  () =>
    formatDefinition.value.editable &&
    hasActiveLlm.value &&
    allowAiChat.value,
);

watch(builderAvailable, (available) => {
  if (!available && surfaceMode.value === "builder") {
    surfaceMode.value = "code";
  }
});

watch(aiChatAvailable, (available) => {
  if (!available && surfaceMode.value === "ai-chat") {
    surfaceMode.value = "code";
  }
});

function setSurfaceMode(mode: EditorSurfaceMode): void {
  if (mode === "builder" && !builderAvailable.value) {
    return;
  }
  if (mode === "ai-chat" && !aiChatAvailable.value) {
    return;
  }
  if (mode === "builder") {
    snippetsOpen.value = false;
  }
  surfaceMode.value = mode;
}


const textareaRef = computed(
  () => codeSurfaceRef.value?.textareaEl ?? null,
);

const session = useSessionChanges();
const cursorText = ref("");
const cursorFolds = ref<CodeFoldRegion[]>([]);

const sessionProjection = computed(() => {
  if (!SESSION_CHANGE_TRACKING_ENABLED) {
    return null;
  }

  return buildSessionProjection({
    baseline: session.baseline.value ?? source.value,
    current: source.value,
    fileShowsBaseline: session.fileShowsBaseline.value,
    flippedHunkIds: session.flippedHunkIds.value,
  });
});

const hasSessionChanges = computed(
  () => (sessionProjection.value?.hunks.length ?? 0) > 0,
);

function commitSurfaceText(next: string): void {
  const projection = sessionProjection.value;
  if (!projection) {
    source.value = next;
    return;
  }

  const applied = applySessionViewEdit(
    projection.lines,
    projection.hidden,
    next,
    splitSourceLines(source.value),
  );
  source.value = applied.text;
  if (applied.editedCount > 0) {
    session.showEditedLinesAsCurrent(
      applied.text,
      applied.editedStart,
      applied.editedCount,
    );
  }
}

const sessionBuffer = computed({
  get(): string {
    const projection = sessionProjection.value;
    if (!projection) {
      return source.value;
    }

    return sessionViewText(projection.lines);
  },
  set(next: string) {
    if (!sessionProjection.value) {
      source.value = next;
      return;
    }

    commitSurfaceText(next);
  },
});

function workingLineOffset(lineNumber: number): number {
  const projection = sessionProjection.value;
  if (!projection) {
    const sourceLines = source.value.split(/\r?\n/);
    const targetLine = Math.min(Math.max(lineNumber, 1), sourceLines.length);
    return sourceLines
      .slice(0, targetLine - 1)
      .reduce((offset, line) => offset + line.length + 1, 0);
  }

  return offsetOfWorkingLine(
    projection.lines,
    projection.hidden,
    lineNumber,
  );
}

function onEditorFocusOut(event: FocusEvent): void {
  const section = event.currentTarget as HTMLElement;
  const related = event.relatedTarget as Node | null;
  if (related && section.contains(related)) {
    return;
  }

  emit("editor-blur");
}

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
} = useCodeFolds({
  source,
  diagramFormat,
  textareaRef,
  syncScroll,
  cursorText,
  cursorFolds,
  workingLineOffset,
});

const regionsButtonEl = computed(
  () => gutterComponentRef.value?.regionsButtonEl ?? null,
);

function toggleRegionsModal(): void {
  regionsModalOpen.value = !regionsModalOpen.value;
}

function openRegionsModalFromOnboarding(): void {
  regionsModalOpen.value = true;
  dismissFoldOnboarding();
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
  surfaceText,
  surfaceFolds,
  gutterRows,
  visibleEditorLines,
  editorStyle,
  useLineVirtualization,
} = useEditorDisplayModel({
  source,
  folds,
  sessionProjection,
  syntaxHighlightEnabled: effectiveSyntaxHighlight,
  diagramFormat,
  editorFontSize: toRef(props, "editorFontSize"),
  editorFontFamily: toRef(props, "editorFontFamily"),
});

watch(surfaceText, (value) => {
  cursorText.value = value;
}, { immediate: true });

watch(surfaceFolds, (value) => {
  cursorFolds.value = value;
}, { immediate: true });

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
  changeFormat,
  requestClear,
} = useEditorFileImport({
  source,
  diagramFormat,
  resetFolds,
  onFileLoaded: (payload) => emit("fileLoaded", payload),
  onImportError: (message) => emit("importError", message),
  onCleared: () => emit("cleared"),
});

const {
  updateSelectionState,
  insertSnippetAtCursor,
} = useEditorSelection({
  source: sessionBuffer,
  folds: surfaceFolds,
  textareaRef,
  displayText,
  syncScroll,
});

async function onPasteTableFromClipboard(): Promise<void> {
  if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
    reportTablePasteError(
      createClipboardReadError(source.value, diagramFormat.value),
    );
    return;
  }

  let clipboardText = "";
  try {
    clipboardText = await navigator.clipboard.readText();
  } catch {
    reportTablePasteError(
      createClipboardReadError(source.value, diagramFormat.value),
    );
    return;
  }

  const result = applyTableFromClipboardText({
    clipboardText,
    source: source.value,
    format: diagramFormat.value,
  });

  if (!result.ok) {
    reportTablePasteError(result.error);
    return;
  }

  trackClipboardPaste("table", diagramFormat.value, result.diagramType);
  resetFolds();
  source.value = result.fullSource;
}

const autocomplete = useEditorAutocomplete({
  source: sessionBuffer,
  diagramFormat,
  folds: surfaceFolds,
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

function onToggleSnippets(): void {
  if (!isFeatureAllowed("editor.snippets")) {
    snippetsOpen.value = false;
    return;
  }
  snippetsOpen.value = !snippetsOpen.value;
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
  emit("editor-fullscreen", value);
});

onMounted(() => {
  window.addEventListener("keydown", onEditorKeydown);
  void refreshActiveLlmAvailability();
});

onUnmounted(() => {
  window.removeEventListener("keydown", onEditorKeydown);
  document.body.style.overflow = "";
  if (isFullscreen.value) {
    emit("editor-fullscreen", false);
  }
});
</script>

<template>
  <section
    class="panel editor-panel"
    :class="{ 'is-fullscreen': isFullscreen }"
    :style="editorStyle"
    :aria-label="t('app.editorRegion')"
    @focusin="emit('editor-focus')"
    @focusout="onEditorFocusOut"
  >
    <EditorFoldOnboardingBanner
      :open="showFoldOnboarding"
      @dismiss="dismissFoldOnboarding"
      @open-regions="openRegionsModalFromOnboarding"
    />

    <EditorToolbar
      :format-definition="formatDefinition"
      :can-save="canSave"
      :is-validating="isValidating"
      :is-rendering="isRendering"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :can-clear="canClear"
      :can-convert="canClear"
      :can-paste-table="canPasteTable"
      :can-refresh-data="canRefreshData"
      :snippets-open="snippetsOpen"
      :is-fullscreen="isFullscreen"
      :surface-mode="surfaceMode"
      :builder-available="builderAvailable"
      :ai-chat-available="aiChatAvailable"
      :session-tracking-enabled="SESSION_CHANGE_TRACKING_ENABLED"
      :can-toggle-session-file="hasSessionChanges"
      :session-file-shows-baseline="session.fileShowsBaseline.value"
      @set-surface-mode="setSurfaceMode"
      @toggle-session-file="session.toggleFileVersion"
      @open-file="openFilePicker"
      @open-versions="emit('openVersions')"
      @save-puml="emit('savePuml')"
      @save-to-library="emit('saveToLibrary')"
      @paste-table="onPasteTableFromClipboard"
      @refresh-data="emit('refreshData')"
      @validate-syntax="emit('validateSyntax')"
      @undo="emit('undo')"
      @redo="emit('redo')"
      @convert="emit('convert')"
      @clear="requestClear"
      @toggle-snippets="onToggleSnippets"
      @load-sample="loadSample"
      @change-format="changeFormat"
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

      <InlineDiagramBuilder
        v-if="surfaceMode === 'builder'"
        v-model:source="source"
        :format="diagramFormat"
      />

      <AiChatPanel
        v-else-if="surfaceMode === 'ai-chat'"
        :source="source"
        :diagram-format="diagramFormat"
        :document-key="aiDocumentKey ?? ''"
        :layout="layout ?? 'smetana'"
        :render-mode="renderMode ?? DEFAULT_RENDER_MODE"
        :diagram-dark-mode="diagramDarkMode ?? false"
        :render-error="renderError"
        @apply-source="emit('aiApplySource', $event)"
        @open-settings="emit('openSettings')"
      />

      <div
        v-else
        class="code-editor"
      >
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
          @toggle-session-hunk="session.toggleHunk"
        />

        <EditorCodeSurface
          ref="codeSurfaceRef"
          :source="sessionBuffer"
          :folds="surfaceFolds"
          :display-text="displayText"
          :visible-editor-lines="visibleEditorLines"
          :use-line-virtualization="useLineVirtualization"
          :syntax-highlight-enabled="effectiveSyntaxHighlight"
          :autocomplete-enabled="effectiveAutocomplete"
          :read-only="isReadOnly"
          :placeholder="editorPlaceholder"
          :error-lines="errorLines ?? []"
          :autocomplete="autocomplete"
          @update:source="sessionBuffer = $event"
          @scroll="onTextareaScroll"
          @select="updateSelectionState"
          @mouseup="updateSelectionState"
          @toggle-snippets="onToggleSnippets"
        />
      </div>

      <p
        v-if="surfaceMode === 'code'"
        class="drop-hint"
      >
        {{
          isReadOnly
            ? t("editor.dropHintViewOnly")
            : t("editor.dropHint")
        }}
      </p>
    </div>

    <SnippetsPanel
      :open="snippetsOpen"
      :diagram-format="diagramFormat"
      :source="source"
      :can-insert="!isReadOnly"
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
