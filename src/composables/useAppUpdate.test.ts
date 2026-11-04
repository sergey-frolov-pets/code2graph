// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { registerAppServiceWorker } = vi.hoisted(() => ({
  registerAppServiceWorker: vi.fn(),
}));

vi.mock("@/pwa/serviceWorkerRegistration", () => ({
  registerAppServiceWorker,
}));

vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onMounted(hook: () => void) {
      hook();
    },
    onUnmounted() {},
  };
});

import { UPDATE_RELOAD_FALLBACK_MS, useAppUpdate } from "@/composables/useAppUpdate";

class FakeWorker extends EventTarget {
  state: ServiceWorkerState;
  postMessage = vi.fn();

  constructor(state: ServiceWorkerState) {
    super();
    this.state = state;
  }
}

function installServiceWorker(worker: FakeWorker | null) {
  const listeners = new Map<string, Set<EventListener>>();
  const serviceWorker = {
    controller: {} as ServiceWorker,
    addEventListener(type: string, listener: EventListener) {
      const bucket = listeners.get(type) ?? new Set<EventListener>();
      bucket.add(listener);
      listeners.set(type, bucket);
    },
    dispatch(type: string) {
      for (const listener of listeners.get(type) ?? []) {
        listener(new Event(type));
      }
    },
  };

  registerAppServiceWorker.mockResolvedValue({
    waiting: worker,
    installing: null,
    addEventListener: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  });

  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: serviceWorker,
  });

  return serviceWorker;
}

describe("useAppUpdate", () => {
  const reload = vi.fn();

  afterEach(() => {
    reload.mockReset();
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it("reloads when the waiting worker takes control", async () => {
    const worker = new FakeWorker("installed");
    const serviceWorker = installServiceWorker(worker);

    const { updateAvailable, applyUpdate } = useAppUpdate(reload);
    await vi.waitFor(() => expect(updateAvailable.value).toBe(true));

    applyUpdate();

    expect(updateAvailable.value).toBe(false);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(reload).not.toHaveBeenCalled();

    serviceWorker.dispatch("controllerchange");

    expect(reload).toHaveBeenCalledOnce();
  });

  it("reloads immediately when the new worker is already active", async () => {
    const worker = new FakeWorker("activated");
    installServiceWorker(worker);

    const { updateAvailable, applyUpdate } = useAppUpdate(reload);
    await vi.waitFor(() => expect(updateAvailable.value).toBe(true));

    applyUpdate();

    expect(updateAvailable.value).toBe(false);
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("reloads if the worker never takes control", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker("installed");
    installServiceWorker(worker);

    const { updateAvailable, applyUpdate } = useAppUpdate(reload);
    await vi.waitFor(() => expect(updateAvailable.value).toBe(true));

    applyUpdate();
    expect(reload).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(UPDATE_RELOAD_FALLBACK_MS - 1);
    expect(reload).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("service worker update prompt", () => {
  it("waits for SKIP_WAITING instead of activating during install", () => {
    const source = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    const installHandler = source.slice(
      source.indexOf('addEventListener("install"'),
      source.indexOf('addEventListener("activate"'),
    );

    expect(installHandler).not.toContain("skipWaiting");
    expect(source).toContain("event.waitUntil(self.skipWaiting())");
  });
});
