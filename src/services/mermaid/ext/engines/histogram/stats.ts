/**
 * Статистика гистограммы: очистка выборки, моменты, интервал Стьюдента,
 * бины и кривые распределений. Без DOM и без внешних библиотек.
 */

export const BIN_COUNT_MIN = 1;
export const BIN_COUNT_MAX = 60;
export const DEFAULT_CI_LEVEL = 0.95;
export const DEFAULT_IQR_FACTOR = 1.5;
export const DEFAULT_Z_CUTOFF = 3;
export const DEFAULT_MAD_CUTOFF = 3;
/** Согласованная с нормальным законом оценка σ по MAD. */
export const MAD_NORMAL_CONSISTENCY = 1.4826;
export const CURVE_SAMPLE_COUNT = 128;
export const WEIBULL_SHAPE_MIN = 0.05;
export const WEIBULL_SHAPE_MAX = 100;
export const WEIBULL_BISECTION_STEPS = 80;
export const BETA_INVERSE_STEPS = 60;
export const BETA_CF_MAX_ITER = 200;
/** Полуширина единственного бина, когда все наблюдения совпали. */
export const DEGENERATE_BIN_HALF_WIDTH = 0.5;
export const STURGES_LOG_BASE = 2;

const LANCZOS_G = 7;
const LANCZOS_COEFFICIENTS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
] as const;

const BETA_CF_EPSILON = 3e-12;
const BETA_CF_FPMIN = 1e-30;
const DISTRIBUTION_PDF_FLOOR = 0;

export const MISSING_TOKENS = new Set([
  "",
  "na",
  "n/a",
  "null",
  "none",
  "nan",
  "-",
  "—",
  ".",
]);

export type DistributionName =
  | "normal"
  | "lognormal"
  | "exponential"
  | "uniform"
  | "gamma"
  | "weibull";

export const DISTRIBUTION_NAMES: readonly DistributionName[] = [
  "normal",
  "lognormal",
  "exponential",
  "uniform",
  "gamma",
  "weibull",
];

export type MissingMode = "drop" | "mean" | "median" | "zero";
export type ErrorMode = "drop" | "fail";
export type OutlierMethod = "none" | "iqr" | "z" | "mad";
export type OutlierAction = "drop" | "winsor" | "mark";

export interface RawToken {
  kind: "number" | "missing" | "error";
  raw: string;
  value?: number;
}

export interface OutlierSpec {
  method: OutlierMethod;
  k: number;
  action: OutlierAction;
}

export interface CleanedSample {
  values: number[];
  missingCount: number;
  errorCount: number;
  outlierCount: number;
  imputedCount: number;
}

export interface SampleSummary {
  n: number;
  mean: number;
  median: number;
  /** Выборочная дисперсия, делитель n−1. */
  variance: number;
  /** Корень выборочной дисперсии. */
  sd: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  skew: number;
  kurtosis: number;
  ciLow?: number;
  ciHigh?: number;
}

export interface DistributionParams {
  mu?: number;
  sigma?: number;
  rate?: number;
  a?: number;
  b?: number;
  shape?: number;
  scale?: number;
}

export function isDistributionName(value: string): value is DistributionName {
  return (DISTRIBUTION_NAMES as readonly string[]).includes(value);
}

export function classifyToken(raw: string): RawToken {
  const trimmed = raw.trim();
  if (MISSING_TOKENS.has(trimmed.toLowerCase())) {
    return { kind: "missing", raw: trimmed };
  }
  const value = parseHistogramNumber(trimmed);
  if (value === null) return { kind: "error", raw: trimmed };
  return { kind: "number", raw: trimmed, value };
}

/** Число гистограммы: точка или запятая как десятичный разделитель, без списка. */
export function parseHistogramNumber(raw: string): number | null {
  const trimmed = raw.trim().replace(/[\s_]/g, "");
  if (!/^[-+]?\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function quantile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

export function meanOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

export function sampleVariance(values: readonly number[], mean = meanOf(values)): number {
  if (values.length < 2) return 0;
  let sum = 0;
  for (const value of values) {
    const delta = value - mean;
    sum += delta * delta;
  }
  return sum / (values.length - 1);
}

/** Сигма нормального подбора: ММП, делитель n. */
export function mleSigma(values: readonly number[], mean = meanOf(values)): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const value of values) {
    const delta = value - mean;
    sum += delta * delta;
  }
  return Math.sqrt(sum / values.length);
}

