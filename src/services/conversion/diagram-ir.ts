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
  | "task";

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
  kind?: "arrow" | "dashed" | "inherit" | "message" | "relation";
  semantic?: Record<string, unknown>;
  matchConfidence: number;
}

export interface DiagramGroup {
  id: string;
  label?: string;
  parentId?: string;
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
