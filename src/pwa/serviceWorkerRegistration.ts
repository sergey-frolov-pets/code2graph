declare global {
  interface Window {
    __pwaSwRegistrationError?: string | null;
  }
}

const SW_SCRIPT = "sw.js";
const REGISTRATION_TIMEOUT_MS = 10_000;

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function resolveServiceWorkerUrl(): string {
  const url = new URL(SW_SCRIPT, window.location.href);
  url.searchParams.set("v", __APP_VERSION__);
  return url.href;
}

export function resolveServiceWorkerScope(): string {
  return new URL("./", window.location.href).href;
}

export function canRegisterServiceWorker(): boolean {
  return "serviceWorker" in navigator && window.location.protocol !== "file:";
}

export function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!canRegisterServiceWorker()) {
    return Promise.resolve(null);
  }

  if (!registrationPromise) {
    registrationPromise = registerWithFallback();
  }

  return registrationPromise;
}

async function registerWithFallback(): Promise<ServiceWorkerRegistration | null> {
  const attempts = [
    {
      scriptUrl: resolveServiceWorkerUrl(),
      scope: resolveServiceWorkerScope(),
    },
    {
      scriptUrl: new URL(`/${SW_SCRIPT}`, window.location.origin).href,
      scope: new URL("/", window.location.origin).href,
    },
  ];

  let lastError = "unknown";

  for (const attempt of attempts) {
    try {
      const registration = await navigator.serviceWorker.register(attempt.scriptUrl, {
        scope: attempt.scope,
        updateViaCache: "none",
      });
      window.__pwaSwRegistrationError = null;
      return registration;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  window.__pwaSwRegistrationError = lastError;
  return null;
}

export async function waitForServiceWorkerControl(
  timeoutMs = REGISTRATION_TIMEOUT_MS,
): Promise<boolean> {
  const registration = await registerAppServiceWorker();
  if (!registration) {
    return false;
  }

  if (navigator.serviceWorker.controller) {
    return true;
  }

  try {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
  } catch {
    // still check active worker below
  }

  return Boolean(navigator.serviceWorker.controller ?? registration.active);
}
