import { onMounted, onUnmounted, ref } from "vue";
import { registerAppServiceWorker } from "@/pwa/serviceWorkerRegistration";

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
export const UPDATE_RELOAD_FALLBACK_MS = 1_500;
const SKIP_WAITING_MESSAGE = { type: "SKIP_WAITING" } as const;

function defaultReload(): void {
  window.location.reload();
}

export function useAppUpdate(reloadPage: () => void = defaultReload) {
  const updateAvailable = ref(false);
  let registration: ServiceWorkerRegistration | null = null;
  let checkTimer: number | null = null;
  let updateListenerBound = false;
  let waitingWorker: ServiceWorker | null = null;
  let updateInProgress = false;

  function markUpdateAvailable(worker: ServiceWorker): void {
    if (updateInProgress) {
      return;
    }
    waitingWorker = worker;
    updateAvailable.value = true;
  }

  function trackInstallingWorker(worker: ServiceWorker): void {
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        markUpdateAvailable(worker);
      }
    });
  }

  async function checkForUpdates(): Promise<void> {
    registration = await registerAppServiceWorker();
    if (!registration) {
      return;
    }

    if (registration.waiting && navigator.serviceWorker.controller) {
      markUpdateAvailable(registration.waiting);
    }

    if (!updateListenerBound) {
      updateListenerBound = true;
      registration.addEventListener("updatefound", () => {
        const installingWorker = registration?.installing;
        if (installingWorker) {
          trackInstallingWorker(installingWorker);
        }
      });
    }

    try {
      await registration.update();
    } catch {
      // offline or blocked — ignore
    }
  }

  function applyUpdate(): void {
    updateInProgress = true;
    updateAvailable.value = false;

    const worker = waitingWorker;
    const alreadyActive =
      !worker || worker.state === "activated" || worker.state === "redundant";
    if (alreadyActive) {
      reloadPage();
      return;
    }

    let reloaded = false;
    const reloadOnce = (): void => {
      if (reloaded) {
        return;
      }
      reloaded = true;
      reloadPage();
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnce, {
      once: true,
    });
    window.setTimeout(reloadOnce, UPDATE_RELOAD_FALLBACK_MS);

    try {
      worker.postMessage(SKIP_WAITING_MESSAGE);
    } catch {
      reloadOnce();
    }
  }

  function dismissUpdate(): void {
    updateAvailable.value = false;
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === "visible") {
      void checkForUpdates();
    }
  }

  onMounted(() => {
    void checkForUpdates();
    document.addEventListener("visibilitychange", onVisibilityChange);
    checkTimer = window.setInterval(() => {
      void checkForUpdates();
    }, UPDATE_CHECK_INTERVAL_MS);
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    if (checkTimer !== null) {
      window.clearInterval(checkTimer);
    }
  });

  return {
    updateAvailable,
    applyUpdate,
    dismissUpdate,
  };
}
