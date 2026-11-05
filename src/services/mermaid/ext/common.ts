/**
 * Общий слой рендера: измерение текста без DOM, палитра, сборка SVG.
 * Ни document, ни window, ни canvas — иначе рендер не работает в тестах и SSR.
 */

export interface Palette {
  bg: string;
  fg: string;
  fgDim: string;
  grid: string;
  axis: string;
  positive: string;
  negative: string;
  neutral: string;
  accent: string;
}

const LIGHT: Palette = {
  bg: "#ffffff",
  fg: "#1f2328",
  fgDim: "#656d76",
  grid: "#d8dee4",
  axis: "#656d76",
  positive: "#2da44e",
  negative: "#cf222e",
  neutral: "#0969da",
  accent: "#8250df",
};

const DARK: Palette = {
  bg: "#1a1d21",
  fg: "#e6edf3",
  fgDim: "#8b949e",
  grid: "#30363d",
  axis: "#8b949e",
  positive: "#3fb950",
  negative: "#f85149",
  neutral: "#58a6ff",
  accent: "#a371f7",
};

export function getPalette(dark?: boolean): Palette {
  return dark ? DARK : LIGHT;
}

// --- Цвет фона и контраст текста ------------------------------------------

/** `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` → `{ r, g, b }` (0–255). */
export function parseHexColor(value: string): { r: number; g: number; b: number } | null {
  const raw = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{3,8}$/i.test(raw)) return null;
  const expand = (chunk: string) => chunk + chunk;
  if (raw.length === 3 || raw.length === 4) {
    const [r, g, b] = [expand(raw[0]), expand(raw[1]), expand(raw[2])];
    return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
  }
  if (raw.length === 6 || raw.length === 8) {
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }
  return null;
}

