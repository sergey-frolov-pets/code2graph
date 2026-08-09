import type { DiagramFormat } from "@/constants/diagram-formats";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { stripSourceComments } from "@/services/conversion/parse/parse-utils";
import { parseGraphmlToIr } from "@/services/conversion/parse/parse-graphml";
import {
  parseActivityPlantUml,
  parseC4PlantUml,
  parseClassPlantUml,
  parseComponentPlantUml,
  parseGanttPlantUml,
  parseSequencePlantUml,
  parseStatePlantUml,
} from "@/services/conversion/parse/parse-plantuml";
import {
  parseActivityMermaid,
  parseClassMermaid,
  parseErMermaid,
  parseFlowchartMermaid,
  parseGanttMermaid,
  parseSequenceMermaid,
  parseStateMermaid,
} from "@/services/conversion/parse/parse-mermaid";

export class DiagramParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramParseError";
  }
}

export function parseSourceToIr(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const cleaned = stripSourceComments(source);
  const kind = classifyDiagramKind(cleaned, format);

  if (format === "graphml") {
    return parseGraphmlToIr(cleaned, format);
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
