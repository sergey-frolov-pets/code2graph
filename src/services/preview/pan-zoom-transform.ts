import {
  PREVIEW_FIT_MARGIN_RATIO,
  PREVIEW_MIN_ZOOM,
  PREVIEW_ZOOM_STEP,
} from "@/constants/preview-pan-zoom";
import {
  clampPan,
  PAN_ZOOM_SCALE_EPSILON,
  readViewportSize,
  type Size,
} from "@/services/preview/pan-zoom-math";
import {
  notifyPanZoomChange,
  type PanZoomMutableState,
  type PreviewPanZoomDeps,
} from "@/services/preview/pan-zoom-types";
import { parseSvgSize } from "@/utils/export";

const SCALE_EPSILON = PAN_ZOOM_SCALE_EPSILON;

export function getScaledSize(state: PanZoomMutableState): Size {
  return {
    width: state.imageWidth * state.scale,
    height: state.imageHeight * state.scale,
  };
}

export function applyClamp(
  state: PanZoomMutableState,
  deps: PreviewPanZoomDeps,
): void {
  const viewport = deps.getViewport();
  if (!viewport) {
    return;
  }

  const { width: cw, height: ch } = readViewportSize(viewport);
  const { width: sw, height: sh } = getScaledSize(state);
  const clamped = clampPan(state.panX, state.panY, sw, sh, cw, ch);
  state.panX = clamped.panX;
  state.panY = clamped.panY;
  notifyPanZoomChange(state, deps);
}

export function fitToView(
  state: PanZoomMutableState,
  deps: PreviewPanZoomDeps,
): void {
  const viewport = deps.getViewport();
  if (!viewport) {
    return;
  }

  const { width: cw, height: ch } = readViewportSize(viewport);
  if (cw <= 0 || ch <= 0 || state.imageWidth <= 0 || state.imageHeight <= 0) {
    return;
  }

  const fitScale = Math.min(
    (cw * PREVIEW_FIT_MARGIN_RATIO) / state.imageWidth,
    (ch * PREVIEW_FIT_MARGIN_RATIO) / state.imageHeight,
  );
  state.scale = Math.max(PREVIEW_MIN_ZOOM, fitScale);

  const { width: sw, height: sh } = getScaledSize(state);
  const clamped = clampPan((cw - sw) / 2, (ch - sh) / 2, sw, sh, cw, ch);
  state.panX = clamped.panX;
  state.panY = clamped.panY;
  notifyPanZoomChange(state, deps);
}

export function measureImageSize(
  state: PanZoomMutableState,
  deps: PreviewPanZoomDeps,
): void {
  const svgMarkup = deps.getSvgMarkup();
  if (!svgMarkup) {
    return;
  }

  const parsed = parseSvgSize(svgMarkup);
  state.imageWidth = parsed.width;
  state.imageHeight = parsed.height;

  const content = deps.getContent();
  const svg = content?.querySelector("svg");
  if (!svg) {
    notifyPanZoomChange(state, deps);
    return;
  }

  try {
    const box = svg.getBBox();
    if (box.width <= 0 || box.height <= 0) {
      notifyPanZoomChange(state, deps);
      return;
    }

    const overflowRatio = Math.max(
      box.width / parsed.width,
      box.height / parsed.height,
    );
    if (overflowRatio <= 1.5) {
      state.imageWidth = box.width;
      state.imageHeight = box.height;
    }
  } catch {
    // getBBox may fail before the SVG is painted.
  }

  notifyPanZoomChange(state, deps);
}

export function syncFromMarkup(
  state: PanZoomMutableState,
  deps: PreviewPanZoomDeps,
): void {
  const svgMarkup = deps.getSvgMarkup();
  if (!svgMarkup) {
    return;
  }

  const parsed = parseSvgSize(svgMarkup);
  state.imageWidth = parsed.width;
  state.imageHeight = parsed.height;
  notifyPanZoomChange(state, deps);

  queueMicrotask(() => {
    measureImageSize(state, deps);
    fitToView(state, deps);
  });
}

export function getViewportCenter(deps: PreviewPanZoomDeps): { x: number; y: number } {
  const viewport = deps.getViewport();
  if (!viewport) {
    return { x: 0, y: 0 };
  }

  const { width, height } = readViewportSize(viewport);
  return { x: width / 2, y: height / 2 };
}

export function zoomAt(
  state: PanZoomMutableState,
  deps: PreviewPanZoomDeps,
  cursorX: number,
  cursorY: number,
  zoomFactor: number,
): void {
  if (zoomFactor === 1) {
    return;
  }

  const oldScale = state.scale;
  const newScale = Math.max(PREVIEW_MIN_ZOOM, oldScale * zoomFactor);
  if (Math.abs(newScale - oldScale) < SCALE_EPSILON) {
    return;
  }

  const ratio = newScale / oldScale;
  state.panX = cursorX - (cursorX - state.panX) * ratio;
  state.panY = cursorY - (cursorY - state.panY) * ratio;
  state.scale = newScale;
  applyClamp(state, deps);
}

export function zoomIn(
  state: PanZoomMutableState,
  deps: PreviewPanZoomDeps,
): void {
  const center = getViewportCenter(deps);
  zoomAt(state, deps, center.x, center.y, PREVIEW_ZOOM_STEP);
}

export function zoomOut(
  state: PanZoomMutableState,
  deps: PreviewPanZoomDeps,
): void {
  const center = getViewportCenter(deps);
  zoomAt(state, deps, center.x, center.y, 1 / PREVIEW_ZOOM_STEP);
}
