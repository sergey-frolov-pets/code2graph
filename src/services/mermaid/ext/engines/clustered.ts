import {
  extractTrailingColorAttr,
  parseExtColorsDirective,
  parseExtNumber,
  chartIsDark,
  parseMonoDirective,
  readableTextOnFill,
  resolveSeriesColor,
  unquoteExtText,
} from "../color-utils";
import {
  clamp,
  createSvg,
  fixedTicks,
  fmt,
  measureText,
  niceRange,
  niceTicks,
  resolvePalette,
  truncate,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export type ClusteredLabelsMode = "above" | "inside" | "none";

export interface ClusteredSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface ClusteredModel {
  title?: string;
  categories: string[];
  y?: { label?: string; min?: number; max?: number };
  /** Поворот на 90 градусов: горизонтальные сгруппированные полосы вместо вертикальных столбцов. */
  rotate90: boolean;
  /** `stacked` — серии в одном столбце, а не рядом. */
  stack: boolean;
  grid: boolean;
  gridStep?: number;
  axis: boolean;
  labels: ClusteredLabelsMode;
  fontSize?: number;
  mono: boolean;
  /** `mono invert` — светлая серая шкала на тёмном холсте. */
  monoInvert: boolean;
  seriesColors: Record<string, string>;
  series: ClusteredSeries[];
}

const FONT_BASE = 11;
const FONT_MIN = 6;
const FONT_MAX = 28;
const PLOT_HEIGHT_VERTICAL = 250;
const PLOT_WIDTH_HORIZONTAL = 440;
const MIN_BAR_THICKNESS = 12;
const MAX_BAR_THICKNESS = 36;
const INNER_BAR_GAP = 3;
const CLUSTER_PADDING_RATIO = 0.26;

function splitCsvLabels(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => unquoteExtText(s))
    .filter((s) => s.length > 0);
}

function parseYDirective(
  body: string,
): { y?: { label?: string; min?: number; max?: number }; error?: string } {
  const rangeMatch = /^(.*?)\s*(-?[\d\s_.,]+)\s*-->\s*(-?[\d\s_.,]+)\s*$/.exec(body);
  if (rangeMatch) {
    const min = parseExtNumber(rangeMatch[2]);
    const max = parseExtNumber(rangeMatch[3]);
    if (min === null || max === null || max <= min) {
      return { error: `ожидается «y "<подпись>" <min> --> <max>» (max > min)` };
    }
    const label = unquoteExtText(rangeMatch[1]) || undefined;
    return { y: { label, min, max } };
  }
  const labelOnly = unquoteExtText(body);
  if (!labelOnly) {
    return { error: `ожидается «y "<подпись>" [<min> --> <max>]»` };
  }
  return { y: { label: labelOnly } };
}

function parseRotateDirective(
  raw: string,
  lineNo: number,
): { rotate90?: boolean; error?: ExtParseError } {
  const lower = raw.trim().toLowerCase();
  if (lower === "rotate" || lower === "horizontal") {
    return { rotate90: true };
  }
  if (lower === "vertical") {
    return { rotate90: false };
  }
  if (/^rotate\b/i.test(raw)) {
    const arg = raw.replace(/^rotate\s*/i, "").replace(/deg|°/gi, "").trim().toLowerCase();
    if (!arg || arg === "90" || arg === "on" || arg === "true" || arg === "horizontal") {
      return { rotate90: true };
    }
    if (arg === "0" || arg === "off" || arg === "false" || arg === "vertical") {
      return { rotate90: false };
    }
    return {
      error: {
        message: `ожидается «rotate 90» или «rotate 0», получено «${raw}»`,
        line: lineNo,
        col: 0,
      },
    };
  }
  if (/^orientation\b/i.test(raw)) {
    const arg = raw.replace(/^orientation\s*/i, "").trim().toLowerCase();
    if (arg === "horizontal" || arg === "lr" || arg === "90") {
      return { rotate90: true };
    }
    if (arg === "vertical" || arg === "tb" || arg === "0") {
      return { rotate90: false };
    }
    return {
      error: {
        message: `ожидается «orientation horizontal» или «orientation vertical», получено «${raw}»`,
        line: lineNo,
        col: 0,
      },
    };
  }
  return {};
}

