import { PRESENTATION_MIN_OVERLAY_SIZE } from "@/services/presentation/constants";
import type {
  PresentationArrowDirection,
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

/** Tail length as a fraction of the shorter side of the bubble body. */
const CALLOUT_TAIL_RATIO = 0.34;

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
  return Math.min(placed.width, placed.height) * CALLOUT_TAIL_RATIO;
}

function roundedRectOutline(
  left: number,
  top: number,
  width: number,
  height: number,
  radiusRatio: number,
  tail: boolean,
): string {
  const right = left + width;
  const bottom = top + height;
  const shortest = Math.min(width, height);
  let radius = (shortest / TWO) * clampUnit(radiusRatio);
  const tailBase = shortest * 0.16;
  if (tail && width - radius * TWO < tailBase) {
    radius = Math.max(0, (width - tailBase) / TWO);
  }
  const path = new PathBuilder();
  path.move(left + radius, top);
  path.line(right - radius, top);
  if (radius > 0) {
    path.arc(radius, radius, 0, right, top + radius);
  }
  path.line(right, bottom - radius);
  if (radius > 0) {
    path.arc(radius, radius, 0, right - radius, bottom);
  }
  if (tail) {
    const flatLeft = left + radius;
    const flatRight = right - radius;
    let baseLeft = left + width * 0.18;
    let baseRight = left + width * 0.42;
    const room = Math.max(flatRight - flatLeft, 0);
    const base = Math.min(tailBase, room);
    const mid = flatLeft + room / TWO;
    baseLeft = Math.min(Math.max(baseLeft, flatLeft), mid);
    baseRight = Math.max(Math.min(baseRight, flatRight), mid);
    if (baseRight - baseLeft < base) {
      baseLeft = mid - base / TWO;
      baseRight = mid + base / TWO;
    }
    const tipX = left + width * 0.08;
    const tipY = bottom + shortest * CALLOUT_TAIL_RATIO;
    path.line(baseRight, bottom);
    path.line(tipX, tipY);
    path.line(baseLeft, bottom);
  }
  path.line(left + radius, bottom);
  if (radius > 0) {
    path.arc(radius, radius, 0, left, bottom - radius);
  }
  path.line(left, top + radius);
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

function ovalCallout(left: number, top: number, width: number, height: number): string {
  const radiusX = width / TWO;
  const radiusY = height / TWO;
  const centerX = left + radiusX;
  const centerY = top + radiusY;
  const rightBase = Math.PI / TWO - 0.34;
  const leftBase = Math.PI / TWO + MIDPOINT;
  const start = ellipsePoint(centerX, centerY, radiusX, radiusY, rightBase);
  const end = ellipsePoint(centerX, centerY, radiusX, radiusY, leftBase);
  const path = new PathBuilder();
  path.move(start.x, start.y);
  path.arc(radiusX, radiusY, 1, end.x, end.y);
  path.line(left + width * 0.1, top + height + Math.min(width, height) * CALLOUT_TAIL_RATIO);
  path.close();
  return path.toString();
}

function cloudCallout(left: number, top: number, width: number, height: number): string {
  const centerX = left + width / TWO;
  const centerY = top + height * 0.46;
  const radiusX = width * 0.34;
  const radiusY = height * 0.28;
  const bulge = Math.min(width, height) * 0.13;
  const start = Math.PI / TWO - 0.4;
  const end = start + Math.PI * TWO - 0.95;
  const angles = Array.from({ length: CLOUD_SCALLOPS + 1 }, (_, index) =>
    start + ((end - start) * index) / CLOUD_SCALLOPS,
  );
  const path = new PathBuilder();
  const first = ellipsePoint(centerX, centerY, radiusX, radiusY, angles[0]);
  path.move(first.x, first.y);
  for (let index = 0; index < angles.length - 1; index += 1) {
    const mid = (angles[index] + angles[index + 1]) / TWO;
    const control = ellipsePoint(centerX, centerY, radiusX + bulge, radiusY + bulge, mid);
    const next = ellipsePoint(centerX, centerY, radiusX, radiusY, angles[index + 1]);
    path.quad(control.x, control.y, next.x, next.y);
  }
  path.line(left + width * 0.12, top + height + Math.min(width, height) * CALLOUT_TAIL_RATIO);
  path.close();
  return path.toString();
}

export function roundedRectPath(box: OverlayBox, radiusRatio: number): string {
  const placed = positiveBox(box);
  return roundedRectOutline(placed.x, placed.y, placed.width, placed.height, radiusRatio, false);
}

export function calloutPath(
  box: OverlayBox,
  shape: PresentationBubbleShape,
  radiusRatio: number,
): string {
  const placed = positiveBox(box);
  if (shape === "oval") {
    return ovalCallout(placed.x, placed.y, placed.width, placed.height);
  }
  if (shape === "cloud") {
    return cloudCallout(placed.x, placed.y, placed.width, placed.height);
  }
  return roundedRectOutline(placed.x, placed.y, placed.width, placed.height, radiusRatio, true);
}

function placeInBox(
  nx: number,
  ny: number,
  box: OverlayBox,
  direction: PresentationArrowDirection,
): { x: number; y: number } {
  const placed = positiveBox(box);
  let across = nx;
  let down = ny;
  if (direction === "left") {
    across = 1 - nx;
  } else if (direction === "down") {
    across = 1 - ny;
    down = nx;
  } else if (direction === "up") {
    across = ny;
    down = 1 - nx;
  }
  return {
    x: placed.x + across * placed.width,
    y: placed.y + down * placed.height,
  };
}

export function blockArrowPath(box: OverlayBox, direction: PresentationArrowDirection): string {
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
    const point = placeInBox(nx, ny, box, direction);
    if (index === 0) {
      path.move(point.x, point.y);
      return;
    }
    path.line(point.x, point.y);
  });
  path.close();
  return path.toString();
}

