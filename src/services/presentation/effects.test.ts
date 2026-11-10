import { describe, expect, it } from "vitest";
import { effectSegments, effectVisualAt } from "@/services/presentation/effects";
import type { FrameEffect } from "@/services/presentation/types";

function effect(patch: Partial<FrameEffect> = {}): FrameEffect {
  return {
    id: "effect",
    kind: "fade",
    target: "diagram",
    overlayId: "",
    startMs: 0,
    durationMs: 1000,
    ...patch,
  };
}

describe("presentation effects", () => {
  it("fades the diagram from the start of the viewpoint and holds it afterwards", () => {
    const fade = effect();
    expect(effectVisualAt([fade], 0, "diagram").opacity).toBe(0);
    expect(effectVisualAt([fade], 500, "diagram").opacity).toBeCloseTo(0.5);
    expect(effectVisualAt([fade], 1000, "diagram")).toEqual({ opacity: 1, scale: 1 });
  });

  it("pulses and zooms only the matching target", () => {
    const pulse = effect({ kind: "pulse", target: "frame", durationMs: 1000 });
    const zoom = effect({ id: "zoom", kind: "zoom", target: "overlay", overlayId: "note" });
    expect(effectVisualAt([pulse], 500, "frame").scale).toBeGreaterThan(1);
    expect(effectVisualAt([pulse], 500, "diagram")).toEqual({ opacity: 1, scale: 1 });
    expect(effectVisualAt([zoom], 999, "overlay", "note").scale).toBeGreaterThan(1);
    expect(effectVisualAt([zoom], 1000, "overlay", "other")).toEqual({ opacity: 1, scale: 1 });
  });

  it("splits a dwell into the effect window and the still remainder", () => {
    expect(effectSegments([effect({ durationMs: 400 })], 1000)).toEqual([
      { startMs: 0, endMs: 400, animated: true },
      { startMs: 400, endMs: 1000, animated: false },
    ]);
  });
});
