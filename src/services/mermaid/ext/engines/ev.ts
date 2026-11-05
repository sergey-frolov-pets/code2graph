import {
  clamp,
  createSvg,
  drawLabelLines,
  fmt,
  labelBlockExtra,
  measureLabelWidth,
  measureText,
  niceRange,
  monoFlagsFromMode,
  monoGray,
  niceTicks,
  parseMonoDirective,
  resolvePalette,
  truncateLabel,
  usesInvertedMono,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";
import { growPlotToAspect, parseAspectDirective, type ChartAspect } from "../chart-aspect";

// --- Модель ---------------------------------------------------------------

export type EvSeriesKey = "pv" | "ev" | "ac";

export interface EvSummary {
  /** Отклонение по срокам: EV − PV на последнем периоде. */
  sv: number;
  /** Отклонение по стоимости: EV − AC на последнем периоде. */
  cv: number;
}

export interface EvModel {
  title?: string;
  /** Подписи периодов (дни, недели, что угодно). */
  days: string[];
  pv: number[];
  ev: number[];
  ac: number[];
  /** Рисовать горизонтальные линии сетки. */
  grid: boolean;
  /** `mono` — три кривые отличаются светлотой. */
  mono?: boolean;
  /** `mono invert` — светлая серая шкала для тёмного фона. */
  monoInvert?: boolean;
  /** `ratio 16x9` — кривые растягиваются под пропорции изображения. */
  ratio?: ChartAspect;
  summary: EvSummary;
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
  const t = String(raw ?? "").trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

/** `1, 2, 3` → список подписей. Пустые куски отбрасываются. */
function splitLabels(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => unquote(s))
    .filter((s) => s.length > 0);
}

const SERIES: EvSeriesKey[] = ["pv", "ev", "ac"];

export function parseEv(source: string): ExtParseResult<EvModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let days: string[] | null = null;
  let daysLine = 0;
  const values: Partial<Record<EvSeriesKey, number[]>> = {};
  const seriesLine: Partial<Record<EvSeriesKey, number>> = {};
  let grid = false;
  let ratio: ChartAspect | undefined;
  let mono = false;
  let monoInvert = false;
  let seenType = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;

    if (!seenType) {
      seenType = true;
      continue; // первая значимая строка — ключевое слово типа
    }

    const aspect = parseAspectDirective(raw);
    if (aspect) {
      if ("error" in aspect) errors.push({ message: aspect.error, line: lineNo, col: 0 });
      else ratio = aspect.aspect;
      continue;
    }

    if (/^title\b/i.test(raw)) {
      title = raw.replace(/^title\s*/i, "").trim() || undefined;
      continue;
    }

    if (/^grid$/i.test(raw)) {
      grid = true;
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

    const daysMatch = /^days\b\s*(.*)$/i.exec(raw);
    if (daysMatch) {
      const labels = splitLabels(daysMatch[1]);
      if (labels.length === 0) {
        errors.push({ message: `«days»: ожидается список периодов через запятую`, line: lineNo, col: 0 });
        continue;
      }
      days = labels;
      daysLine = lineNo;
      continue;
    }

    const seriesMatch = /^(pv|ev|ac)\b\s*(.*)$/i.exec(raw);
    if (seriesMatch) {
      const key = seriesMatch[1].toLowerCase() as EvSeriesKey;
      const parts = seriesMatch[2].split(",").map((s) => s.trim());
      const parsed: number[] = [];
      let bad = false;
      for (const part of parts) {
        if (part === "") continue;
        const n = parseNumber(part);
        if (n === null) {
          errors.push({
            message: `ряд «${key}»: не удалось разобрать число: «${part}»`,
            line: lineNo,
            col: 0,
          });
          bad = true;
          break;
        }
        parsed.push(n);
      }
      if (bad) continue;
      if (parsed.length === 0) {
        errors.push({ message: `ряд «${key}»: пустой список значений`, line: lineNo, col: 0 });
        continue;
      }
      values[key] = parsed;
      seriesLine[key] = lineNo;
      continue;
    }

    errors.push({
      message: `неизвестная строка «${raw}»: ожидается title, days, pv/ev/ac, grid, mono или ratio`,
      line: lineNo,
      col: 0,
    });
  }

  if (!days) {
    errors.push({
      message: `не задан «days»: ожидается строка «days 1, 2, 3»`,
      line: Math.max(1, daysLine || 1),
      col: 0,
    });
    return { ok: false, errors };
  }

  for (const key of SERIES) {
    if (!values[key]) {
      errors.push({
        message: `не задан ряд «${key}»: ожидается строка «${key} <значения>»`,
        line: 1,
        col: 0,
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  const expected = days.length;
  for (const key of SERIES) {
    const arr = values[key] as number[];
    if (arr.length !== expected) {
      errors.push({
        message: `ряд «${key}»: ожидается ${expected} значений (по числу дней), получено ${arr.length}`,
        line: seriesLine[key] ?? 1,
        col: 0,
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  const pv = values.pv as number[];
  const ev = values.ev as number[];
  const ac = values.ac as number[];
  const last = expected - 1;

  return {
    ok: true,
    errors: [],
    value: {
      title,
      days,
      pv,
      ev,
      ac,
      grid,
      mono,
      monoInvert,
      ratio,
      summary: { sv: ev[last] - pv[last], cv: ev[last] - ac[last] },
    },
  };
}

// --- Рендер ---------------------------------------------------------------

const PADDING = { top: 52, right: 28, bottom: 56, left: 68 };
const PLOT_HEIGHT = 240;
const FONT = 11;

export function renderEv(model: EvModel, options: ExtRenderOptions): string {
  const themeDark = Boolean(options.dark) || usesInvertedMono(model.mono, model.monoInvert, false);
  const invertedMono = usesInvertedMono(model.mono, model.monoInvert, options.dark);
  const palette = resolvePalette(themeDark, options.background, options.textColor);
  const { days, pv, ev, ac, title } = model;

  const count = Math.max(1, days.length);
  const longestDay = days.reduce((acc, d) => Math.max(acc, measureLabelWidth(d, FONT)), 0);
  let columnWidth = clamp(longestDay + 32, 56, 140);
  let plotWidth = columnWidth * count;
  let plotHeight = PLOT_HEIGHT;
  const dayExtra = Math.max(0, ...days.map((day) => labelBlockExtra(day, FONT)));
  const titleExtra = labelBlockExtra(title, 15);

  if (model.ratio) {
    const grown = growPlotToAspect(
      {
        plotWidth,
        plotHeight,
        totalWidth: PADDING.left + plotWidth + PADDING.right,
        totalHeight: PADDING.top + titleExtra + plotHeight + PADDING.bottom + dayExtra,
      },
      model.ratio,
    );
    if (grown.plotWidth > plotWidth) {
      columnWidth = grown.plotWidth / count;
      plotWidth = columnWidth * count;
    }
    plotHeight = grown.plotHeight;
  }

  const width = PADDING.left + plotWidth + PADDING.right;
  const height = PADDING.top + titleExtra + plotHeight + PADDING.bottom + dayExtra;

  const svg = createSvg({ width, height, palette, title, debugFrames: options.debugFrames });

  const plotLeft = PADDING.left;
  const plotTop = PADDING.top + titleExtra;
  const plotBottom = plotTop + plotHeight;

  const all = [...pv, ...ev, ...ac];
  const rawMin = Math.min(0, ...all);
  const rawMax = Math.max(0, ...all);
  const range = niceRange(rawMin, rawMax, 4);
  const min = range.min;
  const max = range.max === range.min ? range.min + 1 : range.max;

  const yOf = (value: number): number => plotBottom - ((value - min) / (max - min)) * plotHeight;
  const xOf = (index: number): number =>
    plotLeft + (count === 1 ? columnWidth / 2 : (index / (count - 1)) * plotWidth);

  if (title) {
    drawLabelLines(svg, width / 2, 24, title, 15, {
      "font-size": 15,
      "font-weight": 600,
      fill: palette.fg,
    });
  }

  if (model.grid) {
    for (const tick of niceTicks(min, max, 5)) {
      const y = yOf(tick);
      svg.line(plotLeft, y, plotLeft + plotWidth, y, { stroke: palette.grid, "stroke-width": 1 });
    }
  }

  for (const tick of niceTicks(min, max, 5)) {
    const y = yOf(tick);
    svg.text(plotLeft - 8, y + 4, fmt(tick), {
      "text-anchor": "end",
      "font-size": FONT,
      fill: palette.fgDim,
    });
  }

  svg.line(plotLeft, plotBottom, plotLeft + plotWidth, plotBottom, {
    stroke: palette.axis,
    "stroke-width": 1,
  });

  const series: { name: string; data: number[]; color: string }[] = model.mono
    ? [
        { name: "PV", data: pv, color: monoGray(0, 3, invertedMono) },
        { name: "EV", data: ev, color: monoGray(1, 3, invertedMono) },
        { name: "AC", data: ac, color: monoGray(2, 3, invertedMono) },
      ]
    : [
        { name: "PV", data: pv, color: palette.neutral },
        { name: "EV", data: ev, color: palette.positive },
        { name: "AC", data: ac, color: palette.negative },
      ];

  for (const s of series) {
    const points = s.data.map((v, i) => `${fmt(xOf(i))},${fmt(yOf(v))}`).join(" ");
    svg.polyline(points, { stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round" });
  }

  for (let i = 0; i < count; i += 1) {
    const label = truncateLabel(days[i] ?? "", columnWidth - 6, FONT);
    drawLabelLines(svg, xOf(i), plotBottom + 18, label, FONT, { "font-size": FONT, fill: palette.fg });
  }

  // Легенда
  let legendX = plotLeft;
  const legendY = plotBottom + 42 + dayExtra;
  for (const s of series) {
    const swatch = 10;
    svg.rect(legendX, legendY - swatch + 2, swatch, swatch, { fill: s.color, rx: 2 });
    svg.text(legendX + swatch + 6, legendY, s.name, {
      "text-anchor": "start",
      "font-size": FONT,
      fill: palette.fgDim,
    });
    legendX += swatch + 12 + measureText(s.name, FONT) + 16;
  }

  const svText = `SV ${model.summary.sv >= 0 ? "+" : ""}${fmt(model.summary.sv)}`;
  const cvText = `CV ${model.summary.cv >= 0 ? "+" : ""}${fmt(model.summary.cv)}`;
  svg.text(plotLeft + plotWidth, legendY, `${svText}   ${cvText}`, {
    "text-anchor": "end",
    "font-size": FONT,
    fill: palette.fgDim,
  });

  return svg.toString();
}

export const evEngine: ExtEngine<EvModel> = {
  type: "ev",
  aliases: ["ev", "evchart"],
  parse: parseEv,
  render: renderEv,
};
