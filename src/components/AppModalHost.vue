<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import AboutModal from "@/components/AboutModal.vue";
import DiagramVersionsModal from "@/components/DiagramVersionsModal.vue";
import LlmPatchModal from "@/components/LlmPatchModal.vue";
import LlmSyntaxAskModal from "@/components/LlmSyntaxAskModal.vue";
import SyntaxResultModal from "@/components/SyntaxResultModal.vue";
import { useAppShellContext } from "@/composables/useAppShell";

const ConvertDiagramModal = defineAsyncComponent(
  () => import("@/components/ConvertDiagramModal.vue"),
);
const DiagramLibraryModal = defineAsyncComponent(
  () => import("@/components/DiagramLibraryModal.vue"),
);
const SaveToLibraryModal = defineAsyncComponent(
  () => import("@/components/SaveToLibraryModal.vue"),
);
const DiagramWizardModal = defineAsyncComponent(
  () => import("@/components/DiagramWizardModal.vue"),
);
const LlmKeysGuideModal = defineAsyncComponent(
  () => import("@/components/LlmKeysGuideModal.vue"),
);
const SettingsModal = defineAsyncComponent(
  () => import("@/components/SettingsModal.vue"),
);

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
</script>

<template>
  <SyntaxResultModal
    v-if="isSyntaxModalOpen"
    :open="isSyntaxModalOpen"
    :result="syntaxResult"
    :is-validating="isValidating"
    :show-syntax-ask="formatDefinition.supportsAiSyntaxAsk"
    @close="closeSyntaxModal"
    @ask-syntax="onSyntaxAskFromValidation"
  />

  <DiagramVersionsModal
    v-if="isVersionsModalOpen"
    :open="isVersionsModalOpen"
    :document-key="loadedFileName"
    :current-source="source"
    @close="isVersionsModalOpen = false"
    @restore="onVersionRestore"
  />

  <DiagramLibraryModal
    v-if="isLibraryModalOpen"
    :open="isLibraryModalOpen"
    :render-mode="renderMode"
    :layout="layout"
    :diagram-dark-mode="diagramDarkMode"
    @close="isLibraryModalOpen = false"
    @open-diagram="onFileLoaded"
  />

  <SaveToLibraryModal
    v-if="isSaveToLibraryModalOpen"
    :open="isSaveToLibraryModalOpen"
    :source="source"
    :file-name="loadedFileName"
    :diagram-format="diagramFormat"
    :linked-diagram-id="linkedLibraryDiagramId"
    @close="closeSaveToLibraryModal"
  />

  <SettingsModal
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

  <AboutModal
    v-if="isAboutModalOpen"
    :open="isAboutModalOpen"
    @close="isAboutModalOpen = false"
  />

  <LlmPatchModal
    v-if="isPatchModalOpen"
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
    v-if="isSyntaxAskModalOpen"
    :open="isSyntaxAskModalOpen"
    :source="source"
    :initial-question="syntaxAskInitialQuestion"
    :open-settings="openSettingsModal"
    @close="isSyntaxAskModalOpen = false"
  />

  <DiagramWizardModal
    v-if="isWizardModalOpen"
    :open="isWizardModalOpen"
    :layout="layout"
    :render-mode="renderMode"
    :diagram-dark-mode="diagramDarkMode"
    @close="isWizardModalOpen = false"
    @apply="(payload) => applyWizardDiagram(payload.source, payload.label)"
  />

  <ConvertDiagramModal
    v-if="isConvertModalOpen"
    :open="isConvertModalOpen"
    :source="source"
    :source-format="diagramFormat"
    :preview-svg="svg"
    @close="closeConvertModal"
    @apply="onConvertApply"
  />

  <LlmKeysGuideModal
    v-if="guideModalOpen"
    :open="guideModalOpen"
    :highlight-provider-id="guideProviderId"
    @close="closeLlmKeysGuide"
  />
</template>
