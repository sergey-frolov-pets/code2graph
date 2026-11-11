// @vitest-environment jsdom

import { computed, createApp, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import DiagramToolbar from "@/components/DiagramToolbar.vue";
import { presentationSessionKey, type PresentationSession } from "@/components/preview/presentation-session";
import { useLocale } from "@/composables/useLocale";

function mountPlaybackToolbar(options: {
  presentationOpen?: boolean;
  viewpointCount?: number;
}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const pause = vi.fn();
  const goToViewpoint = vi.fn();
  const viewpointCount = options.viewpointCount ?? 2;
  const session = {
    currentTrack: computed(() => ({
      viewpoints: Array.from({ length: viewpointCount }, (_, index) => ({ id: `point-${index}` })),
    })),
    playback: {
      playing: ref(false),
      pause,
      goToViewpoint,
      togglePlay: vi.fn(),
      step: vi.fn(),
    },
  } as unknown as PresentationSession;

  const app = createApp({
    setup() {
      return () =>
        h(DiagramToolbar, {
          isRendering: false,
          canExport: true,
          previewBackground: "#ffffff",
          copyPng: () => Promise.resolve(false),
          presentationEnabled: true,
          presentationOpen: options.presentationOpen ?? false,
        });
    },
  });
  app.provide(presentationSessionKey, session);
  app.mount(host);

  return {
    host,
    pause,
    goToViewpoint,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("DiagramToolbar animation transport", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns playback to the first point from the preview toolbar", async () => {
    useLocale().setLocale("en");
    const view = mountPlaybackToolbar({});
    await nextTick();

    const transport = view.host.querySelector(".preview-toolbar__transport");
    const first = transport?.querySelector(
      '[aria-label="Back to the first point"]',
    ) as HTMLButtonElement | null;
    expect(first?.tagName).toBe("BUTTON");
    expect(first?.disabled).toBe(false);
    expect(transport?.querySelector('[aria-label="Back"]')).not.toBeNull();
    expect(transport?.querySelector('[aria-label="Play"]')).not.toBeNull();

    first?.click();
    await nextTick();

    expect(view.pause).toHaveBeenCalledOnce();
    expect(view.goToViewpoint).toHaveBeenCalledWith(0);
    view.unmount();
  });

  it("hides the first-point button while the presentation panel is open", async () => {
    useLocale().setLocale("en");
    const view = mountPlaybackToolbar({ presentationOpen: true });
    await nextTick();

    expect(view.host.querySelector(".preview-toolbar__transport")).toBeNull();
    view.unmount();
  });
});
