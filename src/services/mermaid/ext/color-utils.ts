import { contrastTextColor, parseHexColor } from "./common";
import type { ExtParseError } from "./types";

export const SERIES_PALETTE_LIGHT = [
  "#0969da",
  "#8250df",
  "#bf8700",
  "#1a7f37",
  "#cf222e",
  "#0f6d8c",
  "#bc4c00",
  "#6e7781",
] as const;

export const SERIES_PALETTE_DARK = [
  "#58a6ff",
  "#a371f7",
  "#d29922",
  "#3fb950",
  "#f85149",
  "#39c5cf",
  "#f0883e",
  "#8b949e",
] as const;

const MONO_STEPS_LIGHT = [0.2, 0.48, 0.72, 0.34, 0.6, 0.82] as const;
const MONO_STEPS_DARK = [0.85, 0.55, 0.32, 0.7, 0.42, 0.22] as const;

const COLOR_HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const CSS_COLOR_FN_RE = /^(?:rgba?|hsla?)\(\s*[-\d.%]+\s*(?:[, ]\s*[-\d.%]+\s*){2,3}\)$/i;

export const NAMED_COLORS_HEX: Readonly<Record<string, string>> = {
  black: "#000000",
  white: "#ffffff",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  red: "#cf222e",
  green: "#2da44e",
  blue: "#0969da",
  orange: "#f97316",
  purple: "#8250df",
  teal: "#0f766e",
  navy: "#1e3a8a",
  maroon: "#800000",
  olive: "#808000",
  gold: "#eab308",
  crimson: "#dc143c",
  steelblue: "#4682b4",
  darkgreen: "#166534",
  darkred: "#991b1b",
  darkblue: "#1e40af",
  cyan: "#0891b2",
  magenta: "#c026d3",
  indigo: "#4f46e5",
  amber: "#d97706",
  emerald: "#059669",
  rose: "#e11d48",
  slate: "#475569",
};

export function isValidExtColor(raw: string): boolean {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return false;
  return (
    COLOR_HEX_RE.test(trimmed) ||
    Object.prototype.hasOwnProperty.call(NAMED_COLORS_HEX, trimmed.toLowerCase()) ||
    CSS_COLOR_FN_RE.test(trimmed)
  );
}

export function normalizeColorToHex(color: string): string {
  const trimmed = String(color ?? "").trim();
  const named = NAMED_COLORS_HEX[trimmed.toLowerCase()];
  if (named) return named;

  const rgb = parseHexColor(trimmed);
  if (rgb) {
    const ch = (v: number) => v.toString(16).padStart(2, "0");
    return `#${ch(rgb.r)}${ch(rgb.g)}${ch(rgb.b)}`;
  }

  const rgbFn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(trimmed);
  if (rgbFn) {
    const ch = (rawPart: string) =>
      Math.max(0, Math.min(255, Math.round(Number(rawPart))))
        .toString(16)
        .padStart(2, "0");
    return `#${ch(rgbFn[1])}${ch(rgbFn[2])}${ch(rgbFn[3])}`;
  }

  return trimmed;
}

/**
 * Затемнить/осветлить цвет: `amount` в диапазоне −1..1
 * (отрицательное — темнее, положительное — светлее).
 */
