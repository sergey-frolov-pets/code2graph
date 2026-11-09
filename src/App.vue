<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import AppDialogHost from "@/components/AppDialogHost.vue";
import LibraryDataLinkImportDialog from "@/components/library/LibraryDataLinkImportDialog.vue";
import AppModalHost from "@/components/AppModalHost.vue";
import TooltipProvider from "@/components/ui/TooltipProvider.vue";
import DiagramEditor from "@/components/DiagramEditor.vue";
import DiagramPreview from "@/components/DiagramPreview.vue";
import ClipboardDiagramPrompt from "@/components/ClipboardDiagramPrompt.vue";
import DiagramDataSourceDialog from "@/components/DiagramDataSourceDialog.vue";
import TablePasteErrorModal from "@/components/TablePasteErrorModal.vue";
import AppHeader from "@/components/layout/AppHeader.vue";
import AppStatusBar from "@/components/layout/AppStatusBar.vue";
import PreviewFab from "@/components/layout/PreviewFab.vue";
import ResponsivePanelTabs from "@/components/layout/ResponsivePanelTabs.vue";
import EditorTabBar from "@/components/editor/EditorTabBar.vue";
import PwaInstallBanner from "@/components/layout/PwaInstallBanner.vue";
import { useAppDialog } from "@/composables/useAppDialog";
import { useDualScreenHost, type DualScreenState } from "@/composables/useDualScreenSession";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { useResizableSplit } from "@/composables/useResizableSplit";
import { provideAppShell, useAppShell } from "@/composables/useAppShell";

const shell = useAppShell();
provideAppShell(shell);
const { alert } = useAppDialog();

const mainRef = ref<HTMLElement | null>(null);
const editorFocused = ref(false);
const isDesktopLayout = useMediaQuery("(min-width: 901px)");

const PREVIEW_FAB_BLUR_DELAY_MS = 250;
let previewFabBlurTimer: ReturnType<typeof setTimeout> | undefined;

function onEditorFocus(): void {
  if (previewFabBlurTimer) {
    clearTimeout(previewFabBlurTimer);
    previewFabBlurTimer = undefined;
  }
  editorFocused.value = true;
}

function onEditorBlur(): void {
  if (previewFabBlurTimer) {
    clearTimeout(previewFabBlurTimer);
  }

  previewFabBlurTimer = setTimeout(() => {
    editorFocused.value = false;
    previewFabBlurTimer = undefined;
  }, PREVIEW_FAB_BLUR_DELAY_MS);
}

const {
  splitRatio,
  isDragging,
  editorPaneStyle,
  previewPaneStyle,
  onDividerPointerDown,
  onDividerPointerMove,
  onDividerPointerUp,
} = useResizableSplit(mainRef);

const {
  t,
  source,
  diagramFormat,
  layout,
  renderMode,
  diagramDarkMode,
  editorFontSize,
  editorFontFamily,
  editorSyntaxHighlight,
  editorAutocomplete,
  previewBackground,
  diagramTextColor,
  diagramFontFamily,
  diagramFontWeight,
  diagramFontStyle,
  svg,
  error,
  isRendering,
  isValidating,
  syntaxErrorLines,
  loadedFileName,
  activeMobilePanel,
  canSave,
  canExport,
  canUndo,
  canRedo,
  modals,
  editorDocuments,
  activeDocumentId,
  switchEditorTab,
  closeEditorTab,
} = shell;

function dualScreenState(): DualScreenState {
  return {
    source: source.value,
    diagramFormat: diagramFormat.value,
    layout: layout.value,
    renderMode: renderMode.value,
    diagramDarkMode: diagramDarkMode.value,
    previewBackground: previewBackground.value,
    diagramTextColor: diagramTextColor.value,
    diagramFontFamily: diagramFontFamily.value,
    diagramFontWeight: diagramFontWeight.value,
    diagramFontStyle: diagramFontStyle.value,
  };
}

const {
  detached: previewDetached,
  open: openDualScreen,
  notifyState: notifyDualScreenState,
} = useDualScreenHost({
  enabled: isDesktopLayout,
  getState: dualScreenState,
  onPreviewSettings(settings) {
    renderMode.value = settings.renderMode;
    diagramDarkMode.value = settings.diagramDarkMode;
    previewBackground.value = settings.previewBackground;
    diagramTextColor.value = settings.diagramTextColor;
    diagramFontFamily.value = settings.diagramFontFamily;
    diagramFontWeight.value = settings.diagramFontWeight;
    diagramFontStyle.value = settings.diagramFontStyle;
  },
  onBlocked() {
    void alert({
      title: t("preview.title"),
      message: t("preview.dualScreen.blocked"),
    });
  },
});

watch(
  () => [
    source.value,
    diagramFormat.value,
    layout.value,
    renderMode.value,
    diagramDarkMode.value,
    previewBackground.value,
    diagramTextColor.value,
    diagramFontFamily.value,
    diagramFontWeight.value,
    diagramFontStyle.value,
  ],
  () => {
    notifyDualScreenState();
  },
);

function showMobilePreview(): void {
  if (previewFabBlurTimer) {
    clearTimeout(previewFabBlurTimer);
    previewFabBlurTimer = undefined;
  }

  editorFocused.value = false;
  activeMobilePanel.value = "preview";
}

