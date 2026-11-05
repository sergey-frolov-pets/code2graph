import { clamp, fmt } from "../../common";
import type { ExtParseError } from "../../types";
import type {
  StepKind,
  WaterfallBreak,
  WaterfallColors,
  WaterfallLine,
  WaterfallLineStyle,
  WaterfallSeriesColors,
  WaterfallStep,
} from "./types";

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

export function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!NUMBER_RE.test(trimmed)) return null;
  const cleaned = trimmed.replace(/[\s_]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Цвет в CSS-нотации: `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)`. */
const CSS_COLOR_FN_RE = /^(?:rgba?|hsla?)\(\s*[-\d.%]+\s*(?:[, ]\s*[-\d.%]+\s*){2,3}\)$/i;

export function isColor(raw: string): boolean {
  const t = raw.trim();
  return COLOR_RE.test(t) || COLOR_NAMES.has(t.toLowerCase()) || CSS_COLOR_FN_RE.test(t);
}

/** Подпись в кавычках + два числа вокруг `-->`. */
export function parseAxis(line: string): { label?: string; min: number; max: number } | null {
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

const FLAG_VALUE_RE = '(?:"(?:[^"\\\\]|\\\\.)*"|\\S+)';
/**
 * Флаги хвоста строки данных. `inside` и `above` можно писать вместе,
 * и у каждого может быть свой текст: `inside="60" above="+60 млн"`.
 * Один только `inside` не включает подпись над баром.
 */
const STEP_FLAG_RE = new RegExp(
  `\\s+(inside(?:=${FLAG_VALUE_RE})?|above(?:=${FLAG_VALUE_RE})?|no-label|label=${FLAG_VALUE_RE})\\s*$`,
  "i",
);

function unquoteFlagValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}

/**
 * Разбор хвоста строки данных.
 * Поддерживаются флаги (порядок любой, регистр не важен):
 *   `inside` / `inside="<текст>"` — подпись внутри бара (свой текст опционален)
 *   `above` / `above="<текст>"` — подпись над баром (свой текст опционален)
 *   `no-label` — без подписи значения
 *   `label=<текст>` — общий текст для позиции, у которой нет своего
 *
 * `inside` и `above` можно ставить одновременно с разными текстами.
 * Указан только один из них — вторая позиция не рисуется.
 */
export function parseStepFlags(tail: string): {
  rest: string;
  inside: boolean;
  above: boolean;
  hide: boolean;
  valueLabel?: string;
  insideLabel?: string;
  aboveLabel?: string;
} {
  let rest = tail;
  let inside = false;
  let above = false;
  let hide = false;
  let valueLabel: string | undefined;
  let insideLabel: string | undefined;
  let aboveLabel: string | undefined;

  for (let guard = 0; guard < 8; guard += 1) {
    const m = STEP_FLAG_RE.exec(rest);
    if (!m) break;
    const rawToken = m[1];
    const token = rawToken.toLowerCase();
    if (token === "inside" || token.startsWith("inside=")) {
      inside = true;
      if (token.startsWith("inside=")) {
        insideLabel = unquoteFlagValue(rawToken.slice("inside=".length));
      }
    } else if (token === "above" || token.startsWith("above=")) {
      above = true;
      if (token.startsWith("above=")) {
        aboveLabel = unquoteFlagValue(rawToken.slice("above=".length));
      }
    } else if (token === "no-label") hide = true;
    else if (token.startsWith("label=")) {
      valueLabel = unquoteFlagValue(rawToken.slice("label=".length));
    }
    rest = rest.slice(0, m.index);
  }

  return { rest: rest.trim(), inside, above, hide, valueLabel, insideLabel, aboveLabel };
}

export function parseStep(
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
  if (flags.valueLabel !== undefined) step.valueText = flags.valueLabel;
  if (flags.insideLabel !== undefined) step.insideText = flags.insideLabel;
  if (flags.aboveLabel !== undefined) step.aboveText = flags.aboveLabel;
  return { step };
}

/** `break <после> --> <до> ["подпись"]` */
export function parseBreak(
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

/** Стили линии в том виде, как их пишут: dashed/--/-. и т. п. */
export function normalizeLineStyle(raw: string): WaterfallLineStyle | null {
  const t = raw.trim().toLowerCase().replace(/^["']|["']$/g, "");
  switch (t) {
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

/**
 * `line <значение> ["подпись"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]`
 *
 * Хвост после значения разбирается по токенам: сначала снимаются `key=value`,
 * затем остаток в кавычках (или без) считается подписью. Порядок любой.
 */
export function parseLine(
  text: string,
  line: number,
): { line?: WaterfallLine; error?: ExtParseError } {
  // Терпимость к «как пишут люди», а не «как задумано»:
  //   line: 350      line=350      line 350, "план"     line +350
  //   width=2px      style=dashed  style=--            color=red (имя)
  // Всё это — валидные варианты одной и той же директивы.
  const body = text.trim().replace(/^[:=]\s*/, "").replace(/^\+/, "");
  const valueMatch = /^(-?[\d\s_.]+)(?=\s|[,;]|$)/.exec(body);
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
  // Запятая/точка с запятой сразу после числа — просто разделитель.
  let rest = body.slice(valueMatch[0].length).replace(/^\s*[,;]\s*/, "").trim();

  // Подпись может стоять и ПЕРЕД параметрами: `line 400 "цель" color=#cf222e`.
  // Поэтому кавычки снимаются первым проходом, а не после разбора key=value.
  const LEADING_LABEL_RE = /^"((?:[^"\\]|\\.)*)"\s*/;
  const leading = LEADING_LABEL_RE.exec(rest);
  if (leading) {
    result.label = leading[1].replace(/\\"/g, '"');
    rest = rest.slice(leading[0].length);
  }

  // Синонимы ключей: stroke/colour — цвет, thickness — толщина, dash — стиль.
  const TOKEN_RE = /(?:^|\s)(color|colour|stroke|width|thickness|style|dash)=("[^"]*"|\S*)\s*/i;
  for (let guard = 0; guard < 8; guard += 1) {
    const m = TOKEN_RE.exec(rest);
    if (!m) break;
    const rawKey = m[1].toLowerCase();
    const key =
      rawKey === "colour" || rawKey === "stroke"
        ? "color"
        : rawKey === "thickness"
          ? "width"
          : rawKey;
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
      const width = parseNumber(raw.replace(/\s*(px|pt)$/i, ""));
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
      const style = normalizeLineStyle(raw);
      if (!style) {
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

  // Хвост без ключей: `line 350 "план" dash`, `line 350 план dash`,
  // `line 350 "план" #cf222e`. Голый цвет и голый стиль — параметры,
  // остальное — подпись (в кавычках или одним-двумя словами).
  rest = rest.trim();
  // Подпись в кавычках может стоять и ПОСЛЕ параметров: `line 50 color=red "цель"`.
  if (rest && !result.label) {
    const quoted = /^"((?:[^"\\]|\\.)*)"\s*/.exec(rest);
    if (quoted) {
      result.label = quoted[1].replace(/\\"/g, '"');
      rest = rest.slice(quoted[0].length).trim();
    }
  }
  if (rest) {
    const words = rest.startsWith('"') ? [] : rest.split(/\s+/);
    const kept: string[] = [];
    for (const word of words) {
      if (!result.color && isColor(word)) {
        result.color = word;
        continue;
      }
      if (!result.style) {
        const bareStyle = normalizeLineStyle(word);
        if (bareStyle) {
          result.style = bareStyle;
          continue;
        }
      }
      kept.push(word);
    }
    rest = kept.join(" ");
    if (!rest && !result.label) {
      // Всё ушло в параметры — подписи нет.
    }
  }

  // Всё, что осталось, — подпись (в кавычках или как есть). Если подпись
  // уже взята из кавычек в начале строки, остаток дописывается к ней.
  rest = rest.trim();
  if (rest) {
    const tail =
      rest.startsWith('"') && rest.endsWith('"') && rest.length >= 2
        ? rest.slice(1, -1).replace(/\\"/g, '"')
        : rest;
    result.label = result.label ? `${result.label} ${tail}`.trim() : tail;
    if (!result.label) delete result.label;
  }

  return { line: result };
}

/** `labels above|inside|both|none` */
export function parseLabelsMode(
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
export function parseColors(
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
export function parseSeriesHeader(raw: string): { name?: string; color?: string } {
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
