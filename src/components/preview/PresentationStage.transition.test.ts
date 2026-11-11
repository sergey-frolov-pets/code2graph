// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PanZoomSnapshot } from "@/services/preview/pan-zoom-types";
import type {
  NormPoint,
  PresentationTrack,
  PresentationTransition,
  Viewpoint,
} from "@/services/presentation/types";

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

const { default: PresentationStage } = await import("@/components/preview/PresentationStage.vue");

const IMAGE_SIZE = 100;
const CURRENT_VIEWPOINT = 1;
const TRAVEL_ORIGIN = 0;
const DRAG_CLIENT_X = 40;
const DRAG_CLIENT_Y = 25;

const snapshot: PanZoomSnapshot = {
  panX: 0,
  panY: 0,
  scale: 1,
  imageWidth: IMAGE_SIZE,
  imageHeight: IMAGE_SIZE,
  isDragging: false,
  isPinching: false,
};

function viewpoint(id: string, anchor: NormPoint): Viewpoint {
  return { id, anchor, scale: 1, dwellMs: 1000, effects: [] };
}

function transition(
  id: string,
  fromId: string,
  toId: string,
  path: PresentationTransition["path"],
  controls: NormPoint[],
): PresentationTransition {
  return {
    id,
    fromId,
    toId,
    durationMs: 1000,
    path,
    points: [],
    controls,
  };
}

function tour(paths: {
  first: PresentationTransition["path"];
  second: PresentationTransition["path"];
  firstControl?: NormPoint;
  secondControl?: NormPoint;
}): PresentationTrack {
  return {
    id: "tour",
    name: "Обход",
    viewpoints: [
      viewpoint("a", { x: 0, y: 0 }),
      viewpoint("b", { x: 1, y: 0 }),
      viewpoint("c", { x: 1, y: 1 }),
    ],
    transitions: [
      transition("ab", "a", "b", paths.first, paths.firstControl ? [paths.firstControl] : []),
      transition("bc", "b", "c", paths.second, paths.secondControl ? [paths.secondControl] : []),
    ],
    overlays: [],
  };
}

function mountStage(options: {
  arranging: boolean;
  editing: boolean;
  track: PresentationTrack;
  onMoveControl?: (index: number, point: NormPoint) => void;
}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp({
    setup() {
      return () => h(PresentationStage, {
        snapshot,
        track: options.track,
        arranging: options.arranging,
        editing: options.editing,
        showOverlays: true,
        viewpointIndex: CURRENT_VIEWPOINT,
        phase: "dwell",
        travelOrigin: TRAVEL_ORIGIN,
        selectedOverlayId: null,
        addPointArmed: false,
        effectsLive: false,
        effectElapsedMs: 0,
        onMoveControl: options.onMoveControl,
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

function controlHandle(host: HTMLElement): Element | null {
  return host.querySelector(".presentation-handle--control");
}

describe("presentation transition handles", () => {
  const mounted: Array<{ unmount: () => void }> = [];

  afterEach(() => {
    for (const stage of mounted.splice(0)) {
      stage.unmount();
    }
  });

  it("keeps the current transition editable while the panel is collapsed", async () => {
    const stage = mountStage({
      arranging: true,
      editing: false,
      track: tour({
        first: "quadratic",
        second: "quadratic",
        firstControl: { x: 0.1, y: 0.2 },
        secondControl: { x: 0.8, y: 0.6 },
      }),
    });
    mounted.push(stage);
    await nextTick();

    const handle = controlHandle(stage.host);
    expect(handle).not.toBeNull();
    expect(Number(handle?.getAttribute("cx"))).toBe(0.8 * IMAGE_SIZE);
    expect(Number(handle?.getAttribute("cy"))).toBe(0.6 * IMAGE_SIZE);
    expect(stage.host.querySelector(".presentation-path")?.getAttribute("d")).toContain("Q");
  });

  it("hides transition handles when the panel is closed", async () => {
    const stage = mountStage({
      arranging: false,
      editing: false,
      track: tour({
        first: "quadratic",
        second: "quadratic",
        secondControl: { x: 0.8, y: 0.6 },
      }),
    });
    mounted.push(stage);
    await nextTick();

    expect(stage.host.querySelector(".presentation-handle")).toBeNull();
    expect(stage.host.querySelector(".presentation-path")).toBeNull();
  });

  it("offers a midpoint on a straight transition so it can be bent", async () => {
    const stage = mountStage({
      arranging: true,
      editing: false,
      track: tour({ first: "line", second: "line" }),
    });
    mounted.push(stage);
    await nextTick();

    const handle = controlHandle(stage.host);
    expect(handle).not.toBeNull();
    expect(Number(handle?.getAttribute("cx"))).toBe(IMAGE_SIZE);
    expect(Number(handle?.getAttribute("cy"))).toBe(IMAGE_SIZE / 2);
  });

  it("drags a collapsed-panel control without opening edit mode", async () => {
    const onMoveControl = vi.fn();
    const stage = mountStage({
      arranging: true,
      editing: false,
      track: tour({
        first: "line",
        second: "quadratic",
        secondControl: { x: 0.8, y: 0.6 },
      }),
      onMoveControl,
    });
    mounted.push(stage);
    await nextTick();

    const handle = controlHandle(stage.host);
    expect(handle).not.toBeNull();
    handle?.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: DRAG_CLIENT_X,
      clientY: DRAG_CLIENT_Y,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: DRAG_CLIENT_X,
      clientY: DRAG_CLIENT_Y,
    }));

    expect(onMoveControl).toHaveBeenCalledWith(0, {
      x: DRAG_CLIENT_X / IMAGE_SIZE,
      y: DRAG_CLIENT_Y / IMAGE_SIZE,
    });
  });
});
