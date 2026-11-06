import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramTypeTag } from "@/constants/diagram-example-catalog";
import type {
  BuilderDiagramAppearance,
  GanttDisplayMode,
  MindmapColorBy,
  PacketBitOrder,
  PieLegendPosition,
  SankeyLabelStyle,
  SankeyNodeAlignment,
  XyChartOrientation,
} from "./types";

const YAML_BARE = /^[A-Za-z0-9_./%+-]+$/;

type YamlScalar = string | number | boolean;
type YamlNode = YamlScalar | YamlMap;
type YamlMap = { [key: string]: YamlNode };

const TITLE_TYPES_MERMAID = new Set<DiagramTypeTag>([
  "pie",
  "xychart",
  "quadrant",
  "gantt",
  "timeline",
  "journey",
  "packet",
  "c4_context",
  "c4_container",
]);

const TITLE_TYPES_PLANTUML = new Set<DiagramTypeTag>([
  "gantt",
  "timeline",
  "mindmap",
  "wbs",
  "nwdiag",
]);

export function createDefaultDiagramAppearance(): BuilderDiagramAppearance {
  return {
    sankey: {
      showValues: true,
      prefix: "",
      suffix: "",
      linkColor: "gradient",
      nodeAlignment: "justify",
      width: "",
      height: "",
      useMaxWidth: false,
      nodeWidth: "",
      nodePadding: "",
      labelStyle: "legacy",
      nodeColors: [],
    },
    packet: {
      showBits: true,
      bitOrder: "ascending",
      bitsPerRow: "",
      bitWidth: "",
      rowHeight: "",
      paddingX: "",
      paddingY: "",
    },
    pie: {
      textPosition: "",
      donutHole: "",
      legendPosition: "",
    },
    xyChart: {
      orientation: "",
      showDataLabel: false,
      width: "",
      height: "",
    },
    mindmap: {
      colorBy: "",
      padding: "",
      maxNodeWidth: "",
    },
    timeline: {
      disableMulticolor: false,
    },
    journey: {
      taskMargin: "",
      width: "",
      height: "",
    },
    gantt: {
      weekday: "",
      tickInterval: "",
      topAxis: false,
      displayMode: "",
    },
    block: {
      padding: "",
    },
    sequenceAutonumber: false,
  };
}

export function builderShowsTitle(
  format: DiagramFormat,
  diagramType: DiagramTypeTag,
): boolean {
  if (format === "mermaid") {
    return TITLE_TYPES_MERMAID.has(diagramType);
  }
  if (format === "plantuml") {
    return TITLE_TYPES_PLANTUML.has(diagramType);
  }
  if (format === "structurizr") {
    return true;
  }
  return false;
}

export function splitMermaidFrontmatter(source: string): {
  config: YamlMap;
  body: string;
} {
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(source);
  if (!match) {
    return { config: {}, body: source };
  }

  const parsed = parseSimpleYaml(match[1]);
  const config = parsed.config;
  return {
    config: isYamlMap(config) ? config : {},
    body: source.slice(match[0].length),
  };
}

