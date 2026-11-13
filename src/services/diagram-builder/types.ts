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
  | "duration"
  | "image";

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

export interface BuilderHistogramCurve {
  kind: "fit" | "curve";
  distribution: string;
  seriesName: string;
  label: string;
  color: string;
  params: string;
}

export interface BuilderHistogramSettings {
  binMode: "auto" | "count" | "width" | "edges";
  binCount: string;
  binWidth: string;
  binEdges: string;
  scale: "count" | "density";
  missing: "drop" | "mean" | "median" | "zero";
  errors: "drop" | "fail";
  outlierMethod: "none" | "iqr" | "z" | "mad";
  outlierK: string;
  outlierAction: "drop" | "winsor" | "mark";
  ci: string;
  stats: string;
  curves: BuilderHistogramCurve[];
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

export interface PreservedSourceBlocks {
  /** Исходное дерево YAML frontmatter для Mermaid (deep-merge при эмите). */
  frontmatterRoot?: Record<string, unknown>;
  /** Комментарии или директивы в начале документа / сразу после заголовка. */
  headerLines?: string[];
  /** Нераспознанные директивы и блоки внутри тела диаграммы (ноты, ресурсы, стили и т.п.). */
  bodyExtraLines?: string[];
  /** Постфиксные строки перед закрывающим тегом или в конце документа. */
  footerLines?: string[];
}

export type PlantUmlGanttScale =
  | ""
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface BuilderCanvasSettings {
  title: string;
  direction: "TB" | "LR" | "BT" | "RL";
  rotate90: boolean;
  /** При повороте на 90° первая категория снизу (`invert y`). */
  invertY: boolean;
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
  ganttLanguage?: string;
  ganttProjectStarts?: string;
  ganttScale?: PlantUmlGanttScale;
  ganttZoom?: string;
  ganttClosedWeekends?: boolean;
  ganttTodayMarker?: string;
  ganttInclusiveEndDates?: boolean;
  blockColumns: number;
}

export interface BuilderPowerLink {
  name: string;
  color: string;
  style: string;
  label: string;
}

export interface BuilderOptionsSettings {
  labelsMode: string;
  connectors: boolean;
  stacked: boolean;
  /** `stacked area` — площади вместо столбцов стопки. */
  stackArea: boolean;
  /** `labels sum` — сумма частей над стопкой series. */
  showSum: boolean;
  /** `labels fontcolor auto` или `labels fontcolor #hex`. Пусто — цвет темы. */
  labelFontColor: string;
  /** `gap 1` или `gap 100%` — просвет равен ширине бара. Пусто — зазор по умолчанию. */
  barGap: string;
  /** Скрыть ось y2 у series. */
  y2Hidden: boolean;
  y2GridMode: "auto" | "fixed" | "off";
  y2GridStep: string;
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
    mean: string;
    ci: string;
  };
  histogram: BuilderHistogramSettings;
  seriesColors: string[];
  heatmapAutoScale: boolean;
  heatmapBands: BuilderHeatmapScaleBand[];
  breaks: BuilderBreakItem[];
  thresholds: BuilderThresholdItem[];
  cagrs: BuilderCagrItem[];
  /** Название компании на карте влияния. */
  company: string;
  /** Легенда шкал и связей. По умолчанию включена. */
  showLegend: boolean;
  /** Таблица коммуникаций под легендой. По умолчанию выключена. */
  showComms: boolean;
  /** Сторона блока фото. Пусто — размер по умолчанию типа. `off` прячет блок. */
  avatarSize: string;
  /** Объявленные стрелки влияния (`link`). */
  powerLinks: BuilderPowerLink[];
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
  /** Diagram-specific appearance that is written into source or Mermaid config. */
  appearance: BuilderDiagramAppearance;
  /** Preserved comments or custom lines where applicable */
  preservedComments: string[];
  /** Сохранённые блоки, директивы и YAML-конфиг, не управляемые построителем напрямую. */
  preservedBlocks?: PreservedSourceBlocks;
  /** skinparam и <style> PlantUML, чтобы «По шагам» не стирал цвета. */
  plantUmlSkin?: string[];
  /** Цвет пакета или дорожки по подписи. */
  groupColors?: Record<string, string>;
}

export type SankeyNodeAlignment = "justify" | "left" | "right" | "center";
export type SankeyLabelStyle = "legacy" | "outlined";
export type PacketBitOrder = "ascending" | "descending";
export type PieLegendPosition = "" | "top" | "bottom" | "left" | "right" | "center";
export type XyChartOrientation = "" | "vertical" | "horizontal";
export type MindmapColorBy = "" | "branch" | "depth";
export type GanttDisplayMode = "" | "compact";

export interface BuilderSankeyNodeColor {
  node: string;
  color: string;
}

export interface BuilderDiagramAppearance {
  sankey: {
    showValues: boolean;
    prefix: string;
    suffix: string;
    linkColor: string;
    nodeAlignment: SankeyNodeAlignment;
    width: string;
    height: string;
    useMaxWidth: boolean;
    nodeWidth: string;
    nodePadding: string;
    labelStyle: SankeyLabelStyle;
    nodeColors: BuilderSankeyNodeColor[];
  };
  packet: {
    showBits: boolean;
    bitOrder: PacketBitOrder;
    bitsPerRow: string;
    bitWidth: string;
    rowHeight: string;
    paddingX: string;
    paddingY: string;
  };
  pie: {
    textPosition: string;
    donutHole: string;
    legendPosition: PieLegendPosition;
  };
  xyChart: {
    orientation: XyChartOrientation;
    showDataLabel: boolean;
    width: string;
    height: string;
  };
  mindmap: {
    colorBy: MindmapColorBy;
    padding: string;
    maxNodeWidth: string;
  };
  timeline: {
    disableMulticolor: boolean;
  };
  journey: {
    taskMargin: string;
    width: string;
    height: string;
  };
  gantt: {
    weekday: string;
    tickInterval: string;
    topAxis: boolean;
    displayMode: GanttDisplayMode;
  };
  block: {
    padding: string;
  };
  sequenceAutonumber: boolean;
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
  supportsTitle: boolean;
  supportsSankeyStyle: boolean;
  supportsPacketStyle: boolean;
  supportsPieStyle: boolean;
  supportsXyStyle: boolean;
  supportsMindmapStyle: boolean;
  supportsTimelineStyle: boolean;
  supportsJourneyStyle: boolean;
  supportsGanttStyle: boolean;
  supportsBlockStyle: boolean;
  supportsSequenceAutonumber: boolean;
  /** Компания, легенда, связи влияния. */
  supportsPowerMap: boolean;
  /** Размер блока фото у оргструктуры. */
  supportsPersonAvatar: boolean;
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
