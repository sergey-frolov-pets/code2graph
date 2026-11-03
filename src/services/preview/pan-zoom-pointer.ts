import { PREVIEW_DOUBLE_TAP_MS } from "@/constants/preview-pan-zoom";
import {
  clampPan,
  getPointersDistance,
  getPointersMidpoint,
  getWheelZoomFactor,
  PAN_ZOOM_SCALE_EPSILON,
  readViewportSize,
  toTrackedPointer,
  type TrackedPointer,
} from "@/services/preview/pan-zoom-math";
import {
  fitToView,
  getScaledSize,
  zoomAt,
} from "@/services/preview/pan-zoom-transform";
import {
  notifyPanZoomChange,
  type PanZoomMutableState,
  type PreviewPanZoomDeps,
} from "@/services/preview/pan-zoom-types";

const SCALE_EPSILON = PAN_ZOOM_SCALE_EPSILON;

export class PanZoomPointerController {
  private readonly activePointers = new Map<number, TrackedPointer>();
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private activePointerId: number | null = null;
  private lastPinchDistance = 0;
  private lastTapAt = 0;
  private didDragThisPointer = false;

  constructor(
    private readonly state: PanZoomMutableState,
    private readonly deps: PreviewPanZoomDeps,
  ) {}

  private notify(): void {
    notifyPanZoomChange(this.state, this.deps);
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
    zoomAt(this.state, this.deps, cursorX, cursorY, zoomFactor);
  }

  private beginSinglePointerDrag(pointer: TrackedPointer, pointerId: number): void {
    this.state.isDragging = true;
    this.didDragThisPointer = false;
    this.activePointerId = pointerId;
    this.dragStartX = pointer.clientX;
    this.dragStartY = pointer.clientY;
    this.panStartX = this.state.panX;
    this.panStartY = this.state.panY;
    this.notify();
  }

  private beginPinch(): void {
    if (this.activePointers.size < 2) {
      return;
    }

    const [first, second] = [...this.activePointers.values()];
    this.state.isPinching = true;
    this.state.isDragging = false;
    this.activePointerId = null;
    this.lastPinchDistance = getPointersDistance(first, second);
    this.notify();
  }

  private endPinch(): void {
    this.state.isPinching = false;
    this.lastPinchDistance = 0;
    this.notify();
  }

  private handlePinchMove(): void {
    if (
      !this.state.isPinching
      || this.activePointers.size < 2
      || this.lastPinchDistance <= 0
    ) {
      return;
    }

    const [first, second] = [...this.activePointers.values()];
    const distance = getPointersDistance(first, second);
    const midpoint = getPointersMidpoint(first, second);
    const zoomFactor = distance / this.lastPinchDistance;

    if (Math.abs(zoomFactor - 1) > SCALE_EPSILON) {
      zoomAt(this.state, this.deps, midpoint.x, midpoint.y, zoomFactor);
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
      this.beginSinglePointerDrag(
        this.activePointers.get(event.pointerId)!,
        event.pointerId,
      );
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

    if (this.state.isPinching && this.activePointers.size >= 2) {
      this.handlePinchMove();
      return;
    }

    if (
      !this.state.isDragging
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
    const { width: sw, height: sh } = getScaledSize(this.state);
    const clamped = clampPan(
      this.panStartX + dx,
      this.panStartY + dy,
      sw,
      sh,
      cw,
      ch,
    );
    this.state.panX = clamped.panX;
    this.state.panY = clamped.panY;
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
      if (
        !this.didDragThisPointer
        && !this.state.isPinching
        && this.activePointers.size === 0
      ) {
        const now = Date.now();
        if (now - this.lastTapAt <= PREVIEW_DOUBLE_TAP_MS) {
          fitToView(this.state, this.deps);
          this.lastTapAt = 0;
        } else {
          this.lastTapAt = now;
        }
      }

      this.state.isDragging = false;
      this.activePointerId = null;
      this.notify();
    }

    if (this.activePointers.size === 2) {
      this.beginPinch();
    }
  }

  clearPointers(): void {
    this.activePointers.clear();
  }

  hasMultiplePointers(): boolean {
    return this.activePointers.size >= 2;
  }
}
