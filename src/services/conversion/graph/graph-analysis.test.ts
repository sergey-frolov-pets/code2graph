import { describe, expect, it } from "vitest";
import {
  createEmptyDiagramIR,
  type DiagramIR,
} from "@/services/conversion/diagram-ir";
import {
  buildHierarchy,
  orderEdgesByFlow,
  orderNodesTopologically,
} from "@/services/conversion/graph/graph-analysis";

function graphOf(nodeIds: string[], links: Array<[string, string]>): DiagramIR {
  return {
    ...createEmptyDiagramIR("graph"),
    nodes: nodeIds.map((id) => ({ id, label: id.toUpperCase(), matchConfidence: 1 })),
    edges: links.map(([source, target], position) => ({
      id: `e${position + 1}`,
      source,
      target,
      matchConfidence: 1,
    })),
  };
}

describe("graph analysis", () => {
  it("orders nodes by dependencies even when declared out of order", () => {
    const ir = graphOf(["c", "b", "a"], [["a", "b"], ["b", "c"]]);
    expect(orderNodesTopologically(ir).map((node) => node.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks cycles without dropping nodes", () => {
    const ir = graphOf(["a", "b", "c"], [["a", "b"], ["b", "c"], ["c", "a"]]);
    expect(orderNodesTopologically(ir).map((node) => node.id)).toEqual(["a", "b", "c"]);
  });

  it("orders edges by the flow rank of their source", () => {
    const ir = graphOf(["a", "b", "c"], [["b", "c"], ["a", "b"]]);
    expect(orderEdgesByFlow(ir).map((edge) => edge.id)).toEqual(["e2", "e1"]);
  });

  it("builds a preorder hierarchy with the shallowest parent", () => {
    const ir = graphOf(["root", "x", "y", "z"], [["root", "x"], ["root", "y"], ["x", "z"], ["y", "z"]]);
    const hierarchy = buildHierarchy(ir, "Diagram");
    expect(hierarchy.items.map((item) => [item.id, item.level])).toEqual([
      ["root", 1],
      ["x", 2],
      ["z", 3],
      ["y", 2],
    ]);
    expect(hierarchy.droppedEdgeCount).toBe(1);
  });

  it("adds a synthetic root for forests", () => {
    const ir = graphOf(["a", "b"], []);
    const hierarchy = buildHierarchy(ir, "Overview");
    expect(hierarchy.syntheticRootId).toBe("root");
    expect(hierarchy.items.map((item) => item.label)).toEqual(["Overview", "A", "B"]);
  });
});
