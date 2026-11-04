import { getPalette, type Palette } from "../../common";
import type {
  WaterfallAxis,
  WaterfallBreak,
  WaterfallColors,
  WaterfallLineStyle,
  WaterfallModel,
} from "./types";

const SERIES_CYCLE_LIGHT = ["#0969da", "#8250df", "#bf8700", "#1a7f37", "#cf222e", "#0f6d8c"];
const SERIES_CYCLE_DARK = ["#58a6ff", "#a371f7", "#d29922", "#3fb950", "#f85149", "#39c5cf"];

export const PADDING = { top: 44, right: 24, bottom: 52, left: 64 };
export const BAR_GAP = 0.22;
export const MIN_BAR_WIDTH = 8;
export const MAX_BAR_WIDTH = 64;
export const PLOT_HEIGHT = 260;
/** Базовый размер шрифта, если `fontsize` не задан. */
export const FONT_BASE = 11;
export const FONT_MIN = 6;
export const FONT_MAX = 28;
/** Минимальная высота подписи внутри бара. */
export const INSIDE_MIN_HEIGHT = 13;
/** Цвет подписи внутри бара. */
export const INSIDE_TEXT = "#ffffff";
/** Высота полосы-«зигзага» на линии разрыва (сам разрыв места не занимает). */
export const ZIGZAG_HEIGHT = 8;

/** Видимые (не вырезанные) интервалы шкалы. */
export function visibleRanges(axis: WaterfallAxis, breaks: WaterfallBreak[]): Array<[number, number]> {
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
export function createScale(
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
export function resolveColors(model: WaterfallModel, dark?: boolean): WaterfallColors {
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
export function seriesColor(
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
export function shade(hex: string, amount: number): string {
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
export const LINE_DASH: Record<WaterfallLineStyle, string | undefined> = {
  solid: undefined,
  dash: "7 4",
  dot: "1.5 3.5",
  dashdot: "8 3 1.5 3",
};

/** Цвет линии по умолчанию: заметнее сетки, но тише баров. */
export function defaultLineColor(palette: Palette, dark?: boolean): string {
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
export function seriesBarColor(base: string, kind: "total" | "increase" | "decrease"): string {
  if (kind === "increase") return shade(base, 0.2);
  if (kind === "decrease") return shade(base, -0.25);
  return base;
}
