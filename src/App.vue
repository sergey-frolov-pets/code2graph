<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import AboutModal from "@/components/AboutModal.vue";
import AppDialogHost from "@/components/AppDialogHost.vue";
import DiagramVersionsModal from "@/components/DiagramVersionsModal.vue";
import DiagramEditor from "@/components/DiagramEditor.vue";
import DiagramLibraryModal from "@/components/DiagramLibraryModal.vue";
import SaveToLibraryModal from "@/components/SaveToLibraryModal.vue";
import DiagramPreview from "@/components/DiagramPreview.vue";
import AppHeader from "@/components/layout/AppHeader.vue";
import AppStatusBar from "@/components/layout/AppStatusBar.vue";
import DiagramWizardModal from "@/components/DiagramWizardModal.vue";
import LlmPatchModal from "@/components/LlmPatchModal.vue";
import LlmSyntaxAskModal from "@/components/LlmSyntaxAskModal.vue";
import LlmKeysGuideModal from "@/components/LlmKeysGuideModal.vue";
import SettingsModal from "@/components/SettingsModal.vue";
import SyntaxResultModal from "@/components/SyntaxResultModal.vue";
import { useAiSourceApply } from "@/composables/useAiSourceApply";
import { useAppDialog } from "@/composables/useAppDialog";
import { useAppModals } from "@/composables/useAppModals";
import { useDiagramDocument } from "@/composables/useDiagramDocument";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useDiagramExport } from "@/composables/useDiagramExport";
import { useDiagramRender } from "@/composables/useDiagramRender";
import { useEditorHistory } from "@/composables/useEditorHistory";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";
import { useLocale } from "@/composables/useLocale";
import { usePersistedSettings } from "@/composables/usePersistedSettings";
import { useSyntaxValidation } from "@/composables/useSyntaxValidation";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { getDiagramFormatDefinition } from "@/constants/diagram-formats";

const isSaveToLibraryModalOpen = ref(false);
const linkedLibraryDiagramId = ref<string | null>(null);
const { alert } = useAppDialog();
const { t, locale } = useLocale();
const {
  guideModalOpen,
  guideProviderId,
  closeLlmKeysGuide,
} = useLlmKeysGuide();
const {
  canUndo,
  canRedo,
  undo: undoHistory,
  redo: redoHistory,
  clearHistory,
  pushHistoryEntry,
} = useEditorHistory();

const {
  source,
  layout,
  renderMode,
  uiDarkMode,
  diagramDarkMode,
  editorFontSize,
  editorFontFamilyId,
  editorSyntaxHighlight,
  editorAutocomplete,
  previewBackground,
  editorFontFamily,
  persistSettings,
  restoreSettings,
} = usePersistedSettings();

const diagramFormat = ref<DiagramFormat>("plantuml");
const syntaxAskInitialQuestion = ref("");

const formatDefinition = computed(() =>
  getDiagramFormatDefinition(diagramFormat.value),
);

const {
  svg,
  error,
  isRendering,
  renderDiagram,
  scheduleRender,
  bootEngine,
} = useDiagramRender({
  source,
  diagramFormat,
  layout,
  diagramDarkMode,
  renderMode,
  locale,
  t,
  onPersist: persistSettings,
});

const {
  isSyntaxModalOpen,
  isVersionsModalOpen,
  isSettingsModalOpen,
  isLibraryModalOpen,
  isAboutModalOpen,
  isPatchModalOpen,
  isSyntaxAskModalOpen,
  isWizardModalOpen,
  openVersionsModal,
  openSettingsModal,
  openLibraryModal,
  openWizardModal,
  openSyntaxAskModal,
  openAboutFromSettings,
  closeSyntaxModal,
} = useAppModals();

const {
  isValidating,
  syntaxResult,
  syntaxErrorLines,
  validateSyntax,
} = useSyntaxValidation({ source, diagramFormat, layout, diagramDarkMode, renderMode });