export function applyAppearanceFromConfig(
  appearance: BuilderDiagramAppearance,
  config: YamlMap,
): void {
  const sankey = mapOf(config.sankey);
  if (sankey) {
    appearance.sankey.showValues = asBool(sankey.showValues, true);
    appearance.sankey.prefix = asString(sankey.prefix);
    appearance.sankey.suffix = asString(sankey.suffix);
    appearance.sankey.linkColor = asString(sankey.linkColor, "gradient");
    appearance.sankey.nodeAlignment = asAlignment(sankey.nodeAlignment);
    appearance.sankey.width = asOptionalNumber(sankey.width);
    appearance.sankey.height = asOptionalNumber(sankey.height);
    appearance.sankey.useMaxWidth = asBool(sankey.useMaxWidth, false);
    appearance.sankey.nodeWidth = asOptionalNumber(sankey.nodeWidth);
    appearance.sankey.nodePadding = asOptionalNumber(sankey.nodePadding);
    appearance.sankey.labelStyle = asLabelStyle(sankey.labelStyle);
    appearance.sankey.nodeColors = colorsFromMap(sankey.nodeColors);
  }

  const packet = mapOf(config.packet);
  if (packet) {
    appearance.packet.showBits = asBool(packet.showBits, true);
    appearance.packet.bitOrder = asBitOrder(packet.bitOrder);
    appearance.packet.bitsPerRow = asOptionalNumber(packet.bitsPerRow);
    appearance.packet.bitWidth = asOptionalNumber(packet.bitWidth);
    appearance.packet.rowHeight = asOptionalNumber(packet.rowHeight);
    appearance.packet.paddingX = asOptionalNumber(packet.paddingX);
    appearance.packet.paddingY = asOptionalNumber(packet.paddingY);
  }

  const pie = mapOf(config.pie);
  if (pie) {
    appearance.pie.textPosition = asOptionalNumber(pie.textPosition);
    appearance.pie.donutHole = asOptionalNumber(pie.donutHole);
    appearance.pie.legendPosition = asLegend(pie.legendPosition);
  }

  const xy = mapOf(config.xyChart);
  if (xy) {
    appearance.xyChart.orientation = asOrientation(xy.chartOrientation);
    appearance.xyChart.showDataLabel = asBool(xy.showDataLabel, false);
    appearance.xyChart.width = asOptionalNumber(xy.width);
    appearance.xyChart.height = asOptionalNumber(xy.height);
  }

  const mindmap = mapOf(config.mindmap);
  if (mindmap) {
    appearance.mindmap.colorBy = asColorBy(mindmap.colorBy);
    appearance.mindmap.padding = asOptionalNumber(mindmap.padding);
    appearance.mindmap.maxNodeWidth = asOptionalNumber(mindmap.maxNodeWidth);
  }

  const timeline = mapOf(config.timeline);
  if (timeline) {
    appearance.timeline.disableMulticolor = asBool(timeline.disableMulticolor, false);
  }

  const journey = mapOf(config.journey);
  if (journey) {
    appearance.journey.taskMargin = asOptionalNumber(journey.taskMargin);
    appearance.journey.width = asOptionalNumber(journey.width);
    appearance.journey.height = asOptionalNumber(journey.height);
  }

  const gantt = mapOf(config.gantt);
  if (gantt) {
    appearance.gantt.weekday = asString(gantt.weekday);
    appearance.gantt.tickInterval = asString(gantt.tickInterval);
    appearance.gantt.topAxis = asBool(gantt.topAxis, false);
    appearance.gantt.displayMode = asDisplayMode(gantt.displayMode);
  }

  const block = mapOf(config.block);
  if (block) {
    appearance.block.padding = asOptionalNumber(block.padding);
  }
}

export function buildMermaidConfigHeader(appearance: BuilderDiagramAppearance, diagramType: DiagramTypeTag): string {
  const section = configSection(appearance, diagramType);
  if (!section) {
    return "";
  }

  const body = emitYamlMap(section.values, 4);
  if (!body) {
    return "";
  }

  return `---\nconfig:\n  ${section.key}:\n${body}\n---\n`;
}

export function sourceHasSequenceAutonumber(source: string): boolean {
  return /^\s*autonumber\b/m.test(source);
}

export function injectSequenceAutonumber(source: string, format: DiagramFormat): string {
  if (format === "mermaid") {
    return source.replace(/^sequenceDiagram\b/, "sequenceDiagram\n  autonumber");
  }
  if (format === "plantuml") {
    return source.replace(/@startuml\b/, "@startuml\nautonumber");
  }
  return source;
}

function configSection(
  appearance: BuilderDiagramAppearance,
  diagramType: DiagramTypeTag,
): { key: string; values: YamlMap } | null {
  switch (diagramType) {
    case "sankey":
      return { key: "sankey", values: sankeyConfig(appearance) };
    case "packet":
      return { key: "packet", values: packetConfig(appearance) };
    case "pie":
      return { key: "pie", values: pieConfig(appearance) };
    case "xychart":
      return { key: "xyChart", values: xyConfig(appearance) };
    case "mindmap":
    case "wbs":
      return { key: "mindmap", values: mindmapConfig(appearance) };
    case "timeline":
      return { key: "timeline", values: timelineConfig(appearance) };
    case "journey":
      return { key: "journey", values: journeyConfig(appearance) };
    case "gantt":
      return { key: "gantt", values: ganttConfig(appearance) };
    case "block":
      return { key: "block", values: blockConfig(appearance) };
    default:
      return null;
  }
}

