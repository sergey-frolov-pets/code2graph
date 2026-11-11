import {
  isAgentDiagramType,
  type AgentDiagramType,
  type RequestedDiagramChange,
} from "@shared/agent-diagram";
import { isDiagramFormat, type DiagramFormat } from "@/constants/diagram-format-ids";

/** Язык и тип, которые надо записать в предложение и применить в редакторе. */
export function resolveAiChatProposalTarget(
  current: DiagramFormat,
  declaredFormat: string | undefined,
  declaredType: string | undefined,
  change: RequestedDiagramChange,
): { format?: DiagramFormat; diagramType?: AgentDiagramType } {
  const declared = declaredFormat && isDiagramFormat(declaredFormat) ? declaredFormat : undefined;
  const format =
    declared ?? (change.active && change.format !== current ? change.format : undefined);
  const fromModel = declaredType && isAgentDiagramType(declaredType) ? declaredType : undefined;
  const diagramType =
    fromModel ?? (change.active && change.diagramType ? change.diagramType : undefined);
  return {
    ...(format ? { format } : {}),
    ...(diagramType ? { diagramType } : {}),
  };
}

/** Язык, по правилам которого проверяется исходник предложения. */
export function aiChatProposalValidationFormat(
  current: DiagramFormat,
  declaredFormat: string | undefined,
  change: RequestedDiagramChange,
): DiagramFormat {
  if (declaredFormat && isDiagramFormat(declaredFormat)) {
    return declaredFormat;
  }
  if (change.active) {
    return change.format;
  }
  return current;
}
