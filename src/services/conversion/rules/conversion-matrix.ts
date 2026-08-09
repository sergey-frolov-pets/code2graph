import type { DiagramFormat } from "@/constants/diagram-formats";
import type { ConversionQualityLevel } from "@/services/conversion/conversion-report";
import type { DiagramKind } from "@/services/conversion/diagram-ir";
import {
  getDiagramKindFamily,
  isMermaidNativeKind,
  isPlantUmlNativeKind,
} from "@/services/conversion/diagram-kind-families";

export interface ConversionRouteRule {
  level: ConversionQualityLevel;
  blocked: boolean;
  lossIds: string[];
}

const BASE_GRAPH_LOSSES = ["loss.layout", "loss.styles"] as const;

function graphRoutes(level: ConversionQualityLevel = "B"): Partial<Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>> {
  return {
    plantuml: {
      mermaid: { level, blocked: false, lossIds: ["loss.subgraphs", "loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level, blocked: false, lossIds: ["loss.conditions", "loss.subgraphs", "loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "A", blocked: false, lossIds: ["loss.subgraphs", "loss.classDef", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      plantuml: { level: "A", blocked: false, lossIds: [...BASE_GRAPH_LOSSES] },
      mermaid: { level: "A", blocked: false, lossIds: ["loss.subgraphs", "loss.nodeShapes", ...BASE_GRAPH_LOSSES] },
    },
  };
}

function umlRoutes(extraLosses: string[] = []): Partial<Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>> {
  const losses = ["loss.classMembers", "loss.relationTypes", ...extraLosses];
  return {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: losses },
      graphml: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: losses },
      graphml: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "C", blocked: false, lossIds: [...losses, ...BASE_GRAPH_LOSSES] },
    },
  };
}

function temporalRoutes(extraLosses: string[] = []): Partial<Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>> {
  return {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.messageOrder", "loss.blocks", ...extraLosses] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.temporalOrder", "loss.sequenceSemantics"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.messageOrder", "loss.blocks", ...extraLosses] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.temporalOrder", "loss.sequenceSemantics"] },
    },
    graphml: {
      plantuml: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics", "loss.unsupportedKind"] },
      mermaid: { level: "D", blocked: true, lossIds: ["loss.sequenceSemantics", "loss.unsupportedKind"] },
    },
  };
}

function chartRoutes(): Partial<Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>> {
  return {
    mermaid: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.chartSemantics", "loss.chartData", "loss.unsupportedKind"] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
    },
    plantuml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.chartSemantics", "loss.chartData", "loss.unsupportedKind"] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
    },
    graphml: {
      mermaid: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
      plantuml: { level: "D", blocked: true, lossIds: ["loss.chartNotGraph"] },
    },
  };
}

function hierarchicalRoutes(): Partial<Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>> {
  return {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.hierarchyLevels", "loss.mindmapStyles"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.hierarchyLevels", "loss.mindmapStyles"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "C", blocked: false, lossIds: ["loss.hierarchyLevels", ...BASE_GRAPH_LOSSES] },
    },
  };
}

function mermaidOnlyRoutes(): Partial<Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>> {
  return {
    mermaid: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax", "loss.unsupportedKind", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax", ...BASE_GRAPH_LOSSES] },
    },
    plantuml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax", "loss.unsupportedKind"] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    graphml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.mermaidOnlySyntax", ...BASE_GRAPH_LOSSES] },
      plantuml: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  };
}

function plantUmlOnlyRoutes(): Partial<Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>> {
  return {
    plantuml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax", "loss.unsupportedKind", ...BASE_GRAPH_LOSSES] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax", ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax", "loss.unsupportedKind"] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.plantumlOnlySyntax", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "D", blocked: true, lossIds: ["loss.unsupportedKind"] },
    },
  };
}

const ROUTE_RULES: Record<
  DiagramKind,
  Partial<Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>>
> = {
  graph: graphRoutes(),
  deployment: graphRoutes("C"),
  architecture: graphRoutes("C"),
  sankey: graphRoutes("C"),
  block: graphRoutes("C"),
  class: umlRoutes(["loss.inheritance"]),
  state: {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.initialFinal", "loss.guards", "loss.composite"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.initialFinal", "loss.guards", "loss.composite"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "C", blocked: false, lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES] },
    },
  },
  er: {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.attributes", "loss.cardinality"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.attributes", "loss.keys", ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.attributes", "loss.cardinality"] },
      graphml: { level: "B", blocked: false, lossIds: ["loss.attributes", "loss.cardinality", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      mermaid: { level: "C", blocked: false, lossIds: ["loss.attributes", "loss.keys", ...BASE_GRAPH_LOSSES] },
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
      graphml: { level: "C", blocked: false, lossIds: ["loss.swimlanes", "loss.controlFlow", ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.swimlanes", "loss.branches", "loss.nodeShapes"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.swimlanes", "loss.controlFlow", ...BASE_GRAPH_LOSSES] },
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
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.temporalOrder", "loss.sequenceSemantics", ...BASE_GRAPH_LOSSES],
      },
    },
    mermaid: {
      plantuml: {
        level: "B",
        blocked: false,
        lossIds: ["loss.messageOrder", "loss.blocks", "loss.activate"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.temporalOrder", "loss.sequenceSemantics", ...BASE_GRAPH_LOSSES],
      },
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
      graphml: { level: "D", blocked: true, lossIds: ["loss.temporalOrder"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.timelineFormat", "loss.sections"] },
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
      graphml: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.dates", "loss.sections", "loss.calendar"] },
      graphml: { level: "D", blocked: true, lossIds: ["loss.ganttNotGraph"] },
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
  c4_context: {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", "loss.subgraphs"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.c4Types", "loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", "loss.subgraphs"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
    },
  },
  c4_container: {
    plantuml: {
      mermaid: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", "loss.subgraphs"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.c4Types", "loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
    },
    mermaid: {
      plantuml: { level: "B", blocked: false, lossIds: ["loss.c4Semantics", "loss.subgraphs"] },
      graphml: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
    },
    graphml: {
      plantuml: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
      mermaid: { level: "C", blocked: false, lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES] },
    },
  },
  requirement: mermaidOnlyRoutes(),
  packet: mermaidOnlyRoutes(),
  usecase: plantUmlOnlyRoutes(),
  object: umlRoutes(["loss.objectFields"]),
  nwdiag: plantUmlOnlyRoutes(),
  archimate: plantUmlOnlyRoutes(),
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

  const family = getDiagramKindFamily(kind);
  const extraLosses: string[] = [];
  if (targetFormat === "mermaid" && !isMermaidNativeKind(kind)) {
    extraLosses.push("loss.mermaidOnlySyntax");
  }
  if (targetFormat === "plantuml" && !isPlantUmlNativeKind(kind)) {
    extraLosses.push("loss.plantumlOnlySyntax");
  }
  if (family === "chart" && targetFormat === "graphml") {
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
