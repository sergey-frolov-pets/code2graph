import { createSvg, esc, fmt, resolvePalette } from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export type DashboardAlignX = "start" | "center" | "end";
/** `baseline` — старая базовая линия, только у прочитанных строк без `align`. */
export type DashboardAlignY = "top" | "middle" | "bottom" | "baseline";

export interface DashboardCaption {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  background: string;
  shadow: boolean;
}

export interface DashboardBand extends DashboardCaption {
  alignX: DashboardAlignX;
  alignY: DashboardAlignY;
}

export interface DashboardCell {
  col: number;
  row: number;
  kind: "diagram" | "link";
  ref: string;
}

export interface DashboardModel {
  width: number;
  height: number;
  /** Период в миллисекундах. `null` — только открытие и запрос. */
  refreshMs: number | null;
  title: DashboardCaption;
  header: DashboardBand;
  footer: DashboardBand;
  /** Доли ширины области коллажа, сумма 1. */
  cols: number[];
  /** Доли высоты области коллажа, сумма 1. */
  rows: number[];
  cells: DashboardCell[];
}

interface LegacyZone {
  x: number;
  y: number;
  w: number;
  h: number;
  diagramId: string;
}

export function createDashboardCaption(fontSize: number, background: string): DashboardCaption {
  return {
    text: "",
    font: "sans-serif",
    fontSize,
    color: "",
    background,
    shadow: true,
  };
}

export function createDashboardBand(fontSize: number, background: string): DashboardBand {
  return {
    ...createDashboardCaption(fontSize, background),
    alignX: "start",
    alignY: "middle",
  };
}

export function dashboardCellKey(cell: Pick<DashboardCell, "kind" | "ref">): string {
  return `${cell.kind}:${cell.ref}`;
}

