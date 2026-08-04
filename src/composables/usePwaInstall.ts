import { computed } from "vue";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import {
  buildManualInstallMessage,
  inspectPwaInstallStatus,
} from "@/pwa/installability";
import {
  registerAppServiceWorker,
  waitForServiceWorkerControl,
} from "@/pwa/serviceWorkerRegistration";
import {
  deferredInstallPrompt,
  isFileProtocol,
  isPwaInstallSupported,
  isRelatedAppInstalled,
  isStandaloneApp,
  installCompletedThisSession,
  refreshRelatedAppInstalledState,
} from "@/pwa/installPromptState";
import { isPwaInstallInProgress } from "@/pwa/pwaInstallState";

export function usePwaInstall() {
  const { alert } = useAppDialog();
  const { t } = useLocale();

  const isAlreadyInstalled = computed(
    () =>
      isRelatedAppInstalled.value || installCompletedThisSession.value,
  );

  const canShowInstallButton = computed(
    () => !isFileProtocol() && !isStandaloneApp(),
  );

  const canInstallNow = computed(
    () => isPwaInstallSupported() && deferredInstallPrompt.value !== null,
  );

  const needsHttps = computed(
    () => !isFileProtocol() && !isPwaInstallSupported(),
  );

  async function showManualInstallHelp(): Promise<void> {
    syncEarlyPrompt();
    await registerAppServiceWorker();
    await waitForServiceWorkerControl();
    const installed = await refreshRelatedAppInstalledState();
    const status = await inspectPwaInstallStatus({
      hasDeferredPrompt: deferredInstallPrompt.value !== null,
      relatedAppInstalled: installed || isAlreadyInstalled.value,
      isStandalone: isStandaloneApp(),
    });

    const message = buildManualInstallMessage(status, t);
    await alert({
      title: t("pwa.manualTitle"),
      message,
    });
  }

  function syncEarlyPrompt(): void {
    const earlyPrompt = window.__deferredPwaInstallPrompt;
    if (earlyPrompt && !deferredInstallPrompt.value) {
      deferredInstallPrompt.value = earlyPrompt;
    }
  }

  async function installApp(): Promise<void> {
    if (isPwaInstallInProgress.value) {
      return;
    }

    isPwaInstallInProgress.value = true;

    try {
      if (!isPwaInstallSupported()) {
        await alert({
          title: t("pwa.httpsRequiredTitle"),
          message: t("pwa.httpsSetup"),
          variant: "error",
        });
        return;
      }

      syncEarlyPrompt();
      await registerAppServiceWorker();
      await waitForServiceWorkerControl();

      const promptEvent = deferredInstallPrompt.value;
      if (promptEvent) {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;

        if (choice.outcome === "accepted") {
          isRelatedAppInstalled.value = true;
          installCompletedThisSession.value = true;
        }

        deferredInstallPrompt.value = null;
        window.__deferredPwaInstallPrompt = null;
        return;
      }

      const installed = await refreshRelatedAppInstalledState();
      if (installed || isAlreadyInstalled.value) {
        await alert({
          title: t("pwa.alreadyInstalledTitle"),
          message: t("pwa.alreadyInstalledMessage"),
        });
        return;
      }

      await showManualInstallHelp();
    } catch {
      await alert({
        title: t("pwa.installErrorTitle"),
        message: t("pwa.installError"),
        variant: "error",
      });
    } finally {
      isPwaInstallInProgress.value = false;
    }
  }

  return {
    canShowInstallButton,
    canInstallNow,
    needsHttps,
    isAlreadyInstalled,
    isInstalling: isPwaInstallInProgress,
    installApp,
  };
}
