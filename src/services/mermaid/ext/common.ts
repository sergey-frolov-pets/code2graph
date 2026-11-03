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
