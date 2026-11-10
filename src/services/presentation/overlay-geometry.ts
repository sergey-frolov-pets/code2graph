import {
  PRESENTATION_CALLOUT_TAIL_RATIO,
  PRESENTATION_DEFAULT_TAIL_X,
  PRESENTATION_FULL_CIRCLE,
  PRESENTATION_MIN_OVERLAY_SIZE,
  PRESENTATION_ROTATION_STEP,
  PRESENTATION_TAIL_LIMIT,
} from "@/services/presentation/constants";
import type {
  PresentationArrowKind,
  PresentationBubbleShape,
  PresentationOverlay,
} from "@/services/presentation/types";

export interface OverlayBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw"
  | "start"
  | "end";

export type ResizeCursor =
  | "ns-resize"
  | "ew-resize"
  | "nwse-resize"
  | "nesw-resize"
  | "grab";

export interface ResizeHandlePoint {
  id: ResizeHandle;
  x: number;
  y: number;
  cursor: ResizeCursor;
}

/** Width of the tail where it meets the body, as a fraction of the shorter side. */
const CALLOUT_TAIL_BASE_RATIO = 0.16;

const OVAL_TAIL_GAP = 0.42;

export interface CalloutTip {
  /** Fraction of the body width, from the left. May sit outside the body. */
  x: number;
  /** Fraction of the body height, from the top. May sit outside the body. */
  y: number;
}

export function clampCalloutTip(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(PRESENTATION_TAIL_LIMIT, Math.max(-PRESENTATION_TAIL_LIMIT, value));
}

export function defaultCalloutTip(box: OverlayBox): CalloutTip {
  const placed = positiveBox(box);
  const height = placed.height || 1;
  const shortest = Math.min(placed.width, height);
  return {
    x: PRESENTATION_DEFAULT_TAIL_X,
    y: 1 + (shortest / height) * PRESENTATION_CALLOUT_TAIL_RATIO,
  };
}

function tipPoint(box: OverlayBox, tip: CalloutTip): { x: number; y: number } {
  const placed = positiveBox(box);
  return {
    x: placed.x + tip.x * placed.width,
    y: placed.y + tip.y * placed.height,
  };
}

/** How far a curved arrow bows away from the straight line, relative to its length. */
const LINE_ARROW_BOW = 0.35;

/** Share of a block arrow's length taken by the head. */
const BLOCK_ARROW_HEAD = 0.36;

const BLOCK_ARROW_SHAFT_TOP = 0.28;

const BLOCK_ARROW_SHAFT_BOTTOM = 0.72;

const CLOUD_SCALLOPS = 8;

const CORNER_RADIUS_LIMIT = 1;

const TWO = 2;
const MIDPOINT = 0.5;

