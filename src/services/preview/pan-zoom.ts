import {
  PREVIEW_DOUBLE_TAP_MS,
  PREVIEW_FIT_MARGIN_RATIO,
  PREVIEW_MIN_ZOOM,
  PREVIEW_ZOOM_STEP,
} from "@/constants/preview-pan-zoom";
import {
  clampPan,
  getPointersDistance,
  getPointersMidpoint,
  getWheelZoomFactor,
  PAN_ZOOM_SCALE_EPSILON,
  readViewportSize,
  toTrackedPointer,
  type Size,
  type TrackedPointer,
  type ViewportPoint,
} from "@/services/preview/pan-zoom-math";
import { parseSvgSize } from "@/utils/export";

const SCALE_EPSILON = PAN_ZOOM_SCALE_EPSILON;

export interface PanZoomSnapshot {
  panX: number;
  panY: number;
  scale: number;
  imageWidth: number;
  imageHeight: number;
  isDragging: boolean;
  isPinching: boolean;
}

export interface PreviewPanZoomDeps {
  getViewport: () => HTMLElement | null;
  getContent: () => HTMLElement | null;
  getSvgMarkup: () => string;
  onChange: (snapshot: PanZoomSnapshot) => void;
}

export class PreviewPanZoomController {
  private panX = 0;
  private panY = 0;
  private scale = 1;
  private imageWidth = 800;
  private imageHeight = 600;
  private isDragging = false;
  private isPinching = false;

  private readonly activePointers = new Map<number, TrackedPointer>();
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private activePointerId: number | null = null;
  private lastPinchDistance = 0;
  private lastTapAt = 0;
  private didDragThisPointer = false;
  private resizeObserver: ResizeObserver | null = null;
  private wheelListener: ((event: WheelEvent) => void) | null = null;
  private touchMoveListener: ((event: TouchEvent) => void) | null = null;

  constructor(private readonly deps: PreviewPanZoomDeps) {}

  getSnapshot(): PanZoomSnapshot {
    return {
      panX: this.panX,
      panY: this.panY,
      scale: this.scale,
      imageWidth: this.imageWidth,
      imageHeight: this.imageHeight,
      isDragging: this.isDragging,
      isPinching: this.isPinching,
    };
  }

  getZoomPercent(): number {
    return Math.round(this.scale * 100);
  }

  getContentTransform(): string {
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }

  private notify(): void {
    this.deps.onChange(this.getSnapshot());
  }

  private getScaledSize(): Size {
    return {
      width: this.imageWidth * this.scale,
      height: this.imageHeight * this.scale,
    };
  }

  applyClamp(): void {
    const viewport = this.deps.getViewport();
    if (!viewport) {
      return;
    }

    const { width: cw, height: ch } = readViewportSize(viewport);
    const { width: sw, height: sh } = this.getScaledSize();
    const clamped = clampPan(this.panX, this.panY, sw, sh, cw, ch);
    this.panX = clamped.panX;
    this.panY = clamped.panY;
    this.notify();
  }

  fitToView(): void {
    const viewport = this.deps.getViewport();
    if (!viewport) {
      return;
    }

    const { width: cw, height: ch } = readViewportSize(viewport);
    if (cw <= 0 || ch <= 0 || this.imageWidth <= 0 || this.imageHeight <= 0) {
      return;
    }

    const fitScale = Math.min(
      (cw * PREVIEW_FIT_MARGIN_RATIO) / this.imageWidth,
      (ch * PREVIEW_FIT_MARGIN_RATIO) / this.imageHeight,
    );
    this.scale = Math.max(PREVIEW_MIN_ZOOM, fitScale);

    const { width: sw, height: sh } = this.getScaledSize();
    const clamped = clampPan((cw - sw) / 2, (ch - sh) / 2, sw, sh, cw, ch);
    this.panX = clamped.panX;
    this.panY = clamped.panY;
    this.notify();
  }

  measureImageSize(): void {
    const svgMarkup = this.deps.getSvgMarkup();
    if (!svgMarkup) {
      return;
    }

    const parsed = parseSvgSize(svgMarkup);
    this.imageWidth = parsed.width;
    this.imageHeight = parsed.height;

    const content = this.deps.getContent();
    const svg = content?.querySelector("svg");
    if (!svg) {
      this.notify();
      return;
    }

    try {
      const box = svg.getBBox();
      if (box.width <= 0 || box.height <= 0) {
        this.notify();
        return;
      }

      const overflowRatio = Math.max(
        box.width / parsed.width,
        box.height / parsed.height,
      );
      if (overflowRatio <= 1.5) {
        this.imageWidth = box.width;
        this.imageHeight = box.height;
      }
    } catch {
      // getBBox may fail before the SVG is painted.
    }

    this.notify();
  }

  syncFromMarkup(): void {
    const svgMarkup = this.deps.getSvgMarkup();
    if (!svgMarkup) {
      return;
    }

    const parsed = parseSvgSize(svgMarkup);
    this.imageWidth = parsed.width;
    this.imageHeight = parsed.height;
    this.notify();

    queueMicrotask(() => {
      this.measureImageSize();
      this.fitToView();
    });
  }

  private getViewportCenter(): ViewportPoint {
    const viewport = this.deps.getViewport();
    if (!viewport) {
      return { x: 0, y: 0 };
    }

    const { width, height } = readViewportSize(viewport);
    return { x: width / 2, y: height / 2 };
  }

