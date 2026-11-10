import { describe, expect, it } from "vitest";
import { frameToPan, panToFrame } from "@/services/presentation/camera";

describe("presentation camera", () => {
  it("puts the anchor at the center of the viewport", () => {
    const placed = frameToPan(
      { anchorX: 0.5, anchorY: 0.5, scale: 2 },
      400,
      300,
      800,
      600,
    );
    expect(placed).toEqual({ panX: 0, panY: 0, scale: 2 });
    expect(
      panToFrame({
        ...placed,
        imageWidth: 400,
        imageHeight: 300,
        viewportWidth: 800,
        viewportHeight: 600,
      }),
    ).toEqual({ anchorX: 0.5, anchorY: 0.5, scale: 2 });
  });

  it("shifts the pan when the anchor is not the image center", () => {
    const placed = frameToPan(
      { anchorX: 0, anchorY: 1, scale: 1 },
      200,
      100,
      400,
      200,
    );
    expect(placed.panX).toBe(200);
    expect(placed.panY).toBe(0);
    expect(placed.scale).toBe(1);
  });
});
