import type {
  NormPoint,
  PresentationPathKind,
  PresentationTransition,
} from "@/services/presentation/types";

function clampUnit(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

export function easeInOut(value: number): number {
  const t = clampUnit(value);
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function lerp(from: NormPoint, to: NormPoint, t: number): NormPoint {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

function pointOnPolyline(points: NormPoint[], t: number): NormPoint {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1 || t <= 0) {
    return points[0];
  }
  if (t >= 1) {
    return points[points.length - 1];
  }

  const lengths: number[] = [];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const length = Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
    lengths.push(length);
    total += length;
  }
  if (total === 0) {
    return points[0];
  }

  let remaining = t * total;
  for (let index = 0; index < lengths.length; index += 1) {
    const segment = lengths[index];
    if (remaining <= segment) {
      const local = segment === 0 ? 0 : remaining / segment;
      return lerp(points[index], points[index + 1], local);
    }
    remaining -= segment;
  }
  return points[points.length - 1];
}

function quadratic(from: NormPoint, control: NormPoint, to: NormPoint, t: number): NormPoint {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
    y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
  };
}

function cubic(
  from: NormPoint,
  controlA: NormPoint,
  controlB: NormPoint,
  to: NormPoint,
  t: number,
): NormPoint {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * from.x
      + 3 * inverse ** 2 * t * controlA.x
      + 3 * inverse * t ** 2 * controlB.x
      + t ** 3 * to.x,
    y:
      inverse ** 3 * from.y
      + 3 * inverse ** 2 * t * controlA.y
      + 3 * inverse * t ** 2 * controlB.y
      + t ** 3 * to.y,
  };
}

export function sampleTransitionPoint(
  from: NormPoint,
  to: NormPoint,
  transition: Pick<PresentationTransition, "path" | "points" | "controls">,
  amount: number,
): NormPoint {
  const t = clampUnit(amount);
  const kind: PresentationPathKind = transition.path;
  if (kind === "polyline" && transition.points.length > 0) {
    return pointOnPolyline([from, ...transition.points, to], t);
  }
  if (kind === "quadratic" && transition.controls[0]) {
    return quadratic(from, transition.controls[0], to, t);
  }
  if (kind === "cubic" && transition.controls[0] && transition.controls[1]) {
    return cubic(from, transition.controls[0], transition.controls[1], to, t);
  }
  return lerp(from, to, t);
}

export function lerpScale(fromScale: number, toScale: number, amount: number): number {
  const t = clampUnit(amount);
  return fromScale + (toScale - fromScale) * t;
}
