import {
  PREVIEW_PAN_GRID_CELLS,
  PREVIEW_WHEEL_LINE_PIXELS,
  PREVIEW_ZOOM_SENSITIVITY,
  PREVIEW_ZOOM_STEP,
} from "@/constants/preview-pan-zoom";

export type Size = { width: number; height: number };
export type ViewportPoint = { x: number; y: number };
export type TrackedPointer = ViewportPoint & {
  clientX: number;
  clientY: number;
};

export const PAN_ZOOM_SCALE_EPSILON = 1e-6;

export function readViewportSize(viewport: HTMLElement): Size {
  return {
    width: viewport.clientWidth,
    height: viewport.clientHeight,
  };
}

/** Lets the sheet slide until it has passed completely out of the viewport. */
function clampAxis(
  value: number,
  contentSize: number,
  viewportSize: number,
): number {
  return Math.min(viewportSize, Math.max(-contentSize, value));
}

/** Sheet around the picture. Its origin is the top-left of the center cell. */
export function panSheetBox(width: number, height: number): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const pad = (PREVIEW_PAN_GRID_CELLS - 1) / 2;
  return {
    x: -width * pad,
    y: -height * pad,
    width: width * PREVIEW_PAN_GRID_CELLS,
    height: height * PREVIEW_PAN_GRID_CELLS,
  };
}

/**
 * Slides the picture across a sheet of {@link PREVIEW_PAN_GRID_CELLS} by
 * {@link PREVIEW_PAN_GRID_CELLS} cells of its own size. The picture is the
 * center cell. The sheet may leave the viewport, so a camera move can pull
 * the picture fully past an edge. `pan` is the picture's top-left.
 */
export function clampPan(
  panX: number,
  panY: number,
  scaledWidth: number,
  scaledHeight: number,
  containerWidth: number,
  containerHeight: number,
): { panX: number; panY: number } {
  const sheet = panSheetBox(scaledWidth, scaledHeight);
  const originX = clampAxis(panX + sheet.x, sheet.width, containerWidth);
  const originY = clampAxis(panY + sheet.y, sheet.height, containerHeight);
  return {
    panX: originX - sheet.x,
    panY: originY - sheet.y,
  };
}

export function normalizeWheelDelta(event: WheelEvent, viewportHeight: number): number {
  let delta = event.deltaY;

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    delta *= PREVIEW_WHEEL_LINE_PIXELS;
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    delta *= viewportHeight;
  }

  if (event.ctrlKey) {
    delta *= 2;
  }

  return delta;
}

export function getWheelZoomFactor(event: WheelEvent, viewportHeight: number): number {
  const delta = normalizeWheelDelta(event, viewportHeight);

  if (delta === 0) {
    return 1;
  }

  if (
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
    && Math.abs(event.deltaY) <= 3
  ) {
    return event.deltaY < 0 ? PREVIEW_ZOOM_STEP : 1 / PREVIEW_ZOOM_STEP;
  }

  return Math.exp(-delta * PREVIEW_ZOOM_SENSITIVITY);
}

export function getPointersDistance(
  first: ViewportPoint,
  second: ViewportPoint,
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function getPointersMidpoint(
  first: ViewportPoint,
  second: ViewportPoint,
): ViewportPoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function toTrackedPointer(
  event: PointerEvent,
  viewport: HTMLElement,
): TrackedPointer {
  const rect = viewport.getBoundingClientRect();
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}