function sankeyConfig(appearance: BuilderDiagramAppearance): YamlMap {
  const sankey = appearance.sankey;
  const values: YamlMap = {};
  if (!sankey.showValues) values.showValues = false;
  if (sankey.prefix) values.prefix = sankey.prefix;
  if (sankey.suffix) values.suffix = sankey.suffix;
  if (sankey.linkColor && sankey.linkColor !== "gradient") values.linkColor = sankey.linkColor;
  if (sankey.nodeAlignment !== "justify") values.nodeAlignment = sankey.nodeAlignment;
  assignNumber(values, "width", sankey.width);
  assignNumber(values, "height", sankey.height);
  if (sankey.useMaxWidth) values.useMaxWidth = true;
  assignNumber(values, "nodeWidth", sankey.nodeWidth);
  assignNumber(values, "nodePadding", sankey.nodePadding);
  if (sankey.labelStyle !== "legacy") values.labelStyle = sankey.labelStyle;
  const colors: YamlMap = {};
  for (const item of sankey.nodeColors) {
    if (item.node.trim() && item.color.trim()) {
      colors[item.node.trim()] = item.color.trim();
    }
  }
  if (Object.keys(colors).length > 0) {
    values.nodeColors = colors;
  }
  return values;
}

function packetConfig(appearance: BuilderDiagramAppearance): YamlMap {
  const packet = appearance.packet;
  const values: YamlMap = {};
  if (!packet.showBits) values.showBits = false;
  if (packet.bitOrder !== "ascending") values.bitOrder = packet.bitOrder;
  assignNumber(values, "bitsPerRow", packet.bitsPerRow);
  assignNumber(values, "bitWidth", packet.bitWidth);
  assignNumber(values, "rowHeight", packet.rowHeight);
  assignNumber(values, "paddingX", packet.paddingX);
  assignNumber(values, "paddingY", packet.paddingY);
  return values;
}

function pieConfig(appearance: BuilderDiagramAppearance): YamlMap {
  const pie = appearance.pie;
  const values: YamlMap = {};
  assignNumber(values, "textPosition", pie.textPosition);
  assignNumber(values, "donutHole", pie.donutHole);
  if (pie.legendPosition) values.legendPosition = pie.legendPosition;
  return values;
}

function xyConfig(appearance: BuilderDiagramAppearance): YamlMap {
  const xy = appearance.xyChart;
  const values: YamlMap = {};
  if (xy.orientation && xy.orientation !== "vertical") values.chartOrientation = xy.orientation;
  if (xy.showDataLabel) values.showDataLabel = true;
  assignNumber(values, "width", xy.width);
  assignNumber(values, "height", xy.height);
  return values;
}

function mindmapConfig(appearance: BuilderDiagramAppearance): YamlMap {
  const mindmap = appearance.mindmap;
  const values: YamlMap = {};
  if (mindmap.colorBy && mindmap.colorBy !== "branch") values.colorBy = mindmap.colorBy;
  assignNumber(values, "padding", mindmap.padding);
  assignNumber(values, "maxNodeWidth", mindmap.maxNodeWidth);
  return values;
}

function timelineConfig(appearance: BuilderDiagramAppearance): YamlMap {
  const values: YamlMap = {};
  if (appearance.timeline.disableMulticolor) values.disableMulticolor = true;
  return values;
}

function journeyConfig(appearance: BuilderDiagramAppearance): YamlMap {
  const journey = appearance.journey;
  const values: YamlMap = {};
  assignNumber(values, "taskMargin", journey.taskMargin);
  assignNumber(values, "width", journey.width);
  assignNumber(values, "height", journey.height);
  return values;
}

function ganttConfig(appearance: BuilderDiagramAppearance): YamlMap {
  const gantt = appearance.gantt;
  const values: YamlMap = {};
  if (gantt.weekday.trim()) values.weekday = gantt.weekday.trim();
  if (gantt.tickInterval.trim()) values.tickInterval = gantt.tickInterval.trim();
  if (gantt.topAxis) values.topAxis = true;
  if (gantt.displayMode) values.displayMode = gantt.displayMode;
  return values;
}

