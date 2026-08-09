import { describe, expect, it } from "vitest";
import {
  buildDiagramFormatRules,
  getWizardDiagramFormatRules,
} from "@/services/llm/diagram-format-rules";

describe("diagram-format-rules", () => {
  it("includes completeness and guardrails for plantuml mindmap", () => {
    const rules = getWizardDiagramFormatRules("plantuml", "mindmap", {
      nodes: 4,
      steps: 2,
    });

    expect(rules).toContain("@startmindmap");
    expect(rules).toContain("@endmindmap");
    expect(rules).toContain("Completeness (critical)");
    expect(rules).toContain("Include at least 4 main branches");
    expect(rules).toContain("Include at least 2 sub-branches under EACH main branch");
    expect(rules).toContain("Guardrails:");
  });

  it("includes mermaid sequence format and participant minimums", () => {
    const rules = buildDiagramFormatRules("mermaid", "sequence", {
      participants: 5,
    });

    expect(rules).toContain("sequenceDiagram");
    expect(rules).toContain("Include at least 5 distinct participants");
    expect(rules).not.toContain("@startuml");
  });

  it("covers plantuml activity with lanes and steps", () => {
    const rules = getWizardDiagramFormatRules("plantuml", "activity", {
      lanes: 3,
      steps: 6,
    });

    expect(rules).toContain("swimlanes");
    expect(rules).toContain("Include at least 3 swimlanes");
    expect(rules).toContain("Include at least 6 activity steps");
  });

  it("covers plantuml types without dedicated switch default", () => {
    const rules = getWizardDiagramFormatRules("plantuml", "sequence", {
      participants: 3,
    });

    expect(rules).toContain("sequence diagram");
    expect(rules).toContain("Include at least 3 distinct participants");
  });
});