export function shadeColor(color: string, amount: number): string {
  const hex = normalizeColorToHex(color);
  const rgb = parseHexColor(hex);
  if (!rgb) return color;
  const mix = (channel: number) =>
    Math.max(
      0,
      Math.min(
        255,
        Math.round(amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount),
      ),
    );
  const r = mix(rgb.r);
  const g = mix(rgb.g);
  const b = mix(rgb.b);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Контрастный цвет текста поверх заливки (светлый на тёмном, тёмный на светлом). */
export function readableTextOnFill(fill: string, fallback = "#1f2328"): string {
  const hex = normalizeColorToHex(fill);
  return contrastTextColor(hex) ?? fallback;
}

export function monoStepColor(index: number, dark?: boolean): string {
  const steps = dark ? MONO_STEPS_DARK : MONO_STEPS_LIGHT;
  const ratio = steps[index % steps.length] ?? 0.5;
  const channel = Math.round(255 * ratio)
    .toString(16)
    .padStart(2, "0");
  return `#${channel}${channel}${channel}`;
}

export interface SeriesColorOptions {
  explicitColor?: string;
  seriesColors?: Readonly<Record<string, string>>;
  mono?: boolean;
  dark?: boolean;
}

/**
 * Выбор цвета серии/группы `index` (0-based):
 * 1) явный `color=#hex` элемента/серии;
 * 2) `colors sN=#hex` (1-based);
 * 3) монохромная серая шкала при `mono: true`;
 * 4) цикл палитры темы (`SERIES_PALETTE_LIGHT` / `SERIES_PALETTE_DARK`).
 */
export function resolveSeriesColor(index: number, options: SeriesColorOptions = {}): string {
  if (options.explicitColor) return options.explicitColor;
  const fromSeriesMap = options.seriesColors?.[`s${index + 1}`];
  if (fromSeriesMap) return fromSeriesMap;
  if (options.mono) return monoStepColor(index, options.dark);
  const palette = options.dark ? SERIES_PALETTE_DARK : SERIES_PALETTE_LIGHT;
  return palette[index % palette.length];
}

export function unquoteExtText(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    if (trimmed.length >= 2) {
      return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
  }
  return trimmed;
}

const NUMBER_TOKEN_RE = /^[-+]?\d[\d\s_]*(?:[.,]\d+)?$/;

export function parseExtNumber(raw: string): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!NUMBER_TOKEN_RE.test(trimmed)) return null;
  const cleaned = trimmed.replace(/[\s_]/g, "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/**
 * Снимает необязательный хвост `color=#hex` / `fill=#hex` / `colour=#hex` с конца строки.
 */
export function extractTrailingColorAttr(
  raw: string,
  line: number,
): { rest: string; color?: string; error?: ExtParseError } {
  const match = /\s+(?:color|colour|fill)=("[^"]*"|'[^']*'|\S+)\s*$/i.exec(raw);
  if (!match) return { rest: raw.trim() };

  const value = unquoteExtText(match[1]);
  if (!isValidExtColor(value)) {
    return {
      rest: raw.slice(0, match.index).trim(),
      error: {
        message: `не удалось разобрать цвет «${value}» (ожидается #rgb, #rrggbb или имя цвета)`,
        line,
        col: 0,
      },
    };
  }

  return {
    rest: raw.slice(0, match.index).trim(),
    color: value,
  };
}

/**
 * Разбирает директиву `mono` / `mono on` / `mono off`.
 */
export function parseMonoDirective(
  raw: string,
  line: number,
): { mono?: boolean; monoInvert?: boolean; error?: ExtParseError } {
  const arg = raw.replace(/^mono\b/i, "").trim().toLowerCase();
  if (!arg || arg === "on" || arg === "true" || arg === "yes") return { mono: true, monoInvert: false };
  if (arg === "off" || arg === "false" || arg === "no") return { mono: false, monoInvert: false };
  if (arg === "invert" || arg === "inverted" || arg === "inverse") return { mono: true, monoInvert: true };
  return {
    error: {
      message: `ожидается «mono», «mono invert» или «mono off», получено «${raw}»`,
      line,
      col: 0,
    },
  };
}

/** `mono invert` включает тёмную палитру, даже если тема редактора светлая. */
export function chartIsDark(dark?: boolean, monoInvert?: boolean): boolean {
  return Boolean(dark) || Boolean(monoInvert);
}

/**
 * Разбирает директиву `colors s1=#hex s2=#hex ...` и опциональные именованные ключи.
 * Также принимает перечисление цветов через пробел/запятую без ключей (`colors #0969da #8250df`),
 * автоматически раскладывая их в `s1`, `s2`, ...
 */
export function parseExtColorsDirective(
  body: string,
  line: number,
  namedAliases: Readonly<Record<string, string>> = {},
): {
  named: Record<string, string>;
  seriesColors: Record<string, string>;
  error?: ExtParseError;
} {
  const named: Record<string, string> = {};
  const seriesColors: Record<string, string> = {};
  const tokens = body
    .trim()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return {
      named,
      seriesColors,
      error: {
        message: `ожидается «colors s1=#hex s2=#hex ...»`,
        line,
        col: 0,
      },
    };
  }

  let autoSeriesIndex = 1;
  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq < 0) {
      const bareColor = unquoteExtText(token);
      if (!isValidExtColor(bareColor)) {
        return {
          named,
          seriesColors,
          error: {
            message: `не удалось разобрать цвет «${token}» (ожидается key=#hex или #hex)`,
            line,
            col: 0,
          },
        };
      }
      seriesColors[`s${autoSeriesIndex}`] = bareColor;
      autoSeriesIndex += 1;
      continue;
    }

    const rawKey = token.slice(0, eq).trim().toLowerCase();
    const rawVal = unquoteExtText(token.slice(eq + 1));
    if (!isValidExtColor(rawVal)) {
      return {
        named,
        seriesColors,
        error: {
          message: `не удалось разобрать цвет «${rawVal}» (ожидается #rgb, #rrggbb или имя цвета)`,
          line,
          col: 0,
        },
      };
    }

    const seriesMatch = /^(?:s|g|series|group|c|cat|category)(\d+)$/i.exec(rawKey);
    if (seriesMatch) {
      const idx = Number(seriesMatch[1]);
      if (!(idx >= 1)) {
        return {
          named,
          seriesColors,
          error: {
            message: `номер серии должен быть ≥ 1, получено «${token}»`,
            line,
            col: 0,
          },
        };
      }
      seriesColors[`s${idx}`] = rawVal;
      continue;
    }

    const mappedKey = namedAliases[rawKey];
    if (mappedKey) {
      named[mappedKey] = rawVal;
      continue;
    }

    return {
      named,
      seriesColors,
      error: {
        message: `неизвестный ключ цвета «${rawKey}» (ожидается s1=, s2=...)`,
        line,
        col: 0,
      },
    };
  }

  return { named, seriesColors };
}
