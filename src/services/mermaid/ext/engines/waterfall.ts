import {
  clamp,
  createSvg,
  fixedTicks,
  fmt,
  getPalette,
  measureText,
  niceRange,
  niceTicks,
  truncate,
} from "../common";
import type { Palette } from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

// --- Модель ---------------------------------------------------------------

export type StepKind = "absolute" | "delta";

export interface WaterfallStep {
  kind: StepKind;
  /**
   * Для absolute — само значение; для delta — знак уже учтён в value.
   * `null` — «= без значения»: колонка повторяет накопленный итог
   * (промежуточный итог / повтор предыдущего значения).
   */
  value: number | null;
  label: string;
  /** Подпись внутри бара (перекрывает общую настройку `labels inside`). */
  labelInside?: boolean;
  /** Подпись над баром (перекрывает общую настройку `labels above`). */
  labelAbove?: boolean;
}

export interface WaterfallSeries {
  name?: string;
  steps: WaterfallStep[];
  /** Свой цвет группы (`series <имя> color=#hex`). */
  color?: string;
}

export interface WaterfallAxis {
  label?: string;
  min: number;
  max: number;
  /** true — границы посчитаны по данным, а не заданы в `y "..." min --> max`. */
  auto: boolean;
  /** Явный шаг сетки (`grid <шаг>`); без него — «круглые» деления. */
  gridStep?: number;
  /** `axis off` — не рисовать ось и подписи делений. */
  hidden?: boolean;
}

/** Цвета баров по типу шага. */
export interface WaterfallColors {
  /** Абсолютные колонки (старт, итоги). */
  total: string;
  /** Приращения вверх. */
  increase: string;
  /** Приращения вниз. */
  decrease: string;
}

/**
 * Дополнительные цвета мульти-серий (`colors s1=#hex s2=#hex ...`).
 * Ключ `sN` — цвет серии №N (нумерация с 1, как в легенде). Ключи `group1`,
 * `series1`, `g1` — синонимы. Если для серии задан и `series <имя> color=#hex`,
 * и `sN=`, побеждает `color=` у самой серии (он ближе к данным).
 */
export type WaterfallSeriesColors = Record<string, string>;

export interface WaterfallModel {
  title?: string;
  axis: WaterfallAxis;
  series: WaterfallSeries[];
  /** Подписи колонок — берутся из первой группы. */
  labels: string[];
  /** Разрывы шкалы: между `break.after` и `break.before` участок сжат. */
  breaks: WaterfallBreak[];
  /** Горизонтальные линии поверх диаграммы (`line <значение> [...]`). */
  lines?: WaterfallLine[];
  /** Куда рисовать значения: над баром (по умолчанию) и/или внутри бара. */
  valueLabels: { above: boolean; inside: boolean };
  /** Соединительные линии между барами (`connectors on|off`), по умолчанию включены. */
  connectors: boolean;
  /**
   * Базовый размер шрифта (`fontsize <px>`). Не задан — FONT_BASE (11).
   * Масштабирует подписи колонок, деления шкалы, значения, легенду и заголовок;
   * ширина колонок и высота графика растут вместе со шрифтом.
   */
  fontSize?: number;
  /** `mono` — чёрно-белый режим: бары различаются светлотой, а не цветом. */
  mono?: boolean;
  /** Свои цвета: `colors total=#hex increase=#hex decrease=#hex`. */
  colors?: Partial<WaterfallColors>;
  /** Цвета отдельных серий: `colors s1=#hex s2=#hex` (ключи нормализованы в `sN`). */
  seriesColors?: WaterfallSeriesColors;
}

/** Разрыв оси: значения выше `after` и ниже `before` рисуются вплотную. */
export interface WaterfallBreak {
  after: number;
  before: number;
  /** Подпись на линии разрыва (опционально). */
  label?: string;
}

/**
 * Горизонтальная линия поверх диаграммы (порог, план, среднее).
 * `line <значение> ["подпись"] [color=#hex] [width=<px>] [style=dash|dot|dashdot|solid]`
 */
export interface WaterfallLine {
  value: number;
  /** Подпись справа от баров — как у подписи разрыва. */
  label?: string;
  /** Цвет линии и подписи; без него — цвет текста темы. */
  color?: string;
  /** Толщина в px (0.5–12). */
  width?: number;
  style?: WaterfallLineStyle;
}

export type WaterfallLineStyle = "solid" | "dash" | "dot" | "dashdot";

// --- Разбор ---------------------------------------------------------------

