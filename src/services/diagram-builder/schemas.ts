import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramTypeTag } from "@/constants/diagram-example-catalog";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import { detectType as detectMermaidExtType } from "@/services/mermaid/ext/registry";
import { builderShowsTitle } from "./builder-appearance";
import type {
  BuilderSelectOption,
  BuilderTableColumnSchema,
  DiagramBuilderCapability,
  DiagramBuilderSchema,
} from "./types";

const BASE_CAPABILITY: DiagramBuilderCapability = {
  supportsDirection: false,
  supportsRotate90: false,
  supportsAspectRatio: false,
  supportsFontSize: false,
  supportsCanvasColors: false,
  supportsXAxis: false,
  supportsYAxis: false,
  supportsGrid: false,
  supportsAxisToggle: false,
  supportsBubbleExtras: false,
  supportsQuadrantExtras: false,
  supportsRadarScale: false,
  supportsGanttDateOptions: false,
  supportsLabelsMode: false,
  labelsModeOptions: [],
  supportsConnectors: false,
  supportsStacked: false,
  supportsPieShowData: false,
  supportsVoronoiToggles: false,
  supportsRadarVisuals: false,
  supportsMono: false,
  supportsWaterfallColors: false,
  supportsBoxplotColors: false,
  supportsSeriesColors: false,
  supportsHeatmapScale: false,
  supportsBreaks: false,
  supportsThresholds: false,
  supportsCagr: false,
  supportsTitle: false,
  supportsSankeyStyle: false,
  supportsPacketStyle: false,
  supportsPieStyle: false,
  supportsXyStyle: false,
  supportsMindmapStyle: false,
  supportsTimelineStyle: false,
  supportsJourneyStyle: false,
  supportsGanttStyle: false,
  supportsBlockStyle: false,
  supportsSequenceAutonumber: false,
  supportsPowerMap: false,
  supportsPersonAvatar: false,
};

const WATERFALL_LABELS_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "above", labelKey: "builder.option.labels.above" },
  { value: "inside", labelKey: "builder.option.labels.inside" },
  { value: "both", labelKey: "builder.option.labels.both" },
  { value: "none", labelKey: "builder.option.labels.none" },
];

const SERIES_LABELS_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "above", labelKey: "builder.option.labels.above" },
  { value: "inside", labelKey: "builder.option.labels.inside" },
  { value: "none", labelKey: "builder.option.labels.none" },
];

const TREEMAP_LABELS_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "both", labelKey: "builder.option.labels.valuesAndPercent" },
  { value: "values", labelKey: "builder.option.labels.values" },
  { value: "percent", labelKey: "builder.option.labels.percent" },
  { value: "none", labelKey: "builder.option.labels.none" },
];

const WATERFALL_STEP_KIND_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "=", labelKey: "builder.waterfall.kind.total" },
  { value: "+", labelKey: "builder.waterfall.kind.increase" },
  { value: "-", labelKey: "builder.waterfall.kind.decrease" },
  { value: "=subtotal", labelKey: "builder.waterfall.kind.subtotal" },
];

const WATERFALL_STEP_LABEL_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "", labelKey: "builder.option.default" },
  { value: "above", labelKey: "builder.option.labels.above" },
  { value: "inside", labelKey: "builder.option.labels.inside" },
  { value: "both", labelKey: "builder.option.labels.both" },
  { value: "no-label", labelKey: "builder.option.labels.none" },
];

const ORG_EDGE_STYLE_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "solid", labelKey: "builder.orgchart.edge.solid" },
  { value: "dotted", labelKey: "builder.orgchart.edge.dotted" },
];

const PERSON_GENDER_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "", labelKey: "builder.gender.unset" },
  { value: "m", labelKey: "builder.gender.male" },
  { value: "f", labelKey: "builder.gender.female" },
  { value: "?", labelKey: "builder.gender.unknown" },
];

const JOURNEY_SCORE_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "5", labelKey: "builder.journey.score.5" },
  { value: "4", labelKey: "builder.journey.score.4" },
  { value: "3", labelKey: "builder.journey.score.3" },
  { value: "2", labelKey: "builder.journey.score.2" },
  { value: "1", labelKey: "builder.journey.score.1" },
];

export const GANTT_TASK_STATUS_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "", labelKey: "builder.gantt.status.normal" },
  { value: "done", labelKey: "builder.gantt.status.done" },
  { value: "active", labelKey: "builder.gantt.status.active" },
  { value: "crit", labelKey: "builder.gantt.status.crit" },
  { value: "milestone", labelKey: "builder.gantt.status.milestone" },
];

