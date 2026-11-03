import type { DiagramFormat } from "@/constants/diagram-formats";
import { CONVERSION_IR_VERSION } from "@/constants/conversion-settings";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  type DiagramEdge,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { DiagramParseError } from "@/services/conversion/parse/parse-source-to-ir";
import { parseGraphml } from "@/services/graphml/graphml-engine";

export function parseGraphmlToIr(source: string, format: DiagramFormat): DiagramIR {
  let parsed;
  try {
    parsed = parseGraphml(source);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "conversion.error.parseFailed";
    throw new DiagramParseError(message);
  }

  const usedIds = new Set<string>();
  const nodes: DiagramNode[] = parsed.nodes.map((node) => ({
    id: uniqueDiagramId(node.id, usedIds),
    label: node.label,
    matchConfidence: 1,
  }));

  const idByOriginal = new Map(
    parsed.nodes.map((node, index) => [node.id, nodes[index]!.id]),
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
    groups: [],
    metadata: { sourceFormat: format },
  };
}
