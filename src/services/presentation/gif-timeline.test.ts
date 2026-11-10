import { describe, expect, it } from "vitest";
import {
  gifOutputSize,
  presentationGifCycleMs,
  presentationGifFileName,
  samplePresentationGifFrames,
} from "@/services/presentation/gif-timeline";
import type { PresentationTrack } from "@/services/presentation/types";

const DWELL_A_MS = 2000;
const DWELL_B_MS = 1000;
const TRAVEL_AB_MS = 1500;
const TRAVEL_BA_MS = 500;

function loopTrack(): PresentationTrack {
  return {
    id: "track",
    name: "Walk / tour",
    viewpoints: [
      { id: "a", anchor: { x: 0, y: 0 }, scale: 1, dwellMs: DWELL_A_MS, effects: [] },
      { id: "b", anchor: { x: 1, y: 1 }, scale: 2, dwellMs: DWELL_B_MS, effects: [] },
    ],
    transitions: [
      {
        id: "ab",
        fromId: "a",
        toId: "b",
        durationMs: TRAVEL_AB_MS,
        path: "line",
        points: [],
        controls: [],
      },
      {
        id: "ba",
        fromId: "b",
        toId: "a",
        durationMs: TRAVEL_BA_MS,
        path: "line",
        points: [],
        controls: [],
      },
    ],
    overlays: [],
  };
}

describe("presentation GIF timeline", () => {
  it("covers one loop and keeps the sum of frame delays equal to the cycle", () => {
    const track = loopTrack();
    const frames = samplePresentationGifFrames(track);
    const delay = frames.reduce((sum, frame) => sum + frame.delayMs, 0);
    expect(delay).toBe(presentationGifCycleMs(track));
    expect(frames[0]).toMatchObject({
      anchorX: 0,
      anchorY: 0,
      scale: 1,
      delayMs: DWELL_A_MS,
      ownerKind: "viewpoint",
      ownerId: "a",
    });
    expect(frames.at(-1)).toMatchObject({
      anchorX: 0,
      anchorY: 0,
      scale: 1,
      ownerKind: "transition",
      ownerId: "ba",
    });
    expect(frames.some((frame) => frame.ownerId === "ab")).toBe(true);
  });

  it("holds a single viewpoint without inventing a transition", () => {
    const track = loopTrack();
    track.viewpoints = [track.viewpoints[0]];
    track.transitions = [];
    const frames = samplePresentationGifFrames(track);
    expect(frames).toHaveLength(1);
    expect(frames[0].delayMs).toBe(DWELL_A_MS);
  });

  it("samples the effect window and keeps the rest of the dwell as one hold", () => {
    const track = loopTrack();
    track.viewpoints[0].effects = [{
      id: "fade",
      kind: "fade",
      target: "diagram",
      overlayId: "",
      startMs: 0,
      durationMs: 400,
    }];
    const frames = samplePresentationGifFrames(track);
    const dwellFrames = frames.filter((frame) => frame.ownerId === "a");
    const dwellDelay = dwellFrames.reduce((sum, frame) => sum + frame.delayMs, 0);
    expect(dwellDelay).toBe(DWELL_A_MS);
    expect(dwellFrames.length).toBeGreaterThan(1);
    expect(dwellFrames.at(-1)?.delayMs).toBe(DWELL_A_MS - 400);
    expect(frames.reduce((sum, frame) => sum + frame.delayMs, 0)).toBe(presentationGifCycleMs(track));
  });

  it("shrinks the longer viewport side to the GIF limit", () => {
    expect(gifOutputSize(1920, 1080)).toEqual({ width: 960, height: 540 });
    expect(gifOutputSize(400, 300)).toEqual({ width: 400, height: 300 });
  });

  it("builds a safe gif file name from the track title", () => {
    expect(presentationGifFileName("Walk / tour")).toBe("Walk tour.gif");
    expect(presentationGifFileName("   ")).toBe("presentation.gif");
  });
});
