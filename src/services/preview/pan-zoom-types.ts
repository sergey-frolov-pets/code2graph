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

export interface PanZoomMutableState {
  panX: number;
  panY: number;
  scale: number;
  imageWidth: number;
  imageHeight: number;
  isDragging: boolean;
  isPinching: boolean;
}

export function createPanZoomSnapshot(state: PanZoomMutableState): PanZoomSnapshot {
  return {
    panX: state.panX,
    panY: state.panY,
    scale: state.scale,
    imageWidth: state.imageWidth,
    imageHeight: state.imageHeight,
    isDragging: state.isDragging,
    isPinching: state.isPinching,
  };
}

export function notifyPanZoomChange(
  state: PanZoomMutableState,
  deps: PreviewPanZoomDeps,
): void {
  deps.onChange(createPanZoomSnapshot(state));
}