function blockConfig(appearance: BuilderDiagramAppearance): YamlMap {
  const values: YamlMap = {};
  assignNumber(values, "padding", appearance.block.padding);
  return values;
}

function assignNumber(target: YamlMap, key: string, raw: string): void {
  const text = raw.trim();
  if (!text) return;
  const value = Number(text.replace(",", "."));
  if (Number.isFinite(value)) {
    target[key] = value;
  }
}

function emitYamlMap(map: YamlMap, indent: number): string {
  const pad = " ".repeat(indent);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(map)) {
    if (isYamlMap(value)) {
      const inner = emitYamlMap(value, indent + 2);
      if (!inner) continue;
      lines.push(`${pad}${quoteYamlKey(key)}:`);
      lines.push(inner);
      continue;
    }
    lines.push(`${pad}${quoteYamlKey(key)}: ${formatYamlScalar(value)}`);
  }
  return lines.join("\n");
}

function quoteYamlKey(key: string): string {
  return YAML_BARE.test(key) ? key : JSON.stringify(key);
}

function formatYamlScalar(value: YamlScalar): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (YAML_BARE.test(value)) return value;
  return JSON.stringify(value);
}

function parseSimpleYaml(text: string): YamlMap {
  const root: YamlMap = {};
  const stack: { indent: number; map: YamlMap }[] = [{ indent: -1, map: root }];

  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const indent = /^ */.exec(raw)?.[0].length ?? 0;
    const trimmed = raw.trim();
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const key = unquoteYaml(trimmed.slice(0, colon).trim());
    const rest = trimmed.slice(colon + 1).trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].map;
    if (!rest) {
      const child: YamlMap = {};
      parent[key] = child;
      stack.push({ indent, map: child });
    } else {
      parent[key] = parseYamlScalar(rest);
    }
  }

  return root;
}

function parseYamlScalar(raw: string): YamlScalar {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return unquoteYaml(raw);
}

function unquoteYaml(raw: string): string {
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    try {
      return JSON.parse(raw.startsWith("'") ? `"${raw.slice(1, -1)}"` : raw) as string;
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

function isYamlMap(value: YamlNode | undefined): value is YamlMap {
  return typeof value === "object" && value !== null;
}

function mapOf(value: YamlNode | undefined): YamlMap | null {
  return isYamlMap(value) ? value : null;
}

function asBool(value: YamlNode | undefined, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: YamlNode | undefined, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function asOptionalNumber(value: YamlNode | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}

function asAlignment(value: YamlNode | undefined): SankeyNodeAlignment {
  const text = asString(value, "justify");
  if (text === "left" || text === "right" || text === "center" || text === "justify") {
    return text;
  }
  return "justify";
}

function asLabelStyle(value: YamlNode | undefined): SankeyLabelStyle {
  return asString(value) === "outlined" ? "outlined" : "legacy";
}

function asBitOrder(value: YamlNode | undefined): PacketBitOrder {
  return asString(value) === "descending" ? "descending" : "ascending";
}

function asLegend(value: YamlNode | undefined): PieLegendPosition {
  const text = asString(value);
  if (text === "top" || text === "bottom" || text === "left" || text === "right" || text === "center") {
    return text;
  }
  return "";
}

function asOrientation(value: YamlNode | undefined): XyChartOrientation {
  const text = asString(value);
  if (text === "horizontal" || text === "vertical") return text;
  return "";
}

function asColorBy(value: YamlNode | undefined): MindmapColorBy {
  const text = asString(value);
  if (text === "branch" || text === "depth") return text;
  return "";
}

function asDisplayMode(value: YamlNode | undefined): GanttDisplayMode {
  return asString(value) === "compact" ? "compact" : "";
}

function colorsFromMap(value: YamlNode | undefined): { node: string; color: string }[] {
  const map = mapOf(value);
  if (!map) return [];
  return Object.entries(map)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
    .map(([node, color]) => ({ node, color }));
}