export function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const argument = z - 1;
  let series = LANCZOS_COEFFICIENTS[0];
  for (let i = 1; i < LANCZOS_COEFFICIENTS.length; i += 1) {
    series += LANCZOS_COEFFICIENTS[i] / (argument + i);
  }
  const shifted = argument + LANCZOS_G + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (argument + 0.5) * Math.log(shifted) -
    shifted +
    Math.log(series)
  );
}

function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function continuedFractionBeta(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < BETA_CF_FPMIN) d = BETA_CF_FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= BETA_CF_MAX_ITER; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < BETA_CF_FPMIN) d = BETA_CF_FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < BETA_CF_FPMIN) c = BETA_CF_FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < BETA_CF_FPMIN) d = BETA_CF_FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < BETA_CF_FPMIN) c = BETA_CF_FPMIN;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < BETA_CF_EPSILON) break;
  }
  return h;
}

/** Регуляризованная неполная бета I_x(a, b). */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnPrefix = a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b);
  if (x < (a + 1) / (a + b + 2)) {
    return (Math.exp(lnPrefix) * continuedFractionBeta(a, b, x)) / a;
  }
  return 1 - (Math.exp(lnPrefix) * continuedFractionBeta(b, a, 1 - x)) / b;
}

export function inverseRegularizedIncompleteBeta(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < BETA_INVERSE_STEPS; step += 1) {
    const mid = (lo + hi) / 2;
    if (regularizedIncompleteBeta(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Двусторонний квантиль Стьюдента: P(|T| > t) = 1 − level.
 * level = 0.95, df = 10 → около 2.228.
 */
export function studentTCritical(df: number, level: number): number {
  if (!(df > 0) || !(level > 0) || !(level < 1)) return Number.NaN;
  const alpha = 1 - level;
  const x = inverseRegularizedIncompleteBeta(alpha, df / 2, 0.5);
  if (!(x > 0) || x >= 1) return Number.NaN;
  return Math.sqrt((df * (1 - x)) / x);
}

export function summarize(values: readonly number[], ciLevel = DEFAULT_CI_LEVEL): SampleSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = meanOf(sorted);
  const variance = sampleVariance(sorted, mean);
  const sd = Math.sqrt(variance);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  let m3 = 0;
  let m4 = 0;
  for (const value of sorted) {
    const delta = value - mean;
    const square = delta * delta;
    m3 += square * delta;
    m4 += square * square;
  }
  if (n > 0) {
    m3 /= n;
    m4 /= n;
  }
  const m2 = n > 0 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n : 0;
  const skew = m2 > 0 ? m3 / m2 ** 1.5 : 0;
  const kurtosis = m2 > 0 ? m4 / m2 ** 2 - 3 : 0;
  const summary: SampleSummary = {
    n,
    mean,
    median: quantile(sorted, 0.5),
    variance,
    sd,
    min: sorted[0] ?? 0,
    max: sorted[n - 1] ?? 0,
    q1,
    q3,
    iqr: q3 - q1,
    skew,
    kurtosis,
  };
  if (n >= 2 && sd > 0 && ciLevel > 0 && ciLevel < 1) {
    const t = studentTCritical(n - 1, ciLevel);
    if (Number.isFinite(t)) {
      const half = (t * sd) / Math.sqrt(n);
      summary.ciLow = mean - half;
      summary.ciHigh = mean + half;
    }
  }
  return summary;
}

function medianAbsoluteDeviation(sorted: readonly number[], median: number): number {
  const deviations = sorted.map((value) => Math.abs(value - median)).sort((a, b) => a - b);
  return quantile(deviations, 0.5);
}

export function outlierFences(
  values: readonly number[],
  spec: OutlierSpec,
): { low: number; high: number } | null {
  if (spec.method === "none" || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const summary = summarize(sorted);
  if (spec.method === "iqr") {
    const pad = spec.k * summary.iqr;
    return { low: summary.q1 - pad, high: summary.q3 + pad };
  }
  if (spec.method === "z") {
    if (!(summary.sd > 0)) return { low: summary.mean, high: summary.mean };
    return { low: summary.mean - spec.k * summary.sd, high: summary.mean + spec.k * summary.sd };
  }
  const mad = medianAbsoluteDeviation(sorted, summary.median);
  const scale = spec.k * MAD_NORMAL_CONSISTENCY * mad;
  if (!(scale > 0)) return { low: summary.median, high: summary.median };
  return { low: summary.median - scale, high: summary.median + scale };
}

export function cleanSample(
  tokens: readonly RawToken[],
  missing: MissingMode,
  spec: OutlierSpec,
): CleanedSample | { error: string } {
  const numbers: number[] = [];
  let missingCount = 0;
  let errorCount = 0;
  for (const token of tokens) {
    if (token.kind === "number" && token.value !== undefined) numbers.push(token.value);
    else if (token.kind === "missing") missingCount += 1;
    else errorCount += 1;
  }

  let imputedCount = 0;
  if (missing !== "drop" && missingCount > 0) {
    if (numbers.length === 0 && missing !== "zero") {
      return { error: "нечем заполнить пропуски: в серии нет чисел" };
    }
    const fill =
      missing === "zero"
        ? 0
        : missing === "mean"
          ? meanOf(numbers)
          : quantile([...numbers].sort((a, b) => a - b), 0.5);
    for (let i = 0; i < missingCount; i += 1) numbers.push(fill);
    imputedCount = missingCount;
    missingCount = 0;
  }

  const fences = outlierFences(numbers, spec);
  let outlierCount = 0;
  let values = numbers;
  if (fences && spec.method !== "none") {
    const outside = (value: number) => value < fences.low || value > fences.high;
    outlierCount = numbers.filter(outside).length;
    if (spec.action === "drop") {
      values = numbers.filter((value) => !outside(value));
    } else if (spec.action === "winsor") {
      values = numbers.map((value) => Math.min(fences.high, Math.max(fences.low, value)));
    }
  }

  return { values, missingCount, errorCount, outlierCount, imputedCount };
}

export interface BinSpec {
  mode: "auto" | "count" | "width" | "edges";
  count?: number;
  width?: number;
  edges?: number[];
}

export function clampBinCount(count: number): number {
  if (!Number.isFinite(count)) return BIN_COUNT_MIN;
  return Math.max(BIN_COUNT_MIN, Math.min(BIN_COUNT_MAX, Math.round(count)));
}

export function freedmanDiaconisCount(values: readonly number[]): number {
  const n = values.length;
  if (n <= 1) return BIN_COUNT_MIN;
  const sorted = [...values].sort((a, b) => a - b);
  const span = sorted[n - 1] - sorted[0];
  if (!(span > 0)) return BIN_COUNT_MIN;
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const width = 2 * iqr * n ** (-1 / 3);
  if (!(width > 0)) {
    return clampBinCount(Math.ceil(Math.log(n) / Math.log(STURGES_LOG_BASE) + 1));
  }
  return clampBinCount(Math.ceil(span / width));
}

export function equalEdges(min: number, max: number, count: number): number[] {
  const bins = clampBinCount(count);
  const span = max - min;
  const width = span > 0 ? span / bins : (DEGENERATE_BIN_HALF_WIDTH * 2) / bins;
  const start = span > 0 ? min : min - DEGENERATE_BIN_HALF_WIDTH;
  const edges: number[] = [];
  for (let i = 0; i <= bins; i += 1) edges.push(start + i * width);
  return edges;
}

export function resolveBinEdges(
  values: readonly number[],
  spec: BinSpec,
  window?: { min?: number; max?: number },
): { edges: number[] } | { error: string } {
  if (spec.mode === "edges") {
    const edges = spec.edges ?? [];
    if (edges.length < 2) return { error: "нужен хотя бы один интервал бинов" };
    for (let i = 1; i < edges.length; i += 1) {
      if (!(edges[i] > edges[i - 1])) {
        return { error: "края бинов должны строго возрастать" };
      }
    }
    if (window?.min !== undefined && window.min > edges[0]) {
      return { error: "окно оси x не покрывает левый край бинов" };
    }
    if (window?.max !== undefined && window.max < edges[edges.length - 1]) {
      return { error: "окно оси x не покрывает правый край бинов" };
    }
    return { edges };
  }

  const inside = values.filter((value) => {
    if (window?.min !== undefined && value < window.min) return false;
    if (window?.max !== undefined && value > window.max) return false;
    return true;
  });
  const dataMin = inside.length ? Math.min(...inside) : 0;
  const dataMax = inside.length ? Math.max(...inside) : 1;
  const min = window?.min ?? dataMin;
  const max = window?.max ?? dataMax;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (spec.mode === "count") {
    return { edges: equalEdges(lo, hi, spec.count ?? BIN_COUNT_MIN) };
  }
  if (spec.mode === "width") {
    const width = spec.width ?? 0;
    if (!(width > 0)) return { error: "ширина бина должна быть положительной" };
    const span = hi > lo ? hi - lo : width;
    const count = clampBinCount(Math.ceil(span / width));
    const edges: number[] = [];
    for (let i = 0; i <= count; i += 1) edges.push(lo + i * width);
    return { edges };
  }
  return { edges: equalEdges(lo, hi, freedmanDiaconisCount(inside)) };
}

/** Индекс бина: граница принадлежит правому, последний интервал закрыт справа. */
export function binIndex(value: number, edges: readonly number[]): number | null {
  const last = edges.length - 1;
  if (last < 1 || value < edges[0] || value > edges[last]) return null;
  for (let i = 0; i < last; i += 1) {
    const openRight = i < last - 1;
    if (value >= edges[i] && (openRight ? value < edges[i + 1] : value <= edges[i + 1])) {
      return i;
    }
  }
  return null;
}

export function histogramCounts(values: readonly number[], edges: readonly number[]): number[] {
  const counts = Array.from({ length: Math.max(0, edges.length - 1) }, () => 0);
  for (const value of values) {
    const index = binIndex(value, edges);
    if (index !== null) counts[index] += 1;
  }
  return counts;
}

export function outsideCount(
  values: readonly number[],
  edges: readonly number[],
  window?: { min?: number; max?: number },
): number {
  let count = 0;
  for (const value of values) {
    const left = window?.min ?? edges[0];
    const right = window?.max ?? edges[edges.length - 1];
    if (value < left || value > right || binIndex(value, edges) === null) count += 1;
  }
  return count;
}

function gammaPdf(x: number, shape: number, scale: number): number {
  if (!(x > 0) || !(shape > 0) || !(scale > 0)) return DISTRIBUTION_PDF_FLOOR;
  const log =
    (shape - 1) * Math.log(x) - x / scale - logGamma(shape) - shape * Math.log(scale);
  return Math.exp(log);
}

function weibullPdf(x: number, shape: number, scale: number): number {
  if (!(x >= 0) || !(shape > 0) || !(scale > 0)) return DISTRIBUTION_PDF_FLOOR;
  if (x === 0) return shape < 1 ? Number.POSITIVE_INFINITY : shape === 1 ? 1 / scale : 0;
  const ratio = x / scale;
  return (shape / scale) * ratio ** (shape - 1) * Math.exp(-(ratio ** shape));
}

export function distributionPdf(
  name: DistributionName,
  x: number,
  params: DistributionParams,
): number {
  if (name === "normal") {
    const mu = params.mu ?? 0;
    const sigma = params.sigma ?? 0;
    if (!(sigma > 0)) return DISTRIBUTION_PDF_FLOOR;
    const z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }
  if (name === "lognormal") {
    const mu = params.mu ?? 0;
    const sigma = params.sigma ?? 0;
    if (!(x > 0) || !(sigma > 0)) return DISTRIBUTION_PDF_FLOOR;
    const z = (Math.log(x) - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (x * sigma * Math.sqrt(2 * Math.PI));
  }
  if (name === "exponential") {
    const rate = params.rate ?? 0;
    if (!(x >= 0) || !(rate > 0)) return DISTRIBUTION_PDF_FLOOR;
    return rate * Math.exp(-rate * x);
  }
  if (name === "uniform") {
    const a = params.a ?? 0;
    const b = params.b ?? 0;
    if (!(b > a) || x < a || x > b) return DISTRIBUTION_PDF_FLOOR;
    return 1 / (b - a);
  }
  if (name === "gamma") return gammaPdf(x, params.shape ?? 0, params.scale ?? 0);
  return weibullPdf(x, params.shape ?? 0, params.scale ?? 0);
}

export function fitDistribution(
  name: DistributionName,
  values: readonly number[],
): { params: DistributionParams } | { error: string } {
  if (values.length < 2) return { error: "для подбора нужно хотя бы два числа" };
  const mean = meanOf(values);
  const variance = sampleVariance(values, mean);
  if (name === "normal") {
    return { params: { mu: mean, sigma: mleSigma(values, mean) } };
  }
  if (name === "lognormal") {
    if (values.some((value) => !(value > 0))) {
      return { error: "логнормальное распределение требует положительные числа" };
    }
    const logs = values.map((value) => Math.log(value));
    const mu = meanOf(logs);
    return { params: { mu, sigma: mleSigma(logs, mu) } };
  }
  if (name === "exponential") {
    if (values.some((value) => value < 0) || !(mean > 0)) {
      return { error: "экспоненциальное распределение требует неотрицательное среднее" };
    }
    return { params: { rate: 1 / mean } };
  }
  if (name === "uniform") {
    const a = Math.min(...values);
    const b = Math.max(...values);
    if (!(b > a)) return { error: "равномерное распределение требует размах больше нуля" };
    return { params: { a, b } };
  }
  if (name === "gamma") {
    if (values.some((value) => !(value > 0)) || !(variance > 0) || !(mean > 0)) {
      return { error: "гамма-распределение требует положительные числа и ненулевую дисперсию" };
    }
    return { params: { shape: (mean * mean) / variance, scale: variance / mean } };
  }
  if (values.some((value) => !(value > 0)) || !(variance > 0) || !(mean > 0)) {
    return { error: "распределение Вейбулла требует положительные числа и ненулевую дисперсию" };
  }
  const target = variance / (mean * mean);
  const cv2 = (shape: number) => {
    const g1 = Math.exp(logGamma(1 + 1 / shape));
    const g2 = Math.exp(logGamma(1 + 2 / shape));
    return g2 / (g1 * g1) - 1;
  };
  let lo = WEIBULL_SHAPE_MIN;
  let hi = WEIBULL_SHAPE_MAX;
  const flo = cv2(lo) - target;
  const fhi = cv2(hi) - target;
  if (flo === 0) return { params: { shape: lo, scale: mean / Math.exp(logGamma(1 + 1 / lo)) } };
  if (fhi === 0) return { params: { shape: hi, scale: mean / Math.exp(logGamma(1 + 1 / hi)) } };
  if (flo * fhi > 0) return { error: "не удалось подобрать форму распределения Вейбулла" };
  for (let step = 0; step < WEIBULL_BISECTION_STEPS; step += 1) {
    const mid = (lo + hi) / 2;
    const left = cv2(lo) - target;
    const fmid = cv2(mid) - target;
    if (left * fmid <= 0) hi = mid;
    else lo = mid;
  }
  const shape = (lo + hi) / 2;
  const scale = mean / Math.exp(logGamma(1 + 1 / shape));
  if (!(shape > 0) || !(scale > 0)) return { error: "не удалось подобрать распределение Вейбулла" };
  return { params: { shape, scale } };
}

export function curveHeight(
  pdf: number,
  scale: "count" | "density",
  n: number,
  binWidth: number,
): number {
  if (!Number.isFinite(pdf) || pdf === Number.POSITIVE_INFINITY) return Number.POSITIVE_INFINITY;
  if (scale === "density") return pdf;
  return pdf * n * binWidth;
}

export function barHeight(count: number, scale: "count" | "density", n: number, binWidth: number): number {
  if (scale === "count") return count;
  if (!(n > 0) || !(binWidth > 0)) return 0;
  return count / (n * binWidth);
}
