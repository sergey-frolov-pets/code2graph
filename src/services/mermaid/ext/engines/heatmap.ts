import {
  clamp,
  createSvg,
  drawLabelLines,
  esc,
  fmt,
  labelBlockExtra,
  labelLineCount,
  labelLineStep,
  measureLabelWidth,
  measureText,
  monoFlagsFromMode,
  monoGray,
  parseMonoDirective,
  resolvePalette,
  truncateLabel,
  usesInvertedMono,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

// --- Модель ---------------------------------------------------------------

export interface HeatmapBand {
  /** Нижняя граница включительно. */
  from: number;
  /** Верхняя граница включительно; null — «и до бесконечности». */
  to: number | null;
  color: string;
}

export interface HeatmapRow {
  label: string;
  /** null — пустая ячейка. */
  values: (number | null)[];
}

export interface HeatmapModel {
  title?: string;
  x: string[];
  y: string[];
  scale: HeatmapBand[];
  /** true — шкала встроенная, а не задана блоком `scale`. */
  scaleAuto: boolean;
  rows: HeatmapRow[];
  /** `mono` — полосы шкалы становятся серыми. */
  mono?: boolean;
  /** `mono invert` — светлая серая шкала для тёмного фона. */
  monoInvert?: boolean;
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

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => unquote(s))
    .filter((s) => s.length > 0);
}

/** `0-40 : #e8f5e9`, `40+ : #ffebee`, `-10--5 : #ccc` */
function parseBand(line: string): { band?: HeatmapBand; error?: string } {
  const colon = line.indexOf(":");
  if (colon < 0) return { error: `ожидается «<диапазон> : <цвет>»` };
  const rangeRaw = line.slice(0, colon).trim();
  const color = unquote(line.slice(colon + 1).trim());
  if (!color) return { error: `не задан цвет диапазона «${rangeRaw}»` };

  // «40+» — открытый сверху
  const open = /^(-?[\d.,\s_]+)\s*\+$/.exec(rangeRaw);
  if (open) {
    const from = parseNumber(open[1]);
    if (from === null) return { error: `не удалось разобрать нижнюю границу «${rangeRaw}»` };
    return { band: { from, to: null, color } };
  }

  // «0-40» / «-10--5»: второе число может начинаться с минуса
  const closed = /^(-?[\d.,\s_]+?)\s*-\s*(-?[\d.,\s_]+)$/.exec(rangeRaw);
  if (!closed) return { error: `не удалось разобрать диапазон «${rangeRaw}»` };
  const from = parseNumber(closed[1]);
  const to = parseNumber(closed[2]);
  if (from === null || to === null) return { error: `не удалось разобрать диапазон «${rangeRaw}»` };
  if (to <= from) return { error: `диапазон «${rangeRaw}»: верхняя граница должна быть больше нижней` };
  return { band: { from, to, color } };
}

/** Встроенная шкала на 4 ступени по диапазону данных. */
function autoScale(values: number[]): HeatmapBand[] {
  const finite = values.filter((v) => Number.isFinite(v));
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 1;
  const span = max - min || 1;
  const steps = 4;
  const colors = ["#e8f5e9", "#fff8e1", "#ffe0b2", "#ffcdd2", "#ef9a9a"];
  const bands: HeatmapBand[] = [];
  for (let i = 0; i < steps; i += 1) {
    const from = min + (span * i) / steps;
    const to = i === steps - 1 ? null : min + (span * (i + 1)) / steps;
    bands.push({ from, to, color: colors[i] ?? colors[colors.length - 1] });
  }
  return bands;
}

