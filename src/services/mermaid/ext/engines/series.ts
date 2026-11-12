import {
  isValidExtColor,
  parseExtColorsDirective,
  parseExtNumber,
  chartIsDark,
  parseMonoDirective,
  readableTextOnFill,
  resolveSeriesColor,
  unquoteExtText,
} from "../color-utils";
import {
  arrowMarker,
  clamp,
  createSvg,
  drawLabelLines,
  esc,
  fixedTicks,
  breakEdgeBaselines,
  fmt,
  labelBlockExtra,
  labelLineCount,
  labelLineStep,
  measureLabelWidth,
  measureText,
  niceRange,
  niceTicks,
  resolvePalette,
  truncateLabel,
  type Palette,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";
import { growPlotToAspect, parseAspectDirective, type ChartAspect } from "../chart-aspect";
import { parseBreak, parseLine } from "./waterfall/directive-parsers";

export type ClusteredLabelsMode = "above" | "inside" | "none";

/** Зазор между барами: пиксели или доля ширины (процент строго меньше 100). */
export interface SeriesBarGap {
  unit: "px" | "percent";
  value: number;
}

/** Пропуск на горизонтальной шкале: бара или точки линии в этой категории нет. */
export type SeriesSlot = number | null;

export type SeriesLineStyle = "solid" | "dash" | "dot" | "dashdot";

/** Ось значений: основная `y` (слева / снизу) или вторая `y2` (справа / сверху). */
export type SeriesAxisId = "y" | "y2";

export interface ClusteredSeries {
  name: string;
  values: SeriesSlot[];
  color?: string;
  /** `axis=y2` — бары строятся по второй шкале. Без атрибута — по основной `y`. */
  axis?: SeriesAxisId;
}

/** Ломаная поверх столбцов. Подпись рисуется справа от края зоны графика. */
export interface SeriesLine {
  label?: string;
  values: SeriesSlot[];
  color?: string;
  width?: number;
  style?: SeriesLineStyle;
  /** `axis=y2` — ломаная строится по второй шкале. Без атрибута — по основной `y`. */
  axis?: SeriesAxisId;
}

/**
 * Разрыв шкалы значений, как в waterfall: участок `(after, before)` вырезается.
 * `break <после> --> <до> ["подпись"]`
 */
export interface SeriesAxisBreak {
  after: number;
  before: number;
  label?: string;
}

/**
 * Горизонтальная линия уровня (план, цель, порог).
 * `line <значение> ["подпись"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]`
 * Ломаная по категориям — другая форма: `line Подпись : зн1, зн2, …`.
 */
export interface SeriesThreshold {
  value: number;
  label?: string;
  color?: string;
  width?: number;
  style?: SeriesLineStyle;
  /** `axis=y2` — уровень задан в единицах второй шкалы. Без атрибута — основной `y`. */
  axis?: SeriesAxisId;
}

/**
 * CAGR между двумя барами одной серии.
 * `from` / `to` — индексы категорий с нуля. Стрелка идёт от `from` к `to`.
 * `label` заменяет текст овала целиком; иначе овал — `prefix` + отформатированный процент.
 */
export interface SeriesCagr {
  seriesIndex: number;
  from: number;
  to: number;
  format?: string;
  prefix?: string;
  label?: string;
}

export interface ClusteredModel {
  title?: string;
  categories: string[];
  y?: { label?: string; min?: number; max?: number };
  /**
   * Вторая ось значений (`y2 "подпись" min --> max`): справа на вертикальной
   * диаграмме, сверху — на повёрнутой. Появляется и без директивы, если хоть
   * одна серия, линия или уровень помечены `axis=y2` (шкала — автоматическая).
   */
  y2?: { label?: string; min?: number; max?: number };
  /** Поворот на 90 градусов: горизонтальные сгруппированные полосы вместо вертикальных столбцов. */
  rotate90: boolean;
  /**
   * Вместе с `rotate 90` переворачивает вертикальную ось категорий:
   * первая категория оказывается снизу. Без поворота на раскладку не влияет.
   */
  invertY: boolean;
  /** `stacked` и `stacked area` — серии в одном столбце, а не рядом. */
  stack: boolean;
  /** `stacked area` — стопка рисуется площадями между центрами категорий. */
  area: boolean;
  /** Подписи категорий (`axis x`). */
  categoryAxis: boolean;
  /** Линия, подписи и ноль второй оси. Сетка `y2` задаётся отдельно. */
  y2Axis: boolean;
  grid: boolean;
  gridStep?: number;
  /** Сетка второй оси. Без `grid y2` не рисуется. */
  y2Grid: boolean;
  y2GridStep?: number;
  /** `gap 12` или `gap 20%`. Без директивы — прежние константы раскладки. */
  barGap?: SeriesBarGap;
  /** `labels sum` — сумма частей снаружи стопки. Ноль не подписывается. */
  showSum: boolean;
  /** Видимость основной шкалы `y`: линия, подписи делений, ноль. */
  axis: boolean;
  labels: ClusteredLabelsMode;
  fontSize?: number;
  mono: boolean;
  /** `mono invert` — светлая серая шкала на тёмном холсте. */
  monoInvert: boolean;
  seriesColors: Record<string, string>;
  series: ClusteredSeries[];
  lines: SeriesLine[];
  /** Разрывы шкалы значений (`break`). */
  breaks: SeriesAxisBreak[];
  /** Горизонтальные линии уровня (`line <значение>`, без двоеточия). */
  thresholds: SeriesThreshold[];
  cagrs: SeriesCagr[];
  /** `ratio 16x9` — столбцы растягиваются под пропорции изображения. */
  ratio?: ChartAspect;
}

const FONT_BASE = 11;
const FONT_MIN = 6;
const FONT_MAX = 28;
const PLOT_HEIGHT_VERTICAL = 250;
const PLOT_WIDTH_HORIZONTAL = 440;
const MIN_BAR_THICKNESS = 12;
const MAX_BAR_THICKNESS = 36;
const INNER_BAR_GAP = 3;
const CLUSTER_PADDING_RATIO = 0.26;
/** Пунктир сетки второй оси длиннее основной (`3 3`), чтобы шкалы различались. */
const Y2_GRID_DASH = "6 4";
/** Сумма ближе нуля, чем это, не подписывается. */
const SUM_LABEL_EPSILON = 1e-9;
/** Нижний отступ вертикальной диаграммы без легенды: подписи категорий. */
const VERTICAL_BOTTOM_PAD = 40;
/** Полоса легенды. Вместе с VERTICAL_BOTTOM_PAD даёт прежние 68 px, если у серий есть имена. */
const NAMED_LEGEND_BAND = 28;
/** Полоса «зигзага» на баре, пересекающем разрыв. Сам разрыв места не занимает. */
const BREAK_ZIGZAG_HEIGHT = 8;
/** Зазор между двумя штрихами линии разрыва. */
const BREAK_LINE_GAP = 3;
/** Толщина горизонтальной линии уровня, если `width` не задан. */
const THRESHOLD_WIDTH = 1.5;
/** Доля базового шрифта у подписи разрыва и линии уровня. */
const MARK_FONT_RATIO = 0.91;
/** Отступ делений второй оси от края зоны графика. */
const SECONDARY_TICK_GAP = 8;
/** Запас после делений второй оси под её подпись (повёрнутую у вертикальной диаграммы). */
const SECONDARY_LABEL_ROOM = 18;

function splitCsvLabels(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => unquoteExtText(s))
    .filter((s) => s.length > 0);
}

function parseYDirective(
  body: string,
  axisName: "y" | "y2" = "y",
): { y?: { label?: string; min?: number; max?: number }; error?: string } {
  const rangeMatch = /^(.*?)\s*(-?[\d\s_.,]+)\s*-->\s*(-?[\d\s_.,]+)\s*$/.exec(body);
  if (rangeMatch) {
    const min = parseExtNumber(rangeMatch[2]);
    const max = parseExtNumber(rangeMatch[3]);
    if (min === null || max === null || max <= min) {
      return { error: `ожидается «${axisName} "<подпись>" <min> --> <max>» (max > min)` };
    }
    const label = unquoteExtText(rangeMatch[1]) || undefined;
    return { y: { label, min, max } };
  }
  const labelOnly = unquoteExtText(body);
  if (!labelOnly) {
    return { error: `ожидается «${axisName} "<подпись>" [<min> --> <max>]»` };
  }
  return { y: { label: labelOnly } };
}

/** Значения атрибута `axis=`: основная ось и её синонимы, вторая ось и её синонимы. */
const SERIES_AXIS_ATTR_VALUES: Readonly<Record<string, SeriesAxisId>> = {
  y: "y",
  y1: "y",
  left: "y",
  primary: "y",
  "1": "y",
  y2: "y2",
  right: "y2",
  secondary: "y2",
  second: "y2",
  "2": "y2",
};