function formatCoordinate(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

class PathBuilder {
  private readonly parts: string[] = [];

  move(x: number, y: number): void {
    this.parts.push(`M ${formatCoordinate(x)} ${formatCoordinate(y)}`);
  }

  line(x: number, y: number): void {
    this.parts.push(`L ${formatCoordinate(x)} ${formatCoordinate(y)}`);
  }

  quad(controlX: number, controlY: number, x: number, y: number): void {
    this.parts.push(
      `Q ${formatCoordinate(controlX)} ${formatCoordinate(controlY)} ${formatCoordinate(x)} ${formatCoordinate(y)}`,
    );
  }

  cubic(
    controlX1: number,
    controlY1: number,
    controlX2: number,
    controlY2: number,
    x: number,
    y: number,
  ): void {
    this.parts.push(
      `C ${formatCoordinate(controlX1)} ${formatCoordinate(controlY1)} ${formatCoordinate(controlX2)} ${formatCoordinate(controlY2)} ${formatCoordinate(x)} ${formatCoordinate(y)}`,
    );
  }

  arc(radiusX: number, radiusY: number, large: 0 | 1, x: number, y: number): void {
    this.parts.push(
      `A ${formatCoordinate(radiusX)} ${formatCoordinate(radiusY)} 0 ${large} 1 ${formatCoordinate(x)} ${formatCoordinate(y)}`,
    );
  }

  close(): void {
    this.parts.push("Z");
  }

  toString(): string {
    return this.parts.join(" ");
  }
}

export function positiveBox(box: OverlayBox): OverlayBox {
  return {
    x: Math.min(box.x, box.x + box.width),
    y: Math.min(box.y, box.y + box.height),
    width: Math.abs(box.width),
    height: Math.abs(box.height),
  };
}

function clampUnit(value: number): number {
  return Math.min(CORNER_RADIUS_LIMIT, Math.max(0, value));
}

export function calloutTailLength(box: OverlayBox): number {
  const placed = positiveBox(box);
  return Math.min(placed.width, placed.height) * PRESENTATION_CALLOUT_TAIL_RATIO;
}

type RectSide = "top" | "right" | "bottom" | "left";

function tailSide(
  left: number,
  top: number,
  width: number,
  height: number,
  tipX: number,
  tipY: number,
): RectSide {
  const outside: Record<RectSide, number> = {
    left: left - tipX,
    right: tipX - (left + width),
    top: top - tipY,
    bottom: tipY - (top + height),
  };
  return (Object.entries(outside) as Array<[RectSide, number]>).reduce((best, entry) =>
    entry[1] > best[1] ? entry : best,
  )[0];
}

function edgeWithTip(
  path: PathBuilder,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tip: { x: number; y: number } | null,
  base: number,
): void {
  if (!tip) {
    path.line(x2, y2);
    return;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length <= 0) {
    path.line(tip.x, tip.y);
    path.line(x2, y2);
    return;
  }
  const ux = dx / length;
  const uy = dy / length;
  const projected = (tip.x - x1) * ux + (tip.y - y1) * uy;
  const half = Math.min(base / TWO, length / TWO);
  const center = Math.min(length - half, Math.max(half, projected));
  path.line(x1 + ux * (center - half), y1 + uy * (center - half));
  path.line(tip.x, tip.y);
  path.line(x1 + ux * (center + half), y1 + uy * (center + half));
  path.line(x2, y2);
}

function roundedRectOutline(
  left: number,
  top: number,
  width: number,
  height: number,
  radiusRatio: number,
  tip: { x: number; y: number } | null,
): string {
  const right = left + width;
  const bottom = top + height;
  const shortest = Math.min(width, height);
  let radius = (shortest / TWO) * clampUnit(radiusRatio);
  const side = tip ? tailSide(left, top, width, height, tip.x, tip.y) : null;
  const tailBase = shortest * CALLOUT_TAIL_BASE_RATIO;
  const horizontal = side === "top" || side === "bottom";
  const span = horizontal ? width : height;
  if (side && span - radius * TWO < tailBase) {
    radius = Math.max(0, (span - tailBase) / TWO);
  }
  const path = new PathBuilder();
  path.move(left + radius, top);
  edgeWithTip(path, left + radius, top, right - radius, top, side === "top" ? tip : null, tailBase);
  if (radius > 0) {
    path.arc(radius, radius, 0, right, top + radius);
  }
  edgeWithTip(path, right, top + radius, right, bottom - radius, side === "right" ? tip : null, tailBase);
  if (radius > 0) {
    path.arc(radius, radius, 0, right - radius, bottom);
  }
  edgeWithTip(
    path,
    right - radius,
    bottom,
    left + radius,
    bottom,
    side === "bottom" ? tip : null,
    tailBase,
  );
  if (radius > 0) {
    path.arc(radius, radius, 0, left, bottom - radius);
  }
  edgeWithTip(path, left, bottom - radius, left, top + radius, side === "left" ? tip : null, tailBase);
  if (radius > 0) {
    path.arc(radius, radius, 0, left + radius, top);
  }
  path.close();
  return path.toString();
}

function ellipsePoint(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  angle: number,
): { x: number; y: number } {
  return {
    x: centerX + Math.cos(angle) * radiusX,
    y: centerY + Math.sin(angle) * radiusY,
  };
}

function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function ovalCallout(
  left: number,
  top: number,
  width: number,
  height: number,
  tipX: number,
  tipY: number,
): string {
  const radiusX = width / TWO;
  const radiusY = height / TWO;
  const centerX = left + radiusX;
  const centerY = top + radiusY;
  const angle = Math.atan2(tipY - centerY, tipX - centerX);
  const start = ellipsePoint(centerX, centerY, radiusX, radiusY, angle + OVAL_TAIL_GAP);
  const end = ellipsePoint(centerX, centerY, radiusX, radiusY, angle - OVAL_TAIL_GAP);
  const path = new PathBuilder();
  path.move(start.x, start.y);
  path.arc(radiusX, radiusY, 1, end.x, end.y);
  path.line(tipX, tipY);
  path.close();
  return path.toString();
}

function cloudCallout(
  left: number,
  top: number,
  width: number,
  height: number,
  tipX: number,
  tipY: number,
): string {
  const centerX = left + width / TWO;
  const centerY = top + height * 0.46;
  const radiusX = width * 0.34;
  const radiusY = height * 0.28;
  const bulge = Math.min(width, height) * 0.13;
  const tipAngle = Math.atan2(tipY - centerY, tipX - centerX);
  const sweep = Math.PI * TWO;
  const angles = Array.from({ length: CLOUD_SCALLOPS + 1 }, (_, index) =>
    -Math.PI + (sweep * index) / CLOUD_SCALLOPS,
  );
  let closest = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < angles.length - 1; index += 1) {
    const mid = (angles[index] + angles[index + 1]) / TWO;
    const delta = Math.abs(angleDelta(tipAngle, mid));
    if (delta < best) {
      best = delta;
      closest = index;
    }
  }
  const path = new PathBuilder();
  const first = ellipsePoint(centerX, centerY, radiusX, radiusY, angles[0]);
  path.move(first.x, first.y);
  for (let index = 0; index < angles.length - 1; index += 1) {
    const next = ellipsePoint(centerX, centerY, radiusX, radiusY, angles[index + 1]);
    if (index === closest) {
      path.line(tipX, tipY);
      path.line(next.x, next.y);
      continue;
    }
    const mid = (angles[index] + angles[index + 1]) / TWO;
    const control = ellipsePoint(centerX, centerY, radiusX + bulge, radiusY + bulge, mid);
    path.quad(control.x, control.y, next.x, next.y);
  }
  path.close();
  return path.toString();
}

