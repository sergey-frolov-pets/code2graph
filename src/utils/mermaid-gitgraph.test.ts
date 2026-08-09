import { describe, expect, it } from "vitest";
import { buildManualScaffold, createDefaultStructuralElements, createDefaultTypeParams, type WizardState } from "@/constants/llm-wizard";
import {
  formatMermaidGitRef,
  parseMermaidGitRefToken,
} from "@/utils/mermaid-gitgraph";

describe("formatMermaidGitRef", () => {
  it("keeps ASCII branch names unquoted", () => {
    expect(formatMermaidGitRef("develop")).toBe("develop");
    expect(formatMermaidGitRef("feature_1")).toBe("feature_1");
  });

  it("quotes Cyrillic and special branch names", () => {
    expect(formatMermaidGitRef("разработка")).toBe('"разработка"');
    expect(formatMermaidGitRef("feature/x")).toBe('"feature/x"');
  });
});

describe("parseMermaidGitRefToken", () => {
  it("parses quoted and plain tokens", () => {
    expect(parseMermaidGitRefToken("develop")).toBe("develop");
    expect(parseMermaidGitRefToken('"разработка"')).toBe("разработка");
  });
});

describe("buildMermaidGitgraph", () => {
  it("quotes Cyrillic branch names in Russian scaffold", () => {
    const state: WizardState = {
      creationMode: "manual",
      language: "mermaid",
      diagramType: "gitgraph",
      theme: "default",
      direction: "TB",
      typeParams: createDefaultTypeParams(),
      structuralElements: createDefaultStructuralElements(),
      contextText: "",
      typeSpecificText: "",
      promptText: "",
    };

    const source = buildManualScaffold(state, "ru");

    expect(source).toContain('branch "разработка"');
    expect(source).toContain('merge "разработка"');
    expect(source).not.toMatch(/branch разработка/);
    expect(source).not.toMatch(/merge разработка/);
  });
});
