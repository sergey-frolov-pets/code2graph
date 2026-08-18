import type { CodeGraphDiagramType } from "@/constants/code-graph";
import type { CodeProjectIR } from "@/services/code-graph/ir/code-project-ir";
import { mapCodeProjectToDiagramIr } from "@/services/code-graph/mappers/to-diagram-ir";
import {
  CONVERSION_MAX_EDGES,
  CONVERSION_MAX_NODES,
} from "@/constants/conversion-settings";
import { validateDiagramIr } from "@/services/conversion/validate-diagram-ir";
import { emitPlantUmlFromIr } from "@/services/conversion/emit/emit-plantuml";
import type { DiagramIR } from "@/services/conversion/diagram-ir";

function enforceDiagramIrLimits(ir: DiagramIR): {
  ir: DiagramIR;
  warnings: string[];
} {
  const warnings: string[] = [];
  const truncatedNodes = Math.max(0, ir.nodes.length - CONVERSION_MAX_NODES);
  const truncatedEdges = Math.max(0, ir.edges.length - CONVERSION_MAX_EDGES);

  if (truncatedNodes > 0) {
    warnings.push(`Truncated ${truncatedNodes} nodes`);
  }

  if (truncatedEdges > 0) {
    warnings.push(`Truncated ${truncatedEdges} edges`);
  }

  return {
    ir: {
      ...ir,
      nodes: ir.nodes.slice(0, CONVERSION_MAX_NODES),
      edges: ir.edges.slice(0, CONVERSION_MAX_EDGES),
    },
    warnings,
  };
}

export interface GenerateCodeGraphDiagramInput {
  project: CodeProjectIR;
  diagramType: CodeGraphDiagramType;
  selectedFileIds: string[];
  selectedSymbolIds: string[];
  irOverride?: DiagramIR;
}

export interface GenerateCodeGraphDiagramResult {
  ir: DiagramIR;
  plantUml: string;
  validationIssues: string[];
}

export function generateCodeGraphDiagram(
  input: GenerateCodeGraphDiagramInput,
): GenerateCodeGraphDiagramResult {
  const ir =
    input.irOverride ??
    mapCodeProjectToDiagramIr(
      input.project,
      input.diagramType,
      input.selectedFileIds,
      input.selectedSymbolIds,
    );

  const validation = validateDiagramIr(ir);
  const limited = enforceDiagramIrLimits(ir);
  const plantUml = emitPlantUmlFromIr(limited.ir);

  return {
    ir: limited.ir,
    plantUml,
    validationIssues: [...validation.errors, ...limited.warnings],
  };
}

export function applyDiagramIrEdits(
  base: DiagramIR,
  edits: Array<{ nodeId: string; label?: string; groupId?: string | null }>,
): DiagramIR {
  const next: DiagramIR = structuredClone(base);

  for (const edit of edits) {
    const node = next.nodes.find((entry) => entry.id === edit.nodeId);
    if (!node) {
      continue;
    }

    if (edit.label !== undefined) {
      node.label = edit.label;
    }

    if (edit.groupId !== undefined) {
      node.groupId = edit.groupId ?? undefined;
    }
  }

  return next;
}
