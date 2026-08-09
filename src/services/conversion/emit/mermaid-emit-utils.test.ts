import { describe, expect, it } from "vitest";
import { buildWizardDiagramSample } from "@/constants/wizard-sample-sources";
import {
  formatMermaidRequirementText,
  formatMermaidSankeyCsvField,
  parseMermaidRequirementText,
  parseMermaidSankeyCsvLine,
} from "@/services/conversion/emit/mermaid-emit-utils";

describe("formatMermaidRequirementText", () => {
  it("keeps simple ASCII text unquoted", () => {
    expect(formatMermaidRequirementText("Requirement")).toBe("Requirement");
    expect(formatMermaidRequirementText("Priorities")).toBe("Priorities");
    expect(formatMermaidRequirementText("Low")).toBe("Low");
  });

  it("quotes text with spaces or Cyrillic", () => {
    expect(formatMermaidRequirementText("Requirement 1")).toBe('"Requirement 1"');
    expect(formatMermaidRequirementText("Требование 1")).toBe('"Требование 1"');
    expect(formatMermaidRequirementText("High priority")).toBe('"High priority"');
    expect(formatMermaidRequirementText("Узел 1")).toBe('"Узел 1"');
    expect(formatMermaidRequirementText("Приоритеты")).toBe('"Приоритеты"');
  });
});

describe("parseMermaidRequirementText", () => {
  it("parses quoted and plain values", () => {
    expect(parseMermaidRequirementText('"Требование 1"')).toBe("Требование 1");
    expect(parseMermaidRequirementText('"Узел 1"')).toBe("Узел 1");
    expect(parseMermaidRequirementText("Requirement")).toBe("Requirement");
    expect(parseMermaidRequirementText("Priorities")).toBe("Priorities");
  });
});

describe("requirement wizard sample", () => {
  it("quotes Cyrillic requirement text in Russian sample", () => {
    const source = buildWizardDiagramSample("requirement", "mermaid", "ru");

    expect(source).toContain('text: "Требование 1"');
    expect(source).not.toMatch(/text: Требование 1/);
  });
});

describe("quadrant wizard sample", () => {
  it("quotes Cyrillic labels in Russian sample", () => {
    const source = buildWizardDiagramSample("quadrant", "mermaid", "ru");

    expect(source).toContain('title "Приоритеты"');
    expect(source).toContain('quadrant-1 "Высокий приоритет"');
    expect(source).toContain('"Узел 1": [0.3, 0.4]');
    expect(source).not.toMatch(/^\s*Узел 1:/m);
  });
});

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
