import {
  PRESENTATION_GIF_FRAME_MS,
  PRESENTATION_GIF_MAX_SIDE,
} from "@/services/presentation/constants";
import { easeInOut, lerpScale, sampleTransitionPoint } from "@/services/presentation/path";
import type { PresentationTrack } from "@/services/presentation/types";

export interface PresentationGifFrame {
  anchorX: number;
  anchorY: number;
  scale: number;
  delayMs: number;
  ownerKind: "viewpoint" | "transition";
  ownerId: string;
}

export interface GifPixelSize {
  width: number;
  height: number;
}

/** One loop: each viewpoint hold, then the transition to the next viewpoint. */
export function samplePresentationGifFrames(
  track: PresentationTrack,
): PresentationGifFrame[] {
  if (track.viewpoints.length === 0) {
    return [];
  }

  const frames: PresentationGifFrame[] = [];
  const count = track.viewpoints.length;

  for (let index = 0; index < count; index += 1) {
    const viewpoint = track.viewpoints[index];
    frames.push({
      anchorX: viewpoint.anchor.x,
      anchorY: viewpoint.anchor.y,
      scale: viewpoint.scale,
      delayMs: viewpoint.dwellMs,
      ownerKind: "viewpoint",
      ownerId: viewpoint.id,
    });

    const transition = track.transitions[index];
    const next = track.viewpoints[(index + 1) % count];
    if (!transition || !next || count < 2) {
      continue;
    }

    const steps = Math.max(1, Math.round(transition.durationMs / PRESENTATION_GIF_FRAME_MS));
    const sliceMs = transition.durationMs / steps;
    for (let step = 1; step <= steps; step += 1) {
      const eased = easeInOut(step / steps);
      const point = sampleTransitionPoint(viewpoint.anchor, next.anchor, transition, eased);
      frames.push({
        anchorX: point.x,
        anchorY: point.y,
        scale: lerpScale(viewpoint.scale, next.scale, eased),
        delayMs: sliceMs,
        ownerKind: "transition",
        ownerId: transition.id,
      });
    }
  }

  return frames;
}

export function presentationGifCycleMs(track: PresentationTrack): number {
  const dwell = track.viewpoints.reduce((sum, viewpoint) => sum + viewpoint.dwellMs, 0);
  if (track.viewpoints.length < 2) {
    return dwell;
  }
  const travel = track.transitions.reduce((sum, transition) => sum + transition.durationMs, 0);
  return dwell + travel;
}

/** Fits the preview viewport into the GIF size limit without changing its aspect. */
export function gifOutputSize(viewportWidth: number, viewportHeight: number): GifPixelSize {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const longest = Math.max(width, height);
  const ratio = longest > PRESENTATION_GIF_MAX_SIDE
    ? PRESENTATION_GIF_MAX_SIDE / longest
    : 1;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

const GIF_FILE_EXTENSION = ".gif";
const UNSAFE_FILE_CHARS = /[\\/:*?"<>|]/g;

export function presentationGifFileName(trackName: string): string {
  const cleaned = trackName.replace(UNSAFE_FILE_CHARS, " ").replace(/\s+/g, " ").trim();
  const base = cleaned || "presentation";
  return base.toLowerCase().endsWith(GIF_FILE_EXTENSION) ? base : `${base}${GIF_FILE_EXTENSION}`;
}
