// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_DOUBLE_TAP_MS } from "@/constants/preview-pan-zoom";
import { PreviewPanZoomController } from "@/services/preview/pan-zoom";

function createViewport(width: number, height: number): HTMLElement {
  const viewport = document.createElement("div");
  Object.defineProperty(viewport, "clientWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(viewport, "clientHeight", {
    configurable: true,
    value: height,
  });
  viewport.setPointerCapture = vi.fn();
  viewport.releasePointerCapture = vi.fn();
  viewport.hasPointerCapture = vi.fn(() => true);
  return viewport;
}

async function createController(options?: {
  viewportWidth?: number;
  viewportHeight?: number;
  imageWidth?: number;
  imageHeight?: number;
}) {
  const viewport = createViewport(
    options?.viewportWidth ?? 800,
    options?.viewportHeight ?? 600,
  );
  const content = document.createElement("div");
  const svgMarkup = `<svg width="${options?.imageWidth ?? 400}" height="${options?.imageHeight ?? 300}" />`;

  const controller = new PreviewPanZoomController({
    getViewport: () => viewport,
    getContent: () => content,
    getSvgMarkup: () => svgMarkup,
    onChange: () => {},
  });

  controller.syncFromMarkup();
  await Promise.resolve();

  return { controller, viewport };
}

function tap(viewport: HTMLElement, controller: PreviewPanZoomController): void {
  const pointerDown = new PointerEvent("pointerdown", {
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    bubbles: true,
  });
  const pointerUp = new PointerEvent("pointerup", {
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    bubbles: true,
  });

  Object.defineProperty(pointerDown, "target", { value: viewport });
  Object.defineProperty(pointerUp, "target", { value: viewport });

  controller.onPointerDown(pointerDown);
  controller.onPointerUp(pointerUp);
}

describe("PreviewPanZoomController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports zoom percent from current scale", async () => {
    const { controller } = await createController();
    const initialPercent = controller.getZoomPercent();

    controller.zoomIn();

    expect(controller.getZoomPercent()).toBeGreaterThan(initialPercent);
  });

  it("fits diagram to viewport on double tap", async () => {
    const { controller, viewport } = await createController({
      viewportWidth: 800,
      viewportHeight: 600,
      imageWidth: 1600,
      imageHeight: 1200,
    });

    controller.zoomIn();
    controller.zoomIn();
    const zoomedPercent = controller.getZoomPercent();

    tap(viewport, controller);
    vi.advanceTimersByTime(PREVIEW_DOUBLE_TAP_MS);
    tap(viewport, controller);

    expect(controller.getZoomPercent()).toBeLessThan(zoomedPercent);
  });
});