export const PLANTUML_GANTT_LANGUAGE_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "", labelKey: "builder.option.auto" },
  { value: "ru", labelKey: "builder.gantt.lang.ru" },
  { value: "en", labelKey: "builder.gantt.lang.en" },
  { value: "de", labelKey: "builder.gantt.lang.de" },
  { value: "ja", labelKey: "builder.gantt.lang.ja" },
  { value: "zh", labelKey: "builder.gantt.lang.zh" },
  { value: "ko", labelKey: "builder.gantt.lang.ko" },
];

export const PLANTUML_GANTT_SCALE_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "", labelKey: "builder.option.auto" },
  { value: "daily", labelKey: "builder.gantt.scale.daily" },
  { value: "weekly", labelKey: "builder.gantt.scale.weekly" },
  { value: "monthly", labelKey: "builder.gantt.scale.monthly" },
  { value: "quarterly", labelKey: "builder.gantt.scale.quarterly" },
  { value: "yearly", labelKey: "builder.gantt.scale.yearly" },
];

export const MERMAID_GANTT_AXIS_PRESET_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "", labelKey: "builder.option.auto" },
  { value: "%d.%m", labelKey: "builder.gantt.axisPreset.dayMonthRu" },
  { value: "%d.%m.%Y", labelKey: "builder.gantt.axisPreset.fullDateRu" },
  { value: "%m/%d", labelKey: "builder.gantt.axisPreset.monthDayEn" },
  { value: "%Y-%m-%d", labelKey: "builder.gantt.axisPreset.isoDate" },
  { value: "%d", labelKey: "builder.gantt.axisPreset.dayOnly" },
  { value: "W%W", labelKey: "builder.gantt.axisPreset.weekNum" },
  { value: "%m.%Y", labelKey: "builder.gantt.axisPreset.monthYearNum" },
];

export const MERMAID_GANTT_TICK_PRESET_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "", labelKey: "builder.option.auto" },
  { value: "1day", labelKey: "builder.gantt.tick.1day" },
  { value: "1week", labelKey: "builder.gantt.tick.1week" },
  { value: "1month", labelKey: "builder.gantt.tick.1month" },
  { value: "3month", labelKey: "builder.gantt.tick.3month" },
];

export const GRAPH_NODE_KIND_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "default", labelKey: "builder.graph.nodeKind.default" },
  { value: "actor", labelKey: "builder.graph.nodeKind.actor" },
  { value: "system", labelKey: "builder.graph.nodeKind.system" },
  { value: "container", labelKey: "builder.graph.nodeKind.container" },
  { value: "class", labelKey: "builder.graph.nodeKind.class" },
  { value: "decision", labelKey: "builder.graph.nodeKind.decision" },
  { value: "start", labelKey: "builder.graph.nodeKind.start" },
  { value: "end", labelKey: "builder.graph.nodeKind.end" },
  { value: "database", labelKey: "builder.graph.nodeKind.database" },
  { value: "queue", labelKey: "builder.graph.nodeKind.queue" },
  { value: "boundary", labelKey: "builder.graph.nodeKind.boundary" },
  { value: "control", labelKey: "builder.graph.nodeKind.control" },
  { value: "entity", labelKey: "builder.graph.nodeKind.entity" },
  { value: "interface", labelKey: "builder.graph.nodeKind.interface" },
  { value: "artifact", labelKey: "builder.graph.nodeKind.artifact" },
];

export const GRAPH_EDGE_KIND_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "arrow", labelKey: "builder.graph.edgeKind.arrow" },
  { value: "dashed", labelKey: "builder.graph.edgeKind.dashed" },
  { value: "inherit", labelKey: "builder.graph.edgeKind.inherit" },
  { value: "message", labelKey: "builder.graph.edgeKind.message" },
  { value: "relation", labelKey: "builder.graph.edgeKind.relation" },
];

export const ASPECT_RATIO_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "", labelKey: "builder.option.auto" },
  { value: "16x9", labelKey: "builder.aspect.16x9" },
  { value: "4x3", labelKey: "builder.aspect.4x3" },
  { value: "1x1", labelKey: "builder.aspect.1x1" },
  { value: "16x6", labelKey: "builder.aspect.16x6" },
  { value: "21x9", labelKey: "builder.aspect.21x9" },
  { value: "custom", labelKey: "builder.aspect.custom" },
];

