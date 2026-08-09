import { describe, expect, it } from "vitest";
import { buildWizardDiagramSample } from "@/constants/wizard-sample-sources";
import {
  formatMermaidSankeyCsvField,
  parseMermaidSankeyCsvLine,
} from "@/services/conversion/emit/mermaid-emit-utils";

describe("formatMermaidSankeyCsvField", () => {
  it("keeps simple ASCII labels unquoted", () => {
    expect(formatMermaidSankeyCsvField("Source")).toBe("Source");
    expect(formatMermaidSankeyCsvField("Target")).toBe("Target");
  });

  it("quotes labels with spaces or Cyrillic", () => {
    expect(formatMermaidSankeyCsvField("Node 1")).toBe('"Node 1"');
    expect(formatMermaidSankeyCsvField("Узел 1")).toBe('"Узел 1"');
  });

  it("escapes embedded double quotes CSV-style", () => {
    expect(formatMermaidSankeyCsvField('A "special" node')).toBe('"A ""special"" node"');
  });
});

describe("parseMermaidSankeyCsvLine", () => {
  it("parses quoted and plain CSV rows", () => {
    expect(parseMermaidSankeyCsvLine('"Узел 1","Узел 2",10')).toEqual({
      source: "Узел 1",
      target: "Узел 2",
      value: 10,
    });
    expect(parseMermaidSankeyCsvLine("Source,Target,5")).toEqual({
      source: "Source",
      target: "Target",
      value: 5,
    });
  });
});

describe("sankey wizard sample", () => {
  it("quotes spaced node labels in Russian sample", () => {
    const source = buildWizardDiagramSample("sankey", "mermaid", "ru");

    expect(source).toContain('"Узел 1","Узел 2",10');
    expect(source).not.toMatch(/Узел 1,Узел 2/);
  });
});