function normalizeSeriesAxis(raw: string): SeriesAxisId | null {
  return SERIES_AXIS_ATTR_VALUES[raw.trim().toLowerCase().replace(/^["']|["']$/g, "")] ?? null;
}

function parseSeriesAxisAttr(
  rawValue: string,
  lineNo: number,
): { axis?: SeriesAxisId; error?: ExtParseError } {
  const axis = normalizeSeriesAxis(rawValue);
  if (!axis) {
    return {
      error: {
        message: `ось: ожидается axis=y или axis=y2, получено «${rawValue}»`,
        line: lineNo,
        col: 0,
      },
    };
  }
  return { axis };
}

const AXIS_ATTR_ANYWHERE_RE = /\s+\baxis\s*=\s*("[^"]*"|'[^']*'|\S+)/i;

/** Снимает `axis=...` из любого места строки (для линий уровня, где хвост разбирает чужой парсер). */
function extractAxisAttrAnywhere(
  raw: string,
  lineNo: number,
): { rest: string; axis?: SeriesAxisId; error?: ExtParseError } {
  const match = AXIS_ATTR_ANYWHERE_RE.exec(raw);
  if (!match) return { rest: raw.trim() };
  const parsed = parseSeriesAxisAttr(unquoteExtText(match[1]), lineNo);
  if (parsed.error) return { rest: raw.trim(), error: parsed.error };
  return { rest: raw.slice(0, match.index).trim(), axis: parsed.axis };
}

function parseRotateDirective(
  raw: string,
  lineNo: number,
): { rotate90?: boolean; error?: ExtParseError } {
  const lower = raw.trim().toLowerCase();
  if (lower === "rotate" || lower === "horizontal") {
    return { rotate90: true };
  }
  if (lower === "vertical") {
    return { rotate90: false };
  }
  if (/^rotate\b/i.test(raw)) {
    const arg = raw.replace(/^rotate\s*/i, "").replace(/deg|°/gi, "").trim().toLowerCase();
    if (!arg || arg === "90" || arg === "on" || arg === "true" || arg === "horizontal") {
      return { rotate90: true };
    }
    if (arg === "0" || arg === "off" || arg === "false" || arg === "vertical") {
      return { rotate90: false };
    }
    return {
      error: {
        message: `ожидается «rotate 90» или «rotate 0», получено «${raw}»`,
        line: lineNo,
        col: 0,
      },
    };
  }
  if (/^orientation\b/i.test(raw)) {
    const arg = raw.replace(/^orientation\s*/i, "").trim().toLowerCase();
    if (arg === "horizontal" || arg === "lr" || arg === "90") {
      return { rotate90: true };
    }
    if (arg === "vertical" || arg === "tb" || arg === "0") {
      return { rotate90: false };
    }
    return {
      error: {
        message: `ожидается «orientation horizontal» или «orientation vertical», получено «${raw}»`,
        line: lineNo,
        col: 0,
      },
    };
  }
  return {};
}

function parseInvertYDirective(
  raw: string,
  lineNo: number,
): { invertY?: boolean; error?: ExtParseError } {
  const body = raw.replace(/^invert\s+/i, "").trim().toLowerCase();
  const [axis, flag, extra] = body.split(/\s+/).filter(Boolean);
  const knownAxis = axis === "y" || axis === "vertical";
  const turnsOn = !flag || flag === "on" || flag === "true" || flag === "yes";
  const turnsOff = flag === "off" || flag === "false" || flag === "no";
  if (!knownAxis || extra || (!turnsOn && !turnsOff)) {
    return {
      error: {
        message: `ожидается «invert y» или «invert y off», получено «${raw}»`,
        line: lineNo,
        col: 0,
      },
    };
  }
  return { invertY: turnsOn };
}

const SKIP_SLOT_RE = /^(?:null|nil|na|n\/a|none|~|\*|—|–|-)?$/i;

/** Пусто, `-`, `null`, `~`, `*` — пропуск категории. Иначе число или ошибка. */
function parseSeriesSlot(part: string): SeriesSlot | undefined {
  const token = part.trim();
  if (SKIP_SLOT_RE.test(token)) return null;
  const n = parseExtNumber(token);
  return n === null ? undefined : n;
}

function splitValueParts(raw: string): string[] {
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length > 1 && parts[parts.length - 1] === "" && /,\s*$/.test(raw)) {
    parts.pop();
  }
  return parts;
}

function parseSlotList(
  raw: string,
  lineNo: number,
  owner: string,
  expectedCount: number | null,
): { values?: SeriesSlot[]; error?: ExtParseError } {
  const parts = splitValueParts(raw);
  if (parts.length === 0 || parts.every((part) => part.length === 0)) {
    return {
      error: { message: `${owner}: пустой список значений`, line: lineNo, col: 0 },
    };
  }
  if (expectedCount !== null && parts.length !== expectedCount) {
    return {
      error: {
        message: `${owner}: ожидается ${expectedCount} значений (по числу категорий), получено ${parts.length}`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const values: SeriesSlot[] = [];
  for (const part of parts) {
    const slot = parseSeriesSlot(part);
    if (slot === undefined) {
      return {
        error: {
          message: `${owner}: не удалось разобрать число «${part}» (пропуск — пусто, «-» или null)`,
          line: lineNo,
          col: 0,
        },
      };
    }
    values.push(slot);
  }

  if (values.every((value) => value === null)) {
    return {
      error: { message: `${owner}: нет ни одного числа`, line: lineNo, col: 0 },
    };
  }

  return { values };
}

export function normalizeSeriesLineStyle(raw: string): SeriesLineStyle | null {
  const token = raw.trim().toLowerCase().replace(/^["']|["']$/g, "");
  switch (token) {
    case "solid":
    case "none":
    case "-":
    case "—":
      return "solid";
    case "dash":
    case "dashed":
    case "dashes":
    case "--":
      return "dash";
    case "dot":
    case "dotted":
    case "dots":
    case ":":
    case "..":
      return "dot";
    case "dashdot":
    case "dash-dot":
    case "dashdotdot":
    case "-.":
    case "-.-":
      return "dashdot";
    default:
      return null;
  }
}

const LINE_ATTR_RE =
  /\s+(color|colour|fill|stroke|style|dash|width|thickness|axis)\s*=\s*("[^"]*"|'[^']*'|\S+)\s*$/i;

function extractLineAttrs(
  raw: string,
  lineNo: number,
): {
  rest: string;
  color?: string;
  style?: SeriesLineStyle;
  width?: number;
  axis?: SeriesAxisId;
  error?: ExtParseError;
} {
  let rest = raw.trim();
  let color: string | undefined;
  let style: SeriesLineStyle | undefined;
  let width: number | undefined;
  let axis: SeriesAxisId | undefined;

  for (let guard = 0; guard < 8; guard += 1) {
    const match = LINE_ATTR_RE.exec(rest);
    if (!match) break;
    const key = match[1].toLowerCase();
    const value = unquoteExtText(match[2]);
    rest = rest.slice(0, match.index).trim().replace(/,\s*$/, "");
    if (key === "color" || key === "colour" || key === "fill" || key === "stroke") {
      if (!isValidExtColor(value)) {
        return {
          rest,
          error: {
            message: `не удалось разобрать цвет линии «${value}» (ожидается #rgb, #rrggbb или имя цвета)`,
            line: lineNo,
            col: 0,
          },
        };
      }
      color = value;
    } else if (key === "width" || key === "thickness") {
      const parsed = parseExtNumber(value.replace(/\s*(px|pt)$/i, ""));
      if (parsed === null || !(parsed > 0)) {
        return {
          rest,
          error: {
            message: `толщина линии: ожидается положительное число, получено «${value}»`,
            line: lineNo,
            col: 0,
          },
        };
      }
      width = clamp(parsed, 0.5, 12);
    } else if (key === "axis") {
      const parsed = parseSeriesAxisAttr(value, lineNo);
      if (parsed.error) return { rest, error: parsed.error };
      axis = parsed.axis;
    } else {
      const parsed = normalizeSeriesLineStyle(value);
      if (!parsed) {
        return {
          rest,
          error: {
            message: `стиль линии: ожидается solid|dash|dot|dashdot, получено «${value}»`,
            line: lineNo,
            col: 0,
          },
        };
      }
      style = parsed;
    }
  }

  return { rest, color, style, width, axis };
}

/** Второй элемент списка похож на значение линии, а не на подпись уровня. */
function looksLikeLineSlot(part: string): boolean {
  const head = part.trim().split(/\s+/)[0] ?? "";
  if (/^(?:null|nil|na|n\/a|none|~|\*|—|–|-)?$/i.test(head)) return true;
  return parseExtNumber(head) !== null;
}

/**
 * Горизонтальная линия уровня, а не ломаная по категориям.
 * Уровень: `line 160 "план"`, `line: 160`, `line 160, "план"`.
 * Ломаная без подписи тоже начинается с двоеточия, но дальше идёт список:
 * `line : 8, 12, 16`.
 */
function isSeriesThresholdLine(raw: string): boolean {
  const body = raw.replace(/^line\b/i, "").trim().replace(/^[:=]\s*/, "").replace(/^\+/, "");
  if (body.includes(":")) return false;
  if (!/^-?[\d\s_.]+(?=\s|[,;]|$)/.test(body)) return false;
  const parts = body.split(",");
  if (parts.length < 2) return true;
  return !looksLikeLineSlot(parts[1] ?? "");
}

function parseLineRow(
  rawLine: string,
  lineNo: number,
  expectedCount: number | null,
): { line?: SeriesLine; error?: ExtParseError } {
  let body = rawLine.replace(/^line\b/i, "").trim().replace(/^=\s*/, "");
  // `line: Подпись : 1, 2` — первое двоеточие не отделяет пустую подпись.
  // `line : 1, 2, 3` — подписи нет, двоеточие стоит перед списком значений.
  const leadingColon = /^:\s*/.exec(body);
  if (leadingColon && body.slice(leadingColon[0].length).includes(":")) {
    body = body.slice(leadingColon[0].length);
  }
  const colonIdx = body.indexOf(":");
  if (colonIdx < 0) {
    return {
      error: {
        message: `ожидается «line Подпись : зн1, зн2, … [color=#hex] [style=solid|dash|dot|dashdot] [width=N] [axis=y2]», получено «${rawLine}»`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const headAttrs = extractLineAttrs(body.slice(0, colonIdx), lineNo);
  if (headAttrs.error) return { error: headAttrs.error };
  const tailAttrs = extractLineAttrs(body.slice(colonIdx + 1), lineNo);
  if (tailAttrs.error) return { error: tailAttrs.error };

  const label = unquoteExtText(headAttrs.rest) || undefined;
  const slots = parseSlotList(tailAttrs.rest, lineNo, label ? `линия «${label}»` : "линия", expectedCount);
  if (slots.error || !slots.values) return { error: slots.error };

  return {
    line: {
      label,
      values: slots.values,
      color: tailAttrs.color ?? headAttrs.color,
      style: tailAttrs.style ?? headAttrs.style,
      width: tailAttrs.width ?? headAttrs.width,
      axis: tailAttrs.axis ?? headAttrs.axis,
    },
  };
}

interface CagrDraft {
  from?: number;
  to?: number;
  format?: string;
  prefix?: string;
  label?: string;
  line: number;
}

const CAGR_NAMED_RE =
  /\b(format|prefix|label)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s,]+)/gi;

function parseCagrDirective(rawLine: string, lineNo: number): { draft?: CagrDraft; error?: ExtParseError } {
  CAGR_NAMED_RE.lastIndex = 0;
  const body = rawLine.replace(/^cagr\b/i, "").trim();
  let format: string | undefined;
  let prefix: string | undefined;
  let label: string | undefined;
  const unnamed = body
    .replace(CAGR_NAMED_RE, (_full, key: string, rawValue: string) => {
      const value = unquoteExtText(rawValue);
      const normalized = key.toLowerCase();
      if (normalized === "format") format = value;
      else if (normalized === "prefix") prefix = value;
      else label = value;
      return " ";
    })
    .replace(/,/g, " ")
    .trim();

  const tokens = unnamed.split(/\s+/).filter(Boolean);
  if (tokens.length !== 0 && tokens.length !== 2) {
    return {
      error: {
        message: `ожидается «cagr», «cagr <бар1>, <бар2>» или параметры format, prefix, label, получено «${rawLine}»`,
        line: lineNo,
        col: 0,
      },
    };
  }

  let from: number | undefined;
  let to: number | undefined;
  if (tokens.length === 2) {
    from = Number(tokens[0]);
    to = Number(tokens[1]);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1) {
      return {
        error: {
          message: `номера баров в cagr — целые числа от 1, получено «${tokens[0]}, ${tokens[1]}»`,
          line: lineNo,
          col: 0,
        },
      };
    }
  }

  return { draft: { from, to, format, prefix, label, line: lineNo } };
}

/** CAGR за `periods` шагов. Не считается, если старт или финиш не положительные. */
export function computeCagrRatio(start: number, end: number, periods: number): number | null {
  if (!(periods > 0) || !(start > 0) || !(end > 0)) return null;
  const ratio = (end / start) ** (1 / periods) - 1;
  return Number.isFinite(ratio) ? ratio : null;
}

/** Насколько первая стрелка отстоит от баров и шаг следующего уровня. */
const CAGR_LANE_BASE_SHIFT = 18;
const CAGR_LANE_STEP = 16;
/** Доля толщины бара: хвост правее центра первого, остриё левее центра последнего. */
const CAGR_ENDPOINT_INSET_RATIO = 0.35;

/** Сдвиг конца стрелки от центра бара внутрь диапазона. Короткая стрелка не схлопывается. */
export function cagrEndpointInset(span: number, barThickness: number): number {
  const room = Math.abs(span) / 2 - 1;
  if (!(room > 0) || !(barThickness > 0)) return 0;
  return Math.min(barThickness * CAGR_ENDPOINT_INSET_RATIO, room);
}

/**
 * Диапазоны пересекаются, если делят бар не только общим концом.
 * `1–3` и `3–4` не пересекаются, `1–3` и `2–4` пересекаются.
 */
export function cagrRangesOverlap(fromA: number, toA: number, fromB: number, toB: number): boolean {
  const aMin = Math.min(fromA, toA);
  const aMax = Math.max(fromA, toA);
  const bMin = Math.min(fromB, toB);
  const bMax = Math.max(fromB, toB);
  return aMax > bMin && bMax > aMin;
}

/**
 * Уровень каждой стрелки в порядке объявления.
 * Непересекающиеся диапазоны остаются на одном уровне, пересекающаяся уходит выше.
 */
export function assignCagrLanes(cagrs: ReadonlyArray<{ from: number; to: number }>): number[] {
  const occupied: Array<Array<{ from: number; to: number }>> = [];
  return cagrs.map((cagr) => {
    for (let lane = 0; lane < occupied.length; lane += 1) {
      const blocked = occupied[lane].some((placed) =>
        cagrRangesOverlap(placed.from, placed.to, cagr.from, cagr.to),
      );
      if (!blocked) {
        occupied[lane].push({ from: cagr.from, to: cagr.to });
        return lane;
      }
    }
    occupied.push([{ from: cagr.from, to: cagr.to }]);
    return occupied.length - 1;
  });
}

/** `0%` → целое, `0.0%` → один знак. `+` и `±` добавляют плюс только к положительному числу. */
export function formatCagrNumber(ratio: number, format?: string): string {
  const pattern = (format && format.trim()) || "0%";
  const decimals = /\.([0#]+)/.exec(pattern)?.[1].length ?? 0;
  const asPercent = pattern.includes("%");
  const showPlus = pattern.includes("+") || pattern.includes("±");
  const value = asPercent ? ratio * 100 : ratio;
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  const abs = Math.abs(rounded).toFixed(decimals);
  const sign = rounded < 0 ? "-" : showPlus && rounded > 0 ? "+" : "";
  const body = `${sign}${abs}`;
  return asPercent ? `${body}%` : body;
}

export function cagrOvalText(cagr: Pick<SeriesCagr, "format" | "prefix" | "label">, ratio: number | null): string {
  if (cagr.label !== undefined && cagr.label !== "") return cagr.label;
  const body = ratio === null ? "н/д" : formatCagrNumber(ratio, cagr.format);
  return `${cagr.prefix ?? ""}${body}`;
}

const SERIES_TAIL_ATTR_RE =
  /\s+(color|colour|fill|axis)\s*=\s*("[^"]*"|'[^']*'|\S+)\s*$/i;

/** Хвост строки серии: `color=#hex` и `axis=y2` в любом порядке, каждый не более раза значим. */
function extractSeriesTailAttrs(
  raw: string,
  lineNo: number,
): { rest: string; color?: string; axis?: SeriesAxisId; error?: ExtParseError } {
  let rest = raw.trim();
  let color: string | undefined;
  let axis: SeriesAxisId | undefined;
  for (let guard = 0; guard < 4; guard += 1) {
    const match = SERIES_TAIL_ATTR_RE.exec(rest);
    if (!match) break;
    const key = match[1].toLowerCase();
    const value = unquoteExtText(match[2]);
    rest = rest.slice(0, match.index).trim().replace(/,\s*$/, "");
    if (key === "axis") {
      const parsed = parseSeriesAxisAttr(value, lineNo);
      if (parsed.error) return { rest, error: parsed.error };
      axis = parsed.axis;
    } else {
      if (!isValidExtColor(value)) {
        return {
          rest,
          error: {
            message: `не удалось разобрать цвет «${value}» (ожидается #rgb, #rrggbb или имя цвета)`,
            line: lineNo,
            col: 0,
          },
        };
      }
      color = value;
    }
  }
  return { rest, color, axis };
}

function parseSeriesRow(
  rawLine: string,
  lineNo: number,
  expectedCount: number | null,
): { series?: ClusteredSeries; error?: ExtParseError } {
  const colonIdx = rawLine.indexOf(":");
  if (colonIdx < 0) {
    return {
      error: {
        message: `ожидается «series Имя : зн1, зн2, …», получено «${rawLine}»`,
        line: lineNo,
        col: 0,
      },
    };
  }

  const headRaw = rawLine.slice(0, colonIdx).replace(/^series\s+/i, "").trim();
  const headAttrs = extractSeriesTailAttrs(headRaw, lineNo);
  if (headAttrs.error) return { error: headAttrs.error };

  const tailAttrs = extractSeriesTailAttrs(rawLine.slice(colonIdx + 1), lineNo);
  if (tailAttrs.error) return { error: tailAttrs.error };

  const name = unquoteExtText(headAttrs.rest).trim();
  const color = tailAttrs.color ?? headAttrs.color;
  const axis = tailAttrs.axis ?? headAttrs.axis;
  const slots = parseSlotList(tailAttrs.rest, lineNo, seriesMention(name), expectedCount);
  if (slots.error || !slots.values) return { error: slots.error };

  return { series: { name, values: slots.values, color, axis } };
}

export function parseClustered(source: string): ExtParseResult<ClusteredModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let categories: string[] | null = null;
  let yAxis: ClusteredModel["y"];
  let y2Axis: ClusteredModel["y2"];
  let rotate90 = false;
  let invertY = false;
  let stack = false;
  let area = false;
  let categoryAxis = true;
  let y2AxisVisible = true;
  let grid = true;
  let gridStep: number | undefined;
  let y2Grid = false;
  let y2GridStep: number | undefined;
  let barGap: SeriesBarGap | undefined;
  let showSum = false;
  let axis = true;
  let labels: ClusteredLabelsMode = "above";
  let fontSize: number | undefined;
  let mono = false;
  let monoInvert = false;
  let ratio: ChartAspect | undefined;
  const seriesColors: Record<string, string> = {};
  const series: ClusteredSeries[] = [];
  const linesOut: SeriesLine[] = [];
  const breaks: SeriesAxisBreak[] = [];
  const thresholds: SeriesThreshold[] = [];
  const cagrDrafts: Array<CagrDraft & { seriesIndex: number }> = [];
  const leadingCagrs: CagrDraft[] = [];
  let lastSeriesIndex = -1;

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
      const aspect = parseAspectDirective(raw);
      if (aspect) {
        if ("error" in aspect) errors.push({ message: aspect.error, line: lineNo, col: 0 });
        else ratio = aspect.aspect;
        continue;
      }

      if (/^title\b/i.test(raw) && !raw.includes(":")) {
        title = unquoteExtText(raw.replace(/^title\s*/i, "")) || undefined;
        continue;
      }

      if (/^(?:rotate|orientation|horizontal|vertical)\b/i.test(raw) && !raw.includes(":")) {
        const parsed = parseRotateDirective(raw, lineNo);
        if (parsed.error) errors.push(parsed.error);
        else if (parsed.rotate90 !== undefined) rotate90 = parsed.rotate90;
        continue;
      }

      if (/^invert\b/i.test(raw) && !raw.includes(":")) {
        const parsed = parseInvertYDirective(raw, lineNo);
        if (parsed.error) errors.push(parsed.error);
        else if (parsed.invertY !== undefined) invertY = parsed.invertY;
        continue;
      }

      if (/^(?:categories|x)\b/i.test(raw) && !raw.includes(":")) {
        const body = raw.replace(/^(?:categories|x)\s*/i, "");
        const list = splitCsvLabels(body);
        if (list.length === 0) {
          errors.push({
            message: `«categories»: ожидается список категорий через запятую`,
            line: lineNo,
            col: 0,
          });
        } else {
          categories = list;
        }
        continue;
      }

      if (/^axis\b/i.test(raw) && !raw.includes(":")) {
        const parts = raw.replace(/^axis\s*/i, "").trim().toLowerCase().split(/\s+/).filter(Boolean);
        const hideValueAxis = (which: "y" | "y2" | "all", on: boolean) => {
          if (which === "all" || which === "y") {
            axis = on;
            if (!on) grid = false;
          }
          if (which === "all" || which === "y2") {
            y2AxisVisible = on;
            if (!on) y2Grid = false;
          }
        };
        const isOn = (token: string) => token === "on";
        const isOff = (token: string) => token === "off" || token === "none" || token === "hidden";
        if (parts.length === 1 && (isOn(parts[0]) || isOff(parts[0]))) {
          hideValueAxis("all", isOn(parts[0]));
          continue;
        }
        if (parts.length === 2 && (parts[0] === "x" || parts[0] === "y" || parts[0] === "y2")) {
          const [which, state] = parts;
          if (isOn(state) || isOff(state)) {
            if (which === "x") categoryAxis = isOn(state);
            else hideValueAxis(which, isOn(state));
            continue;
          }
        }
        errors.push({
          message: `ожидается «axis on|off» или «axis x|y|y2 on|off», получено «${raw}»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }

      if (/^y2\b/i.test(raw) && !raw.includes(":")) {
        const parsed = parseYDirective(raw.slice(2).trim(), "y2");
        if (parsed.error || !parsed.y) {
          errors.push({ message: parsed.error ?? `неверная директива «y2»`, line: lineNo, col: 0 });
        } else {
          y2Axis = parsed.y;
        }
        continue;
      }

      if (/^y\b/i.test(raw) && !raw.includes(":")) {
        const parsed = parseYDirective(raw.slice(1).trim());
        if (parsed.error || !parsed.y) {
          errors.push({ message: parsed.error ?? `неверная директива «y»`, line: lineNo, col: 0 });
        } else {
          yAxis = parsed.y;
        }
        continue;
      }

      if (/^grid\b/i.test(raw) && !raw.includes(":")) {
        const arg = raw.replace(/^grid\s*/i, "").trim();
        const secondary = /^y2\b/i.test(arg);
        const body = (secondary ? arg.replace(/^y2\s*/i, "") : arg).trim().toLowerCase();
        const applyGrid = (on: boolean, step?: number) => {
          if (secondary) {
            y2Grid = on;
            y2GridStep = step;
          } else {
            grid = on;
            gridStep = step;
          }
        };
        if (!body || body === "on") applyGrid(true, undefined);
        else if (body === "off") applyGrid(false, undefined);
        else {
          const step = parseExtNumber(body);
          if (step === null || !(step > 0)) {
            errors.push({
              message: secondary
                ? `ожидается «grid y2», «grid y2 off» или «grid y2 <положительный шаг>», получено «${arg}»`
                : `ожидается «grid», «grid off» или «grid <положительный шаг>», получено «${arg}»`,
              line: lineNo,
              col: 0,
            });
          } else {
            applyGrid(true, step);
          }
        }
        continue;
      }

      if (/^gap\b/i.test(raw) && !raw.includes(":")) {
        const arg = raw.replace(/^gap\s*/i, "").trim();
        const percent = /^(.*)\s*%$/.exec(arg);
        if (percent) {
          const value = parseExtNumber(percent[1]);
          if (value === null || value < 0 || value >= 100) {
            errors.push({
              message: `ожидается «gap <число>%» от 0 до 100 не включая 100, получено «${arg}»`,
              line: lineNo,
              col: 0,
            });
          } else {
            barGap = { unit: "percent", value };
          }
        } else {
          const value = parseExtNumber(arg);
          if (value === null || value < 0) {
            errors.push({
              message: `ожидается «gap <пиксели>» или «gap <процент>%», получено «${arg}»`,
              line: lineNo,
              col: 0,
            });
          } else {
            barGap = { unit: "px", value };
          }
        }
        continue;
      }

      if (/^labels\b/i.test(raw) && !raw.includes(":")) {
        const tokens = raw.replace(/^labels\s*/i, "").trim().toLowerCase().split(/\s+/).filter(Boolean);
        let mode: ClusteredLabelsMode | undefined;
        let sum = false;
        let bad = false;
        for (const token of tokens) {
          if (token === "sum") sum = true;
          else if (token === "above" || token === "outside" || token === "on") mode = "above";
          else if (token === "inside") mode = "inside";
          else if (token === "none" || token === "off") mode = "none";
          else bad = true;
        }
        if (bad || tokens.length === 0) {
          errors.push({
            message: `ожидается «labels above|inside|none» и необязательное «sum», получено «${raw.replace(/^labels\s*/i, "").trim()}»`,
            line: lineNo,
            col: 0,
          });
        } else {
          if (mode) labels = mode;
          if (sum) showSum = true;
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

      if (/^(?:stacked|bars|layout)\b/i.test(raw) && !raw.includes(":")) {
        const token = raw.replace(/^(?:stacked|bars|layout)\s*/i, "").trim().toLowerCase();
        if (token === "area") {
          stack = true;
          area = true;
        } else if (raw.toLowerCase() === "stacked" || token === "stacked" || token === "stack" || token === "on") {
          stack = true;
          area = false;
        } else if (token === "grouped" || token === "off" || token === "") {
          stack = false;
          area = false;
        } else {
          errors.push({
            message: `ожидается «stacked», «stacked area» или «stacked off», получено «${raw}»`,
            line: lineNo,
            col: 0,
          });
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

    if (/^break\b/i.test(raw)) {
      const parsed = parseBreak(raw.replace(/^break\b/i, ""), lineNo);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.brk) breaks.push(parsed.brk);
      continue;
    }

    if (/^line\b/i.test(raw)) {
      if (isSeriesThresholdLine(raw)) {
        const axisAttr = extractAxisAttrAnywhere(raw.replace(/^line\b/i, ""), lineNo);
        if (axisAttr.error) {
          errors.push(axisAttr.error);
          continue;
        }
        const parsed = parseLine(axisAttr.rest, lineNo);
        if (parsed.error) errors.push(parsed.error);
        else if (parsed.line) thresholds.push({ ...parsed.line, axis: axisAttr.axis });
      } else {
        const parsed = parseLineRow(raw, lineNo, categories ? categories.length : null);
        if (parsed.error) errors.push(parsed.error);
        else if (parsed.line) linesOut.push(parsed.line);
      }
      continue;
    }

    if (/^cagr\b/i.test(raw)) {
      const parsed = parseCagrDirective(raw, lineNo);
      if (parsed.error || !parsed.draft) {
        errors.push(parsed.error ?? { message: `неверная директива «cagr»`, line: lineNo, col: 0 });
      } else if (lastSeriesIndex < 0) {
        leadingCagrs.push(parsed.draft);
      } else {
        cagrDrafts.push({ ...parsed.draft, seriesIndex: lastSeriesIndex });
      }
      continue;
    }

    if (raw.includes(":")) {
      const parsed = parseSeriesRow(raw, lineNo, categories ? categories.length : null);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.series) {
        series.push(parsed.series);
        lastSeriesIndex = series.length - 1;
        if (lastSeriesIndex === 0 && leadingCagrs.length > 0) {
          for (const draft of leadingCagrs) cagrDrafts.push({ ...draft, seriesIndex: 0 });
          leadingCagrs.length = 0;
        }
      }
      continue;
    }

    errors.push({
      message: `неизвестная директива «${raw.split(/\s+/)[0]}» (допустимы title, rotate 90, invert y, categories, y, y2, grid, axis, labels, fontsize, mono, stacked, gap, colors, ratio, series, line, break, cagr)`,
      line: lineNo,
      col: 0,
    });
  }

  if (leadingCagrs.length > 0 && series.length > 0) {
    for (const draft of leadingCagrs) cagrDrafts.push({ ...draft, seriesIndex: 0 });
    leadingCagrs.length = 0;
  }

  if (!categories) {
    errors.push({
      message: `не заданы категории: ожидается строка «categories Кат 1, Кат 2, …» (или «x Кат 1, Кат 2, …»)`,
      line: 1,
      col: 0,
    });
  }

  if (series.length === 0 && errors.length === 0) {
    errors.push({
      message: `нет данных: ожидается хотя бы одна серия «series [Имя] : зн1, зн2, …»`,
      line: 1,
      col: 0,
    });
  }

  const cagrs: SeriesCagr[] = [];
  if (categories) {
    for (const s of series) {
      if (s.values.length !== categories.length) {
        errors.push({
          message: `${seriesMention(s.name)}: ожидается ${categories.length} значений (по числу категорий), получено ${s.values.length}`,
          line: 1,
          col: 0,
        });
      }
    }
    for (const line of linesOut) {
      if (line.values.length !== categories.length) {
        const who = line.label ? `линия «${line.label}»` : "линия";
        errors.push({
          message: `${who}: ожидается ${categories.length} значений (по числу категорий), получено ${line.values.length}`,
          line: 1,
          col: 0,
        });
      }
    }
    for (const draft of cagrDrafts) {
      const count = categories.length;
      const fromBar = draft.from ?? 1;
      const toBar = draft.to ?? count;
      const owner = series[draft.seriesIndex];
      if (!owner) {
        errors.push({
          message: `cagr: нет серии, к которой его можно применить`,
          line: draft.line,
          col: 0,
        });
        continue;
      }
      if (count < 2) {
        errors.push({
          message: `cagr: нужны хотя бы две категории`,
          line: draft.line,
          col: 0,
        });
        continue;
      }
      if (fromBar < 1 || toBar < 1 || fromBar > count || toBar > count) {
        errors.push({
          message: `cagr: номера баров должны быть от 1 до ${count}, получено ${fromBar}, ${toBar}`,
          line: draft.line,
          col: 0,
        });
        continue;
      }
      if (fromBar === toBar) {
        errors.push({
          message: `cagr: нужны два разных бара, получено ${fromBar}, ${toBar}`,
          line: draft.line,
          col: 0,
        });
        continue;
      }
      const from = fromBar - 1;
      const to = toBar - 1;
      if (owner.values[from] === null || owner.values[to] === null) {
        const missing = owner.values[from] === null ? fromBar : toBar;
        errors.push({
          message: `cagr: у ${seriesMention(owner.name)} нет значения в баре ${missing}`,
          line: draft.line,
          col: 0,
        });
        continue;
      }
      cagrs.push({
        seriesIndex: draft.seriesIndex,
        from,
        to,
        format: draft.format,
        prefix: draft.prefix,
        label: draft.label,
      });
    }
  }

  if (leadingCagrs.length > 0) {
    for (const draft of leadingCagrs) {
      errors.push({
        message: `cagr задан, но нет ни одной серии`,
        line: draft.line,
        col: 0,
      });
    }
  }

  if (stack && series.some((item) => item.axis === "y2")) {
    errors.push({
      message: `stacked: бары на второй оси (axis=y2) нельзя складывать в стопку с основной — уберите stacked или axis=y2 у серий`,
      line: 1,
      col: 0,
    });
  }

  if (errors.length > 0 || !categories) return { ok: false, errors };

  // Вторая ось живёт и без директивы y2: пометка axis=y2 включает её с авто-шкалой.
  const hasSecondaryMarks =
    series.some((item) => item.axis === "y2") ||
    linesOut.some((item) => item.axis === "y2") ||
    thresholds.some((item) => item.axis === "y2");
  if (!y2Axis && hasSecondaryMarks) y2Axis = {};

  const bounds = resolveValueBounds({
    series,
    lines: linesOut,
    stack,
    y: yAxis,
    y2: y2Axis,
    thresholds,
  });
  const visibleBreaks = breaks
    .filter((item) => item.after >= bounds.min && item.before <= bounds.max)
    .sort((a, b) => a.after - b.after);
  for (let index = 1; index < visibleBreaks.length; index += 1) {
    const prev = visibleBreaks[index - 1];
    const next = visibleBreaks[index];
    if (next.after < prev.before) {
      errors.push({
        message: `разрывы пересекаются: «${fmt(prev.after)} --> ${fmt(prev.before)}» и «${fmt(next.after)} --> ${fmt(next.before)}»`,
        line: 1,
        col: 0,
      });
      break;
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      title,
      categories,
      y: yAxis,
      y2: y2Axis,
      rotate90,
      invertY,
      stack,
      area,
      categoryAxis,
      y2Axis: y2AxisVisible,
      grid,
      gridStep,
      y2Grid,
      y2GridStep,
      barGap,
      showSum,
      axis,
      labels,
      fontSize,
      mono,
      monoInvert,
      seriesColors,
      series,
      lines: linesOut,
      breaks: visibleBreaks,
      thresholds: [...thresholds].sort((a, b) => a.value - b.value),
      cagrs,
      ratio,
    },
  };
}

/** Сегменты стопки: положительные складываются вверх от нуля, отрицательные — вниз. */
export function stackedSpans(
  model: ClusteredModel,
  category: number,
): Array<{ start: number; end: number }> {
  let positive = 0;
  let negative = 0;
  return model.series.map((series) => {
    const value = series.values[category];
    if (value === null || value === undefined) return { start: positive, end: positive };
    const start = value >= 0 ? positive : negative;
    const end = start + value;
    if (value >= 0) positive = end;
    else negative = end;
    return { start, end };
  });
}

function finiteSlots(values: readonly SeriesSlot[]): number[] {
  return values.filter((value): value is number => value !== null);
}

function axisIdOf(item: { axis?: SeriesAxisId }): SeriesAxisId {
  return item.axis ?? "y";
}

function resolveValueBounds(
  model: Pick<ClusteredModel, "series" | "lines" | "stack" | "y" | "y2" | "thresholds">,
  axisId: SeriesAxisId = "y",
): { min: number; max: number } {
  const axisSeries = model.series.filter((item) => axisIdOf(item) === axisId);
  let rawMin = 0;
  let rawMax = 0;
  if (model.stack && axisSeries.length > 0) {
    const cats = Math.max(...axisSeries.map((series) => series.values.length));
    for (let category = 0; category < cats; category += 1) {
      let positive = 0;
      let negative = 0;
      for (const series of axisSeries) {
        const value = series.values[category];
        if (value === null || value === undefined) continue;
        const start = value >= 0 ? positive : negative;
        const end = start + value;
        if (value >= 0) positive = end;
        else negative = end;
        rawMin = Math.min(rawMin, start, end);
        rawMax = Math.max(rawMax, start, end);
      }
    }
  } else {
    const allVals = axisSeries.flatMap((s) => finiteSlots(s.values));
    if (allVals.length > 0) {
      rawMin = Math.min(0, ...allVals);
      rawMax = Math.max(0, ...allVals);
    }
  }
  for (const line of model.lines) {
    if (axisIdOf(line) !== axisId) continue;
    for (const value of finiteSlots(line.values)) {
      rawMin = Math.min(rawMin, value);
      rawMax = Math.max(rawMax, value);
    }
  }
  for (const mark of model.thresholds) {
    if (axisIdOf(mark) !== axisId) continue;
    rawMin = Math.min(rawMin, mark.value);
    rawMax = Math.max(rawMax, mark.value);
  }
  const explicit = axisId === "y2" ? model.y2 : model.y;
  const auto = niceRange(rawMin, rawMax, 5);
  const min = explicit?.min ?? Math.min(0, auto.min);
  const max = explicit?.max ?? (auto.max <= min ? min + 10 : auto.max);
  return { min, max };
}

function computeValueScale(model: ClusteredModel): {
  min: number;
  max: number;
  ticks: number[];
} {
  const { min, max } = resolveValueBounds(model);
  const ticks =
    model.gridStep && model.gridStep > 0 ? fixedTicks(min, max, model.gridStep) : niceTicks(min, max, 5);
  return { min, max, ticks };
}

/** Вторая шкала: свой диапазон по рядам `axis=y2`. Шаг — из `grid y2 <шаг>`, иначе «круглые» деления. */
function computeSecondaryScale(model: ClusteredModel): {
  min: number;
  max: number;
  ticks: number[];
} {
  const { min, max } = resolveValueBounds(model, "y2");
  const ticks =
    model.y2GridStep && model.y2GridStep > 0
      ? fixedTicks(min, max, model.y2GridStep)
      : niceTicks(min, max, 5);
  return { min, max, ticks };
}

/** Просвет между барами одной категории. У стопки бары соприкасаются. */
function seriesInnerGap(model: ClusteredModel, thickness: number): number {
  if (model.stack) return 0;
  const gap = model.barGap;
  if (!gap) return INNER_BAR_GAP;
  if (gap.unit === "px") return gap.value;
  return (thickness * gap.value) / 100;
}

/** Доля колонки, не занятая стопкой. Процент заменяет её только у стопки и площади. */
function seriesPaddingRatio(model: ClusteredModel): number {
  if (model.stack && model.barGap?.unit === "percent") return model.barGap.value / 100;
  return CLUSTER_PADDING_RATIO;
}

function widenStackedPitch(model: ClusteredModel, groupSize: number, pitch: number): number {
  if (model.stack && model.barGap?.unit === "px") return Math.max(pitch, groupSize + model.barGap.value);
  return pitch;
}

function stackSum(model: ClusteredModel, category: number): number | null {
  let sum = 0;
  let any = false;
  for (const series of model.series) {
    const value = series.values[category];
    if (value === null || value === undefined) continue;
    sum += value;
    any = true;
  }
  if (!any || Math.abs(sum) < SUM_LABEL_EPSILON) return null;
  return sum;
}

interface ValueScale {
  pos: (value: number) => number;
  clamped: (value: number) => number;
  inGap: (value: number) => boolean;
}

/** Шкала с вырезами. Пиксель `pixelAtMin` — значение `min`, `pixelAtMax` — `max`. */
function createValueScale(
  min: number,
  max: number,
  breaks: readonly SeriesAxisBreak[],
  pixelAtMin: number,
  pixelAtMax: number,
): ValueScale {
  const active = breaks
    .filter((item) => item.after >= min && item.before <= max && item.before > item.after)
    .sort((a, b) => a.after - b.after);
  const ranges: Array<[number, number]> = [];
  let cursor = min;
  for (const item of active) {
    const lo = Math.max(min, item.after);
    const hi = Math.min(max, item.before);
    if (lo > cursor) ranges.push([cursor, lo]);
    cursor = Math.max(cursor, hi);
  }
  if (cursor < max) ranges.push([cursor, max]);
  if (ranges.length === 0) ranges.push([min, max]);

  const visibleSpan = ranges.reduce((sum, [lo, hi]) => sum + (hi - lo), 0) || 1;
  const pixelSpan = pixelAtMax - pixelAtMin;

  const pos = (value: number): number => {
    const clamped = Math.min(max, Math.max(min, value));
    let visible = 0;
    for (const [lo, hi] of ranges) {
      const top = Math.min(Math.max(clamped, lo), hi);
      if (top > lo) visible += top - lo;
    }
    return pixelAtMin + (visible / visibleSpan) * pixelSpan;
  };

  const inGap = (value: number): boolean =>
    active.some((item) => value > item.after && value < item.before);

  const clamped = (value: number): number => {
    for (const item of active) {
      if (value > item.after && value < item.before) {
        return value - item.after <= item.before - value ? pos(item.after) : pos(item.before);
      }
    }
    return pos(value);
  };

  return { pos, clamped, inGap };
}

/** Непрерывные куски [lo, hi] за вычетом разрывов. */
function valueSegments(
  lo: number,
  hi: number,
  breaks: readonly SeriesAxisBreak[],
): Array<[number, number]> {
  const cuts = breaks
    .filter((item) => item.after < hi && item.before > lo)
    .sort((a, b) => a.after - b.after);
  const segments: Array<[number, number]> = [];
  let cursor = lo;
  for (const item of cuts) {
    const segEnd = Math.min(hi, item.after);
    if (segEnd > cursor) segments.push([cursor, segEnd]);
    cursor = Math.max(cursor, Math.min(hi, item.before));
  }
  if (cursor < hi) segments.push([cursor, hi]);
  if (segments.length === 0) segments.push([lo, hi]);
  return segments;
}

function markFontSize(fontSize: number): number {
  return Math.round(fontSize * MARK_FONT_RATIO);
}

function annotationGutter(model: ClusteredModel, fontSize: number): number {
  const labelSize = markFontSize(fontSize);
  let gutter = lineLabelGutter(model, fontSize);
  for (const item of model.thresholds) {
    if (!item.label) continue;
    gutter = Math.max(gutter, measureLabelWidth(`${fmt(item.value)} ${item.label}`, labelSize) + 16);
  }
  for (const item of model.breaks) {
    if (!item.label) continue;
    gutter = Math.max(gutter, measureLabelWidth(item.label, labelSize) + 16);
  }
  return gutter;
}

function breakEdgeRoom(model: ClusteredModel, fontSize: number): number {
  let width = 0;
  for (const item of model.breaks) {
    width = Math.max(
      width,
      measureText(fmt(item.after), fontSize),
      measureText(fmt(item.before), fontSize),
    );
  }
  return width > 0 ? width + 14 : 0;
}

/** Запас сверху у повёрнутой диаграммы: подписи разрыва и линий уровня. */
function rotatedMarkRoom(model: ClusteredModel, fontSize: number): number {
  const labeled =
    model.breaks.some((item) => Boolean(item.label)) ||
    model.thresholds.some((item) => Boolean(item.label));
  return labeled ? fontSize + 12 : 0;
}

function gapFill(background: string | undefined, fallback: string): string {
  const normalized = background?.trim().toLowerCase() ?? "";
  return normalized === "transparent" || normalized === "none" ? "transparent" : fallback;
}

function thresholdDash(style: SeriesLineStyle | undefined): string | undefined {
  return LINE_DASH[style ?? "dash"];
}

function defaultThresholdColor(palette: Palette, dark: boolean): string {
  return dark ? palette.fgDim : palette.axis;
}

function seriesMention(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `серия «${trimmed}»` : "серия";
}

function hasNamedSeries(model: ClusteredModel): boolean {
  return model.series.some((item) => item.name.trim().length > 0);
}

function renderLegend(
  svg: ReturnType<typeof createSvg>,
  model: ClusteredModel,
  options: ExtRenderOptions,
  plotLeft: number,
  legendY: number,
  fontSize: number,
  fgDim: string,
): void {
  const swatch = 10;
  let lx = plotLeft;
  model.series.forEach((s, idx) => {
    if (!s.name.trim()) return;
    const color = resolveSeriesColor(idx, {
      explicitColor: s.color,
      seriesColors: model.seriesColors,
      mono: model.mono,
      dark: chartIsDark(options.dark, model.monoInvert),
    });
    svg.rect(lx, legendY - swatch + 2, swatch, swatch, { fill: color, rx: 2 });
    drawLabelLines(svg, lx + swatch + 6, legendY, s.name, fontSize, {
      "text-anchor": "start",
      "font-size": fontSize,
      fill: fgDim,
    });
    lx += swatch + 6 + measureLabelWidth(s.name, fontSize) + 18;
  });
}

const LINE_DASH: Record<SeriesLineStyle, string | undefined> = {
  solid: undefined,
  dash: "7 4",
  dot: "1.5 3.5",
  dashdot: "8 3 1.5 3",
};

interface PlotPoint {
  x: number;
  y: number;
}

function areaPoint(vertical: boolean, across: number, along: number): PlotPoint {
  return vertical ? { x: across, y: along } : { x: along, y: across };
}

/** Замкнутая лента серии: вперёд по верху стопки, назад по основанию. */
function areaRibbonPath(
  model: ClusteredModel,
  seriesIndex: number,
  run: readonly number[],
  vertical: boolean,
  thickness: number,
  centerOf: (category: number) => number,
  alongOf: (value: number) => number,
): string {
  const points: PlotPoint[] = [];
  const push = (across: number, value: number) => {
    points.push(areaPoint(vertical, across, alongOf(value)));
  };
  if (run.length === 1) {
    const index = run[0];
    const span = stackedSpans(model, index)[seriesIndex];
    const across = centerOf(index);
    const half = thickness / 2;
    push(across - half, span.end);
    push(across + half, span.end);
    push(across + half, span.start);
    push(across - half, span.start);
  } else {
    for (const index of run) {
      push(centerOf(index), stackedSpans(model, index)[seriesIndex].end);
    }
    for (let cursor = run.length - 1; cursor >= 0; cursor -= 1) {
      const index = run[cursor];
      push(centerOf(index), stackedSpans(model, index)[seriesIndex].start);
    }
  }
  const body = points.map((point, index) => `${index === 0 ? "M" : "L"}${fmt(point.x)} ${fmt(point.y)}`).join(" ");
  return `${body} Z`;
}

function drawStackedAreas(
  svg: ReturnType<typeof createSvg>,
  model: ClusteredModel,
  options: ExtRenderOptions,
  palette: Palette,
  fontSize: number,
  vertical: boolean,
  thickness: number,
  centerOf: (category: number) => number,
  alongOf: (value: number) => number,
  anchors: Array<Array<PlotPoint | null>>,
  obstacles: number[],
): void {
  const labelSize = Math.max(8, fontSize - 1);
  model.series.forEach((series, seriesIndex) => {
    const color = resolveSeriesColor(seriesIndex, {
      explicitColor: series.color,
      seriesColors: model.seriesColors,
      mono: model.mono,
      dark: chartIsDark(options.dark, model.monoInvert),
    });
    let run: number[] = [];
    const flush = () => {
      if (run.length === 0) return;
      svg.path(areaRibbonPath(model, seriesIndex, run, vertical, thickness, centerOf, alongOf), {
        fill: color,
        "data-area": String(seriesIndex),
      });
      run = [];
    };
    for (let category = 0; category < model.categories.length; category += 1) {
      const value = series.values[category];
      if (value === null || value === undefined) flush();
      else run.push(category);
    }
    flush();

    for (let category = 0; category < model.categories.length; category += 1) {
      const value = series.values[category];
      if (value === null || value === undefined) {
        anchors[seriesIndex][category] = null;
        continue;
      }
      const span = stackedSpans(model, category)[seriesIndex];
      const endPoint = areaPoint(vertical, centerOf(category), alongOf(span.end));
      anchors[seriesIndex][category] = endPoint;
      const band = Math.abs(alongOf(span.end) - alongOf(span.start));
      if (vertical) {
        obstacles[category] = Math.min(obstacles[category], Math.min(alongOf(span.start), alongOf(span.end)) - 2);
      } else {
        obstacles[category] = Math.max(obstacles[category], Math.max(alongOf(span.start), alongOf(span.end)) + 4);
      }
      if (model.labels === "none") continue;
      const text = fmt(value);
      const mid = areaPoint(
        vertical,
        centerOf(category),
        (alongOf(span.start) + alongOf(span.end)) / 2,
      );
      const insideFits = model.labels === "inside" && band >= fontSize + 4 && measureText(text, labelSize) <= thickness - 2;
      if (insideFits) {
        svg.text(mid.x, mid.y + fontSize * 0.35, text, {
          "font-size": labelSize,
          "font-weight": 600,
          fill: readableTextOnFill(color, palette.fg),
        });
      } else if (vertical) {
        svg.text(centerOf(category) + thickness / 2 + 4, mid.y + fontSize * 0.35, text, {
          "text-anchor": "start",
          "font-size": labelSize,
          fill: palette.fgDim,
        });
      } else {
        svg.text(mid.x, centerOf(category) - thickness / 2 - 3, text, {
          "font-size": labelSize,
          fill: palette.fgDim,
        });
      }
    }
  });

  if (!model.showSum) return;
  for (let category = 0; category < model.categories.length; category += 1) {
    const sum = stackSum(model, category);
    if (sum === null) continue;
    let edge = 0;
    for (const series of model.series) {
      const value = series.values[category];
      if (value === null || value === undefined) continue;
      if (sum > 0 && value > 0) edge += value;
      if (sum < 0 && value < 0) edge += value;
    }
    const at = areaPoint(vertical, centerOf(category), alongOf(edge));
    const text = fmt(sum);
    if (vertical) {
      const y = sum > 0 ? at.y - 5 : at.y + fontSize + 2;
      svg.text(at.x, y, text, {
        "font-size": labelSize,
        "font-weight": 600,
        fill: palette.fg,
        "data-stack-sum": "1",
      });
      obstacles[category] = Math.min(obstacles[category], y - fontSize);
    } else {
      const x = sum > 0 ? at.x + 6 : at.x - 6;
      svg.text(x, at.y + fontSize * 0.35, text, {
        "text-anchor": sum > 0 ? "start" : "end",
        "font-size": labelSize,
        "font-weight": 600,
        fill: palette.fg,
        "data-stack-sum": "1",
      });
      obstacles[category] = Math.max(obstacles[category], sum > 0 ? x + measureText(text, labelSize) : x);
    }
  }
}

function lineLabelGutter(model: ClusteredModel, fontSize: number): number {
  let gutter = 0;
  for (const line of model.lines) {
    if (!line.label) continue;
    gutter = Math.max(gutter, measureLabelWidth(line.label, fontSize) + 16);
  }
  return gutter;
}

function cagrHeadroom(model: ClusteredModel, fontSize: number): number {
  const laneCount = assignCagrLanes(model.cagrs).reduce((max, lane) => Math.max(max, lane + 1), 0);
  if (laneCount === 0) return 0;
  return Math.round(48 + fontSize * 2.2 + (laneCount - 1) * CAGR_LANE_STEP);
}

function drawSeriesLines(
  svg: ReturnType<typeof createSvg>,
  model: ClusteredModel,
  palette: Palette,
  fontSize: number,
  labelX: number,
  pointAt: (index: number, value: number, line: SeriesLine) => PlotPoint,
): void {
  const labels: Array<{ y: number; text: string; color: string }> = [];

  model.lines.forEach((line, lineIdx) => {
    const color = line.color ?? palette.fg;
    const width = line.width ?? 1.75;
    const dash = LINE_DASH[line.style ?? "solid"];
    const drawnPoints: PlotPoint[] = [];

    line.values.forEach((value, index) => {
      if (value === null) return;
      drawnPoints.push(pointAt(index, value, line));
    });

    const axisAttr: Record<string, string> = line.axis === "y2" ? { "data-axis": "y2" } : {};
    if (drawnPoints.length >= 2) {
      svg.polyline(
        drawnPoints.map((point) => `${fmt(point.x)},${fmt(point.y)}`).join(" "),
        {
          stroke: color,
          "stroke-width": width,
          "stroke-linejoin": "round",
          "stroke-linecap": "round",
          ...(dash ? { "stroke-dasharray": dash } : {}),
          "data-line": lineIdx,
          ...axisAttr,
        },
      );
    } else if (drawnPoints.length === 1) {
      const only = drawnPoints[0];
      svg.circle(only.x, only.y, Math.max(2.5, width), { fill: color, "data-line": lineIdx, ...axisAttr });
    }

    const labelAnchor = drawnPoints[drawnPoints.length - 1];
    if (line.label && labelAnchor) {
      labels.push({ y: labelAnchor.y, text: line.label, color });
    }
  });

  const minGap = fontSize + 3;
  let prevY = Number.NEGATIVE_INFINITY;
  for (const item of [...labels].sort((a, b) => a.y - b.y)) {
    const y = item.y < prevY + minGap ? prevY + minGap : item.y;
    prevY = y;
    svg.text(labelX + 8, y + fontSize * 0.35, item.text, {
      "text-anchor": "start",
      "font-size": fontSize,
      fill: item.color,
      "data-line-label": item.text,
    });
  }
}

function cagrRatio(model: ClusteredModel, cagr: SeriesCagr): number | null {
  const series = model.series[cagr.seriesIndex];
  if (!series) return null;
  const start = series.values[cagr.from];
  const end = series.values[cagr.to];
  if (start === null || end === null || start === undefined || end === undefined) return null;
  return computeCagrRatio(start, end, Math.abs(cagr.to - cagr.from));
}

function drawCagrAnnotations(
  svg: ReturnType<typeof createSvg>,
  model: ClusteredModel,
  palette: Palette,
  fontSize: number,
  anchors: Array<Array<PlotPoint | null>>,
  obstacles: number[],
  vertical: boolean,
  barThickness: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): void {
  if (model.cagrs.length === 0) return;
  const marker = arrowMarker(palette, "ext-series-cagr-arrow", palette.fg);
  svg.raw(marker.markup);
  const lanes = assignCagrLanes(model.cagrs);

  model.cagrs.forEach((cagr, index) => {
    const start = anchors[cagr.seriesIndex]?.[cagr.from];
    const end = anchors[cagr.seriesIndex]?.[cagr.to];
    if (!start || !end) return;

    const text = cagrOvalText(cagr, cagrRatio(model, cagr));
    const textWidth = measureText(text, fontSize);
    const rx = textWidth / 2 + 12;
    const ry = fontSize * 0.62 + 7;
    const i0 = Math.min(cagr.from, cagr.to);
    const i1 = Math.max(cagr.from, cagr.to);
    const spanIndex = cagr.to - cagr.from || 1;
    const laneLift = (lanes[index] ?? 0) * CAGR_LANE_STEP;
    let clearance = CAGR_LANE_BASE_SHIFT;

    if (vertical) {
      for (let category = i0; category <= i1; category += 1) {
        const t = (category - cagr.from) / spanIndex;
        const lineY = start.y + (end.y - start.y) * t;
        const obstacle = obstacles[category];
        if (Number.isFinite(obstacle)) clearance = Math.max(clearance, lineY - obstacle + 12);
      }
      const shift = clearance + laneLift;
      let y1 = start.y - shift;
      let y2 = end.y - shift;
      const top = bounds.minY + ry + 4;
      const minY = Math.min(y1, y2);
      if (minY < top) {
        y1 += top - minY;
        y2 += top - minY;
      }
      const direction = Math.sign(end.x - start.x) || 1;
      const inset = cagrEndpointInset(end.x - start.x, barThickness);
      paintCagrArrow(
        svg, palette, fontSize, cagr, index,
        start.x + direction * inset, y1,
        end.x - direction * inset, y2,
        text, rx, ry, marker.ref, bounds,
      );
      return;
    }

    for (let category = i0; category <= i1; category += 1) {
      const t = (category - cagr.from) / spanIndex;
      const lineX = start.x + (end.x - start.x) * t;
      const obstacle = obstacles[category];
      if (Number.isFinite(obstacle)) clearance = Math.max(clearance, obstacle - lineX + 12);
    }
    const shift = clearance + laneLift;
    let x1 = start.x + shift;
    let x2 = end.x + shift;
    const right = bounds.maxX - rx - 4;
    const maxX = Math.max(x1, x2);
    if (maxX > right) {
      x1 -= maxX - right;
      x2 -= maxX - right;
    }
    const direction = Math.sign(end.y - start.y) || 1;
    const inset = cagrEndpointInset(end.y - start.y, barThickness);
    paintCagrArrow(
      svg, palette, fontSize, cagr, index,
      x1, start.y + direction * inset,
      x2, end.y - direction * inset,
      text, rx, ry, marker.ref, bounds,
    );
  });
}

function paintCagrArrow(
  svg: ReturnType<typeof createSvg>,
  palette: Palette,
  fontSize: number,
  cagr: SeriesCagr,
  index: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  text: string,
  rx: number,
  ry: number,
  markerRef: string,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): void {
  svg.line(x1, y1, x2, y2, {
    stroke: palette.fg,
    "stroke-width": 1.8,
    "stroke-linecap": "round",
    "marker-end": markerRef,
    "data-cagr": `${cagr.seriesIndex}:${cagr.from + 1}-${cagr.to + 1}`,
  });

  let cx = (x1 + x2) / 2;
  let cy = (y1 + y2) / 2;
  cx = clamp(cx, bounds.minX + rx + 2, bounds.maxX - rx - 2);
  cy = clamp(cy, bounds.minY + ry + 2, bounds.maxY - ry - 2);
  svg.raw(
    `<ellipse data-cagr-oval="${index}" cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(rx)}" ry="${fmt(ry)}" fill="${esc(palette.bg)}" stroke="${esc(palette.fg)}" stroke-width="1.3"/>`,
  );
  svg.text(cx, cy + fontSize * 0.35, text, {
    "font-size": fontSize,
    "font-weight": 600,
    fill: palette.fg,
    "data-cagr-label": text,
  });
}

function drawVerticalBarPieces(
  svg: ReturnType<typeof createSvg>,
  x: number,
  thickness: number,
  from: number,
  to: number,
  color: string,
  barId: string,
  yOf: (value: number) => number,
  breaks: readonly SeriesAxisBreak[],
  holeFill: string,
): { barTop: number; barH: number; valueY: number } {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const segments = valueSegments(lo, hi, breaks);
  const tip = to >= from ? hi : lo;
  let tipSeg = segments[segments.length - 1];
  for (const seg of segments) {
    if (tip >= seg[0] && tip <= seg[1]) tipSeg = seg;
  }
  for (const [segLo, segHi] of segments) {
    const top = yOf(segHi);
    const bottom = yOf(segLo);
    svg.rect(x, top, thickness, Math.max(1.5, bottom - top), {
      fill: color,
      rx: 2,
      "data-bar": barId,
    });
  }
  for (const item of breaks) {
    if (!(item.after < hi && item.before > lo)) continue;
    const y = yOf(item.after);
    const mid = x + thickness / 2;
    svg.rect(x, y - BREAK_ZIGZAG_HEIGHT / 2, thickness, BREAK_ZIGZAG_HEIGHT, {
      fill: holeFill,
      "data-break-gap": "1",
    });
    svg.path(
      `M${fmt(x)} ${fmt(y - 2)} L${fmt(mid)} ${fmt(y + 2)} L${fmt(x + thickness)} ${fmt(y - 2)}`,
      { fill: "none", stroke: color, "stroke-width": 1.2, "data-break-zigzag": "1" },
    );
  }
  const top = yOf(tipSeg[1]);
  const bottom = yOf(tipSeg[0]);
  return { barTop: top, barH: Math.max(1.5, bottom - top), valueY: yOf(tip) };
}

function drawHorizontalBarPieces(
  svg: ReturnType<typeof createSvg>,
  y: number,
  thickness: number,
  from: number,
  to: number,
  color: string,
  barId: string,
  xOf: (value: number) => number,
  breaks: readonly SeriesAxisBreak[],
  holeFill: string,
): { barLeft: number; barW: number; valueX: number } {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const segments = valueSegments(lo, hi, breaks);
  const tip = to >= from ? hi : lo;
  let tipSeg = segments[segments.length - 1];
  for (const seg of segments) {
    if (tip >= seg[0] && tip <= seg[1]) tipSeg = seg;
  }
  for (const [segLo, segHi] of segments) {
    const left = xOf(segLo);
    const right = xOf(segHi);
    svg.rect(left, y, Math.max(1.5, right - left), thickness, {
      fill: color,
      rx: 2,
      "data-bar": barId,
    });
  }
  for (const item of breaks) {
    if (!(item.after < hi && item.before > lo)) continue;
    const x = xOf(item.after);
    const mid = y + thickness / 2;
    svg.rect(x - BREAK_ZIGZAG_HEIGHT / 2, y, BREAK_ZIGZAG_HEIGHT, thickness, {
      fill: holeFill,
      "data-break-gap": "1",
    });
    svg.path(
      `M${fmt(x - 2)} ${fmt(y)} L${fmt(x + 2)} ${fmt(mid)} L${fmt(x - 2)} ${fmt(y + thickness)}`,
      { fill: "none", stroke: color, "stroke-width": 1.2, "data-break-zigzag": "1" },
    );
  }
  const left = xOf(tipSeg[0]);
  const right = xOf(tipSeg[1]);
  return { barLeft: left, barW: Math.max(1.5, right - left), valueX: xOf(tip) };
}

function drawVerticalThresholds(
  svg: ReturnType<typeof createSvg>,
  model: ClusteredModel,
  palette: Palette,
  fontSize: number,
  dark: boolean,
  plotLeft: number,
  plotRight: number,
  yMin: number,
  yMax: number,
  yOf: (value: number) => number,
  holeFill: string,
  secondary?: { min: number; max: number; yOf: (value: number) => number; room: number },
): void {
  const labelSize = markFontSize(fontSize);
  for (const item of model.thresholds) {
    const onSecondary = item.axis === "y2" && secondary;
    const itemMin = onSecondary ? secondary.min : yMin;
    const itemMax = onSecondary ? secondary.max : yMax;
    if (item.value < itemMin || item.value > itemMax) continue;
    const y = (onSecondary ? secondary.yOf : yOf)(item.value);
    const stroke = item.color ?? defaultThresholdColor(palette, dark);
    const dash = thresholdDash(item.style);
    svg.line(plotLeft, y, plotRight, y, {
      stroke,
      "stroke-width": item.width ?? THRESHOLD_WIDTH,
      ...(dash ? { "stroke-dasharray": dash } : {}),
      "stroke-linecap": "butt",
      "data-threshold-line": "1",
      ...(item.axis === "y2" ? { "data-axis": "y2" } : {}),
    });
    if (!item.label) continue;
    const text = `${fmt(item.value)} ${item.label}`;
    const textWidth = measureLabelWidth(text, labelSize);
    const textX = plotRight + (secondary?.room ?? 0) + 6;
    const block = (labelLineCount(text) - 1) * labelLineStep(labelSize);
    svg.rect(textX - 2, y - labelSize * 0.8 - block / 2, textWidth + 4, labelSize * 1.6 + block, {
      fill: holeFill,
      "data-line-gap": "1",
    });
    drawLabelLines(svg, textX, y + 4, text, labelSize, {
      "text-anchor": "start",
      "font-size": labelSize,
      fill: stroke,
      "data-threshold-label": "1",
    }, "center");
  }
}

function drawHorizontalThresholds(
  svg: ReturnType<typeof createSvg>,
  model: ClusteredModel,
  palette: Palette,
  fontSize: number,
  dark: boolean,
  plotTop: number,
  plotBottom: number,
  xMin: number,
  xMax: number,
  xOf: (value: number) => number,
  holeFill: string,
  secondary?: { min: number; max: number; xOf: (value: number) => number },
): void {
  const labelSize = markFontSize(fontSize);
  for (const item of model.thresholds) {
    const onSecondary = item.axis === "y2" && secondary;
    const itemMin = onSecondary ? secondary.min : xMin;
    const itemMax = onSecondary ? secondary.max : xMax;
    if (item.value < itemMin || item.value > itemMax) continue;
    const x = (onSecondary ? secondary.xOf : xOf)(item.value);
    const stroke = item.color ?? defaultThresholdColor(palette, dark);
    const dash = thresholdDash(item.style);
    svg.line(x, plotTop, x, plotBottom, {
      stroke,
      "stroke-width": item.width ?? THRESHOLD_WIDTH,
      ...(dash ? { "stroke-dasharray": dash } : {}),
      "stroke-linecap": "butt",
      "data-threshold-line": "1",
      ...(item.axis === "y2" ? { "data-axis": "y2" } : {}),
    });
    if (!item.label) continue;
    const text = `${fmt(item.value)} ${item.label}`;
    const textWidth = measureLabelWidth(text, labelSize);
    const textX = x + 6;
    const textY = plotTop + labelSize;
    const block = (labelLineCount(text) - 1) * labelLineStep(labelSize);
    svg.rect(textX - 2, textY - labelSize * 0.85 - block / 2, textWidth + 4, labelSize * 1.6 + block, {
      fill: holeFill,
      "data-line-gap": "1",
    });
    drawLabelLines(svg, textX, textY, text, labelSize, {
      "text-anchor": "start",
      "font-size": labelSize,
      fill: stroke,
      "data-threshold-label": "1",
    }, "center");
  }
}

function renderVerticalClustered(model: ClusteredModel, options: ExtRenderOptions): string {
  const palette = resolvePalette(
    chartIsDark(options.dark, model.monoInvert),
    options.background,
    options.textColor,
  );
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const scaleFactor = fontSize / FONT_BASE;
  const titleSize = clamp(Math.round(fontSize * 1.36), 14, 26);

  const catCount = Math.max(1, model.categories.length);
  const seriesCount = Math.max(1, model.series.length);
  const layoutCount = model.stack ? 1 : seriesCount;

  let barWidth = clamp(
    Math.round(24 * scaleFactor - Math.max(0, layoutCount - 2) * 2),
    MIN_BAR_THICKNESS,
    MAX_BAR_THICKNESS,
  );
  const innerGap = seriesInnerGap(model, barWidth);
  let barsGroupWidth = layoutCount * barWidth + (layoutCount - 1) * innerGap;
  const longestCat = model.categories.reduce(
    (max, cat) => Math.max(max, measureLabelWidth(cat, fontSize)),
    0,
  );
  let colWidth = widenStackedPitch(
    model,
    barsGroupWidth,
    Math.max(
      Math.round(barsGroupWidth / (1 - seriesPaddingRatio(model))),
      Math.ceil(longestCat) + 20,
      72,
    ),
  );
  const catExtra = Math.max(0, ...model.categories.map((cat) => labelBlockExtra(cat, fontSize)));
  const titleExtra = labelBlockExtra(model.title, titleSize);
  const seriesExtra = Math.max(0, ...model.series.map((series) => labelBlockExtra(series.name, fontSize)));
  const yExtra = labelBlockExtra(model.y?.label, fontSize);
  const y2Extra = labelBlockExtra(model.y2?.label, fontSize);

  const secondaryScale = model.y2 ? computeSecondaryScale(model) : null;
  const secondaryTickWidth = secondaryScale
    ? Math.max(0, ...secondaryScale.ticks.map((tick) => measureText(fmt(tick), fontSize)))
    : 0;
  const secondaryRoom =
    secondaryScale && model.y2Axis
      ? SECONDARY_TICK_GAP + Math.ceil(secondaryTickWidth) + 6 + (model.y2?.label ? SECONDARY_LABEL_ROOM + y2Extra : 0)
      : 0;

  let plotWidth = Math.max(260, colWidth * catCount);
  let plotHeight = Math.round(PLOT_HEIGHT_VERTICAL * Math.max(1, (scaleFactor - 1) * 0.4 + 1));

  const padLeft = (model.axis ? Math.max(68, breakEdgeRoom(model, fontSize)) : 28) + yExtra;
  const padRight =
    (model.stack && model.labels !== "none" ? 72 : 28) + secondaryRoom + annotationGutter(model, fontSize);
  const padTop =
    (model.title ? 52 : 28) +
    (model.labels === "above" || model.showSum ? fontSize + 6 : 0) +
    titleExtra +
    cagrHeadroom(model, fontSize);
  const padBottom =
    (model.categoryAxis ? VERTICAL_BOTTOM_PAD + catExtra : 16) +
    (hasNamedSeries(model) ? NAMED_LEGEND_BAND : 0) +
    seriesExtra;

  if (model.ratio) {
    const grown = growPlotToAspect(
      {
        plotWidth,
        plotHeight,
        totalWidth: padLeft + plotWidth + padRight,
        totalHeight: padTop + plotHeight + padBottom,
      },
      model.ratio,
    );
    if (grown.plotWidth > plotWidth) {
      const factor = grown.plotWidth / (colWidth * catCount);
      barWidth *= factor;
      barsGroupWidth *= factor;
      colWidth = grown.plotWidth / catCount;
      plotWidth = grown.plotWidth;
    }
    plotHeight = grown.plotHeight;
  }

  const width = padLeft + plotWidth + padRight;
  const height = padTop + plotHeight + padBottom;

  const plotLeft = padLeft;
  const plotTop = padTop;
  const plotBottom = plotTop + plotHeight;
  const plotRight = plotLeft + plotWidth;

  const { min: yMin, max: yMax, ticks } = computeValueScale(model);
  const ySpan = yMax - yMin || 1;
  const linearY = (val: number): number => plotBottom - clamp((val - yMin) / ySpan, 0, 1) * plotHeight;
  const brokenScale = model.breaks.length
    ? createValueScale(yMin, yMax, model.breaks, plotBottom, plotTop)
    : null;
  const yOf = brokenScale ? brokenScale.pos : linearY;
  const yClamped = brokenScale ? brokenScale.clamped : linearY;
  const inValueGap = brokenScale ? brokenScale.inGap : () => false;
  const yZero = yOf(clamp(0, yMin, yMax));
  // Вторая шкала линейна всегда: break вырезает участок только основной оси.
  const y2Span = secondaryScale ? secondaryScale.max - secondaryScale.min || 1 : 1;
  const y2Of = secondaryScale
    ? (val: number): number =>
        plotBottom - clamp((val - secondaryScale.min) / y2Span, 0, 1) * plotHeight
    : linearY;
  const y2Zero = y2Of(clamp(0, secondaryScale?.min ?? yMin, secondaryScale?.max ?? yMax));
  const holeFill = gapFill(options.background, palette.bg);

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

  const drawnTickY = new Set<number>();
  // Подписи делений, которые реально стоят слева. Граница разрыва с тем же
  // текстом не дублируется: схлопнутое деление (вторая граница на той же
  // высоте) в набор не попадает и подписывается отдельно.
  const drawnTickLabels = new Set<string>();
  for (const tick of ticks) {
    if (inValueGap(tick)) continue;
    const y = yOf(tick);
    if (model.breaks.length > 0) {
      const key = Math.round(y * 100) / 100;
      if (drawnTickY.has(key)) continue;
      drawnTickY.add(key);
    }
    if (model.grid) {
      svg.line(plotLeft, y, plotRight, y, {
        stroke: palette.grid,
        "stroke-width": 1,
        "stroke-dasharray": "3 3",
      });
    }
    if (model.axis) {
      svg.text(plotLeft - 8, y + fontSize * 0.35, fmt(tick), {
        "text-anchor": "end",
        "font-size": fontSize,
        fill: palette.fgDim,
      });
      drawnTickLabels.add(fmt(tick));
    }
  }

  if (model.y2Grid && secondaryScale) {
    for (const tick of secondaryScale.ticks) {
      const y = y2Of(tick);
      svg.line(plotLeft, y, plotRight, y, {
        stroke: palette.grid,
        "stroke-width": 1,
        "stroke-dasharray": Y2_GRID_DASH,
        "data-grid": "y2",
      });
    }
  }

  if (model.axis && model.y?.label) {
    const cx = 18 + yExtra;
    const cy = plotTop + plotHeight / 2;
    drawLabelLines(svg, cx, cy, model.y.label, fontSize, {
      "text-anchor": "middle",
      "font-size": fontSize,
      fill: palette.fgDim,
      transform: `rotate(-90 ${fmt(cx)} ${fmt(cy)})`,
    }, "up");
  }

  if (model.y2Axis && secondaryScale) {
    svg.line(plotRight, plotTop, plotRight, plotBottom, {
      stroke: palette.axis,
      "stroke-width": 1.2,
      "data-axis-line": "y2",
    });
    for (const tick of secondaryScale.ticks) {
      const y = y2Of(tick);
      svg.text(plotRight + SECONDARY_TICK_GAP, y + fontSize * 0.35, fmt(tick), {
        "text-anchor": "start",
        "font-size": fontSize,
        fill: palette.fgDim,
        "data-y2-tick": fmt(tick),
      });
    }
    if (model.y2?.label) {
      const cx = plotRight + secondaryRoom - 8 - y2Extra;
      const cy = plotTop + plotHeight / 2;
      drawLabelLines(svg, cx, cy, model.y2.label, fontSize, {
        "text-anchor": "middle",
        "font-size": fontSize,
        fill: palette.fgDim,
        transform: `rotate(90 ${fmt(cx)} ${fmt(cy)})`,
        "data-y2-label": "1",
      }, "up");
    }
  }

  for (const item of model.breaks) {
    const y = yOf(item.after);
    for (const delta of [-BREAK_LINE_GAP / 2, BREAK_LINE_GAP / 2]) {
      svg.line(plotLeft, y + delta, plotRight, y + delta, {
        stroke: palette.axis,
        "stroke-width": 1,
        "stroke-dasharray": "6 4",
        "data-break": "1",
      });
    }
  }

  const anchors: Array<Array<PlotPoint | null>> = model.series.map(() =>
    Array.from({ length: catCount }, () => null),
  );
  const obstacles = Array.from({ length: catCount }, () => Number.POSITIVE_INFINITY);

  if (model.area) {
    drawStackedAreas(
      svg,
      model,
      options,
      palette,
      fontSize,
      true,
      barWidth,
      (category) => plotLeft + (category + 0.5) * colWidth,
      yOf,
      anchors,
      obstacles,
    );
    if (model.categoryAxis) {
      for (let c = 0; c < catCount; c += 1) {
        drawLabelLines(
          svg,
          plotLeft + (c + 0.5) * colWidth,
          plotBottom + fontSize + 8,
          truncateLabel(model.categories[c] ?? "", colWidth - 6, fontSize),
          fontSize,
          {
            "font-size": fontSize,
            fill: palette.fg,
          },
        );
      }
    }
  } else for (let c = 0; c < catCount; c += 1) {
    const clusterCenter = plotLeft + (c + 0.5) * colWidth;
    const clusterLeft = clusterCenter - barsGroupWidth / 2;

    const spans = model.stack ? stackedSpans(model, c) : null;
    model.series.forEach((s, sIdx) => {
      const rawVal = s.values[c];
      if (rawVal === null || rawVal === undefined) {
        anchors[sIdx][c] = null;
        return;
      }
      const val = rawVal;
      const span = spans?.[sIdx];
      const color = resolveSeriesColor(sIdx, {
        explicitColor: s.color,
        seriesColors: model.seriesColors,
        mono: model.mono,
        dark: chartIsDark(options.dark, model.monoInvert),
      });
      const bx = span ? clusterLeft : clusterLeft + sIdx * (barWidth + innerGap);
      const onSecondary = s.axis === "y2" && Boolean(secondaryScale);
      const seriesYOf = onSecondary ? y2Of : yOf;
      const seriesZero = onSecondary ? y2Zero : yZero;
      let barTop: number;
      let barH: number;
      let valueY: number;
      if (model.breaks.length > 0 && !onSecondary) {
        const pieces = drawVerticalBarPieces(
          svg,
          bx,
          barWidth,
          span ? span.start : 0,
          span ? span.end : val,
          color,
          `${c}-${sIdx}`,
          yOf,
          model.breaks,
          holeFill,
        );
        barTop = pieces.barTop;
        barH = pieces.barH;
        valueY = pieces.valueY;
      } else {
        const yStart = seriesYOf(span ? span.start : 0);
        const yEnd = seriesYOf(span ? span.end : val);
        barTop = Math.min(span ? yStart : seriesZero, span ? yEnd : seriesYOf(val));
        barH = Math.max(1.5, Math.abs((span ? yEnd : seriesYOf(val)) - (span ? yStart : seriesZero)));
        svg.rect(bx, barTop, barWidth, barH, {
          fill: color,
          rx: 2,
          "data-bar": `${c}-${sIdx}`,
          ...(onSecondary ? { "data-axis": "y2" } : {}),
        });
        valueY = span ? seriesYOf(span.end) : seriesYOf(val);
      }
      anchors[sIdx][c] = { x: bx + barWidth / 2, y: valueY };
      const labelClear = model.labels === "above" && !span && val >= 0 ? fontSize + 8 : 2;
      obstacles[c] = Math.min(obstacles[c], barTop - labelClear);

      if (model.labels !== "none") {
        const valText = fmt(val);
        const insideFits =
          model.labels === "inside" &&
          barH >= fontSize + 6 &&
          measureText(valText, fontSize - 1) <= barWidth - 2;

        const stackedInside =
          Boolean(span) && barH >= fontSize + 4 && measureText(valText, fontSize - 1) <= barWidth - 2;
        if (insideFits || stackedInside) {
          const textFill = readableTextOnFill(color, palette.fg);
          svg.text(bx + barWidth / 2, barTop + barH / 2 + fontSize * 0.35, valText, {
            "font-size": Math.max(8, fontSize - 1),
            "font-weight": 600,
            fill: textFill,
          });
        } else if (span) {
          svg.text(bx + barWidth + 4, barTop + barH / 2 + fontSize * 0.35, valText, {
            "text-anchor": "start",
            "font-size": Math.max(8, fontSize - 1),
            fill: palette.fgDim,
          });
        } else {
          const labelY = val >= 0 ? barTop - 5 : barTop + barH + fontSize + 2;
          svg.text(bx + barWidth / 2, labelY, valText, {
            "font-size": Math.max(8, fontSize - 1),
            fill: palette.fgDim,
          });
        }
      }
    });

    if (model.stack && model.showSum) {
      const sum = stackSum(model, c);
      if (sum !== null) {
        let edge = 0;
        for (const series of model.series) {
          const value = series.values[c];
          if (value === null || value === undefined) continue;
          if ((sum > 0 && value > 0) || (sum < 0 && value < 0)) edge += value;
        }
        const y = yOf(edge);
        svg.text(clusterCenter, sum > 0 ? y - 5 : y + fontSize + 2, fmt(sum), {
          "font-size": Math.max(8, fontSize - 1),
          "font-weight": 600,
          fill: palette.fg,
          "data-stack-sum": "1",
        });
      }
    }

    if (model.categoryAxis) {
      drawLabelLines(
        svg,
        clusterCenter,
        plotBottom + fontSize + 8,
        truncateLabel(model.categories[c] ?? "", colWidth - 6, fontSize),
        fontSize,
        {
          "font-size": fontSize,
          fill: palette.fg,
        },
      );
    }
  }

  if (model.axis && !inValueGap(0)) {
    svg.line(plotLeft, yZero, plotRight, yZero, {
      stroke: palette.axis,
      "stroke-width": 1.2,
    });
  }

  if (model.y2Axis && secondaryScale && Math.abs(y2Zero - yZero) > 0.5) {
    svg.line(plotLeft, y2Zero, plotRight, y2Zero, {
      stroke: palette.axis,
      "stroke-width": 0.8,
      "stroke-dasharray": "2 3",
      "data-axis-zero": "y2",
    });
  }

  const breakLabelSize = markFontSize(fontSize);
  for (const item of model.breaks) {
    const y = yOf(item.after);
    if (model.axis) {
      const edgeGap = Math.round((3 * fontSize) / FONT_BASE);
      const yKey = Math.round(y * 100) / 100;
      const baselines = breakEdgeBaselines(
        y,
        fontSize,
        edgeGap,
        drawnTickY.has(yKey) ? y + fontSize * 0.35 : null,
      );
      if (!drawnTickLabels.has(fmt(item.after))) {
        svg.text(plotLeft - 8, baselines.after, fmt(item.after), {
          "text-anchor": "end",
          "font-size": fontSize,
          fill: palette.fgDim,
          "data-break-edge": "after",
        });
      }
      if (!drawnTickLabels.has(fmt(item.before))) {
        svg.text(plotLeft - 8, baselines.before, fmt(item.before), {
          "text-anchor": "end",
          "font-size": fontSize,
          fill: palette.fgDim,
          "data-break-edge": "before",
        });
      }
    }
    if (item.label) {
      const textWidth = measureLabelWidth(item.label, breakLabelSize);
      const textX = plotRight + secondaryRoom + 6;
      const block = (labelLineCount(item.label) - 1) * labelLineStep(breakLabelSize);
      svg.rect(textX - 2, y - breakLabelSize * 0.8 - block / 2, textWidth + 4, breakLabelSize * 1.6 + block, {
        fill: holeFill,
        "data-break-text-bg": "1",
      });
      drawLabelLines(svg, textX, y + 4, item.label, breakLabelSize, {
        "text-anchor": "start",
        "font-size": breakLabelSize,
        fill: palette.fgDim,
        "data-break-label": "1",
      }, "center");
    }
  }

  drawSeriesLines(svg, model, palette, fontSize, plotRight + secondaryRoom, (index, value, line) => ({
    x: plotLeft + (index + 0.5) * colWidth,
    y: line.axis === "y2" && secondaryScale ? y2Of(value) : yClamped(value),
  }));
  drawCagrAnnotations(svg, model, palette, fontSize, anchors, obstacles, true, barWidth, {
    minX: 4,
    minY: model.title ? 28 + titleSize * 0.4 + titleExtra : 8,
    maxX: width - 4,
    maxY: plotBottom,
  });

  drawVerticalThresholds(
    svg,
    model,
    palette,
    fontSize,
    chartIsDark(options.dark, model.monoInvert),
    plotLeft,
    plotRight,
    yMin,
    yMax,
    yClamped,
    holeFill,
    secondaryScale
      ? { min: secondaryScale.min, max: secondaryScale.max, yOf: y2Of, room: secondaryRoom }
      : undefined,
  );

  renderLegend(svg, model, options, plotLeft, height - 16 - seriesExtra, fontSize, palette.fgDim);
  return svg.toString();
}

/** Ряд категории на вертикальной оси после поворота. `invert y` ставит первую категорию вниз. */
function categoryRowSlot(index: number, count: number, invertY: boolean): number {
  return invertY ? count - 1 - index : index;
}

function renderHorizontalClustered(model: ClusteredModel, options: ExtRenderOptions): string {
  const palette = resolvePalette(
    chartIsDark(options.dark, model.monoInvert),
    options.background,
    options.textColor,
  );
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const scaleFactor = fontSize / FONT_BASE;
  const titleSize = clamp(Math.round(fontSize * 1.36), 14, 26);

  const catCount = Math.max(1, model.categories.length);
  const seriesCount = Math.max(1, model.series.length);
  const layoutCount = model.stack ? 1 : seriesCount;

  let barHeight = clamp(
    Math.round(20 * scaleFactor - Math.max(0, layoutCount - 2) * 1.5),
    MIN_BAR_THICKNESS,
    MAX_BAR_THICKNESS,
  );
  const innerGap = seriesInnerGap(model, barHeight);
  let barsGroupHeight = layoutCount * barHeight + (layoutCount - 1) * innerGap;
  const catExtra = Math.max(0, ...model.categories.map((cat) => labelBlockExtra(cat, fontSize)));
  let rowHeight =
    widenStackedPitch(
      model,
      barsGroupHeight,
      Math.max(Math.round(barsGroupHeight / (1 - seriesPaddingRatio(model))), 42),
    ) + catExtra;

  const longestCat = model.categories.reduce(
    (max, cat) => Math.max(max, measureLabelWidth(cat, fontSize)),
    0,
  );
  const titleExtra = labelBlockExtra(model.title, titleSize);
  const seriesExtra = Math.max(0, ...model.series.map((series) => labelBlockExtra(series.name, fontSize)));
  const yExtra = labelBlockExtra(model.y?.label, fontSize);
  const padLeft = model.categoryAxis ? clamp(Math.ceil(longestCat) + 28, 76, 180) : 28;
  const padRight =
    (model.labels === "above" || model.showSum ? 56 : 28) +
    annotationGutter(model, fontSize) +
    cagrHeadroom(model, fontSize);
  const secondaryScale = model.y2 ? computeSecondaryScale(model) : null;
  // Вторая ось у повёрнутой диаграммы — сверху: деления над краем, подпись над делениями.
  const secondaryRoom =
    secondaryScale && model.y2Axis ? fontSize + 14 + (model.y2?.label ? fontSize + 10 : 0) : 0;
  const padTop = (model.title ? 48 : 24) + titleExtra + rotatedMarkRoom(model, fontSize) + secondaryRoom;
  const padBottom =
    (model.y?.label ? 80 : 62) -
    (hasNamedSeries(model) ? 0 : NAMED_LEGEND_BAND) +
    yExtra +
    seriesExtra;

  let plotWidth = Math.round(PLOT_WIDTH_HORIZONTAL * Math.max(1, (scaleFactor - 1) * 0.35 + 1));
  let plotHeight = rowHeight * catCount;

  if (model.ratio) {
    const grown = growPlotToAspect(
      {
        plotWidth,
        plotHeight,
        totalWidth: padLeft + plotWidth + padRight,
        totalHeight: padTop + plotHeight + padBottom,
      },
      model.ratio,
    );
    if (grown.plotHeight > plotHeight) {
      const factor = grown.plotHeight / plotHeight;
      barHeight *= factor;
      barsGroupHeight *= factor;
      rowHeight *= factor;
      plotHeight = rowHeight * catCount;
    }
    if (grown.plotWidth > plotWidth) plotWidth = grown.plotWidth;
  }

  const width = padLeft + plotWidth + padRight;
  const height = padTop + plotHeight + padBottom;

  const plotLeft = padLeft;
  const plotTop = padTop;
  const plotRight = plotLeft + plotWidth;
  const plotBottom = plotTop + plotHeight;

  const { min: xMin, max: xMax, ticks } = computeValueScale(model);
  const xSpan = xMax - xMin || 1;
  const linearX = (val: number): number => plotLeft + clamp((val - xMin) / xSpan, 0, 1) * plotWidth;
  const brokenScale = model.breaks.length
    ? createValueScale(xMin, xMax, model.breaks, plotLeft, plotRight)
    : null;
  const xOf = brokenScale ? brokenScale.pos : linearX;
  const xClamped = brokenScale ? brokenScale.clamped : linearX;
  const inValueGap = brokenScale ? brokenScale.inGap : () => false;
  const xZero = xOf(clamp(0, xMin, xMax));
  const x2Span = secondaryScale ? secondaryScale.max - secondaryScale.min || 1 : 1;
  const x2Of = secondaryScale
    ? (val: number): number =>
        plotLeft + clamp((val - secondaryScale.min) / x2Span, 0, 1) * plotWidth
    : linearX;
  const x2Zero = x2Of(clamp(0, secondaryScale?.min ?? xMin, secondaryScale?.max ?? xMax));
  const holeFill = gapFill(options.background, palette.bg);

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

  const drawnTickX = new Set<number>();
  const drawnTickLabels = new Set<string>();
  const drawnTickLabelsAt = new Map<number, string>();
  for (const tick of ticks) {
    if (inValueGap(tick)) continue;
    const x = xOf(tick);
    if (model.breaks.length > 0) {
      const key = Math.round(x * 100) / 100;
      if (drawnTickX.has(key)) continue;
      drawnTickX.add(key);
    }
    if (model.grid) {
      svg.line(x, plotTop, x, plotBottom, {
        stroke: palette.grid,
        "stroke-width": 1,
        "stroke-dasharray": "3 3",
      });
    }
    if (model.axis) {
      svg.text(x, plotBottom + fontSize + 6, fmt(tick), {
        "text-anchor": "middle",
        "font-size": fontSize,
        fill: palette.fgDim,
      });
      drawnTickLabels.add(fmt(tick));
      drawnTickLabelsAt.set(Math.round(x * 100) / 100, fmt(tick));
    }
  }

  if (model.y2Grid && secondaryScale) {
    for (const tick of secondaryScale.ticks) {
      const x = x2Of(tick);
      svg.line(x, plotTop, x, plotBottom, {
        stroke: palette.grid,
        "stroke-width": 1,
        "stroke-dasharray": Y2_GRID_DASH,
        "data-grid": "y2",
      });
    }
  }

  if (model.axis && model.y?.label) {
    drawLabelLines(svg, (plotLeft + plotRight) / 2, plotBottom + fontSize * 2 + 16, model.y.label, fontSize, {
      "text-anchor": "middle",
      "font-size": fontSize,
      fill: palette.fgDim,
    });
  }

  if (model.y2Axis && secondaryScale) {
    svg.line(plotLeft, plotTop, plotRight, plotTop, {
      stroke: palette.axis,
      "stroke-width": 1.2,
      "data-axis-line": "y2",
    });
    for (const tick of secondaryScale.ticks) {
      svg.text(x2Of(tick), plotTop - 6, fmt(tick), {
        "text-anchor": "middle",
        "font-size": fontSize,
        fill: palette.fgDim,
        "data-y2-tick": fmt(tick),
      });
    }
    if (model.y2?.label) {
      drawLabelLines(svg, (plotLeft + plotRight) / 2, plotTop - fontSize - 12, model.y2.label, fontSize, {
        "text-anchor": "middle",
        "font-size": fontSize,
        fill: palette.fgDim,
        "data-y2-label": "1",
      });
    }
  }

  for (const item of model.breaks) {
    const x = xOf(item.after);
    for (const delta of [-BREAK_LINE_GAP / 2, BREAK_LINE_GAP / 2]) {
      svg.line(x + delta, plotTop, x + delta, plotBottom, {
        stroke: palette.axis,
        "stroke-width": 1,
        "stroke-dasharray": "6 4",
        "data-break": "1",
      });
    }
  }

  const anchors: Array<Array<PlotPoint | null>> = model.series.map(() =>
    Array.from({ length: catCount }, () => null),
  );
  const obstacles = Array.from({ length: catCount }, () => Number.NEGATIVE_INFINITY);

  const categoryCenterY = (category: number): number =>
    plotTop + (categoryRowSlot(category, catCount, model.invertY) + 0.5) * rowHeight;

  if (model.area) {
    drawStackedAreas(
      svg,
      model,
      options,
      palette,
      fontSize,
      false,
      barHeight,
      categoryCenterY,
      xOf,
      anchors,
      obstacles,
    );
    if (model.categoryAxis) {
      for (let c = 0; c < catCount; c += 1) {
        drawLabelLines(
          svg,
          plotLeft - 10,
          categoryCenterY(c) + fontSize * 0.35,
          truncateLabel(model.categories[c] ?? "", padLeft - 18, fontSize),
          fontSize,
          {
            "text-anchor": "end",
            "font-size": fontSize,
            fill: palette.fg,
          },
          "center",
        );
      }
    }
  } else for (let c = 0; c < catCount; c += 1) {
    const rowCenter = categoryCenterY(c);
    const clusterTop = rowCenter - barsGroupHeight / 2;

    if (model.categoryAxis) {
      drawLabelLines(
        svg,
        plotLeft - 10,
        rowCenter + fontSize * 0.35,
        truncateLabel(model.categories[c] ?? "", padLeft - 18, fontSize),
        fontSize,
        {
          "text-anchor": "end",
          "font-size": fontSize,
          fill: palette.fg,
        },
        "center",
      );
    }

    const spans = model.stack ? stackedSpans(model, c) : null;
    model.series.forEach((s, sIdx) => {
      const rawVal = s.values[c];
      if (rawVal === null || rawVal === undefined) {
        anchors[sIdx][c] = null;
        return;
      }
      const val = rawVal;
      const span = spans?.[sIdx];
      const color = resolveSeriesColor(sIdx, {
        explicitColor: s.color,
        seriesColors: model.seriesColors,
        mono: model.mono,
        dark: chartIsDark(options.dark, model.monoInvert),
      });
      const by = span ? clusterTop : clusterTop + sIdx * (barHeight + innerGap);
      const onSecondary = s.axis === "y2" && Boolean(secondaryScale);
      const seriesXOf = onSecondary ? x2Of : xOf;
      const seriesZero = onSecondary ? x2Zero : xZero;
      let barLeft: number;
      let barW: number;
      let valueX: number;
      if (model.breaks.length > 0 && !onSecondary) {
        const pieces = drawHorizontalBarPieces(
          svg,
          by,
          barHeight,
          span ? span.start : 0,
          span ? span.end : val,
          color,
          `${c}-${sIdx}`,
          xOf,
          model.breaks,
          holeFill,
        );
        barLeft = pieces.barLeft;
        barW = pieces.barW;
        valueX = pieces.valueX;
      } else {
        const xStart = seriesXOf(span ? span.start : 0);
        const xEnd = seriesXOf(span ? span.end : val);
        barLeft = Math.min(span ? xStart : seriesZero, span ? xEnd : seriesXOf(val));
        barW = Math.max(1.5, Math.abs((span ? xEnd : seriesXOf(val)) - (span ? xStart : seriesZero)));
        svg.rect(barLeft, by, barW, barHeight, {
          fill: color,
          rx: 2,
          "data-bar": `${c}-${sIdx}`,
          ...(onSecondary ? { "data-axis": "y2" } : {}),
        });
        valueX = span ? seriesXOf(span.end) : seriesXOf(val);
      }
      anchors[sIdx][c] = { x: valueX, y: by + barHeight / 2 };
      const labelClear =
        model.labels === "above" && !span && val >= 0 ? measureText(fmt(val), fontSize - 1) + 10 : 4;
      obstacles[c] = Math.max(obstacles[c], barLeft + barW + labelClear);

      if (model.labels !== "none") {
        const valText = fmt(val);
        const insideFits =
          model.labels === "inside" &&
          barW >= measureText(valText, fontSize - 1) + 10 &&
          barHeight >= fontSize;

        const stackedInside =
          Boolean(span) &&
          barW >= measureText(valText, fontSize - 1) + 8 &&
          barHeight >= fontSize;
        if (insideFits || stackedInside) {
          const textFill = readableTextOnFill(color, palette.fg);
          svg.text(barLeft + barW / 2, by + barHeight / 2 + fontSize * 0.35, valText, {
            "font-size": Math.max(8, fontSize - 1),
            "font-weight": 600,
            fill: textFill,
          });
        } else if (span) {
          svg.text(barLeft + barW / 2, by - 3, valText, {
            "font-size": Math.max(8, fontSize - 1),
            fill: palette.fgDim,
          });
        } else {
          const lx = val >= 0 ? barLeft + barW + 6 : barLeft - 6;
          const anchor = val >= 0 ? "start" : "end";
          svg.text(lx, by + barHeight / 2 + fontSize * 0.35, valText, {
            "text-anchor": anchor,
            "font-size": Math.max(8, fontSize - 1),
            fill: palette.fgDim,
          });
        }
      }
    });

    if (model.stack && model.showSum) {
      const sum = stackSum(model, c);
      if (sum !== null) {
        let edge = 0;
        for (const series of model.series) {
          const value = series.values[c];
          if (value === null || value === undefined) continue;
          if ((sum > 0 && value > 0) || (sum < 0 && value < 0)) edge += value;
        }
        const x = xOf(edge);
        svg.text(sum > 0 ? x + 6 : x - 6, rowCenter + fontSize * 0.35, fmt(sum), {
          "text-anchor": sum > 0 ? "start" : "end",
          "font-size": Math.max(8, fontSize - 1),
          "font-weight": 600,
          fill: palette.fg,
          "data-stack-sum": "1",
        });
      }
    }
  }

  if (model.axis && !inValueGap(0)) {
    svg.line(xZero, plotTop, xZero, plotBottom, {
      stroke: palette.axis,
      "stroke-width": 1.2,
    });
  }

  if (model.y2Axis && secondaryScale && Math.abs(x2Zero - xZero) > 0.5) {
    svg.line(x2Zero, plotTop, x2Zero, plotBottom, {
      stroke: palette.axis,
      "stroke-width": 0.8,
      "stroke-dasharray": "2 3",
      "data-axis-zero": "y2",
    });
  }

  const breakLabelSize = markFontSize(fontSize);
  for (const item of model.breaks) {
    const x = xOf(item.after);
    if (model.axis) {
      const xKey = Math.round(x * 100) / 100;
      const tickLabel = drawnTickLabelsAt.get(xKey);
      const half = tickLabel ? measureText(tickLabel, fontSize) / 2 + 4 : 6;
      const labelY = plotBottom + fontSize + 6;
      if (!drawnTickLabels.has(fmt(item.after))) {
        svg.text(x - half, labelY, fmt(item.after), {
          "text-anchor": "end",
          "font-size": fontSize,
          fill: palette.fgDim,
          "data-break-edge": "after",
        });
      }
      if (!drawnTickLabels.has(fmt(item.before))) {
        svg.text(x + half, labelY, fmt(item.before), {
          "text-anchor": "start",
          "font-size": fontSize,
          fill: palette.fgDim,
          "data-break-edge": "before",
        });
      }
    }
    if (item.label) {
      const textWidth = measureLabelWidth(item.label, breakLabelSize);
      const textX = x - textWidth / 2;
      const textY = plotTop - secondaryRoom - 8;
      svg.rect(textX - 2, textY - breakLabelSize, textWidth + 4, breakLabelSize + 4, {
        fill: holeFill,
        "data-break-text-bg": "1",
      });
      drawLabelLines(svg, textX, textY, item.label, breakLabelSize, {
        "text-anchor": "start",
        "font-size": breakLabelSize,
        fill: palette.fgDim,
        "data-break-label": "1",
      });
    }
  }

  drawSeriesLines(svg, model, palette, fontSize, plotRight, (index, value, line) => ({
    x: line.axis === "y2" && secondaryScale ? x2Of(value) : xClamped(value),
    y: plotTop + (categoryRowSlot(index, catCount, model.invertY) + 0.5) * rowHeight,
  }));
  drawCagrAnnotations(svg, model, palette, fontSize, anchors, obstacles, false, barHeight, {
    minX: plotLeft,
    minY: plotTop,
    maxX: width - 4,
    maxY: height - 4,
  });

  drawHorizontalThresholds(
    svg,
    model,
    palette,
    fontSize,
    chartIsDark(options.dark, model.monoInvert),
    plotTop,
    plotBottom,
    xMin,
    xMax,
    xClamped,
    holeFill,
    secondaryScale ? { min: secondaryScale.min, max: secondaryScale.max, xOf: x2Of } : undefined,
  );

  renderLegend(svg, model, options, plotLeft, height - 16 - seriesExtra, fontSize, palette.fgDim);
  return svg.toString();
}

export function renderClustered(model: ClusteredModel, options: ExtRenderOptions): string {
  return model.rotate90
    ? renderHorizontalClustered(model, options)
    : renderVerticalClustered(model, options);
}

export const seriesEngine: ExtEngine<ClusteredModel> = {
  type: "series",
  aliases: ["series"],
  parse: parseClustered,
  render: renderClustered,
};

/** Старое имя экспорта. Синтаксис `clustered` больше не распознаётся. */
export const clusteredEngine = seriesEngine;
