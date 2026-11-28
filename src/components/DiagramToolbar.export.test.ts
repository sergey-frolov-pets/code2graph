// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import DiagramToolbar from "@/components/DiagramToolbar.vue";
import { SVG_QUALITY_DEBOUNCE_MS } from "@/composables/useSvgQuality";

function mountPreviewToolbar(extra: { svg?: string } = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp({
    setup() {
      return () =>
        h(DiagramToolbar, {
          isRendering: false,
          canExport: true,
          previewBackground: "#ffffff",
          zoomPercent: 100,
          copyPng: () => Promise.resolve(false),
          presentationEnabled: false,
          presentationOpen: false,
          ...extra,
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

describe("DiagramToolbar export actions", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("puts SVG, PNG and copy on the preview toolbar as buttons", async () => {
    const view = mountPreviewToolbar();
    await nextTick();
    const toolbar = view.host.querySelector(".preview-toolbar");
    const exportGroup = toolbar?.querySelector(".preview-toolbar__export");
    expect(toolbar?.querySelector('[role="menu"]')).toBeNull();
    expect(exportGroup?.getAttribute("role")).toBe("group");
    for (const testId of ["preview-export-svg", "preview-export-png", "preview-copy-png"]) {
      const button = exportGroup?.querySelector(`[data-testid="${testId}"]`);
      expect(button?.tagName).toBe("BUTTON");
      expect((button as HTMLButtonElement | null)?.disabled).toBe(false);
    }
    view.unmount();
  });
});

describe("DiagramToolbar quality badge", () => {
  const HEALTHY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><rect x="10" y="10" width="80" height="40" fill="#fff" stroke="#000"/><text x="20" y="35" font-size="12">Start</text></svg>`;
  const DUPLICATE_IDS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><rect id="node" x="10" y="10" width="80" height="40" fill="#fff" stroke="#000"/><rect id="node" x="110" y="10" width="80" height="40" fill="#fff" stroke="#000"/></svg>`;

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("без SVG бейджа нет, экспорт доступен", async () => {
    const view = mountPreviewToolbar();
    await nextTick();

    expect(view.host.querySelector('[data-testid="preview-quality-badge"]')).toBeNull();
    view.unmount();
  });

  it("здоровая диаграмма — бейдж 6/6, экспорт доступен", async () => {
    vi.useFakeTimers();
    const view = mountPreviewToolbar({ svg: HEALTHY });
    await nextTick();
    vi.advanceTimersByTime(SVG_QUALITY_DEBOUNCE_MS + 10);
    await nextTick();

    const badge = view.host.querySelector('[data-testid="preview-quality-badge"]');
    expect(badge?.textContent).toContain("6/6");
    const svgButton = view.host.querySelector<HTMLButtonElement>('[data-testid="preview-export-svg"]');
    expect(svgButton?.disabled).toBe(false);
    view.unmount();
  });

  it("ломающая проверка блокирует экспорт", async () => {
    vi.useFakeTimers();
    const view = mountPreviewToolbar({ svg: DUPLICATE_IDS });
    await nextTick();
    vi.advanceTimersByTime(SVG_QUALITY_DEBOUNCE_MS + 10);
    await nextTick();

    expect(view.host.querySelector(".quality-badge--fail")).not.toBeNull();
    for (const testId of ["preview-export-svg", "preview-export-png", "preview-copy-png"]) {
      const button = view.host.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
      expect(button?.disabled).toBe(true);
    }
    view.unmount();
  });
});