/** Относительная яркость по WCAG 2.1 (0 — чёрный, 1 — белый). */
export function relativeLuminance(color: string): number | null {
  const rgb = parseHexColor(color);
  if (!rgb) return null;
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Тёмный ли фон: на нём нужен светлый текст. */
export function isDarkColor(color: string): boolean {
  const luminance = relativeLuminance(color);
  return luminance !== null && luminance < 0.45;
}

/** Цвет, который читается на заданном фоне (или `null`, если фон не hex). */
export function contrastTextColor(background: string): string | null {
  const luminance = relativeLuminance(background);
  if (luminance === null) return null;
  return luminance < 0.45 ? DARK.fg : LIGHT.fg;
}

/**
 * Пустая строка и «transparent» — это «не задано», а не цвет.
 * Окно оформления хранит автоподбор текста именно пустой строкой.
 */
function explicitPaint(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === "transparent" || lower === "none") return undefined;
  const rgb = parseHexColor(trimmed);
  if (!rgb) return trimmed;
  const channel = (part: number) => part.toString(16).padStart(2, "0");
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

/**
 * Палитра под конкретный фон диаграммы.
 *
 * `background` (директива `background #hex`) переопределяет плашку холста, а
 * цвет текста подбирается под неё: иначе на тёмном фоне остаётся тёмный текст
 * и подписи не читаются. `textColor` (`textcolor #hex`) — ручное перекрытие
 * автоподбора. Без `background` палитра та же, что и раньше (тема dark/light).
 */
export function resolvePalette(
  dark: boolean | undefined,
  background?: string,
  textColor?: string,
): Palette {
  const base = getPalette(dark);
  // "" из окна «Внешний вид» значит «подобрать автоматически», а не «без заливки».
  const manual = explicitPaint(textColor);
  const paint = explicitPaint(background);
  if (!paint) {
    return manual ? { ...base, fg: manual, fgDim: manual } : base;
  }

  const onDark = isDarkColor(paint);
  const fg = manual ?? (onDark ? DARK.fg : LIGHT.fg);
  const fgDim = manual ?? (onDark ? DARK.fgDim : LIGHT.fgDim);
  return {
    ...base,
    bg: paint,
    fg,
    fgDim,
    // Сетка и ось — «тихие» линии: на тёмном фоне светлее, на светлом темнее.
    grid: onDark ? DARK.grid : LIGHT.grid,
    axis: onDark ? DARK.axis : LIGHT.axis,
  };
}

/** `mono` — серое на светлом; `mono invert` — серое на тёмном. */
export type MonoDirectiveMode = "off" | "on" | "invert";

export interface MonoFlags {
  mono: boolean;
  /** Светлая серая шкала и тёмный холст (`mono invert`). */
  monoInvert: boolean;
}

const MONO_ON = new Set(["", "on", "true", "yes", "bw"]);
const MONO_OFF = new Set(["off", "false", "no", "color", "colour"]);
const MONO_INVERT = new Set(["invert", "inverted", "inverse"]);

/**
 * Хвост директивы `mono` (без самого слова).
 * `mono`, `mono on` — ч/б; `mono invert` — инверсия для тёмной темы; `mono off` — цвет.
 */
export function parseMonoDirective(token: string): { mode: MonoDirectiveMode } | { error: string } {
  const normalized = token.trim().toLowerCase();
  if (MONO_ON.has(normalized)) return { mode: "on" };
  if (MONO_OFF.has(normalized)) return { mode: "off" };
  if (MONO_INVERT.has(normalized)) return { mode: "invert" };
  return {
    error: `ожидается «mono», «mono invert» или «mono off», получено «${token.trim()}»`,
  };
}

export function monoFlagsFromMode(mode: MonoDirectiveMode): MonoFlags {
  if (mode === "off") return { mono: false, monoInvert: false };
  if (mode === "invert") return { mono: true, monoInvert: true };
  return { mono: true, monoInvert: false };
}

/** `mono` на тёмной теме сам разворачивает шкалу; `mono invert` разворачивает всегда. */
export function usesInvertedMono(
  mono: boolean | undefined,
  monoInvert: boolean | undefined,
  dark?: boolean,
): boolean {
  if (monoInvert) return true;
  return Boolean(mono) && Boolean(dark);
}

/**
 * Серый из ряда `index` / `count`.
 * Обычный режим — от тёмного к светлому (печать). Инверсия — от светлого к тёмному.
 */
export function monoGray(index: number, count: number, invert: boolean): string {
  const slots = Math.max(count, 1);
  const t = slots === 1 ? 0.45 : index / (slots - 1);
  const light = invert ? 0.92 - t * 0.5 : 0.12 + t * 0.62;
  const v = Math.round(clamp(light, 0, 1) * 255);
  const hex = v.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}

/** Цвет → серый той же светлоты. `invert` зеркалит светлоту для тёмного фона. */
export function monoPaint(color: string, invert: boolean): string {
  const luminance = relativeLuminance(color);
  if (luminance === null) return invert ? "#d4d4d4" : "#404040";
  const shifted = invert ? 1 - luminance : luminance;
  const light = 0.18 + shifted * 0.68;
  const v = Math.round(clamp(light, 0, 1) * 255);
  const hex = v.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}

export const FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const DEBUG_COLOR = "#ff00aa";

// --- Экранирование и форматирование ---------------------------------------

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Число → строка: до 2 знаков, без хвостовых нулей. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// --- Измерение текста без DOM ---------------------------------------------

const WIDTHS: Record<string, number> = {
  " ": 0.28,
  ".": 0.28,
  ",": 0.28,
  ":": 0.28,
  ";": 0.28,
  "|": 0.26,
  "!": 0.3,
  "'": 0.22,
  '"': 0.4,
  "-": 0.35,
  "–": 0.5,
  "—": 0.9,
  "+": 0.6,
  "=": 0.6,
  "/": 0.4,
  "\\": 0.4,
  "(": 0.35,
  ")": 0.35,
  "[": 0.35,
  "]": 0.35,
  "%": 0.86,
  "₽": 0.62,
  "$": 0.6,
  "€": 0.62,
  "°": 0.42,
  "→": 0.85,
  "←": 0.85,
  "↑": 0.6,
  "↓": 0.6,
  "…": 0.9,
  "«": 0.45,
  "»": 0.45,
};

const DIGIT = 0.56;
const LOWER_LATIN = 0.52;
const UPPER_LATIN = 0.66;
const LOWER_CYR = 0.54;
const UPPER_CYR = 0.68;
const UNKNOWN = 0.58;

function glyphWidth(ch: string): number {
  const known = WIDTHS[ch];
  if (known !== undefined) return known;
  if (ch >= "0" && ch <= "9") return DIGIT;
  if (/[a-z]/.test(ch)) return LOWER_LATIN;
  if (/[A-Z]/.test(ch)) return UPPER_LATIN;
  if (/[а-яё]/.test(ch)) return LOWER_CYR;
  if (/[А-ЯЁ]/.test(ch)) return UPPER_CYR;
  return UNKNOWN;
}

/** Ширина строки в px. Точность ±8% — этого достаточно для раскладки. */
export function measureText(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of String(text ?? "")) em += glyphWidth(ch);
  return em * fontSize;
}

