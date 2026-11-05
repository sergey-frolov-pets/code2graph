import {
  extractTrailingColorAttr,
  isValidExtColor,
  parseExtColorsDirective,
  parseExtNumber,
  chartIsDark,
  parseMonoDirective,
  resolveSeriesColor,
  shadeColor,
  unquoteExtText,
} from "../color-utils";
import { growPlotToAspect, parseAspectDirective, type ChartAspect } from "../chart-aspect";
import {
  clamp,
  createSvg,
  drawLabelLines,
  fixedTicks,
  fmt,
  labelBlockExtra,
  measureLabelWidth,
  niceRange,
  niceTicks,
  resolvePalette,
  truncateLabel,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export interface BoxplotItem {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean?: number;
  outliers: number[];
  color?: string;
}

export interface BoxplotNamedColors {
  box?: string;
  median?: string;
  whisker?: string;
  outlier?: string;
}

export interface BoxplotModel {
  title?: string;
  y?: { label?: string; min?: number; max?: number };
  grid: boolean;
  gridStep?: number;
  fontSize?: number;
  mono: boolean;
  monoInvert: boolean;
  colors: BoxplotNamedColors;
  seriesColors: Record<string, string>;
  items: BoxplotItem[];
  /** `ratio 16x9` — ящики растягиваются под пропорции изображения. */
  ratio?: ChartAspect;
}

const FONT_BASE = 11;
const FONT_MIN = 6;
const FONT_MAX = 28;
const PLOT_HEIGHT_BASE = 250;
const PADDING_BASE = { top: 48, right: 28, bottom: 54, left: 68 };
const MIN_COL_WIDTH = 76;
const MAX_COL_WIDTH = 140;
const BOX_WIDTH_RATIO = 0.48;
const CAP_WIDTH_RATIO = 0.26;
const OUTLIER_RADIUS = 3.5;
const MEAN_MARKER_SIZE = 4;
const TUKEY_IQR_FACTOR = 1.5;
const BOX_FILL_OPACITY = 0.28;
const MIN_RAW_SAMPLE_COUNT = 3;
const FIVE_NUMBER_SUMMARY_COUNT = 5;

const BOXPLOT_COLOR_ALIASES: Readonly<Record<string, keyof BoxplotNamedColors>> = {
  box: "box",
  fill: "box",
  median: "median",
  whisker: "whisker",
  whiskers: "whisker",
  outlier: "outlier",
  outliers: "outlier",
};

function computeQuantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

function buildBoxFromSampleValues(
  label: string,
  rawNumbers: readonly number[],
  color?: string,
): BoxplotItem {
  const sorted = [...rawNumbers].sort((a, b) => a - b);
  const q1 = computeQuantile(sorted, 0.25);
  const median = computeQuantile(sorted, 0.5);
  const q3 = computeQuantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - TUKEY_IQR_FACTOR * iqr;
  const highFence = q3 + TUKEY_IQR_FACTOR * iqr;

  const inside = sorted.filter((v) => v >= lowFence && v <= highFence);
  const min = inside.length > 0 ? inside[0] : sorted[0];
  const max = inside.length > 0 ? inside[inside.length - 1] : sorted[sorted.length - 1];
  const outliers = sorted.filter((v) => v < min || v > max);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = Math.round((sum / sorted.length) * 100) / 100;

  return {
    label,
    min,
    q1,
    median,
    q3,
    max,
    mean,
    outliers,
    color,
  };
}

function parseYDirective(
  body: string,
): { y?: { label?: string; min?: number; max?: number }; error?: string } {
  const rangeMatch = /^(.*?)\s*(-?[\d\s_.,]+)\s*-->\s*(-?[\d\s_.,]+)\s*$/.exec(body);
  if (rangeMatch) {
    const min = parseExtNumber(rangeMatch[2]);
    const max = parseExtNumber(rangeMatch[3]);
    if (min === null || max === null) {
      return { error: `ожидается «y "<подпись>" <min> --> <max>»` };
    }
    if (max <= min) {
      return { error: `ось «y»: максимум (${fmt(max)}) должен быть больше минимума (${fmt(min)})` };
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

function parseDataRow(
  rawLine: string,
  lineNo: number,
): { item?: BoxplotItem; error?: ExtParseError } {
  const colonIdx = rawLine.indexOf(":");
  if (colonIdx < 0) {
    return {
      error: {
        message: `ожидается «Категория : min=…, q1=…, median=…, q3=…, max=…» или «Категория : values=…»`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const label = unquoteExtText(rawLine.slice(0, colonIdx));
  if (!label) {
    return {
      error: {
        message: `пустая подпись категории перед «:»`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const colorExtracted = extractTrailingColorAttr(rawLine.slice(colonIdx + 1), lineNo);
  if (colorExtracted.error) {
    return { error: colorExtracted.error };
  }

  let body = colorExtracted.rest;
  let itemColor = colorExtracted.color;

  // Поддержка режима сырой выборки: `values=10, 12, 15, ...`
  if (/^values\s*=/i.test(body)) {
    const listRaw = body.replace(/^values\s*=\s*/i, "");
    const parts = listRaw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length < MIN_RAW_SAMPLE_COUNT) {
      return {
        error: {
          message: `категория «${label}»: в «values=» нужно минимум ${MIN_RAW_SAMPLE_COUNT} числа, получено ${parts.length}`,
          line: lineNo,
          col: 0,
        },
      };
    }
    const nums: number[] = [];
    for (const part of parts) {
      const n = parseExtNumber(part);
      if (n === null) {
        return {
          error: {
            message: `категория «${label}»: не удалось разобрать число «${part}» в «values=»`,
            line: lineNo,
            col: 0,
          },
        };
      }
      nums.push(n);
    }
    return { item: buildBoxFromSampleValues(label, nums, itemColor) };
  }

  // Разбор пар ключ=значение, если есть `=`
  if (body.includes("=")) {
    const fields: Record<string, string> = {};
    for (const chunk of body.split(",")) {
      const piece = chunk.trim();
      if (!piece) continue;
      const eq = piece.indexOf("=");
      if (eq < 0) {
        return {
          error: {
            message: `категория «${label}»: ожидается пара «ключ=значение», получено «${piece}»`,
            line: lineNo,
            col: 0,
          },
        };
      }
      const k = piece.slice(0, eq).trim().toLowerCase();
      const v = unquoteExtText(piece.slice(eq + 1));
      fields[k] = v;
    }

    const allowedKeys = new Set([
      "min",
      "q1",
      "median",
      "med",
      "q2",
      "q3",
      "max",
      "mean",
      "avg",
      "outliers",
      "outlier",
      "color",
      "colour",
      "fill",
    ]);
    for (const key of Object.keys(fields)) {
      if (!allowedKeys.has(key)) {
        return {
          error: {
            message: `неизвестный ключ «${key}» в категории «${label}» (допустимы min, q1, median, q3, max, mean, outliers, color)`,
            line: lineNo,
            col: 0,
          },
        };
      }
    }

    const rawColor = fields.color ?? fields.colour ?? fields.fill;
    if (rawColor !== undefined) {
      if (!isValidExtColor(rawColor)) {
        return {
          error: {
            message: `не удалось разобрать цвет «${rawColor}» в категории «${label}»`,
            line: lineNo,
            col: 0,
          },
        };
      }
      itemColor = rawColor;
    }

    const min = parseExtNumber(fields.min ?? "");
    const q1 = parseExtNumber(fields.q1 ?? "");
    const median = parseExtNumber(fields.median ?? fields.med ?? fields.q2 ?? "");
    const q3 = parseExtNumber(fields.q3 ?? "");
    const max = parseExtNumber(fields.max ?? "");

    if (min === null || q1 === null || median === null || q3 === null || max === null) {
      return {
        error: {
          message: `категория «${label}»: требуются числовые поля min, q1, median, q3, max`,
          line: lineNo,
          col: 0,
        },
      };
    }

    if (!(min <= q1 && q1 <= median && median <= q3 && q3 <= max)) {
      return {
        error: {
          message: `категория «${label}»: нарушен порядок квантилей (ожидается min ≤ q1 ≤ median ≤ q3 ≤ max)`,
          line: lineNo,
          col: 0,
        },
      };
    }

    let mean: number | undefined;
    const meanRaw = fields.mean ?? fields.avg;
    if (meanRaw !== undefined) {
      const parsedMean = parseExtNumber(meanRaw);
      if (parsedMean === null) {
        return {
          error: {
            message: `категория «${label}»: неверное число в «mean=${meanRaw}»`,
            line: lineNo,
            col: 0,
          },
        };
      }
      mean = parsedMean;
    }

    const outliers: number[] = [];
    const outliersRaw = fields.outliers ?? fields.outlier;
    if (outliersRaw !== undefined && outliersRaw.trim() !== "") {
      for (const token of outliersRaw.split(/[;\s|]+/).filter(Boolean)) {
        const parsedOutlier = parseExtNumber(token);
        if (parsedOutlier === null) {
          return {
            error: {
              message: `категория «${label}»: неверное число выброса «${token}»`,
              line: lineNo,
              col: 0,
            },
          };
        }
        outliers.push(parsedOutlier);
      }
    }

    return {
      item: {
        label,
        min,
        q1,
        median,
        q3,
        max,
        mean,
        outliers,
        color: itemColor,
      },
    };
  }

  // Короткая запись из 5 чисел: `Категория : min, q1, median, q3, max`
  body = body.trim();
  const parts = body
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length !== FIVE_NUMBER_SUMMARY_COUNT) {
    return {
      error: {
        message: `категория «${label}»: ожидается 5 чисел (min, q1, median, q3, max), получено ${parts.length}`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const nums: number[] = [];
  for (const part of parts) {
    const n = parseExtNumber(part);
    if (n === null) {
      return {
        error: {
          message: `категория «${label}»: не удалось разобрать число «${part}»`,
          line: lineNo,
          col: 0,
        },
      };
    }
    nums.push(n);
  }

  const [min, q1, median, q3, max] = nums;
  if (!(min <= q1 && q1 <= median && median <= q3 && q3 <= max)) {
    return {
      error: {
        message: `категория «${label}»: нарушен порядок квантилей (ожидается min ≤ q1 ≤ median ≤ q3 ≤ max)`,
        line: lineNo,
        col: 0,
      },
    };
  }

  return {
    item: {
      label,
      min,
      q1,
      median,
      q3,
      max,
      outliers: [],
      color: itemColor,
    },
  };
}

export function parseBoxplot(source: string): ExtParseResult<BoxplotModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let yAxis: BoxplotModel["y"];
  let grid = true;
  let gridStep: number | undefined;
  let fontSize: number | undefined;
  let ratio: ChartAspect | undefined;
  let mono = false;
  let monoInvert = false;
  const colors: BoxplotNamedColors = {};
  const seriesColors: Record<string, string> = {};
  const items: BoxplotItem[] = [];

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
      if (/^title\b/i.test(raw)) {
        title = unquoteExtText(raw.replace(/^title\s*/i, "")) || undefined;
        continue;
      }

      if (/^y\b/i.test(raw)) {
        const parsed = parseYDirective(raw.slice(1).trim());
        if (parsed.error || !parsed.y) {
          errors.push({ message: parsed.error ?? `неверная директива «y»`, line: lineNo, col: 0 });
        } else {
          yAxis = parsed.y;
        }
        continue;
      }

      if (/^grid\b/i.test(raw)) {
        const arg = raw.replace(/^grid\s*/i, "").trim().toLowerCase();
        if (!arg || arg === "on") {
          grid = true;
        } else if (arg === "off") {
          grid = false;
        } else {
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

      const aspect = parseAspectDirective(raw);
      if (aspect) {
        if ("error" in aspect) errors.push({ message: aspect.error, line: lineNo, col: 0 });
        else ratio = aspect.aspect;
        continue;
      }

      if (/^fontsize\b/i.test(raw)) {
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

      if (/^mono\b/i.test(raw)) {
        const parsed = parseMonoDirective(raw, lineNo);
        if (parsed.error) errors.push(parsed.error);
        else if (parsed.mono !== undefined) {
          mono = parsed.mono;
          monoInvert = Boolean(parsed.monoInvert);
        }
        continue;
      }

      if (/^colors\b/i.test(raw)) {
        const parsed = parseExtColorsDirective(
          raw.replace(/^colors\s*/i, ""),
          lineNo,
          BOXPLOT_COLOR_ALIASES,
        );
        if (parsed.error) {
          errors.push(parsed.error);
        } else {
          Object.assign(colors, parsed.named);
          Object.assign(seriesColors, parsed.seriesColors);
        }
        continue;
      }

      if (/^data$/i.test(raw)) {
        inData = true;
        continue;
      }
    }

    if (raw.includes(":")) {
      const { item, error } = parseDataRow(raw, lineNo);
      if (error) errors.push(error);
      else if (item) items.push(item);
      continue;
    }

    errors.push({
      message: `неизвестная директива «${raw.split(/\s+/)[0]}» (допустимы title, y, grid, fontsize, mono, colors, ratio, data или строка «Категория : …»)`,
      line: lineNo,
      col: 0,
    });
  }

  if (items.length === 0 && errors.length === 0) {
    errors.push({
      message: `нет данных: ожидается хотя бы одна категория «Имя : min=…, q1=…, median=…, q3=…, max=…»`,
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
      y: yAxis,
      grid,
      gridStep,
      fontSize,
      mono,
      monoInvert,
      colors,
      seriesColors,
      items,
      ratio,
    },
  };
}

export function renderBoxplot(model: BoxplotModel, options: ExtRenderOptions): string {
  const palette = resolvePalette(chartIsDark(options.dark, model.monoInvert), options.background, options.textColor);
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const scaleFactor = fontSize / FONT_BASE;
  const titleSize = clamp(Math.round(fontSize * 1.36), 14, 26);

  const count = Math.max(1, model.items.length);
  const longestLabel = model.items.reduce(
    (max, item) => Math.max(max, measureLabelWidth(item.label, fontSize)),
    0,
  );
  let colWidth = clamp(
    Math.max(longestLabel + 24, MIN_COL_WIDTH * scaleFactor),
    MIN_COL_WIDTH,
    MAX_COL_WIDTH * scaleFactor,
  );
  let plotWidth = Math.max(260, colWidth * count);
  let plotHeight = Math.round(PLOT_HEIGHT_BASE * Math.max(1, (scaleFactor - 1) * 0.5 + 1));

  const yExtra = labelBlockExtra(model.y?.label, fontSize);
  const titleExtra = labelBlockExtra(model.title, titleSize);
  const catExtra = Math.max(0, ...model.items.map((item) => labelBlockExtra(item.label, fontSize)));
  const padLeft = Math.round(PADDING_BASE.left * Math.max(1, scaleFactor * 0.9)) + yExtra;
  const padRight = PADDING_BASE.right;
  const padTop = (model.title ? Math.round(PADDING_BASE.top * Math.max(1, scaleFactor * 0.9)) : 28) + titleExtra;
  const padBottom = Math.round(PADDING_BASE.bottom * Math.max(1, scaleFactor * 0.9)) + catExtra;

  if (model.ratio) {
    const grown = growPlotToAspect(
      {
        plotWidth,
        plotHeight,
        totalWidth: padLeft + plotWidth + padRight,
        totalHeight: padTop + plotHeight + padBottom,
      },
      model.ratio,
    );
    if (grown.plotWidth > plotWidth) {
      colWidth = grown.plotWidth / count;
      plotWidth = colWidth * count;
    }
    plotHeight = grown.plotHeight;
  }

  const width = padLeft + plotWidth + padRight;
  const height = padTop + plotHeight + padBottom;

  const allValues: number[] = [];
  for (const item of model.items) {
    allValues.push(item.min, item.q1, item.median, item.q3, item.max, ...item.outliers);
    if (item.mean !== undefined) allValues.push(item.mean);
  }
  const rawMin = allValues.length ? Math.min(...allValues) : 0;
  const rawMax = allValues.length ? Math.max(...allValues) : 100;
  const autoRange = niceRange(rawMin, rawMax, 5);
  const yMin = model.y?.min ?? autoRange.min;
  const yMax = model.y?.max ?? (autoRange.max === autoRange.min ? autoRange.min + 1 : autoRange.max);

  const plotLeft = padLeft;
  const plotTop = padTop;
  const plotBottom = plotTop + plotHeight;
  const plotRight = plotLeft + plotWidth;

  const yOf = (val: number): number =>
    plotBottom - clamp((val - yMin) / (yMax - yMin || 1), 0, 1) * plotHeight;

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
  });

  if (model.title) {
    const titleY = Math.round((padTop - titleExtra) * 0.55);
    drawLabelLines(svg, width / 2, titleY, model.title, titleSize, {
      "font-size": titleSize,
      "font-weight": 600,
      fill: palette.fg,
    });
  }

  const ticks =
    model.gridStep && model.gridStep > 0
      ? fixedTicks(yMin, yMax, model.gridStep)
      : niceTicks(yMin, yMax, 5);

  for (const tick of ticks) {
    const y = yOf(tick);
    if (model.grid) {
      svg.line(plotLeft, y, plotRight, y, {
        stroke: palette.grid,
        "stroke-width": 1,
        "stroke-dasharray": "3 3",
      });
    }
    svg.text(plotLeft - 8, y + fontSize * 0.35, fmt(tick), {
      "text-anchor": "end",
      "font-size": fontSize,
      fill: palette.fgDim,
    });
  }

  if (model.y?.label) {
    const cx = 18 + yExtra;
    const cy = plotTop + plotHeight / 2;
    drawLabelLines(svg, cx, cy, model.y.label, fontSize, {
      "text-anchor": "middle",
      "font-size": fontSize,
      fill: palette.fgDim,
      transform: `rotate(-90 ${fmt(cx)} ${fmt(cy)})`,
    }, "up");
  }

  svg.line(plotLeft, plotTop, plotLeft, plotBottom, { stroke: palette.axis, "stroke-width": 1 });
  svg.line(plotLeft, plotBottom, plotRight, plotBottom, {
    stroke: palette.axis,
    "stroke-width": 1,
  });

  const boxWidth = model.ratio
    ? Math.max(22, colWidth * BOX_WIDTH_RATIO)
    : clamp(colWidth * BOX_WIDTH_RATIO, 22, 68);
  const capHalfWidth = Math.max(6, (colWidth * CAP_WIDTH_RATIO) / 2);

  model.items.forEach((item, idx) => {
    const cx = plotLeft + (idx + 0.5) * colWidth;
    const baseColor =
      item.color ??
      model.seriesColors[`s${idx + 1}`] ??
      model.colors.box ??
      resolveSeriesColor(idx, {
        seriesColors: model.seriesColors,
        mono: model.mono,
        dark: chartIsDark(options.dark, model.monoInvert),
      });

    const onDark = chartIsDark(options.dark, model.monoInvert);
    const whiskerColor = model.colors.whisker ?? shadeColor(baseColor, onDark ? 0.15 : -0.2);
    const medianColor = model.colors.median ?? shadeColor(baseColor, onDark ? 0.35 : -0.38);
    const outlierColor = model.colors.outlier ?? (model.mono ? whiskerColor : palette.negative);

    const yMinPx = yOf(item.min);
    const yQ1Px = yOf(item.q1);
    const yMedPx = yOf(item.median);
    const yQ3Px = yOf(item.q3);
    const yMaxPx = yOf(item.max);

    // Усы от min до Q1 и от Q3 до max
    svg.line(cx, yMinPx, cx, yQ1Px, {
      stroke: whiskerColor,
      "stroke-width": 1.5,
    });
    svg.line(cx, yQ3Px, cx, yMaxPx, {
      stroke: whiskerColor,
      "stroke-width": 1.5,
    });

    // Горизонтальные засечки на концах усов
    svg.line(cx - capHalfWidth, yMinPx, cx + capHalfWidth, yMinPx, {
      stroke: whiskerColor,
      "stroke-width": 1.5,
    });
    svg.line(cx - capHalfWidth, yMaxPx, cx + capHalfWidth, yMaxPx, {
      stroke: whiskerColor,
      "stroke-width": 1.5,
    });

    // Ящик Q1..Q3
    const boxTop = Math.min(yQ3Px, yQ1Px);
    const boxH = Math.max(2, Math.abs(yQ1Px - yQ3Px));
    svg.rect(cx - boxWidth / 2, boxTop, boxWidth, boxH, {
      fill: baseColor,
      "fill-opacity": BOX_FILL_OPACITY,
      stroke: baseColor,
      "stroke-width": 1.8,
      rx: 3,
      "data-box": String(idx),
    });

    // Линия медианы
    svg.line(cx - boxWidth / 2, yMedPx, cx + boxWidth / 2, yMedPx, {
      stroke: medianColor,
      "stroke-width": 2.4,
    });

    // Маркер среднего (ромб), если задан
    if (item.mean !== undefined) {
      const ym = yOf(item.mean);
      const s = MEAN_MARKER_SIZE;
      const d = `M ${fmt(cx)} ${fmt(ym - s)} L ${fmt(cx + s)} ${fmt(ym)} L ${fmt(cx)} ${fmt(ym + s)} L ${fmt(cx - s)} ${fmt(ym)} Z`;
      svg.path(d, {
        fill: palette.bg,
        stroke: medianColor,
        "stroke-width": 1.5,
      });
    }

    // Точки-выбросы
    for (const outlier of item.outliers) {
      const yo = yOf(outlier);
      svg.circle(cx, yo, OUTLIER_RADIUS, {
        fill: outlierColor,
        "fill-opacity": 0.75,
        stroke: outlierColor,
        "stroke-width": 1,
      });
    }

    // Подпись категории под осью X
    const labelText = truncateLabel(item.label, colWidth - 8, fontSize);
    drawLabelLines(svg, cx, plotBottom + fontSize + 10, labelText, fontSize, {
      "font-size": fontSize,
      fill: palette.fg,
    });
  });

  return svg.toString();
}

export const boxplotEngine: ExtEngine<BoxplotModel> = {
  type: "boxplot",
  aliases: ["boxplot", "box-plot", "box"],
  parse: parseBoxplot,
  render: renderBoxplot,
};
