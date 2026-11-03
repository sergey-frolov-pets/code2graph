import { describe, expect, it } from "vitest";
import { mergeDiagramIrWithVisualHints } from "@/services/conversion/merge/merge-diagram-ir";
import { createEmptyDiagramIR } from "@/services/conversion/diagram-ir";

describe("mergeDiagramIrWithVisualHints", () => {
  it("merges node visuals and visual edges by label", () => {
    const semantic = createEmptyDiagramIR("graph");
    semantic.nodes = [
      { id: "a", label: "Alice", matchConfidence: 1 },
      { id: "b", label: "Bob", matchConfidence: 1 },
    ];

    const result = mergeDiagramIrWithVisualHints(semantic, {
      source: "mermaid-dom",
      nodes: [
        {
          label: "Alice",
          bbox: { x: 1, y: 2, width: 40, height: 20 },
          fill: "#fff",
        },
      ],
      edges: [
        {
          sourceLabel: "Alice",
          targetLabel: "Bob",
          label: "sends",
        },
      ],
    });

    expect(result.ir.nodes[0]?.visual?.x).toBe(1);
    expect(result.mergedVisualEdges).toBe(1);
    expect(result.ir.edges).toHaveLength(1);
    expect(result.ir.edges[0]?.label).toBe("sends");
  });
});