const showPreviewFab = computed(
  () =>
    !isDesktopLayout.value &&
    activeMobilePanel.value === "editor" &&
    editorFocused.value,
);

onMounted(shell.boot);

onUnmounted(() => {
  if (previewFabBlurTimer) {
    clearTimeout(previewFabBlurTimer);
    previewFabBlurTimer = undefined;
  }
});
</script>

<template>
  <a class="skip-link" href="#app-main">{{ t("app.mobilePanelEditor") }}</a>
  <div class="app-shell">
    <AppHeader
      @open-wizard="modals.openWizardModal"
      @open-library="modals.openLibraryModal"
      @open-settings="modals.openSettingsModal"
    />

    <ResponsivePanelTabs v-model="activeMobilePanel" />

    <EditorTabBar
      v-if="editorDocuments.length > 0"
      :documents="editorDocuments"
      :active-document-id="activeDocumentId"
      @switch="switchEditorTab"
      @close="closeEditorTab"
    />

    <main
      ref="mainRef"
      id="app-main"
      class="app-main"
      :class="[
        `mobile-panel--${activeMobilePanel}`,
        {
          'app-main--split-dragging': isDragging,
          'app-main--preview-detached': previewDetached,
        },
      ]"
    >
      <DiagramEditor
        class="split-pane split-pane--editor"
        :style="isDesktopLayout && !previewDetached ? editorPaneStyle : undefined"
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
        :can-refresh-data="shell.dataLink.canRefresh.value"
        @file-loaded="shell.onEditorFileLoaded"
        @import-error="shell.onImportError"
        @save-puml="shell.savePuml"
        @save-to-library="shell.openSaveToLibraryModal"
        @open-versions="modals.openVersionsModal"
        @validate-syntax="shell.runSyntaxValidation"
        @cleared="shell.onEditorClearedWithLink"
        @undo="shell.applySourceUndo"
        @redo="shell.applySourceRedo"
        @refresh-data="shell.dataLink.refresh()"
        @convert="modals.openConvertModal"
        @ai-patch="shell.onAiPatchRequestOpen"
        @ai-syntax-ask="shell.onAiSyntaxAskOpen()"
        @editor-focus="onEditorFocus"
        @editor-blur="onEditorBlur"
      />

      <div
        v-if="isDesktopLayout && !previewDetached"
        class="app-split-divider"
        role="separator"
        aria-orientation="vertical"
        :aria-valuenow="Math.round(splitRatio * 100)"
        aria-valuemin="25"
        aria-valuemax="75"
        :aria-label="t('app.resizePanels')"
        tabindex="0"
        @pointerdown="onDividerPointerDown"
        @pointermove="onDividerPointerMove"
        @pointerup="onDividerPointerUp"
        @pointercancel="onDividerPointerUp"
      />

      <DiagramPreview
        v-if="!previewDetached"
        class="split-pane split-pane--preview"
        :style="isDesktopLayout ? previewPaneStyle : undefined"
        :svg="svg"
        :error="error"
        :is-rendering="isRendering"
        :can-export="canExport"
        :copy-png="shell.copyPng"
        v-model:preview-background="previewBackground"
        v-model:text-color="diagramTextColor"
        v-model:diagram-font-family="diagramFontFamily"
        v-model:diagram-font-weight="diagramFontWeight"
        v-model:diagram-font-style="diagramFontStyle"
        v-model:diagram-dark-mode="diagramDarkMode"
        v-model:render-mode="renderMode"
        :expand-signal="shell.dataLink.expandSignal.value"
        :show-dual-screen="isDesktopLayout"
        @toggle-dual-screen="openDualScreen"
        @render-now="shell.renderDiagram"
        @export-svg="shell.exportSvg"
        @export-png="shell.exportPng"
      />
    </main>

    <PreviewFab :visible="showPreviewFab" @show-preview="showMobilePreview" />
    <PwaInstallBanner />

    <AppStatusBar
      :loaded-file-name="loadedFileName"
      :layout="layout"
      :render-mode="renderMode"
    />

    <AppDialogHost />
    <LibraryDataLinkImportDialog />
    <AppModalHost />
    <ClipboardDiagramPrompt
      :open="shell.clipboardDiagram.promptOpen.value"
      @close="shell.clipboardDiagram.closePrompt()"
      @read-clipboard="shell.clipboardDiagram.readFromGesture()"
    />
    <DiagramDataSourceDialog
      :open="shell.dataLink.chooserOpen.value"
      :file-path-label="shell.dataLink.filePathLabel.value"
      :sheet-range="shell.dataLink.sheetRange.value"
      :clipboard-ready="shell.dataLink.clipboardReady.value"
      :busy="shell.dataLink.busy.value"
      :error-message="shell.dataLink.errorMessage.value"
      @close="shell.dataLink.closeChooser()"
      @use-clipboard="shell.dataLink.applyFromClipboard()"
      @use-file="shell.dataLink.applyFromFile()"
    />
    <TablePasteErrorModal
      :open="shell.dataLink.pasteErrorOpen.value"
      :error="shell.dataLink.pasteError.value"
      @close="shell.dataLink.closePasteError()"
    />
    <TooltipProvider />
  </div>
</template>
