import {
  extractTrailingColorAttr,
  isValidExtColor,
  parseExtColorsDirective,
  parseExtNumber,
  chartIsDark,
  parseMonoDirective,
  readableTextOnFill,
  resolveSeriesColor,
  shadeColor,
  unquoteExtText,
} from "../color-utils";
import {
  clamp,
  createSvg,
  drawLabelLines,
  fmt,
  labelBlockExtra,
  measureLabelWidth,
  resolvePalette,
  truncateLabel,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export interface VoronoiSite {
  label: string;
  x: number;
  y: number;
  group?: string;
  color?: string;
}

export interface VoronoiModel {
  title?: string;
  x: { label?: string; min: number; max: number };
  y: { label?: string; min: number; max: number };
  showSites: boolean;
  showLabels: boolean;
  fontSize?: number;
  mono: boolean;
  monoInvert: boolean;
  seriesColors: Record<string, string>;
  sites: VoronoiSite[];
}

interface Point2D {
  x: number;
  y: number;
}

const FONT_BASE = 11;
const FONT_MIN = 6;
const FONT_MAX = 28;
const PLOT_WIDTH = 480;
const PLOT_HEIGHT = 320;
const PADDING = { top: 46, right: 24, bottom: 52, left: 64 };
const SITE_DOT_RADIUS = 3.5;
const CELL_FILL_OPACITY = 0.65;
const EPSILON = 1e-7;

/**
 * Отсечение выпуклого многоугольника полуплоскостью точек, которые ближе к `site`, чем к `other`.
 * Уравнение биссектрисы: (p - mid) · (other - site) <= 0.
 */
function clipPolygonBisector(
  poly: readonly Point2D[],
  site: Point2D,
  other: Point2D,
): Point2D[] {
  if (poly.length === 0) return [];
  const dx = other.x - site.x;
  const dy = other.y - site.y;
  if (Math.hypot(dx, dy) < EPSILON) return [...poly];

  const mx = (site.x + other.x) / 2;
  const my = (site.y + other.y) / 2;
  const distSigned = (p: Point2D) => (p.x - mx) * dx + (p.y - my) * dy;

  const out: Point2D[] = [];
  for (let i = 0; i < poly.length; i += 1) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const dCur = distSigned(cur);
    const dPrev = distSigned(prev);
    const curInside = dCur <= EPSILON;
    const prevInside = dPrev <= EPSILON;

    if (curInside !== prevInside) {
      const denom = dPrev - dCur;
      const t = Math.abs(denom) > EPSILON ? dPrev / denom : 0.5;
      out.push({
        x: prev.x + t * (cur.x - prev.x),
        y: prev.y + t * (cur.y - prev.y),
      });
    }
    if (curInside) {
      out.push(cur);
    }
  }
  return out;
}

function polygonCentroid(poly: readonly Point2D[]): Point2D {
  if (poly.length === 0) return { x: 0, y: 0 };
  if (poly.length < 3) {
    const sx = poly.reduce((a, p) => a + p.x, 0) / poly.length;
    const sy = poly.reduce((a, p) => a + p.y, 0) / poly.length;
    return { x: sx, y: sy };
  }
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const p0 = poly[i];
    const p1 = poly[(i + 1) % poly.length];
    const cross = p0.x * p1.y - p1.x * p0.y;
    area2 += cross;
    cx += (p0.x + p1.x) * cross;
    cy += (p0.y + p1.y) * cross;
  }
  if (Math.abs(area2) < EPSILON) {
    const sx = poly.reduce((a, p) => a + p.x, 0) / poly.length;
    const sy = poly.reduce((a, p) => a + p.y, 0) / poly.length;
    return { x: sx, y: sy };
  }
  return { x: cx / (3 * area2), y: cy / (3 * area2) };
}

function parseAxisDirective(
  body: string,
): { axis?: { label?: string; min: number; max: number }; error?: string } {
  const m = /^(.*?)\s*(-?[\d\s_.,]+)\s*-->\s*(-?[\d\s_.,]+)\s*$/.exec(body);
  if (!m) return { error: `ожидается «"<подпись>" <min> --> <max>»` };
  const min = parseExtNumber(m[2]);
  const max = parseExtNumber(m[3]);
  if (min === null || max === null || max <= min) {
    return { error: `максимум оси должен быть больше минимума` };
  }
  const label = unquoteExtText(m[1]) || undefined;
  return { axis: { label, min, max } };
}

