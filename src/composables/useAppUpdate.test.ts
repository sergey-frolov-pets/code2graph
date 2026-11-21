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
import { stampServiceWorker } from "../../scripts/lib/single-html-core.mjs";

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
    dispatch(type: string, event?: Event) {
      for (const listener of listeners.get(type) ?? []) {
        listener(event ?? new Event(type));
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

  it("shows the update prompt when a newer shell was cached", async () => {
    const serviceWorker = installServiceWorker(null);

    const { updateAvailable } = useAppUpdate(reload);
    await vi.waitFor(() => expect(registerAppServiceWorker).toHaveBeenCalled());
    expect(updateAvailable.value).toBe(false);

    serviceWorker.dispatch(
      "message",
      new MessageEvent("message", { data: { type: "APP_SHELL_UPDATED" } }),
    );

    expect(updateAvailable.value).toBe(true);
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
  it("activates the new worker during install so a stuck shell can recover", () => {
    const source = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    const installHandler = source.slice(
      source.indexOf('addEventListener("install"'),
      source.indexOf('addEventListener("activate"'),
    );

    expect(installHandler).toContain("self.skipWaiting()");
    expect(source).toContain("event.waitUntil(self.skipWaiting())");
  });

  it("serves the app shell for /diagram, /local, and /samples links, including offline", () => {
    const source = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");

    expect(source).toContain('CLIPBOARD_DIAGRAM_PATH = "/diagram"');
    expect(source).toContain("LOCAL_DATA_LINK_PATH");
    expect(source).toContain("SAMPLE_PATH");
    expect(source).toContain("if (!response.ok)");
    expect(source).toContain("readCachedShell");
    expect(source).toContain("networkFirstDeploymentConfig");
    expect(source).toContain("/deployment.json");
    expect(source).toContain('cache: "no-store"');
    expect(source).toContain("/release.json");
    expect(source).toContain('cache: "reload"');
    expect(source).toContain("previous === latest");
    const precache = source.slice(source.indexOf("PRECACHE_URLS"), source.indexOf("addEventListener"));
    expect(precache).not.toContain("index.html");
    expect(source).toContain("__C2G_APP_VERSION__");
    expect(source).toContain("code2graph-precache-${APP_RELEASE}");
  });
});

describe("stampServiceWorker", () => {
  it("writes the release into the worker script", () => {
    const source = 'const APP_RELEASE = "__C2G_APP_VERSION__";';
    expect(stampServiceWorker(source, "1.2.32")).toBe('const APP_RELEASE = "1.2.32";');
  });

  it("refuses a worker without the version token", () => {
    expect(() => stampServiceWorker("const CACHE = 1;", "1.2.32")).toThrow(/version token/);
  });
});