export function roundedRectPath(box: OverlayBox, radiusRatio: number): string {
  const placed = positiveBox(box);
  return roundedRectOutline(placed.x, placed.y, placed.width, placed.height, radiusRatio, null);
}

export function calloutPath(
  box: OverlayBox,
  shape: PresentationBubbleShape,
  radiusRatio: number,
  tip: CalloutTip = defaultCalloutTip(box),
): string {
  const placed = positiveBox(box);
  const point = tipPoint(box, tip);
  if (shape === "oval") {
    return ovalCallout(placed.x, placed.y, placed.width, placed.height, point.x, point.y);
  }
  if (shape === "cloud") {
    return cloudCallout(placed.x, placed.y, placed.width, placed.height, point.x, point.y);
  }
  return roundedRectOutline(placed.x, placed.y, placed.width, placed.height, radiusRatio, point);
}

function placeInBox(nx: number, ny: number, box: OverlayBox): { x: number; y: number } {
  const placed = positiveBox(box);
  return {
    x: placed.x + nx * placed.width,
    y: placed.y + ny * placed.height,
  };
}

export function blockArrowPath(box: OverlayBox): string {
  const head = 1 - BLOCK_ARROW_HEAD;
  const points = [
    [0, BLOCK_ARROW_SHAFT_TOP],
    [head, BLOCK_ARROW_SHAFT_TOP],
    [head, 0.02],
    [1, MIDPOINT],
    [head, 0.98],
    [head, BLOCK_ARROW_SHAFT_BOTTOM],
    [0, BLOCK_ARROW_SHAFT_BOTTOM],
  ];
  const path = new PathBuilder();
  points.forEach(([nx, ny], index) => {
    const point = placeInBox(nx, ny, box);
    if (index === 0) {
      path.move(point.x, point.y);
      return;
    }
    path.line(point.x, point.y);
  });
  path.close();
  return path.toString();
}

