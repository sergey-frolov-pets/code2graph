// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import DiagramToolbar from "@/components/DiagramToolbar.vue";

function mountPreviewToolbar() {
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
