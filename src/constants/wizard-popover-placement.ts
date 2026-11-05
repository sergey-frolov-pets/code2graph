import {
  WIZARD_GALLERY_POPOVER_MARGIN_PX,
  WIZARD_GALLERY_POPOVER_OVERLAP_PX,
} from "@/constants/wizard-gallery";

export interface PopoverRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface PopoverAnchor extends PopoverRect {
  width: number;
}

export interface PopoverPlacement {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

/** Keep the example card inside the wizard window, scrolling inside the card when it is taller. */
export function placeWizardPopover(input: {
  anchor: PopoverAnchor;
  bounds: PopoverRect;
  panelHeight: number;
}): PopoverPlacement {
  const margin = WIZARD_GALLERY_POPOVER_MARGIN_PX;
  const overlap = WIZARD_GALLERY_POPOVER_OVERLAP_PX;
  const innerTop = input.bounds.top + margin;
  const innerBottom = input.bounds.bottom - margin;
  const innerLeft = input.bounds.left + margin;
  const innerRight = input.bounds.right - margin;
  const innerHeight = Math.max(0, innerBottom - innerTop);
  const innerWidth = Math.max(0, innerRight - innerLeft);
  const width = Math.min(Math.max(0, input.anchor.width), innerWidth);
  const left = clamp(input.anchor.left, innerLeft, innerRight - width);
  const panelHeight = Math.max(0, input.panelHeight);
  const belowTop = input.anchor.bottom - overlap;
  const spaceBelow = innerBottom - belowTop;
  const aboveEdge = input.anchor.top + overlap;
  const spaceAbove = aboveEdge - innerTop;
  const fitsBelow = panelHeight > 0 && panelHeight <= spaceBelow;
  const fitsAbove = panelHeight > 0 && panelHeight <= spaceAbove;
  const preferBelow = fitsBelow || (!fitsAbove && spaceBelow >= spaceAbove);

  if (preferBelow) {
    const top = clamp(belowTop, innerTop, innerBottom);
    return {
      top,
      left,
      width,
      maxHeight: Math.max(0, innerBottom - top),
    };
  }

  const maxHeight = Math.min(panelHeight || innerHeight, Math.max(0, spaceAbove), innerHeight);
  const top = clamp(aboveEdge - maxHeight, innerTop, innerBottom);
  return {
    top,
    left,
    width,
    maxHeight: Math.max(0, Math.min(maxHeight, innerBottom - top)),
  };
}
