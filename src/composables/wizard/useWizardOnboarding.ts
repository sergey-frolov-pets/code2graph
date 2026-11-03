import { ref } from "vue";
import {
  STORAGE_KEY_WIZARD_FOLD_ONBOARDING_DISMISSED,
  STORAGE_KEY_WIZARD_ONBOARDING_DISMISSED,
} from "@/constants/wizard-settings";
import {
  readStorageBoolean,
  writeStorageItem,
} from "@/core/safe-storage";

export function useWizardOnboarding() {
  const showWizardBanner = ref(
    readStorageBoolean(STORAGE_KEY_WIZARD_ONBOARDING_DISMISSED) !== true,
  );

  function dismissWizardBanner(): void {
    writeStorageItem(STORAGE_KEY_WIZARD_ONBOARDING_DISMISSED, "true");
    showWizardBanner.value = false;
  }

  return {
    showWizardBanner,
    dismissWizardBanner,
  };
}

const showFoldOnboarding = ref(false);

export function useEditorFoldOnboarding() {
  function maybeShowAfterWizardApply(): void {
    if (readStorageBoolean(STORAGE_KEY_WIZARD_FOLD_ONBOARDING_DISMISSED) === true) {
      return;
    }

    showFoldOnboarding.value = true;
  }

  function dismissFoldOnboarding(): void {
    writeStorageItem(STORAGE_KEY_WIZARD_FOLD_ONBOARDING_DISMISSED, "true");
    showFoldOnboarding.value = false;
  }

  return {
    showFoldOnboarding,
    maybeShowAfterWizardApply,
    dismissFoldOnboarding,
  };
}
