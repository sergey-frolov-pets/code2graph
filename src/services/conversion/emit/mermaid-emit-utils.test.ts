import { describe, expect, it } from "vitest";
import { buildWizardDiagramSample } from "@/constants/wizard-sample-sources";
import {
  formatMermaidLabelToken,
  parseMermaidLabelToken,
} from "@/services/conversion/emit/mermaid-emit-utils";

describe("formatMermaidLabelToken", () => {
  it("keeps simple ASCII text unquoted", () => {
    expect(formatMermaidLabelToken("Priorities")).toBe("Priorities");
    expect(formatMermaidLabelToken("Low")).toBe("Low");
  });

  it("quotes text with spaces or Cyrillic", () => {
    expect(formatMermaidLabelToken("High priority")).toBe('"High priority"');
    expect(formatMermaidLabelToken("Узел 1")).toBe('"Узел 1"');
    expect(formatMermaidLabelToken("Приоритеты")).toBe('"Приоритеты"');
  });
});

describe("parseMermaidLabelToken", () => {
  it("parses quoted and plain values", () => {
    expect(parseMermaidLabelToken('"Узел 1"')).toBe("Узел 1");
    expect(parseMermaidLabelToken("Priorities")).toBe("Priorities");
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
