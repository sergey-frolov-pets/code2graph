import {
  extractTrailingColorAttr,
  parseExtColorsDirective,
  parseExtNumber,
  parseMonoDirective,
  resolveSeriesColor,
  unquoteExtText,
} from "../color-utils";
import {
  clamp,
  createSvg,
  drawLabelLines,
  fmt,
  hasLabelBreak,
  labelBlockExtra,
  labelLineStep,
  measureLabelWidth,
  niceRange,
  resolvePalette,
  splitLabelLines,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export interface RadarSeries {
  name: string;
  values: number[];
  color?: string;
}

export interface RadarModel {
  title?: string;
  axes: string[];
  min: number;
  max: number;
  rings: number;
  fillOpacity: number;
  dots: boolean;
  fontSize?: number;
  mono: boolean;
  seriesColors: Record<string, string>;
  series: RadarSeries[];
}

const FONT_BASE = 11;
const FONT_MIN = 6;
const FONT_MAX = 28;
const DEFAULT_RINGS = 4;
const MIN_RINGS = 2;
const MAX_RINGS = 10;
const MIN_AXES_COUNT = 3;
const DEFAULT_FILL_OPACITY = 0.22;
const RADIUS_BASE = 128;
const LABEL_OFFSET = 16;
const DOT_RADIUS = 3.5;

function splitCsvLabels(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => unquoteExtText(s))
    .filter((s) => s.length > 0);
}

