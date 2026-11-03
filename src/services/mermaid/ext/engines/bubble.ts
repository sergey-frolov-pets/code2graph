import { clamp, createSvg, fmt, getPalette, measureText, truncate } from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

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
    if (/^data$/i.test(raw)) {
      inData = true;
      dataLine = lineNo;
      continue;
    }

    errors.push({
      message: `неизвестная директива «${raw.split(/\s+/)[0]}» (допустимы title, x, y, size, quadrants, mid, data)`,
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
    value: { title, x: xAxis, y: yAxis, sizeLabel, quadrants, mid, points },
  };
}

// --- Рендер ---------------------------------------------------------------

const PADDING = { top: 44, right: 28, bottom: 56, left: 72 };
const PLOT_WIDTH = 460;
const PLOT_HEIGHT = 320;
const MIN_R = 6;
const MAX_R = 40;

const GROUP_COLORS = ["#0969da", "#8250df", "#bf8700", "#1a7f37", "#cf222e", "#6e7781"];
const GROUP_COLORS_DARK = ["#58a6ff", "#a371f7", "#d29922", "#3fb950", "#f85149", "#8b949e"];

export function renderBubble(model: BubbleModel, options: ExtRenderOptions): string {
  const palette = getPalette(options.dark);
  const groupColors = options.dark ? GROUP_COLORS_DARK : GROUP_COLORS;

  const width = PADDING.left + PLOT_WIDTH + PADDING.right;
  const height = PADDING.top + PLOT_HEIGHT + PADDING.bottom;
  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
  });

  const plotLeft = PADDING.left;
  const plotTop = PADDING.top;
  const plotBottom = plotTop + PLOT_HEIGHT;
  const plotRight = plotLeft + PLOT_WIDTH;

  const { x: xAxis, y: yAxis } = model;
  const xSpan = xAxis.max - xAxis.min || 1;
  const ySpan = yAxis.max - yAxis.min || 1;
  const px = (v: number): number => plotLeft + clamp((v - xAxis.min) / xSpan, 0, 1) * PLOT_WIDTH;
  const py = (v: number): number => plotBottom - clamp((v - yAxis.min) / ySpan, 0, 1) * PLOT_HEIGHT;

  if (model.title) {
    svg.text(width / 2, 24, model.title, { "font-size": 15, "font-weight": 600, fill: palette.fg });
  }

  // Рамка области
  svg.rect(plotLeft, plotTop, PLOT_WIDTH, PLOT_HEIGHT, {
    fill: "none",
    stroke: palette.axis,
    "stroke-width": 1,
  });

  // Линии раздела квадрантов
  const midX = px(model.mid.x);
  const midY = py(model.mid.y);
  svg.line(midX, plotTop, midX, plotBottom, { stroke: palette.grid, "stroke-width": 1 });
  svg.line(plotLeft, midY, plotRight, midY, { stroke: palette.grid, "stroke-width": 1 });

  // Подписи квадрантов: лево-верх, право-верх, лево-низ, право-низ
  if (model.quadrants) {
    const [q1, q2, q3, q4] = model.quadrants;
    const inset = 8;
    const fs = 11;
    svg.text(plotLeft + inset, plotTop + inset + fs, truncate(q1, midX - plotLeft - inset * 2, fs), {
      "text-anchor": "start",
      "font-size": fs,
      fill: palette.fgDim,
    });
    svg.text(
      plotRight - inset,
      plotTop + inset + fs,
      truncate(q2, plotRight - midX - inset * 2, fs),
      { "text-anchor": "end", "font-size": fs, fill: palette.fgDim },
    );
    svg.text(
      plotLeft + inset,
      plotBottom - inset,
      truncate(q3, midX - plotLeft - inset * 2, fs),
      { "text-anchor": "start", "font-size": fs, fill: palette.fgDim },
    );
    svg.text(
      plotRight - inset,
      plotBottom - inset,
      truncate(q4, plotRight - midX - inset * 2, fs),
      { "text-anchor": "end", "font-size": fs, fill: palette.fgDim },
    );
  }

  // Подписи осей
  if (xAxis.label) {
    svg.text((plotLeft + plotRight) / 2, plotBottom + 34, xAxis.label, {
      "font-size": 12,
      fill: palette.fgDim,
    });
  }
  if (yAxis.label) {
    const cx = 18;
    const cy = plotTop + PLOT_HEIGHT / 2;
    svg.text(cx, cy, yAxis.label, {
      "text-anchor": "middle",
      "font-size": 12,
      fill: palette.fgDim,
      transform: `rotate(-90 ${cx} ${cy})`,
    });
  }

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

  // Группы → цвета
  const groups: string[] = [];
  for (const p of model.points) {
    if (p.group && !groups.includes(p.group)) groups.push(p.group);
  }
  const colorOf = (group?: string): string => {
    if (!group) return palette.neutral;
    const idx = groups.indexOf(group);
    return groupColors[idx % groupColors.length];
  };

  // Точки: сначала крупные, чтобы мелкие были сверху
  const ordered = [...model.points].sort((a, b) => Math.abs(b.size) - Math.abs(a.size));
  for (const point of ordered) {
    const cx = px(point.x);
    const cy = py(point.y);
    const r = radiusOf(point.size);
    svg.circle(cx, cy, r, {
      fill: colorOf(point.group),
      "fill-opacity": 0.55,
      stroke: colorOf(point.group),
      "stroke-width": 1.5,
    });
    const label = truncate(point.label, Math.max(40, r * 2.4), 11);
    svg.text(cx, cy + 4, label, { "font-size": 11, fill: palette.fg, "font-weight": 600 });
  }

  // Легенда групп + подпись размера
  let legendX = plotLeft;
  const legendY = plotBottom + 50;
  if (model.sizeLabel) {
    const text = `размер: ${model.sizeLabel}`;
    svg.text(plotLeft, legendY, text, {
      "text-anchor": "start",
      "font-size": 11,
      fill: palette.fgDim,
    });
    legendX += measureText(text, 11) + 20;
  }
  for (const group of groups) {
    const swatch = 10;
    svg.circle(legendX + swatch / 2, legendY - 4, swatch / 2, {
      fill: colorOf(group),
      "fill-opacity": 0.7,
      stroke: colorOf(group),
    });
    svg.text(legendX + swatch + 6, legendY, group, {
      "text-anchor": "start",
      "font-size": 11,
      fill: palette.fgDim,
    });
    legendX += swatch + 12 + measureText(group, 11) + 16;
  }

  return svg.toString();
}

export const bubbleEngine: ExtEngine<BubbleModel> = {
  type: "bubble",
  aliases: ["bubble", "bubblechart"],
  parse: parseBubble,
  render: renderBubble,
};
