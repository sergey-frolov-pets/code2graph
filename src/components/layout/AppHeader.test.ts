// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const { default: AppHeader } = await import("@/components/layout/AppHeader.vue");

function mountAppHeader(onOpenWizard = () => {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const app = createApp({
    setup() {
      return () =>
        h(AppHeader, {
          onOpenWizard,
        });
    },
  });

  app.mount(host);

  return {
    host,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("AppHeader new diagram button", () => {
  let mounted: ReturnType<typeof mountAppHeader> | null = null;

  afterEach(() => {
    mounted?.unmount();
    mounted = null;
    document.body.innerHTML = "";
  });

  it("renders a green new diagram button with a white plus icon and emits openWizard", async () => {
    const onOpenWizard = vi.fn();
    mounted = mountAppHeader(onOpenWizard);
    await nextTick();

    const button = mounted.host.querySelector<HTMLButtonElement>(
      "button.app-header__icon-btn--new-diagram",
    );
    expect(button).not.toBeNull();
    expect(button!.classList.contains("btn-success")).toBe(true);

    const plusIcon = button!.querySelector("svg.action-icon");
    expect(plusIcon).not.toBeNull();

    button!.click();
    expect(onOpenWizard).toHaveBeenCalledTimes(1);
  });
});
