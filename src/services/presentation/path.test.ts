import { describe, expect, it } from "vitest";
import { easeInOut, lerpScale, sampleTransitionPoint } from "@/services/presentation/path";
import type { NormPoint, PresentationTransition } from "@/services/presentation/types";

const from: NormPoint = { x: 0, y: 0 };
const to: NormPoint = { x: 1, y: 0 };

function transition(
  path: PresentationTransition["path"],
  points: NormPoint[] = [],
  controls: NormPoint[] = [],
): Pick<PresentationTransition, "path" | "points" | "controls"> {
  return { path, points, controls };
}

describe("presentation paths", () => {
  it("keeps ease-in-out pinned at the ends and the midpoint", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBe(0.5);
  });

  it("walks a straight line from the first viewpoint to the next", () => {
    const path = transition("line");
    expect(sampleTransitionPoint(from, to, path, 0)).toEqual(from);
    expect(sampleTransitionPoint(from, to, path, 1)).toEqual(to);
    expect(sampleTransitionPoint(from, to, path, 0.5)).toEqual({ x: 0.5, y: 0 });
  });

  it("passes through a polyline vertex halfway along equal segments", () => {
    const bend = { x: 0.5, y: 1 };
    const path = transition("polyline", [bend]);
    expect(sampleTransitionPoint(from, to, path, 0)).toEqual(from);
    expect(sampleTransitionPoint(from, to, path, 1)).toEqual(to);
    expect(sampleTransitionPoint(from, to, path, 0.5).y).toBeCloseTo(1);
  });

  it("places the quadratic midpoint on the control point blend", () => {
    const control = { x: 0.5, y: 1 };
    const path = transition("quadratic", [], [control]);
    const mid = sampleTransitionPoint(from, to, path, 0.5);
    expect(mid.x).toBeCloseTo(0.5);
    expect(mid.y).toBeCloseTo(0.5);
  });

  it("places the cubic midpoint between the two handles", () => {
    const path = transition("cubic", [], [
      { x: 0.25, y: 1 },
      { x: 0.75, y: 1 },
    ]);
    const mid = sampleTransitionPoint(from, to, path, 0.5);
    expect(mid.x).toBeCloseTo(0.5);
    expect(mid.y).toBeCloseTo(0.75);
    expect(lerpScale(1, 3, 0.5)).toBe(2);
  });
});