export function lineArrowPath(box: OverlayBox, kind: PresentationArrowKind): string {
  const startX = box.x;
  const startY = box.y;
  const endX = box.x + box.width;
  const endY = box.y + box.height;
  if (kind === "elbow") {
    return `M ${formatCoordinate(startX)} ${formatCoordinate(startY)} L ${formatCoordinate(endX)} ${formatCoordinate(startY)} L ${formatCoordinate(endX)} ${formatCoordinate(endY)}`;
  }
  if (kind === "curve") {
    const controlX = (startX + endX) / TWO - (endY - startY) * LINE_ARROW_BOW;
    const controlY = (startY + endY) / TWO + (endX - startX) * LINE_ARROW_BOW;
    return `M ${formatCoordinate(startX)} ${formatCoordinate(startY)} Q ${formatCoordinate(controlX)} ${formatCoordinate(controlY)} ${formatCoordinate(endX)} ${formatCoordinate(endY)}`;
  }
  return `M ${formatCoordinate(startX)} ${formatCoordinate(startY)} L ${formatCoordinate(endX)} ${formatCoordinate(endY)}`;
}

export function isLineArrow(overlay: PresentationOverlay): boolean {
  return overlay.shape === "arrow" && overlay.arrowForm === "line";
}

export function overlayRotates(overlay: PresentationOverlay): boolean {
  return overlay.shape === "arrow" && overlay.arrowForm !== "line";
}

const ROTATION_TURNS = PRESENTATION_FULL_CIRCLE / PRESENTATION_ROTATION_STEP;

export function snapRotation(value: number): number {
  const turns = Math.round(value / PRESENTATION_ROTATION_STEP);
  const wrapped = ((turns % ROTATION_TURNS) + ROTATION_TURNS) % ROTATION_TURNS;
  return wrapped * PRESENTATION_ROTATION_STEP;
}

export function stepRotation(value: number, direction: -1 | 1): number {
  return snapRotation(snapRotation(value) + direction * PRESENTATION_ROTATION_STEP);
}

/** One filled outline, or null when the overlay is only a stroke or plain text. */
export function overlayOutline(overlay: PresentationOverlay, box: OverlayBox): string | null {
  if (overlay.shape === "arrow") {
    if (overlay.arrowForm === "shape") {
      return blockArrowPath(box);
    }
    return null;
  }
  if (overlay.shape === "ellipse") {
    const placed = positiveBox(box);
    const radiusX = placed.width / TWO;
    const radiusY = placed.height / TWO;
    const centerX = placed.x + radiusX;
    const centerY = placed.y + radiusY;
    const path = new PathBuilder();
    path.move(centerX - radiusX, centerY);
    path.arc(radiusX, radiusY, 1, centerX + radiusX, centerY);
    path.arc(radiusX, radiusY, 1, centerX - radiusX, centerY);
    path.close();
    return path.toString();
  }
  if (overlay.shape === "rect") {
    return roundedRectPath(box, overlay.cornerRadius);
  }
  if (overlay.shape === "text") {
    if (overlay.backing === "none") {
      return null;
    }
    if (overlay.backing === "rectangle") {
      return roundedRectPath(box, overlay.cornerRadius);
    }
    return calloutPath(box, overlay.bubbleShape, overlay.cornerRadius, {
      x: overlay.tailX,
      y: overlay.tailY,
    });
  }
  return null;
}