function parseSeriesRow(
  rawLine: string,
  lineNo: number,
  expectedCount: number | null,
): { series?: ClusteredSeries; error?: ExtParseError } {
  const colonIdx = rawLine.indexOf(":");
  if (colonIdx < 0) {
    return {
      error: {
        message: `ожидается «series Имя : зн1, зн2, …», получено «${rawLine}»`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const headRaw = rawLine.slice(0, colonIdx).replace(/^series\s+/i, "").trim();
  const headColor = extractTrailingColorAttr(headRaw, lineNo);
  if (headColor.error) return { error: headColor.error };

  const tailColor = extractTrailingColorAttr(rawLine.slice(colonIdx + 1), lineNo);
  if (tailColor.error) return { error: tailColor.error };

  const name = unquoteExtText(headColor.rest);
  if (!name) {
    return {
      error: { message: `пустое имя серии перед «:»`, line: lineNo, col: 0 },
    };
  }

  const color = tailColor.color ?? headColor.color;
  const parts = tailColor.rest
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      error: { message: `серия «${name}»: пустой список значений`, line: lineNo, col: 0 },
    };
  }

  if (expectedCount !== null && parts.length !== expectedCount) {
    return {
      error: {
        message: `серия «${name}»: ожидается ${expectedCount} значений (по числу категорий), получено ${parts.length}`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const values: number[] = [];
  for (const part of parts) {
    const n = parseExtNumber(part);
    if (n === null) {
      return {
        error: {
          message: `серия «${name}»: не удалось разобрать число «${part}»`,
          line: lineNo,
          col: 0,
        },
      };
    }
    values.push(n);
  }

  return { series: { name, values, color } };
}

export function parseClustered(source: string): ExtParseResult<ClusteredModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let categories: string[] | null = null;
  let yAxis: ClusteredModel["y"];
  let rotate90 = false;
  let stack = false;
  let grid = true;
  let gridStep: number | undefined;
  let axis = true;
  let labels: ClusteredLabelsMode = "above";
  let fontSize: number | undefined;
  let mono = false;
  let monoInvert = false;
  const seriesColors: Record<string, string> = {};
  const series: ClusteredSeries[] = [];

  let seenType = false;
  let inData = false;

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

    if (!inData) {
      if (/^title\b/i.test(raw) && !raw.includes(":")) {
        title = unquoteExtText(raw.replace(/^title\s*/i, "")) || undefined;
        continue;
      }

      if (/^(?:rotate|orientation|horizontal|vertical)\b/i.test(raw) && !raw.includes(":")) {
        const parsed = parseRotateDirective(raw, lineNo);
        if (parsed.error) errors.push(parsed.error);
        else if (parsed.rotate90 !== undefined) rotate90 = parsed.rotate90;
        continue;
      }

      if (/^(?:categories|x)\b/i.test(raw) && !raw.includes(":")) {
        const body = raw.replace(/^(?:categories|x)\s*/i, "");
        const list = splitCsvLabels(body);
        if (list.length === 0) {
          errors.push({
            message: `«categories»: ожидается список категорий через запятую`,
            line: lineNo,
            col: 0,
          });
        } else {
          categories = list;
        }
        continue;
      }

      if (/^axis\s+(?:on|off)$/i.test(raw)) {
        axis = /on$/i.test(raw);
        continue;
      }

      if (/^y\b/i.test(raw) && !raw.includes(":")) {
        const parsed = parseYDirective(raw.slice(1).trim());
        if (parsed.error || !parsed.y) {
          errors.push({ message: parsed.error ?? `неверная директива «y»`, line: lineNo, col: 0 });
        } else {
          yAxis = parsed.y;
        }
        continue;
      }

      if (/^grid\b/i.test(raw) && !raw.includes(":")) {
        const arg = raw.replace(/^grid\s*/i, "").trim().toLowerCase();
        if (!arg || arg === "on") grid = true;
        else if (arg === "off") grid = false;
        else {
          const step = parseExtNumber(arg);
          if (step === null || !(step > 0)) {
            errors.push({
              message: `ожидается «grid», «grid off» или «grid <положительный шаг>», получено «${arg}»`,
              line: lineNo,
              col: 0,
            });
          } else {
            grid = true;
            gridStep = step;
          }
        }
        continue;
      }

      if (/^labels\b/i.test(raw) && !raw.includes(":")) {
        const mode = raw.replace(/^labels\s*/i, "").trim().toLowerCase();
        if (mode === "above" || mode === "outside" || mode === "on") labels = "above";
        else if (mode === "inside") labels = "inside";
        else if (mode === "none" || mode === "off") labels = "none";
        else {
          errors.push({
            message: `ожидается «labels above|inside|none», получено «${mode}»`,
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

      if (/^(?:stacked|bars|layout)\b/i.test(raw) && !raw.includes(":")) {
        const token = raw.replace(/^(?:stacked|bars|layout)\s*/i, "").trim().toLowerCase();
        if (raw.toLowerCase() === "stacked" || token === "stacked" || token === "stack" || token === "on") {
          stack = true;
        } else if (
          raw.toLowerCase() === "clustered" ||
          token === "clustered" ||
          token === "grouped" ||
          token === "off" ||
          token === ""
        ) {
          stack = false;
        } else {
          errors.push({
            message: `ожидается «stacked» или «bars clustered», получено «${raw}»`,
            line: lineNo,
            col: 0,
          });
        }
        continue;
      }

      if (/^mono\b/i.test(raw) && !raw.includes(":")) {
        const parsed = parseMonoDirective(raw, lineNo);
        if (parsed.error) errors.push(parsed.error);
        else if (parsed.mono !== undefined) {
          mono = parsed.mono;
          monoInvert = Boolean(parsed.monoInvert);
        }
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
    }

    if (raw.includes(":")) {
      const parsed = parseSeriesRow(raw, lineNo, categories ? categories.length : null);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.series) series.push(parsed.series);
      continue;
    }

    errors.push({
      message: `неизвестная директива «${raw.split(/\s+/)[0]}» (допустимы title, rotate 90, categories, y, grid, axis, labels, fontsize, mono, stacked, colors, series)`,
      line: lineNo,
      col: 0,
    });
  }

  if (!categories) {
    errors.push({
      message: `не заданы категории: ожидается строка «categories Кат 1, Кат 2, …» (или «x Кат 1, Кат 2, …»)`,
      line: 1,
      col: 0,
    });
  }

  if (series.length === 0 && errors.length === 0) {
    errors.push({
      message: `нет данных: ожидается хотя бы одна серия «series Имя : зн1, зн2, …»`,
      line: 1,
      col: 0,
    });
  }

  if (categories) {
    for (const s of series) {
      if (s.values.length !== categories.length) {
        errors.push({
          message: `серия «${s.name}»: ожидается ${categories.length} значений (по числу категорий), получено ${s.values.length}`,
          line: 1,
          col: 0,
        });
      }
    }
  }

  if (errors.length > 0 || !categories) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      title,
      categories,
      y: yAxis,
      rotate90,
      stack,
      grid,
      gridStep,
      axis,
      labels,
      fontSize,
      mono,
      monoInvert,
      seriesColors,
      series,
    },
  };
}

/** Сегменты стопки: положительные складываются вверх от нуля, отрицательные — вниз. */
export function stackedSpans(
  model: ClusteredModel,
  category: number,
): Array<{ start: number; end: number }> {
  let positive = 0;
  let negative = 0;
  return model.series.map((series) => {
    const value = series.values[category] ?? 0;
    const start = value >= 0 ? positive : negative;
    const end = start + value;
    if (value >= 0) positive = end;
    else negative = end;
    return { start, end };
  });
}

function computeValueScale(model: ClusteredModel): {
  min: number;
  max: number;
  ticks: number[];
} {
  let rawMin = 0;
  let rawMax = 0;
  if (model.stack && model.series.length > 0) {
    const cats = Math.max(...model.series.map((series) => series.values.length));
    for (let category = 0; category < cats; category += 1) {
      const spans = stackedSpans(model, category);
      for (const span of spans) {
        rawMin = Math.min(rawMin, span.start, span.end);
        rawMax = Math.max(rawMax, span.start, span.end);
      }
    }
  } else {
    const allVals = model.series.flatMap((s) => s.values);
    rawMin = Math.min(0, ...allVals);
    rawMax = Math.max(0, ...allVals);
  }
  const auto = niceRange(rawMin, rawMax, 5);
  const min = model.y?.min ?? Math.min(0, auto.min);
  const max = model.y?.max ?? (auto.max <= min ? min + 10 : auto.max);
  const ticks =
    model.gridStep && model.gridStep > 0 ? fixedTicks(min, max, model.gridStep) : niceTicks(min, max, 5);
  return { min, max, ticks };
}

function renderLegend(
  svg: ReturnType<typeof createSvg>,
  model: ClusteredModel,
  options: ExtRenderOptions,
  plotLeft: number,
  legendY: number,
  fontSize: number,
  fgDim: string,
): void {
  const swatch = 10;
  let lx = plotLeft;
  model.series.forEach((s, idx) => {
    const color = resolveSeriesColor(idx, {
      explicitColor: s.color,
      seriesColors: model.seriesColors,
      mono: model.mono,
      dark: chartIsDark(options.dark, model.monoInvert),
    });
    svg.rect(lx, legendY - swatch + 2, swatch, swatch, { fill: color, rx: 2 });
    svg.text(lx + swatch + 6, legendY, s.name, {
      "text-anchor": "start",
      "font-size": fontSize,
      fill: fgDim,
    });
    lx += swatch + 6 + measureText(s.name, fontSize) + 18;
  });
}

function renderVerticalClustered(model: ClusteredModel, options: ExtRenderOptions): string {
  const palette = resolvePalette(
    chartIsDark(options.dark, model.monoInvert),
    options.background,
    options.textColor,
  );
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const scaleFactor = fontSize / FONT_BASE;
  const titleSize = clamp(Math.round(fontSize * 1.36), 14, 26);

  const catCount = Math.max(1, model.categories.length);
  const seriesCount = Math.max(1, model.series.length);
  const layoutCount = model.stack ? 1 : seriesCount;

  const barWidth = clamp(
    Math.round(24 * scaleFactor - Math.max(0, layoutCount - 2) * 2),
    MIN_BAR_THICKNESS,
    MAX_BAR_THICKNESS,
  );
  const barsGroupWidth = layoutCount * barWidth + (layoutCount - 1) * INNER_BAR_GAP;
  const longestCat = model.categories.reduce(
    (max, cat) => Math.max(max, measureText(cat, fontSize)),
    0,
  );
  const colWidth = Math.max(
    Math.round(barsGroupWidth / (1 - CLUSTER_PADDING_RATIO)),
    Math.ceil(longestCat) + 20,
    72,
  );

  const plotWidth = Math.max(260, colWidth * catCount);
  const plotHeight = Math.round(PLOT_HEIGHT_VERTICAL * Math.max(1, (scaleFactor - 1) * 0.4 + 1));

  const padLeft = model.axis ? 68 : 28;
  const padRight = model.stack && model.labels !== "none" ? 72 : 28;
  const padTop = (model.title ? 52 : 28) + (model.labels === "above" ? fontSize + 6 : 0);
  const padBottom = 68;

  const width = padLeft + plotWidth + padRight;
  const height = padTop + plotHeight + padBottom;

  const plotLeft = padLeft;
  const plotTop = padTop;
  const plotBottom = plotTop + plotHeight;
  const plotRight = plotLeft + plotWidth;

  const { min: yMin, max: yMax, ticks } = computeValueScale(model);
  const ySpan = yMax - yMin || 1;
  const yOf = (val: number): number => plotBottom - clamp((val - yMin) / ySpan, 0, 1) * plotHeight;
  const yZero = yOf(clamp(0, yMin, yMax));

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
  });

  if (model.title) {
    svg.text(width / 2, 26, model.title, {
      "font-size": titleSize,
      "font-weight": 600,
      fill: palette.fg,
    });
  }

  for (const tick of ticks) {
    const y = yOf(tick);
    if (model.grid) {
      svg.line(plotLeft, y, plotRight, y, {
        stroke: palette.grid,
        "stroke-width": 1,
        "stroke-dasharray": "3 3",
      });
    }
    if (model.axis) {
      svg.text(plotLeft - 8, y + fontSize * 0.35, fmt(tick), {
        "text-anchor": "end",
        "font-size": fontSize,
        fill: palette.fgDim,
      });
    }
  }

  if (model.axis && model.y?.label) {
    const cx = 18;
    const cy = plotTop + plotHeight / 2;
    svg.text(cx, cy, model.y.label, {
      "text-anchor": "middle",
      "font-size": fontSize,
      fill: palette.fgDim,
      transform: `rotate(-90 ${fmt(cx)} ${fmt(cy)})`,
    });
  }

  for (let c = 0; c < catCount; c += 1) {
    const clusterCenter = plotLeft + (c + 0.5) * colWidth;
    const clusterLeft = clusterCenter - barsGroupWidth / 2;

    const spans = model.stack ? stackedSpans(model, c) : null;
    model.series.forEach((s, sIdx) => {
      const val = s.values[c] ?? 0;
      const span = spans?.[sIdx];
      const color = resolveSeriesColor(sIdx, {
        explicitColor: s.color,
        seriesColors: model.seriesColors,
        mono: model.mono,
        dark: chartIsDark(options.dark, model.monoInvert),
      });
      const bx = span ? clusterLeft : clusterLeft + sIdx * (barWidth + INNER_BAR_GAP);
      const yStart = yOf(span ? span.start : 0);
      const yEnd = yOf(span ? span.end : val);
      const barTop = Math.min(span ? yStart : yZero, span ? yEnd : yOf(val));
      const barH = Math.max(1.5, Math.abs((span ? yEnd : yOf(val)) - (span ? yStart : yZero)));

      svg.rect(bx, barTop, barWidth, barH, {
        fill: color,
        rx: 2,
        "data-bar": `${c}-${sIdx}`,
      });

      if (model.labels !== "none") {
        const valText = fmt(val);
        const insideFits =
          model.labels === "inside" &&
          barH >= fontSize + 6 &&
          measureText(valText, fontSize - 1) <= barWidth - 2;

        const stackedInside =
          Boolean(span) && barH >= fontSize + 4 && measureText(valText, fontSize - 1) <= barWidth - 2;
        if (insideFits || stackedInside) {
          const textFill = readableTextOnFill(color, palette.fg);
          svg.text(bx + barWidth / 2, barTop + barH / 2 + fontSize * 0.35, valText, {
            "font-size": Math.max(8, fontSize - 1),
            "font-weight": 600,
            fill: textFill,
          });
        } else if (span) {
          svg.text(bx + barWidth + 4, barTop + barH / 2 + fontSize * 0.35, valText, {
            "text-anchor": "start",
            "font-size": Math.max(8, fontSize - 1),
            fill: palette.fgDim,
          });
        } else {
          const labelY = val >= 0 ? barTop - 5 : barTop + barH + fontSize + 2;
          svg.text(bx + barWidth / 2, labelY, valText, {
            "font-size": Math.max(8, fontSize - 1),
            fill: palette.fgDim,
          });
        }
      }
    });

    svg.text(
      clusterCenter,
      plotBottom + fontSize + 8,
      truncate(model.categories[c] ?? "", colWidth - 6, fontSize),
      {
        "font-size": fontSize,
        fill: palette.fg,
      },
    );
  }

  if (model.axis) {
    svg.line(plotLeft, yZero, plotRight, yZero, {
      stroke: palette.axis,
      "stroke-width": 1.2,
    });
  }

  renderLegend(svg, model, options, plotLeft, height - 16, fontSize, palette.fgDim);
  return svg.toString();
}

function renderHorizontalClustered(model: ClusteredModel, options: ExtRenderOptions): string {
  const palette = resolvePalette(
    chartIsDark(options.dark, model.monoInvert),
    options.background,
    options.textColor,
  );
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const scaleFactor = fontSize / FONT_BASE;
  const titleSize = clamp(Math.round(fontSize * 1.36), 14, 26);

  const catCount = Math.max(1, model.categories.length);
  const seriesCount = Math.max(1, model.series.length);
  const layoutCount = model.stack ? 1 : seriesCount;

  const barHeight = clamp(
    Math.round(20 * scaleFactor - Math.max(0, layoutCount - 2) * 1.5),
    MIN_BAR_THICKNESS,
    MAX_BAR_THICKNESS,
  );
  const barsGroupHeight = layoutCount * barHeight + (layoutCount - 1) * INNER_BAR_GAP;
  const rowHeight = Math.max(Math.round(barsGroupHeight / (1 - CLUSTER_PADDING_RATIO)), 42);

  const longestCat = model.categories.reduce(
    (max, cat) => Math.max(max, measureText(cat, fontSize)),
    0,
  );
  const padLeft = clamp(Math.ceil(longestCat) + 28, 76, 180);
  const padRight = model.labels === "above" ? 56 : 28;
  const padTop = model.title ? 48 : 24;
  const padBottom = (model.y?.label ? 80 : 62);

  const plotWidth = Math.round(PLOT_WIDTH_HORIZONTAL * Math.max(1, (scaleFactor - 1) * 0.35 + 1));
  const plotHeight = rowHeight * catCount;

  const width = padLeft + plotWidth + padRight;
  const height = padTop + plotHeight + padBottom;

  const plotLeft = padLeft;
  const plotTop = padTop;
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;

  const { min: xMin, max: xMax, ticks } = computeValueScale(model);
  const xSpan = xMax - xMin || 1;
  const xOf = (val: number): number => plotLeft + clamp((val - xMin) / xSpan, 0, 1) * plotWidth;
  const xZero = xOf(clamp(0, xMin, xMax));

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
  });

  if (model.title) {
    svg.text(width / 2, 26, model.title, {
      "font-size": titleSize,
      "font-weight": 600,
      fill: palette.fg,
    });
  }

  for (const tick of ticks) {
    const x = xOf(tick);
    if (model.grid) {
      svg.line(x, plotTop, x, plotBottom, {
        stroke: palette.grid,
        "stroke-width": 1,
        "stroke-dasharray": "3 3",
      });
    }
    if (model.axis) {
      svg.text(x, plotBottom + fontSize + 6, fmt(tick), {
        "text-anchor": "middle",
        "font-size": fontSize,
        fill: palette.fgDim,
      });
    }
  }

  if (model.axis && model.y?.label) {
    svg.text((plotLeft + plotRight) / 2, plotBottom + fontSize * 2 + 16, model.y.label, {
      "text-anchor": "middle",
      "font-size": fontSize,
      fill: palette.fgDim,
    });
  }

  for (let c = 0; c < catCount; c += 1) {
    const rowCenter = plotTop + (c + 0.5) * rowHeight;
    const clusterTop = rowCenter - barsGroupHeight / 2;

    svg.text(
      plotLeft - 10,
      rowCenter + fontSize * 0.35,
      truncate(model.categories[c] ?? "", padLeft - 18, fontSize),
      {
        "text-anchor": "end",
        "font-size": fontSize,
        fill: palette.fg,
      },
    );

    const spans = model.stack ? stackedSpans(model, c) : null;
    model.series.forEach((s, sIdx) => {
      const val = s.values[c] ?? 0;
      const span = spans?.[sIdx];
      const color = resolveSeriesColor(sIdx, {
        explicitColor: s.color,
        seriesColors: model.seriesColors,
        mono: model.mono,
        dark: chartIsDark(options.dark, model.monoInvert),
      });
      const by = span ? clusterTop : clusterTop + sIdx * (barHeight + INNER_BAR_GAP);
      const xStart = xOf(span ? span.start : 0);
      const xEnd = xOf(span ? span.end : val);
      const barLeft = Math.min(span ? xStart : xZero, span ? xEnd : xOf(val));
      const barW = Math.max(1.5, Math.abs((span ? xEnd : xOf(val)) - (span ? xStart : xZero)));

      svg.rect(barLeft, by, barW, barHeight, {
        fill: color,
        rx: 2,
        "data-bar": `${c}-${sIdx}`,
      });

      if (model.labels !== "none") {
        const valText = fmt(val);
        const insideFits =
          model.labels === "inside" &&
          barW >= measureText(valText, fontSize - 1) + 10 &&
          barHeight >= fontSize;

        const stackedInside =
          Boolean(span) &&
          barW >= measureText(valText, fontSize - 1) + 8 &&
          barHeight >= fontSize;
        if (insideFits || stackedInside) {
          const textFill = readableTextOnFill(color, palette.fg);
          svg.text(barLeft + barW / 2, by + barHeight / 2 + fontSize * 0.35, valText, {
            "font-size": Math.max(8, fontSize - 1),
            "font-weight": 600,
            fill: textFill,
          });
        } else if (span) {
          svg.text(barLeft + barW / 2, by - 3, valText, {
            "font-size": Math.max(8, fontSize - 1),
            fill: palette.fgDim,
          });
        } else {
          const lx = val >= 0 ? barLeft + barW + 6 : barLeft - 6;
          const anchor = val >= 0 ? "start" : "end";
          svg.text(lx, by + barHeight / 2 + fontSize * 0.35, valText, {
            "text-anchor": anchor,
            "font-size": Math.max(8, fontSize - 1),
            fill: palette.fgDim,
          });
        }
      }
    });
  }

  if (model.axis) {
    svg.line(xZero, plotTop, xZero, plotBottom, {
      stroke: palette.axis,
      "stroke-width": 1.2,
    });
  }

  renderLegend(svg, model, options, plotLeft, height - 16, fontSize, palette.fgDim);
  return svg.toString();
}

export function renderClustered(model: ClusteredModel, options: ExtRenderOptions): string {
  return model.rotate90
    ? renderHorizontalClustered(model, options)
    : renderVerticalClustered(model, options);
}

export const clusteredEngine: ExtEngine<ClusteredModel> = {
  type: "clustered",
  aliases: ["clustered", "clustered-bar", "clustered-barchart", "barchart-clustered"],
  parse: parseClustered,
  render: renderClustered,
};
