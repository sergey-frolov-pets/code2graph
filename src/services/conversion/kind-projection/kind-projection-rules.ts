import type { DiagramFormat } from "@/constants/diagram-formats";
import type { ConversionQualityLevel } from "@/services/conversion/conversion-report";
import type { DiagramKind } from "@/services/conversion/diagram-ir";
import { isFormatNativeKind } from "@/services/conversion/diagram-kind-families";

export interface KindProjectionRule {
  level: ConversionQualityLevel;
  lossIds: string[];
}

type KindProjectionTable = Partial<
  Record<DiagramKind, Partial<Record<DiagramKind, KindProjectionRule>>>
>;

const GRAPH_TO_C4_CONTAINER: KindProjectionRule = {
  level: "C",
  lossIds: ["loss.c4Types", "loss.c4Semantics"],
};

/**
 * Only semantically meaningful kind changes are listed; the key order of each
 * inner record is the order offered in the UI.
 */
const KIND_PROJECTION_RULES: KindProjectionTable = {
  graph: {
    activity: { level: "B", lossIds: ["loss.cycles", "loss.subgraphs"] },
    state: { level: "B", lossIds: ["loss.nodeShapes", "loss.subgraphs"] },
    sequence: { level: "C", lossIds: ["loss.inferredOrder", "loss.subgraphs"] },
    mindmap: { level: "C", lossIds: ["loss.crossLinks", "loss.edgeLabels"] },
    wbs: { level: "C", lossIds: ["loss.crossLinks", "loss.edgeLabels"] },
    c4_container: GRAPH_TO_C4_CONTAINER,
  },
  unknown: {
    activity: { level: "C", lossIds: ["loss.cycles"] },
    state: { level: "C", lossIds: ["loss.nodeShapes"] },
    mindmap: { level: "C", lossIds: ["loss.crossLinks"] },
  },
  activity: {
    graph: { level: "A", lossIds: [] },
    state: { level: "B", lossIds: ["loss.swimlanes", "loss.controlFlow"] },
    sequence: { level: "C", lossIds: ["loss.inferredOrder", "loss.controlFlow"] },
  },
  state: {
    activity: { level: "B", lossIds: ["loss.cycles", "loss.composite"] },
    graph: { level: "B", lossIds: ["loss.stateSemantics"] },
  },
  sequence: {
    activity: { level: "B", lossIds: ["loss.blocks", "loss.activate"] },
    graph: { level: "C", lossIds: ["loss.temporalOrder", "loss.blocks"] },
  },
  class: {
    er: { level: "B", lossIds: ["loss.methods", "loss.inheritance"] },
    graph: { level: "C", lossIds: ["loss.classMembers", "loss.relationTypes"] },
  },
  er: {
    class: { level: "B", lossIds: ["loss.keys", "loss.cardinality"] },
    graph: { level: "C", lossIds: ["loss.attributes", "loss.cardinality"] },
  },
  object: {
    class: { level: "B", lossIds: ["loss.objectFields"] },
    graph: { level: "C", lossIds: ["loss.objectFields"] },
  },
  mindmap: {
    wbs: { level: "A", lossIds: ["loss.mindmapStyles"] },
    graph: { level: "B", lossIds: ["loss.hierarchyLevels"] },
  },
  wbs: {
    mindmap: { level: "A", lossIds: [] },
    graph: { level: "B", lossIds: ["loss.hierarchyLevels"] },
  },
  c4_context: {
    c4_container: { level: "B", lossIds: ["loss.c4Types"] },
    deployment: { level: "C", lossIds: ["loss.c4Semantics"] },
    graph: { level: "B", lossIds: ["loss.c4Semantics"] },
  },
  c4_container: {
    c4_context: { level: "B", lossIds: ["loss.c4Types", "loss.subgraphs"] },
    deployment: { level: "C", lossIds: ["loss.c4Semantics"] },
    graph: { level: "B", lossIds: ["loss.c4Semantics"] },
  },
  deployment: {
    c4_container: { level: "B", lossIds: ["loss.c4Types"] },
    graph: { level: "B", lossIds: ["loss.nodeShapes"] },
  },
  architecture: {
    c4_container: GRAPH_TO_C4_CONTAINER,
    graph: { level: "B", lossIds: ["loss.nodeShapes"] },
  },
  usecase: {
    graph: { level: "B", lossIds: ["loss.nodeShapes", "loss.subgraphs"] },
  },
  sankey: {
    graph: { level: "B", lossIds: ["loss.chartSemantics"] },
  },
  block: {
    graph: { level: "B", lossIds: ["loss.layout"] },
  },
  pie: {
    xychart: { level: "B", lossIds: ["loss.chartSemantics"] },
  },
  xychart: {
    pie: { level: "B", lossIds: ["loss.chartData"] },
  },
  timeline: {
    gantt: { level: "C", lossIds: ["loss.dates"] },
  },
  gantt: {
    timeline: { level: "B", lossIds: ["loss.dates", "loss.calendar"] },
    graph: { level: "C", lossIds: ["loss.dates", "loss.ganttNotGraph"] },
  },
  journey: {
    timeline: { level: "B", lossIds: ["loss.journeyScores"] },
  },
};

export function getKindProjectionRule(
  sourceKind: DiagramKind,
  targetKind: DiagramKind,
): KindProjectionRule | undefined {
  if (sourceKind === targetKind) {
    return { level: "A", lossIds: [] };
  }
  return KIND_PROJECTION_RULES[sourceKind]?.[targetKind];
}

export function listRelevantTargetKinds(sourceKind: DiagramKind): DiagramKind[] {
  return Object.keys(KIND_PROJECTION_RULES[sourceKind] ?? {}) as DiagramKind[];
}

/** Kinds the source can be projected to that the target format renders natively. */
export function listProjectableKindsForFormat(
  sourceKind: DiagramKind,
  targetFormat: DiagramFormat,
): DiagramKind[] {
  return listRelevantTargetKinds(sourceKind).filter((kind) =>
    isFormatNativeKind(targetFormat, kind),
  );
}

const QUALITY_LEVEL_ORDER: readonly ConversionQualityLevel[] = ["A", "B", "C", "D"];

export function worstQualityLevel(
  ...levels: ConversionQualityLevel[]
): ConversionQualityLevel {
  return levels.reduce<ConversionQualityLevel>(
    (worst, level) =>
      QUALITY_LEVEL_ORDER.indexOf(level) > QUALITY_LEVEL_ORDER.indexOf(worst)
        ? level
        : worst,
    "A",
  );
}