/** Index finger points to the right of the unit box before the direction is applied. */
const POINTER_HAND = [
  { op: "M" as const, x: 0.1, y: 0.38 },
  { op: "C" as const, x1: 0.1, y1: 0.28, x2: 0.18, y2: 0.24, x: 0.28, y: 0.28 },
  { op: "L" as const, x: 0.4, y: 0.28 },
  { op: "L" as const, x: 0.4, y: 0.16 },
  { op: "C" as const, x1: 0.4, y1: 0.1, x2: 0.48, y2: 0.08, x: 0.54, y: 0.12 },
  { op: "L" as const, x: 0.9, y: 0.12 },
  { op: "C" as const, x1: 0.98, y1: 0.12, x2: 1, y2: 0.18, x: 0.98, y: 0.26 },
  { op: "L" as const, x: 0.86, y: 0.34 },
  { op: "L" as const, x: 0.52, y: 0.36 },
  { op: "L" as const, x: 0.6, y: 0.5 },
  { op: "C" as const, x1: 0.66, y1: 0.58, x2: 0.58, y2: 0.66, x: 0.48, y: 0.62 },
  { op: "L" as const, x: 0.34, y: 0.54 },
  { op: "L" as const, x: 0.28, y: 0.68 },
  { op: "C" as const, x1: 0.24, y1: 0.78, x2: 0.12, y2: 0.74, x: 0.12, y: 0.62 },
  { op: "L" as const, x: 0.12, y: 0.48 },
  { op: "C" as const, x1: 0.08, y1: 0.46, x2: 0.08, y2: 0.42, x: 0.1, y: 0.38 },
];

export function pointerHandPath(box: OverlayBox, direction: PresentationArrowDirection): string {
  const path = new PathBuilder();
  for (const command of POINTER_HAND) {
    if (command.op === "M") {
      const point = placeInBox(command.x, command.y, box, direction);
      path.move(point.x, point.y);
    } else if (command.op === "L") {
      const point = placeInBox(command.x, command.y, box, direction);
      path.line(point.x, point.y);
    } else {
      const first = placeInBox(command.x1, command.y1, box, direction);
      const second = placeInBox(command.x2, command.y2, box, direction);
      const point = placeInBox(command.x, command.y, box, direction);
      path.cubic(first.x, first.y, second.x, second.y, point.x, point.y);
    }
  }
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

/** One filled outline, or null when the overlay is only a stroke or plain text. */
export function overlayOutline(overlay: PresentationOverlay, box: OverlayBox): string | null {
  if (overlay.shape === "arrow") {
    if (overlay.arrowForm === "shape") {
      return blockArrowPath(box, overlay.arrowDirection);
    }
    if (overlay.arrowForm === "pointer") {
      return pointerHandPath(box, overlay.arrowDirection);
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
    return calloutPath(box, overlay.bubbleShape, overlay.cornerRadius);
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