export function textHeight(fontSize: number): number {
  return fontSize * 1.2;
}

/** Обрезка по ширине с добавлением «…». */
export function truncate(text: string, maxWidth: number, fontSize: number): string {
  const src = String(text ?? "");
  if (measureText(src, fontSize) <= maxWidth) return src;
  const ellipsis = "…";
  const ellipsisWidth = measureText(ellipsis, fontSize);
  let out = "";
  let width = 0;
  for (const ch of src) {
    const w = glyphWidth(ch) * fontSize;
    if (width + w + ellipsisWidth > maxWidth) break;
    out += ch;
    width += w;
  }
  return out ? out + ellipsis : ellipsis;
}

// --- Оси ------------------------------------------------------------------

/**
 * «Круглые» деления от min до max: шаг 1/2/5 × 10ⁿ.
 * Возвращает отсортированный массив значений, включая границы, если они круглые.
 */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const span = max - min;
  const rawStep = span / Math.max(1, count);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / magnitude;
  const stepMul = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = stepMul * magnitude;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-9; v += step) {
    ticks.push(Math.round(v / step) * step);
  }
  return ticks;
}

/**
 * Деления с явным шагом сетки: `step` — любое положительное число,
 * не обязательно «круглое». Начинаем с первого кратного step не ниже min.
 */
export function fixedTicks(min: number, max: number, step: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(step > 0)) return [];
  const eps = step * 1e-9;
  const start = Math.ceil((min - eps) / step) * step;
  const ticks: number[] = [];
  // Защита от бесконечного цикла на вырожденных данных.
  for (let v = start, guard = 0; v <= max + eps && guard < 1000; v += step, guard += 1) {
    ticks.push(Math.round(v / step) * step);
  }
  return ticks;
}

/** Округление диапазона до «круглых» границ. */
export function niceRange(min: number, max: number, count = 5): { min: number; max: number } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 1, max: max + 1 };
  const span = max - min;
  const rawStep = span / Math.max(1, count);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / magnitude;
  const stepMul = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = stepMul * magnitude;
  return {
    min: Math.floor(min / step) * step,
    max: Math.ceil(max / step) * step,
  };
}

// --- Строитель SVG --------------------------------------------------------

export interface SvgOptions {
  width: number;
  height: number;
  palette: Palette;
  title?: string;
  debugFrames?: boolean;
  /**
   * Фоновая плашка. По умолчанию включена; выключается там, где тесты
   * считают элементы по тегам (heatmap) — фон даёт лишний `<rect>`.
   */
  background?: boolean;
}

export interface SvgBuilder {
  readonly palette: Palette;
  readonly debugFrames: boolean;
  /** Открыть группу с transform и/или id. */
  group(attrs: Record<string, string | number>, body: () => void): void;
  rect(x: number, y: number, w: number, h: number, attrs?: Record<string, string | number>): void;
  line(x1: number, y1: number, x2: number, y2: number, attrs?: Record<string, string | number>): void;
  path(d: string, attrs?: Record<string, string | number>): void;
  circle(cx: number, cy: number, r: number, attrs?: Record<string, string | number>): void;
  polyline(points: string, attrs?: Record<string, string | number>): void;
  text(
    x: number,
    y: number,
    content: string,
    attrs?: Record<string, string | number>,
  ): void;
  raw(markup: string): void;
  toString(): string;
}

