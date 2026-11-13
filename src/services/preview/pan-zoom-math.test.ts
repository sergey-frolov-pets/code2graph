// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  clampPan,
  getPointersDistance,
  getPointersMidpoint,
  getWheelZoomFactor,
  normalizeWheelDelta,
  panSheetBox,
} from "@/services/preview/pan-zoom-math";

describe("pan-zoom-math", () => {
  it("places the picture in the center cell of the pan sheet", () => {
    expect(panSheetBox(200, 100)).toEqual({
      x: -200,
      y: -100,
      width: 600,
      height: 300,
    });
  });

  it("lets the picture leave the viewport by one surrounding cell", () => {
    expect(clampPan(500, 500, 200, 100, 300, 200)).toEqual({ panX: 500, panY: 300 });
    expect(clampPan(-400, -300, 200, 100, 300, 200)).toEqual({ panX: -400, panY: -200 });
  });

  it("lets a small picture be pulled fully past the viewport edge", () => {
    const offLeft = clampPan(-80, -40, 40, 20, 300, 200);
    expect(offLeft).toEqual({ panX: -80, panY: -40 });
    expect(offLeft.panX + 40).toBeLessThanOrEqual(0);

    const offRight = clampPan(500, 500, 40, 20, 300, 200);
    expect(offRight).toEqual({ panX: 340, panY: 220 });
    expect(offRight.panX).toBeGreaterThanOrEqual(300);
  });

  it("allows negative pan when content is larger than viewport", () => {
    const result = clampPan(-50, -30, 800, 600, 300, 200);
    expect(result.panX).toBe(-50);
    expect(result.panY).toBe(-30);
  });

  it("normalizes line-based wheel delta", () => {
    const event = {
      deltaY: 3,
      deltaMode: 1,
      ctrlKey: false,
    } as WheelEvent;

    expect(normalizeWheelDelta(event, 600)).toBeGreaterThan(3);
  });

  it("returns discrete zoom step for small line deltas", () => {
    const event = {
      deltaY: -1,
      deltaMode: 1,
      ctrlKey: false,
    } as WheelEvent;

    expect(getWheelZoomFactor(event, 600)).toBeGreaterThan(1);
  });

  it("computes pointer distance and midpoint", () => {
    const first = { x: 0, y: 0, clientX: 0, clientY: 0 };
    const second = { x: 30, y: 40, clientX: 30, clientY: 40 };

    expect(getPointersDistance(first, second)).toBe(50);
    expect(getPointersMidpoint(first, second)).toEqual({ x: 15, y: 20 });
  });
});
