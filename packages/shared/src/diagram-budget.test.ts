import { describe, expect, it } from "vitest";
import {
  checkDiagramBudget,
  countsFromGraph,
  DEFAULT_DIAGRAM_BUDGET,
  diagramBudgetFor,
} from "./diagram-budget.js";

describe("diagram complexity budget", () => {
  it("keeps per-type limits with a shared default", () => {
    expect(diagramBudgetFor("sequence").lifelines).toBe(5);
    expect(diagramBudgetFor("er").entities).toBe(8);
    expect(diagramBudgetFor("component").nodes).toBe(9);
    expect(diagramBudgetFor("pie").nodes).toBe(DEFAULT_DIAGRAM_BUDGET.nodes);
  });

  it("passes a diagram inside its budget", () => {
    const report = checkDiagramBudget("sequence", { lifelines: 4 });
    expect(report.violations).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("warns when a dependency diagram exceeds nodes and connections", () => {
    const report = checkDiagramBudget("component", { nodes: 12, edges: 20 });
    expect(report.violations).toEqual([
      { metric: "nodes", actual: 12, limit: 9 },
      { metric: "edges", actual: 20, limit: 14 },
    ]);
    expect(report.warnings[0]).toContain("12 nodes with a budget of 9");
  });

  it("ignores metrics the caller did not supply", () => {
    expect(checkDiagramBudget("er", { nodes: 3 }).violations).toEqual([]);
  });

  it("counts nodes and edges of a graph", () => {
    expect(countsFromGraph({ nodes: [1, 2, 3], edges: [1, 2] })).toEqual({
      nodes: 3,
      edges: 2,
    });
    expect(countsFromGraph(undefined)).toEqual({});
  });
});
