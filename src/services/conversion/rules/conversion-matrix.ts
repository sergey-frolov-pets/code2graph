import type { DiagramFormat } from "@/constants/diagram-formats";
import type { ConversionQualityLevel } from "@/services/conversion/conversion-report";
import type { DiagramKind } from "@/services/conversion/diagram-ir";
import {
  isD2NativeKind,
  isMermaidNativeKind,
  isPlantUmlNativeKind,
  isStructurizrNativeKind,
  isWiremarkNativeKind,
} from "@/services/conversion/diagram-kind-families";

export interface ConversionRouteRule {
  level: ConversionQualityLevel;
  blocked: boolean;
  lossIds: string[];
}

const BASE_GRAPH_LOSSES = ["loss.layout", "loss.styles"] as const;

type FormatRouteMap = Partial<
  Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>
>;

function graphRoutes(level: ConversionQualityLevel = "B"): FormatRouteMap {
  return {
    plantuml: {
      mermaid: { level, blocked: false, lossIds: ["loss.subgraphs", "loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      structurizr: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "C", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level, blocked: false, lossIds: ["loss.conditions", "loss.subgraphs", "loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "A", blocked: false, lossIds: ["loss.subgraphs", "loss.classDef", ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.classDef", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "C", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      plantuml: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      mermaid: { level: "A", blocked: false, lossIds: ["loss.subgraphs", "loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      d2: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      structurizr: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "C", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
    },
    d2: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "B", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      structurizr: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "C", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
    },
    structurizr: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
    },
    wiremark: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "B", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "B", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
    },
  };
}

function umlRoutes(extraLosses: string[] = []): FormatRouteMap {
  const losses = ["loss.classMembers", "loss.relationTypes", ...extraLosses];
  return {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: losses },
      graphml: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: losses },
      structurizr: { level: "C", blocked: false, lossIds: [...losses, "loss.c4Semantics"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: losses },
      graphml: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: losses },
      structurizr: { level: "C", blocked: false, lossIds: [...losses, "loss.c4Semantics"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    d2: {
      plantuml: { level: "B", blocked: false, lossIds: losses },
      mermaid: { level: "B", blocked: false, lossIds: losses },
      graphml: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "C", blocked: false, lossIds: [...losses, "loss.c4Semantics"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
      d2: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  };
}

function temporalRoutes(extraLosses: string[] = []): FormatRouteMap {
  return {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.messageOrder", "loss.blocks", ...extraLosses] },
      d2: { level: "C", blocked: false, lossIds: ["loss.temporalOrder", ...extraLosses] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.temporalOrder", "loss.sequenceSemantics"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.messageOrder", "loss.blocks", ...extraLosses] },
      d2: { level: "C", blocked: false, lossIds: ["loss.temporalOrder", ...extraLosses] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.temporalOrder", "loss.sequenceSemantics"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    d2: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.messageOrder", ...extraLosses] },
      mermaid: { level: "B", blocked: false, lossIds: ["loss.messageOrder", ...extraLosses] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.temporalOrder", "loss.sequenceSemantics"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    graphml: {
      plantuml: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics", "loss.unsupportedKind"] },
      mermaid: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics", "loss.unsupportedKind"] },
      d2: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics", "loss.unsupportedKind"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  };
}

function chartRoutes(): FormatRouteMap {
  return {
    mermaid: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.chartSemantics", "loss.chartData", "loss.unsupportedKind"] },
      d2: { level: "C", blocked: false, lossIds: ["loss.chartSemantics", "loss.chartData"] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
    },
    plantuml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.chartSemantics", "loss.chartData", "loss.unsupportedKind"] },
      d2: { level: "C", blocked: false, lossIds: ["loss.chartSemantics", "loss.chartData"] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
    },
    graphml: {
      mermaid: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
      plantuml: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
      d2: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
    },
  };
}

function hierarchicalRoutes(): FormatRouteMap {
  return {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.hierarchyLevels", "loss.mindmapStyles"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.hierarchyLevels", "loss.mindmapStyles"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "C", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
      d2: { level: "C", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  };
}

function mermaidOnlyRoutes(): FormatRouteMap {
  return {
    mermaid: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax", "loss.unsupportedKind", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax", ...BASE_GRAPH_LOSSES] },
      d2: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    plantuml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax", "loss.unsupportedKind"] },
      d2: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax"] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    graphml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax", ...BASE_GRAPH_LOSSES] },
      plantuml: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      d2: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  };
}

