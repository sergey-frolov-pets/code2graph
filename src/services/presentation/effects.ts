import {
  FRAME_EFFECT_PULSE_AMOUNT,
  FRAME_EFFECT_ZOOM_AMOUNT,
} from "@/services/presentation/constants";
import type { FrameEffect, FrameEffectTargetKind } from "@/services/presentation/types";

export interface EffectVisual {
  opacity: number;
  scale: number;
}

export interface EffectSegment {
  startMs: number;
  endMs: number;
  animated: boolean;
}

export const EFFECT_IDENTITY: EffectVisual = { opacity: 1, scale: 1 };

/** Progress of the latest effect window that covers `elapsedMs`. */
export function effectVisualAt(
  effects: readonly FrameEffect[],
  elapsedMs: number,
  target: FrameEffectTargetKind,
  overlayId = "",
): EffectVisual {
  const matches = effects.filter((effect) => {
    if (effect.target !== target) {
      return false;
    }
    if (target === "overlay" && effect.overlayId !== overlayId) {
      return false;
    }
    return elapsedMs >= effect.startMs && elapsedMs < effect.startMs + effect.durationMs;
  });
  const effect = matches.reduce<FrameEffect | null>(
    (latest, item) => (latest === null || item.startMs >= latest.startMs ? item : latest),
    null,
  );
  if (!effect || effect.durationMs <= 0) {
    return EFFECT_IDENTITY;
  }

  const progress = (elapsedMs - effect.startMs) / effect.durationMs;
  if (effect.kind === "fade") {
    return { opacity: progress, scale: 1 };
  }
  if (effect.kind === "pulse") {
    return {
      opacity: 1,
      scale: 1 + FRAME_EFFECT_PULSE_AMOUNT * Math.sin(progress * Math.PI),
    };
  }
  return { opacity: 1, scale: 1 + FRAME_EFFECT_ZOOM_AMOUNT * progress };
}

export function effectStyle(visual: EffectVisual): Record<string, string> {
  return {
    opacity: String(visual.opacity),
    transform: `scale(${visual.scale})`,
    transformOrigin: "center center",
  };
}

export function overlayEffectTransform(
  box: { x: number; y: number; width: number; height: number },
  scale: number,
): string | undefined {
  if (scale === 1) {
    return undefined;
  }
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  return `translate(${centerX} ${centerY}) scale(${scale}) translate(${-centerX} ${-centerY})`;
}

/** Splits a dwell or transition into still spans and spans that contain an effect. */
export function effectSegments(
  effects: readonly FrameEffect[],
  durationMs: number,
): EffectSegment[] {
  if (durationMs <= 0) {
    return [];
  }
  const cuts = new Set<number>([0, durationMs]);
  for (const effect of effects) {
    const start = Math.min(durationMs, Math.max(0, effect.startMs));
    const end = Math.min(durationMs, Math.max(0, effect.startMs + effect.durationMs));
    if (end > start) {
      cuts.add(start);
      cuts.add(end);
    }
  }
  const points = [...cuts].sort((left, right) => left - right);
  const segments: EffectSegment[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const startMs = points[index];
    const endMs = points[index + 1];
    if (endMs <= startMs) {
      continue;
    }
    const animated = effects.some(
      (effect) => effect.startMs < endMs && effect.startMs + effect.durationMs > startMs,
    );
    segments.push({ startMs, endMs, animated });
  }
  return segments;
}
