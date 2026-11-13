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

  it("keeps a large picture inside a 3 by 3 sheet of its own size", () => {
    const result = clampPan(500, 500, 200, 100, 300, 200);
    expect(result.panX).toBe(200);
    expect(result.panY).toBe(100);

    const far = clampPan(-400, -300, 200, 100, 300, 200);
    expect(far.panX).toBe(-100);
    expect(far.panY).toBe(0);
  });

  it("slides a small 3 by 3 sheet inside the viewport", () => {
    const result = clampPan(0, 0, 40, 20, 300, 200);
    expect(result).toEqual({ panX: 40, panY: 20 });

    const far = clampPan(500, 500, 40, 20, 300, 200);
    expect(far).toEqual({ panX: 220, panY: 160 });
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
