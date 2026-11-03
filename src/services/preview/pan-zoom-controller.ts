import {
  applyClamp,
  fitToView,
  measureImageSize,
  syncFromMarkup,
  zoomIn,
  zoomOut,
} from "@/services/preview/pan-zoom-transform";
import { PanZoomPointerController } from "@/services/preview/pan-zoom-pointer";
import {
  createPanZoomSnapshot,
  type PanZoomMutableState,
  type PanZoomSnapshot,
  type PreviewPanZoomDeps,
} from "@/services/preview/pan-zoom-types";

export class PreviewPanZoomController {
  private readonly state: PanZoomMutableState = {
    panX: 0,
    panY: 0,
    scale: 1,
    imageWidth: 800,
    imageHeight: 600,
    isDragging: false,
    isPinching: false,
  };

  private readonly pointer: PanZoomPointerController;
  private resizeObserver: ResizeObserver | null = null;
  private wheelListener: ((event: WheelEvent) => void) | null = null;
  private touchMoveListener: ((event: TouchEvent) => void) | null = null;

  constructor(private readonly deps: PreviewPanZoomDeps) {
    this.pointer = new PanZoomPointerController(this.state, deps);
  }

  getSnapshot(): PanZoomSnapshot {
    return createPanZoomSnapshot(this.state);
  }

  getZoomPercent(): number {
    return Math.round(this.state.scale * 100);
  }

  getContentTransform(): string {
    return `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.scale})`;
  }

  applyClamp(): void {
    applyClamp(this.state, this.deps);
  }

  fitToView(): void {
    fitToView(this.state, this.deps);
  }

  measureImageSize(): void {
    measureImageSize(this.state, this.deps);
  }

  syncFromMarkup(): void {
    syncFromMarkup(this.state, this.deps);
  }

  zoomIn(): void {
    zoomIn(this.state, this.deps);
  }

  zoomOut(): void {
    zoomOut(this.state, this.deps);
  }

  onWheel(event: WheelEvent): void {
    this.pointer.onWheel(event);
  }

  onPointerDown(event: PointerEvent): void {
    this.pointer.onPointerDown(event);
  }

  onPointerMove(event: PointerEvent): void {
    this.pointer.onPointerMove(event);
  }

  onPointerUp(event: PointerEvent): void {
    this.pointer.onPointerUp(event);
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
      if (event.touches.length >= 2 || this.pointer.hasMultiplePointers()) {
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
    this.pointer.clearPointers();
  }
}

export type { PanZoomSnapshot, PreviewPanZoomDeps } from "@/services/preview/pan-zoom-types";
