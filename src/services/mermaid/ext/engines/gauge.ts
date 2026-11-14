import { createSvg, fmt, resolvePalette } from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export interface GaugeModel {
  title?: string;
  min: number;
  max: number;
  value: number;
  label?: string;
  color: string;
}

function error(line: number, message: string): ExtParseError {
  return { message, line, col: 0 };
}

function parseNumber(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function unquote(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

export function parseGauge(source: string): ExtParseResult<GaugeModel> {
  const errors: ExtParseError[] = [];
  const model: GaugeModel = {
    min: 0,
    max: Number.NaN,
    value: Number.NaN,
    color: "#2563eb",
  };
  let seenType = false;
  let hasValue = false;
  let hasMax = false;
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;
    if (!seenType) {
      if (!/^gauge\b/i.test(raw)) errors.push(error(lineNo, "первая строка должна быть gauge"));
      seenType = true;
      continue;
    }
    const space = raw.indexOf(" ");
    const keyword = (space < 0 ? raw : raw.slice(0, space)).toLowerCase();
    const rest = space < 0 ? "" : raw.slice(space + 1).trim();
    if (keyword === "title") model.title = unquote(rest);
    else if (keyword === "min") {
      const n = parseNumber(rest);
      if (n === null) errors.push(error(lineNo, "min: нужно число"));
      else model.min = n;
    } else if (keyword === "max") {
      const n = parseNumber(rest);
      if (n === null) errors.push(error(lineNo, "max: нужно число"));
      else {
        model.max = n;
        hasMax = true;
      }
    } else if (keyword === "value") {
      const n = parseNumber(rest);
      if (n === null) errors.push(error(lineNo, "value: нужно число"));
      else {
        model.value = n;
        hasValue = true;
      }
    } else if (keyword === "label") model.label = unquote(rest);
    else if (keyword === "color") {
      if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(rest)) errors.push(error(lineNo, "color: нужен #hex"));
      else model.color = rest;
    } else errors.push(error(lineNo, `неизвестная директива «${keyword}»`));
  }

  if (!hasValue) errors.push(error(1, "нужна директива value"));
  if (!hasMax) errors.push(error(1, "нужна директива max"));
  if (hasMax && hasValue && model.max === model.min) errors.push(error(1, "max и min не могут совпадать"));
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: model, errors: [] };
}

/** Доля стрелки от минимума к максимуму, обрезанная к отрезку 0..1. */
export function gaugeFraction(model: GaugeModel): number {
  const span = model.max - model.min;
  if (!Number.isFinite(span) || span === 0) return 0;
  return Math.min(1, Math.max(0, (model.value - model.min) / span));
}

export function emitGauge(model: GaugeModel): string {
  const lines = ["gauge"];
  if (model.title) lines.push(`title ${model.title}`);
  lines.push(`min ${fmt(model.min)}`);
  lines.push(`max ${fmt(model.max)}`);
  lines.push(`value ${fmt(model.value)}`);
  if (model.label) lines.push(`label ${model.label}`);
  if (model.color !== "#2563eb") lines.push(`color ${model.color}`);
  return lines.join("\n");
}

export function renderGauge(model: GaugeModel, options: ExtRenderOptions = {}): string {
  const palette = resolvePalette(options.dark, options.background, options.textColor);
  const width = 360;
  const height = 220;
  const svg = createSvg({ width, height, palette, title: model.title ?? "gauge" });
  const cx = width / 2;
  const cy = 168;
  const radius = 120;
  const startX = cx - radius;
  const endX = cx + radius;
  svg.path(`M ${fmt(startX)} ${fmt(cy)} A ${radius} ${radius} 0 0 1 ${fmt(endX)} ${fmt(cy)}`, {
    fill: "none",
    stroke: palette.fgDim,
    "stroke-width": 14,
    "stroke-linecap": "round",
  });
  const fraction = gaugeFraction(model);
  const angle = Math.PI * (1 - fraction);
  const nx = cx + Math.cos(angle) * (radius - 8);
  const ny = cy - Math.sin(angle) * (radius - 8);
  svg.line(cx, cy, nx, ny, {
    stroke: model.color,
    "stroke-width": 4,
    "stroke-linecap": "round",
    "data-role": "needle",
    "data-fraction": fmt(fraction),
  });
  svg.circle(cx, cy, 6, { fill: model.color });
  const caption = model.label ?? fmt(model.value);
  svg.text(cx, cy + 28, caption, {
    fill: palette.fg,
    "font-size": 22,
    "text-anchor": "middle",
    "data-role": "value",
  });
  svg.text(startX, cy + 18, fmt(model.min), {
    fill: palette.fgDim,
    "font-size": 12,
    "text-anchor": "middle",
  });
  svg.text(endX, cy + 18, fmt(model.max), {
    fill: palette.fgDim,
    "font-size": 12,
    "text-anchor": "middle",
  });
  if (model.title) {
    svg.text(cx, 28, model.title, {
      fill: palette.fg,
      "font-size": 16,
      "text-anchor": "middle",
    });
  }
  return svg.toString();
}

export const gaugeEngine: ExtEngine<GaugeModel> = {
  type: "gauge",
  aliases: ["gauge"],
  parse: parseGauge,
  render: renderGauge,
};
