import type { DiagramIR } from "@/services/conversion/diagram-ir";

export interface DiagramIrValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDiagramIr(ir: DiagramIR): DiagramIrValidationResult {
  const errors: string[] = [];
  const nodeIds = new Set<string>();

  for (const node of ir.nodes) {
    if (!node.id.trim()) {
      errors.push("conversion.error.emptyNodeId");
      continue;
    }
    if (nodeIds.has(node.id)) {
      errors.push("conversion.error.duplicateNodeId");
    }
    nodeIds.add(node.id);
  }

  for (const edge of ir.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push("conversion.error.danglingEdge");
    }
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
  };
}