export interface DashboardContentFrame {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function dashboardCaptionBand(caption: Pick<DashboardCaption, "text" | "fontSize">): number {
  return caption.text.trim() ? caption.fontSize + 20 : 0;
}

/** Область коллажа под заголовком и шапкой и над подвалом. */
export function dashboardContentFrame(
  model: Pick<DashboardModel, "width" | "height" | "title" | "header" | "footer">,
): DashboardContentFrame {
  const top = dashboardCaptionBand(model.title) + dashboardCaptionBand(model.header);
  const footer = dashboardCaptionBand(model.footer);
  return {
    top,
    left: 0,
    width: model.width,
    height: Math.max(48, model.height - top - footer),
  };
}

export function dashboardCellRect(
  model: DashboardModel,
  col: number,
  row: number,
): { x: number; y: number; w: number; h: number } {
  const frame = dashboardContentFrame(model);
  const x = frame.left + sumBefore(model.cols, col) * frame.width;
  const y = frame.top + sumBefore(model.rows, row) * frame.height;
  return {
    x,
    y,
    w: (model.cols[col] ?? 0) * frame.width,
    h: (model.rows[row] ?? 0) * frame.height,
  };
}

function sumBefore(tracks: number[], index: number): number {
  let sum = 0;
  for (let i = 0; i < index && i < tracks.length; i += 1) sum += tracks[i];
  return sum;
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

function parseCaption(rest: string, fallback: DashboardCaption, band: boolean): DashboardCaption | DashboardBand {
  let body = rest.trim();
  let text = "";
  const quoted = /^"((?:\\"|[^"])*)"\s*(.*)$/.exec(body);
  if (quoted) {
    text = quoted[1].replace(/\\"/g, '"');
    body = quoted[2] ?? "";
  } else {
    const plain = /^(.*?)(?=\s+(?:font|fontsize|color|background|shadow|noshadow|align)\b|$)/i.exec(body);
    text = (plain?.[1] ?? "").trim();
    body = body.slice(text.length);
  }
  const font = /(?:^|\s)font\s+(?:"([^"]+)"|(\S+))/i.exec(body);
  const fontSize = /(?:^|\s)fontsize\s+(\d+)/i.exec(body);
  const color = /(?:^|\s)color\s+(\S+)/i.exec(body);
  const background = /(?:^|\s)background\s+(\S+)/i.exec(body);
  const align = /(?:^|\s)align\s+(start|center|end)\s+(top|middle|bottom)\b/i.exec(body);
  const size = fontSize ? Number(fontSize[1]) : fallback.fontSize;
  const caption: DashboardCaption = {
    text,
    font: font?.[1] || font?.[2] || fallback.font,
    fontSize: Number.isFinite(size) && size > 0 ? size : fallback.fontSize,
    color: !color?.[1] || color[1].toLowerCase() === "none" ? fallback.color : color[1],
    background: background?.[1]
      ? (background[1].toLowerCase() === "none" ? "" : background[1])
      : fallback.background,
    shadow: /\bnoshadow\b/i.test(body) ? false : fallback.shadow,
  };
  if (!band) return caption;
  const fallbackBand = fallback as DashboardBand;
  return {
    ...caption,
    alignX: align ? (align[1].toLowerCase() as DashboardAlignX) : (fallbackBand.alignX ?? "start"),
    alignY: align ? (align[2].toLowerCase() as DashboardAlignY) : "baseline",
  };
}

function quoteArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function emitCaption(keyword: string, caption: DashboardCaption, band: DashboardBand | null): string | null {
  if (!caption.text.trim()) return null;
  const parts = [
    keyword,
    quoteArg(caption.text),
    "font",
    quoteArg(caption.font || "sans-serif"),
    "fontsize",
    String(caption.fontSize),
    "color",
    caption.color.trim() || "none",
    "background",
    caption.background.trim() || "none",
    caption.shadow ? "shadow" : "noshadow",
  ];
  if (band && band.alignY !== "baseline") parts.push("align", band.alignX, band.alignY);
  return parts.join(" ");
}

function quoteRef(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function captionText(
  caption: DashboardCaption,
  band: DashboardBand | null,
  y: number,
  width: number,
): { x: number; baseline: number; anchor: "start" | "middle" | "end"; middle: boolean } {
  const height = dashboardCaptionBand(caption);
  if (!band) {
    return { x: width / 2, baseline: y + caption.fontSize + 6, anchor: "middle", middle: false };
  }
  const x = band.alignX === "center" ? width / 2 : band.alignX === "end" ? width - 12 : 12;
  const anchor = band.alignX === "center" ? "middle" : band.alignX === "end" ? "end" : "start";
  if (band.alignY === "middle") {
    return { x, baseline: y + height / 2, anchor, middle: true };
  }
  if (band.alignY === "bottom") {
    return { x, baseline: y + height - 4 - caption.fontSize * 0.28, anchor, middle: false };
  }
  if (band.alignY === "top") {
    return { x, baseline: y + 4 + caption.fontSize * 0.92, anchor, middle: false };
  }
  return { x, baseline: y + caption.fontSize + 6, anchor, middle: false };
}

function drawCaption(
  svg: {
    rect(x: number, y: number, w: number, h: number, attrs?: Record<string, string | number>): void;
    text(x: number, y: number, content: string, attrs?: Record<string, string | number>): void;
  },
  caption: DashboardCaption,
  band: DashboardBand | null,
  y: number,
  width: number,
  role: string,
  fallbackColor: string,
): void {
  const height = dashboardCaptionBand(caption);
  if (!height) return;
  if (caption.shadow) {
    svg.rect(3, y + 4, Math.max(0, width - 6), height, {
      fill: "#0f172a",
      opacity: 0.2,
      "data-role": `${role}-shadow`,
    });
  }
  if (caption.background.trim()) {
    svg.rect(0, y, width, height, {
      fill: caption.background,
      "data-role": `${role}-background`,
    });
  }
  const placed = captionText(caption, band, y, width);
  svg.text(placed.x, placed.baseline, caption.text, {
    fill: caption.color.trim() || fallbackColor,
    "font-size": caption.fontSize,
    "font-family": caption.font,
    "text-anchor": placed.anchor,
    ...(placed.middle ? { "dominant-baseline": "middle" } : {}),
    "data-role": role,
  });
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

function parseTracks(raw: string): number[] | null {
  const parts = raw.trim().split(/\s+/).filter(Boolean).map(Number);
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  const sum = parts.reduce((total, value) => total + value, 0);
  if (Math.abs(sum - 1) > 0.02) return null;
  const scaled = parts.map((value) => value / sum);
  const head = scaled.slice(0, -1);
  const last = 1 - head.reduce((total, value) => total + value, 0);
  if (last <= 0) return null;
  return [...head, last];
}

function edge(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;
}

/** Старые доли `zone` становятся линиями, диаграмма заполняет ячейки, где лежит её прямоугольник. */
export function legacyZonesToGrid(zones: LegacyZone[]): { cols: number[]; rows: number[]; cells: DashboardCell[] } {
  const xs = new Set<number>([0, 1]);
  const ys = new Set<number>([0, 1]);
  for (const zone of zones) {
    xs.add(edge(zone.x));
    xs.add(edge(zone.x + zone.w));
    ys.add(edge(zone.y));
    ys.add(edge(zone.y + zone.h));
  }
  const xEdges = [...xs].sort((a, b) => a - b);
  const yEdges = [...ys].sort((a, b) => a - b);
  const cols = xEdges.slice(1).map((value, index) => value - xEdges[index]);
  const rows = yEdges.slice(1).map((value, index) => value - yEdges[index]);
  const cells: DashboardCell[] = [];
  for (let row = 0; row < rows.length; row += 1) {
    for (let col = 0; col < cols.length; col += 1) {
      const cx = xEdges[col] + cols[col] / 2;
      const cy = yEdges[row] + rows[row] / 2;
      const owner = zones.find((zone) =>
        cx >= zone.x - 0.0001 && cx <= zone.x + zone.w + 0.0001
        && cy >= zone.y - 0.0001 && cy <= zone.y + zone.h + 0.0001,
      );
      if (!owner) continue;
      cells.push({ col, row, kind: "diagram", ref: owner.diagramId });
    }
  }
  return {
    cols: cols.length > 0 ? cols : [1],
    rows: rows.length > 0 ? rows : [1],
    cells,
  };
}

function emptyModel(): DashboardModel {
  return {
    width: 1280,
    height: 720,
    refreshMs: null,
    title: createDashboardCaption(22, "#ffffff"),
    header: createDashboardBand(16, "#f1f5f9"),
    footer: createDashboardBand(13, "#f8fafc"),
    cols: [1],
    rows: [1],
    cells: [],
  };
}

export function parseDashboard(source: string): ExtParseResult<DashboardModel> {
  const errors: ExtParseError[] = [];
  const model = emptyModel();
  let seenType = false;
  let sawTracks = false;
  const legacy: LegacyZone[] = [];
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
      if (key === "title") model.title = parseCaption(caption[2] ?? "", model.title, false);
      else model[key] = parseCaption(caption[2] ?? "", model[key], true) as DashboardBand;
      continue;
    }
    if (/^cols\b/i.test(raw)) {
      const tracks = parseTracks(raw.replace(/^cols\s+/i, ""));
      if (!tracks) errors.push(error(lineNo, "cols: нужны положительные доли с суммой 1"));
      else {
        model.cols = tracks;
        sawTracks = true;
      }
      continue;
    }
    if (/^rows\b/i.test(raw)) {
      const tracks = parseTracks(raw.replace(/^rows\s+/i, ""));
      if (!tracks) errors.push(error(lineNo, "rows: нужны положительные доли с суммой 1"));
      else {
        model.rows = tracks;
        sawTracks = true;
      }
      continue;
    }
    const cell = /^cell\s+(\d+)\s+(\d+)\s+(diagram|link)\s+(.+)$/i.exec(raw);
    if (cell) {
      const col = Number(cell[1]);
      const row = Number(cell[2]);
      const kind = cell[3].toLowerCase() as "diagram" | "link";
      const ref = unquote(cell[4]);
      if (!ref) errors.push(error(lineNo, "cell: пустая ссылка"));
      else if (kind === "link" && !/^[^/\s]+\/[^/\s]+$/.test(ref)) {
        errors.push(error(lineNo, "cell: ссылка нужна как username/slug"));
      } else if (model.cells.some((item) => item.col === col && item.row === row)) {
        errors.push(error(lineNo, "cell: эта ячейка уже занята"));
      } else {
        model.cells.push({ col, row, kind, ref });
        sawTracks = true;
      }
      continue;
    }
    const zone = /^zone\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+diagram\s+(.+)$/i.exec(raw);
    if (!zone) {
      errors.push(error(lineNo, "ожидается size, refresh, title, header, footer, cols, rows или cell"));
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
    legacy.push({ x, y, w, h, diagramId });
  }

  if (legacy.length > 0 && (sawTracks || model.cells.length > 0)) {
    errors.push(error(1, "zone не смешивается с cols, rows и cell"));
  } else if (legacy.length > 0) {
    const grid = legacyZonesToGrid(legacy);
    model.cols = grid.cols;
    model.rows = grid.rows;
    model.cells = grid.cells;
  }

  for (const cell of model.cells) {
    if (cell.col < 0 || cell.row < 0 || cell.col >= model.cols.length || cell.row >= model.rows.length) {
      errors.push(error(1, "cell: колонка или строка вне сетки"));
    }
  }
  if (model.width <= 0 || model.height <= 0) errors.push(error(1, "size: стороны должны быть больше нуля"));
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: model, errors: [] };
}

export function emitDashboard(model: DashboardModel): string {
  const lines = ["dashboard", `size ${model.width}x${model.height}`];
  if (model.refreshMs !== null) lines.push(`refresh ${formatRefreshInterval(model.refreshMs)}`);
  const titleLine = emitCaption("title", model.title, null);
  const headerLine = emitCaption("header", model.header, model.header);
  const footerLine = emitCaption("footer", model.footer, model.footer);
  if (titleLine) lines.push(titleLine);
  if (headerLine) lines.push(headerLine);
  if (footerLine) lines.push(footerLine);
  lines.push(`cols ${model.cols.map((value) => fmt(value)).join(" ")}`);
  lines.push(`rows ${model.rows.map((value) => fmt(value)).join(" ")}`);
  for (const cell of model.cells) {
    lines.push(`cell ${cell.col} ${cell.row} ${cell.kind} ${quoteRef(cell.ref)}`);
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
  drawCaption(svg, model.title, null, 0, model.width, "title", palette.fg);
  drawCaption(
    svg,
    model.header,
    model.header,
    dashboardCaptionBand(model.title),
    model.width,
    "header",
    palette.fg,
  );
  drawCaption(
    svg,
    model.footer,
    model.footer,
    model.height - dashboardCaptionBand(model.footer),
    model.width,
    "footer",
    palette.fgDim,
  );
  for (let row = 0; row < model.rows.length; row += 1) {
    for (let col = 0; col < model.cols.length; col += 1) {
      const rect = dashboardCellRect(model, col, row);
      const cell = model.cells.find((item) => item.col === col && item.row === row);
      svg.rect(rect.x, rect.y, rect.w, rect.h, {
        fill: "none",
        stroke: palette.fgDim,
        "stroke-width": 1,
        "data-zone": `${col}-${row}`,
        ...(cell ? { "data-diagram": cell.ref, "data-cell": cell.kind } : {}),
      });
      if (!cell) continue;
      const child = options.zoneSvgs?.[dashboardCellKey(cell)];
      if (child && child.includes("<svg")) svg.raw(nestedSvg(child, rect.x, rect.y, rect.w, rect.h));
      else {
        svg.text(rect.x + 8, rect.y + 24, cell.ref, {
          fill: palette.fgDim,
          "font-size": 14,
          "data-zone-empty": cell.ref,
        });
      }
    }
  }
  return svg.toString();
}

export const dashboardEngine: ExtEngine<DashboardModel> = {
  type: "dashboard",
  aliases: ["dashboard"],
  parse: parseDashboard,
  render: renderDashboard,
};
