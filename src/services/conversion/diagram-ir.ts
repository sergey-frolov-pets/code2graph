import type { DiagramFormat } from "@/constants/diagram-formats";
import { CONVERSION_IR_VERSION } from "@/constants/conversion-settings";

export const DIAGRAM_KINDS = [
  "graph",
  "class",
  "state",
  "er",
  "sequence",
  "activity",
  "c4_context",
  "c4_container",
  "gantt",
  "mindmap",
  "pie",
  "journey",
  "gitgraph",
  "timeline",
  "sankey",
  "xychart",
  "block",
  "requirement",
  "quadrant",
  "architecture",
  "packet",
  "usecase",
  "deployment",
  "object",
  "timing",
  "wbs",
  "nwdiag",
  "archimate",
  "unknown",
] as const;

export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

export type DiagramDirection = "TB" | "LR" | "BT" | "RL";

export type DiagramNodeShape =
  | "rect"
  | "round"
  | "diamond"
  | "ellipse";

export type DiagramNodeSemanticKind =
  | "default"
  | "start"
  | "end"
  | "decision"
  | "class"
  | "actor"
  | "system"
  | "container"
  | "task"
  | "usecase"
  | "artifact"
  | "slice"
  | "event"
  | "field";

export interface DiagramNodeVisual {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  shape?: DiagramNodeShape;
}

export interface DiagramNode {
  id: string;
  label: string;
  kind?: DiagramNodeSemanticKind;
  groupId?: string;
  semantic?: Record<string, unknown>;
  visual?: DiagramNodeVisual;
  matchConfidence: number;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: "arrow" | "dashed" | "inherit" | "message" | "relation" | "flow" | "satisfies";
  semantic?: Record<string, unknown>;
  matchConfidence: number;
}

export interface DiagramGroup {
  id: string;
  label?: string;
  parentId?: string;
}

export interface DiagramSlice {
  label: string;
  value: number;
}

export interface DiagramJourneyTask {
  section?: string;
  action: string;
  score: number;
  actor: string;
}

export interface DiagramTimelineEvent {
  date: string;
  event: string;
  section?: string;
}

export interface DiagramGitAction {
  type: "commit" | "branch" | "checkout" | "merge";
  id?: string;
  branch?: string;
}

export interface DiagramSankeyFlow {
  source: string;
  target: string;
  value: number;
}

export interface DiagramChartData {
  xLabels: string[];
  yAxis?: string;
  yMin?: number;
  yMax?: number;
  bar?: number[];
  line?: number[];
}

export interface DiagramPacketField {
  start: number;
  end: number;
  label: string;
}

export interface DiagramRequirementItem {
  id: string;
  numericId?: number;
  text: string;
}

export interface DiagramElementItem {
  id: string;
  type: string;
}

export interface DiagramQuadrantItem {
  label: string;
  x: number;
  y: number;
}

export interface DiagramArchitectureService {
  id: string;
  label: string;
  group?: string;
  icon?: string;
}

export interface DiagramWbsItem {
  level: number;
  label: string;
}

export interface DiagramNetworkNode {
  id: string;
  address?: string;
}

export interface DiagramTimingSignal {
  name: string;
  states: Array<{ time: number; state: string }>;
}

export interface DiagramObjectField {
  name: string;
  value: string;
}

export interface DiagramIRExtras {
  title?: string;
  slices?: DiagramSlice[];
  journeyTasks?: DiagramJourneyTask[];
  timelineEvents?: DiagramTimelineEvent[];
  gitActions?: DiagramGitAction[];
  sankeyFlows?: DiagramSankeyFlow[];
  chartData?: DiagramChartData;
  packetFields?: DiagramPacketField[];
  requirements?: DiagramRequirementItem[];
  elements?: DiagramElementItem[];
  quadrantItems?: DiagramQuadrantItem[];
  architectureServices?: DiagramArchitectureService[];
  wbsItems?: DiagramWbsItem[];
  networkNodes?: DiagramNetworkNode[];
  timingSignals?: DiagramTimingSignal[];
  objectFields?: Record<string, DiagramObjectField[]>;
  systemBoundary?: string;
  quadrantAxes?: { xFrom?: string; xTo?: string; yFrom?: string; yTo?: string };
  blockColumns?: number;
}

export type ConversionModeKind =
  | "source"
  | "visual"
  | "combo"
  | "metadata";

export interface DiagramIRMetadata {
  sourceFormat?: DiagramFormat;
  convertedAt?: string;
  conversionMode?: ConversionModeKind;
}

export interface DiagramIR {
  version: typeof CONVERSION_IR_VERSION;
  kind: DiagramKind;
  direction?: DiagramDirection;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups?: DiagramGroup[];
  extras?: DiagramIRExtras;
  metadata?: DiagramIRMetadata;
}

export function createEmptyDiagramIR(
  kind: DiagramKind = "unknown",
): DiagramIR {
  return {
    version: CONVERSION_IR_VERSION,
    kind,
    nodes: [],
    edges: [],
    groups: [],
    extras: {},
    metadata: {},
  };
}

export function sanitizeDiagramId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "node";
  }

  const sanitized = trimmed
    .replace(/[^\w-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return sanitized || "node";
}

export function uniqueDiagramId(base: string, used: Set<string>): string {
  const root = sanitizeDiagramId(base);
  if (!used.has(root)) {
    used.add(root);
    return root;
  }

  let index = 2;
  while (used.has(`${root}_${index}`)) {
    index += 1;
  }

  const id = `${root}_${index}`;
  used.add(id);
  return id;
}
