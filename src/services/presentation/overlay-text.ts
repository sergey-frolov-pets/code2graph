import {
  PRESENTATION_OVERLAY_TEXT_HEIGHT_RATIO,
  PRESENTATION_OVERLAY_TEXT_LINE_HEIGHT,
  PRESENTATION_OVERLAY_TEXT_MAX_PX,
  PRESENTATION_OVERLAY_TEXT_MIN_PX,
} from "@/services/presentation/constants";

export interface OverlayTextLine {
  text: string;
  /** Shift from the box center, in the same units as the font size. */
  centerOffset: number;
}

export function overlayTextFontSize(boxHeight: number): number {
  const scaled = Math.abs(boxHeight) * PRESENTATION_OVERLAY_TEXT_HEIGHT_RATIO;
  return Math.max(
    PRESENTATION_OVERLAY_TEXT_MIN_PX,
    Math.min(PRESENTATION_OVERLAY_TEXT_MAX_PX, scaled),
  );
}

/** Splits a note into lines and centers the block on the overlay. */
export function overlayTextLinePlacements(
  text: string,
  fontSize: number,
): OverlayTextLine[] {
  const lines = text.split(/\r?\n/);
  const lineHeight = fontSize * PRESENTATION_OVERLAY_TEXT_LINE_HEIGHT;
  const firstOffset = -((lines.length - 1) * lineHeight) / 2;
  return lines.map((line, index) => ({
    text: line,
    centerOffset: firstOffset + index * lineHeight,
  }));
}