function parseSeriesLine(
  rawLine: string,
  lineNo: number,
  expectedAxesCount: number | null,
): { series?: RadarSeries; error?: ExtParseError } {
  const colonIdx = rawLine.indexOf(":");
  if (colonIdx < 0) {
    return {
      error: {
        message: `ожидается «Серия : зн1, зн2, …», получено «${rawLine}»`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const headRaw = rawLine.slice(0, colonIdx).replace(/^series\s+/i, "").trim();
  const headColorExt = extractTrailingColorAttr(headRaw, lineNo);
  if (headColorExt.error) return { error: headColorExt.error };

  const tailColorExt = extractTrailingColorAttr(rawLine.slice(colonIdx + 1), lineNo);
  if (tailColorExt.error) return { error: tailColorExt.error };

  const name = unquoteExtText(headColorExt.rest);
  if (!name) {
    return {
      error: {
        message: `пустое имя серии перед «:»`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const color = tailColorExt.color ?? headColorExt.color;
  const parts = tailColorExt.rest
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (parts.length === 0) {
    return {
      error: {
        message: `серия «${name}»: пустой список значений`,
        line: lineNo,
        col: 0,
      },
    };
  }

  if (expectedAxesCount !== null && parts.length !== expectedAxesCount) {
    return {
      error: {
        message: `серия «${name}»: ожидается ${expectedAxesCount} значений (по числу осей axes), получено ${parts.length}`,
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

export function parseRadar(source: string): ExtParseResult<RadarModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let axes: string[] | null = null;
  let explicitMin: number | undefined;
  let explicitMax: number | undefined;
  let rings = DEFAULT_RINGS;
  let fillOpacity = DEFAULT_FILL_OPACITY;
  let dots = true;
  let fontSize: number | undefined;
  let mono = false;
  const seriesColors: Record<string, string> = {};
  const series: RadarSeries[] = [];

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

      if (/^(?:axes|axis)\b/i.test(raw) && !raw.includes(":")) {
        const list = splitCsvLabels(raw.replace(/^(?:axes|axis)\s*/i, ""));
        if (list.length < MIN_AXES_COUNT) {
          errors.push({
            message: `«axes»: требуется минимум ${MIN_AXES_COUNT} оси через запятую, получено ${list.length}`,
            line: lineNo,
            col: 0,
          });
        } else {
          axes = list;
        }
        continue;
      }

      if (/^scale\b/i.test(raw) && !raw.includes(":")) {
        const body = raw.replace(/^scale\s*/i, "").trim();
        const m = /^(-?[\d\s_.,]+)\s*-->\s*(-?[\d\s_.,]+)$/.exec(body);
        if (!m) {
          errors.push({
            message: `ожидается «scale <min> --> <max>», получено «${body}»`,
            line: lineNo,
            col: 0,
          });
        } else {
          const min = parseExtNumber(m[1]);
          const max = parseExtNumber(m[2]);
          if (min === null || max === null || max <= min) {
            errors.push({
              message: `«scale»: максимум должен быть больше минимума`,
              line: lineNo,
              col: 0,
            });
          } else {
            explicitMin = min;
            explicitMax = max;
          }
        }
        continue;
      }

      if (/^max\b/i.test(raw) && !raw.includes(":")) {
        const arg = raw.replace(/^max\s*/i, "").trim();
        const parsed = parseExtNumber(arg);
        if (parsed === null || !(parsed > 0)) {
          errors.push({
            message: `ожидается «max <положительное число>», получено «${arg}»`,
            line: lineNo,
            col: 0,
          });
        } else {
          explicitMax = parsed;
        }
        continue;
      }

      if (/^rings\b/i.test(raw) && !raw.includes(":")) {
        const arg = raw.replace(/^rings\s*/i, "").trim();
        const parsed = parseExtNumber(arg);
        if (parsed === null || !Number.isInteger(parsed) || parsed < MIN_RINGS || parsed > MAX_RINGS) {
          errors.push({
            message: `ожидается «rings <целое число от ${MIN_RINGS} до ${MAX_RINGS}>», получено «${arg}»`,
            line: lineNo,
            col: 0,
          });
        } else {
          rings = parsed;
        }
        continue;
      }

      if (/^fill\b/i.test(raw) && !raw.includes(":")) {
        const arg = raw.replace(/^fill\s*/i, "").trim().toLowerCase();
        if (!arg || arg === "on") fillOpacity = DEFAULT_FILL_OPACITY;
        else if (arg === "off" || arg === "none") fillOpacity = 0;
        else {
          const parsed = parseExtNumber(arg);
          if (parsed === null || parsed < 0 || parsed > 1) {
            errors.push({
              message: `ожидается «fill on|off» или число 0..1, получено «${arg}»`,
              line: lineNo,
              col: 0,
            });
          } else {
            fillOpacity = parsed;
          }
        }
        continue;
      }

      if (/^dots\b/i.test(raw) && !raw.includes(":")) {
        const arg = raw.replace(/^dots\s*/i, "").trim().toLowerCase();
        if (!arg || arg === "on") dots = true;
        else if (arg === "off") dots = false;
        else {
          errors.push({
            message: `ожидается «dots on» или «dots off», получено «${arg}»`,
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
    }

    if (raw.includes(":")) {
      const parsed = parseSeriesLine(raw, lineNo, axes ? axes.length : null);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.series) series.push(parsed.series);
      continue;
    }

    errors.push({
      message: `неизвестная директива «${raw.split(/\s+/)[0]}» (допустимы title, axes, scale, max, rings, fill, dots, fontsize, mono, colors, data или строка серии)`,
      line: lineNo,
      col: 0,
    });
  }

  if (!axes) {
    errors.push({
      message: `не заданы оси «axes»: ожидается строка «axes Ось 1, Ось 2, Ось 3, …»`,
      line: 1,
      col: 0,
    });
  }

  if (series.length === 0 && errors.length === 0) {
    errors.push({
      message: `нет данных: ожидается хотя бы одна серия «Имя : зн1, зн2, …»`,
      line: 1,
      col: 0,
    });
  }

  if (axes) {
    for (const s of series) {
      if (s.values.length !== axes.length) {
        errors.push({
          message: `серия «${s.name}»: ожидается ${axes.length} значений (по числу осей axes), получено ${s.values.length}`,
          line: 1,
          col: 0,
        });
      }
    }
  }

  if (errors.length > 0 || !axes) return { ok: false, errors };

  const allValues = series.flatMap((s) => s.values);
  const rawMin = Math.min(0, ...allValues);
  const rawMax = Math.max(10, ...allValues);
  const auto = niceRange(rawMin, rawMax, rings);
  const min = explicitMin ?? Math.min(0, auto.min);
  const max = explicitMax ?? (auto.max <= min ? min + 100 : auto.max);

  return {
    ok: true,
    errors: [],
    value: {
      title,
      axes,
      min,
      max,
      rings,
      fillOpacity,
      dots,
      fontSize,
      mono,
      seriesColors,
      series,
    },
  };
}

export function renderRadar(model: RadarModel, options: ExtRenderOptions): string {
  const palette = resolvePalette(options.dark, options.background, options.textColor);
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const scaleFactor = fontSize / FONT_BASE;
  const titleSize = clamp(Math.round(fontSize * 1.36), 14, 26);

  const radius = Math.round(RADIUS_BASE * Math.max(1, (scaleFactor - 1) * 0.45 + 1));
  const longestAxis = model.axes.reduce(
    (max, axis) => Math.max(max, measureLabelWidth(axis, fontSize)),
    0,
  );
  const axisExtra = Math.max(0, ...model.axes.map((axis) => labelBlockExtra(axis, fontSize)));
  const titleExtra = labelBlockExtra(model.title, titleSize);
  const seriesExtra = Math.max(0, ...model.series.map((series) => labelBlockExtra(series.name, fontSize)));
  const sideMargin = Math.max(76, Math.ceil(longestAxis) + LABEL_OFFSET + 20) + axisExtra;
  const topMargin = (model.title ? 58 : 28) + fontSize + LABEL_OFFSET + axisExtra + titleExtra;
  const legendHeight = 36 + seriesExtra;
  const bottomMargin = 28 + fontSize + LABEL_OFFSET + legendHeight + axisExtra;

  const width = radius * 2 + sideMargin * 2;
  const height = topMargin + radius * 2 + bottomMargin;
  const cx = width / 2;
  const cy = topMargin + radius;

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

  const axisCount = model.axes.length;
  const angleFor = (idx: number): number => -Math.PI / 2 + (idx * 2 * Math.PI) / axisCount;
  const span = model.max - model.min || 1;

  // Концентрические многоугольники сетки и деления шкалы
  for (let ring = 1; ring <= model.rings; ring += 1) {
    const ratio = ring / model.rings;
    const r = radius * ratio;
    const ringPoints: string[] = [];
    for (let i = 0; i < axisCount; i += 1) {
      const a = angleFor(i);
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      ringPoints.push(`${fmt(x)} ${fmt(y)}`);
    }
    const d = `M ${ringPoints.join(" L ")} Z`;
    svg.path(d, {
      fill: "none",
      stroke: palette.grid,
      "stroke-width": ring === model.rings ? 1.2 : 1,
      ...(ring < model.rings ? { "stroke-dasharray": "3 3" } : {}),
    });

    const tickVal = model.min + span * ratio;
    svg.text(cx + 4, cy - r + fontSize * 0.35, fmt(tickVal), {
      "text-anchor": "start",
      "font-size": Math.max(8, fontSize - 2),
      fill: palette.fgDim,
    });
  }

  // Лучи осей и их подписи
  for (let i = 0; i < axisCount; i += 1) {
    const a = angleFor(i);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const xEnd = cx + radius * cos;
    const yEnd = cy + radius * sin;
    svg.line(cx, cy, xEnd, yEnd, {
      stroke: palette.axis,
      "stroke-width": 1,
    });

    const anchor = Math.abs(cos) < 0.18 ? "middle" : cos > 0 ? "start" : "end";
    const axisLines = hasLabelBreak(model.axes[i]) ? splitLabelLines(model.axes[i]) : [model.axes[i]];
    axisLines.forEach((line, lineIdx) => {
      const dist = radius + LABEL_OFFSET + lineIdx * labelLineStep(fontSize);
      const lx = cx + dist * cos;
      const ly = cy + dist * sin + fontSize * 0.35;
      svg.text(lx, ly, line, {
        "text-anchor": anchor,
        "font-size": fontSize,
        "font-weight": 500,
        fill: palette.fg,
      });
    });
  }

  // Многоугольники серий
  model.series.forEach((s, seriesIdx) => {
    const color = resolveSeriesColor(seriesIdx, {
      explicitColor: s.color,
      seriesColors: model.seriesColors,
      mono: model.mono,
      dark: options.dark,
    });

    const coords: Array<{ x: number; y: number }> = s.values.map((val, axisIdx) => {
      const ratio = clamp((val - model.min) / span, 0, 1);
      const r = radius * ratio;
      const a = angleFor(axisIdx);
      return {
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
      };
    });

    const d = `M ${coords.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join(" L ")} Z`;
    svg.path(d, {
      fill: color,
      "fill-opacity": model.fillOpacity,
      stroke: color,
      "stroke-width": 2,
      "stroke-linejoin": "round",
      "data-series": s.name,
    });

    if (model.dots) {
      for (const pt of coords) {
        svg.circle(pt.x, pt.y, DOT_RADIUS, {
          fill: color,
          stroke: palette.bg,
          "stroke-width": 1.2,
        });
      }
    }
  });

  // Легенда серий внизу
  const swatch = 10;
  const totalLegendWidth = model.series.reduce(
    (acc, s) => acc + swatch + 6 + measureLabelWidth(s.name, fontSize) + 18,
    -18,
  );
  let lx = Math.max(16, (width - totalLegendWidth) / 2);
  const ly = height - 16 - seriesExtra;

  model.series.forEach((s, idx) => {
    const color = resolveSeriesColor(idx, {
      explicitColor: s.color,
      seriesColors: model.seriesColors,
      mono: model.mono,
      dark: options.dark,
    });
    svg.rect(lx, ly - swatch + 2, swatch, swatch, { fill: color, rx: 2 });
    drawLabelLines(svg, lx + swatch + 6, ly, s.name, fontSize, {
      "text-anchor": "start",
      "font-size": fontSize,
      fill: palette.fgDim,
    });
    lx += swatch + 6 + measureLabelWidth(s.name, fontSize) + 18;
  });

  return svg.toString();
}

export const radarEngine: ExtEngine<RadarModel> = {
  type: "radar",
  aliases: ["radar", "radarchart", "spider"],
  parse: parseRadar,
  render: renderRadar,
};