  private zoomAt(cursorX: number, cursorY: number, zoomFactor: number): void {
    if (zoomFactor === 1) {
      return;
    }

    const oldScale = this.scale;
    const newScale = Math.max(PREVIEW_MIN_ZOOM, oldScale * zoomFactor);
    if (Math.abs(newScale - oldScale) < SCALE_EPSILON) {
      return;
    }

    const ratio = newScale / oldScale;
    this.panX = cursorX - (cursorX - this.panX) * ratio;
    this.panY = cursorY - (cursorY - this.panY) * ratio;
    this.scale = newScale;
    this.applyClamp();
  }

  zoomIn(): void {
    const center = this.getViewportCenter();
    this.zoomAt(center.x, center.y, PREVIEW_ZOOM_STEP);
  }

  zoomOut(): void {
    const center = this.getViewportCenter();
    this.zoomAt(center.x, center.y, 1 / PREVIEW_ZOOM_STEP);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const viewport = this.deps.getViewport();
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const zoomFactor = getWheelZoomFactor(event, viewport.clientHeight);
    this.zoomAt(cursorX, cursorY, zoomFactor);
  }

  private beginSinglePointerDrag(pointer: TrackedPointer, pointerId: number): void {
    this.isDragging = true;
    this.didDragThisPointer = false;
    this.activePointerId = pointerId;
    this.dragStartX = pointer.clientX;
    this.dragStartY = pointer.clientY;
    this.panStartX = this.panX;
    this.panStartY = this.panY;
    this.notify();
  }

  private beginPinch(): void {
    if (this.activePointers.size < 2) {
      return;
    }

    const [first, second] = [...this.activePointers.values()];
    this.isPinching = true;
    this.isDragging = false;
    this.activePointerId = null;
    this.lastPinchDistance = getPointersDistance(first, second);
    this.notify();
  }

  private endPinch(): void {
    this.isPinching = false;
    this.lastPinchDistance = 0;
    this.notify();
  }

  private handlePinchMove(): void {
    if (!this.isPinching || this.activePointers.size < 2 || this.lastPinchDistance <= 0) {
      return;
    }

    const [first, second] = [...this.activePointers.values()];
    const distance = getPointersDistance(first, second);
    const midpoint = getPointersMidpoint(first, second);
    const zoomFactor = distance / this.lastPinchDistance;

    if (Math.abs(zoomFactor - 1) > SCALE_EPSILON) {
      this.zoomAt(midpoint.x, midpoint.y, zoomFactor);
    }

    this.lastPinchDistance = distance;
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const viewport = this.deps.getViewport();
    if (!viewport) {
      return;
    }

    viewport.setPointerCapture(event.pointerId);
    this.activePointers.set(event.pointerId, toTrackedPointer(event, viewport));

    if (this.activePointers.size === 1) {
      this.beginSinglePointerDrag(this.activePointers.get(event.pointerId)!, event.pointerId);
      return;
    }

    if (this.activePointers.size >= 2) {
      this.beginPinch();
    }
  }

  onPointerMove(event: PointerEvent): void {
    const viewport = this.deps.getViewport();
    if (!viewport || !this.activePointers.has(event.pointerId)) {
      return;
    }

    this.activePointers.set(event.pointerId, toTrackedPointer(event, viewport));

    if (this.isPinching && this.activePointers.size >= 2) {
      this.handlePinchMove();
      return;
    }

    if (
      !this.isDragging
      || this.activePointerId !== event.pointerId
      || this.activePointers.size !== 1
    ) {
      return;
    }

    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    if (Math.hypot(dx, dy) > 5) {
      this.didDragThisPointer = true;
    }

    const { width: cw, height: ch } = readViewportSize(viewport);
    const { width: sw, height: sh } = this.getScaledSize();
    const clamped = clampPan(
      this.panStartX + dx,
      this.panStartY + dy,
      sw,
      sh,
      cw,
      ch,
    );
    this.panX = clamped.panX;
    this.panY = clamped.panY;
    this.notify();
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) {
      return;
    }

    this.activePointers.delete(event.pointerId);

    const viewport = this.deps.getViewport();
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    if (this.activePointers.size < 2) {
      this.endPinch();
    }

    if (this.activePointerId === event.pointerId) {
      if (!this.didDragThisPointer && !this.isPinching && this.activePointers.size === 0) {
        const now = Date.now();
        if (now - this.lastTapAt <= PREVIEW_DOUBLE_TAP_MS) {
          this.fitToView();
          this.lastTapAt = 0;
        } else {
          this.lastTapAt = now;
        }
      }

      this.isDragging = false;
      this.activePointerId = null;
      this.notify();
    }

    if (this.activePointers.size === 2) {
      this.beginPinch();
    }
  }

  mount(): void {
    const viewport = this.deps.getViewport();
    if (!viewport) {
      return;
    }

    this.wheelListener = (event: WheelEvent) => {
      this.onWheel(event);
    };
    viewport.addEventListener("wheel", this.wheelListener, { passive: false });

    this.touchMoveListener = (event: TouchEvent) => {
      if (event.touches.length >= 2 || this.activePointers.size >= 2) {
        event.preventDefault();
      }
    };
    viewport.addEventListener("touchmove", this.touchMoveListener, { passive: false });

    this.resizeObserver = new ResizeObserver(() => {
      this.applyClamp();
    });
    this.resizeObserver.observe(viewport);

    this.syncFromMarkup();
  }

  unmount(): void {
    const viewport = this.deps.getViewport();
    if (viewport && this.wheelListener) {
      viewport.removeEventListener("wheel", this.wheelListener);
    }
    if (viewport && this.touchMoveListener) {
      viewport.removeEventListener("touchmove", this.touchMoveListener);
    }
    this.wheelListener = null;
    this.touchMoveListener = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.activePointers.clear();
  }
}