export const MONO_MODE_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "off", labelKey: "builder.mono.off" },
  { value: "on", labelKey: "builder.mono.on" },
  { value: "invert", labelKey: "builder.mono.invert" },
];

export const LINE_STYLE_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "dash", labelKey: "builder.lineStyle.dash" },
  { value: "solid", labelKey: "builder.lineStyle.solid" },
  { value: "dot", labelKey: "builder.lineStyle.dot" },
  { value: "dashdot", labelKey: "builder.lineStyle.dashdot" },
];

export const CAGR_FORMAT_OPTIONS: readonly BuilderSelectOption[] = [
  { value: "0%", labelKey: "builder.cagr.format.intPercent" },
  { value: "0.0%", labelKey: "builder.cagr.format.decPercent" },
  { value: "+0.0%", labelKey: "builder.cagr.format.plusPercent" },
  { value: "±0.0%", labelKey: "builder.cagr.format.pmPercent" },
  { value: "0.00", labelKey: "builder.cagr.format.ratio" },
];

export function supportsDiagramBuilder(format: DiagramFormat): boolean {
  return format !== "graphml";
}

export function hasBuilderOptionsCapabilities(
  cap: DiagramBuilderCapability,
): boolean {
  return Boolean(
    cap.supportsLabelsMode ||
      cap.supportsConnectors ||
      cap.supportsStacked ||
      cap.supportsPieShowData ||
      cap.supportsVoronoiToggles ||
      cap.supportsRadarVisuals ||
      cap.supportsMono ||
      cap.supportsWaterfallColors ||
      cap.supportsBoxplotColors ||
      cap.supportsSeriesColors ||
      cap.supportsHeatmapScale ||
      cap.supportsBreaks ||
      cap.supportsThresholds ||
      cap.supportsCagr ||
      cap.supportsPowerMap ||
      cap.supportsPersonAvatar,
  );
}

export function detectBuilderDiagramType(
  source: string,
  format: DiagramFormat,
): DiagramTypeTag {
  if (format === "wiremark") {
    return "wireframe";
  }

  if (format === "graphml") {
    return "graph";
  }

  if (format === "mermaid") {
    const extType = detectMermaidExtType(source);
    if (extType) {
      return extType;
    }
  }

  const kind = classifyDiagramKind(source, format);
  if (kind === "unknown") {
    if (format === "mermaid" || format === "d2") {
      return "flowchart";
    }
    if (format === "structurizr") {
      return "c4_context";
    }
    return "sequence";
  }

  return kind;
}

