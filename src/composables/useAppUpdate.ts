import { onMounted, onUnmounted, ref } from "vue";
import { registerAppServiceWorker } from "@/pwa/serviceWorkerRegistration";

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

let waitingWorker: ServiceWorker | null = null;

export function useAppUpdate() {
  const updateAvailable = ref(false);
  let registration: ServiceWorkerRegistration | null = null;
  let checkTimer: number | null = null;

  function markUpdateAvailable(worker: ServiceWorker): void {
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

    registration.addEventListener("updatefound", () => {
      const installingWorker = registration?.installing;
      if (installingWorker) {
        trackInstallingWorker(installingWorker);
      }
    });

    try {
      await registration.update();
    } catch {
      // offline or blocked — ignore
    }
  }

  function applyUpdate(): void {
    if (!waitingWorker) {
      window.location.reload();
      return;
    }

    const reloadOnControl = (): void => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnControl, {
      once: true,
    });
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
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
