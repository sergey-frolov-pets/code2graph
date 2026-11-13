import {
  FRAME_EFFECT_FLY_DISTANCE,
  FRAME_EFFECT_POP_OVERSHOOT,
  FRAME_EFFECT_POP_START,
  FRAME_EFFECT_PULSE_AMOUNT,
  FRAME_EFFECT_SPIN_DEGREES,
  FRAME_EFFECT_SPIN_MIN_OPACITY,
  FRAME_EFFECT_TEAR_AMPLITUDE,
  FRAME_EFFECT_TEAR_TEETH,
  FRAME_EFFECT_ZOOM_AMOUNT,
} from "@/services/presentation/constants";
import type { FrameEffect, FrameEffectKind, FrameEffectTargetKind } from "@/services/presentation/types";

/** Point inside a target, as a fraction of its width and height. */
export interface EffectPoint {
  x: number;
  y: number;
}

export interface EffectVisual {
  opacity: number;
  scale: number;
  /** Fraction of the target width. Positive moves right. */
  translateX: number;
  /** Fraction of the target height. Positive moves down. */
  translateY: number;
  /** Degrees. Positive is clockwise, matching CSS rotate. */
  rotate: number;
  /** Polygon in fractions of the target. Null leaves the target unclipped. */
  clip: readonly EffectPoint[] | null;
}

export interface EffectSegment {
  startMs: number;
  endMs: number;
  animated: boolean;
}

export const EFFECT_IDENTITY: EffectVisual = {
  opacity: 1,
  scale: 1,
  translateX: 0,
  translateY: 0,
  rotate: 0,
  clip: null,
};

const FLY_IN_KINDS = new Set<FrameEffectKind>([
  "flyInLeft",
  "flyInRight",
  "flyInUp",
  "flyInDown",
]);

