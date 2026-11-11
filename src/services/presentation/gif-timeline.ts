import {
  PRESENTATION_GIF_CENTISECOND_MS,
  PRESENTATION_GIF_FRAME_MS,
  PRESENTATION_GIF_MAX_DELAY_CS,
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

export interface GifScenePlacement {
  panX: number;
  panY: number;
  scale: number;
  /** SVG CSS box in GIF pixels. This is the rectangle drawn for the diagram. */
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

/**
 * Delays to pass to gifenc for one timeline slice.
 * The encoder stores centiseconds, so each value is a whole number of milliseconds.
 */
export function gifFrameDelaysMs(delayMs: number): number[] {
  const maxDelayMs = PRESENTATION_GIF_MAX_DELAY_CS * PRESENTATION_GIF_CENTISECOND_MS;
  let remaining = Math.max(
    PRESENTATION_GIF_CENTISECOND_MS,
    Math.round(delayMs / PRESENTATION_GIF_CENTISECOND_MS) * PRESENTATION_GIF_CENTISECOND_MS,
  );
  const delays: number[] = [];
  while (remaining > 0) {
    const delay = Math.min(maxDelayMs, remaining);
    delays.push(delay);
    remaining -= delay;
  }
  return delays;
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

/**
 * Places one camera frame on the GIF canvas.
 *
 * `imageWidth` / `imageHeight` are the preview's camera box (often the content
 * bbox). `layoutWidth` / `layoutHeight` are the SVG element's CSS box, which is
 * what the preview actually transforms. Drawing the camera box instead shifts
 * the picture away from the on-screen viewport.
 *
 * The scale is fitted by the same factor as the canvas, so a smaller GIF still
 * shows the viewport that is on screen. Same centering as `frameToPan`, without
 * clamping that fitted scale back up to the interactive minimum.
 */
export function gifScenePlacement(
  frame: { anchorX: number; anchorY: number; scale: number },
  imageWidth: number,
  imageHeight: number,
  layoutWidth: number,
  layoutHeight: number,
  outputWidth: number,
  outputHeight: number,
  viewportWidth: number,
): GifScenePlacement {
  const ratio = viewportWidth > 0 ? outputWidth / viewportWidth : 1;
  const scale = frame.scale * ratio;
  return {
    scale,
    panX: outputWidth / 2 - frame.anchorX * imageWidth * scale,
    panY: outputHeight / 2 - frame.anchorY * imageHeight * scale,
    width: layoutWidth * scale,
    height: layoutHeight * scale,
  };
}

const GIF_FILE_EXTENSION = ".gif";
const UNSAFE_FILE_CHARS = /[\\/:*?"<>|]/g;

export function presentationGifFileName(trackName: string): string {
  const cleaned = trackName.replace(UNSAFE_FILE_CHARS, " ").replace(/\s+/g, " ").trim();
  const base = cleaned || "presentation";
  return base.toLowerCase().endsWith(GIF_FILE_EXTENSION) ? base : `${base}${GIF_FILE_EXTENSION}`;
}
