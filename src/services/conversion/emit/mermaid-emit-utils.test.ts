import { describe, expect, it } from "vitest";
import { buildWizardDiagramSample } from "@/constants/wizard-sample-sources";
import {
  formatMermaidRequirementText,
  parseMermaidRequirementText,
} from "@/services/conversion/emit/mermaid-emit-utils";

describe("formatMermaidRequirementText", () => {
  it("keeps simple ASCII text unquoted", () => {
    expect(formatMermaidRequirementText("Requirement")).toBe("Requirement");
  });

  it("quotes text with spaces or Cyrillic", () => {
    expect(formatMermaidRequirementText("Requirement 1")).toBe('"Requirement 1"');
    expect(formatMermaidRequirementText("Требование 1")).toBe('"Требование 1"');
  });
});

describe("parseMermaidRequirementText", () => {
  it("parses quoted and plain values", () => {
    expect(parseMermaidRequirementText('"Требование 1"')).toBe("Требование 1");
    expect(parseMermaidRequirementText("Requirement")).toBe("Requirement");
  });
});

describe("requirement wizard sample", () => {
  it("quotes Cyrillic requirement text in Russian sample", () => {
    const source = buildWizardDiagramSample("requirement", "mermaid", "ru");

    expect(source).toContain('text: "Требование 1"');
    expect(source).not.toMatch(/text: Требование 1/);
  });
});
