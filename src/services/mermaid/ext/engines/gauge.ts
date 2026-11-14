import { createSvg, fmt, measureText, resolvePalette } from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export interface GaugeZone {
  from: number;
  to: number;
  color: string;
  label?: string;
}

export interface GaugeModel {
  title?: string;
  min: number;
  max: number;
  value: number;
  label?: string;
  /** Цвет стрелки и оси. */
  color: string;
  /** Цвет пустой дуги. Без значения берётся приглушённый цвет темы. */
  track?: string;
  /** Цвет пройденной части дуги от минимума до стрелки. */
  arc?: string;
  /** Толщина дуги в пикселях. */
  thickness?: number;
  /** Толщина стрелки в пикселях. */
  needle?: number;
  font?: string;
  fontSize?: number;
  width?: number;
  height?: number;
  zones: GaugeZone[];
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

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function positive(raw: string): number | null {
  const n = parseNumber(raw);
  return n !== null && n > 0 ? n : null;
}

export function parseGauge(source: string): ExtParseResult<GaugeModel> {
  const errors: ExtParseError[] = [];
  const model: GaugeModel = {
    min: 0,
    max: Number.NaN,
    value: Number.NaN,
    color: "#2563eb",
    zones: [],
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
    }     else if (keyword === "label") model.label = unquote(rest);
    else if (keyword === "color" || keyword === "track" || keyword === "arc") {
      if (!HEX.test(rest)) errors.push(error(lineNo, `${keyword}: нужен #hex`));
      else if (keyword === "color") model.color = rest;
      else if (keyword === "track") model.track = rest;
      else model.arc = rest;
    } else if (keyword === "thickness" || keyword === "needle" || keyword === "fontsize") {
      const n = positive(rest);
      if (n === null) errors.push(error(lineNo, `${keyword}: нужно положительное число`));
      else if (keyword === "thickness") model.thickness = n;
      else if (keyword === "needle") model.needle = n;
      else model.fontSize = n;
    } else if (keyword === "font") {
      const font = unquote(rest);
      if (!font) errors.push(error(lineNo, "font: пустое имя"));
      else model.font = font;
    } else if (keyword === "size") {
      const match = /^(\d+)\s*x\s*(\d+)$/i.exec(rest.trim());
      if (!match) errors.push(error(lineNo, "size: нужно ширинаxвысота, например 420x250"));
      else {
        const width = Number(match[1]);
        const height = Number(match[2]);
        if (width <= 0 || height <= 0) errors.push(error(lineNo, "size: стороны должны быть больше нуля"));
        else {
          model.width = width;
          model.height = height;
        }
      }
    } else if (keyword === "zone") {
      const match = /^(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s+(#(?:[0-9a-f]{3}|[0-9a-f]{6}))(?:\s+(.*))?$/i.exec(rest);
      if (!match) {
        errors.push(error(lineNo, "zone: нужно «от до #hex» и необязательная подпись"));
      } else {
        const from = parseNumber(match[1]);
        const to = parseNumber(match[2]);
        const label = match[4] ? unquote(match[4].trim()) : "";
        if (from === null || to === null) errors.push(error(lineNo, "zone: границы должны быть числами"));
        else if (from === to) errors.push(error(lineNo, "zone: границы не могут совпадать"));
        else model.zones.push({ from, to, color: match[3], label: label || undefined });
      }
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
  if (model.track) lines.push(`track ${model.track}`);
  if (model.arc) lines.push(`arc ${model.arc}`);
  if (model.thickness) lines.push(`thickness ${fmt(model.thickness)}`);
  if (model.needle) lines.push(`needle ${fmt(model.needle)}`);
  if (model.font) lines.push(`font ${model.font}`);
  if (model.fontSize) lines.push(`fontsize ${fmt(model.fontSize)}`);
  if (model.width && model.height) lines.push(`size ${model.width}x${model.height}`);
  for (const zone of model.zones) {
    const label = zone.label ? ` "${zone.label.replace(/"/g, '\\"')}"` : "";
    lines.push(`zone ${fmt(zone.from)} ${fmt(zone.to)} ${zone.color}${label}`);
  }
  return lines.join("\n");
}

const TEXT_SAFE = 1.08;

function textWidth(text: string, fontSize: number): number {
  return measureText(text, fontSize) * TEXT_SAFE;
}

function fitFont(text: string, fontSize: number, maxWidth: number): number {
  const width = textWidth(text, fontSize);
  if (maxWidth <= 0 || width <= maxWidth) return fontSize;
  return Math.max(1, Math.floor(((fontSize * maxWidth) / width) * 100) / 100);
}

function arcPoint(cx: number, cy: number, radius: number, fraction: number): { x: number; y: number } {
  const clamped = Math.min(1, Math.max(0, fraction));
  const angle = Math.PI * (1 - clamped);
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy - Math.sin(angle) * radius,
  };
}

function arcPath(cx: number, cy: number, radius: number, from: number, to: number): string {
  const start = arcPoint(cx, cy, radius, from);
  const end = arcPoint(cx, cy, radius, to);
  // Дуга не больше полукруга, поэтому large-arc всегда 0: флаг 1 увёл бы линию вниз.
  return `M ${fmt(start.x)} ${fmt(start.y)} A ${fmt(radius)} ${fmt(radius)} 0 0 1 ${fmt(end.x)} ${fmt(end.y)}`;
}

function valueFraction(model: GaugeModel, value: number): number {
  const span = model.max - model.min;
  if (!Number.isFinite(span) || span === 0) return 0;
  return Math.min(1, Math.max(0, (value - model.min) / span));
}

export function renderGauge(model: GaugeModel, options: ExtRenderOptions = {}): string {
  const palette = resolvePalette(options.dark, options.background, options.textColor);
  const width = model.width && model.width > 0 ? model.width : 360;
  const height = model.height && model.height > 0 ? model.height : 220;
  const thickness = model.thickness ?? 14;
  const needleWidth = model.needle ?? 4;
  const valueSize = model.fontSize ?? 22;
  const hasLegend = model.zones.some((zone) => zone.label);
  const svg = createSvg({ width, height, palette, title: model.title ?? "gauge" });
  const classic =
    width === 360 &&
    height === 220 &&
    thickness === 14 &&
    valueSize === 22 &&
    !hasLegend;
  const cap = thickness / 2 + 10;
  const titleH = model.title ? 36 : 18;
  const legendH = hasLegend ? 28 : 0;
  const radius = classic
    ? 120
    : Math.max(40, Math.min((width - cap * 2) / 2, height - titleH - valueSize - legendH - 28));
  const cx = width / 2;
  const cy = classic ? 168 : titleH + radius;
  const font = model.font ? { "font-family": model.font } : {};

  const track = model.track ?? palette.fgDim;
  svg.path(arcPath(cx, cy, radius, 0, 1), {
    fill: "none",
    stroke: track,
    "stroke-width": thickness,
    "stroke-linecap": "round",
  });
  for (const zone of model.zones) {
    const from = valueFraction(model, Math.min(zone.from, zone.to));
    const to = valueFraction(model, Math.max(zone.from, zone.to));
    if (to - from < 0.001) continue;
    svg.path(arcPath(cx, cy, radius, from, to), {
      fill: "none",
      stroke: zone.color,
      "stroke-width": thickness,
      "stroke-linecap": "round",
      "data-role": "zone",
      "data-color": zone.color,
    });
  }
  const fraction = gaugeFraction(model);
  if (model.arc && fraction > 0.001) {
    svg.path(arcPath(cx, cy, radius, 0, fraction), {
      fill: "none",
      stroke: model.arc,
      "stroke-width": thickness,
      "stroke-linecap": "round",
      "data-role": "arc",
    });
  }
  const needleInset = thickness <= 14 ? 8 : thickness / 2 + 4;
  const needleEnd = arcPoint(cx, cy, Math.max(12, radius - needleInset), fraction);
  svg.line(cx, cy, needleEnd.x, needleEnd.y, {
    stroke: model.color,
    "stroke-width": needleWidth,
    "stroke-linecap": "round",
    "data-role": "needle",
    "data-fraction": fmt(fraction),
  });
  svg.circle(cx, cy, needleWidth > 4 ? needleWidth + 2 : 6, { fill: model.color });
  const caption = model.label ?? fmt(model.value);
  const captionSize = fitFont(caption, valueSize, width - 24);
  svg.text(cx, cy + (classic ? 28 : Math.max(28, captionSize + 6)), caption, {
    fill: palette.fg,
    "font-size": captionSize,
    "text-anchor": "middle",
    "data-role": "value",
    ...font,
  });
  const minLabel = fmt(model.min);
  const maxLabel = fmt(model.max);
  const edgeSize = fitFont(maxLabel, 12, Math.max(12, (width - radius * 2) / 2));
  svg.text(cx - radius, cy + 18, minLabel, {
    fill: palette.fgDim,
    "font-size": edgeSize,
    "text-anchor": "middle",
    ...font,
  });
  svg.text(cx + radius, cy + 18, maxLabel, {
    fill: palette.fgDim,
    "font-size": edgeSize,
    "text-anchor": "middle",
    ...font,
  });
  if (model.title) {
    const titleSize = fitFont(model.title, 16, width - 16);
    const titleY = classic ? 28 : Math.max(titleSize + 2, titleSize * 0.92 + 4);
    svg.text(cx, titleY, model.title, {
      fill: palette.fg,
      "font-size": titleSize,
      "text-anchor": "middle",
      ...font,
    });
  }
  if (hasLegend) paintLegend(svg, model, width, height, font, palette.fg);
  return svg.toString();
}

function paintLegend(
  svg: ReturnType<typeof createSvg>,
  model: GaugeModel,
  width: number,
  height: number,
  font: Record<string, string>,
  fill: string,
): void {
  const items = model.zones.filter((zone) => zone.label);
  let fontSize = 12;
  const rowWidth = (size: number) =>
    items.reduce((sum, zone) => sum + 16 + textWidth(zone.label ?? "", size), 0) + (items.length - 1) * 12;
  while (fontSize > 8 && rowWidth(fontSize) > width - 16) fontSize -= 0.5;
  let x = Math.max(8, (width - rowWidth(fontSize)) / 2);
  const y = height - 10;
  for (const zone of items) {
    svg.circle(x + 5, y - 4, 4, { fill: zone.color, "data-role": "legend" });
    svg.text(x + 14, y, zone.label ?? "", {
      fill,
      "font-size": fontSize,
      "text-anchor": "start",
      "data-role": "legend",
      ...font,
    });
    x += 16 + textWidth(zone.label ?? "", fontSize) + 12;
  }
}

export const gaugeEngine: ExtEngine<GaugeModel> = {
  type: "gauge",
  aliases: ["gauge"],
  parse: parseGauge,
  render: renderGauge,
};