function columnsForDiagramType(
  diagramType: DiagramTypeTag,
): readonly BuilderTableColumnSchema[] {
  switch (diagramType) {
    case "waterfall":
      return [
        { id: "label", labelKey: "builder.col.label", type: "text", required: true },
        {
          id: "kind",
          labelKey: "builder.col.stepType",
          type: "select",
          options: WATERFALL_STEP_KIND_OPTIONS,
        },
        { id: "value", labelKey: "builder.col.value", type: "number" },
        {
          id: "labelPos",
          labelKey: "builder.col.labelPosition",
          type: "select",
          options: WATERFALL_STEP_LABEL_OPTIONS,
        },
        { id: "series", labelKey: "builder.col.series", type: "text" },
      ];
    case "pie":
      return [
        { id: "label", labelKey: "builder.col.category", type: "text", required: true },
        { id: "value", labelKey: "builder.col.value", type: "number", required: true, min: 0 },
      ];
    case "bubble":
      return [
        { id: "label", labelKey: "builder.col.label", type: "text", required: true },
        { id: "x", labelKey: "builder.col.x", type: "number", required: true },
        { id: "y", labelKey: "builder.col.y", type: "number", required: true },
        { id: "size", labelKey: "builder.col.size", type: "number", required: true, min: 0 },
        { id: "group", labelKey: "builder.col.group", type: "text" },
      ];
    case "boxplot":
      return [
        { id: "label", labelKey: "builder.col.category", type: "text", required: true },
        { id: "min", labelKey: "builder.col.min", type: "number", required: true },
        { id: "q1", labelKey: "builder.col.q1", type: "number", required: true },
        { id: "median", labelKey: "builder.col.median", type: "number", required: true },
        { id: "q3", labelKey: "builder.col.q3", type: "number", required: true },
        { id: "max", labelKey: "builder.col.max", type: "number", required: true },
        { id: "color", labelKey: "builder.col.color", type: "color" },
      ];
    case "treemap":
      return [
        { id: "group", labelKey: "builder.col.group", type: "text" },
        { id: "label", labelKey: "builder.col.item", type: "text", required: true },
        { id: "value", labelKey: "builder.col.weight", type: "number", required: true, min: 0.01 },
        { id: "color", labelKey: "builder.col.color", type: "color" },
      ];
    case "voronoi":
      return [
        { id: "label", labelKey: "builder.col.site", type: "text", required: true },
        { id: "x", labelKey: "builder.col.x", type: "number", required: true },
        { id: "y", labelKey: "builder.col.y", type: "number", required: true },
        { id: "group", labelKey: "builder.col.group", type: "text" },
        { id: "color", labelKey: "builder.col.color", type: "color" },
      ];
    case "orgchart":
      return [
        { id: "manager", labelKey: "builder.col.manager", type: "text", required: true },
        { id: "employee", labelKey: "builder.col.employee", type: "text", required: true },
        {
          id: "style",
          labelKey: "builder.col.edgeStyle",
          type: "select",
          options: ORG_EDGE_STYLE_OPTIONS,
        },
        { id: "color", labelKey: "builder.col.color", type: "color" },
        {
          id: "employeeGender",
          labelKey: "builder.col.gender",
          type: "select",
          options: PERSON_GENDER_OPTIONS,
        },
        { id: "employeePhoto", labelKey: "builder.col.photo", type: "image" },
        {
          id: "managerGender",
          labelKey: "builder.col.gender",
          type: "select",
          options: PERSON_GENDER_OPTIONS,
        },
        { id: "managerPhoto", labelKey: "builder.col.photo", type: "image" },
      ];
    case "powermap":
      return [
        { id: "name", labelKey: "builder.col.person", type: "text", required: true },
        { id: "title", labelKey: "builder.col.jobTitle", type: "text" },
        {
          id: "gender",
          labelKey: "builder.col.gender",
          type: "select",
          options: PERSON_GENDER_OPTIONS,
        },
        { id: "photo", labelKey: "builder.col.photo", type: "image" },
        { id: "role", labelKey: "builder.col.role", type: "text" },
        { id: "influence", labelKey: "builder.col.influence", type: "text" },
        { id: "action", labelKey: "builder.col.action", type: "text" },
        { id: "attitude", labelKey: "builder.col.attitude", type: "text" },
        { id: "counterpart", labelKey: "builder.col.counterpart", type: "text" },
        { id: "manager", labelKey: "builder.col.manager", type: "text" },
        { id: "relation", labelKey: "builder.col.relation", type: "text" },
        { id: "edgeLabel", labelKey: "builder.powermap.edgeLabel", type: "text" },
      ];
    case "ev":
      return [
        { id: "day", labelKey: "builder.col.period", type: "text", required: true },
        { id: "pv", labelKey: "builder.col.pv", type: "number", required: true },
        { id: "ev", labelKey: "builder.col.ev", type: "number", required: true },
        { id: "ac", labelKey: "builder.col.ac", type: "number", required: true },
      ];
    case "quadrant":
      return [
        { id: "label", labelKey: "builder.col.item", type: "text", required: true },
        { id: "x", labelKey: "builder.col.xNormalized", type: "number", required: true, min: 0, max: 1, step: 0.05 },
        { id: "y", labelKey: "builder.col.yNormalized", type: "number", required: true, min: 0, max: 1, step: 0.05 },
      ];
    case "sankey":
      return [
        { id: "source", labelKey: "builder.col.source", type: "text", required: true },
        { id: "target", labelKey: "builder.col.target", type: "text", required: true },
        { id: "value", labelKey: "builder.col.flowValue", type: "number", required: true, min: 0 },
      ];
    case "gantt":
      return [
        { id: "task", labelKey: "builder.col.task", type: "text", required: true },
        { id: "start", labelKey: "builder.col.startDate", type: "text", required: true },
        { id: "duration", labelKey: "builder.col.duration", type: "duration", required: true },
        { id: "section", labelKey: "builder.col.section", type: "text" },
        {
          id: "status",
          labelKey: "builder.col.status",
          type: "select",
          options: GANTT_TASK_STATUS_OPTIONS,
        },
        { id: "taskId", labelKey: "builder.col.id", type: "text" },
        { id: "color", labelKey: "builder.col.color", type: "color" },
      ];
    case "timeline":
      return [
        { id: "period", labelKey: "builder.col.period", type: "text", required: true },
        { id: "event", labelKey: "builder.col.event", type: "text", required: true },
        { id: "section", labelKey: "builder.col.section", type: "text" },
      ];
    case "journey":
      return [
        { id: "step", labelKey: "builder.col.step", type: "text", required: true },
        {
          id: "score",
          labelKey: "builder.col.score",
          type: "select",
          options: JOURNEY_SCORE_OPTIONS,
        },
        { id: "actors", labelKey: "builder.col.actors", type: "text" },
        { id: "section", labelKey: "builder.col.section", type: "text" },
      ];
    case "packet":
      return [
        { id: "bits", labelKey: "builder.col.bitRange", type: "text", required: true },
        { id: "label", labelKey: "builder.col.field", type: "text", required: true },
      ];
    case "wbs":
    case "mindmap":
      return [
        { id: "level1", labelKey: "builder.col.level1", type: "text", required: true },
        { id: "level2", labelKey: "builder.col.level2", type: "text" },
        { id: "level3", labelKey: "builder.col.level3", type: "text" },
        { id: "color", labelKey: "builder.col.color", type: "color" },
      ];
    case "nwdiag":
      return [
        { id: "node", labelKey: "builder.col.node", type: "text", required: true },
        { id: "address", labelKey: "builder.col.ipAddress", type: "text" },
        { id: "network", labelKey: "builder.col.network", type: "text" },
      ];
    default:
      return [];
  }
}

