import { ref } from "vue";

export function useAppModals() {
  const isSyntaxModalOpen = ref(false);
  const isVersionsModalOpen = ref(false);
  const isSettingsModalOpen = ref(false);
  const isLibraryModalOpen = ref(false);
  const isAboutModalOpen = ref(false);
  const isPatchModalOpen = ref(false);
  const isSyntaxAskModalOpen = ref(false);
  const isWizardModalOpen = ref(false);

  return {
    isSyntaxModalOpen,
    isVersionsModalOpen,
    isSettingsModalOpen,
    isLibraryModalOpen,
    isAboutModalOpen,
    isPatchModalOpen,
    isSyntaxAskModalOpen,
    isWizardModalOpen,
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
      isWizardModalOpen.value = true;
    },
    openSyntaxAskModal: () => {
      isSyntaxAskModalOpen.value = true;
    },
    openAboutFromSettings: () => {
      isSettingsModalOpen.value = false;
      isAboutModalOpen.value = true;
    },
    closeSyntaxModal: () => {
      isSyntaxModalOpen.value = false;
    },
  };
}
