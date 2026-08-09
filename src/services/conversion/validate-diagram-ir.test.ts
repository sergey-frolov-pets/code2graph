import { describe, expect, it } from "vitest";
import { validateDiagramIr } from "@/services/conversion/validate-diagram-ir";
import { createEmptyDiagramIR } from "@/services/conversion/diagram-ir";

describe("validateDiagramIr", () => {
  it("accepts valid graph ir", () => {
    const ir = createEmptyDiagramIR("graph");
    ir.nodes = [
      { id: "a", label: "A", matchConfidence: 1 },
      { id: "b", label: "B", matchConfidence: 1 },
    ];
    ir.edges = [{ id: "e1", source: "a", target: "b", matchConfidence: 1 }];

    expect(validateDiagramIr(ir).valid).toBe(true);
  });

  it("rejects dangling edges", () => {
    const ir = createEmptyDiagramIR("graph");
    ir.nodes = [{ id: "a", label: "A", matchConfidence: 1 }];
    ir.edges = [{ id: "e1", source: "a", target: "missing", matchConfidence: 1 }];

    const result = validateDiagramIr(ir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("conversion.error.danglingEdge");
  });
});
