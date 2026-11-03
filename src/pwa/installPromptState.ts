import { ref } from "vue";

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __deferredPwaInstallPrompt?: InstallPromptEvent | null;
    __pwaSwRegistrationError?: string | null;
  }

  interface WindowEventMap {
    "pwa-installprompt": Event;
    "pwa-installed": Event;
  }
}

export const deferredInstallPrompt = ref<InstallPromptEvent | null>(null);
export const isRelatedAppInstalled = ref(false);
export const isRelatedAppCheckDone = ref(false);
export const installCompletedThisSession = ref(false);

export function isStandaloneApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isFileProtocol(): boolean {
  return window.location.protocol === "file:";
}

export function isPwaInstallSupported(): boolean {
  return window.isSecureContext && !isFileProtocol();
}

function captureInstallPrompt(event: Event): void {
  event.preventDefault();
  const installEvent = event as InstallPromptEvent;
  window.__deferredPwaInstallPrompt = installEvent;
  isRelatedAppInstalled.value = false;
  installCompletedThisSession.value = false;
  deferredInstallPrompt.value = installEvent;
}

function syncEarlyInstallPrompt(): void {
  const earlyPrompt = window.__deferredPwaInstallPrompt;
  if (earlyPrompt) {
    deferredInstallPrompt.value = earlyPrompt;
  }
}

export async function checkRelatedInstalledApps(): Promise<boolean> {
  const getInstalledRelatedApps = (
    navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<unknown[]>;
    }
  ).getInstalledRelatedApps;

  if (!getInstalledRelatedApps) {
    return false;
  }

  try {
    const relatedApps = await getInstalledRelatedApps.call(navigator);
    return relatedApps.length > 0;
  } catch {
    return false;
  }
}

export async function refreshRelatedAppInstalledState(): Promise<boolean> {
  const installed = await checkRelatedInstalledApps();
  isRelatedAppInstalled.value = installed;
  isRelatedAppCheckDone.value = true;
  return installed;
}

export function initInstallPromptCapture(): void {
  if (!isPwaInstallSupported()) {
    isRelatedAppCheckDone.value = true;
    return;
  }

  syncEarlyInstallPrompt();
  void refreshRelatedAppInstalledState();

  window.addEventListener("beforeinstallprompt", captureInstallPrompt);
  window.addEventListener("pwa-installprompt", syncEarlyInstallPrompt);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncEarlyInstallPrompt();
      void refreshRelatedAppInstalledState();
    }
  });

  window.addEventListener("appinstalled", () => {
    isRelatedAppInstalled.value = true;
    installCompletedThisSession.value = true;
    deferredInstallPrompt.value = null;
    window.__deferredPwaInstallPrompt = null;
  });

  window.addEventListener("pwa-installed", () => {
    isRelatedAppInstalled.value = true;
    installCompletedThisSession.value = true;
    deferredInstallPrompt.value = null;
    window.__deferredPwaInstallPrompt = null;
  });

  const standaloneMedia = window.matchMedia("(display-mode: standalone)");
  standaloneMedia.addEventListener("change", () => {
    if (isStandaloneApp()) {
      deferredInstallPrompt.value = null;
      window.__deferredPwaInstallPrompt = null;
    }
  });
}
