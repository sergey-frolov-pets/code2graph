<script setup lang="ts">
import {
  APP_MODAL_COMPONENTS,
  LLM_KEYS_GUIDE_MODAL,
} from "@/app/app-modal-registry";
import { useAppShellContext } from "@/composables/useAppShell";

const {
  source,
  diagramFormat,
  layout,
  renderMode,
  uiDarkMode,
  diagramDarkMode,
  editorFontSize,
  editorFontFamilyId,
  editorSyntaxHighlight,
  editorAutocomplete,
  svg,
  isValidating,
  syntaxResult,
  syntaxAskInitialQuestion,
  loadedFileName,
  linkedLibraryDiagramId,
  formatDefinition,
  patchSelectionStart,
  patchSelectionEnd,
  modals,
  llmKeysGuide,
  onConvertApply,
  onFileLoaded,
  onSyntaxAskFromValidation,
  applyAiPlantUml,
  applyWizardDiagram,
  onVersionRestore,
} = useAppShellContext();

const {
  isSyntaxModalOpen,
  isVersionsModalOpen,
  isSettingsModalOpen,
  isLibraryModalOpen,
  isAboutModalOpen,
  isPatchModalOpen,
  isSyntaxAskModalOpen,
  isWizardModalOpen,
  isSaveToLibraryModalOpen,
  isConvertModalOpen,
  openSettingsModal,
  openAboutFromSettings,
  closeSyntaxModal,
  closeSaveToLibraryModal,
  closeConvertModal,
} = modals;

const { guideModalOpen, guideProviderId, closeLlmKeysGuide } = llmKeysGuide;

function onPatchApply(payload: { plantuml: string; label: string }) {
  applyAiPlantUml(payload.plantuml, payload.label);
}

function onWizardApply(payload: { source: string; label: string }) {
  applyWizardDiagram(payload.source, payload.label);
}
</script>

<template>
  <component
    :is="APP_MODAL_COMPONENTS.syntax"
    v-if="isSyntaxModalOpen"
    :open="isSyntaxModalOpen"
    :result="syntaxResult"
    :is-validating="isValidating"
    :show-syntax-ask="formatDefinition.supportsAiSyntaxAsk"
    @close="closeSyntaxModal"
    @ask-syntax="onSyntaxAskFromValidation"
  />

  <component
    :is="APP_MODAL_COMPONENTS.versions"
    v-if="isVersionsModalOpen"
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

  <component
    :is="APP_MODAL_COMPONENTS.about"
    v-if="isAboutModalOpen"
    :open="isAboutModalOpen"
    @close="isAboutModalOpen = false"
  />

  <component
    :is="APP_MODAL_COMPONENTS.patch"
    v-if="isPatchModalOpen"
    :open="isPatchModalOpen"
    :source="source"
    :document-key="loadedFileName"
    :selection-start="patchSelectionStart"
    :selection-end="patchSelectionEnd"
    :layout="layout"
    :render-mode="renderMode"
    :diagram-dark-mode="diagramDarkMode"
    :open-settings="openSettingsModal"
    @close="isPatchModalOpen = false"
    @apply="onPatchApply"
  />

  <component
    :is="APP_MODAL_COMPONENTS.syntaxAsk"
    v-if="isSyntaxAskModalOpen"
    :open="isSyntaxAskModalOpen"
    :source="source"
    :initial-question="syntaxAskInitialQuestion"
    :open-settings="openSettingsModal"
    @close="isSyntaxAskModalOpen = false"
  />

  <component
    :is="APP_MODAL_COMPONENTS.wizard"
    v-if="isWizardModalOpen"
    :open="isWizardModalOpen"
    :layout="layout"
    :render-mode="renderMode"
    :diagram-dark-mode="diagramDarkMode"
    @close="isWizardModalOpen = false"
    @apply="onWizardApply"
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