const {
  loadedFileName,
  canSave,
  applyLoadedSource,
  onEditorCleared,
  initializeIncomingSources,
  savePuml,
  onVersionRestore,
} = useDiagramDocument({
  source,
  diagramFormat,
  error,
  syntaxErrorLines,
  persistSettings,
  scheduleRender,
  clearHistory,
});

const { canExport, exportSvg, exportPng } = useDiagramExport({
  svg,
  error,
  isRendering,
  previewBackground,
});

const {
  patchSelectionStart,
  patchSelectionEnd,
  onAiPatchRequest,
  applyAiPlantUml,
} = useAiSourceApply({
  source,
  error,
  syntaxErrorLines,
  persistSettings,
  scheduleRender,
  pushHistoryEntry,
});

function applySourceUndo(): void {
  const previous = undoHistory(source.value);
  if (!previous) {
    return;
  }
  source.value = previous;
  syntaxErrorLines.value = [];
  persistSettings();
  scheduleRender();
}

function applySourceRedo(): void {
  const next = redoHistory(source.value);
  if (!next) {
    return;
  }
  source.value = next;
  syntaxErrorLines.value = [];
  persistSettings();
  scheduleRender();
}

function onFileLoaded(payload: {
  content: string;
  fileName: string;
  format?: DiagramFormat;
  diagramId?: string;
}): void {
  applyLoadedSource(payload.content, payload.fileName, payload.format);
  linkedLibraryDiagramId.value = payload.diagramId ?? null;
}

function onEditorFileLoaded(payload: {
  content: string;
  fileName: string;
  format: DiagramFormat;
}): void {
  onFileLoaded(payload);
}

function openSaveToLibraryModal(): void {
  void useDiagramLibrary().refresh();
  isSaveToLibraryModalOpen.value = true;
}

function onEditorClearedWithLink(): void {
  linkedLibraryDiagramId.value = null;
  onEditorCleared();
}


function onImportError(message: string): void {
  void alert({
    title: t("app.importError"),
    message,
    variant: "error",
  });
}

async function runSyntaxValidation(): Promise<void> {
  isSyntaxModalOpen.value = true;
  await validateSyntax();
}

function onAiPatchRequestOpen(payload: { start: number; end: number }): void {
  onAiPatchRequest(payload);
  isPatchModalOpen.value = true;
}

function onAiSyntaxAskOpen(initialQuestion = ""): void {
  syntaxAskInitialQuestion.value = initialQuestion;
  openSyntaxAskModal();
}

function onSyntaxAskFromValidation(): void {
  closeSyntaxModal();
  onAiSyntaxAskOpen();
}

const PENDING_SHARE_STORAGE_KEY = "plantuml-smetana-pending-share";

async function handleShareLinkOnBoot(): Promise<void> {
  const token = new URLSearchParams(window.location.search).get("share");
  if (!token) {
    return;
  }

  if (!getLibraryApiBaseUrl()) {
    return;
  }

  try {
    sessionStorage.setItem(PENDING_SHARE_STORAGE_KEY, token);
    openLibraryModal();
  } catch (error) {
    void alert({
      title: t("library.shareOpenErrorTitle"),
      message:
        error instanceof Error ? error.message : t("library.shareOpenError"),
      variant: "error",
    });
  }
}

onMounted(() => {
  restoreSettings();
  void initializeIncomingSources();
  void bootEngine();
  void handleShareLinkOnBoot();
});
</script>

