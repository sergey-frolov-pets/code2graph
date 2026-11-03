import { MERGE_CONFIDENCE_THRESHOLD, MERGE_LABEL_FUZZY_MAX_DISTANCE } from "@/constants/conversion-settings";
import type { DiagramIR, DiagramNode } from "@/services/conversion/diagram-ir";
import {
  levenshteinDistance,
  normalizeLabel,
} from "@/services/conversion/parse/parse-utils";
import type { VisualHints, VisualNodeHint } from "@/services/conversion/visual/visual-hints";

function findVisualMatch(
  node: DiagramNode,
  hints: VisualNodeHint[],
  used: Set<VisualNodeHint>,
): VisualNodeHint | null {
  const normalized = normalizeLabel(node.label);

  for (const hint of hints) {
    if (used.has(hint)) {
      continue;
    }
    if (hint.semanticId && hint.semanticId === node.id) {
      return hint;
    }
    if (normalizeLabel(hint.label) === normalized) {
      return hint;
    }
  }

  for (const hint of hints) {
    if (used.has(hint)) {
      continue;
    }
    if (
      levenshteinDistance(normalizeLabel(hint.label), normalized) <=
      MERGE_LABEL_FUZZY_MAX_DISTANCE
    ) {
      return hint;
    }
  }

  return null;
}

function findNodeIdByLabel(
  ir: DiagramIR,
  label: string | undefined,
): string | null {
  if (!label) {
    return null;
  }

  const normalized = normalizeLabel(label);
  const node = ir.nodes.find(
    (entry) => normalizeLabel(entry.label) === normalized || entry.id === label,
  );
  return node?.id ?? null;
}

function mergeVisualEdges(ir: DiagramIR, visual: VisualHints): number {
  let mergedCount = 0;

  for (const hint of visual.edges) {
    const sourceId = findNodeIdByLabel(ir, hint.sourceLabel);
    const targetId = findNodeIdByLabel(ir, hint.targetLabel);
    if (!sourceId || !targetId) {
      continue;
    }

    const exists = ir.edges.some(
      (edge) =>
        edge.source === sourceId &&
        edge.target === targetId &&
        normalizeLabel(edge.label ?? "") === normalizeLabel(hint.label ?? ""),
    );
    if (exists) {
      continue;
    }

    ir.edges.push({
      id: `ve${ir.edges.length + 1}`,
      source: sourceId,
      target: targetId,
      label: hint.label,
      matchConfidence: 0.5,
    });
    mergedCount += 1;
  }

  return mergedCount;
}

export function mergeDiagramIrWithVisualHints(
  semantic: DiagramIR,
  visual: VisualHints,
): { ir: DiagramIR; unmatchedVisualNodes: number; mergedVisualEdges: number } {
  const usedHints = new Set<VisualNodeHint>();

  const nodes = semantic.nodes.map((node) => {
    const hint = findVisualMatch(node, visual.nodes, usedHints);
    if (!hint) {
      return node;
    }

    usedHints.add(hint);
    return {
      ...node,
      visual: {
        x: hint.bbox.x,
        y: hint.bbox.y,
        width: hint.bbox.width,
        height: hint.bbox.height,
        fill: hint.fill,
        stroke: hint.stroke,
        shape: hint.shape,
      },
      matchConfidence: Math.max(node.matchConfidence, MERGE_CONFIDENCE_THRESHOLD),
    };
  });

  const unmatchedVisualNodes = visual.nodes.length - usedHints.size;
  const mergedIr: DiagramIR = {
    ...semantic,
    nodes,
    edges: [...semantic.edges],
    metadata: {
      ...semantic.metadata,
      conversionMode:
        visual.source === "metadata" ? "metadata" : semantic.metadata?.conversionMode,
    },
  };

  const mergedVisualEdges = mergeVisualEdges(mergedIr, visual);

  return {
    ir: mergedIr,
    unmatchedVisualNodes,
    mergedVisualEdges,
  };
}