export function createSvg(options: SvgOptions): SvgBuilder {
  const { width, height, palette, title, debugFrames } = options;
  const withBackground = options.background !== false;
  const parts: string[] = [];
  const stack: string[] = [];

  const debugAttrs = (id?: string): Record<string, string> => {
    if (!debugFrames) return {};
    return {
      "data-debug": id ?? "el",
      stroke: DEBUG_COLOR,
      "stroke-width": "0.5",
    };
  };

  const attrsToString = (attrs: Record<string, string | number>): string =>
    Object.entries(attrs)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => ` ${k}="${esc(typeof v === "number" ? fmt(v) : v)}"`)
      .join("");

  const builder: SvgBuilder = {
    palette,
    debugFrames: Boolean(debugFrames),

    group(attrs, body) {
      parts.push(`<g${attrsToString(attrs)}>`);
      stack.push("g");
      body();
      parts.push("</g>");
      stack.pop();
    },

    rect(x, y, w, h, attrs = {}) {
      parts.push(
        `<rect${attrsToString({ x, y, width: w, height: h, ...debugAttrs("rect"), ...attrs })}/>`,
      );
    },

    line(x1, y1, x2, y2, attrs = {}) {
      parts.push(`<line${attrsToString({ x1, y1, x2, y2, ...debugAttrs("line"), ...attrs })}/>`);
    },

    path(d, attrs = {}) {
      parts.push(`<path${attrsToString({ d, ...debugAttrs("path"), ...attrs })}/>`);
    },

    circle(cx, cy, r, attrs = {}) {
      parts.push(`<circle${attrsToString({ cx, cy, r, ...debugAttrs("circle"), ...attrs })}/>`);
    },

    polyline(points, attrs = {}) {
      parts.push(
        `<polyline${attrsToString({ points, fill: "none", ...debugAttrs("polyline"), ...attrs })}/>`,
      );
    },

    text(x, y, content, attrs = {}) {
      const merged = {
        x,
        y,
        fill: palette.fg,
        "font-size": 12,
        "text-anchor": "middle",
        ...debugAttrs("text"),
        ...attrs,
      };
      parts.push(`<text${attrsToString(merged)}>${esc(content)}</text>`);
    },

    raw(markup) {
      parts.push(markup);
    },

    toString() {
      // width/height заданы явно: svgToPngBlob() строит canvas по parseSvgSize(),
      // и без них PNG выходит дефолтным 800×600. sanitizeSvgForPreview() при этом
      // всё равно материализует размер из viewBox, так что превью не меняется.
      const head =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(width)} ${fmt(height)}" ` +
        `width="${fmt(width)}" height="${fmt(height)}" ` +
        `role="img" font-family="${esc(FONT_FAMILY)}">`;
      const titleEl = title ? `<title>${esc(title)}</title>` : "";
      // data-bg="canvas" — метка «это плашка холста, а не данные». По ней
      // экспорт с прозрачным фоном снимает заливку, не гадая по цвету и
      // размеру: белые плашки внутри диаграммы (вырезы под подписи) остаются.
      const bg = withBackground
        ? `<rect data-bg="canvas" x="0" y="0" width="${fmt(width)}" height="${fmt(height)}" fill="${esc(palette.bg)}"/>`
        : "";
      return `${head}${titleEl}${bg}${parts.join("")}</svg>`;
    },
  };

  return builder;
}

/**
 * Маркер-стрелка для orgchart. Возвращает markup и id для ссылки.
 */
export function arrowMarker(
  palette: Palette,
  id = "ext-arrow",
  color?: string,
): { markup: string; id: string; ref: string } {
  const fill = color ?? palette.axis;
  const markup =
    `<defs><marker id="${esc(id)}" viewBox="0 0 10 10" refX="9" refY="5" ` +
    `markerWidth="6" markerHeight="6" orient="auto-start-reverse">` +
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="${esc(fill)}"/></marker></defs>`;
  return { markup, id, ref: `url(#${id})` };
}
