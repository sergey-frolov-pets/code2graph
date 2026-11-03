import {
  clamp,
  createSvg,
  fmt,
  getPalette,
  measureText,
  niceRange,
  niceTicks,
  truncate,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

// --- Модель ---------------------------------------------------------------

export type StepKind = "absolute" | "delta";

export interface WaterfallStep {
  kind: StepKind;
  /** Для absolute — само значение; для delta — знак уже учтён в value. */
  value: number;
  label: string;
}

export interface WaterfallSeries {
  name?: string;
  steps: WaterfallStep[];
}

export interface WaterfallAxis {
  label?: string;
  min: number;
  max: number;
  /** true — границы посчитаны по данным, а не заданы в `y "..." min --> max`. */
  auto: boolean;
}

export interface WaterfallModel {
  title?: string;
  axis: WaterfallAxis;
  series: WaterfallSeries[];
  /** Подписи колонок — берутся из первой группы. */
  labels: string[];
}

// --- Разбор ---------------------------------------------------------------

const NUMBER_RE = /^[-+]?\d[\d\s_]*(?:[.,]\d+)?$/;

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!NUMBER_RE.test(trimmed)) return null;
  const cleaned = trimmed.replace(/[\s_]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Подпись в кавычках + два числа вокруг `-->`. */
function parseAxis(line: string): { label?: string; min: number; max: number } | null {
  const m = /^(.*?)\s*(-?[\d\s_.]+)\s*-->\s*(-?[\d\s_.]+)\s*$/.exec(line);
  if (!m) return null;
  const min = parseNumber(m[2]);
  const max = parseNumber(m[3]);
  if (min === null || max === null) return null;
  let label = m[1].trim();
  if (label.startsWith('"') && label.endsWith('"') && label.length >= 2) {
    label = label.slice(1, -1).replace(/\\"/g, '"');
  }
  return { label: label || undefined, min, max };
}

function parseStep(text: string, line: number): { step?: WaterfallStep; error?: ExtParseError } {
  const sign = text[0];
  if (sign !== "=" && sign !== "+" && sign !== "-") {
    return {
      error: {
        message: `ожидается формат «<знак><число> : подпись», получено «${text}»`,
        line,
        col: 0,
      },
    };
  }
  const colon = text.indexOf(":");
  if (colon < 0) {
    return {
      error: { message: `ожидается формат «<знак><число> : подпись»`, line, col: 0 },
    };
  }
  const rawNumber = text.slice(1, colon).trim();
  const label = text.slice(colon + 1).trim();
  const value = parseNumber(rawNumber);
  if (value === null) {
    return {
      error: { message: `не удалось разобрать число: «${rawNumber}»`, line, col: 1 },
    };
  }
  const kind: StepKind = sign === "=" ? "absolute" : "delta";
  const signed = sign === "-" ? -Math.abs(value) : value;
  return { step: { kind, value: kind === "absolute" ? value : signed, label } };
}

export function parseWaterfall(source: string): ExtParseResult<WaterfallModel> {
  const errors: ExtParseError[] = [];
  const series: WaterfallSeries[] = [];
  let current: WaterfallSeries | null = null;
  let title: string | undefined;
  let axis: WaterfallAxis | null = null;

  const lines = source.split(/\r?\n/);
  let seenType = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;

    if (!seenType) {
      seenType = true;
      continue; // первая значимая строка — ключевое слово типа
    }

    if (/^title\b/i.test(raw)) {
      title = raw.replace(/^title\s*/i, "").trim() || undefined;
      continue;
    }

    if (/^y\b/i.test(raw)) {
      const parsed = parseAxis(raw.slice(1).trim());
      if (!parsed) {
        errors.push({
          message: `ожидается «y "<подпись>" <min> --> <max>»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      axis = { label: parsed.label, min: parsed.min, max: parsed.max, auto: false };
      continue;
    }

    if (/^series\b/i.test(raw)) {
      if (current && current.steps.length === 0) {
        errors.push({
          message: `группа «${current.name ?? ""}» не содержит данных`,
          line: lineNo,
          col: 0,
        });
      }
      current = { name: raw.replace(/^series\s*/i, "").trim() || undefined, steps: [] };
      series.push(current);
      continue;
    }

    if (!current) {
      current = { steps: [] };
      series.push(current);
    }
    const { step, error } = parseStep(raw, lineNo);
    if (error) {
      errors.push(error);
      continue;
    }
    if (step) current.steps.push(step);
  }

  if (current && current.steps.length === 0 && series.length > 1) {
    errors.push({
      message: `группа «${current.name ?? ""}» не содержит данных`,
      line: lines.length,
      col: 0,
    });
  }

  const totalSteps = series.reduce((acc, s) => acc + s.steps.length, 0);
  if (totalSteps === 0) {
    errors.push({
      message: `нет данных: ожидается хотя бы одна строка «=N : подпись»`,
      line: 1,
      col: 0,
    });
    return { ok: false, errors };
  }

  const first = series[0].steps[0];
  if (first && first.kind !== "absolute") {
    errors.push({
      message: `первая колонка должна быть абсолютной (=N)`,
      line: findFirstDataLine(lines),
      col: 0,
    });
  }

  if (errors.length) return { ok: false, errors };

  const labels = series[0].steps.map((s) => s.label);

  if (!axis) {
    const extent = computeExtent(series);
    const rounded = niceRange(extent.min, extent.max, 4);
    axis = { min: rounded.min, max: rounded.max, auto: true };
  }

  return { ok: true, errors: [], value: { title, axis, series, labels } };
}

function findFirstDataLine(lines: string[]): number {
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (!t || t.startsWith("%%")) continue;
    if (/^[=+-]/.test(t)) return i + 1;
  }
  return 1;
}

/** min/max по всем накопленным значениям всех групп. */
function computeExtent(series: WaterfallSeries[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const group of series) {
    let running = 0;
    for (const step of group.steps) {
      if (step.kind === "absolute") {
        running = step.value;
        min = Math.min(min, running);
        max = Math.max(max, running);
      } else {
        const next = running + step.value;
        min = Math.min(min, running, next);
        max = Math.max(max, running, next);
        running = next;
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

// --- Рендер ---------------------------------------------------------------

const PADDING = { top: 44, right: 24, bottom: 52, left: 64 };
const BAR_GAP = 0.22;
const MIN_BAR_WIDTH = 8;
const MAX_BAR_WIDTH = 64;
const PLOT_HEIGHT = 260;

export function renderWaterfall(model: WaterfallModel, options: ExtRenderOptions): string {
  const palette = getPalette(options.dark);
  const { axis, series, labels, title } = model;

  const groups = Math.max(1, series.length);
  const columns = Math.max(1, labels.length);
  const labelFontSize = 11;

  const longestLabel = labels.reduce((acc, l) => Math.max(acc, measureText(l, labelFontSize)), 0);
  const columnWidth = clamp(longestLabel + 28, 56, 140);
  const plotWidth = columnWidth * columns;

  const width = PADDING.left + plotWidth + PADDING.right;
  const height = PADDING.top + PLOT_HEIGHT + PADDING.bottom;

  const svg = createSvg({ width, height, palette, title, debugFrames: options.debugFrames });

  const plotLeft = PADDING.left;
  const plotTop = PADDING.top;
  const plotBottom = plotTop + PLOT_HEIGHT;

  const yOf = (value: number): number => {
    const span = axis.max - axis.min || 1;
    return plotBottom - ((value - axis.min) / span) * PLOT_HEIGHT;
  };

  if (title) {
    svg.text(width / 2, 24, title, { "font-size": 15, "font-weight": 600, fill: palette.fg });
  }

  for (const tick of niceTicks(axis.min, axis.max, 5)) {
    const y = yOf(tick);
    svg.line(plotLeft, y, plotLeft + plotWidth, y, { stroke: palette.grid, "stroke-width": 1 });
    svg.text(plotLeft - 8, y + 4, fmt(tick), {
      "text-anchor": "end",
      "font-size": labelFontSize,
      fill: palette.fgDim,
    });
  }

  if (axis.label) {
    const cx = 16;
    const cy = plotTop + PLOT_HEIGHT / 2;
    svg.text(cx, cy, axis.label, {
      "text-anchor": "middle",
      "font-size": labelFontSize,
      fill: palette.fgDim,
      transform: `rotate(-90 ${cx} ${cy})`,
    });
  }

  svg.line(plotLeft, plotBottom, plotLeft + plotWidth, plotBottom, {
    stroke: palette.axis,
    "stroke-width": 1,
  });

  const barWidth = clamp((columnWidth * (1 - BAR_GAP)) / groups, MIN_BAR_WIDTH, MAX_BAR_WIDTH);

  for (let col = 0; col < columns; col += 1) {
    const columnLeft = plotLeft + col * columnWidth;
    const groupSpan = barWidth * groups + (groups - 1) * 4;
    const startX = columnLeft + (columnWidth - groupSpan) / 2;

    for (let g = 0; g < groups; g += 1) {
      const group = series[g];
      const step = group.steps[col];
      if (!step) continue;

      let running = 0;
      for (let k = 0; k < col; k += 1) {
        const prev = group.steps[k];
        if (!prev) continue;
        running = prev.kind === "absolute" ? prev.value : running + prev.value;
      }

      let from: number;
      let to: number;
      let color: string;
      if (step.kind === "absolute") {
        // Абсолютная колонка рисуется от нуля; если ноль вне шкалы — от её края.
        const zero = clamp(0, axis.min, axis.max);
        from = Math.min(zero, step.value);
        to = Math.max(zero, step.value);
        color = palette.neutral;
      } else {
        from = running;
        to = running + step.value;
        color = step.value >= 0 ? palette.positive : palette.negative;
      }

      const x = startX + g * (barWidth + 4);
      const top = yOf(Math.max(from, to));
      const bottom = yOf(Math.min(from, to));
      const barHeight = Math.max(1.5, bottom - top);

      svg.rect(x, top, barWidth, barHeight, { fill: color, rx: 2 });

      const valueText =
        step.kind === "absolute" ? fmt(step.value) : `${step.value > 0 ? "+" : ""}${fmt(step.value)}`;
      svg.text(x + barWidth / 2, top - 5, valueText, { "font-size": 10, fill: palette.fgDim });
    }

    const label = truncate(labels[col] ?? "", columnWidth - 6, labelFontSize);
    svg.text(columnLeft + columnWidth / 2, plotBottom + 18, label, {
      "font-size": labelFontSize,
      fill: palette.fg,
    });
  }

  if (groups > 1) {
    let legendX = plotLeft;
    const legendY = plotBottom + 40;
    for (let g = 0; g < groups; g += 1) {
      const name = series[g].name ?? `Группа ${g + 1}`;
      const swatch = 10;
      svg.rect(legendX, legendY - swatch + 2, swatch, swatch, {
        fill: g === 0 ? palette.neutral : palette.accent,
        rx: 2,
      });
      svg.text(legendX + swatch + 6, legendY, name, {
        "text-anchor": "start",
        "font-size": labelFontSize,
        fill: palette.fgDim,
      });
      legendX += swatch + 12 + measureText(name, labelFontSize) + 16;
    }
  }

  return svg.toString();
}

export const waterfallEngine: ExtEngine<WaterfallModel> = {
  type: "waterfall",
  aliases: ["waterfall", "waterfall-variance", "waterfall-multi", "waterfall-scenario"],
  parse: parseWaterfall,
  render: renderWaterfall,
};