function plantUmlOnlyRoutes(): FormatRouteMap {
  return {
    plantuml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax", "loss.unsupportedKind", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax", ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.plantumlOnlySyntax", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax", "loss.c4Semantics"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    mermaid: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax", "loss.unsupportedKind"] },
      d2: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax"] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      d2: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  };
}

function c4Routes(): FormatRouteMap {
  return {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", "loss.subgraphs"] },
      structurizr: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.c4Types", "loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", "loss.subgraphs"] },
      structurizr: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    structurizr: {
      plantuml: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      mermaid: { level: "A", blocked: false, lossIds: ["loss.subgraphs", ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.c4Types", "loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    d2: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      d2: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  };
}

const ROUTE_RULES: Record<DiagramKind, FormatRouteMap> = {
  graph: graphRoutes(),
  deployment: {
    ...graphRoutes("B"),
    plantuml: {
      ...graphRoutes("B").plantuml,
      structurizr: { level: "B", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
    },
    structurizr: {
      plantuml: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      mermaid: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  },
  architecture: {
    ...graphRoutes("B"),
    d2: {
      mermaid: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      plantuml: { level: "B", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      structurizr: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "B", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  },
  sankey: graphRoutes("C"),
  block: graphRoutes("C"),
  class: umlRoutes(["loss.inheritance"]),
  state: {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.initialFinal", "loss.guards", "loss.composite"] },
      d2: { level: "B", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.initialFinal", "loss.guards", "loss.composite"] },
      d2: { level: "B", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    d2: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "B", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
      d2: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
    },
  },
  er: {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.attributes", "loss.cardinality"] },
      d2: { level: "A", blocked: false, lossIds: ["loss.cardinality"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.attributes", "loss.keys", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.attributes", "loss.cardinality"] },
      d2: { level: "A", blocked: false, lossIds: ["loss.cardinality"] },
      graphml: { level: "B", blocked: false, lossIds: ["loss.attributes", "loss.cardinality", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    d2: {
      plantuml: { level: "A", blocked: false, lossIds: ["loss.cardinality"] },
      mermaid: { level: "A", blocked: false, lossIds: ["loss.cardinality"] },
      graphml: { level: "B", blocked: false, lossIds: ["loss.attributes", "loss.keys", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    graphml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.attributes", "loss.keys", ...BASE_GRAPH_LOSSES] },
      d2: { level: "C", blocked: false, lossIds: ["loss.attributes", "loss.keys", ...BASE_GRAPH_LOSSES] },
      plantuml: {
        level: "D",
        blocked: true,
        lossIds: ["loss.attributes", "loss.keys", "loss.unsupportedKind"],
      },
    },
  },
  activity: {
    plantuml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.swimlanes", "loss.branches", "loss.nodeShapes"] },
      d2: { level: "B", blocked: false, lossIds: ["loss.swimlanes", "loss.branches", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.swimlanes", "loss.controlFlow", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "C", blocked: false, lossIds: ["loss.controlFlow", ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.swimlanes", "loss.branches", "loss.nodeShapes"] },
      d2: { level: "B", blocked: false, lossIds: ["loss.swimlanes", "loss.branches", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.swimlanes", "loss.controlFlow", ...BASE_GRAPH_LOSSES] },
      wiremark: { level: "C", blocked: false, lossIds: ["loss.controlFlow", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      plantuml: { level: "D", blocked: true, lossIds: ["loss.controlFlow", "loss.unsupportedKind"] },
      mermaid: { level: "D", blocked: true, lossIds: ["loss.controlFlow", "loss.unsupportedKind"] },
    },
  },
  sequence: {
    plantuml: {
      mermaid: {
        level: "B",
        blocked: false,
        lossIds: ["loss.messageOrder", "loss.blocks", "loss.activate"],
      },
      d2: {
        level: "B",
        blocked: false,
        lossIds: ["loss.blocks", "loss.activate"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.temporalOrder", "loss.sequenceSemantics", ...BASE_GRAPH_LOSSES],
      },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics"] },
    },
    mermaid: {
      plantuml: {
        level: "B",
        blocked: false,
        lossIds: ["loss.messageOrder", "loss.blocks", "loss.activate"],
      },
      d2: {
        level: "B",
        blocked: false,
        lossIds: ["loss.blocks", "loss.activate"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.temporalOrder", "loss.sequenceSemantics", ...BASE_GRAPH_LOSSES],
      },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics"] },
    },
    d2: {
      plantuml: {
        level: "A",
        blocked: false,
        lossIds: [...BASE_GRAPH_LOSSES],
      },
      mermaid: {
        level: "A",
        blocked: false,
        lossIds: [...BASE_GRAPH_LOSSES],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.temporalOrder", "loss.sequenceSemantics", ...BASE_GRAPH_LOSSES],
      },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics"] },
    },
    graphml: {
      plantuml: {
        level: "D",
        blocked: true,
        lossIds: ["loss.sequenceSemantics", "loss.unsupportedKind"],
      },
      mermaid: {
        level: "D",
        blocked: true,
        lossIds: ["loss.sequenceSemantics", "loss.unsupportedKind"],
      },
    },
  },
  timing: temporalRoutes(["loss.timingSignals"]),
  journey: temporalRoutes(["loss.journeyScores"]),
  gitgraph: mermaidOnlyRoutes(),
  timeline: {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.timelineFormat", "loss.sections"] },
      d2: { level: "C", blocked: false, lossIds: ["loss.timelineFormat", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.temporalOrder"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.timelineFormat", "loss.sections"] },
      d2: { level: "C", blocked: false, lossIds: ["loss.timelineFormat", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.temporalOrder"] },
    },
    graphml: {
      plantuml: { level: "D", blocked: true, lossIds: ["loss.temporalOrder"] },
      mermaid: { level: "D", blocked: true, lossIds: ["loss.temporalOrder"] },
    },
  },
  gantt: {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.dates", "loss.sections", "loss.calendar"] },
      d2: { level: "C", blocked: false, lossIds: ["loss.dates", "loss.calendar", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.dates", "loss.sections", "loss.calendar"] },
      d2: { level: "C", blocked: false, lossIds: ["loss.dates", "loss.calendar", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
      wiremark: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
    },
    graphml: {
      plantuml: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
      mermaid: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
    },
  },
  mindmap: hierarchicalRoutes(),
  wbs: plantUmlOnlyRoutes(),
  pie: chartRoutes(),
  xychart: chartRoutes(),
  quadrant: chartRoutes(),
  c4_context: c4Routes(),
  c4_container: c4Routes(),
  requirement: mermaidOnlyRoutes(),
  packet: mermaidOnlyRoutes(),
  usecase: plantUmlOnlyRoutes(),
  object: umlRoutes(["loss.objectFields"]),
  nwdiag: plantUmlOnlyRoutes(),
  archimate: plantUmlOnlyRoutes(),
  wireframe: {
    wiremark: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      plantuml: { level: "B", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      d2: { level: "B", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      structurizr: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    mermaid: {
      wiremark: { level: "C", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
    },
    plantuml: {
      wiremark: { level: "C", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
    },
    d2: {
      wiremark: { level: "C", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      wiremark: { level: "C", blocked: false, lossIds: ["loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
    },
  },
  unknown: graphRoutes("C"),
};

export function getConversionRouteRule(
  kind: DiagramKind,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
): ConversionRouteRule {
  if (sourceFormat === targetFormat) {
    return {
      level: "A",
      blocked: true,
      lossIds: ["loss.unsupportedKind"],
    };
  }

  const rule =
    ROUTE_RULES[kind]?.[sourceFormat]?.[targetFormat] ??
    ROUTE_RULES.unknown[sourceFormat]?.[targetFormat];

  if (!rule) {
    return {
      level: "D",
      blocked: true,
      lossIds: ["loss.unsupportedKind"],
    };
  }

  const extraLosses: string[] = [];
  if (targetFormat === "mermaid" && !isMermaidNativeKind(kind)) {
    extraLosses.push("loss.mermaidOnlySyntax");
  }
  if (targetFormat === "plantuml" && !isPlantUmlNativeKind(kind)) {
    extraLosses.push("loss.plantumlOnlySyntax");
  }
  if (
    targetFormat === "d2" &&
    !isD2NativeKind(kind) &&
    kind !== "unknown"
  ) {
    extraLosses.push("loss.unsupportedKind");
  }
  if (
    targetFormat === "structurizr" &&
    !isStructurizrNativeKind(kind) &&
    kind !== "unknown"
  ) {
    extraLosses.push("loss.c4Semantics");
  }
  if (
    targetFormat === "wiremark" &&
    !isWiremarkNativeKind(kind) &&
    kind !== "unknown"
  ) {
    extraLosses.push("loss.nodeShapes");
  }

  if (extraLosses.length === 0) {
    return rule;
  }

  return {
    ...rule,
    lossIds: [...new Set([...rule.lossIds, ...extraLosses])],
  };
}

export function isConversionBlocked(
  kind: DiagramKind,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
): boolean {
  return getConversionRouteRule(kind, sourceFormat, targetFormat).blocked;
}
