import { describe, expect, it } from "vitest";
import {
  parseActivityMermaid,
  parseFlowchartMermaid,
} from "@/services/conversion/parse/parse-mermaid";
import { parseComponentPlantUml } from "@/services/conversion/parse/parse-plantuml";
import {
  MERMAID_ACTIVITY,
  MERMAID_SUBGRAPH,
  PLANTUML_RECTANGLE,
} from "@/services/conversion/__fixtures__/graph-samples";

describe("parse-mermaid", () => {
  it("parses mermaid activity diagrams separately from plantuml syntax", () => {
    const ir = parseActivityMermaid(MERMAID_ACTIVITY, "mermaid");

    expect(ir.kind).toBe("activity");
    expect(ir.nodes.length).toBeGreaterThanOrEqual(3);
    expect(ir.edges.length).toBeGreaterThanOrEqual(2);
  });

  it("parses subgraph declarations into groups", () => {
    const ir = parseFlowchartMermaid(MERMAID_SUBGRAPH, "mermaid");

    expect(ir.groups?.length).toBe(1);
    expect(ir.nodes.some((node) => node.id === "API")).toBe(true);
  });
});

describe("parse-plantuml", () => {
  it("parses rectangle and node aliases", () => {
    const ir = parseComponentPlantUml(PLANTUML_RECTANGLE, "plantuml");

    expect(ir.nodes.some((node) => node.label === "Service")).toBe(true);
    expect(ir.nodes.some((node) => node.label === "Worker")).toBe(true);
    expect(ir.edges.length).toBeGreaterThanOrEqual(1);
  });
});
