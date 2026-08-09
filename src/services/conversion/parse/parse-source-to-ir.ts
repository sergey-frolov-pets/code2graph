import type { DiagramFormat } from "@/constants/diagram-formats";
import { CONVERSION_IR_VERSION } from "@/constants/conversion-settings";
import { classifyDiagramKind, detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  type DiagramEdge,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import {
  parseActivityMermaid,
  parseClassMermaid,
  parseErMermaid,
  parseFlowchartMermaid,
  parseGanttMermaid,
  parseSequenceMermaid,
  parseStateMermaid,
} from "@/services/conversion/parse/parse-mermaid";
import {
  parseActivityPlantUml,
  parseC4PlantUml,
  parseClassPlantUml,
  parseComponentPlantUml,
  parseGanttPlantUml,
  parseSequencePlantUml,
  parseStatePlantUml,
} from "@/services/conversion/parse/parse-plantuml";
import { stripSourceComments } from "@/services/conversion/parse/parse-utils";
import {
  parseArchimatePlantUml,
  parseArchitectureMermaid,
  parseBlockMermaid,
  parseC4Mermaid,
  parseDeploymentPlantUml,
  parseErPlantUml,
  parseGitgraphMermaid,
  parseJourneyMermaid,
  parseMindmapMermaid,
  parseMindmapPlantUml,
  parseNwdiagPlantUml,
  parseObjectPlantUml,
  parsePacketMermaid,
  parsePieMermaid,
  parseQuadrantMermaid,
  parseRequirementMermaid,
  parseSankeyMermaid,
  parseTimelineMermaid,
  parseTimingPlantUml,
  parseUsecasePlantUml,
  parseWbsPlantUml,
  parseXychartMermaid,
} from "@/services/conversion/parse/kind-parsers";
import { parseGraphml } from "@/services/graphml/graphml-engine";

export class DiagramParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramParseError";
  }
}

function graphmlToIr(source: string, format: DiagramFormat): DiagramIR {
  const parsed = parseGraphml(source);
  const usedIds = new Set<string>();
  const nodes: DiagramNode[] = parsed.nodes.map((node) => ({
    id: uniqueDiagramId(node.id, usedIds),
    label: node.label,
    matchConfidence: 1,
  }));

  const idByOriginal = new Map(
    parsed.nodes.map((node, index) => [node.id, nodes[index].id]),
  );

  const edges: DiagramEdge[] = parsed.edges.map((edge, index) => ({
    id: `e${index + 1}`,
    source: idByOriginal.get(edge.source) ?? edge.source,
    target: idByOriginal.get(edge.target) ?? edge.target,
    label: edge.label,
    matchConfidence: 1,
  }));

  return {
    version: CONVERSION_IR_VERSION,
    kind: "graph",
    direction: parsed.direction ?? detectDiagramDirection(source, format),
    nodes,
    edges,
    metadata: { sourceFormat: format },
  };
}

export function parseSourceToIr(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const cleaned = stripSourceComments(source);
  const kind = classifyDiagramKind(cleaned, format);

  if (format === "graphml") {
    return graphmlToIr(cleaned, format);
  }

  if (format === "plantuml") {
    switch (kind) {
      case "class":
        return parseClassPlantUml(cleaned, format);
      case "state":
        return parseStatePlantUml(cleaned, format);
      case "sequence":
        return parseSequencePlantUml(cleaned, format);
      case "activity":
        return parseActivityPlantUml(cleaned, format);
      case "c4_context":
      case "c4_container":
        return parseC4PlantUml(cleaned, format);
      case "gantt":
        return parseGanttPlantUml(cleaned, format);
      case "er":
        return parseErPlantUml(cleaned, format);
      case "mindmap":
        return parseMindmapPlantUml(cleaned, format);
      case "usecase":
        return parseUsecasePlantUml(cleaned, format);
      case "deployment":
        return parseDeploymentPlantUml(cleaned, format);
      case "object":
        return parseObjectPlantUml(cleaned, format);
      case "timing":
        return parseTimingPlantUml(cleaned, format);
      case "wbs":
        return parseWbsPlantUml(cleaned, format);
      case "nwdiag":
        return parseNwdiagPlantUml(cleaned, format);
      case "archimate":
        return parseArchimatePlantUml(cleaned, format);
      case "graph":
      default:
        return parseComponentPlantUml(cleaned, format);
    }
  }

  switch (kind) {
    case "class":
      return parseClassMermaid(cleaned, format);
    case "state":
      return parseStateMermaid(cleaned, format);
    case "sequence":
      return parseSequenceMermaid(cleaned, format);
    case "er":
      return parseErMermaid(cleaned, format);
    case "gantt":
      return parseGanttMermaid(cleaned, format);
    case "activity":
      return parseActivityMermaid(cleaned, format);
    case "mindmap":
      return parseMindmapMermaid(cleaned, format);
    case "pie":
      return parsePieMermaid(cleaned, format);
    case "journey":
      return parseJourneyMermaid(cleaned, format);
    case "gitgraph":
      return parseGitgraphMermaid(cleaned, format);
    case "timeline":
      return parseTimelineMermaid(cleaned, format);
    case "sankey":
      return parseSankeyMermaid(cleaned, format);
    case "xychart":
      return parseXychartMermaid(cleaned, format);
    case "block":
      return parseBlockMermaid(cleaned, format);
    case "c4_context":
      return parseC4Mermaid(cleaned, format, "c4_context");
    case "c4_container":
      return parseC4Mermaid(cleaned, format, "c4_container");
    case "requirement":
      return parseRequirementMermaid(cleaned, format);
    case "quadrant":
      return parseQuadrantMermaid(cleaned, format);
    case "architecture":
      return parseArchitectureMermaid(cleaned, format);
    case "packet":
      return parsePacketMermaid(cleaned, format);
    case "graph":
    default:
      return parseFlowchartMermaid(cleaned, format);
  }
}

export function safeParseSourceToIr(
  source: string,
  format: DiagramFormat,
): { ir: DiagramIR | null; error: string | null } {
  try {
    return { ir: parseSourceToIr(source, format), error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "conversion.error.parseFailed";
    return { ir: null, error: message };
  }
}
