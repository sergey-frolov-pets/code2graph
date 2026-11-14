import { createSvg, esc, fmt, resolvePalette } from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export interface DashboardZone {
  x: number;
  y: number;
  w: number;
  h: number;
  diagramId: string;
}

export interface DashboardModel {
  width: number;
  height: number;
  /** Период в миллисекундах. `null` — только открытие и запрос. */
  refreshMs: number | null;
  zones: DashboardZone[];
}

function error(line: number, message: string): ExtParseError {
  return { message, line, col: 0 };
}

function unquote(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

export function parseRefreshInterval(raw: string): number | null {
  const match = /^(\d+(?:\.\d+)?)(s|m|h)$/i.exec(raw.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2].toLowerCase();
  const factor = unit === "h" ? 3_600_000 : unit === "m" ? 60_000 : 1000;
  return amount * factor;
}

export function formatRefreshInterval(ms: number): string {
  if (ms % 3_600_000 === 0) return `${ms / 3_600_000}h`;
  if (ms % 60_000 === 0) return `${ms / 60_000}m`;
  return `${ms / 1000}s`;
}

export function parseDashboard(source: string): ExtParseResult<DashboardModel> {
  const errors: ExtParseError[] = [];
  const model: DashboardModel = {
    width: 1280,
    height: 720,
    refreshMs: null,
    zones: [],
  };
  let seenType = false;
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;
    if (!seenType) {
      if (!/^dashboard\b/i.test(raw)) errors.push(error(lineNo, "первая строка должна быть dashboard"));
      seenType = true;
      continue;
    }
    if (/^size\b/i.test(raw)) {
      const match = /^size\s+(\d+)\s*x\s*(\d+)$/i.exec(raw);
      if (!match) errors.push(error(lineNo, "size: нужно ширинаxвысота"));
      else {
        model.width = Number(match[1]);
        model.height = Number(match[2]);
      }
      continue;
    }
    if (/^refresh\b/i.test(raw)) {
      const interval = parseRefreshInterval(raw.replace(/^refresh\s+/i, ""));
      if (interval === null) errors.push(error(lineNo, "refresh: нужно 30s, 5m или 1h"));
      else model.refreshMs = interval;
      continue;
    }
    const zone = /^zone\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+diagram\s+(.+)$/i.exec(raw);
    if (!zone) {
      errors.push(error(lineNo, "ожидается size, refresh или zone x y w h diagram \"id\""));
      continue;
    }
    const x = Number(zone[1]);
    const y = Number(zone[2]);
    const w = Number(zone[3]);
    const h = Number(zone[4]);
    const diagramId = unquote(zone[5]);
    if (![x, y, w, h].every((n) => Number.isFinite(n))) {
      errors.push(error(lineNo, "zone: доли x y w h должны быть числами"));
      continue;
    }
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1.0001 || y + h > 1.0001) {
      errors.push(error(lineNo, "zone: прямоугольник должен лежать внутри холста"));
      continue;
    }
    if (!diagramId) {
      errors.push(error(lineNo, "zone: пустой идентификатор диаграммы"));
      continue;
    }
    model.zones.push({ x, y, w, h, diagramId });
  }

  if (model.width <= 0 || model.height <= 0) errors.push(error(1, "size: стороны должны быть больше нуля"));
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: model, errors: [] };
}

export function emitDashboard(model: DashboardModel): string {
  const lines = ["dashboard", `size ${model.width}x${model.height}`];
  if (model.refreshMs !== null) lines.push(`refresh ${formatRefreshInterval(model.refreshMs)}`);
  for (const zone of model.zones) {
    const id = /[\s"]/.test(zone.diagramId) ? `"${zone.diagramId.replace(/"/g, '\\"')}"` : `"${zone.diagramId}"`;
    lines.push(
      `zone ${fmt(zone.x)} ${fmt(zone.y)} ${fmt(zone.w)} ${fmt(zone.h)} diagram ${id}`,
    );
  }
  return lines.join("\n");
}

function nestedSvg(svg: string, x: number, y: number, w: number, h: number): string {
  const viewBox = /viewBox="([^"]+)"/i.exec(svg)?.[1] ?? "0 0 100 100";
  const inner = svg
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");
  return `<svg x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" viewBox="${esc(viewBox)}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

export function renderDashboard(model: DashboardModel, options: ExtRenderOptions = {}): string {
  const palette = resolvePalette(options.dark, options.background, options.textColor);
  const svg = createSvg({
    width: model.width,
    height: model.height,
    palette,
    title: "dashboard",
  });
  model.zones.forEach((zone, index) => {
    const x = zone.x * model.width;
    const y = zone.y * model.height;
    const w = zone.w * model.width;
    const h = zone.h * model.height;
    const child = options.zoneSvgs?.[zone.diagramId];
    svg.rect(x, y, w, h, {
      fill: "none",
      stroke: palette.fgDim,
      "stroke-width": 1,
      "data-zone": String(index),
      "data-diagram": zone.diagramId,
    });
    if (child && child.includes("<svg")) {
      svg.raw(nestedSvg(child, x, y, w, h));
    } else {
      svg.text(x + 8, y + 24, zone.diagramId, {
        fill: palette.fgDim,
        "font-size": 14,
        "data-zone-empty": zone.diagramId,
      });
    }
  });
  return svg.toString();
}

export const dashboardEngine: ExtEngine<DashboardModel> = {
  type: "dashboard",
  aliases: ["dashboard"],
  parse: parseDashboard,
  render: renderDashboard,
};
