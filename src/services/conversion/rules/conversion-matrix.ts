import type { DiagramFormat } from "@/constants/diagram-formats";
import type { ConversionQualityLevel } from "@/services/conversion/conversion-report";
import type { DiagramKind } from "@/services/conversion/diagram-ir";

export interface ConversionRouteRule {
  level: ConversionQualityLevel;
  blocked: boolean;
  lossIds: string[];
}

const BASE_GRAPH_LOSSES = ["loss.layout", "loss.styles"] as const;

const ROUTE_RULES: Record<
  DiagramKind,
  Partial<Record<DiagramFormat, Partial<Record<DiagramFormat, ConversionRouteRule>>>>
> = {
  graph: {
    plantuml: {
      mermaid: {
        level: "B",
        blocked: false,
        lossIds: ["loss.subgraphs", "loss.nodeShapes", ...BASE_GRAPH_LOSSES],
      },
      graphml: {
        level: "A",
        blocked: false,
        lossIds: [...BASE_GRAPH_LOSSES],
      },
    },
    mermaid: {
      plantuml: {
        level: "B",
        blocked: false,
        lossIds: ["loss.conditions", "loss.subgraphs", "loss.nodeShapes", ...BASE_GRAPH_LOSSES],
      },
      graphml: {
        level: "A",
        blocked: false,
        lossIds: ["loss.subgraphs", "loss.classDef", ...BASE_GRAPH_LOSSES],
      },
    },
    graphml: {
      plantuml: {
        level: "A",
        blocked: false,
        lossIds: [...BASE_GRAPH_LOSSES],
      },
      mermaid: {
        level: "A",
        blocked: false,
        lossIds: ["loss.subgraphs", "loss.nodeShapes", ...BASE_GRAPH_LOSSES],
      },
    },
  },
  class: {
    plantuml: {
      mermaid: {
        level: "B",
        blocked: false,
        lossIds: ["loss.classMembers", "loss.inheritance", "loss.relationTypes"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.classMembers", "loss.relationTypes", ...BASE_GRAPH_LOSSES],
      },
    },
    mermaid: {
      plantuml: {
        level: "B",
        blocked: false,
        lossIds: ["loss.classMembers", "loss.cardinality", "loss.relationTypes"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.classMembers", "loss.relationTypes", ...BASE_GRAPH_LOSSES],
      },
    },
    graphml: {
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.classMembers", "loss.relationTypes", ...BASE_GRAPH_LOSSES],
      },
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.classMembers", "loss.relationTypes", ...BASE_GRAPH_LOSSES],
      },
    },
  },
  state: {
    plantuml: {
      mermaid: {
        level: "B",
        blocked: false,
        lossIds: ["loss.initialFinal", "loss.guards", "loss.composite"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES],
      },
    },
    mermaid: {
      plantuml: {
        level: "B",
        blocked: false,
        lossIds: ["loss.initialFinal", "loss.guards", "loss.composite"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES],
      },
    },
    graphml: {
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES],
      },
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.stateSemantics", ...BASE_GRAPH_LOSSES],
      },
    },
  },
  er: {
    mermaid: {
      graphml: {
        level: "B",
        blocked: false,
        lossIds: ["loss.attributes", "loss.cardinality", ...BASE_GRAPH_LOSSES],
      },
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.attributes", "loss.cardinality", "loss.unsupportedKind"],
      },
    },
    graphml: {
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.attributes", "loss.keys", ...BASE_GRAPH_LOSSES],
      },
      plantuml: {
        level: "D",
        blocked: true,
        lossIds: ["loss.unsupportedKind"],
      },
    },
    plantuml: {},
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
  activity: {
    plantuml: {
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.swimlanes", "loss.branches", "loss.nodeShapes"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.swimlanes", "loss.controlFlow", ...BASE_GRAPH_LOSSES],
      },
    },
    mermaid: {
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.swimlanes", "loss.branches", "loss.nodeShapes"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.swimlanes", "loss.controlFlow", ...BASE_GRAPH_LOSSES],
      },
    },
    graphml: {
      plantuml: {
        level: "D",
        blocked: true,
        lossIds: ["loss.controlFlow", "loss.unsupportedKind"],
      },
      mermaid: {
        level: "D",
        blocked: true,
        lossIds: ["loss.controlFlow", "loss.unsupportedKind"],
      },
    },
  },
  c4_context: {
    plantuml: {
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Types", "loss.c4Semantics", ...BASE_GRAPH_LOSSES],
      },
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", "loss.subgraphs"],
      },
    },
    graphml: {
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES],
      },
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", "loss.subgraphs"],
      },
    },
    mermaid: {
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", "loss.unsupportedKind"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES],
      },
    },
  },
  c4_container: {
    plantuml: {
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Types", "loss.c4Semantics", ...BASE_GRAPH_LOSSES],
      },
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", "loss.subgraphs"],
      },
    },
    graphml: {
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES],
      },
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", "loss.subgraphs"],
      },
    },
    mermaid: {
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", "loss.unsupportedKind"],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.c4Semantics", ...BASE_GRAPH_LOSSES],
      },
    },
  },
  gantt: {
    plantuml: {
      mermaid: {
        level: "B",
        blocked: false,
        lossIds: ["loss.dates", "loss.sections", "loss.calendar"],
      },
      graphml: {
        level: "D",
        blocked: true,
        lossIds: ["loss.ganttNotGraph"],
      },
    },
    mermaid: {
      plantuml: {
        level: "B",
        blocked: false,
        lossIds: ["loss.dates", "loss.sections", "loss.calendar"],
      },
      graphml: {
        level: "D",
        blocked: true,
        lossIds: ["loss.ganttNotGraph"],
      },
    },
    graphml: {
      plantuml: {
        level: "D",
        blocked: true,
        lossIds: ["loss.ganttNotGraph"],
      },
      mermaid: {
        level: "D",
        blocked: true,
        lossIds: ["loss.ganttNotGraph"],
      },
    },
  },
  unknown: {
    plantuml: {
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.unsupportedKind", ...BASE_GRAPH_LOSSES],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.unsupportedKind", ...BASE_GRAPH_LOSSES],
      },
    },
    mermaid: {
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.unsupportedKind", ...BASE_GRAPH_LOSSES],
      },
      graphml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.unsupportedKind", ...BASE_GRAPH_LOSSES],
      },
    },
    graphml: {
      plantuml: {
        level: "C",
        blocked: false,
        lossIds: ["loss.unsupportedKind", ...BASE_GRAPH_LOSSES],
      },
      mermaid: {
        level: "C",
        blocked: false,
        lossIds: ["loss.unsupportedKind", ...BASE_GRAPH_LOSSES],
      },
    },
  },
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

  return rule;
}

export function isConversionBlocked(
  kind: DiagramKind,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
): boolean {
  return getConversionRouteRule(kind, sourceFormat, targetFormat).blocked;
}