<template>
  <div class="app-shell">
    <AppHeader
      @open-wizard="openWizardModal"
      @open-library="openLibraryModal"
      @open-settings="openSettingsModal"
    />

    <main class="app-main">
      <DiagramEditor
        v-model="source"
        v-model:diagram-format="diagramFormat"
        :error-lines="syntaxErrorLines"
        :editor-font-size="editorFontSize"
        :editor-font-family="editorFontFamily"
        :syntax-highlight-enabled="editorSyntaxHighlight"
        :autocomplete-enabled="editorAutocomplete"
        :can-save="canSave"
        :is-validating="isValidating"
        :is-rendering="isRendering"
        :can-undo="canUndo"
        :can-redo="canRedo"
        @file-loaded="onEditorFileLoaded"
        @import-error="onImportError"
        @save-puml="savePuml"
        @save-to-library="openSaveToLibraryModal"
        @open-versions="openVersionsModal"
        @validate-syntax="runSyntaxValidation"
        @cleared="onEditorClearedWithLink"
        @undo="applySourceUndo"
        @redo="applySourceRedo"
        @ai-patch="onAiPatchRequestOpen"
        @ai-syntax-ask="onAiSyntaxAskOpen()"
      />

      <DiagramPreview
        :svg="svg"
        :error="error"
        :is-rendering="isRendering"
        :can-export="canExport"
        v-model:preview-background="previewBackground"
        v-model:diagram-dark-mode="diagramDarkMode"
        v-model:render-mode="renderMode"
        @render-now="renderDiagram"
        @export-svg="exportSvg"
        @export-png="exportPng"
      />
    </main>

    <AppStatusBar
      :loaded-file-name="loadedFileName"
      :layout="layout"
      :render-mode="renderMode"
    />

    <AppDialogHost />

    <SyntaxResultModal
      :open="isSyntaxModalOpen"
      :result="syntaxResult"
      :is-validating="isValidating"
      :show-syntax-ask="formatDefinition.supportsAiSyntaxAsk"
      @close="closeSyntaxModal"
      @ask-syntax="onSyntaxAskFromValidation"
    />

    <DiagramVersionsModal
      :open="isVersionsModalOpen"
      :document-key="loadedFileName"
      :current-source="source"
      @close="isVersionsModalOpen = false"
      @restore="onVersionRestore"
    />

    <DiagramLibraryModal
      :open="isLibraryModalOpen"
      :render-mode="renderMode"
      :layout="layout"
      :diagram-dark-mode="diagramDarkMode"
      @close="isLibraryModalOpen = false"
      @open-diagram="onFileLoaded"
    />

    <SaveToLibraryModal
      :open="isSaveToLibraryModalOpen"
      :source="source"
      :file-name="loadedFileName"
      :diagram-format="diagramFormat"
      :linked-diagram-id="linkedLibraryDiagramId"
      @close="isSaveToLibraryModalOpen = false"
    />

    <SettingsModal
      :open="isSettingsModalOpen"
      v-model:layout="layout"
      v-model:render-mode="renderMode"
      v-model:dark-mode="uiDarkMode"
      v-model:editor-font-size="editorFontSize"
      v-model:editor-font-family-id="editorFontFamilyId"
      v-model:editor-syntax-highlight="editorSyntaxHighlight"
      v-model:editor-autocomplete="editorAutocomplete"
      @close="isSettingsModalOpen = false"
      @open-about="openAboutFromSettings"
    />

    <AboutModal
      :open="isAboutModalOpen"
      @close="isAboutModalOpen = false"
    />

    <LlmPatchModal
      :open="isPatchModalOpen"
      :source="source"
      :selection-start="patchSelectionStart"
      :selection-end="patchSelectionEnd"
      :layout="layout"
      :render-mode="renderMode"
      :diagram-dark-mode="diagramDarkMode"
      :open-settings="openSettingsModal"
      @close="isPatchModalOpen = false"
      @apply="(payload) => applyAiPlantUml(payload.plantuml, payload.label)"
    />

    <LlmSyntaxAskModal
      :open="isSyntaxAskModalOpen"
      :source="source"
      :initial-question="syntaxAskInitialQuestion"
      :open-settings="openSettingsModal"
      @close="isSyntaxAskModalOpen = false"
    />

    <DiagramWizardModal
      :open="isWizardModalOpen"
      :layout="layout"
      :render-mode="renderMode"
      :diagram-dark-mode="diagramDarkMode"
      :open-settings="openSettingsModal"
      @close="isWizardModalOpen = false"
      @apply="(payload) => applyAiPlantUml(payload.source, payload.label)"
    />

    <LlmKeysGuideModal
      :open="guideModalOpen"
      :highlight-provider-id="guideProviderId"
      @close="closeLlmKeysGuide"
    />
  </div>
</template>
