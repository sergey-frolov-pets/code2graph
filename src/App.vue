<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AppDialogHost from "@/components/AppDialogHost.vue";
import AppModalHost from "@/components/AppModalHost.vue";
import TooltipProvider from "@/components/ui/TooltipProvider.vue";
import DiagramEditor from "@/components/DiagramEditor.vue";
import DiagramPreview from "@/components/DiagramPreview.vue";
import AppHeader from "@/components/layout/AppHeader.vue";
import AppStatusBar from "@/components/layout/AppStatusBar.vue";
import PreviewFab from "@/components/layout/PreviewFab.vue";
import PwaInstallBanner from "@/components/layout/PwaInstallBanner.vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import { useResizableSplit } from "@/composables/useResizableSplit";
import { provideAppShell, useAppShell } from "@/composables/useAppShell";

const shell = useAppShell();
provideAppShell(shell);

const mainRef = ref<HTMLElement | null>(null);
const editorFocused = ref(false);
const isDesktopLayout = useMediaQuery("(min-width: 901px)");

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
} = shell;

const showPreviewFab = computed(
  () =>
    !isDesktopLayout.value &&
    activeMobilePanel.value === "editor" &&
    editorFocused.value,
);

onMounted(shell.boot);
</script>

<template>
  <a class="skip-link" href="#app-main">{{ t("app.mobilePanelEditor") }}</a>
  <div class="app-shell">
    <AppHeader
      @open-wizard="modals.openWizardModal"
      @open-library="modals.openLibraryModal"
      @open-settings="modals.openSettingsModal"
    />

    <div class="mobile-panel-tabs" role="tablist" :aria-label="t('app.mainNav')">
      <button
        type="button"
        class="mobile-panel-tabs__btn"
        :class="{ 'is-active': activeMobilePanel === 'editor' }"
        role="tab"
        :aria-selected="activeMobilePanel === 'editor'"
        @click="activeMobilePanel = 'editor'"
      >
        {{ t("app.mobilePanelEditor") }}
      </button>
      <button
        type="button"
        class="mobile-panel-tabs__btn"
        :class="{ 'is-active': activeMobilePanel === 'preview' }"
        role="tab"
        :aria-selected="activeMobilePanel === 'preview'"
        @click="activeMobilePanel = 'preview'"
      >
        {{ t("app.mobilePanelPreview") }}
      </button>
    </div>

    <main
      ref="mainRef"
      id="app-main"
      class="app-main"
      :class="[
        `mobile-panel--${activeMobilePanel}`,
        { 'app-main--split-dragging': isDragging },
      ]"
    >
      <DiagramEditor
        class="split-pane split-pane--editor"
        :style="isDesktopLayout ? editorPaneStyle : undefined"
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
        @file-loaded="shell.onEditorFileLoaded"
        @import-error="shell.onImportError"
        @save-puml="shell.savePuml"
        @save-to-library="shell.openSaveToLibraryModal"
        @open-versions="modals.openVersionsModal"
        @validate-syntax="shell.runSyntaxValidation"
        @cleared="shell.onEditorClearedWithLink"
        @undo="shell.applySourceUndo"
        @redo="shell.applySourceRedo"
        @convert="modals.openConvertModal"
        @ai-patch="shell.onAiPatchRequestOpen"
        @ai-syntax-ask="shell.onAiSyntaxAskOpen()"
        @editor-focus="editorFocused = true"
        @editor-blur="editorFocused = false"
      />

      <div
        v-if="isDesktopLayout"
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
        class="split-pane split-pane--preview"
        :style="isDesktopLayout ? previewPaneStyle : undefined"
        :svg="svg"
        :error="error"
        :is-rendering="isRendering"
        :can-export="canExport"
        v-model:preview-background="previewBackground"
        v-model:diagram-dark-mode="diagramDarkMode"
        v-model:render-mode="renderMode"
        @render-now="shell.renderDiagram"
        @export-svg="shell.exportSvg"
        @export-png="shell.exportPng"
      />
    </main>

    <PreviewFab :visible="showPreviewFab" @show-preview="activeMobilePanel = 'preview'" />
    <PwaInstallBanner />

    <AppStatusBar
      :loaded-file-name="loadedFileName"
      :layout="layout"
      :render-mode="renderMode"
    />

    <AppDialogHost />
    <AppModalHost />
    <TooltipProvider />
  </div>
</template>
