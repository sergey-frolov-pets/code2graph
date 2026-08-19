import { ref } from "vue";
import type { WizardCreationMode } from "@/constants/llm-wizard";

export function useAppModals() {
  const isSyntaxModalOpen = ref(false);
  const isVersionsModalOpen = ref(false);
  const isSettingsModalOpen = ref(false);
  const isLibraryModalOpen = ref(false);
  const isAboutModalOpen = ref(false);
  const isPatchModalOpen = ref(false);
  const isSyntaxAskModalOpen = ref(false);
  const isWizardModalOpen = ref(false);
  const isSaveToLibraryModalOpen = ref(false);
  const isConvertModalOpen = ref(false);
  const wizardInitialCreationMode = ref<WizardCreationMode | null>(null);

  return {
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
    wizardInitialCreationMode,
    openVersionsModal: () => {
      isVersionsModalOpen.value = true;
    },
    openSettingsModal: () => {
      isSettingsModalOpen.value = true;
    },
    openLibraryModal: () => {
      isLibraryModalOpen.value = true;
    },
    openWizardModal: () => {
      wizardInitialCreationMode.value = null;
      isWizardModalOpen.value = true;
    },
    openCodeGraphWizardModal: () => {
      wizardInitialCreationMode.value = "fromCode";
      isWizardModalOpen.value = true;
    },
    closeWizardModal: () => {
      isWizardModalOpen.value = false;
      wizardInitialCreationMode.value = null;
    },
    openSyntaxAskModal: () => {
      isSyntaxAskModalOpen.value = true;
    },
    openSaveToLibraryModal: () => {
      isSaveToLibraryModalOpen.value = true;
    },
    openConvertModal: () => {
      isConvertModalOpen.value = true;
    },
    openAboutFromSettings: () => {
      isSettingsModalOpen.value = false;
      isAboutModalOpen.value = true;
    },
    closeSyntaxModal: () => {
      isSyntaxModalOpen.value = false;
    },
    closeSaveToLibraryModal: () => {
      isSaveToLibraryModalOpen.value = false;
    },
    closeConvertModal: () => {
      isConvertModalOpen.value = false;
    },
  };
}
