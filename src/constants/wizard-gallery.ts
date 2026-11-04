import type { DiagramFormat } from "@/constants/diagram-format-ids";

export const GALLERY_EXAMPLE_ACTIONS = ["editor", "llm", "params"] as const;

export type GalleryExampleAction = (typeof GALLERY_EXAMPLE_ACTIONS)[number];

/** Font size of a tag that appears on the fewest examples. */
export const WIZARD_TAG_FONT_SIZE_MIN_PX = 13;

/** Font size of a tag that appears on the most examples. */
export const WIZARD_TAG_FONT_SIZE_MAX_PX = 28;

/** Average glyph width relative to the tag font size. */
export const WIZARD_TAG_CHAR_WIDTH_EM = 0.7;

/** Horizontal padding inside a tag chip, matching the cloud and card styles. */
export const WIZARD_TAG_PAD_X_PX = 8;

/** Vertical padding inside a tag chip. */
export const WIZARD_TAG_PAD_Y_PX = 4;

/** Cloud tags have no border, so the layout box does not add one. */
export const WIZARD_TAG_BORDER_PX = 0;

/** Line height used to size a tag chip. */
export const WIZARD_TAG_LINE_HEIGHT = 1.2;

/** Space between neighboring tags in the cloud, horizontally and vertically. */
export const WIZARD_TAG_CLOUD_GAP_PX = 2;

/** Width used before the cloud element has been measured. */
export const WIZARD_TAG_CLOUD_FALLBACK_WIDTH_PX = 640;

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
