import { APP_LINKS } from "@/constants";
import type { TranslateFn } from "@/locales/types";

export type PwaInstallPlatform = "ios" | "android" | "desktop" | "unknown";

export type ServiceWorkerState = "unsupported" | "none" | "registered" | "controlling";

export interface PwaInstallStatus {
  secureContext: boolean;
  protocol: string;
  serviceWorker: ServiceWorkerState;
  manifestLinked: boolean;
  hasDeferredPrompt: boolean;
  isStandalone: boolean;
  relatedAppInstalled: boolean;
  platform: PwaInstallPlatform;
  supportsBeforeInstallPrompt: boolean;
}

export function detectPwaInstallPlatform(): PwaInstallPlatform {
  const userAgent = navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return "ios";
  }

  if (/Android/i.test(userAgent)) {
    return "android";
  }

  if (/Windows|Macintosh|Linux|CrOS/.test(userAgent)) {
    return "desktop";
  }

  return "unknown";
}

export function supportsBeforeInstallPromptEvent(): boolean {
  return (
    /Chrome|Chromium|Edg|OPR|SamsungBrowser/i.test(navigator.userAgent) &&
    !/Firefox|FxiOS/i.test(navigator.userAgent)
  );
}

export async function getServiceWorkerState(): Promise<ServiceWorkerState> {
  if (!("serviceWorker" in navigator)) {
    return "unsupported";
  }

  try {
    const scope = new URL("./", window.location.href).href;
    const registration =
      (await navigator.serviceWorker.getRegistration(scope)) ??
      (await navigator.serviceWorker.getRegistration("/")) ??
      (await navigator.serviceWorker.getRegistration());

    if (!registration) {
      return "none";
    }

    if (navigator.serviceWorker.controller) {
      return "controlling";
    }

    return "registered";
  } catch {
    return "none";
  }
}

export async function inspectPwaInstallStatus(options: {
  hasDeferredPrompt: boolean;
  relatedAppInstalled: boolean;
  isStandalone: boolean;
}): Promise<PwaInstallStatus> {
  return {
    secureContext: window.isSecureContext,
    protocol: window.location.protocol,
    serviceWorker: await getServiceWorkerState(),
    manifestLinked: Boolean(
      document.querySelector('link[rel="manifest"]'),
    ),
    hasDeferredPrompt: options.hasDeferredPrompt,
    isStandalone: options.isStandalone,
    relatedAppInstalled: options.relatedAppInstalled,
    platform: detectPwaInstallPlatform(),
    supportsBeforeInstallPrompt: supportsBeforeInstallPromptEvent(),
  };
}

function isSslCertificateError(error: string | null | undefined): boolean {
  if (!error) {
    return false;
  }

  return /ssl certificate/i.test(error);
}

export function buildManualInstallMessage(
  status: PwaInstallStatus,
  t: TranslateFn,
): string {
  if (!status.secureContext) {
    return t("pwa.httpOnly");
  }

  if (status.isStandalone || status.relatedAppInstalled) {
    return t("pwa.alreadyInstalledMessage");
  }

  if (status.platform === "ios") {
    return t("pwa.iosManual");
  }

  if (!status.supportsBeforeInstallPrompt) {
    return t("pwa.browserUnsupported");
  }

  if (status.serviceWorker === "none") {
    const swError = window.__pwaSwRegistrationError;

    if (isSslCertificateError(swError)) {
      return t("pwa.sslError", { url: APP_LINKS.githubPages });
    }

    const errorHint = swError
      ? `\n\n${t("pwa.swRegistrationError", { error: swError })}`
      : "";

    return `${t("pwa.swNotRegistered")}${errorHint}`;
  }

  if (status.serviceWorker === "registered") {
    return t("pwa.swNotActive");
  }

  return t("pwa.chromeNoPrompt");
}
