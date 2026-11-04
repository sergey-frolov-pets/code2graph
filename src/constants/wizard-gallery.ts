import type { DiagramFormat } from "@/constants/diagram-format-ids";

export const GALLERY_EXAMPLE_ACTIONS = ["editor", "llm", "params"] as const;

export type GalleryExampleAction = (typeof GALLERY_EXAMPLE_ACTIONS)[number];

/** Font size of a tag that appears on the fewest examples. */
export const WIZARD_TAG_FONT_SIZE_MIN_PX = 13;

/** Font size of a tag that appears on the most examples. */
export const WIZARD_TAG_FONT_SIZE_MAX_PX = 28;

/** How long a press must last before the example card opens. */
export const WIZARD_GALLERY_LONG_PRESS_MS = 500;

/** Movement past this distance cancels a long press. */
export const WIZARD_GALLERY_LONG_PRESS_MOVE_PX = 10;

/** Delay before a search string is recorded in analytics. */
export const WIZARD_GALLERY_SEARCH_TRACK_MS = 400;

export function wizardThumbnailFileName(
  format: DiagramFormat,
  sampleId: string,
): string {
  return `${format}-${sampleId}.svg`;
}

export function wizardTagFontSizePx(
  count: number,
  minCount: number,
  maxCount: number,
): number {
  if (maxCount <= minCount) {
    return WIZARD_TAG_FONT_SIZE_MIN_PX;
  }

  const span = WIZARD_TAG_FONT_SIZE_MAX_PX - WIZARD_TAG_FONT_SIZE_MIN_PX;
  const ratio = (count - minCount) / (maxCount - minCount);
  return WIZARD_TAG_FONT_SIZE_MIN_PX + ratio * span;
}
