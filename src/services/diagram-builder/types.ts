import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramTypeTag } from "@/constants/diagram-example-catalog";
import type { LocaleKey } from "@/locales/types";

export const BUILDER_APPLY_TARGETS = ["current", "new-tab"] as const;
export type BuilderApplyTarget = (typeof BUILDER_APPLY_TARGETS)[number];

export const BUILDER_TABLE_MODES = ["rows", "matrix", "graph-ir"] as const;
export type BuilderTableMode = (typeof BUILDER_TABLE_MODES)[number];

export type BuilderCellType =
  | "text"
  | "number"
  | "select"
  | "color"
  | "date"
  | "duration";

export interface BuilderSelectOption {
  value: string;
  labelKey: LocaleKey;
}

export interface BuilderTableColumnSchema {
  id: string;
  labelKey: LocaleKey;
  type: BuilderCellType;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly BuilderSelectOption[];
  placeholder?: string;
}

export interface BuilderAxisConfig {
  enabled: boolean;
  label: string;
  autoRange: boolean;
  min: string;
  max: string;
  hidden: boolean;
  gridMode: "auto" | "fixed" | "off";
  gridStep: string;
}

export interface BuilderBreakItem {
  after: string;
  before: string;
  label: string;
}

export interface BuilderThresholdItem {
  value: string;
  label: string;
  color: string;
  width: string;
  style: "solid" | "dash" | "dot" | "dashdot";
}

export interface BuilderCagrItem {
  seriesIndex: number;
  from: number;
  to: number;
  format: string;
  prefix: string;
  label: string;
}

export interface BuilderHeatmapScaleBand {
  from: string;
  to: string;
  openEnded: boolean;
  color: string;
}

export interface BuilderGraphNodeRow {
  id: string;
  label: string;
  kind: string;
  group: string;
  color: string;
}

export interface BuilderGraphEdgeRow {
  source: string;
  target: string;
  kind: string;
  label: string;
}

export interface BuilderCanvasSettings {
  title: string;
  direction: "TB" | "LR" | "BT" | "RL";
  rotate90: boolean;
  aspectRatio: string;
  customAspectWidth: string;
  customAspectHeight: string;
  fontSize: number;
  background: string;
  textColor: string;
  autoTextColor: boolean;
  xAxis: BuilderAxisConfig;
  yAxis: BuilderAxisConfig;
  sizeLabel: string;
  midX: string;
  midY: string;
  quadrants: [string, string, string, string];
  radarMin: string;
  radarMax: string;
  radarRings: number;
  ganttDateFormat: string;
  ganttAxisFormat: string;
  ganttExcludes: string;
  blockColumns: number;
}

export interface BuilderOptionsSettings {
  labelsMode: string;
  connectors: boolean;
  stacked: boolean;
  showData: boolean;
  showSites: boolean;
  showLabels: boolean;
  radarDots: boolean;
  radarFillOpacity: number;
  monoMode: "off" | "on" | "invert";
  namedColors: {
    total: string;
    increase: string;
    decrease: string;
    box: string;
    median: string;
    whisker: string;
    outlier: string;
  };
  seriesColors: string[];
  heatmapAutoScale: boolean;
  heatmapBands: BuilderHeatmapScaleBand[];
  breaks: BuilderBreakItem[];
  thresholds: BuilderThresholdItem[];
  cagrs: BuilderCagrItem[];
}

export interface DiagramBuilderState {
  format: DiagramFormat;
  diagramType: DiagramTypeTag;
  tableMode: BuilderTableMode;
  /** Flat table rows (for tableMode === "rows") */
  rows: string[][];
  /** Matrix headers (categories/axes/days) for tableMode === "matrix" */
  matrixHeaders: string[];
  /** Matrix rows: [rowLabel, ...values] for tableMode === "matrix" */
  matrixRows: string[][];
  /** Graph nodes and edges for tableMode === "graph-ir" */
  graphNodes: BuilderGraphNodeRow[];
  graphEdges: BuilderGraphEdgeRow[];
  canvas: BuilderCanvasSettings;
  options: BuilderOptionsSettings;
  /** Preserved comments or custom lines where applicable */
  preservedComments: string[];
}

export interface DiagramBuilderCapability {
  supportsDirection: boolean;
  supportsRotate90: boolean;
  supportsAspectRatio: boolean;
  supportsFontSize: boolean;
  supportsCanvasColors: boolean;
  supportsXAxis: boolean;
  supportsYAxis: boolean;
  supportsGrid: boolean;
  supportsAxisToggle: boolean;
  supportsBubbleExtras: boolean;
  supportsQuadrantExtras: boolean;
  supportsRadarScale: boolean;
  supportsGanttDateOptions: boolean;
  supportsLabelsMode: boolean;
  labelsModeOptions: readonly BuilderSelectOption[];
  supportsConnectors: boolean;
  supportsStacked: boolean;
  supportsPieShowData: boolean;
  supportsVoronoiToggles: boolean;
  supportsRadarVisuals: boolean;
  supportsMono: boolean;
  supportsWaterfallColors: boolean;
  supportsBoxplotColors: boolean;
  supportsSeriesColors: boolean;
  supportsHeatmapScale: boolean;
  supportsBreaks: boolean;
  supportsThresholds: boolean;
  supportsCagr: boolean;
}

export interface DiagramBuilderSchema {
  format: DiagramFormat;
  diagramType: DiagramTypeTag;
  tableMode: BuilderTableMode;
  columns: readonly BuilderTableColumnSchema[];
  matrixRowHeaderLabelKey?: LocaleKey;
  matrixColHeaderPrefix?: string;
  capabilities: DiagramBuilderCapability;
}
