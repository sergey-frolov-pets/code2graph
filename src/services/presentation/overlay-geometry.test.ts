import { describe, expect, it } from "vitest";
import {
  blockArrowPath,
  calloutPath,
  overlayResizeHandles,
  resizeOverlay,
  snapRotation,
  stepRotation,
  roundedRectPath,
} from "@/services/presentation/overlay-geometry";
import type { PresentationOverlay } from "@/services/presentation/types";

const BODY = { x: 10, y: 20, width: 100, height: 60 };

function subpathCount(path: string): number {
  return path.match(/M /g)?.length ?? 0;
}

function endpointYs(path: string): number[] {
  const ys: number[] = [];
  const tokens = path.split(/\s+/);
  let index = 0;
  while (index < tokens.length) {
    const command = tokens[index];
    index += 1;
    const count = command === "M" || command === "L"
      ? 2
      : command === "Q"
        ? 4
        : command === "C"
          ? 6
          : command === "A"
            ? 7
            : 0;
    const numbers = tokens.slice(index, index + count).map(Number);
    index += count;
    if (numbers.length >= 2) {
      ys.push(numbers[numbers.length - 1]);
    }
  }
  return ys;
}

function overlay(patch: Partial<PresentationOverlay>): PresentationOverlay {
  return {
    id: "overlay",
    owner: { kind: "viewpoint", id: "view" },
    shape: "rect",
    x: 1,
    y: 2,
    width: 4,
    height: 6,
    text: "",
    backing: "none",
    bubbleShape: "rectangle",
    cornerRadius: 0,
    arrowKind: "straight",
    arrowForm: "line",
    arrowDirection: "right",
    rotation: 0,
    mark: "warning",
    arrowHead: "end",
    stroke: "",
    fill: "",
    textColor: "",
    font: "sans",
    line: "solid",
    ...patch,
  };
}

describe("callout outlines", () => {
  it.each(["rectangle", "oval", "cloud"] as const)(
    "draws a %s bubble as one outline with the tail outside the body",
    (shape) => {
      const path = calloutPath(BODY, shape, 0.4);
      expect(subpathCount(path)).toBe(1);
      expect(path.endsWith("Z")).toBe(true);
      expect(Math.max(...endpointYs(path))).toBeGreaterThan(BODY.y + BODY.height);
    },
  );

  it("keeps a sharp rectangle free of corner arcs and rounds a pill", () => {
    expect(roundedRectPath(BODY, 0)).not.toContain(" A ");
    expect(roundedRectPath(BODY, 1)).toContain(" A ");
  });
});

describe("arrow outlines", () => {
  it("points a block arrow to the right before rotation", () => {
    expect(blockArrowPath(BODY)).toContain("L 110 50");
  });

  it("steps rotation by 45 degrees and wraps the circle", () => {
    expect(stepRotation(0, 1)).toBe(45);
    expect(stepRotation(315, 1)).toBe(0);
    expect(stepRotation(0, -1)).toBe(315);
    expect(snapRotation(44)).toBe(45);
    expect(snapRotation(-10)).toBe(0);
  });
});

describe("overlay resize", () => {
  it("gives a rectangle eight handles and a line arrow two endpoints", () => {
    expect(overlayResizeHandles(overlay({ shape: "rect" })).map((handle) => handle.id)).toEqual([
      "nw",
      "n",
      "ne",
      "e",
      "se",
      "s",
      "sw",
      "w",
    ]);
    expect(
      overlayResizeHandles(overlay({ shape: "arrow", arrowForm: "line" })).map((handle) => handle.id),
    ).toEqual(["start", "end"]);
    expect(
      overlayResizeHandles(overlay({ shape: "arrow", arrowForm: "pointer" })).map((handle) => handle.id),
    ).toHaveLength(8);
  });

  it("moves the opposite edges and keeps the far end of a line", () => {
    const box = { x: 1, y: 2, width: 4, height: 6 };
    expect(resizeOverlay(box, "se", { x: 9, y: 10 })).toEqual({
      x: 1,
      y: 2,
      width: 8,
      height: 8,
    });
    expect(resizeOverlay(box, "nw", { x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 5,
      height: 8,
    });
    expect(resizeOverlay(box, "start", { x: 0, y: 3 })).toEqual({
      x: 0,
      y: 3,
      width: 5,
      height: 5,
    });
    expect(resizeOverlay(box, "e", { x: 1, y: 2 }).width).toBeGreaterThan(0);
  });
});
