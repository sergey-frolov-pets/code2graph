<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import AppDialogHost from "@/components/AppDialogHost.vue";
import LibraryDataLinkImportDialog from "@/components/library/LibraryDataLinkImportDialog.vue";
import AppModalHost from "@/components/AppModalHost.vue";
import TooltipProvider from "@/components/ui/TooltipProvider.vue";
import DiagramEditor, { type EditorSurfaceMode } from "@/components/DiagramEditor.vue";
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
import { useAppRouter } from "@/composables/useAppRouter";
import DashboardEmbedView from "@/components/dashboard/DashboardEmbedView.vue";

const shell = useAppShell();
const { route } = useAppRouter();
provideAppShell(shell);
const { alert } = useAppDialog();

const mainRef = ref<HTMLElement | null>(null);
const editorFocused = ref(false);
const editorFullscreen = ref(false);
const activeSurfaceMode = ref<EditorSurfaceMode>("code");
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
  editorSurfaceMode: preferredSurfaceMode,
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
  renderOnlineOnce,
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
    // В режимах «По шагам» и «ИИ-чат» переход к превью стоит в шапке редактора.
    activeSurfaceMode.value === "code" &&
    !isDesktopLayout.value &&
    activeMobilePanel.value === "editor" &&
    (editorFocused.value || editorFullscreen.value),
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
  <DashboardEmbedView v-if="route.name === 'dashboardEmbed'" />
  <div v-else class="app-shell">
    <AppHeader
      @open-wizard="modals.openWizardModal"
      @open-library="modals.openLibraryModal"
      @open-settings="modals.openSettingsModal"
    />

    <ResponsivePanelTabs
      v-if="shell.libraryLink.mode.value === 'idle'"
      v-model="activeMobilePanel"
    />

    <EditorTabBar
      v-if="editorDocuments.length > 0"
      :documents="editorDocuments"
      :active-document-id="activeDocumentId"
      @switch="switchEditorTab"
      @close="closeEditorTab"
    />

    <main
      v-if="shell.libraryLink.mode.value !== 'idle'"
      id="app-main"
      class="app-main library-link-view"
    >
      <p
        v-if="shell.libraryLink.mode.value === 'error'"
        class="library-link-view__error"
        role="alert"
      >
        {{ shell.libraryLink.errorMessage.value }}
      </p>
      <!-- SVG is sanitized on the server before it is stored or returned. -->
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-else
        v-html="shell.libraryLink.viewSvg.value"
      />
      <!-- eslint-enable vue/no-v-html -->
    </main>

    <main
      v-else
      ref="mainRef"
      id="app-main"
      class="app-main"
      :class="[
        `mobile-panel--${activeMobilePanel}`,
        {
          'app-main--split-dragging': isDragging,
          'app-main--preview-detached': previewDetached,
          'app-main--ai-chat': activeSurfaceMode === 'ai-chat',
        },
      ]"
    >
      <DiagramEditor
        class="split-pane split-pane--editor"
        :style="isDesktopLayout && !previewDetached ? editorPaneStyle : undefined"
        v-model="source"
        v-model:diagram-format="diagramFormat"
        v-model:preferred-surface-mode="preferredSurfaceMode"
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
        :ai-document-key="loadedFileName"
        :layout="layout"
        :render-mode="renderMode"
        :diagram-dark-mode="diagramDarkMode"
        :render-error="error"
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
        @open-dashboard="modals.openLibraryDashboard()"
        @convert="modals.openConvertModal"
        @ai-apply-source="shell.applyAiPlantUml($event.source, $event.label, $event.format)"
        @open-settings="modals.openSettingsModal"
        @editor-focus="onEditorFocus"
        @editor-blur="onEditorBlur"
        @editor-fullscreen="editorFullscreen = $event"
        @surface-mode="activeSurfaceMode = $event"
        @show-preview="showMobilePreview"
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
        :expand-signal="shell.dataLink.expandSignal.value"
        :show-dual-screen="isDesktopLayout"
        :source="source"
        :diagram-format="diagramFormat"
        can-edit-presentation
        :can-undo="canUndo"
        :can-redo="canRedo"
        accept-frame-drop
        @update:source="source = $event"
        @undo="shell.applySourceUndo"
        @redo="shell.applySourceRedo"
        @import-frame="shell.openFrameDiagram"
        @toggle-dual-screen="openDualScreen"
        @render-now="shell.renderDiagram"
        @render-online="renderOnlineOnce"
        @export-svg="shell.exportSvg"
        @export-png="shell.exportPng"
      />
    </main>

    <PreviewFab :visible="showPreviewFab" @show-preview="showMobilePreview" />
    <PwaInstallBanner />

    <AppStatusBar :loaded-file-name="loadedFileName" />

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
