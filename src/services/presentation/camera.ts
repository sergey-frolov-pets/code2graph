import { PREVIEW_MIN_ZOOM } from "@/constants/preview-pan-zoom";
import { PRESENTATION_MAX_SCALE } from "@/services/presentation/constants";
import type { CameraFrame } from "@/services/presentation/types";

export interface CameraPlacement {
  panX: number;
  panY: number;
  scale: number;
}

export interface CameraPlacementInput {
  panX: number;
  panY: number;
  scale: number;
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}

function clampScale(scale: number): number {
  return Math.min(PRESENTATION_MAX_SCALE, Math.max(PREVIEW_MIN_ZOOM, scale));
}

/** Places `frame.anchor` at the viewport center. */
export function frameToPan(
  frame: CameraFrame,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): CameraPlacement {
  const scale = clampScale(frame.scale);
  return {
    scale,
    panX: viewportWidth / 2 - frame.anchorX * imageWidth * scale,
    panY: viewportHeight / 2 - frame.anchorY * imageHeight * scale,
  };
}

/** Reads the image point currently sitting at the viewport center. */
export function panToFrame(input: CameraPlacementInput): CameraFrame {
  const scale = input.scale === 0 ? 1 : input.scale;
  const imageX = (input.viewportWidth / 2 - input.panX) / scale;
  const imageY = (input.viewportHeight / 2 - input.panY) / scale;
  return {
    anchorX: input.imageWidth > 0 ? imageX / input.imageWidth : 0,
    anchorY: input.imageHeight > 0 ? imageY / input.imageHeight : 0,
    scale: input.scale,
  };
}
