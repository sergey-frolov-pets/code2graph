// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  clampPan,
  getPointersDistance,
  getPointersMidpoint,
  getWheelZoomFactor,
  normalizeWheelDelta,
} from "@/services/preview/pan-zoom-math";

describe("pan-zoom-math", () => {
  it("clamps pan inside viewport bounds", () => {
    const result = clampPan(500, 500, 200, 100, 300, 200);
    expect(result.panX).toBe(300);
    expect(result.panY).toBe(200);
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
