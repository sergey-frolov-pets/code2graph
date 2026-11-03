import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramKind } from "@/services/conversion/diagram-ir";

export type DiagramKindFamily =
  | "graph"
  | "uml"
  | "c4"
  | "temporal"
  | "hierarchical"
  | "chart"
  | "network"
  | "ui"
  | "specialized";

export const DIAGRAM_KIND_FAMILIES: Record<DiagramKind, DiagramKindFamily> = {
  graph: "graph",
  class: "uml",
  state: "uml",
  er: "uml",
  sequence: "temporal",
  activity: "uml",
  c4_context: "c4",
  c4_container: "c4",
  gantt: "temporal",
  mindmap: "hierarchical",
  pie: "chart",
  journey: "temporal",
  gitgraph: "temporal",
  timeline: "temporal",
  sankey: "graph",
  xychart: "chart",
  block: "graph",
  requirement: "uml",
  quadrant: "chart",
  architecture: "graph",
  packet: "specialized",
  usecase: "uml",
  deployment: "graph",
  object: "uml",
  timing: "temporal",
  wbs: "hierarchical",
  nwdiag: "network",
  archimate: "uml",
  wireframe: "ui",
  unknown: "graph",
};

export const NATIVE_KINDS_BY_FORMAT: Record<
  DiagramFormat,
  readonly DiagramKind[]
> = {
  plantuml: [
    "graph",
    "class",
    "state",
    "er",
    "sequence",
    "activity",
    "gantt",
    "mindmap",
    "c4_context",
    "c4_container",
    "usecase",
    "deployment",
    "object",
    "timing",
    "wbs",
    "nwdiag",
    "archimate",
  ],
  mermaid: [
    "graph",
    "class",
    "state",
    "er",
    "sequence",
    "activity",
    "gantt",
    "mindmap",
    "pie",
    "journey",
    "gitgraph",
    "timeline",
    "sankey",
    "xychart",
    "block",
    "c4_context",
    "c4_container",
    "requirement",
    "quadrant",
    "architecture",
    "packet",
  ],
  graphml: ["graph"],
  d2: [
    "graph",
    "sequence",
    "class",
    "er",
    "architecture",
    "c4_context",
    "c4_container",
    "deployment",
    "state",
    "activity",
  ],
  structurizr: [
    "c4_context",
    "c4_container",
    "deployment",
    "architecture",
    "graph",
  ],
  wiremark: ["wireframe"],
};

export function getDiagramKindFamily(kind: DiagramKind): DiagramKindFamily {
  return DIAGRAM_KIND_FAMILIES[kind] ?? "graph";
}

export function isGraphProjectableKind(kind: DiagramKind): boolean {
  return [
    "graph",
    "sankey",
    "block",
    "architecture",
    "deployment",
    "nwdiag",
    "archimate",
    "wireframe",
    "unknown",
  ].includes(kind);
}

export function isFormatNativeKind(
  format: DiagramFormat,
  kind: DiagramKind,
): boolean {
  return NATIVE_KINDS_BY_FORMAT[format].includes(kind);
}

export function isMermaidNativeKind(kind: DiagramKind): boolean {
  return isFormatNativeKind("mermaid", kind);
}

export function isPlantUmlNativeKind(kind: DiagramKind): boolean {
  return isFormatNativeKind("plantuml", kind);
}

export function isD2NativeKind(kind: DiagramKind): boolean {
  return isFormatNativeKind("d2", kind);
}

export function isStructurizrNativeKind(kind: DiagramKind): boolean {
  return isFormatNativeKind("structurizr", kind);
}

export function isWiremarkNativeKind(kind: DiagramKind): boolean {
  return isFormatNativeKind("wiremark", kind);
}
