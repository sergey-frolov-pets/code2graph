import type { ChartAspect } from "../../chart-aspect";
import type { WaterfallLine } from "../waterfall/types";
import type {
  BinSpec,
  DistributionName,
  DistributionParams,
  ErrorMode,
  MissingMode,
  OutlierSpec,
  RawToken,
} from "./stats";

export type HistogramScale = "count" | "density";
export type HistogramLabelsMode = "above" | "inside" | "none";
export type HistogramGap = { unit: "percent" | "ratio"; value: number };

export const DEFAULT_STATS = ["mean", "median", "sd", "var", "ci"] as const;

export const STAT_NAMES = [
  "mean",
  "median",
  "sd",
  "var",
  "ci",
  "min",
  "max",
  "q1",
  "q3",
  "iqr",
  "skew",
  "kurtosis",
] as const;

export type StatName = (typeof STAT_NAMES)[number];

export interface HistogramNamedColors {
  mean?: string;
  median?: string;
  ci?: string;
}

export interface HistogramSeries {
  name: string;
  tokens: RawToken[];
  /** Строка исходника серии, для ошибок очистки. */
  line: number;
  color?: string;
}

export interface HistogramCurve {
  kind: "fit" | "curve";
  distribution: DistributionName;
  /** Для fit: имя серии. Пусто — последняя серия. */
  seriesName?: string;
  label?: string;
  color?: string;
  params: DistributionParams;
  line: number;
}

export interface HistogramModel {
  title?: string;
  x?: { label?: string; min?: number; max?: number };
  y?: { label?: string; min?: number; max?: number };
  bins: BinSpec;
  scale: HistogramScale;
  gap?: HistogramGap;
  labels: HistogramLabelsMode;
  labelFontColor?: string;
  missing: MissingMode;
  errors: ErrorMode;
  outliers: OutlierSpec;
  ci: number;
  /** `off` прячет блок и маркеры. */
  stats: StatName[] | "off";
  grid: boolean;
  gridStep?: number;
  fontSize?: number;
  mono: boolean;
  monoInvert: boolean;
  rotate90: boolean;
  categoryAxis: boolean;
  valueAxis: boolean;
  namedColors: HistogramNamedColors;
  seriesColors: Record<string, string>;
  series: HistogramSeries[];
  curves: HistogramCurve[];
  lines: WaterfallLine[];
  ratio?: ChartAspect;
}
