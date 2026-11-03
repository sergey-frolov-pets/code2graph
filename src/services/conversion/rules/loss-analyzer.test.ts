import { describe, expect, it } from "vitest";
import { analyzeConversionLosses } from "@/services/conversion/rules/loss-analyzer";

describe("loss-analyzer", () => {
  it("adds truncation losses when limits exceeded", () => {
    const report = analyzeConversionLosses({
      kind: "graph",
      sourceFormat: "plantuml",
      targetFormat: "mermaid",
      mode: "source",
      truncatedNodes: 3,
      truncatedEdges: 2,
    });

    expect(report.lossIds).toContain("loss.truncatedNodes");
    expect(report.lossIds).toContain("loss.truncatedEdges");
  });

  it("marks blocked when parse error is present", () => {
    const report = analyzeConversionLosses({
      kind: "graph",
      sourceFormat: "graphml",
      targetFormat: "plantuml",
      mode: "source",
      parseError: "conversion.error.parseFailed",
    });

    expect(report.blocked).toBe(true);
    expect(report.warnings).toContain("conversion.error.parseFailed");
  });
});