const NUMBER_RE = /^[-+]?\d[\d\s_]*(?:[.,]\d+)?$/;
/** Цвет: `#rgb`, `#rrggbb` или простое имя (см. COLOR_NAMES). */
const COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const COLOR_NAMES = new Set([
  "black",
  "white",
  "gray",
  "grey",
  "silver",
  "red",
  "green",
  "blue",
  "orange",
  "purple",
  "teal",
  "navy",
  "maroon",
  "olive",
  "gold",
  "crimson",
  "steelblue",
  "darkgreen",
  "darkred",
  "darkblue",
]);

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!NUMBER_RE.test(trimmed)) return null;
  const cleaned = trimmed.replace(/[\s_]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isColor(raw: string): boolean {
  const t = raw.trim();
  return COLOR_RE.test(t) || COLOR_NAMES.has(t.toLowerCase());
}

/** Подпись в кавычках + два числа вокруг `-->`. */
function parseAxis(line: string): { label?: string; min: number; max: number } | null {
  const m = /^(.*?)\s*(-?[\d\s_.]+)\s*-->\s*(-?[\d\s_.]+)\s*$/.exec(line);
  if (!m) return null;
  const min = parseNumber(m[2]);
  const max = parseNumber(m[3]);
  if (min === null || max === null) return null;
  let label = m[1].trim();
  if (label.startsWith('"') && label.endsWith('"') && label.length >= 2) {
    label = label.slice(1, -1).replace(/\\"/g, '"');
  }
  return { label: label || undefined, min, max };
}

/**
 * Разбор хвоста строки данных.
 * Поддерживаются флаги (порядок любой, регистр не важен):
 *   `inside`  — подпись внутри бара
 *   `above`   — подпись над баром
 *   `no-label` — без подписи значения
 *   `label=<текст>` — своя подпись значения (например, «−12 %»)
 */
function parseStepFlags(tail: string): {
  rest: string;
  inside: boolean;
  above: boolean;
  hide: boolean;
  valueLabel?: string;
} {
  let rest = tail;
  let inside = false;
  let above = false;
  let hide = false;
  let valueLabel: string | undefined;

  const FLAG_RE = /\s+(inside|above|no-label|label=(?:"(?:[^"\\]|\\.)*"|\S+))\s*$/i;
  for (let guard = 0; guard < 8; guard += 1) {
    const m = FLAG_RE.exec(rest);
    if (!m) break;
    const token = m[1].toLowerCase();
    if (token === "inside") inside = true;
    else if (token === "above") above = true;
    else if (token === "no-label") hide = true;
    else if (token.startsWith("label=")) {
      const raw = m[1].slice("label=".length).trim();
      valueLabel = raw.startsWith('"') && raw.endsWith('"')
        ? raw.slice(1, -1).replace(/\\"/g, '"')
        : raw;
    }
    rest = rest.slice(0, m.index);
  }

  return { rest: rest.trim(), inside, above, hide, valueLabel };
}

function parseStep(
  text: string,
  line: number,
): { step?: WaterfallStep; error?: ExtParseError } {
  const sign = text[0];
  if (sign !== "=" && sign !== "+" && sign !== "-") {
    return {
      error: {
        message: `ожидается формат «<знак><число> : подпись», получено «${text}»`,
        line,
        col: 0,
      },
    };
  }
  const colon = text.indexOf(":");
  if (colon < 0) {
    return {
      error: { message: `ожидается формат «<знак><число> : подпись»`, line, col: 0 },
    };
  }
  const rawNumber = text.slice(1, colon).trim();
  const flags = parseStepFlags(text.slice(colon + 1));
  const label = flags.rest;
  const kind: StepKind = sign === "=" ? "absolute" : "delta";

  // «= : подпись» — абсолютная колонка без значения: повторяет накопленный итог.
  let value: number | null;
  if (!rawNumber && kind === "absolute") {
    value = null;
  } else {
    const parsed = parseNumber(rawNumber);
    if (parsed === null) {
      return {
        error: {
          message: rawNumber
            ? `не удалось разобрать число: «${rawNumber}»`
            : `после «${sign}» ожидается число (пустое значение допустимо только для «=»)`,
          line,
          col: 1,
        },
      };
    }
    value = parsed;
  }

  const signed = value === null ? null : sign === "-" ? -Math.abs(value) : value;
  const step: WaterfallStep = {
    kind,
    value: kind === "absolute" ? value : signed,
    label,
  };
  if (flags.inside) step.labelInside = true;
  if (flags.above) step.labelAbove = true;
  if (flags.hide) {
    step.labelInside = false;
    step.labelAbove = false;
  }
  if (flags.valueLabel !== undefined) {
    // Своя подпись значения хранится в отдельном поле, чтобы не путать с подписью колонки.
    (step as WaterfallStep & { valueText?: string }).valueText = flags.valueLabel;
  }
  return { step };
}

/** `break <после> --> <до> ["подпись"]` */
function parseBreak(
  text: string,
  line: number,
): { brk?: WaterfallBreak; error?: ExtParseError } {
  const m = /^(-?[\d\s_.]+)\s*-->\s*(-?[\d\s_.]+)\s*(?:"(.*)")?\s*$/.exec(text.trim());
  if (!m) {
    return {
      error: {
        message: `ожидается «break <после> --> <до> ["подпись"]», получено «${text.trim()}»`,
        line,
        col: 0,
      },
    };
  }
  const after = parseNumber(m[1]);
  const before = parseNumber(m[2]);
  if (after === null || before === null) {
    return {
      error: { message: `не удалось разобрать границы разрыва`, line, col: 0 },
    };
  }
  if (before <= after) {
    return {
      error: {
        message: `разрыв: «до» (${fmt(before)}) должно быть больше «после» (${fmt(after)})`,
        line,
        col: 0,
      },
    };
  }
  const label = m[3] ? m[3].replace(/\\"/g, '"').trim() : undefined;
  return { brk: { after, before, label: label || undefined } };
}

/**
 * `line <значение> ["подпись"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]`
 *
 * Хвост после значения разбирается по токенам: сначала снимаются `key=value`,
 * затем остаток в кавычках (или без) считается подписью. Порядок любой.
 */
function parseLine(
  text: string,
  line: number,
): { line?: WaterfallLine; error?: ExtParseError } {
  const body = text.trim();
  const valueMatch = /^(-?[\d\s_.]+)(?=\s|$)/.exec(body);
  const value = valueMatch ? parseNumber(valueMatch[1]) : null;
  if (!valueMatch || value === null) {
    return {
      error: {
        message: `ожидается «line <значение> ["подпись"] [color=#hex] [width=<px>] [style=dash]», получено «${body}»`,
        line,
        col: 0,
      },
    };
  }

  const result: WaterfallLine = { value };
  let rest = body.slice(valueMatch[0].length).trim();

  const TOKEN_RE = /^(color|width|style)=("[^"]*"|\S*)\s*/i;
  for (let guard = 0; guard < 8; guard += 1) {
    const m = TOKEN_RE.exec(rest);
    if (!m) break;
    const key = m[1].toLowerCase();
    const raw = m[2].replace(/^"|"$/g, "");
    if (key === "color") {
      if (!isColor(raw)) {
        return {
          error: {
            message: `не удалось разобрать цвет линии «${raw}» (ожидается #rgb, #rrggbb или имя цвета)`,
            line,
            col: 0,
          },
        };
      }
      result.color = raw;
    } else if (key === "width") {
      const width = parseNumber(raw);
      if (width === null || width <= 0) {
        return {
          error: {
            message: `толщина линии: ожидается положительное число, получено «${raw}»`,
            line,
            col: 0,
          },
        };
      }
      result.width = clamp(width, 0.5, 12);
    } else {
      const style = raw.toLowerCase();
      if (style !== "solid" && style !== "dash" && style !== "dot" && style !== "dashdot") {
        return {
          error: {
            message: `стиль линии: ожидается solid|dash|dot|dashdot, получено «${raw}»`,
            line,
            col: 0,
          },
        };
      }
      result.style = style;
    }
    rest = rest.slice(m[0].length);
  }

  // Всё, что осталось, — подпись (в кавычках или как есть).
  rest = rest.trim();
  if (rest) {
    result.label =
      rest.startsWith('"') && rest.endsWith('"') && rest.length >= 2
        ? rest.slice(1, -1).replace(/\\"/g, '"')
        : rest;
    if (!result.label) delete result.label;
  }

  return { line: result };
}

/** `labels above|inside|both|none` */
function parseLabelsMode(
  text: string,
  line: number,
): { mode?: { above: boolean; inside: boolean }; error?: ExtParseError } {
  const token = text.trim().toLowerCase();
  switch (token) {
    case "above":
      return { mode: { above: true, inside: false } };
    case "inside":
      return { mode: { above: false, inside: true } };
    case "both":
      return { mode: { above: true, inside: true } };
    case "none":
      return { mode: { above: false, inside: false } };
    default:
      return {
        error: {
          message: `ожидается «labels above|inside|both|none», получено «${text.trim()}»`,
          line,
          col: 0,
        },
      };
  }
}

/**
 * `colors total=#hex increase=#hex decrease=#hex [s1=#hex s2=#hex ...]`
 * Ключи в любом порядке и по одному; `positive`/`negative` — синонимы.
 * `sN` / `groupN` / `seriesN` / `gN` — цвет серии №N (с 1).
 */
function parseColors(
  text: string,
  line: number,
): { colors?: Partial<WaterfallColors>; seriesColors?: WaterfallSeriesColors; error?: ExtParseError } {
  const colors: Partial<WaterfallColors> = {};
  const seriesColors: WaterfallSeriesColors = {};
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return {
      error: {
        message: `ожидается «colors total=#hex increase=#hex decrease=#hex» (или «colors s1=#hex s2=#hex»)`,
        line,
        col: 0,
      },
    };
  }
  for (const token of tokens) {
    const m = /^(total|increase|decrease|positive|negative|(?:s|g|series|group)\d+)=(.+)$/i.exec(token);
    if (!m) {
      return {
        error: {
          message: `неизвестный ключ цвета «${token}» (ожидается total=, increase=, decrease= или sN= для серии №N)`,
          line,
          col: 0,
        },
      };
    }
    const key = m[1].toLowerCase();
    const value = m[2];
    if (!isColor(value)) {
      return {
        error: {
          message: `не удалось разобрать цвет «${value}» (ожидается #rgb, #rrggbb или имя цвета)`,
          line,
          col: 0,
        },
      };
    }
    if (key === "total") colors.total = value;
    else if (key === "increase" || key === "positive") colors.increase = value;
    else if (key === "decrease" || key === "negative") colors.decrease = value;
    else {
      // s1 / g1 / series1 / group1 → «s1»
      const n = Number(/\d+/.exec(key)![0]);
      if (!(n >= 1)) {
        return {
          error: {
            message: `номер серии должен быть ≥ 1, получено «${token}»`,
            line,
            col: 0,
          },
        };
      }
      seriesColors[`s${n}`] = value;
    }
  }
  return { colors, seriesColors };
}

/** `series <имя> [color=#hex]` */
function parseSeriesHeader(raw: string): { name?: string; color?: string } {
  let body = raw.replace(/^series\s*/i, "").trim();
  let color: string | undefined;
  const m = /\s+color=(\S+)\s*$/i.exec(body);
  if (m && isColor(m[1])) {
    color = m[1];
    body = body.slice(0, m.index).trim();
  }
  if (body.startsWith('"') && body.endsWith('"') && body.length >= 2) {
    body = body.slice(1, -1).replace(/\\"/g, '"');
  }
  return { name: body || undefined, color };
}

export function parseWaterfall(source: string): ExtParseResult<WaterfallModel> {
  const errors: ExtParseError[] = [];
  const series: WaterfallSeries[] = [];
  const breaks: WaterfallBreak[] = [];
  const thresholdLines: WaterfallLine[] = [];
  let current: WaterfallSeries | null = null;
  let title: string | undefined;
  let axis: WaterfallAxis | null = null;
  let gridStep: number | undefined;
  let axisHidden = false;
  let valueLabels = { above: true, inside: false };
  let connectors = true;
  let fontSize: number | undefined;
  let mono = false;
  let colors: Partial<WaterfallColors> | undefined;
  let seriesColors: WaterfallSeriesColors | undefined;

  const lines = source.split(/\r?\n/);
  let seenType = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;

    if (!seenType) {
      seenType = true;
      continue; // первая значимая строка — ключевое слово типа
    }

    if (/^title\b/i.test(raw)) {
      title = raw.replace(/^title\s*/i, "").trim() || undefined;
      continue;
    }

    if (/^y\b/i.test(raw)) {
      const parsed = parseAxis(raw.slice(1).trim());
      if (!parsed) {
        errors.push({
          message: `ожидается «y "<подпись>" <min> --> <max>"»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      axis = { label: parsed.label, min: parsed.min, max: parsed.max, auto: false };
      continue;
    }

    if (/^grid\b/i.test(raw)) {
      const value = parseNumber(raw.slice(4).trim());
      if (value === null || !(value > 0)) {
        errors.push({
          message: `ожидается «grid <положительный шаг>», получено «${raw.slice(4).trim()}»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      gridStep = value;
      continue;
    }

    if (/^axis\b/i.test(raw)) {
      const token = raw.slice(4).trim().toLowerCase();
      if (token === "off" || token === "none" || token === "hidden") {
        axisHidden = true;
      } else if (token === "on" || token === "auto" || token === "") {
        axisHidden = false;
      } else {
        errors.push({
          message: `ожидается «axis off» (или «axis on»)`,
          line: lineNo,
          col: 0,
        });
      }
      continue;
    }

    if (/^labels\b/i.test(raw)) {
      const { mode, error } = parseLabelsMode(raw.slice(6), lineNo);
      if (error) errors.push(error);
      else if (mode) valueLabels = mode;
      continue;
    }

    if (/^connectors?\b/i.test(raw)) {
      const token = raw.replace(/^connectors?\s*/i, "").trim().toLowerCase();
      if (token === "off" || token === "none" || token === "false" || token === "no") {
        connectors = false;
      } else if (token === "on" || token === "true" || token === "yes" || token === "") {
        connectors = true;
      } else {
        errors.push({
          message: `ожидается «connectors on» или «connectors off», получено «${token}»`,
          line: lineNo,
          col: 0,
        });
      }
      continue;
    }

    if (/^fontsize\b/i.test(raw)) {
      const value = parseNumber(raw.replace(/^fontsize\s*/i, ""));
      if (value === null || !(value > 0)) {
        errors.push({
          message: `ожидается «fontsize <положительное число>», получено «${raw.replace(/^fontsize\s*/i, "").trim()}»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      fontSize = value;
      continue;
    }

    if (/^mono\b/i.test(raw)) {
      const token = raw.replace(/^mono\s*/i, "").trim().toLowerCase();
      if (token === "" || token === "on" || token === "true" || token === "yes") {
        mono = true;
      } else if (token === "off" || token === "false" || token === "no") {
        mono = false;
      } else {
        errors.push({
          message: `ожидается «mono» (или «mono on|off»), получено «${token}»`,
          line: lineNo,
          col: 0,
        });
      }
      continue;
    }

    if (/^colou?rs?\b/i.test(raw)) {
      const { colors: parsed, seriesColors: parsedSeries, error } = parseColors(
        raw.replace(/^colou?rs?\s*/i, ""),
        lineNo,
      );
      if (error) errors.push(error);
      else {
        if (parsed && Object.keys(parsed).length) colors = { ...colors, ...parsed };
        if (parsedSeries && Object.keys(parsedSeries).length) {
          seriesColors = { ...seriesColors, ...parsedSeries };
        }
      }
      continue;
    }

    if (/^break\b/i.test(raw)) {
      const { brk, error } = parseBreak(raw.slice(5), lineNo);
      if (error) errors.push(error);
      else if (brk) breaks.push(brk);
      continue;
    }

    if (/^line\b/i.test(raw)) {
      const { line: parsedLine, error } = parseLine(raw.slice(4), lineNo);
      if (error) errors.push(error);
      else if (parsedLine) thresholdLines.push(parsedLine);
      continue;
    }

    if (/^series\b/i.test(raw)) {
      if (current && current.steps.length === 0) {
        errors.push({
          message: `группа «${current.name ?? ""}» не содержит данных`,
          line: lineNo,
          col: 0,
        });
      }
      const header = parseSeriesHeader(raw);
      current = { name: header.name, steps: [] };
      if (header.color) current.color = header.color;
      series.push(current);
      continue;
    }

    if (!current) {
      current = { steps: [] };
      series.push(current);
    }
    const { step, error } = parseStep(raw, lineNo);
    if (error) {
      errors.push(error);
      continue;
    }
    if (step) current.steps.push(step);
  }

  if (current && current.steps.length === 0 && series.length > 1) {
    errors.push({
      message: `группа «${current.name ?? ""}» не содержит данных`,
      line: lines.length,
      col: 0,
    });
  }

  const totalSteps = series.reduce((acc, s) => acc + s.steps.length, 0);
  if (totalSteps === 0) {
    errors.push({
      message: `нет данных: ожидается хотя бы одна строка «=N : подпись»`,
      line: 1,
      col: 0,
    });
    return { ok: false, errors };
  }

  const first = series[0].steps[0];
  if (first && first.kind !== "absolute") {
    errors.push({
      message: `первая колонка должна быть абсолютной (=N)`,
      line: findFirstDataLine(lines),
      col: 0,
    });
  }

  if (errors.length) return { ok: false, errors };

  const labels = series[0].steps.map((s) => s.label);

  // «=» без значения: колонка повторяет накопленный итог. Раскрываем до
  // подсчёта шкалы, чтобы extent и рендер видели уже конкретные числа.
  const carryErrors = resolveCarryOver(series);
  if (carryErrors.length) return { ok: false, errors: carryErrors };

  if (!axis) {
    const extent = computeExtent(series);
    const rounded = niceRange(extent.min, extent.max, 4);
    axis = { min: rounded.min, max: rounded.max, auto: true };
  }

  if (gridStep !== undefined) axis.gridStep = gridStep;
  if (axisHidden) axis.hidden = true;

  // Разрывы вне диапазона шкалы — просто не участвуют в сжатии.
  const visibleBreaks = breaks.filter((b) => b.after >= axis!.min && b.before <= axis!.max);
  const sorted = [...visibleBreaks].sort((a, b) => a.after - b.after);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].after < sorted[i - 1].before) {
      errors.push({
        message: `разрывы пересекаются: «${fmt(sorted[i - 1].after)} --> ${fmt(sorted[i - 1].before)}» и «${fmt(sorted[i].after)} --> ${fmt(sorted[i].before)}»`,
        line: 1,
        col: 0,
      });
      break;
    }
  }
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      title,
      axis,
      series,
      labels,
      breaks: sorted,
      lines: [...thresholdLines].sort((a, b) => a.value - b.value),
      valueLabels,
      connectors,
      fontSize,
      mono,
      colors,
      seriesColors,
    },
  };
}

function findFirstDataLine(lines: string[]): number {
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (!t || t.startsWith("%%")) continue;
    if (/^[=+-]/.test(t)) return i + 1;
  }
  return 1;
}

/**
 * Раскрывает `= null` (абсолютную колонку без значения) в накопленный итог.
 * Первая колонка без значения бессмысленна — это ошибка.
 */
function resolveCarryOver(series: WaterfallSeries[]): ExtParseError[] {
  const errors: ExtParseError[] = [];
  for (const group of series) {
    let running = 0;
    for (let i = 0; i < group.steps.length; i += 1) {
      const step = group.steps[i];
      if (step.kind === "absolute") {
        if (step.value === null) {
          if (i === 0) {
            errors.push({
              message: `первая колонка должна быть абсолютной со значением (=N)`,
              line: 1,
              col: 0,
            });
            return errors;
          }
          step.value = running;
        }
        running = step.value;
      } else {
        running += step.value ?? 0;
      }
    }
  }
  return errors;
}

/** min/max по всем накопленным значениям всех групп. */
function computeExtent(series: WaterfallSeries[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const group of series) {
    let running = 0;
    for (const step of group.steps) {
      if (step.kind === "absolute") {
        running = step.value ?? running;
        min = Math.min(min, running);
        max = Math.max(max, running);
      } else {
        const next = running + (step.value ?? 0);
        min = Math.min(min, running, next);
        max = Math.max(max, running, next);
        running = next;
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

// --- Рендер ---------------------------------------------------------------

const PADDING = { top: 44, right: 24, bottom: 52, left: 64 };
const BAR_GAP = 0.22;
const MIN_BAR_WIDTH = 8;
const MAX_BAR_WIDTH = 64;
const PLOT_HEIGHT = 260;
/** Базовый размер шрифта, если `fontsize` не задан. */
const FONT_BASE = 11;
const FONT_MIN = 6;
const FONT_MAX = 28;
/** Минимальная высота подписи внутри бара. */
const INSIDE_MIN_HEIGHT = 13;
/** Цвет подписи внутри бара. */
const INSIDE_TEXT = "#ffffff";
/** Высота полосы-«зигзага» на линии разрыва (сам разрыв места не занимает). */
const ZIGZAG_HEIGHT = 8;

/** Видимые (не вырезанные) интервалы шкалы. */
function visibleRanges(axis: WaterfallAxis, breaks: WaterfallBreak[]): Array<[number, number]> {
  const sorted = [...breaks]
    .filter((b) => b.before > axis.min && b.after < axis.max)
    .sort((a, b) => a.after - b.after);
  const out: Array<[number, number]> = [];
  let cursor = axis.min;
  for (const b of sorted) {
    const lo = Math.max(axis.min, b.after);
    const hi = Math.min(axis.max, b.before);
    if (lo > cursor) out.push([cursor, lo]);
    cursor = Math.max(cursor, hi);
  }
  if (cursor < axis.max) out.push([cursor, axis.max]);
  return out.length ? out : [[axis.min, axis.max]];
}

/**
 * Шкала с разрывами.
 *
 * Разрыв — это ВЫРЕЗ: участок (after, before) не занимает пикселей вообще,
 * поэтому данные по обе стороны разрыва масштабируются по-настоящему (px на
 * единицу одинаковы для всех видимых участков). Линии разрыва рисуются прямо
 * на стыке участков, бар, проходящий через разрыв, обрывается на линии и
 * получает «зигзаг».
 *
 * Значение внутри вырезанного участка «не существует» на шкале: `yClamped`
 * прижимает его к ближней границе (это нужно соединителям и подписям).
 */
function createScale(
  axis: WaterfallAxis,
  breaks: WaterfallBreak[],
  plotTop: number,
  plotBottom: number,
) {
  const ranges = visibleRanges(axis, breaks);
  const visibleSpan = ranges.reduce((sum, [lo, hi]) => sum + (hi - lo), 0) || 1;
  const unit = (plotBottom - plotTop) / visibleSpan; // px на единицу значения

  const yOf = (value: number): number => {
    // Высота видимой части от axis.min до value (вырезанные участки не в счёт).
    let visible = 0;
    for (const [lo, hi] of ranges) {
      const top = Math.min(Math.max(value, lo), hi);
      if (top > lo) visible += top - lo;
    }
    return plotBottom - visible * unit;
  };

  /** Значение внутри вырезанного участка? (такие точки «не существуют» на шкале) */
  const inGap = (value: number): boolean =>
    breaks.some((b) => value > b.after && value < b.before);

  /** y-координата со сжатием к ближней границе разрыва. */
  const yClamped = (value: number): number => {
    for (const b of breaks) {
      if (value > b.after && value < b.before) {
        // Ближе к какой границе — к той и прижимаем (в пикселях).
        const dAfter = value - b.after;
        const dBefore = b.before - value;
        return dAfter <= dBefore ? yOf(b.after) : yOf(b.before);
      }
    }
    return yOf(value);
  };

  return { yOf, yClamped, inGap, unit, ranges };
}

/** Чёрно-белая палитра: уровни серого вместо цвета. */
const MONO_COLORS: WaterfallColors = {
  total: "#111111",
  increase: "#a3a3a3",
  decrease: "#4d4d4d",
};

/** Моно на тёмном фоне: светлота разворачивается, иначе бары не видны. */
const MONO_COLORS_DARK: WaterfallColors = {
  total: "#f0f0f0",
  increase: "#7a7a7a",
  decrease: "#b8b8b8",
};

/**
 * Цвет бара по типу шага.
 * Приоритет: свой цвет серии (`series ... color=` или `colors sN=`) → цвет типа
 * шага (`colors total|increase|decrease`) → палитра темы (или серые уровни в mono).
 */
function resolveColors(model: WaterfallModel, dark?: boolean): WaterfallColors {
  const palette = getPalette(dark);
  const base: WaterfallColors = model.mono
    ? dark
      ? MONO_COLORS_DARK
      : MONO_COLORS
    : {
        total: palette.neutral,
        increase: palette.positive,
        decrease: palette.negative,
      };
  return { ...base, ...(model.colors ?? {}) };
}

/**
 * Цвет серии `group` (0-based) для легенды и для баров без своего типа.
 * `series <имя> color=` важнее `colors sN=`; без них — цикл палитры.
 */
function seriesColor(
  model: WaterfallModel,
  group: number,
  colors: WaterfallColors,
  dark?: boolean,
): string | undefined {
  const own = model.series[group]?.color;
  if (own) return own;
  const fromColors = model.seriesColors?.[`s${group + 1}`];
  if (fromColors) return fromColors;
  if (model.mono) {
    // В моно-режиме группы различаются светлотой: от тёмного к светлому.
    const steps = dark ? [0.85, 0.55, 0.3, 0.7, 0.4, 0.15] : [0.15, 0.45, 0.7, 0.3, 0.6, 0.85];
    const v = Math.round(255 * (steps[group % steps.length] ?? 0.5));
    const hex = v.toString(16).padStart(2, "0");
    return `#${hex}${hex}${hex}`;
  }
  const cycle = dark ? SERIES_CYCLE_DARK : SERIES_CYCLE_LIGHT;
  // Первая группа — цвет итоговых колонок (он уже «главный» в палитре).
  return group === 0 ? colors.total : cycle[group % cycle.length];
}

/**
 * Затемнить/осветлить hex-цвет: `amount` в диапазоне −1..1
 * (отрицательное — темнее, положительное — светлее).
 */
function shade(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Штрих линии по стилю: `solid` — сплошная, остальные — пунктиры. */
const LINE_DASH: Record<WaterfallLineStyle, string | undefined> = {
  solid: undefined,
  dash: "7 4",
  dot: "1.5 3.5",
  dashdot: "8 3 1.5 3",
};

/** Цвет линии по умолчанию: заметнее сетки, но тише баров. */
function defaultLineColor(palette: Palette, dark?: boolean): string {
  return dark ? palette.fgDim : palette.axis;
}

/**
 * Цвет бара в МУЛЬТИ-серии: базовый цвет группы, но с поправкой на тип шага,
 * чтобы различались и группы, и типы:
 *   • абсолютные колонки (итоги) — базовый цвет как есть;
 *   • рост (+) — светлее на 20 %;
 *   • падение (−) — темнее на 25 %.
 * Так «все бары разных типов различаются цветом» выполняется и в мульти-режиме.
 */
function seriesBarColor(base: string, kind: "total" | "increase" | "decrease"): string {
  if (kind === "increase") return shade(base, 0.2);
  if (kind === "decrease") return shade(base, -0.25);
  return base;
}

export function renderWaterfall(model: WaterfallModel, options: ExtRenderOptions): string {
  const palette = getPalette(Boolean(options.dark));
  const { axis, series, labels, title } = model;
  const breaks = model.breaks ?? [];
  const lines = model.lines ?? [];
  const valueLabels = model.valueLabels ?? { above: true, inside: false };
  const axisHidden = Boolean(axis.hidden);
  const colors = resolveColors(model, Boolean(options.dark));

  const groups = Math.max(1, series.length);
  const columns = Math.max(1, labels.length);

  // --- Размеры, зависящие от шрифта ----------------------------------------
  // fontsize масштабирует все тексты; ширина колонок, высота графика и отступы
  // растут вместе с ним — иначе при крупном шрифте подписи налезают друг на друга.
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const scale = fontSize / FONT_BASE;
  const labelFontSize = fontSize;
  const valueFontSize = Math.round(fontSize * 0.91);
  const breakFontSize = Math.round(fontSize * 0.91);
  const titleFontSize = clamp(Math.round(fontSize * 1.36), 15, 26);
  // При базовом шрифте отступы остаются прежними (44 / 52 / 64) — эталоны
  // рендера не должны меняться от одной только правки масштабирования.
  const padTop = Math.round((PADDING.top * fontSize) / FONT_BASE);
  const padBottom = Math.round((PADDING.bottom * fontSize) / FONT_BASE);
  const padLeft = Math.round((PADDING.left * fontSize) / FONT_BASE);
  const plotHeight = Math.round(PLOT_HEIGHT * scale);

  const longestLabel = labels.reduce((acc, l) => Math.max(acc, measureText(l, labelFontSize)), 0);
  // Запас по 2.5em с каждой стороны давал зазор между барами всего ~12 px:
  // соединительные линии были неразличимы. 3.2em оставляет читаемый просвет.
  const columnWidth = clamp(longestLabel + Math.round(fontSize * 3.2), 64, Math.round(150 * scale));
  const plotWidth = columnWidth * columns;

  const ticks =
    axis.gridStep !== undefined
      ? fixedTicks(axis.min, axis.max, axis.gridStep)
      : niceTicks(axis.min, axis.max, 5);

  // Левый отступ должен вмещать САМОЕ ДЛИННОЕ число шкалы: и обычные деления,
  // и границы разрыва стоят справа налево от линии графика. Иначе левый край
  // SVG обрезает цифры (300/800 уходили за viewBox).
  const tickTextWidth = ticks.reduce((acc, t) => Math.max(acc, measureText(fmt(t), labelFontSize)), 0);
  const edgeTextWidth = breaks.reduce(
    (acc, b) => Math.max(acc, measureText(fmt(b.after), labelFontSize), measureText(fmt(b.before), labelFontSize)),
    0,
  );
  const tickRoom = Math.round((10 * fontSize) / FONT_BASE) + Math.max(tickTextWidth, edgeTextWidth);
  const leftPad = axisHidden ? 16 : Math.max(padLeft, tickRoom);
  // Подпись разрыва живёт справа от самого правого бара — под неё нужен запас
  // по ширине, иначе она обрезается краем SVG.
  const breakLabels = breaks.filter((b) => Boolean(b.label));
  // Подписи горизонтальных линий живут в том же правом поле, что и подпись
  // разрыва, поэтому запас по ширине считаем по самой длинной из всех.
  const lineLabels = lines.filter((l) => Boolean(l.label));
  const rightLabelRoom = Math.max(
    breakLabels.length
      ? Math.max(
          ...breakLabels.map(
            (b) => measureText(b.label ?? "", Math.round(fontSize * 0.91)) + Math.round(fontSize * 1.2),
          ),
        )
      : 0,
    lineLabels.length
      ? Math.max(
          ...lineLabels.map(
            (l) =>
              measureText(`${fmt(l.value)} ${l.label ?? ""}`.trim(), Math.round(fontSize * 0.91)) +
              Math.round(fontSize * 1.2),
          ),
        )
      : 0,
  );
  const breakLabelRoom = rightLabelRoom;  // Раскладка бара — ДО расчёта ширины SVG: подпись разрыва должна знать,
  // где кончается последний бар, чтобы встать в свободном поле справа от него.
  const barWidth = clamp((columnWidth * (1 - BAR_GAP)) / groups, MIN_BAR_WIDTH, MAX_BAR_WIDTH);
  const groupSpan = barWidth * groups + (groups - 1) * 4;
  const rightBarEdge = leftPad + (columns - 1) * columnWidth + (columnWidth + groupSpan) / 2;
  // Свободное поле справа от последнего бара: PADDING.right + запас на зазор.
  const breakLabelGap = Math.round((6 * fontSize) / FONT_BASE);
  const rightRoomForBreak = Math.max(
    PADDING.right,
    breakLabelRoom ? breakLabelRoom + breakLabelGap + PADDING.right : PADDING.right,
  );
  const width = leftPad + plotWidth + rightRoomForBreak;
  const height = padTop + plotHeight + padBottom;

  const svg = createSvg({ width, height, palette, title, debugFrames: options.debugFrames });

  const plotLeft = leftPad;
  const plotTop = padTop;
  const plotBottom = plotTop + plotHeight;

  const { yOf, yClamped, inGap } = createScale(axis, breaks, plotTop, plotBottom);

  if (title) {
    svg.text(width / 2, Math.round((24 * fontSize) / FONT_BASE), title, {
      "font-size": titleFontSize,
      "font-weight": 600,
      fill: palette.fg,
    });
  }

  // Горизонтальные линии поверх диаграммы — под сеткой, барами и подписями:
  // так они не перечёркивают значения, а читаются как «уровень».
  // Линия, попавшая внутрь вырезанного разрыва, прижимается к его границе —
  // иначе она «не существует» на шкале и рисовалась бы не там.
  const lineFontSize = Math.round(fontSize * 0.91);
  const lineLabelX = leftPad + plotWidth + Math.round((6 * fontSize) / FONT_BASE);
  for (const item of lines) {
    if (item.value < axis.min || item.value > axis.max) continue;
    const y = yClamped(item.value);
    const stroke = item.color ?? defaultLineColor(palette, options.dark);
    const dash = LINE_DASH[item.style ?? "dash"];
    svg.line(plotLeft, y, plotLeft + plotWidth, y, {
      stroke,
      "stroke-width": item.width ?? 1.5,
      ...(dash ? { "stroke-dasharray": dash } : {}),
      "stroke-linecap": "butt",
      "data-threshold-line": "1",
    });

    if (item.label) {
      const text = `${fmt(item.value)} ${item.label}`;
      const textWidth = measureText(text, lineFontSize);
      // Вырез под подпись — цветом плашки холста: иначе текст лежит на линии.
      svg.rect(lineLabelX - 2, y - lineFontSize * 0.8, textWidth + 4, lineFontSize * 1.6, {
        fill: palette.bg,
        "data-line-gap": "1",
      });
      svg.text(lineLabelX, y + Math.round((4 * fontSize) / FONT_BASE), text, {
        "text-anchor": "start",
        "font-size": lineFontSize,
        fill: stroke,
        "data-threshold-label": "1",
      });
    }
  }

  // Деления на границах разрыва схлопываются в одну линию (300 и 800 лежат
  // на той же высоте) — рисуем только первое из них.
  const drawnTickYs = new Set<number>();
  if (!axisHidden) {
    for (const tick of ticks) {
      if (breaks.some((b) => tick > b.after && tick < b.before)) continue;
      const y = yOf(tick);
      const yKey = Math.round(y * 100) / 100;
      if (drawnTickYs.has(yKey)) continue;
      drawnTickYs.add(yKey);
      svg.line(plotLeft, y, plotLeft + plotWidth, y, { stroke: palette.grid, "stroke-width": 1 });
      svg.text(plotLeft - Math.round((8 * fontSize) / FONT_BASE), y + Math.round((4 * fontSize) / FONT_BASE), fmt(tick), {
        "text-anchor": "end",
        "font-size": labelFontSize,
        fill: palette.fgDim,
      });
    }

    // Границы разрыва подписываем всегда, но только когда шкала показана:
    // минимум вырезанного участка — НИЖЕ линии разрыва, максимум — ВЫШЕ.
    // Числа стоят целиком по свою сторону линии, поэтому линия их не
    // перечёркивает. Границы разрыва заменяют собой деления сетки, попавшие
    // на стык (300 и 800 лежат на одной высоте), поэтому подписи идут тем же
    // кеглем и с тем же отступом от линии графика, что и обычные деления —
    // иначе они «плавают» относительно шкалы.
    // Отступ от линии графика тот же, что у обычных делений, иначе границы
    // разрыва стоят не в колонке чисел.
    const edgeLabelX = plotLeft - Math.round((8 * fontSize) / FONT_BASE);
    const edgeGap = Math.round((3 * fontSize) / FONT_BASE);
    const edgeTextW = edgeTextWidth;
    for (const b of breaks) {
      const y = yOf(b.after);
      // Базлайны: низ верхнего числа ровно на зазоре над линией, верх нижнего —
      // на зазоре под линией.
      const lowerBaseline = y + edgeGap + labelFontSize;
      const upperBaseline = y - edgeGap;
      // Вырез под оба числа: от верха верхнего до низа нижнего (+ запас на
      // выносные элементы). Иначе цифры лежат на линии разрыва.
      const boxTop = upperBaseline - labelFontSize;
      const boxBottom = lowerBaseline + Math.round(labelFontSize * 0.25);
      svg.rect(edgeLabelX - edgeTextW - 3, boxTop - 1, edgeTextW + 7, boxBottom - boxTop + 2, {
        fill: palette.bg,
        "data-break-gap": "1",
      });
      // Нижнее число — минимум вырезанного участка: базлайн ниже линии.
      svg.text(edgeLabelX, lowerBaseline, fmt(b.after), {
        "text-anchor": "end",
        "font-size": labelFontSize,
        fill: palette.fgDim,
        "data-break-edge": "after",
      });
      // Верхнее число — максимум вырезанного участка: базлайн выше линии.
      svg.text(edgeLabelX, upperBaseline, fmt(b.before), {
        "text-anchor": "end",
        "font-size": labelFontSize,
        fill: palette.fgDim,
        "data-break-edge": "before",
      });
    }

    if (axis.label) {
      const cx = Math.round((16 * fontSize) / FONT_BASE);
      const cy = plotTop + plotHeight / 2;
      svg.text(cx, cy, axis.label, {
        "text-anchor": "middle",
        "font-size": labelFontSize,
        fill: palette.fgDim,
        transform: `rotate(-90 ${cx} ${cy})`,
      });
    }

    svg.line(plotLeft, plotBottom, plotLeft + plotWidth, plotBottom, {
      stroke: palette.axis,
      "stroke-width": 1,
    });
  } else {
    // Ось скрыта — оставляем только линию нуля, если ноль в шкале.
    if (axis.min < 0 && axis.max > 0) {
      const zeroY = yOf(0);
      svg.line(plotLeft, zeroY, plotLeft + plotWidth, zeroY, {
        stroke: palette.axis,
        "stroke-width": 1,
        "stroke-dasharray": "4 3",
      });
    }
  }

  // Линии разрыва: две параллельные черты поперёк области графика.
  // Разрыв места не занимает, поэтому черты лежат на стыке видимых участков.
  // Подпись разрыва — справа от самого правого бара (в свободном поле между
  // баром и правым краем SVG), на высоте линии.
  const lastBarRight = rightBarEdge;
  for (const b of breaks) {
    const y = yOf(b.after);
    const gap = 3;
    for (const dy of [-gap / 2, gap / 2]) {
      svg.line(plotLeft, y + dy, plotLeft + plotWidth, y + dy, {
        stroke: palette.axis,
        "stroke-width": 1,
        "stroke-dasharray": "6 4",
      });
    }
    if (b.label) {
      const breakFs = breakFontSize;
      // Текст прижат к правому краю SVG (а не к бару): слева от него остаётся
      // зазор от последнего бара, справа — PADDING.right. Длинный текст
      // обрезается по фактически свободному месту.
      const rightEdge = width - PADDING.right;
      const freeWidth = Math.max(24, rightEdge - lastBarRight - Math.round((6 * fontSize) / FONT_BASE));
      const text = truncate(b.label, freeWidth, breakFs);
      const textWidth = measureText(text, breakFs);
      const textX = Math.max(lastBarRight + Math.round((6 * fontSize) / FONT_BASE), rightEdge - textWidth);
      // Вырез под подпись: иначе текст лежит на линии разрыва и не читается.
      svg.rect(textX - 2, y - breakFs * 0.75, textWidth + 4, breakFs * 1.5, {
        fill: palette.bg,
        "data-break-gap": "1",
      });
      svg.text(textX, y + Math.round((4 * fontSize) / FONT_BASE), text, {
        "text-anchor": "start",
        "font-size": breakFs,
        fill: palette.fgDim,
        "data-break-label": "1",
      });
    }
  }

  /** Накопленный уровень после колонки `col` (включительно). */
  const levelAfter = (g: number, col: number): number => {
    const group = series[g];
    if (!group) return 0;
    let running = 0;
    for (let k = 0; k <= col; k += 1) {
      const st = group.steps[k];
      if (!st) continue;
      running = st.kind === "absolute" ? (st.value ?? running) : running + (st.value ?? 0);
    }
    return running;
  };

  /** Уровень, с которого начинается бар колонки `col` (до её значения). */
  const levelBefore = (g: number, col: number): number => (col === 0 ? 0 : levelAfter(g, col - 1));

  /**
   * Уровень, от которого соединитель уходит к следующей колонке.
   *
   * Правило (как в Excel / Plotly): линия всегда идёт по уровню накопленного
   * итога, то есть по «стартовому» краю СЛЕДУЮЩЕГО бара:
   *   • рост (+):    бар растёт ВВЕРХ от итога → линия идёт по НИЗУ (низ бара);
   *   • падение (−): бар идёт ВНИЗ от итога → линия идёт по ВЕРХУ (верх бара);
   *   • абсолютная:  бар стоит от нуля → линия идёт по значению (верх бара).
   * Для текущей колонки это тот же уровень, что и накопленный итог ПОСЛЕ неё
   * (`levelAfter`), т.к. итог — это край бара, от которого растёт следующий.
   */
  const connectorFromLevel = (g: number, col: number): number => levelAfter(g, col);

  /**
   * Уровень, в который соединитель приходит на колонке `col` — «стартовый»
   * край бара (тот, от которого он растёт/падает):
   *   • рост (+):    приходит в НИЗ бара (bottom);
   *   • падение (−): приходит в ВЕРХ бара (top);
   *   • абсолютная:  приходит на уровень САМОГО значения (верх бара).
   * Для приращений это накопленный итог ПЕРЕД колонкой; для абсолютной
   * колонки — её собственное значение (иначе ступенька не рисуется и линия
   * ложно ложится на уровень предыдущего бара).
   */
  const connectorToLevel = (g: number, col: number): number => {
    const st = series[g]?.steps[col];
    if (st?.kind === "absolute" && st.value !== null) return st.value;
    return levelBefore(g, col);
  };

  // Соединители рисуются ДО баров, чтобы не перекрывать заливку.
  // x1 — правый край бара колонки `col`, x2 — левый край того же по счёту
  // бара следующей колонки (группа та же, поэтому смещения совпадают).
  if (model.connectors !== false) {
    for (let g = 0; g < groups; g += 1) {
      for (let col = 0; col < columns - 1; col += 1) {
        const group = series[g];
        if (!group?.steps[col] || !group.steps[col + 1]) continue;
        const from = connectorFromLevel(g, col);
        const to = connectorToLevel(g, col + 1);
        const x1 =
          plotLeft + col * columnWidth + (columnWidth - groupSpan) / 2 + g * (barWidth + 4) + barWidth;
        const x2 = x1 + columnWidth - barWidth;
        // Зазор между барами почти съедался: линия была длиной ~12 px и терялась
        // на фоне сетки. Делаем её контрастнее и толще — как в Excel/McKinsey.
        const stroke = options.dark ? palette.fgDim : palette.axis;
        const dash = "4 3";
        const y1 = yClamped(from);
        const y2 = yClamped(to);
        if (Math.abs(y2 - y1) < 0.5) {
          // Один уровень — горизонтальный пунктир от бара к бару.
          svg.line(x1, y1, x2, y2, {
            stroke,
            "stroke-width": 1.25,
            "stroke-dasharray": dash,
            "data-connector": "1",
          });
        } else {
          // Разные уровни — ступенька: до середины зазора, вертикально, дальше.
          const midX = (x1 + x2) / 2;
          svg.line(x1, y1, midX, y1, {
            stroke,
            "stroke-width": 1.25,
            "stroke-dasharray": dash,
            "data-connector": "1",
          });
          svg.line(midX, y1, midX, y2, {
            stroke,
            "stroke-width": 1.25,
            "stroke-dasharray": dash,
            "data-connector": "1",
          });
          svg.line(midX, y2, x2, y2, {
            stroke,
            "stroke-width": 1.25,
            "stroke-dasharray": dash,
            "data-connector": "1",
          });
        }
      }
    }
  }

  /**
   * Бар, пересекающий разрыв шкалы, рисуется полосами: участок, попавший в
   * вырезанный диапазон (after, before), не закрашивается, а на линиях
   * разрыва рисуется «зигзаг» — общепринятый знак обрыва.
   */
  const drawBar = (x: number, from: number, to: number, color: string, barId: string) => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const cuts = breaks
      .filter((b) => b.after < hi && b.before > lo)
      .sort((a, b) => a.after - b.after);

    // Непрерывные куски [lo..hi] минус вырезанные участки.
    const segments: Array<[number, number]> = [];
    let cursor = lo;
    for (const b of cuts) {
      const segEnd = Math.min(hi, b.after);
      if (segEnd > cursor) segments.push([cursor, segEnd]);
      cursor = Math.max(cursor, Math.min(hi, b.before));
    }
    if (cursor < hi) segments.push([cursor, hi]);
    if (!segments.length) segments.push([lo, hi]);

    for (const [sLo, sHi] of segments) {
      const top = yOf(sHi);
      const bottom = yOf(sLo);
      const h = Math.max(1.5, bottom - top);
      svg.rect(x, top, barWidth, h, { fill: color, rx: 2, "data-bar": barId });
    }

    // Зигзаг на каждой линии разрыва, которую бар пересёк. Разрыв места не
    // занимает, поэтому полоса-вырез рисуется ПОВЕРХ бара: без неё куски бара
    // сливаются и обрыв не читается.
    for (const b of cuts) {
      const y = yOf(b.after);
      const mid = x + barWidth / 2;
      svg.rect(x, y - ZIGZAG_HEIGHT / 2, barWidth, ZIGZAG_HEIGHT, {
        fill: palette.bg,
        "data-break-gap": "1",
      });
      const zig = `M${x} ${y - 2} L${mid} ${y + 2} L${x + barWidth} ${y - 2}`;
      svg.path(zig, {
        fill: "none",
        stroke: color,
        "stroke-width": 1.2,
        "data-break-zigzag": "1",
      });
    }
  };

  for (let col = 0; col < columns; col += 1) {
    const columnLeft = plotLeft + col * columnWidth;
    const startX = columnLeft + (columnWidth - groupSpan) / 2;

    for (let g = 0; g < groups; g += 1) {
      const group = series[g];
      const step = group.steps[col];
      if (!step) continue;

      let running = 0;
      for (let k = 0; k < col; k += 1) {
        const prev = group.steps[k];
        if (!prev) continue;
        running = prev.kind === "absolute" ? (prev.value ?? running) : running + (prev.value ?? 0);
      }

      // null здесь уже раскрыт парсером; страховка для рендера «сырой» модели.
      const stepValue = step.value ?? running;

      let from: number;
      let to: number;
      let color: string;
      // В мульти-серии у каждой группы свой базовый цвет, а внутри группы
      // тип шага различается светлотой (итог / рост / падение) — так все бары
      // различимы. В одиночной серии цвет задаёт ТИП шага (total/increase/decrease).
      const ownSeries = groups > 1 ? seriesColor(model, g, colors, options.dark) : undefined;
      if (step.kind === "absolute") {
        // Абсолютная колонка рисуется от нуля; если ноль вне шкалы — от её края.
        const zero = clamp(0, axis.min, axis.max);
        from = Math.min(zero, stepValue);
        to = Math.max(zero, stepValue);
        color = ownSeries ? seriesBarColor(ownSeries, "total") : colors.total;
      } else {
        from = running;
        to = running + stepValue;
        const kind = stepValue >= 0 ? "increase" : "decrease";
        color = ownSeries
          ? seriesBarColor(ownSeries, kind)
          : kind === "increase"
            ? colors.increase
            : colors.decrease;
      }

      const x = startX + g * (barWidth + 4);
      // Бар, проходящий через разрыв шкалы, рисуется кусками с зигзагом.
      drawBar(x, from, to, color, `${g}-${col}`);

      // Геометрия для подписи: видимая (не вырезанная) часть бара.
      const visLo = inGap(from) ? (from < to ? breaks.find((b) => from > b.after && from < b.before)!.before : from) : from;
      const visHi = inGap(to) ? (to > from ? breaks.find((b) => to > b.after && to < b.before)!.after : to) : to;
      const top = yOf(Math.max(visLo, visHi));
      const bottom = yOf(Math.min(visLo, visHi));
      const barHeight = Math.max(1.5, bottom - top);

      const valueText =
        (step as WaterfallStep & { valueText?: string }).valueText ??
        (step.kind === "absolute" ? fmt(stepValue) : `${stepValue > 0 ? "+" : ""}${fmt(stepValue)}`);

      // Per-step флаги перекрывают общий режим `labels`.
      const wantInside = step.labelInside ?? valueLabels.inside;
      const wantAbove = step.labelAbove ?? valueLabels.above;
      const hide = step.labelInside === false && step.labelAbove === false;

      const fitted = truncate(valueText, barWidth - 4, valueFontSize);
      const fitsInside =
        barHeight >= Math.max(INSIDE_MIN_HEIGHT, valueFontSize + 2) &&
        measureText(fitted, valueFontSize) <= barWidth - 4;

      // Подпись ВНУТРИ бара. При включённом `above` она не «съедает» надпись
      // над баром: обе рисуются независимо (это и есть режим `labels both`).
      const drewInside = !hide && wantInside && fitsInside;
      if (drewInside) {
        svg.text(x + barWidth / 2, top + barHeight / 2 + valueFontSize * 0.35, fitted, {
          "font-size": valueFontSize,
          fill: INSIDE_TEXT,
          "font-weight": 600,
        });
      }

      // Подпись НАД баром. Если внутри не поместилось (или inside не просили),
      // значение выносится сюда — иначе оно бы пропало совсем.
      const needAbove = !hide && (wantAbove || (wantInside && !fitsInside));
      if (needAbove) {
        const aboveY = top - Math.round((5 * fontSize) / FONT_BASE);
        // Сдвиг вверх, если подпись налезает на соседнюю колонку слева:
        // иначе «+80» наезжает на бар Q1, а «−40» — на «+80».
        const halfW = measureText(valueText, valueFontSize) / 2;
        const leftBound = col === 0 ? plotLeft : columnLeft;
        const shiftUp =
          halfW > barWidth / 2 + Math.round((6 * fontSize) / FONT_BASE) &&
          x + barWidth / 2 - halfW < leftBound
            ? Math.round(valueFontSize * 1.15)
            : 0;
        svg.text(x + barWidth / 2, aboveY - shiftUp, valueText, {
          "font-size": valueFontSize,
          fill: palette.fgDim,
        });
      }
    }

    const label = truncate(labels[col] ?? "", columnWidth - 6, labelFontSize);
    svg.text(columnLeft + columnWidth / 2, plotBottom + Math.round((18 * fontSize) / FONT_BASE), label, {
      "font-size": labelFontSize,
      fill: palette.fg,
    });
  }

  // Легенда: при мульти-серии у каждой группы свой цвет — цвета всех групп
  // обязаны различаться, поэтому свой цвет серии уважается, а безымянные
  // группы получают цвета по кругу из общей палитры.
  if (groups > 1) {
    let legendX = plotLeft;
    const legendY = plotBottom + Math.round((40 * fontSize) / FONT_BASE);
    for (let g = 0; g < groups; g += 1) {
      const name = series[g].name ?? `Группа ${g + 1}`;
      const swatch = Math.round(fontSize * 0.91);
      svg.rect(legendX, legendY - swatch + 2, swatch, swatch, {
        fill: seriesColor(model, g, colors, options.dark) ?? colors.total,
        rx: 2,
      });
      svg.text(legendX + swatch + 6, legendY, name, {
        "text-anchor": "start",
        "font-size": labelFontSize,
        fill: palette.fgDim,
      });
      legendX += swatch + Math.round(fontSize * 1.1) + measureText(name, labelFontSize) + Math.round(fontSize * 1.45);
    }
  }

  return svg.toString();
}

/** Палитра для легенды: цвета групп должны различаться между собой. */
const SERIES_CYCLE_LIGHT = ["#0969da", "#8250df", "#bf8700", "#1a7f37", "#cf222e", "#0f6d8c"];
const SERIES_CYCLE_DARK = ["#58a6ff", "#a371f7", "#d29922", "#3fb950", "#f85149", "#39c5cf"];

export const waterfallEngine: ExtEngine<WaterfallModel> = {
  type: "waterfall",
  aliases: ["waterfall", "waterfall-variance", "waterfall-multi", "waterfall-scenario"],
  parse: parseWaterfall,
  render: renderWaterfall,
};
