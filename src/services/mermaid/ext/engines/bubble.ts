import {
  clamp,
  createSvg,
  drawLabelLines,
  hasLabelBreak,
  labelBlockExtra,
  labelLineStep,
  measureLabelWidth,
  measureText,
  monoFlagsFromMode,
  monoGray,
  parseMonoDirective,
  resolvePalette,
  splitLabelLines,
  usesInvertedMono,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";
import { growPlotToAspect, parseAspectDirective, type ChartAspect } from "../chart-aspect";

// --- Модель ---------------------------------------------------------------

export interface BubblePoint {
  label: string;
  x: number;
  y: number;
  size: number;
  group?: string;
}

export interface BubbleModel {
  title?: string;
  x: { label?: string; min: number; max: number };
  y: { label?: string; min: number; max: number };
  sizeLabel?: string;
  quadrants?: [string, string, string, string];
  mid: { x: number; y: number };
  points: BubblePoint[];
  /**
   * Базовый размер шрифта подписей точек (`fontsize <px>`).
   * Не задан — берётся FONT_BASE (11). Влияет на подписи точек и легенду;
   * заголовок, оси и квадранты масштабируются относительно него.
   */
  fontSize?: number;
  /** `mono` — группы отличаются светлотой, а не цветом. */
  mono?: boolean;
  /** `mono invert` — светлая серая шкала для тёмного фона. */
  monoInvert?: boolean;
  /** `ratio 16x9` — поле графика растягивается под пропорции изображения. */
  ratio?: ChartAspect;
}

// --- Разбор ---------------------------------------------------------------

const NUMBER_RE = /^[-+]?\d[\d\s_]*(?:[.,]\d+)?$/;

function parseNumber(raw: string): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!NUMBER_RE.test(trimmed)) return null;
  const cleaned = trimmed.replace(/[\s_]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function unquote(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

/** `"подпись" min --> max` */
function parseAxis(line: string): { label?: string; min: number; max: number } | null {
  const m = /^(.*?)\s*(-?[\d\s_.]+)\s*-->\s*(-?[\d\s_.]+)\s*$/.exec(line);
  if (!m) return null;
  const min = parseNumber(m[2]);
  const max = parseNumber(m[3]);
  if (min === null || max === null) return null;
  const label = unquote(m[1]);
  return { label: label || undefined, min, max };
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => unquote(s))
    .filter((s) => s.length > 0);
}

const POINT_KEYS = new Set(["x", "y", "size", "group"]);

function parsePointLine(
  line: string,
  lineNo: number,
): { point?: BubblePoint; error?: ExtParseError } {
  const colon = line.indexOf(":");
  if (colon < 0) {
    return {
      error: {
        message: `ожидается «подпись : x=…, y=…, size=…», получено «${line}»`,
        line: lineNo,
        col: 0,
      },
    };
  }
  const label = unquote(line.slice(0, colon));
  const rest = line.slice(colon + 1);
  const fields: Record<string, string> = {};
  for (const chunk of rest.split(",")) {
    const piece = chunk.trim();
    if (!piece) continue;
    const eq = piece.indexOf("=");
    if (eq < 0) {
      return {
        error: { message: `ожидается пара «ключ=значение», получено «${piece}»`, line: lineNo, col: 0 },
      };
    }
    const key = piece.slice(0, eq).trim().toLowerCase();
    const value = piece.slice(eq + 1).trim();
    if (!POINT_KEYS.has(key)) {
      return {
        error: {
          message: `неизвестный ключ «${key}» в точке (допустимы x, y, size, group)`,
          line: lineNo,
          col: 0,
        },
      };
    }
    fields[key] = value;
  }

  const x = parseNumber(fields.x ?? "");
  const y = parseNumber(fields.y ?? "");
  const size = parseNumber(fields.size ?? "");
  if (x === null || y === null || size === null) {
    return {
      error: { message: `не удалось разобрать координаты точки «${label}»`, line: lineNo, col: 0 },
    };
  }
  const point: BubblePoint = { label, x, y, size };
  if (fields.group) point.group = unquote(fields.group);
  return { point };
}

export function parseBubble(source: string): ExtParseResult<BubbleModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let xAxis: BubbleModel["x"] | null = null;
  let yAxis: BubbleModel["y"] | null = null;
  let sizeLabel: string | undefined;
  let quadrants: [string, string, string, string] | undefined;
  let midRaw: { x?: number; y?: number } | null = null;
  let fontSize: number | undefined;
  let mono = false;
  let monoInvert = false;
  let ratio: ChartAspect | undefined;
  const points: BubblePoint[] = [];

  let inData = false;
  let seenType = false;
  let dataLine = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;

    if (!seenType) {
      seenType = true;
      continue;
    }

    if (inData) {
      if (/^end$/i.test(raw)) {
        inData = false;
        continue;
      }
      const { point, error } = parsePointLine(raw, lineNo);
      if (error) errors.push(error);
      else if (point) points.push(point);
      continue;
    }

    if (/^title\b/i.test(raw)) {
      title = unquote(raw.replace(/^title\s*/i, "")) || undefined;
      continue;
    }
    if (/^x\b/i.test(raw)) {
      const parsed = parseAxis(raw.slice(1).trim());
      if (!parsed) {
        errors.push({ message: `ожидается «x "<подпись>" <min> --> <max>»`, line: lineNo, col: 0 });
        continue;
      }
      xAxis = parsed;
      continue;
    }
    if (/^y\b/i.test(raw)) {
      const parsed = parseAxis(raw.slice(1).trim());
      if (!parsed) {
        errors.push({ message: `ожидается «y "<подпись>" <min> --> <max>»`, line: lineNo, col: 0 });
        continue;
      }
      yAxis = parsed;
      continue;
    }
    if (/^size\b/i.test(raw)) {
      sizeLabel = unquote(raw.replace(/^size\s*/i, "")) || undefined;
      continue;
    }
    if (/^quadrants\b/i.test(raw)) {
      const list = splitList(raw.replace(/^quadrants\s*/i, ""));
      if (list.length !== 4) {
        errors.push({
          message: `ожидается 4 подписи квадрантов через запятую, получено ${list.length}`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      quadrants = [list[0], list[1], list[2], list[3]];
      continue;
    }
    if (/^mid\b/i.test(raw)) {
      const rest = raw.replace(/^mid\s*/i, "");
      const found: { x?: number; y?: number } = {};
      for (const m of rest.matchAll(/([xy])\s*=\s*(-?[\d.,]+)/gi)) {
        const n = parseNumber(m[2]);
        if (n !== null) found[m[1].toLowerCase() as "x" | "y"] = n;
      }
      if (found.x === undefined && found.y === undefined) {
        errors.push({ message: `ожидается «mid x=<число> y=<число>»`, line: lineNo, col: 0 });
        continue;
      }
      midRaw = found;
      continue;
    }
    if (/^mono\b/i.test(raw)) {
      const parsed = parseMonoDirective(raw.replace(/^mono\s*/i, ""));
      if ("error" in parsed) {
        errors.push({ message: parsed.error, line: lineNo, col: 0 });
      } else {
        const flags = monoFlagsFromMode(parsed.mode);
        mono = flags.mono;
        monoInvert = flags.monoInvert;
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
      const parsed = parseNumber(raw.replace(/^fontsize\s*/i, ""));
      if (parsed === null || !(parsed > 0)) {
        errors.push({
          message: `ожидается «fontsize <положительное число>», получено «${raw.replace(/^fontsize\s*/i, "").trim()}»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      fontSize = parsed;
      continue;
    }
    if (/^data$/i.test(raw)) {
      inData = true;
      dataLine = lineNo;
      continue;
    }

    errors.push({
      message: `неизвестная директива «${raw.split(/\s+/)[0]}» (допустимы title, x, y, size, quadrants, mid, fontsize, mono, ratio, data)`,
      line: lineNo,
      col: 0,
    });
  }

  if (!xAxis) {
    errors.push({ message: `не задана ось «x» (строка «x "подпись" min --> max»)`, line: 1, col: 0 });
  }
  if (!yAxis) {
    errors.push({ message: `не задана ось «y» (строка «y "подпись" min --> max»)`, line: 1, col: 0 });
  }
  if (!dataLine) {
    errors.push({ message: `нет блока «data» — ожидается строка «data» и точки под ней (блок «data» не найден)`, line: 1, col: 0 });
  } else if (points.length === 0 && errors.length === 0) {
    errors.push({ message: `блок «data» пуст: нужна хотя бы одна точка`, line: dataLine, col: 0 });
  }

  if (errors.length || !xAxis || !yAxis) return { ok: false, errors };

  const mid = {
    x: midRaw?.x ?? (xAxis.min + xAxis.max) / 2,
    y: midRaw?.y ?? (yAxis.min + yAxis.max) / 2,
  };

  return {
    ok: true,
    errors: [],
    value: { title, x: xAxis, y: yAxis, sizeLabel, quadrants, mid, points, fontSize, mono, monoInvert, ratio },
  };
}

// --- Рендер ---------------------------------------------------------------

const PADDING = { top: 44, right: 28, bottom: 56, left: 72 };
const PLOT_WIDTH = 460;
const PLOT_HEIGHT = 320;
const MIN_R = 6;
const MAX_R = 40;
/** Базовый размер шрифта подписей точек, если `fontsize` не задан. */
const FONT_BASE = 11;
const FONT_MIN = 6;
const FONT_MAX = 28;
/** Доля радиуса, внутри которой подпись ещё считается «внутри пузырька». */
const LABEL_INSIDE_RATIO = 0.86;
/** Зазор между нижней кромкой пузырька и подписью снаружи, px. */
const LABEL_BELOW_GAP = 4;
/** Базовая линия первой внешней строки, доля font-size (верх глифа ≈ край + зазор). */
const LABEL_BELOW_BASELINE_RATIO = 0.8;
/** Смещение базовой линии строки относительно её оптического центра, доля font-size. */
const LABEL_BASELINE_RATIO = 0.35;
/** Насколько подпись свисает ниже базовой линии, доля font-size. */
const LABEL_DESCENT_RATIO = 0.25;
/** Ширина строки подписи под пузырьком: радиусы и пределы в px. */
const LABEL_BELOW_WIDTH_RATIO = 3.2;
const LABEL_BELOW_MIN_WIDTH = 72;
const LABEL_BELOW_MAX_WIDTH = 168;
/** Поле от края холста, чтобы внешняя подпись не обрезалась. */
const LABEL_CANVAS_MARGIN = 4;

const GROUP_COLORS = ["#0969da", "#8250df", "#bf8700", "#1a7f37", "#cf222e", "#6e7781"];
const GROUP_COLORS_DARK = ["#58a6ff", "#a371f7", "#d29922", "#3fb950", "#f85149", "#8b949e"];

/**
 * Самое длинное слово подписи. Ширина строки под пузырьком
 * не уже этого слова, чтобы не резать его по буквам.
 */
function longestWord(text: string): string {
  let best = "";
  const chunks = hasLabelBreak(text) ? splitLabelLines(text) : [String(text ?? "")];
  for (const chunk of chunks) {
    for (const word of chunk.split(/\s+/)) {
      if (measureText(word, 1) > measureText(best, 1)) best = word;
    }
  }
  return best;
}

/**
 * Разбивает подпись на строки по словам так, чтобы каждая строка влезала
 * в `maxWidth`. Слишком длинное слово режется по символам. Подпись не
 * теряется: выводится целиком, просто в несколько строк.
 */
function wrapSegment(src: string, maxWidth: number, fontSize: number): string[] {
  if (measureText(src, fontSize) <= maxWidth) return [src];

  const lines: string[] = [];
  let current = "";
  const pushCurrent = (): void => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of src.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    pushCurrent();
    // Слово само по себе шире строки — режем по символам.
    if (measureText(word, fontSize) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        if (measureText(chunk + ch, fontSize) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      current = chunk;
    } else {
      current = word;
    }
  }
  pushCurrent();
  return lines;
}

/** Сначала явный `\n`, затем перенос по словам внутри каждой строки. */
function wrapLabel(text: string, maxWidth: number, fontSize: number): string[] {
  const src = String(text ?? "").trim();
  if (!src) return [];
  if (!hasLabelBreak(src)) return wrapSegment(src, maxWidth, fontSize);
  const lines: string[] = [];
  for (const segment of splitLabelLines(src)) {
    if (!segment) continue;
    lines.push(...wrapSegment(segment, maxWidth, fontSize));
  }
  return lines;
}

function normalizedLabel(text: string): string {
  const src = hasLabelBreak(text) ? splitLabelLines(text).join(" ") : String(text ?? "").trim();
  return src.replace(/\s+/g, " ").trim();
}

/** Строки собраны из целых слов исходной подписи, без разрезания по буквам. */
function keepsWholeWords(label: string, lines: string[]): boolean {
  return lines.length > 0 && lines.join(" ") === normalizedLabel(label);
}

function labelStep(fontSize: number): number {
  return Math.round(fontSize * 1.15);
}

/** Прямоугольник строк вписан в круг радиуса `innerRadius`. */
function blockFitsCircle(
  lines: string[],
  fontSize: number,
  step: number,
  innerRadius: number,
): boolean {
  const width = Math.max(...lines.map((line) => measureText(line, fontSize)));
  const height = lines.length * step;
  const halfW = width / 2;
  const halfH = height / 2;
  return halfW * halfW + halfH * halfH <= innerRadius * innerRadius;
}

/**
 * Подпись внутри пузырька: перенос по словам так, чтобы блок влез в круг.
 * Если целое слово не помещается — null, подпись уйдёт под пузырёк.
 */
function linesInsideBubble(label: string, fontSize: number, radius: number): string[] | null {
  const step = labelStep(fontSize);
  const innerR = radius * LABEL_INSIDE_RATIO;
  if (step / 2 >= innerR) return null;
  const maxLines = Math.max(1, Math.floor((innerR * 2) / step));
  for (let lineCount = 1; lineCount <= maxLines; lineCount += 1) {
    const halfH = (lineCount * step) / 2;
    if (halfH >= innerR) break;
    const maxWidth = 2 * Math.sqrt(innerR * innerR - halfH * halfH);
    const lines = wrapLabel(label, maxWidth, fontSize);
    if (
      lines.length <= lineCount &&
      keepsWholeWords(label, lines) &&
      blockFitsCircle(lines, fontSize, step, innerR)
    ) {
      return lines;
    }
  }
  return null;
}

interface PointLabelLayout {
  lines: string[];
  fontSize: number;
  inside: boolean;
  startY: number;
  step: number;
}

function layoutPointLabel(
  label: string,
  cy: number,
  radius: number,
  fontSize: number,
): PointLabelLayout {
  const step = labelStep(fontSize);
  const insideLines = linesInsideBubble(label, fontSize, radius);
  if (insideLines) {
    const startY = cy - ((insideLines.length - 1) * step) / 2 + fontSize * LABEL_BASELINE_RATIO;
    return { lines: insideLines, fontSize, inside: true, startY, step };
  }
  const belowWidth = Math.max(
    clamp(radius * LABEL_BELOW_WIDTH_RATIO, LABEL_BELOW_MIN_WIDTH, LABEL_BELOW_MAX_WIDTH),
    measureText(longestWord(label), fontSize),
  );
  const lines = wrapLabel(label, belowWidth, fontSize);
  const startY = cy + radius + LABEL_BELOW_GAP + fontSize * LABEL_BELOW_BASELINE_RATIO;
  return { lines, fontSize, inside: false, startY, step };
}

function labelBottom(layout: PointLabelLayout): number {
  if (layout.lines.length === 0) return 0;
  const lastBaseline = layout.startY + (layout.lines.length - 1) * layout.step;
  return lastBaseline + layout.fontSize * LABEL_DESCENT_RATIO;
}

/** Внешняя подпись остаётся на холсте: якорь сдвигается, если строка шире поля. */
function clampLabelX(
  cx: number,
  lines: string[],
  fontSize: number,
  canvasWidth: number,
): number {
  const half = Math.max(0, ...lines.map((line) => measureText(line, fontSize))) / 2;
  if (half * 2 + LABEL_CANVAS_MARGIN * 2 >= canvasWidth) return canvasWidth / 2;
  return clamp(cx, half + LABEL_CANVAS_MARGIN, canvasWidth - half - LABEL_CANVAS_MARGIN);
}

export function renderBubble(model: BubbleModel, options: ExtRenderOptions): string {
  const themeDark = Boolean(options.dark) || usesInvertedMono(model.mono, model.monoInvert, false);
  const palette = resolvePalette(themeDark, options.background, options.textColor);
  const groupColors = themeDark ? GROUP_COLORS_DARK : GROUP_COLORS;
  const invertedMono = usesInvertedMono(model.mono, model.monoInvert, options.dark);

  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  // Заголовок и оси масштабируются вместе с подписями, но не 1:1 —
  // иначе при fontsize 24 заголовок съедает всю шапку.
  const titleSize = clamp(Math.round(fontSize * 1.36), 15, 26);
  const axisSize = clamp(Math.round(fontSize * 1.09), 12, 20);
  const quadrantSize = clamp(Math.round(fontSize), 11, 18);
  const lineHeight = Math.round(fontSize * 1.15);
  const titleExtra = labelBlockExtra(model.title, titleSize);
  const yAxisExtra = labelBlockExtra(model.y.label, axisSize);
  const xAxisExtra = labelBlockExtra(model.x.label, axisSize);

  // --- Раскладка легенды (до создания SVG: от неё зависит высота) ---------
  const groups: string[] = [];
  for (const p of model.points) {
    if (p.group && !groups.includes(p.group)) groups.push(p.group);
  }
  const swatch = Math.max(10, fontSize * 0.9);
  const legendRowHeight = Math.max(lineHeight, swatch) + 6;
  const legendItems: { text: string; group?: string }[] = [];
  if (model.sizeLabel) legendItems.push({ text: `размер: ${model.sizeLabel}` });
  for (const group of groups) legendItems.push({ text: group, group });

  const plotLeft = PADDING.left + yAxisExtra;
  const plotTop = PADDING.top + titleExtra;
  let plotWidth = PLOT_WIDTH;
  let plotHeight = PLOT_HEIGHT;

  const layoutLegend = (maxWidth: number) => {
    const rows: { text: string; group?: string; x: number }[][] = [];
    let row: { text: string; group?: string; x: number }[] = [];
    let x = 0;
    for (const item of legendItems) {
      const itemWidth = measureLabelWidth(item.text, fontSize) + (item.group ? swatch + 6 : 0);
      if (row.length > 0 && x + itemWidth > maxWidth) {
        rows.push(row);
        row = [];
        x = 0;
      }
      row.push({ ...item, x });
      x += itemWidth + 16;
    }
    if (row.length > 0) rows.push(row);
    return rows;
  };

  let legendRows = layoutLegend(plotWidth);
  const legendBlockHeight = (rows: typeof legendRows): number =>
    rows
      .map((row) => {
        const lines = Math.max(
          1,
          ...row.map((item) => (hasLabelBreak(item.text) ? splitLabelLines(item.text).length : 1)),
        );
        if (lines <= 1) return legendRowHeight;
        return Math.max(legendRowHeight, lines * labelLineStep(fontSize) + 6);
      })
      .reduce((sum, rowHeight) => sum + rowHeight, 0);

  if (model.ratio) {
    const legendExtra = Math.max(0, legendBlockHeight(legendRows) - legendRowHeight);
    const grown = growPlotToAspect(
      {
        plotWidth,
        plotHeight,
        totalWidth: plotLeft + plotWidth + PADDING.right,
        totalHeight: plotTop + plotHeight + PADDING.bottom + legendExtra + xAxisExtra,
      },
      model.ratio,
    );
    plotWidth = grown.plotWidth;
    plotHeight = grown.plotHeight;
    legendRows = layoutLegend(plotWidth);
  }

  const legendRowHeights = legendRows.map((row) => {
    const lines = Math.max(1, ...row.map((item) => (hasLabelBreak(item.text) ? splitLabelLines(item.text).length : 1)));
    if (lines <= 1) return legendRowHeight;
    return Math.max(legendRowHeight, lines * labelLineStep(fontSize) + 6);
  });
  const legendHeight = legendRowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0);

  const plotBottom = plotTop + plotHeight;
  const plotRight = plotLeft + plotWidth;

  const { x: xAxis, y: yAxis } = model;
  const xSpan = xAxis.max - xAxis.min || 1;
  const ySpan = yAxis.max - yAxis.min || 1;
  const px = (v: number): number => plotLeft + clamp((v - xAxis.min) / xSpan, 0, 1) * plotWidth;
  const py = (v: number): number => plotBottom - clamp((v - yAxis.min) / ySpan, 0, 1) * plotHeight;

  // Радиусы: площадь ∝ size
  const sizes = model.points.map((p) => Math.abs(p.size));
  const maxSize = sizes.length ? Math.max(...sizes) : 0;
  const minSize = sizes.length ? Math.min(...sizes) : 0;
  const radiusOf = (size: number): number => {
    const s = Math.abs(size);
    if (maxSize <= 0) return MIN_R;
    if (maxSize === minSize) return (MIN_R + MAX_R) / 2;
    const t = Math.sqrt(clamp((s - minSize) / (maxSize - minSize), 0, 1));
    return MIN_R + t * (MAX_R - MIN_R);
  };

  // Точки: сначала крупные, чтобы мелкие были сверху.
  // Подпись, которая не влезает в круг, считается заранее: от неё зависит высота холста.
  const ordered = [...model.points].sort((a, b) => Math.abs(b.size) - Math.abs(a.size));
  const placed = ordered.map((point) => {
    const cx = px(point.x);
    const cy = py(point.y);
    const r = radiusOf(point.size);
    const labelLayout = point.label
      ? layoutPointLabel(point.label, cy, r, fontSize)
      : null;
    return { point, cx, cy, r, labelLayout };
  });

  let labelOverflow = 0;
  for (const item of placed) {
    if (!item.labelLayout || item.labelLayout.inside) continue;
    labelOverflow = Math.max(labelOverflow, labelBottom(item.labelLayout) - plotBottom);
  }

  const width = plotLeft + plotWidth + PADDING.right;
  const height =
    plotTop +
    plotHeight +
    PADDING.bottom +
    Math.max(0, legendHeight - legendRowHeight) +
    labelOverflow +
    xAxisExtra;
  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
  });

  if (model.title) {
    drawLabelLines(svg, width / 2, 24, model.title, titleSize, {
      "font-size": titleSize,
      "font-weight": 600,
      fill: palette.fg,
    });
  }

  // Рамка области
  svg.rect(plotLeft, plotTop, plotWidth, plotHeight, {
    fill: "none",
    stroke: palette.axis,
    "stroke-width": 1,
  });

  // Линии раздела квадрантов
  const midX = px(model.mid.x);
  const midY = py(model.mid.y);
  svg.line(midX, plotTop, midX, plotBottom, { stroke: palette.grid, "stroke-width": 1 });
  svg.line(plotLeft, midY, plotRight, midY, { stroke: palette.grid, "stroke-width": 1 });

  // Подписи квадрантов: лево-верх, право-верх, лево-низ, право-низ.
  // Подпись выводится целиком (перенос по словам), а не обрезается.
  if (model.quadrants) {
    const [q1, q2, q3, q4] = model.quadrants;
    const inset = 8;
    const fs = quadrantSize;
    const leftWidth = Math.max(40, midX - plotLeft - inset * 2);
    const rightWidth = Math.max(40, plotRight - midX - inset * 2);

    const drawQuadrant = (
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      anchor: "start" | "end",
      fromBottom: boolean,
    ): void => {
      const lines = wrapLabel(text, maxWidth, fs);
      lines.forEach((line, idx) => {
        const offset = fromBottom
          ? -(lines.length - 1 - idx) * lineHeight
          : idx * lineHeight;
        svg.text(x, y + offset, line, {
          "text-anchor": anchor,
          "font-size": fs,
          fill: palette.fgDim,
        });
      });
    };

    drawQuadrant(q1, plotLeft + inset, plotTop + inset + fs, leftWidth, "start", false);
    drawQuadrant(q2, plotRight - inset, plotTop + inset + fs, rightWidth, "end", false);
    drawQuadrant(q3, plotLeft + inset, plotBottom - inset, leftWidth, "start", true);
    drawQuadrant(q4, plotRight - inset, plotBottom - inset, rightWidth, "end", true);
  }

  // Подписи осей. Если подпись точки ушла под пузырёк и ниже области,
  // ось и легенда сдвигаются вниз, чтобы не накрыть её.
  if (xAxis.label) {
    drawLabelLines(
      svg,
      (plotLeft + plotRight) / 2,
      plotBottom + 34 + labelOverflow,
      xAxis.label,
      axisSize,
      {
        "font-size": axisSize,
        fill: palette.fgDim,
      },
    );
  }
  if (yAxis.label) {
    const cx = 18 + yAxisExtra;
    const cy = plotTop + plotHeight / 2;
    drawLabelLines(svg, cx, cy, yAxis.label, axisSize, {
      "text-anchor": "middle",
      "font-size": axisSize,
      fill: palette.fgDim,
      transform: `rotate(-90 ${cx} ${cy})`,
    }, "up");
  }

  // Группы → цвета (список groups собран выше, при раскладке легенды)
  const colorOf = (group?: string): string => {
    if (model.mono) {
      const idx = group ? Math.max(0, groups.indexOf(group)) : 0;
      return monoGray(idx, Math.max(groups.length, 1), invertedMono);
    }
    if (!group) return palette.neutral;
    const idx = groups.indexOf(group);
    return groupColors[idx % groupColors.length];
  };

  for (const item of placed) {
    const { point, cx, cy, r, labelLayout } = item;
    svg.circle(cx, cy, r, {
      fill: colorOf(point.group),
      "fill-opacity": 0.55,
      stroke: colorOf(point.group),
      "stroke-width": 1.5,
    });
    if (!labelLayout || labelLayout.lines.length === 0) continue;
    // Внутри круга — по центру. Не влезла целиком — под пузырьком, без «…».
    const x = labelLayout.inside
      ? cx
      : clampLabelX(cx, labelLayout.lines, labelLayout.fontSize, width);
    labelLayout.lines.forEach((line, idx) => {
      svg.text(x, labelLayout.startY + idx * labelLayout.step, line, {
        "font-size": labelLayout.fontSize,
        fill: palette.fg,
        "font-weight": 600,
      });
    });
  }

  // Легенда групп + подпись размера: строки переносятся по ширине графика.
  const legendTop = plotBottom + 50 + labelOverflow + xAxisExtra;
  let legendBaseline = legendTop;
  legendRows.forEach((row, rowIdx) => {
    const y = legendBaseline;
    for (const item of row) {
      const x = plotLeft + item.x;
      if (item.group) {
        svg.circle(x + swatch / 2, y - 4, swatch / 2, {
          fill: colorOf(item.group),
          "fill-opacity": 0.7,
          stroke: colorOf(item.group),
        });
        drawLabelLines(svg, x + swatch + 6, y, item.text, fontSize, {
          "text-anchor": "start",
          "font-size": fontSize,
          fill: palette.fgDim,
        });
      } else {
        drawLabelLines(svg, x, y, item.text, fontSize, {
          "text-anchor": "start",
          "font-size": fontSize,
          fill: palette.fgDim,
        });
      }
    }
    legendBaseline += legendRowHeights[rowIdx] ?? legendRowHeight;
  });

  return svg.toString();
}

export const bubbleEngine: ExtEngine<BubbleModel> = {
  type: "bubble",
  aliases: ["bubble", "bubblechart"],
  parse: parseBubble,
  render: renderBubble,
};