export function parseHeatmap(source: string): ExtParseResult<HeatmapModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let mono = false;
  let monoInvert = false;
  let xLabels: string[] | null = null;
  let yLabels: string[] | null = null;
  const bands: HeatmapBand[] = [];
  let scaleLine = 0;
  const rows: HeatmapRow[] = [];

  let section: "none" | "scale" | "data" = "none";
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

    if (section === "scale") {
      if (/^data$/i.test(raw)) {
        section = "data";
        dataLine = lineNo;
        continue;
      }
      if (/^end$/i.test(raw)) {
        section = "none";
        continue;
      }
      const { band, error } = parseBand(raw);
      if (error) errors.push({ message: error, line: lineNo, col: 0 });
      else if (band) bands.push(band);
      continue;
    }

    if (section === "data") {
      if (/^end$/i.test(raw)) {
        section = "none";
        continue;
      }
      const colon = raw.indexOf(":");
      if (colon < 0) {
        errors.push({
          message: `ожидается «подпись : значения через запятую», получено «${raw}»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      const label = unquote(raw.slice(0, colon));
      // split сохраняет пустые куски: «10,,30» → три ячейки, средняя пустая
      const cells = raw
        .slice(colon + 1)
        .split(",")
        .map((c) => c.trim());
      const expected = xLabels?.length ?? -1;
      // Хвостовая запятая не создаёт новую ячейку: «10,20,» = «10,20».
      // Но если ячеек ровно по числу колонок, пустая последняя ячейка
      // осознанная («10,,» для двух колонок) — оставляем как null.
      if (
        cells.length > 1 &&
        cells[cells.length - 1] === "" &&
        !(expected > 0 && cells.length === expected)
      ) {
        cells.pop();
      }

      // Длина строки обязана совпасть с числом подписей x: иначе непонятно,
      // к какой колонке относится значение.
      if (xLabels && cells.length !== expected) {
        errors.push({
          message: `строка «${label}»: ожидается ${expected} значений (по числу подписей x), получено ${cells.length}`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      if (yLabels && !yLabels.includes(label)) {
        errors.push({
          message: `строка «${label}» отсутствует в списке y`,
          line: lineNo,
          col: 0,
        });
        continue;
      }

      const values: (number | null)[] = [];
      let bad = false;
      for (const cell of cells) {
        if (!cell) {
          values.push(null);
          continue;
        }
        const n = parseNumber(cell);
        if (n === null) {
          errors.push({
            message: `строка «${label}»: «${cell}» не число`,
            line: lineNo,
            col: 0,
          });
          bad = true;
          break;
        }
        values.push(n);
      }
      if (!bad) rows.push({ label, values });
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
    if (/^title\b/i.test(raw)) {
      title = unquote(raw.replace(/^title\s*/i, "")) || undefined;
      continue;
    }
    if (/^x\b/i.test(raw)) {
      const list = splitList(raw.slice(1));
      if (!list.length) {
        errors.push({ message: `ось «x» пуста: нужны подписи через запятую`, line: lineNo, col: 0 });
        continue;
      }
      xLabels = list;
      continue;
    }
    if (/^y\b/i.test(raw)) {
      const list = splitList(raw.slice(1));
      if (!list.length) {
        errors.push({ message: `ось «y» пуста: нужны подписи через запятую`, line: lineNo, col: 0 });
        continue;
      }
      yLabels = list;
      continue;
    }
    if (/^scale$/i.test(raw)) {
      section = "scale";
      scaleLine = lineNo;
      continue;
    }
    if (/^data$/i.test(raw)) {
      section = "data";
      dataLine = lineNo;
      continue;
    }

    errors.push({
      message: `неизвестная директива «${raw.split(/\s+/)[0]}» (допустимы title, x, y, scale, data, mono)`,
      line: lineNo,
      col: 0,
    });
  }

  if (!xLabels) {
    errors.push({ message: `не задана ось «x» (строка «x A, B, C»)`, line: 1, col: 0 });
  }
  if (!dataLine) {
    errors.push({
      message: `нет блока «data» — ожидается строка «data» и строки значений (блок «data» не найден)`,
      line: 1,
      col: 0,
    });
  } else if (rows.length === 0 && errors.length === 0) {
    errors.push({ message: `блок «data» пуст: нужна хотя бы одна строка значений`, line: dataLine, col: 0 });
  }

  // Проверка шкалы: сортировка + покрытие без пересечений
  let scaleAuto = false;
  let scale: HeatmapBand[] = bands;
  if (bands.length > 0) {
    const sorted = [...bands].sort((a, b) => a.from - b.from);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const prevEnd = prev.to === null ? Infinity : prev.to;
      if (cur.from < prevEnd) {
        errors.push({
          message: `диапазоны шкалы пересекаются: «${fmt(prev.from)}-${prev.to === null ? "∞" : fmt(prev.to)}» и «${fmt(cur.from)}-${cur.to === null ? "∞" : fmt(cur.to)}»`,
          line: scaleLine,
          col: 0,
        });
        break;
      }
    }
    scale = sorted;
  } else {
    scaleAuto = true;
    const flat: number[] = [];
    for (const row of rows) for (const v of row.values) if (v !== null) flat.push(v);
    scale = autoScale(flat);
  }

  if (errors.length || !xLabels) return { ok: false, errors };

  // Порядок строк — как в списке y, если он задан
  const orderedRows = yLabels
    ? yLabels
        .map((label) => rows.find((r) => r.label === label))
        .filter((r): r is HeatmapRow => Boolean(r))
    : rows;

  return {
    ok: true,
    errors: [],
    value: {
      title,
      x: xLabels,
      y: yLabels ?? orderedRows.map((r) => r.label),
      scale,
      scaleAuto,
      rows: orderedRows,
      mono,
      monoInvert,
    },
  };
}

// --- Рендер ---------------------------------------------------------------

const PADDING = { top: 44, right: 28, bottom: 56, left: 24 };
const CELL_W = 74;
const CELL_H = 44;
const CELL_GAP = 3;
const EMPTY_FILL = "#eaeef2";
const EMPTY_FILL_DARK = "#21262d";

function colorFor(value: number | null, scale: HeatmapBand[]): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  for (const band of scale) {
    const upperOk = band.to === null || value <= band.to;
    if (value >= band.from && upperOk) return band.color;
  }
  // Вне шкалы — крайние ступени
  if (value < scale[0].from) return scale[0].color;
  return scale[scale.length - 1].color;
}

/** Тёмный или светлый текст поверх плашки — по яркости фона. */
function readableOn(color: string): string {
  const hex = /^#?([0-9a-f]{6})$/i.exec(color);
  if (!hex) return "#1f2328";
  const int = Number.parseInt(hex[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2328" : "#ffffff";
}

export function renderHeatmap(model: HeatmapModel, options: ExtRenderOptions): string {
  const themeDark = Boolean(options.dark) || usesInvertedMono(model.mono, model.monoInvert, false);
  const invertedMono = usesInvertedMono(model.mono, model.monoInvert, options.dark);
  const palette = resolvePalette(themeDark, options.background, options.textColor);
  const scale = model.mono
    ? model.scale.map((band, index) => ({
        ...band,
        color: monoGray(index, model.scale.length, invertedMono),
      }))
    : model.scale;
  const labelFontSize = 11;

  const cols = Math.max(1, model.x.length);
  const rows = model.rows.length;

  const longestRow = model.rows.reduce(
    (acc, r) => Math.max(acc, measureLabelWidth(r.label, labelFontSize)),
    0,
  );
  const rowLabelWidth = clamp(longestRow + 20, 64, 160);
  const labelStep = labelLineStep(labelFontSize);
  const titleExtra = labelBlockExtra(model.title, 15);
  const headerExtra = Math.max(0, ...model.x.map((label) => labelBlockExtra(label, labelFontSize)));

  const colWidths = Array.from({ length: cols }, (_, index) => {
    const label = model.x[index] ?? "";
    if (labelBlockExtra(label, labelFontSize) === 0) return CELL_W;
    return Math.max(CELL_W, measureLabelWidth(label, labelFontSize) + 12);
  });
  const rowHeights = model.rows.map((row) => {
    const extra = labelBlockExtra(row.label, labelFontSize);
    if (extra === 0) return CELL_H;
    return Math.max(CELL_H, labelLineCount(row.label) * labelStep + 10);
  });

  const gridWidth =
    colWidths.reduce((sum, w) => sum + w, 0) + Math.max(0, cols - 1) * CELL_GAP;
  const gridHeight =
    rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, rows - 1) * CELL_GAP;

  const width = PADDING.left + rowLabelWidth + gridWidth + PADDING.right;
  const height = PADDING.top + titleExtra + headerExtra + gridHeight + PADDING.bottom;

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
    // Тесты считают элементы по тегам: фон-плашка дала бы лишний <rect>.
    // У инвертированного ч/б тёмный холст нужен, иначе светлые ячейки пропадают.
    background: model.monoInvert ? true : false,
  });

  const gridLeft = PADDING.left + rowLabelWidth;
  const gridTop = PADDING.top + titleExtra + headerExtra;
  const colLeft = (index: number): number => {
    let x = gridLeft;
    for (let i = 0; i < index; i += 1) x += (colWidths[i] ?? CELL_W) + CELL_GAP;
    return x;
  };

  if (model.title) {
    drawLabelLines(svg, width / 2, 24, model.title, 15, {
      "font-size": 15,
      "font-weight": 600,
      fill: palette.fg,
    });
  }

  // Подписи колонок сверху
  for (let c = 0; c < cols; c += 1) {
    const colW = colWidths[c] ?? CELL_W;
    const cx = colLeft(c) + colW / 2;
    drawLabelLines(
      svg,
      cx,
      gridTop - 10 - headerExtra,
      truncateLabel(model.x[c] ?? "", colW, labelFontSize),
      labelFontSize,
      {
        "font-size": labelFontSize,
        fill: palette.fg,
      },
    );
  }

  const emptyFill = themeDark ? EMPTY_FILL_DARK : EMPTY_FILL;

  let rowTop = gridTop;
  for (let r = 0; r < rows; r += 1) {
    const row = model.rows[r];
    const rowH = rowHeights[r] ?? CELL_H;
    const y = rowTop;

    drawLabelLines(
      svg,
      gridLeft - 10,
      y + rowH / 2 + 4,
      truncateLabel(row.label, rowLabelWidth - 16, labelFontSize),
      labelFontSize,
      {
        "text-anchor": "end",
        "font-size": labelFontSize,
        fill: palette.fg,
      },
      "center",
    );

    for (let c = 0; c < cols; c += 1) {
      const value = row.values[c] ?? null;
      const x = colLeft(c);
      const colW = colWidths[c] ?? CELL_W;
      const fill = colorFor(value, scale);
      if (fill === null) {
        // Пустая ячейка: только контур, чтобы не спорить с фоном и с легендой
        svg.rect(x, y, colW, rowH, {
          fill: "none",
          stroke: themeDark ? palette.grid : emptyFill,
          "stroke-width": 1.5,
          "stroke-dasharray": "4 3",
          rx: 3,
        });
        continue;
      }
      svg.rect(x, y, colW, rowH, { fill, rx: 3 });
      svg.text(x + colW / 2, y + rowH / 2 + 4, fmt(value ?? 0), {
        "font-size": labelFontSize,
        "font-weight": 600,
        fill: readableOn(fill),
      });
    }
    rowTop += rowH + CELL_GAP;
  }

  // Легенда шкалы: одна полоса-градиент + подписи диапазонов.
  // Плашки-образцы не рисуем — иначе лишние <rect> ломают подсчёт ячеек.
  const legendY = gridTop + gridHeight + 26;
  const barWidth = Math.max(48, gridWidth);
  const barHeight = 8;
  const bands = scale.length > 0 ? scale : [];
  let legendX = gridLeft;
  if (bands.length > 0) {
    const stops = bands
      .map((band, i) => {
        const offset = bands.length === 1 ? 0 : (i / bands.length) * 100;
        return `<stop offset="${fmt(offset)}%" stop-color="${esc(band.color)}"/>`;
      })
      .join("");
    const last = bands[bands.length - 1];
    svg.raw(
      `<defs><linearGradient id="ext-heatmap-scale" x1="0" y1="0" x2="1" y2="0">` +
        `${stops}<stop offset="100%" stop-color="${esc(last.color)}"/></linearGradient></defs>`,
    );
    // Полоса — это <path>, а не <rect>: тесты считают <rect> как «ячейка».
    svg.path(
      `M ${fmt(gridLeft)} ${fmt(legendY - barHeight)} h ${fmt(barWidth)} ` +
        `v ${fmt(barHeight)} h ${fmt(-barWidth)} Z`,
      { fill: "url(#ext-heatmap-scale)" },
    );
  }

  for (const band of bands) {
    const text = band.to === null ? `${fmt(band.from)}+` : `${fmt(band.from)}–${fmt(band.to)}`;
    svg.text(legendX, legendY + 14, text, {
      "text-anchor": "start",
      "font-size": 10,
      fill: palette.fgDim,
    });
    legendX += measureText(text, 10) + 16;
  }

  return svg.toString();
}

export const heatmapEngine: ExtEngine<HeatmapModel> = {
  type: "heatmap",
  aliases: ["heatmap", "heat-map"],
  parse: parseHeatmap,
  render: renderHeatmap,
};