const BOX_HANDLES: Array<{ id: ResizeHandle; cursor: ResizeCursor; x: number; y: number }> = [
  { id: "nw", cursor: "nwse-resize", x: 0, y: 0 },
  { id: "n", cursor: "ns-resize", x: MIDPOINT, y: 0 },
  { id: "ne", cursor: "nesw-resize", x: 1, y: 0 },
  { id: "e", cursor: "ew-resize", x: 1, y: MIDPOINT },
  { id: "se", cursor: "nwse-resize", x: 1, y: 1 },
  { id: "s", cursor: "ns-resize", x: MIDPOINT, y: 1 },
  { id: "sw", cursor: "nesw-resize", x: 0, y: 1 },
  { id: "w", cursor: "ew-resize", x: 0, y: 0.5 },
];

export function overlayResizeHandles(overlay: PresentationOverlay): ResizeHandlePoint[] {
  if (isLineArrow(overlay)) {
    return [
      { id: "start", x: overlay.x, y: overlay.y, cursor: "grab" },
      {
        id: "end",
        x: overlay.x + overlay.width,
        y: overlay.y + overlay.height,
        cursor: "grab",
      },
    ];
  }
  const placed = positiveBox(overlay);
  return BOX_HANDLES.map((handle) => ({
    id: handle.id,
    cursor: handle.cursor,
    x: placed.x + placed.width * handle.x,
    y: placed.y + placed.height * handle.y,
  }));
}

function keepSize(start: number, end: number, movingStart: boolean): { start: number; end: number } {
  let nextStart = start;
  let nextEnd = end;
  let moving = movingStart;
  if (nextEnd < nextStart) {
    const swap = nextStart;
    nextStart = nextEnd;
    nextEnd = swap;
    moving = !moving;
  }
  if (nextEnd - nextStart < PRESENTATION_MIN_OVERLAY_SIZE) {
    if (moving) {
      nextStart = nextEnd - PRESENTATION_MIN_OVERLAY_SIZE;
    } else {
      nextEnd = nextStart + PRESENTATION_MIN_OVERLAY_SIZE;
    }
  }
  return { start: nextStart, end: nextEnd };
}

export function resizeOverlay(box: OverlayBox, handle: ResizeHandle, point: { x: number; y: number }): OverlayBox {
  if (handle === "end") {
    return {
      x: box.x,
      y: box.y,
      width: point.x - box.x,
      height: point.y - box.y,
    };
  }
  if (handle === "start") {
    return {
      x: point.x,
      y: point.y,
      width: box.x + box.width - point.x,
      height: box.y + box.height - point.y,
    };
  }
  let left = Math.min(box.x, box.x + box.width);
  let right = Math.max(box.x, box.x + box.width);
  let top = Math.min(box.y, box.y + box.height);
  let bottom = Math.max(box.y, box.y + box.height);
  const movesLeft = handle === "w" || handle === "nw" || handle === "sw";
  const movesRight = handle === "e" || handle === "ne" || handle === "se";
  const movesTop = handle === "n" || handle === "nw" || handle === "ne";
  const movesBottom = handle === "s" || handle === "sw" || handle === "se";
  if (movesLeft) {
    left = point.x;
  }
  if (movesRight) {
    right = point.x;
  }
  if (movesTop) {
    top = point.y;
  }
  if (movesBottom) {
    bottom = point.y;
  }
  if (movesLeft || movesRight) {
    const across = keepSize(left, right, movesLeft);
    left = across.start;
    right = across.end;
  }
  if (movesTop || movesBottom) {
    const down = keepSize(top, bottom, movesTop);
    top = down.start;
    bottom = down.end;
  }
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}