function clampUnit(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function holdsFinalPose(kind: FrameEffectKind): boolean {
  return kind === "fadeOut" || kind === "shrink" || kind.startsWith("flyOut");
}

function flyDirection(kind: FrameEffectKind): EffectPoint | null {
  switch (kind) {
    case "flyInLeft":
    case "flyOutLeft":
      return { x: -1, y: 0 };
    case "flyInRight":
    case "flyOutRight":
      return { x: 1, y: 0 };
    case "flyInUp":
    case "flyOutUp":
      return { x: 0, y: -1 };
    case "flyInDown":
    case "flyOutDown":
      return { x: 0, y: 1 };
    default:
      return null;
  }
}

function tearClip(progress: number): EffectPoint[] | null {
  if (progress >= 1) {
    return null;
  }
  const amplitude = FRAME_EFFECT_TEAR_AMPLITUDE * (1 - progress);
  const reveal = progress / 2;
  const points: EffectPoint[] = [];
  for (let index = 0; index <= FRAME_EFFECT_TEAR_TEETH; index += 1) {
    const tooth = index % 2 === 0 ? -amplitude : amplitude;
    points.push({
      x: index / FRAME_EFFECT_TEAR_TEETH,
      y: clampUnit(0.5 - reveal + tooth),
    });
  }
  for (let index = FRAME_EFFECT_TEAR_TEETH; index >= 0; index -= 1) {
    const tooth = index % 2 === 0 ? amplitude : -amplitude;
    points.push({
      x: index / FRAME_EFFECT_TEAR_TEETH,
      y: clampUnit(0.5 + reveal + tooth),
    });
  }
  return points;
}

function wipeClip(progress: number): EffectPoint[] | null {
  if (progress >= 1) {
    return null;
  }
  return [
    { x: 0, y: 0 },
    { x: progress, y: 0 },
    { x: progress, y: 1 },
    { x: 0, y: 1 },
  ];
}

function popScale(progress: number): number {
  const settled = FRAME_EFFECT_POP_START + (1 - FRAME_EFFECT_POP_START) * progress;
  return settled + FRAME_EFFECT_POP_OVERSHOOT * Math.sin(progress * Math.PI);
}

function sampleEffect(kind: FrameEffectKind, progress: number): EffectVisual {
  const direction = flyDirection(kind);
  if (direction) {
    const travel = (FLY_IN_KINDS.has(kind) ? 1 - progress : progress) * FRAME_EFFECT_FLY_DISTANCE;
    return {
      ...EFFECT_IDENTITY,
      translateX: direction.x * travel,
      translateY: direction.y * travel,
    };
  }
  switch (kind) {
    case "fade":
      return { ...EFFECT_IDENTITY, opacity: progress };
    case "fadeOut":
      return { ...EFFECT_IDENTITY, opacity: 1 - progress };
    case "pulse":
      return {
        ...EFFECT_IDENTITY,
        scale: 1 + FRAME_EFFECT_PULSE_AMOUNT * Math.sin(progress * Math.PI),
      };
    case "zoom":
      return { ...EFFECT_IDENTITY, scale: 1 + FRAME_EFFECT_ZOOM_AMOUNT * progress };
    case "tear":
      return { ...EFFECT_IDENTITY, clip: tearClip(progress) };
    case "wipe":
      return { ...EFFECT_IDENTITY, clip: wipeClip(progress) };
    case "spin":
      return {
        ...EFFECT_IDENTITY,
        opacity: FRAME_EFFECT_SPIN_MIN_OPACITY + (1 - FRAME_EFFECT_SPIN_MIN_OPACITY) * progress,
        rotate: (1 - progress) * -FRAME_EFFECT_SPIN_DEGREES,
      };
    case "pop":
      return { ...EFFECT_IDENTITY, scale: popScale(progress) };
    case "shrink":
      return { ...EFFECT_IDENTITY, opacity: 1 - progress, scale: 1 - progress };
    default:
      return EFFECT_IDENTITY;
  }
}

function matchesTarget(
  effect: FrameEffect,
  target: FrameEffectTargetKind,
  overlayId: string,
): boolean {
  if (effect.target !== target) {
    return false;
  }
  return target !== "overlay" || effect.overlayId === overlayId;
}

function latestByStart(effects: readonly FrameEffect[]): FrameEffect | null {
  return effects.reduce<FrameEffect | null>(
    (latest, item) => (latest === null || item.startMs >= latest.startMs ? item : latest),
    null,
  );
}

function latestFinishedExit(effects: readonly FrameEffect[]): FrameEffect | null {
  return effects.reduce<FrameEffect | null>((latest, item) => {
    if (latest === null) {
      return item;
    }
    const end = item.startMs + item.durationMs;
    const latestEnd = latest.startMs + latest.durationMs;
    if (end > latestEnd || (end === latestEnd && item.startMs >= latest.startMs)) {
      return item;
    }
    return latest;
  }, null);
}

/** Progress of the latest effect window that covers `elapsedMs`. Exit effects keep their last pose. */
export function effectVisualAt(
  effects: readonly FrameEffect[],
  elapsedMs: number,
  target: FrameEffectTargetKind,
  overlayId = "",
): EffectVisual {
  const applicable = effects.filter((effect) => matchesTarget(effect, target, overlayId));
  const active = applicable.filter(
    (effect) => elapsedMs >= effect.startMs && elapsedMs < effect.startMs + effect.durationMs,
  );
  const current = latestByStart(active);
  if (current && current.durationMs > 0) {
    return sampleEffect(current.kind, (elapsedMs - current.startMs) / current.durationMs);
  }

  const finished = applicable.filter(
    (effect) => holdsFinalPose(effect.kind)
      && effect.durationMs > 0
      && elapsedMs >= effect.startMs + effect.durationMs,
  );
  const held = latestFinishedExit(finished);
  if (held) {
    return sampleEffect(held.kind, 1);
  }
  return EFFECT_IDENTITY;
}

export function effectStyle(visual: EffectVisual): Record<string, string> {
  const style: Record<string, string> = {
    opacity: String(visual.opacity),
    transform: effectTransformCss(visual),
    transformOrigin: "center center",
  };
  if (visual.clip && visual.clip.length >= 3) {
    style.clipPath = effectClipCss(visual.clip);
  }
  return style;
}

export function effectTransformCss(visual: EffectVisual): string {
  const parts: string[] = [];
  if (visual.translateX !== 0 || visual.translateY !== 0) {
    parts.push(`translate(${visual.translateX * 100}%, ${visual.translateY * 100}%)`);
  }
  if (visual.rotate !== 0) {
    parts.push(`rotate(${visual.rotate}deg)`);
  }
  if (visual.scale !== 1) {
    parts.push(`scale(${visual.scale})`);
  }
  return parts.join(" ");
}

export function effectClipCss(points: readonly EffectPoint[]): string {
  const body = points.map((point) => `${point.x * 100}% ${point.y * 100}%`).join(", ");
  return `polygon(${body})`;
}

export function overlayEffectTransform(
  box: { x: number; y: number; width: number; height: number },
  visual: EffectVisual,
): string | undefined {
  if (
    visual.scale === 1
    && visual.translateX === 0
    && visual.translateY === 0
    && visual.rotate === 0
  ) {
    return undefined;
  }
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const shiftX = visual.translateX * box.width;
  const shiftY = visual.translateY * box.height;
  return `translate(${centerX} ${centerY}) rotate(${visual.rotate}) translate(${shiftX} ${shiftY}) scale(${visual.scale}) translate(${-centerX} ${-centerY})`;
}

export function effectClipPoints(
  box: { x: number; y: number; width: number; height: number },
  clip: readonly EffectPoint[] | null,
): string | undefined {
  if (!clip || clip.length < 3) {
    return undefined;
  }
  return clip
    .map((point) => `${box.x + point.x * box.width},${box.y + point.y * box.height}`)
    .join(" ");
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
