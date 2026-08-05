import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type Ref,
} from "vue";
import {
  PREVIEW_FIT_MARGIN_RATIO,
  PREVIEW_MIN_ZOOM,
  PREVIEW_WHEEL_LINE_PIXELS,
  PREVIEW_ZOOM_SENSITIVITY,
  PREVIEW_ZOOM_STEP,
} from "@/constants/preview-pan-zoom";
import { parseSvgSize } from "@/utils/export";

type Size = { width: number; height: number };
type ViewportPoint = { x: number; y: number };
type TrackedPointer = ViewportPoint & {
  clientX: number;
  clientY: number;
};

const SCALE_EPSILON = 1e-6;

function readViewportSize(viewport: HTMLElement): Size {
  return {
    width: viewport.clientWidth,
    height: viewport.clientHeight,
  };
}

function clampPan(
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

function normalizeWheelDelta(event: WheelEvent, viewportHeight: number): number {
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

function getWheelZoomFactor(event: WheelEvent, viewportHeight: number): number {
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

function getPointersDistance(
  first: ViewportPoint,
  second: ViewportPoint,
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getPointersMidpoint(
  first: ViewportPoint,
  second: ViewportPoint,
): ViewportPoint {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

function toTrackedPointer(
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

export function usePreviewPanZoom(
  viewportRef: Ref<HTMLElement | null>,
  contentRef: Ref<HTMLElement | null>,
  svgMarkup: Ref<string>,
) {
  const panX = ref(0);
  const panY = ref(0);
  const scale = ref(1);
  const imageWidth = ref(800);
  const imageHeight = ref(600);
  const isDragging = ref(false);
  const isPinching = ref(false);

  const activePointers = new Map<number, TrackedPointer>();
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let activePointerId: number | null = null;
  let lastPinchDistance = 0;
  let resizeObserver: ResizeObserver | null = null;
  let wheelListener: ((event: WheelEvent) => void) | null = null;
  let touchMoveListener: ((event: TouchEvent) => void) | null = null;

  function getScaledSize(): Size {
    return {
      width: imageWidth.value * scale.value,
      height: imageHeight.value * scale.value,
    };
  }

  function applyClamp(): void {
    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    const { width: cw, height: ch } = readViewportSize(viewport);
    const { width: sw, height: sh } = getScaledSize();
    const clamped = clampPan(panX.value, panY.value, sw, sh, cw, ch);
    panX.value = clamped.panX;
    panY.value = clamped.panY;
  }

  function fitToView(): void {
    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    const { width: cw, height: ch } = readViewportSize(viewport);
    if (cw <= 0 || ch <= 0 || imageWidth.value <= 0 || imageHeight.value <= 0) {
      return;
    }

    const fitScale = Math.min(
      (cw * PREVIEW_FIT_MARGIN_RATIO) / imageWidth.value,
      (ch * PREVIEW_FIT_MARGIN_RATIO) / imageHeight.value,
    );
    scale.value = Math.max(PREVIEW_MIN_ZOOM, fitScale);

    const { width: sw, height: sh } = getScaledSize();
    const clamped = clampPan((cw - sw) / 2, (ch - sh) / 2, sw, sh, cw, ch);
    panX.value = clamped.panX;
    panY.value = clamped.panY;
  }

  function measureImageSize(): void {
    const content = contentRef.value;
    const svg = content?.querySelector("svg");

    if (svg) {
      try {
        const box = svg.getBBox();
        if (box.width > 0 && box.height > 0) {
          imageWidth.value = box.width;
          imageHeight.value = box.height;
          return;
        }
      } catch {
        // getBBox may fail before the SVG is painted.
      }
    }

    if (svgMarkup.value) {
      const parsed = parseSvgSize(svgMarkup.value);
      imageWidth.value = parsed.width;
      imageHeight.value = parsed.height;
    }
  }

  async function syncFromMarkup(): Promise<void> {
    if (!svgMarkup.value) {
      return;
    }

    const parsed = parseSvgSize(svgMarkup.value);
    imageWidth.value = parsed.width;
    imageHeight.value = parsed.height;

    await nextTick();
    measureImageSize();
    fitToView();
  }

  function getViewportCenter(): ViewportPoint {
    const viewport = viewportRef.value;
    if (!viewport) {
      return { x: 0, y: 0 };
    }

    const { width, height } = readViewportSize(viewport);
    return { x: width / 2, y: height / 2 };
  }

  function zoomAt(cursorX: number, cursorY: number, zoomFactor: number): void {
    if (zoomFactor === 1) {
      return;
    }

    const oldScale = scale.value;
    const newScale = Math.max(PREVIEW_MIN_ZOOM, oldScale * zoomFactor);
    if (Math.abs(newScale - oldScale) < SCALE_EPSILON) {
      return;
    }

    const ratio = newScale / oldScale;
    panX.value = cursorX - (cursorX - panX.value) * ratio;
    panY.value = cursorY - (cursorY - panY.value) * ratio;
    scale.value = newScale;
    applyClamp();
  }

  function zoomIn(): void {
    const center = getViewportCenter();
    zoomAt(center.x, center.y, PREVIEW_ZOOM_STEP);
  }

  function zoomOut(): void {
    const center = getViewportCenter();
    zoomAt(center.x, center.y, 1 / PREVIEW_ZOOM_STEP);
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const zoomFactor = getWheelZoomFactor(event, viewport.clientHeight);
    zoomAt(cursorX, cursorY, zoomFactor);
  }

  function beginSinglePointerDrag(pointer: TrackedPointer, pointerId: number): void {
    isDragging.value = true;
    activePointerId = pointerId;
    dragStartX = pointer.clientX;
    dragStartY = pointer.clientY;
    panStartX = panX.value;
    panStartY = panY.value;
  }

  function beginPinch(): void {
    if (activePointers.size < 2) {
      return;
    }

    const [first, second] = [...activePointers.values()];
    isPinching.value = true;
    isDragging.value = false;
    activePointerId = null;
    lastPinchDistance = getPointersDistance(first, second);
  }

  function endPinch(): void {
    isPinching.value = false;
    lastPinchDistance = 0;
  }

  function handlePinchMove(): void {
    if (!isPinching.value || activePointers.size < 2 || lastPinchDistance <= 0) {
      return;
    }

    const [first, second] = [...activePointers.values()];
    const distance = getPointersDistance(first, second);
    const midpoint = getPointersMidpoint(first, second);
    const zoomFactor = distance / lastPinchDistance;

    if (Math.abs(zoomFactor - 1) > SCALE_EPSILON) {
      zoomAt(midpoint.x, midpoint.y, zoomFactor);
    }

    lastPinchDistance = distance;
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    viewport.setPointerCapture(event.pointerId);
    activePointers.set(event.pointerId, toTrackedPointer(event, viewport));

    if (activePointers.size === 1) {
      beginSinglePointerDrag(activePointers.get(event.pointerId)!, event.pointerId);
      return;
    }

    if (activePointers.size >= 2) {
      beginPinch();
    }
  }

  function onPointerMove(event: PointerEvent): void {
    const viewport = viewportRef.value;
    if (!viewport || !activePointers.has(event.pointerId)) {
      return;
    }

    activePointers.set(event.pointerId, toTrackedPointer(event, viewport));

    if (isPinching.value && activePointers.size >= 2) {
      handlePinchMove();
      return;
    }

    if (
      !isDragging.value
      || activePointerId !== event.pointerId
      || activePointers.size !== 1
    ) {
      return;
    }

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    const { width: cw, height: ch } = readViewportSize(viewport);
    const { width: sw, height: sh } = getScaledSize();
    const clamped = clampPan(
      panStartX + dx,
      panStartY + dy,
      sw,
      sh,
      cw,
      ch,
    );
    panX.value = clamped.panX;
    panY.value = clamped.panY;
  }

  function endPointer(event: PointerEvent): void {
    if (!activePointers.has(event.pointerId)) {
      return;
    }

    activePointers.delete(event.pointerId);

    const viewport = viewportRef.value;
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    if (activePointers.size < 2) {
      endPinch();
    }

    if (activePointerId === event.pointerId) {
      isDragging.value = false;
      activePointerId = null;
    }

    if (activePointers.size === 2) {
      beginPinch();
    }
  }

  const contentStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
    transformOrigin: "0 0",
  }));

  watch(svgMarkup, () => {
    syncFromMarkup();
  });

  onMounted(() => {
    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    wheelListener = (event: WheelEvent) => {
      onWheel(event);
    };
    viewport.addEventListener("wheel", wheelListener, { passive: false });

    touchMoveListener = (event: TouchEvent) => {
      if (event.touches.length >= 2 || activePointers.size >= 2) {
        event.preventDefault();
      }
    };
    viewport.addEventListener("touchmove", touchMoveListener, { passive: false });

    resizeObserver = new ResizeObserver(() => {
      applyClamp();
    });
    resizeObserver.observe(viewport);

    syncFromMarkup();
  });

  onUnmounted(() => {
    const viewport = viewportRef.value;
    if (viewport && wheelListener) {
      viewport.removeEventListener("wheel", wheelListener);
    }
    if (viewport && touchMoveListener) {
      viewport.removeEventListener("touchmove", touchMoveListener);
    }
    wheelListener = null;
    touchMoveListener = null;

    resizeObserver?.disconnect();
    resizeObserver = null;
    activePointers.clear();
  });

  return {
    contentStyle,
    isDragging,
    isPinching,
    zoomIn,
    zoomOut,
    onPointerDown,
    onPointerMove,
    onPointerUp: endPointer,
    onPointerCancel: endPointer,
  };
}
