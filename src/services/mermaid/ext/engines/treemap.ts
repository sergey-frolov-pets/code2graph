import {
  extractTrailingColorAttr,
  parseExtColorsDirective,
  parseExtNumber,
  parseMonoDirective,
  readableTextOnFill,
  resolveSeriesColor,
  shadeColor,
  unquoteExtText,
} from "../color-utils";
import {
  clamp,
  createSvg,
  drawLabelLines,
  fmt,
  hasLabelBreak,
  labelBlockExtra,
  measureLabelWidth,
  resolvePalette,
  splitLabelLines,
  truncate,
  truncateLabel,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export type TreemapLabelsMode = "values" | "percent" | "both" | "none";

export interface TreemapLeaf {
  label: string;
  value: number;
  group?: string;
  color?: string;
}

export interface TreemapGroup {
  name: string;
  color?: string;
  items: TreemapLeaf[];
  total: number;
}

export interface TreemapModel {
  title?: string;
  labels: TreemapLabelsMode;
  fontSize?: number;
  mono: boolean;
  seriesColors: Record<string, string>;
  groups: TreemapGroup[];
  total: number;
}

const FONT_BASE = 11;
const FONT_MIN = 6;
const FONT_MAX = 28;
const CANVAS_WIDTH = 620;
const PLOT_HEIGHT = 340;
const PADDING = { top: 46, right: 20, bottom: 24, left: 20 };
const GROUP_GAP = 4;
const LEAF_GAP = 2;
const GROUP_HEADER_HEIGHT = 20;
const MIN_LABEL_RECT_WIDTH = 38;
const MIN_LABEL_RECT_HEIGHT = 22;
const MIN_SUBLABEL_RECT_HEIGHT = 38;

interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WeightedNode<T> {
  item: T;
  weight: number;
}

function worstAspectRatio(row: readonly WeightedNode<unknown>[], sideLength: number, scale: number): number {
  if (row.length === 0 || sideLength <= 0) return Infinity;
  let sumWeight = 0;
  let minArea = Infinity;
  let maxArea = 0;
  for (const node of row) {
    const area = node.weight * scale;
    sumWeight += area;
    if (area < minArea) minArea = area;
    if (area > maxArea) maxArea = area;
  }
  if (sumWeight <= 0 || minArea <= 0) return Infinity;
  const s2 = sumWeight * sumWeight;
  const w2 = sideLength * sideLength;
  return Math.max((w2 * maxArea) / s2, s2 / (w2 * minArea));
}

/**
 * Детерминированная раскладка Squarified Treemap (Bruls–Huizing–van Wijk).
 */
export function squarifyLayout<T>(
  nodes: readonly WeightedNode<T>[],
  bounds: LayoutRect,
): Array<{ item: T; rect: LayoutRect }> {
  const positive = nodes
    .filter((n) => n.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  const totalWeight = positive.reduce((acc, n) => acc + n.weight, 0);
  if (positive.length === 0 || totalWeight <= 0 || bounds.w <= 0 || bounds.h <= 0) {
    return [];
  }

  const totalArea = bounds.w * bounds.h;
  const scale = totalArea / totalWeight;
  const out: Array<{ item: T; rect: LayoutRect }> = [];

  let remaining: LayoutRect = { ...bounds };
  let row: WeightedNode<T>[] = [];

  const layoutRow = (currentRow: readonly WeightedNode<T>[]) => {
    const rowArea = currentRow.reduce((acc, n) => acc + n.weight * scale, 0);
    const horizontalSplit = remaining.w >= remaining.h;
    if (horizontalSplit) {
      const stripWidth = remaining.h > 0 ? rowArea / remaining.h : 0;
      let cursorY = remaining.y;
      for (let i = 0; i < currentRow.length; i += 1) {
        const node = currentRow[i];
        const h =
          i === currentRow.length - 1
            ? Math.max(0, remaining.y + remaining.h - cursorY)
            : stripWidth > 0
              ? (node.weight * scale) / stripWidth
              : 0;
        out.push({
          item: node.item,
          rect: { x: remaining.x, y: cursorY, w: stripWidth, h },
        });
        cursorY += h;
      }
      remaining = {
        x: remaining.x + stripWidth,
        y: remaining.y,
        w: Math.max(0, remaining.w - stripWidth),
        h: remaining.h,
      };
    } else {
      const stripHeight = remaining.w > 0 ? rowArea / remaining.w : 0;
      let cursorX = remaining.x;
      for (let i = 0; i < currentRow.length; i += 1) {
        const node = currentRow[i];
        const w =
          i === currentRow.length - 1
            ? Math.max(0, remaining.x + remaining.w - cursorX)
            : stripHeight > 0
              ? (node.weight * scale) / stripHeight
              : 0;
        out.push({
          item: node.item,
          rect: { x: cursorX, y: remaining.y, w, h: stripHeight },
        });
        cursorX += w;
      }
      remaining = {
        x: remaining.x,
        y: remaining.y + stripHeight,
        w: remaining.w,
        h: Math.max(0, remaining.h - stripHeight),
      };
    }
  };

  for (const node of positive) {
    if (row.length === 0) {
      row.push(node);
      continue;
    }
    const shortSide = Math.min(remaining.w, remaining.h);
    const currentWorst = worstAspectRatio(row, shortSide, scale);
    const nextWorst = worstAspectRatio([...row, node], shortSide, scale);
    if (nextWorst <= currentWorst) {
      row.push(node);
    } else {
      layoutRow(row);
      row = [node];
    }
  }
  if (row.length > 0) {
    layoutRow(row);
  }

  return out;
}

function insetRect(rect: LayoutRect, gap: number): LayoutRect {
  const gx = Math.min(gap, rect.w / 4);
  const gy = Math.min(gap, rect.h / 4);
  return {
    x: rect.x + gx / 2,
    y: rect.y + gy / 2,
    w: Math.max(1, rect.w - gx),
    h: Math.max(1, rect.h - gy),
  };
}

export function parseTreemap(source: string): ExtParseResult<TreemapModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let labels: TreemapLabelsMode = "both";
  let fontSize: number | undefined;
  let mono = false;
  const seriesColors: Record<string, string> = {};

  const groupsMap = new Map<string, TreemapGroup>();
  const groupsOrder: TreemapGroup[] = [];
  let currentGroupName: string | undefined;
  let seenType = false;
  let inData = false;

  const ensureGroup = (name: string, color?: string): TreemapGroup => {
    const existing = groupsMap.get(name);
    if (existing) {
      if (color) existing.color = color;
      return existing;
    }
    const created: TreemapGroup = { name, color, items: [], total: 0 };
    groupsMap.set(name, created);
    groupsOrder.push(created);
    return created;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;

    if (!seenType) {
      seenType = true;
      continue;
    }

    if (inData && /^end$/i.test(raw)) {
      inData = false;
      continue;
    }

    if (/^title\b/i.test(raw) && !raw.includes(":")) {
      title = unquoteExtText(raw.replace(/^title\s*/i, "")) || undefined;
      continue;
    }

    if (/^labels\b/i.test(raw) && !raw.includes(":")) {
      const mode = raw.replace(/^labels\s*/i, "").trim().toLowerCase();
      if (mode === "values" || mode === "value") labels = "values";
      else if (mode === "percent" || mode === "percents" || mode === "%") labels = "percent";
      else if (mode === "both" || mode === "all") labels = "both";
      else if (mode === "none" || mode === "off") labels = "none";
      else {
        errors.push({
          message: `ожидается «labels values|percent|both|none», получено «${mode}»`,
          line: lineNo,
          col: 0,
        });
      }
      continue;
    }

    if (/^fontsize\b/i.test(raw) && !raw.includes(":")) {
      const arg = raw.replace(/^fontsize\s*/i, "").trim();
      const parsed = parseExtNumber(arg);
      if (parsed === null || !(parsed > 0)) {
        errors.push({
          message: `ожидается «fontsize <положительное число>», получено «${arg}»`,
          line: lineNo,
          col: 0,
        });
      } else {
        fontSize = parsed;
      }
      continue;
    }

    if (/^mono\b/i.test(raw) && !raw.includes(":")) {
      const parsed = parseMonoDirective(raw, lineNo);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.mono !== undefined) mono = parsed.mono;
      continue;
    }

    if (/^colors\b/i.test(raw) && !raw.includes(":")) {
      const parsed = parseExtColorsDirective(raw.replace(/^colors\s*/i, ""), lineNo);
      if (parsed.error) errors.push(parsed.error);
      else Object.assign(seriesColors, parsed.seriesColors);
      continue;
    }

    if (/^data$/i.test(raw)) {
      inData = true;
      continue;
    }

    if (/^(?:group|section)\b/i.test(raw) && !raw.includes(":")) {
      const body = raw.replace(/^(?:group|section)\s*/i, "");
      const colorExt = extractTrailingColorAttr(body, lineNo);
      if (colorExt.error) {
        errors.push(colorExt.error);
        continue;
      }
      const groupName = unquoteExtText(colorExt.rest);
      if (!groupName) {
        errors.push({
          message: `ожидается имя группы после «group»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      currentGroupName = groupName;
      ensureGroup(groupName, colorExt.color);
      continue;
    }

    const colonIdx = raw.indexOf(":");
    if (colonIdx >= 0) {
      const leftRaw = raw.slice(0, colonIdx).trim();
      const rightRaw = raw.slice(colonIdx + 1).trim();
      const colorExt = extractTrailingColorAttr(rightRaw, lineNo);
      if (colorExt.error) {
        errors.push(colorExt.error);
        continue;
      }

      const val = parseExtNumber(colorExt.rest);
      if (val === null || !(val > 0)) {
        errors.push({
          message: `вес элемента должен быть положительным числом, получено «${colorExt.rest}»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }

      let groupName = currentGroupName ?? "";
      let leafLabel = leftRaw;
      if (leftRaw.includes("/")) {
        const slashParts = leftRaw.split("/").map((s) => unquoteExtText(s));
        groupName = slashParts[0] || "";
        leafLabel = slashParts.slice(1).join(" / ") || groupName;
      } else {
        leafLabel = unquoteExtText(leftRaw);
      }

      if (!leafLabel) {
        errors.push({
          message: `пустое название элемента перед «:»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }

      const grp = ensureGroup(groupName);
      grp.items.push({
        label: leafLabel,
        value: val,
        group: groupName || undefined,
        color: colorExt.color,
      });
      grp.total += val;
      continue;
    }

    errors.push({
      message: `неизвестная строка «${raw}» (ожидается title, labels, fontsize, mono, colors, group или «Группа / Элемент : вес»)`,
      line: lineNo,
      col: 0,
    });
  }

  const nonEmptyGroups = groupsOrder.filter((g) => g.items.length > 0 && g.total > 0);
  const total = nonEmptyGroups.reduce((acc, g) => acc + g.total, 0);

  if (nonEmptyGroups.length === 0 && errors.length === 0) {
    errors.push({
      message: `нет данных: ожидается хотя бы одна строка «Элемент : <положительное число>»`,
      line: 1,
      col: 0,
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      title,
      labels,
      fontSize,
      mono,
      seriesColors,
      groups: nonEmptyGroups,
      total,
    },
  };
}

function formatSubLabel(value: number, total: number, mode: TreemapLabelsMode): string | null {
  if (mode === "none") return null;
  const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
  if (mode === "values") return fmt(value);
  if (mode === "percent") return `${fmt(pct)}%`;
  return `${fmt(value)} (${fmt(pct)}%)`;
}

export function renderTreemap(model: TreemapModel, options: ExtRenderOptions): string {
  const palette = resolvePalette(options.dark, options.background, options.textColor);
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const scaleFactor = fontSize / FONT_BASE;
  const titleSize = clamp(Math.round(fontSize * 1.36), 14, 26);

  const hasNamedGroups = model.groups.some((g) => g.name.length > 0);
  const legendExtra = hasNamedGroups
    ? Math.max(0, ...model.groups.map((group) => labelBlockExtra(group.name, fontSize)))
    : 0;
  const legendRowHeight = hasNamedGroups ? Math.round(fontSize * 1.8) + legendExtra : 0;
  const titleExtra = labelBlockExtra(model.title, titleSize);

  const padTop = (model.title ? PADDING.top : 20) + titleExtra;
  const width = CANVAS_WIDTH;
  const height = padTop + PLOT_HEIGHT + PADDING.bottom + legendRowHeight;

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
  });

  if (model.title) {
    drawLabelLines(svg, width / 2, 26, model.title, titleSize, {
      "font-size": titleSize,
      "font-weight": 600,
      fill: palette.fg,
    });
  }

  const outerBounds: LayoutRect = {
    x: PADDING.left,
    y: padTop,
    w: width - PADDING.left - PADDING.right,
    h: PLOT_HEIGHT,
  };

  const groupNodes: WeightedNode<{ group: TreemapGroup; index: number }>[] = model.groups.map(
    (group, index) => ({
      item: { group, index },
      weight: group.total,
    }),
  );

  const placedGroups = squarifyLayout(groupNodes, outerBounds);

  for (const placedGroup of placedGroups) {
    const { group, index: groupIdx } = placedGroup.item;
    const groupRect = insetRect(placedGroup.rect, GROUP_GAP);
    const groupBaseColor = resolveSeriesColor(groupIdx, {
      explicitColor: group.color,
      seriesColors: model.seriesColors,
      mono: model.mono,
      dark: options.dark,
    });

    const showGroupHeader =
      Boolean(group.name) &&
      groupRect.w >= 64 &&
      groupRect.h >= GROUP_HEADER_HEIGHT * scaleFactor + 28;
    const headerH = showGroupHeader ? Math.round(GROUP_HEADER_HEIGHT * scaleFactor) : 0;

    if (showGroupHeader) {
      svg.rect(groupRect.x, groupRect.y, groupRect.w, groupRect.h, {
        fill: shadeColor(groupBaseColor, options.dark ? -0.35 : 0.72),
        stroke: groupBaseColor,
        "stroke-width": 1.2,
        rx: 5,
      });
      const headerSize = Math.max(9, fontSize - 1);
      const headerLabel = truncateLabel(group.name, groupRect.w - 12, headerSize);
      drawLabelLines(svg, groupRect.x + 8, groupRect.y + headerH * 0.72, headerLabel, headerSize, {
        "text-anchor": "start",
        "font-size": headerSize,
        "font-weight": 600,
        fill: palette.fg,
      });
    }

    const leavesBounds: LayoutRect = {
      x: groupRect.x + (showGroupHeader ? 2 : 0),
      y: groupRect.y + headerH,
      w: Math.max(1, groupRect.w - (showGroupHeader ? 4 : 0)),
      h: Math.max(1, groupRect.h - headerH - (showGroupHeader ? 2 : 0)),
    };

    const leafNodes: WeightedNode<{ leaf: TreemapLeaf; leafIdx: number }>[] = group.items.map(
      (leaf, leafIdx) => ({
        item: { leaf, leafIdx },
        weight: leaf.value,
      }),
    );

    const placedLeaves = squarifyLayout(leafNodes, leavesBounds);
    const leafCount = Math.max(1, placedLeaves.length);

    for (const placedLeaf of placedLeaves) {
      const { leaf, leafIdx } = placedLeaf.item;
      const cell = insetRect(placedLeaf.rect, LEAF_GAP);

      // Если группа единственная и без имени, раскрашиваем каждый лист как отдельную серию;
      // внутри именованной группы листья получают мягкие оттенки базового цвета группы.
      let fill: string;
      if (leaf.color) {
        fill = leaf.color;
      } else if (!hasNamedGroups && model.groups.length === 1) {
        fill = resolveSeriesColor(leafIdx, {
          seriesColors: model.seriesColors,
          mono: model.mono,
          dark: options.dark,
        });
      } else {
        const shadeStep =
          leafCount <= 1 ? 0 : ((leafIdx / (leafCount - 1)) - 0.5) * 0.32;
        fill = shadeColor(groupBaseColor, shadeStep);
      }

      svg.rect(cell.x, cell.y, cell.w, cell.h, {
        fill,
        stroke: palette.bg,
        "stroke-width": 1,
        rx: 4,
        "data-leaf": leaf.label,
      });

      if (cell.w >= MIN_LABEL_RECT_WIDTH && cell.h >= MIN_LABEL_RECT_HEIGHT) {
        const textFill = readableTextOnFill(fill, palette.fg);
        const subLabel = formatSubLabel(leaf.value, model.total, model.labels);
        const canFitTwoLines =
          subLabel !== null && cell.h >= MIN_SUBLABEL_RECT_HEIGHT * scaleFactor;

        const mainText = truncateLabel(leaf.label, cell.w - 10, fontSize);
        const cx = cell.x + cell.w / 2;
        const cy = cell.y + cell.h / 2;
        const mainLines = hasLabelBreak(mainText) ? splitLabelLines(mainText) : [mainText];

        if (canFitTwoLines && subLabel && mainLines.length === 1) {
          svg.text(cx, cy - 2, mainText, {
            "font-size": fontSize,
            "font-weight": 600,
            fill: textFill,
          });
          const subFontSize = Math.max(8, fontSize - 1);
          svg.text(cx, cy + subFontSize + 2, truncate(subLabel, cell.w - 10, subFontSize), {
            "font-size": subFontSize,
            fill: textFill,
          });
        } else if (mainLines.length === 1) {
          svg.text(cx, cy + fontSize * 0.35, mainText, {
            "font-size": fontSize,
            "font-weight": 600,
            fill: textFill,
          });
        } else {
          drawLabelLines(svg, cx, cy + fontSize * 0.35, mainText, fontSize, {
            "font-size": fontSize,
            "font-weight": 600,
            fill: textFill,
          }, "center");
          const subFontSize = Math.max(8, fontSize - 1);
          if (canFitTwoLines && subLabel) {
            const below = cy + fontSize * 0.35 + ((mainLines.length - 1) * fontSize * 1.2) / 2 + subFontSize + 2;
            svg.text(cx, below, truncate(subLabel, cell.w - 10, subFontSize), {
              "font-size": subFontSize,
              fill: textFill,
            });
          }
        }
      }
    }
  }

  if (hasNamedGroups) {
    let lx = PADDING.left;
    const ly = padTop + PLOT_HEIGHT + 22;
    const swatch = 10;
    model.groups.forEach((group, idx) => {
      if (!group.name) return;
      const color = resolveSeriesColor(idx, {
        explicitColor: group.color,
        seriesColors: model.seriesColors,
        mono: model.mono,
        dark: options.dark,
      });
      svg.rect(lx, ly - swatch + 2, swatch, swatch, { fill: color, rx: 2 });
      const label = hasLabelBreak(group.name)
        ? splitLabelLines(group.name)
            .map((line, idx) => (idx === 0 ? `${line} (${fmt(group.total)})` : line))
            .join("\n")
        : `${group.name} (${fmt(group.total)})`;
      drawLabelLines(svg, lx + swatch + 6, ly, label, fontSize, {
        "text-anchor": "start",
        "font-size": fontSize,
        fill: palette.fgDim,
      });
      lx += swatch + 6 + measureLabelWidth(label, fontSize) + 18;
    });
  }

  return svg.toString();
}

export const treemapEngine: ExtEngine<TreemapModel> = {
  type: "treemap",
  aliases: ["treemap", "tree-map"],
  parse: parseTreemap,
  render: renderTreemap,
};
