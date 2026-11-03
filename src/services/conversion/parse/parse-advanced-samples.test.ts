import { describe, expect, it } from "vitest";
import {
  parseClassMermaid,
  parseErMermaid,
  parseSequenceMermaid,
  parseStateMermaid,
} from "@/services/conversion/parse/parse-mermaid";
import {
  parseClassPlantUml,
  parseSequencePlantUml,
  parseStatePlantUml,
} from "@/services/conversion/parse/parse-plantuml";
import {
  MERMAID_CLASS_MINIMAL,
  PLANTUML_CLASS_MINIMAL,
} from "@/services/conversion/__fixtures__/class-samples";
import { MERMAID_ER_MINIMAL } from "@/services/conversion/__fixtures__/er-samples";
import {
  MERMAID_SEQUENCE_MINIMAL,
  PLANTUML_SEQUENCE_MINIMAL,
} from "@/services/conversion/__fixtures__/sequence-samples";
import {
  MERMAID_STATE_MINIMAL,
  PLANTUML_STATE_MINIMAL,
} from "@/services/conversion/__fixtures__/state-samples";

describe("parse advanced diagram kinds", () => {
  it("parses plantuml class inheritance", () => {
    const ir = parseClassPlantUml(PLANTUML_CLASS_MINIMAL, "plantuml");
    expect(ir.kind).toBe("class");
    expect(ir.nodes.map((node) => node.label).sort()).toEqual(["Animal", "Dog"]);
    expect(ir.edges.length).toBeGreaterThanOrEqual(1);
  });

  it("parses mermaid class inheritance", () => {
    const ir = parseClassMermaid(MERMAID_CLASS_MINIMAL, "mermaid");
    expect(ir.kind).toBe("class");
    expect(ir.nodes.length).toBeGreaterThanOrEqual(2);
    expect(ir.edges.length).toBeGreaterThanOrEqual(1);
  });

  it("parses plantuml state transitions", () => {
    const ir = parseStatePlantUml(PLANTUML_STATE_MINIMAL, "plantuml");
    expect(ir.kind).toBe("state");
    expect(ir.nodes.some((node) => node.label === "Idle")).toBe(true);
    expect(ir.edges.length).toBeGreaterThanOrEqual(1);
  });

  it("parses mermaid state transitions", () => {
    const ir = parseStateMermaid(MERMAID_STATE_MINIMAL, "mermaid");
    expect(ir.kind).toBe("state");
    expect(ir.nodes.some((node) => node.label === "Idle")).toBe(true);
    expect(ir.edges.length).toBeGreaterThanOrEqual(1);
  });

  it("parses plantuml sequence messages with implicit participants", () => {
    const ir = parseSequencePlantUml(PLANTUML_SEQUENCE_MINIMAL, "plantuml");
    expect(ir.kind).toBe("sequence");
    expect(ir.nodes.some((node) => node.label === "A")).toBe(true);
    expect(ir.nodes.some((node) => node.label === "B")).toBe(true);
    expect(ir.edges.length).toBeGreaterThanOrEqual(1);
  });

  it("parses mermaid sequence messages", () => {
    const ir = parseSequenceMermaid(MERMAID_SEQUENCE_MINIMAL, "mermaid");
    expect(ir.kind).toBe("sequence");
    expect(ir.edges.length).toBeGreaterThanOrEqual(1);
    expect(ir.edges[0]?.label).toContain("hi");
  });

  it("parses mermaid er relations without attribute blocks", () => {
    const ir = parseErMermaid(MERMAID_ER_MINIMAL, "mermaid");
    expect(ir.kind).toBe("er");
    expect(ir.nodes.map((node) => node.label).sort()).toEqual(["CUSTOMER", "ORDER"]);
    expect(ir.edges.length).toBeGreaterThanOrEqual(1);
  });
});
