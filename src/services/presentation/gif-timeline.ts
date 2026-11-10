import {
  PRESENTATION_GIF_FRAME_MS,
  PRESENTATION_GIF_MAX_SIDE,
} from "@/services/presentation/constants";
import { effectSegments } from "@/services/presentation/effects";
import { easeInOut, lerpScale, sampleTransitionPoint } from "@/services/presentation/path";
import type { FrameEffect, PresentationTrack, Viewpoint } from "@/services/presentation/types";

export interface PresentationGifFrame {
  anchorX: number;
  anchorY: number;
  scale: number;
  delayMs: number;
  ownerKind: "viewpoint" | "transition";
  ownerId: string;
  /** Time from the start of the dwell or transition, used by effects. */
  effectElapsedMs: number;
}

export interface GifPixelSize {
  width: number;
  height: number;
}

function dwellEffects(viewpoint: Viewpoint, track: PresentationTrack): FrameEffect[] {
  return viewpoint.effects.filter((effect) => {
    if (effect.target !== "overlay") {
      return true;
    }
    const overlay = track.overlays.find((item) => item.id === effect.overlayId);
    return overlay?.owner.kind === "viewpoint" && overlay.owner.id === viewpoint.id;
  });
}

function holdFrames(
  viewpoint: Viewpoint,
  effects: readonly FrameEffect[],
): PresentationGifFrame[] {
  return effectSegments(effects, viewpoint.dwellMs).flatMap((segment) => {
    const length = segment.endMs - segment.startMs;
    const camera = {
      anchorX: viewpoint.anchor.x,
      anchorY: viewpoint.anchor.y,
      scale: viewpoint.scale,
      ownerKind: "viewpoint" as const,
      ownerId: viewpoint.id,
    };
    if (!segment.animated) {
      return [{ ...camera, delayMs: length, effectElapsedMs: segment.startMs }];
    }
    const steps = Math.max(1, Math.round(length / PRESENTATION_GIF_FRAME_MS));
    const sliceMs = length / steps;
    return Array.from({ length: steps }, (_, step) => ({
      ...camera,
      delayMs: sliceMs,
      effectElapsedMs: segment.startMs + sliceMs * step,
    }));
  });
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
    frames.push(...holdFrames(viewpoint, dwellEffects(viewpoint, track)));

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
        effectElapsedMs: sliceMs * step,
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
