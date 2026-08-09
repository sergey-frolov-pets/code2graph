import { describe, expect, it } from "vitest";
import { getScaledSize } from "@/services/preview/pan-zoom-transform";

describe("pan-zoom-transform", () => {
  it("computes scaled content size", () => {
    const size = getScaledSize({
      panX: 0,
      panY: 0,
      scale: 2,
      imageWidth: 400,
      imageHeight: 300,
      isDragging: false,
      isPinching: false,
    });

    expect(size).toEqual({ width: 800, height: 600 });
  });

  it("keeps original size at unit scale", () => {
    const size = getScaledSize({
      panX: 10,
      panY: 20,
      scale: 1,
      imageWidth: 640,
      imageHeight: 480,
      isDragging: false,
      isPinching: false,
    });

    expect(size.width).toBe(640);
    expect(size.height).toBe(480);
  });
});