function applyAppearanceCapabilities(
  cap: DiagramBuilderCapability,
  format: DiagramFormat,
  diagramType: DiagramTypeTag,
): void {
  cap.supportsAspectRatio = true;
  cap.supportsTitle = builderShowsTitle(format, diagramType);
  const mermaid = format === "mermaid";
  cap.supportsSankeyStyle = mermaid && diagramType === "sankey";
  cap.supportsPacketStyle = mermaid && diagramType === "packet";
  cap.supportsPieStyle = mermaid && diagramType === "pie";
  cap.supportsXyStyle = mermaid && diagramType === "xychart";
  cap.supportsMindmapStyle = mermaid && (diagramType === "mindmap" || diagramType === "wbs");
  cap.supportsTimelineStyle = mermaid && diagramType === "timeline";
  cap.supportsJourneyStyle = mermaid && diagramType === "journey";
  cap.supportsGanttStyle = mermaid && diagramType === "gantt";
  cap.supportsBlockStyle = mermaid && diagramType === "block";
  cap.supportsSequenceAutonumber =
    (mermaid || format === "plantuml") && diagramType === "sequence";
}

export function getDiagramBuilderSchema(
  format: DiagramFormat,
  diagramType: DiagramTypeTag,
): DiagramBuilderSchema {
  if (
    diagramType === "heatmap" ||
    diagramType === "radar" ||
    diagramType === "series" ||
    diagramType === "histogram" ||
    diagramType === "xychart" ||
    diagramType === "wireframe"
  ) {
    const cap: DiagramBuilderCapability = { ...BASE_CAPABILITY };
    if (diagramType === "heatmap") {
      cap.supportsAspectRatio = true;
      cap.supportsMono = true;
      cap.supportsHeatmapScale = true;
    } else if (diagramType === "radar") {
      cap.supportsFontSize = true;
      cap.supportsMono = true;
      cap.supportsSeriesColors = true;
      cap.supportsRadarScale = true;
      cap.supportsRadarVisuals = true;
    } else if (diagramType === "series" || diagramType === "histogram") {
      cap.supportsRotate90 = true;
      cap.supportsAspectRatio = true;
      cap.supportsFontSize = true;
      cap.supportsXAxis = diagramType === "histogram";
      cap.supportsYAxis = true;
      cap.supportsGrid = true;
      cap.supportsAxisToggle = true;
      cap.supportsLabelsMode = true;
      cap.labelsModeOptions = SERIES_LABELS_OPTIONS;
      cap.supportsStacked = diagramType === "series";
      cap.supportsMono = true;
      cap.supportsSeriesColors = true;
      cap.supportsBreaks = diagramType === "series";
      cap.supportsThresholds = true;
      cap.supportsCagr = diagramType === "series";
    } else if (diagramType === "xychart") {
      cap.supportsYAxis = true;
    }

    applyAppearanceCapabilities(cap, format, diagramType);
    return {
      format,
      diagramType,
      tableMode: "matrix",
      columns: [],
      matrixRowHeaderLabelKey:
        diagramType === "radar"
          ? "builder.col.series"
          : diagramType === "heatmap"
            ? "builder.col.row"
            : diagramType === "histogram"
              ? "builder.col.observation"
              : "builder.col.category",
      matrixColHeaderPrefix:
        diagramType === "radar"
          ? "Axis"
          : diagramType === "series" || diagramType === "xychart" || diagramType === "histogram"
            ? "Series"
            : "Col",
      capabilities: cap,
    };
  }

  const rowColumns = columnsForDiagramType(diagramType);
  if (rowColumns.length > 0) {
    const cap: DiagramBuilderCapability = { ...BASE_CAPABILITY };

    switch (diagramType) {
      case "waterfall":
        cap.supportsAspectRatio = true;
        cap.supportsFontSize = true;
        cap.supportsCanvasColors = true;
        cap.supportsYAxis = true;
        cap.supportsGrid = true;
        cap.supportsAxisToggle = true;
        cap.supportsLabelsMode = true;
        cap.labelsModeOptions = WATERFALL_LABELS_OPTIONS;
        cap.supportsConnectors = true;
        cap.supportsMono = true;
        cap.supportsWaterfallColors = true;
        cap.supportsSeriesColors = true;
        cap.supportsBreaks = true;
        cap.supportsThresholds = true;
        break;
      case "pie":
        cap.supportsPieShowData = true;
        break;
      case "bubble":
        cap.supportsAspectRatio = true;
        cap.supportsFontSize = true;
        cap.supportsXAxis = true;
        cap.supportsYAxis = true;
        cap.supportsBubbleExtras = true;
        cap.supportsMono = true;
        break;
      case "boxplot":
        cap.supportsAspectRatio = true;
        cap.supportsFontSize = true;
        cap.supportsYAxis = true;
        cap.supportsGrid = true;
        cap.supportsMono = true;
        cap.supportsBoxplotColors = true;
        cap.supportsSeriesColors = true;
        break;
      case "treemap":
        cap.supportsAspectRatio = true;
        cap.supportsFontSize = true;
        cap.supportsLabelsMode = true;
        cap.labelsModeOptions = TREEMAP_LABELS_OPTIONS;
        cap.supportsMono = true;
        cap.supportsSeriesColors = true;
        break;
      case "voronoi":
        cap.supportsAspectRatio = true;
        cap.supportsFontSize = true;
        cap.supportsXAxis = true;
        cap.supportsYAxis = true;
        cap.supportsVoronoiToggles = true;
        cap.supportsMono = true;
        cap.supportsSeriesColors = true;
        break;
      case "orgchart":
        cap.supportsMono = true;
        cap.supportsPersonAvatar = true;
        break;
      case "powermap":
        cap.supportsMono = true;
        cap.supportsPowerMap = true;
        cap.supportsPersonAvatar = true;
        break;
      case "ev":
        cap.supportsAspectRatio = true;
        cap.supportsGrid = true;
        cap.supportsMono = true;
        break;
      case "quadrant":
        cap.supportsQuadrantExtras = true;
        break;
      case "gantt":
        cap.supportsGanttDateOptions = true;
        break;
      case "mindmap":
        if (format === "plantuml") {
          cap.supportsDirection = true;
        }
        break;
      default:
        break;
    }

    applyAppearanceCapabilities(cap, format, diagramType);
    return {
      format,
      diagramType,
      tableMode: "rows",
      columns: rowColumns,
      capabilities: cap,
    };
  }

  const nonDirectionalTypes = new Set<string>([
    "sequence",
    "timing",
    "block",
    "requirement",
  ]);
  const supportsDir =
    format === "d2" ||
    (format !== "wiremark" &&
      !nonDirectionalTypes.has(diagramType) &&
      !(format === "plantuml" && diagramType === "activity"));

  const graphCap: DiagramBuilderCapability = {
    ...BASE_CAPABILITY,
    supportsDirection: supportsDir,
  };
  applyAppearanceCapabilities(graphCap, format, diagramType);
  graphCap.supportsDirection = supportsDir;
  return {
    format,
    diagramType,
    tableMode: "graph-ir",
    columns: [],
    capabilities: graphCap,
  };
}
