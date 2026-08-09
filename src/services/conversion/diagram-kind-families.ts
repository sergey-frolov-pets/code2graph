import type { DiagramKind } from "@/services/conversion/diagram-ir";

export type DiagramKindFamily =
  | "graph"
  | "uml"
  | "c4"
  | "temporal"
  | "hierarchical"
  | "chart"
  | "network"
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
  unknown: "graph",
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
    "unknown",
  ].includes(kind);
}

export function isMermaidNativeKind(kind: DiagramKind): boolean {
  return [
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
  ].includes(kind);
}

export function isPlantUmlNativeKind(kind: DiagramKind): boolean {
  return [
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
  ].includes(kind);
}
