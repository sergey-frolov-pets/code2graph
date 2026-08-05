<script setup lang="ts">
import { onMounted } from "vue";
import AboutModal from "@/components/AboutModal.vue";
import AppDialogHost from "@/components/AppDialogHost.vue";
import DiagramVersionsModal from "@/components/DiagramVersionsModal.vue";
import DiagramEditor from "@/components/DiagramEditor.vue";
import DiagramLibraryModal from "@/components/DiagramLibraryModal.vue";
import DiagramPreview from "@/components/DiagramPreview.vue";
import AppHeader from "@/components/layout/AppHeader.vue";
import AppStatusBar from "@/components/layout/AppStatusBar.vue";
import DiagramWizardModal from "@/components/DiagramWizardModal.vue";
import LlmPatchModal from "@/components/LlmPatchModal.vue";
import LlmKeysGuideModal from "@/components/LlmKeysGuideModal.vue";
import SettingsModal from "@/components/SettingsModal.vue";
import SyntaxResultModal from "@/components/SyntaxResultModal.vue";
import { useAiSourceApply } from "@/composables/useAiSourceApply";
import { useAppDialog } from "@/composables/useAppDialog";
import { useAppModals } from "@/composables/useAppModals";
import { useDiagramDocument } from "@/composables/useDiagramDocument";
import { useDiagramExport } from "@/composables/useDiagramExport";
import { useDiagramRender } from "@/composables/useDiagramRender";
import { useEditorHistory } from "@/composables/useEditorHistory";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";
import { useLocale } from "@/composables/useLocale";
import { usePersistedSettings } from "@/composables/usePersistedSettings";
import { useSyntaxValidation } from "@/composables/useSyntaxValidation";

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

const {
  svg,
  error,
  isRendering,
  renderDiagram,
  scheduleRender,
  bootEngine,
} = useDiagramRender({
  source,
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
  isWizardModalOpen,
  openVersionsModal,
  openSettingsModal,
  openLibraryModal,
  openWizardModal,
  openAboutFromSettings,
  closeSyntaxModal,
} = useAppModals();

const {
  isValidating,
  syntaxResult,
  syntaxErrorLines,
  validateSyntax,
} = useSyntaxValidation({ source, layout, diagramDarkMode, renderMode });

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

function onFileLoaded(payload: { content: string; fileName: string }): void {
  applyLoadedSource(payload.content, payload.fileName);
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

onMounted(() => {
  restoreSettings();
  void initializeIncomingSources();
  void bootEngine();
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
        @file-loaded="onFileLoaded"
        @import-error="onImportError"
        @save-puml="savePuml"
        @open-versions="openVersionsModal"
        @validate-syntax="runSyntaxValidation"
        @cleared="onEditorCleared"
        @undo="applySourceUndo"
        @redo="applySourceRedo"
        @ai-patch="onAiPatchRequestOpen"
      />

      <DiagramPreview
        :svg="svg"
        :error="error"
        :is-rendering="isRendering"
        :can-export="canExport"
        v-model:preview-background="previewBackground"
        v-model:diagram-dark-mode="diagramDarkMode"
        @render-now="renderDiagram"
        @export-svg="exportSvg"
        @export-png="exportPng"
      />
    </main>

    <AppStatusBar
      :loaded-file-name="loadedFileName"
      :render-mode="renderMode"
    />

    <AppDialogHost />

    <SyntaxResultModal
      :open="isSyntaxModalOpen"
      :result="syntaxResult"
      :is-validating="isValidating"
      @close="closeSyntaxModal"
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
      @close="isLibraryModalOpen = false"
      @open-diagram="onFileLoaded"
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

    <DiagramWizardModal
      :open="isWizardModalOpen"
      :layout="layout"
      :render-mode="renderMode"
      :diagram-dark-mode="diagramDarkMode"
      :open-settings="openSettingsModal"
      @close="isWizardModalOpen = false"
      @apply="(payload) => applyAiPlantUml(payload.plantuml, payload.label)"
    />

    <LlmKeysGuideModal
      :open="guideModalOpen"
      :highlight-provider-id="guideProviderId"
      @close="closeLlmKeysGuide"
    />
  </div>
</template>
