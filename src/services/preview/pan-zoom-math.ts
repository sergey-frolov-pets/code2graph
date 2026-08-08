import {
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

export function clampPan(
  panX: number,
  panY: number,
  scaledWidth: number,
  scaledHeight: number,
  containerWidth: number,
  containerHeight: number,
): { panX: number; panY: number } {
  const minX = -scaledWidth;
  const maxX = containerWidth;
  const minY = -scaledHeight;
  const maxY = containerHeight;

  return {
    panX: Math.min(maxX, Math.max(minX, panX)),
    panY: Math.min(maxY, Math.max(minY, panY)),
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
