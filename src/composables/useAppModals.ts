import { ref } from "vue";
import { isFeatureAllowed } from "@/composables/useFeatureGate";

export function useAppModals() {
  const isSyntaxModalOpen = ref(false);
  const isVersionsModalOpen = ref(false);
  const isSettingsModalOpen = ref(false);
  const isLibraryModalOpen = ref(false);
  const isAboutModalOpen = ref(false);
  const isWizardModalOpen = ref(false);
  const isSaveToLibraryModalOpen = ref(false);
  const isConvertModalOpen = ref(false);

  return {
    isSyntaxModalOpen,
    isVersionsModalOpen,
    isSettingsModalOpen,
    isLibraryModalOpen,
    isAboutModalOpen,
    isWizardModalOpen,
    isSaveToLibraryModalOpen,
    isConvertModalOpen,
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
      if (!isFeatureAllowed("editor.wizard")) {
        return;
      }
      isWizardModalOpen.value = true;
    },
    closeWizardModal: () => {
      isWizardModalOpen.value = false;
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