function parseSiteLine(
  rawLine: string,
  lineNo: number,
): { site?: VoronoiSite; error?: ExtParseError } {
  const colonIdx = rawLine.indexOf(":");
  if (colonIdx < 0) {
    return {
      error: {
        message: `ожидается «Подпись : x=…, y=…» или «Подпись : X, Y», получено «${rawLine}»`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const label = unquoteExtText(rawLine.slice(0, colonIdx));
  if (!label) {
    return {
      error: { message: `пустая подпись точки перед «:»`, line: lineNo, col: 0 },
    };
  }

  const colorExt = extractTrailingColorAttr(rawLine.slice(colonIdx + 1), lineNo);
  if (colorExt.error) return { error: colorExt.error };

  const body = colorExt.rest;
  let siteColor = colorExt.color;
  let group: string | undefined;

  if (body.includes("=")) {
    const fields: Record<string, string> = {};
    for (const chunk of body.split(",")) {
      const piece = chunk.trim();
      if (!piece) continue;
      const eq = piece.indexOf("=");
      if (eq < 0) {
        return {
          error: {
            message: `точка «${label}»: ожидается пара «ключ=значение», получено «${piece}»`,
            line: lineNo,
            col: 0,
          },
        };
      }
      const key = piece.slice(0, eq).trim().toLowerCase();
      const val = unquoteExtText(piece.slice(eq + 1));
      if (!["x", "y", "group", "color", "colour", "fill"].includes(key)) {
        return {
          error: {
            message: `неизвестный ключ «${key}» в точке «${label}» (допустимы x, y, group, color)`,
            line: lineNo,
            col: 0,
          },
        };
      }
      fields[key] = val;
    }

    const rawColor = fields.color ?? fields.colour ?? fields.fill;
    if (rawColor !== undefined) {
      if (!isValidExtColor(rawColor)) {
        return {
          error: {
            message: `не удалось разобрать цвет «${rawColor}» в точке «${label}»`,
            line: lineNo,
            col: 0,
          },
        };
      }
      siteColor = rawColor;
    }

    const x = parseExtNumber(fields.x ?? "");
    const y = parseExtNumber(fields.y ?? "");
    if (x === null || y === null) {
      return {
        error: {
          message: `не удалось разобрать координаты точки «${label}» (требуются числа x и y)`,
          line: lineNo,
          col: 0,
        },
      };
    }

    if (fields.group) group = unquoteExtText(fields.group);
    return { site: { label, x, y, group, color: siteColor } };
  }

  // Короткая позиционная запись: `Подпись : 25, 60 [, Группа]`
  const parts = body
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts.length > 3) {
    return {
      error: {
        message: `точка «${label}»: ожидается «x, y [, группа]», получено ${parts.length} полей`,
        line: lineNo,
        col: 0,
      },
    };
  }
  const x = parseExtNumber(parts[0]);
  const y = parseExtNumber(parts[1]);
  if (x === null || y === null) {
    return {
      error: {
        message: `не удалось разобрать координаты точки «${label}»`,
        line: lineNo,
        col: 0,
      },
    };
  }
  if (parts[2]) group = unquoteExtText(parts[2]);

  return { site: { label, x, y, group, color: siteColor } };
}

export function parseVoronoi(source: string): ExtParseResult<VoronoiModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let xAxis: VoronoiModel["x"] | undefined;
  let yAxis: VoronoiModel["y"] | undefined;
  let showSites = true;
  let showLabels = true;
  let fontSize: number | undefined;
  let mono = false;
  let monoInvert = false;
  const seriesColors: Record<string, string> = {};
  const sites: VoronoiSite[] = [];

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

      if (/^x\b/i.test(raw) && !raw.includes(":")) {
        const parsed = parseAxisDirective(raw.slice(1).trim());
        if (parsed.error || !parsed.axis) {
          errors.push({
            message: `ось «x»: ${parsed.error ?? "ожидается min --> max"}`,
            line: lineNo,
            col: 0,
          });
        } else {
          xAxis = parsed.axis;
        }
        continue;
      }

      if (/^y\b/i.test(raw) && !raw.includes(":")) {
        const parsed = parseAxisDirective(raw.slice(1).trim());
        if (parsed.error || !parsed.axis) {
          errors.push({
            message: `ось «y»: ${parsed.error ?? "ожидается min --> max"}`,
            line: lineNo,
            col: 0,
          });
        } else {
          yAxis = parsed.axis;
        }
        continue;
      }

      if (/^sites\b/i.test(raw) && !raw.includes(":")) {
        const arg = raw.replace(/^sites\s*/i, "").trim().toLowerCase();
        if (!arg || arg === "on") showSites = true;
        else if (arg === "off") showSites = false;
        else {
          errors.push({
            message: `ожидается «sites on» или «sites off», получено «${arg}»`,
            line: lineNo,
            col: 0,
          });
        }
        continue;
      }

      if (/^labels\b/i.test(raw) && !raw.includes(":")) {
        const arg = raw.replace(/^labels\s*/i, "").trim().toLowerCase();
        if (!arg || arg === "on") showLabels = true;
        else if (arg === "off" || arg === "none") showLabels = false;
        else {
          errors.push({
            message: `ожидается «labels on» или «labels off», получено «${arg}»`,
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
        else if (parsed.mono !== undefined) {
          mono = parsed.mono;
          monoInvert = Boolean(parsed.monoInvert);
        }
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
      const parsed = parseSiteLine(raw, lineNo);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.site) sites.push(parsed.site);
      continue;
    }

    errors.push({
      message: `неизвестная директива «${raw.split(/\s+/)[0]}» (допустимы title, x, y, sites, labels, fontsize, mono, colors, data или строка точки)`,
      line: lineNo,
      col: 0,
    });
  }

  if (sites.length === 0 && errors.length === 0) {
    errors.push({
      message: `нет данных: ожидается хотя бы одна точка «Имя : x=…, y=…»`,
      line: 1,
      col: 0,
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  const xs = sites.map((s) => s.x);
  const ys = sites.map((s) => s.y);
  const minX = Math.min(0, ...xs);
  const maxX = Math.max(100, ...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(100, ...ys);

  return {
    ok: true,
    errors: [],
    value: {
      title,
      x: xAxis ?? { min: minX, max: maxX === minX ? minX + 100 : maxX },
      y: yAxis ?? { min: minY, max: maxY === minY ? minY + 100 : maxY },
      showSites,
      showLabels,
      fontSize,
      mono,
      monoInvert,
      seriesColors,
      sites,
    },
  };
}

export function renderVoronoi(model: VoronoiModel, options: ExtRenderOptions): string {
  const palette = resolvePalette(chartIsDark(options.dark, model.monoInvert), options.background, options.textColor);
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const titleSize = clamp(Math.round(fontSize * 1.36), 14, 26);

  const groups: string[] = [];
  for (const s of model.sites) {
    if (s.group && !groups.includes(s.group)) groups.push(s.group);
  }
  const hasGroups = groups.length > 0;
  const groupExtra = hasGroups ? Math.max(0, ...groups.map((group) => labelBlockExtra(group, fontSize))) : 0;
  const legendExtraHeight = hasGroups ? 28 + groupExtra : 0;
  const titleExtra = labelBlockExtra(model.title, titleSize);
  const yExtra = labelBlockExtra(model.y.label, fontSize);
  const xExtra = labelBlockExtra(model.x.label, fontSize);

  const padTop = (model.title ? PADDING.top : 24) + titleExtra;
  const padLeft = (model.y.label ? PADDING.left : 32) + yExtra;
  const padBottom = (model.x.label ? PADDING.bottom : 28) + legendExtraHeight + xExtra;
  const width = padLeft + PLOT_WIDTH + PADDING.right;
  const height = padTop + PLOT_HEIGHT + padBottom;

  const plotLeft = padLeft;
  const plotTop = padTop;
  const plotRight = plotLeft + PLOT_WIDTH;
  const plotBottom = plotTop + PLOT_HEIGHT;

  const xSpan = model.x.max - model.x.min || 1;
  const ySpan = model.y.max - model.y.min || 1;

  const px = (vx: number): number => plotLeft + clamp((vx - model.x.min) / xSpan, 0, 1) * PLOT_WIDTH;
  const py = (vy: number): number =>
    plotBottom - clamp((vy - model.y.min) / ySpan, 0, 1) * PLOT_HEIGHT;

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

  const basePoly: Point2D[] = [
    { x: plotLeft, y: plotTop },
    { x: plotRight, y: plotTop },
    { x: plotRight, y: plotBottom },
    { x: plotLeft, y: plotBottom },
  ];

  // Слегка разводим совпадающие по координатам сайты, чтобы не вырождалась биссектриса
  const pixelSites: Point2D[] = model.sites.map((s, idx) => ({
    x: px(s.x) + (idx % 3 - 1) * 1e-4,
    y: py(s.y) + (Math.floor(idx / 3) % 3 - 1) * 1e-4,
  }));

  const cellPolygons: Point2D[][] = pixelSites.map((site, idx) => {
    let cell = [...basePoly];
    for (let j = 0; j < pixelSites.length; j += 1) {
      if (j === idx) continue;
      cell = clipPolygonBisector(cell, site, pixelSites[j]);
      if (cell.length === 0) break;
    }
    return cell;
  });

  model.sites.forEach((site, idx) => {
    const poly = cellPolygons[idx];
    if (poly.length < 3) return;

    const colorIndex = site.group ? groups.indexOf(site.group) : idx;
    const baseColor = resolveSeriesColor(colorIndex, {
      explicitColor: site.color,
      seriesColors: model.seriesColors,
      mono: model.mono,
      dark: chartIsDark(options.dark, model.monoInvert),
    });
    const fill = shadeColor(baseColor, options.dark ? -0.15 : 0.35);

    const d = `M ${poly.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join(" L ")} Z`;
    svg.path(d, {
      fill,
      "fill-opacity": CELL_FILL_OPACITY,
      stroke: palette.bg,
      "stroke-width": 1.8,
      "stroke-linejoin": "round",
      "data-cell": site.label,
    });
  });

  // Внешняя рамка области Вороного
  svg.rect(plotLeft, plotTop, PLOT_WIDTH, PLOT_HEIGHT, {
    fill: "none",
    stroke: palette.axis,
    "stroke-width": 1.2,
  });

  // Точки-сайты и подписи в центроидах ячеек
  model.sites.forEach((site, idx) => {
    const poly = cellPolygons[idx];
    const pt = pixelSites[idx];
    const colorIndex = site.group ? groups.indexOf(site.group) : idx;
    const baseColor = resolveSeriesColor(colorIndex, {
      explicitColor: site.color,
      seriesColors: model.seriesColors,
      mono: model.mono,
      dark: chartIsDark(options.dark, model.monoInvert),
    });
    const cellFill = shadeColor(baseColor, options.dark ? -0.15 : 0.35);
    const textFill = readableTextOnFill(cellFill, palette.fg);

    if (model.showSites) {
      svg.circle(pt.x, pt.y, SITE_DOT_RADIUS, {
        fill: shadeColor(baseColor, -0.25),
        stroke: palette.bg,
        "stroke-width": 1.2,
      });
    }

    if (model.showLabels && poly.length >= 3) {
      const centroid = polygonCentroid(poly);
      const minX = Math.min(...poly.map((p) => p.x));
      const maxX = Math.max(...poly.map((p) => p.x));
      const maxLabelW = Math.max(36, (maxX - minX) * 0.82);
      const labelY =
        model.showSites && Math.hypot(centroid.x - pt.x, centroid.y - pt.y) < fontSize
          ? centroid.y - fontSize * 0.75
          : centroid.y + fontSize * 0.35;

      drawLabelLines(
        svg,
        centroid.x,
        labelY,
        truncateLabel(site.label, maxLabelW, fontSize),
        fontSize,
        {
          "font-size": fontSize,
          "font-weight": 600,
          fill: textFill,
        },
        "center",
      );
    }
  });

  if (model.x.label) {
    drawLabelLines(svg, (plotLeft + plotRight) / 2, plotBottom + 26, model.x.label, fontSize, {
      "font-size": fontSize,
      fill: palette.fgDim,
    });
  }

  if (model.y.label) {
    const cx = 18 + yExtra;
    const cy = plotTop + PLOT_HEIGHT / 2;
    drawLabelLines(svg, cx, cy, model.y.label, fontSize, {
      "text-anchor": "middle",
      "font-size": fontSize,
      fill: palette.fgDim,
      transform: `rotate(-90 ${fmt(cx)} ${fmt(cy)})`,
    }, "up");
  }

  if (hasGroups) {
    const swatch = 10;
    let lx = plotLeft;
    const ly = height - 14 - groupExtra;
    groups.forEach((grp, idx) => {
      const color = resolveSeriesColor(idx, {
        seriesColors: model.seriesColors,
        mono: model.mono,
        dark: chartIsDark(options.dark, model.monoInvert),
      });
      svg.rect(lx, ly - swatch + 2, swatch, swatch, { fill: color, rx: 2 });
      drawLabelLines(svg, lx + swatch + 6, ly, grp, fontSize, {
        "text-anchor": "start",
        "font-size": fontSize,
        fill: palette.fgDim,
      });
      lx += swatch + 6 + measureLabelWidth(grp, fontSize) + 18;
    });
  }

  return svg.toString();
}

export const voronoiEngine: ExtEngine<VoronoiModel> = {
  type: "voronoi",
  aliases: ["voronoi", "voronoi-diagram"],
  parse: parseVoronoi,
  render: renderVoronoi,
};
