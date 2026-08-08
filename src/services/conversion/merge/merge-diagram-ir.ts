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

export function mergeDiagramIrWithVisualHints(
  semantic: DiagramIR,
  visual: VisualHints,
): { ir: DiagramIR; unmatchedVisualNodes: number } {
  const usedHints = new Set<VisualNodeHint>();
  let unmatchedVisualNodes = 0;

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

  unmatchedVisualNodes = visual.nodes.length - usedHints.size;

  return {
    ir: {
      ...semantic,
      nodes,
      metadata: {
        ...semantic.metadata,
        conversionMode:
          visual.source === "metadata" ? "metadata" : semantic.metadata?.conversionMode,
      },
    },
    unmatchedVisualNodes,
  };
}
