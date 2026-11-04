import {
  WIZARD_TAG_BORDER_PX,
  WIZARD_TAG_CHAR_WIDTH_EM,
  WIZARD_TAG_CLOUD_GAP_PX,
  WIZARD_TAG_LINE_HEIGHT,
  WIZARD_TAG_PAD_X_PX,
  WIZARD_TAG_PAD_Y_PX,
} from "@/constants/wizard-gallery";

export interface CloudTagMeasure {
  key: string;
  fontSizePx: number;
  textLength: number;
}

export interface CloudTagPlacement {
  key: string;
  leftPx: number;
  topPx: number;
  widthPx: number;
  heightPx: number;
}

export interface CloudTagLayout {
  widthPx: number;
  heightPx: number;
  placements: CloudTagPlacement[];
}

interface SizedTag extends CloudTagMeasure {
  widthPx: number;
  heightPx: number;
}

export function wizardTagChipSize(
  fontSizePx: number,
  textLength: number,
): { widthPx: number; heightPx: number } {
  return {
    widthPx: Math.ceil(
      textLength * fontSizePx * WIZARD_TAG_CHAR_WIDTH_EM +
        WIZARD_TAG_PAD_X_PX * 2 +
        WIZARD_TAG_BORDER_PX * 2,
    ),
    heightPx: Math.ceil(
      fontSizePx * WIZARD_TAG_LINE_HEIGHT +
        WIZARD_TAG_PAD_Y_PX * 2 +
        WIZARD_TAG_BORDER_PX * 2,
    ),
  };
}

function centerWeighted(items: readonly SizedTag[]): SizedTag[] {
  const left: SizedTag[] = [];
  const right: SizedTag[] = [];
  items.forEach((item, index) => {
    if (index === 0) {
      return;
    }
    if (index % 2 === 1) {
      left.push(item);
      return;
    }
    right.push(item);
  });

  const largest = items[0];
  if (!largest) {
    return [];
  }

  return [...left.reverse(), largest, ...right];
}

function rowBandHeight(row: readonly SizedTag[]): number {
  return Math.max(...row.map((tag) => tag.heightPx));
}

function stackHeight(rows: readonly SizedTag[][]): number {
  if (rows.length === 0) {
    return 0;
  }

  return rows.reduce(
    (sum, row) => sum + rowBandHeight(row),
    WIZARD_TAG_CLOUD_GAP_PX * (rows.length - 1),
  );
}

function rowsAroundCenter(rows: readonly SizedTag[][]): SizedTag[][] {
  const center = rows[0];
  if (!center) {
    return [];
  }

  const above: SizedTag[][] = [];
  const below: SizedTag[][] = [];
  for (const row of rows.slice(1)) {
    if (stackHeight(above) <= stackHeight(below)) {
      above.push(row);
      continue;
    }
    below.push(row);
  }

  return [...above.reverse(), center, ...below];
}

function packRows(tags: readonly SizedTag[], widthPx: number): SizedTag[][] {
  const rows: SizedTag[][] = [];
  let row: SizedTag[] = [];
  let usedWidth = 0;

  for (const tag of tags) {
    const nextWidth = row.length === 0
      ? tag.widthPx
      : usedWidth + WIZARD_TAG_CLOUD_GAP_PX + tag.widthPx;
    if (row.length > 0 && nextWidth > widthPx) {
      rows.push(row);
      row = [];
      usedWidth = 0;
    }

    row.push(tag);
    usedWidth = row.length === 1
      ? tag.widthPx
      : usedWidth + WIZARD_TAG_CLOUD_GAP_PX + tag.widthPx;
  }

  if (row.length > 0) {
    rows.push(row);
  }

  return rows;
}

function placeRow(
  row: readonly SizedTag[],
  widthPx: number,
  topPx: number,
): CloudTagPlacement[] {
  const ordered = centerWeighted(row);
  const largest = ordered.find((tag) => tag.key === row[0]?.key) ?? ordered[0];
  if (!largest) {
    return [];
  }

  const gapCount = Math.max(ordered.length + 1, 1);
  const contentWidth = ordered.reduce((sum, tag) => sum + tag.widthPx, 0);
  const gap = Math.max(
    WIZARD_TAG_CLOUD_GAP_PX,
    (widthPx - contentWidth) / gapCount,
  );
  const largestIndex = ordered.indexOf(largest);
  const leftWidth = ordered
    .slice(0, largestIndex)
    .reduce((sum, tag) => sum + tag.widthPx + gap, 0);
  let largestLeft = (widthPx - largest.widthPx) / 2;
  const minLargestLeft = leftWidth;
  const rightWidth = ordered
    .slice(largestIndex + 1)
    .reduce((sum, tag) => sum + gap + tag.widthPx, 0);
  const maxLargestLeft = widthPx - rightWidth - largest.widthPx;
  if (minLargestLeft <= maxLargestLeft) {
    largestLeft = Math.min(Math.max(largestLeft, minLargestLeft), maxLargestLeft);
  } else {
    largestLeft = Math.max(0, (widthPx - (contentWidth + gap * (ordered.length - 1))) / 2);
  }

  const bandHeight = rowBandHeight(row);
  const placements: CloudTagPlacement[] = [];
  let left = largestLeft - leftWidth;
  if (largestIndex === 0) {
    left = largestLeft;
  }

  for (const tag of ordered) {
    placements.push({
      key: tag.key,
      leftPx: left,
      topPx: topPx + (bandHeight - tag.heightPx) / 2,
      widthPx: tag.widthPx,
      heightPx: tag.heightPx,
    });
    left += tag.widthPx + gap;
  }

  return placements;
}

export function layoutWizardTagCloud(
  tags: readonly CloudTagMeasure[],
  widthPx: number,
): CloudTagLayout {
  const safeWidth = Math.max(1, widthPx);
  const sized = [...tags]
    .map((tag) => ({ ...tag, ...wizardTagChipSize(tag.fontSizePx, tag.textLength) }))
    .sort((left, right) => right.fontSizePx - left.fontSizePx || left.key.localeCompare(right.key));
  const packed = rowsAroundCenter(packRows(sized, safeWidth));
  const placements: CloudTagPlacement[] = [];
  let top = WIZARD_TAG_CLOUD_GAP_PX;

  for (const row of packed) {
    placements.push(...placeRow(row, safeWidth, top));
    top += rowBandHeight(row) + WIZARD_TAG_CLOUD_GAP_PX;
  }

  return {
    widthPx: safeWidth,
    heightPx: packed.length === 0 ? 0 : top,
    placements,
  };
}
