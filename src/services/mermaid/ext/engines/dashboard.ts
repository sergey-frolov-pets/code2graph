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
  title: string;
  header: string;
  footer: string;
  zones: DashboardZone[];
}

const TITLE_BAND = 40;
const HEADER_BAND = 32;
const FOOTER_BAND = 28;

export interface DashboardContentFrame {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Область зон под заголовком и шапкой и над подвалом. */
export function dashboardContentFrame(model: Pick<DashboardModel, "width" | "height" | "title" | "header" | "footer">): DashboardContentFrame {
  const titleBand = model.title.trim() ? TITLE_BAND : 0;
  const headerBand = model.header.trim() ? HEADER_BAND : 0;
  const footerBand = model.footer.trim() ? FOOTER_BAND : 0;
  const top = titleBand + headerBand;
  return {
    top,
    left: 0,
    width: model.width,
    height: Math.max(48, model.height - top - footerBand),
  };
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
    title: "",
    header: "",
    footer: "",
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
    const caption = /^(title|header|footer)\b\s*(.*)$/i.exec(raw);
    if (caption) {
      const key = caption[1].toLowerCase() as "title" | "header" | "footer";
      model[key] = unquote(caption[2] ?? "");
      continue;
    }
    const zone = /^zone\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+diagram\s+(.+)$/i.exec(raw);
    if (!zone) {
      errors.push(error(lineNo, "ожидается size, refresh, title, header, footer или zone"));
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
  if (model.title.trim()) lines.push(`title "${model.title.replace(/"/g, '\\"')}"`);
  if (model.header.trim()) lines.push(`header "${model.header.replace(/"/g, '\\"')}"`);
  if (model.footer.trim()) lines.push(`footer "${model.footer.replace(/"/g, '\\"')}"`);
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
  const frame = dashboardContentFrame(model);
  if (model.title.trim()) {
    svg.text(model.width / 2, 26, model.title, {
      fill: palette.fg,
      "font-size": 22,
      "text-anchor": "middle",
      "data-role": "title",
    });
  }
  if (model.header.trim()) {
    svg.text(12, (model.title.trim() ? TITLE_BAND : 0) + 22, model.header, {
      fill: palette.fg,
      "font-size": 14,
      "data-role": "header",
    });
  }
  if (model.footer.trim()) {
    svg.text(12, model.height - 10, model.footer, {
      fill: palette.fgDim,
      "font-size": 12,
      "data-role": "footer",
    });
  }
  model.zones.forEach((zone, index) => {
    const x = frame.left + zone.x * frame.width;
    const y = frame.top + zone.y * frame.height;
    const w = zone.w * frame.width;
    const h = zone.h * frame.height;
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
