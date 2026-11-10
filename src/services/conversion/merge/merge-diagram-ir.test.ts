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

  it("keeps authored geometry when a visual hint matches the same label", () => {
    const semantic = createEmptyDiagramIR("graph");
    semantic.nodes = [
      {
        id: "go",
        label: "GO",
        matchConfidence: 1,
        visual: { x: 212, y: 424.5, width: 56, height: 40, fill: "#00ff00", shape: "ellipse" },
      },
    ];

    const result = mergeDiagramIrWithVisualHints(semantic, {
      source: "plantuml-geometry",
      nodes: [
        {
          label: "GO",
          bbox: { x: 0, y: 0, width: 10, height: 10 },
          fill: "#ffffff",
          shape: "rect",
        },
      ],
      edges: [],
    });

    expect(result.unmatchedVisualNodes).toBe(0);
    expect(result.ir.nodes[0]?.visual).toMatchObject({
      x: 212,
      width: 56,
      fill: "#00ff00",
      shape: "ellipse",
    });
  });
});
