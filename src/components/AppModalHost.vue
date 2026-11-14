<script setup lang="ts">
import {
  APP_MODAL_COMPONENTS,
  LLM_KEYS_GUIDE_MODAL,
} from "@/app/app-modal-registry";
import DiagramVersionsDialog from "@/components/editor/DiagramVersionsDialog.vue";
import { useAppShellContext } from "@/composables/useAppShell";
import type { DiagramFormat } from "@/constants/diagram-formats";

const {
  source,
  diagramFormat,
  layout,
  renderMode,
  diagramDarkMode,
  editorFontSize,
  editorFontFamilyId,
  editorSyntaxHighlight,
  editorAutocomplete,
  editorSurfaceMode,
  svg,
  isValidating,
  syntaxResult,
  loadedFileName,
  linkedLibraryDiagramId,
  modals,
  llmKeysGuide,
  onConvertApply,
  onFileLoaded,
  applyWizardDiagram,
  applyWizardDiagramToNewTab,
  onVersionRestore,
} = useAppShellContext();

const {
  isSyntaxModalOpen,
  isVersionsModalOpen,
  isSettingsModalOpen,
  isLibraryModalOpen,
  isAboutModalOpen,
  isWizardModalOpen,
  isSaveToLibraryModalOpen,
  isConvertModalOpen,
  libraryDashboardNonce,
  openLibraryDashboard,
  openSettingsModal,
  openAboutFromSettings,
  closeSyntaxModal,
  closeSaveToLibraryModal,
  closeConvertModal,
  closeWizardModal,
} = modals;

const { guideModalOpen, guideProviderId, closeLlmKeysGuide } = llmKeysGuide;

function onWizardApply(payload: {
  source: string;
  label: string;
  format: DiagramFormat;
  target?: "current" | "new-tab";
}) {
  if (payload.target === "current") {
    applyWizardDiagram(payload.source, payload.label, payload.format);
    return;
  }
  applyWizardDiagramToNewTab(payload.source, payload.label, payload.format);
}
</script>

<template>
  <component
    :is="APP_MODAL_COMPONENTS.syntax"
    v-if="isSyntaxModalOpen"
    :open="isSyntaxModalOpen"
    :result="syntaxResult"
    :is-validating="isValidating"
    @close="closeSyntaxModal"
  />

  <DiagramVersionsDialog
    v-if="isVersionsModalOpen"
    source="local"
    :open="isVersionsModalOpen"
    :document-key="loadedFileName"
    :current-source="source"
    @close="isVersionsModalOpen = false"
    @restore="onVersionRestore"
  />

  <component
    :is="APP_MODAL_COMPONENTS.library"
    v-if="isLibraryModalOpen"
    :open="isLibraryModalOpen"
    :render-mode="renderMode"
    :layout="layout"
    :diagram-dark-mode="diagramDarkMode"
    :start-dashboard="libraryDashboardNonce"
    @close="isLibraryModalOpen = false"
    @open-diagram="onFileLoaded"
  />

  <component
    :is="APP_MODAL_COMPONENTS.saveToLibrary"
    v-if="isSaveToLibraryModalOpen"
    :open="isSaveToLibraryModalOpen"
    :source="source"
    :file-name="loadedFileName"
    :diagram-format="diagramFormat"
    :linked-diagram-id="linkedLibraryDiagramId"
    @close="closeSaveToLibraryModal"
  />

  <component
    :is="APP_MODAL_COMPONENTS.settings"
    v-if="isSettingsModalOpen"
    :open="isSettingsModalOpen"
    v-model:editor-font-size="editorFontSize"
    v-model:editor-font-family-id="editorFontFamilyId"
    v-model:editor-syntax-highlight="editorSyntaxHighlight"
    v-model:editor-autocomplete="editorAutocomplete"
    v-model:editor-surface-mode="editorSurfaceMode"
    @close="isSettingsModalOpen = false"
    @open-about="openAboutFromSettings"
  />

  <component
    :is="APP_MODAL_COMPONENTS.about"
    v-if="isAboutModalOpen"
    :open="isAboutModalOpen"
    @close="isAboutModalOpen = false"
  />

  <component
    :is="APP_MODAL_COMPONENTS.wizard"
    v-if="isWizardModalOpen"
    :open="isWizardModalOpen"
    :document-key="loadedFileName"
    :layout="layout"
    :render-mode="renderMode"
    :diagram-dark-mode="diagramDarkMode"
    @close="closeWizardModal"
    @apply="onWizardApply"
    @open-settings="openSettingsModal"
    @open-dashboard="openLibraryDashboard(); closeWizardModal()"
  />

  <component
    :is="APP_MODAL_COMPONENTS.convert"
    v-if="isConvertModalOpen"
    :open="isConvertModalOpen"
    :source="source"
    :source-format="diagramFormat"
    :preview-svg="svg"
    @close="closeConvertModal"
    @apply="onConvertApply"
  />

  <component
    :is="LLM_KEYS_GUIDE_MODAL"
    v-if="guideModalOpen"
    :open="guideModalOpen"
    :highlight-provider-id="guideProviderId"
    @close="closeLlmKeysGuide"
  />
</template>
