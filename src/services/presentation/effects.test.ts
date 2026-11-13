import { describe, expect, it } from "vitest";
import { FRAME_EFFECT_FLY_DISTANCE } from "@/services/presentation/constants";
import { EFFECT_IDENTITY, effectSegments, effectVisualAt } from "@/services/presentation/effects";
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
    expect(effectVisualAt([fade], 1000, "diagram")).toEqual(EFFECT_IDENTITY);
  });

  it("pulses and zooms only the matching target", () => {
    const pulse = effect({ kind: "pulse", target: "frame", durationMs: 1000 });
    const zoom = effect({ id: "zoom", kind: "zoom", target: "overlay", overlayId: "note" });
    expect(effectVisualAt([pulse], 500, "frame").scale).toBeGreaterThan(1);
    expect(effectVisualAt([pulse], 500, "diagram")).toEqual(EFFECT_IDENTITY);
    expect(effectVisualAt([zoom], 999, "overlay", "note").scale).toBeGreaterThan(1);
    expect(effectVisualAt([zoom], 1000, "overlay", "other")).toEqual(EFFECT_IDENTITY);
  });

  it("flies in from the left and rests in place after the window", () => {
    const fly = effect({ kind: "flyInLeft" });
    expect(effectVisualAt([fly], 0, "diagram").translateX).toBeCloseTo(-FRAME_EFFECT_FLY_DISTANCE);
    expect(effectVisualAt([fly], 0, "diagram").translateY).toBe(0);
    expect(effectVisualAt([fly], 1000, "diagram")).toEqual(EFFECT_IDENTITY);
  });

  it("keeps a fade-out hidden after the effect ends", () => {
    const fadeOut = effect({ kind: "fadeOut" });
    expect(effectVisualAt([fadeOut], 500, "diagram").opacity).toBeCloseTo(0.5);
    expect(effectVisualAt([fadeOut], 1000, "diagram").opacity).toBe(0);
    expect(effectVisualAt([fadeOut], 1500, "diagram").opacity).toBe(0);
  });

  it("opens a paper tear from a slit to the full target", () => {
    const tear = effect({ kind: "tear" });
    const mid = effectVisualAt([tear], 500, "diagram").clip;
    expect(mid).not.toBeNull();
    expect(Math.min(...(mid ?? []).map((point) => point.y))).toBeGreaterThan(0);
    expect(Math.max(...(mid ?? []).map((point) => point.y))).toBeLessThan(1);
    expect(effectVisualAt([tear], 1000, "diagram").clip).toBeNull();
  });

  it("pops above full size in the middle and settles afterwards", () => {
    const pop = effect({ kind: "pop" });
    expect(effectVisualAt([pop], 0, "diagram").scale).toBeLessThan(1);
    expect(effectVisualAt([pop], 500, "diagram").scale).toBeGreaterThan(1);
    expect(effectVisualAt([pop], 1000, "diagram").scale).toBe(1);
  });

  it("splits a dwell into the effect window and the still remainder", () => {
    expect(effectSegments([effect({ durationMs: 400 })], 1000)).toEqual([
      { startMs: 0, endMs: 400, animated: true },
      { startMs: 400, endMs: 1000, animated: false },
    ]);
  });
});
