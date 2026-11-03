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
    expect(rules).toContain("Minimum floor: 4 main branches");
    expect(rules).toContain(
      "Minimum floor: 2 sub-branches under EACH main branch (level 2+)",
    );
    expect(rules).toContain("Guardrails:");
  });

  it("adds exhaustive and hierarchy rules for full geographic mindmaps", () => {
    const rules = getWizardDiagramFormatRules("plantuml", "mindmap", {
      nodes: 8,
      steps: 6,
    }, {
      description:
        "Mind map по всем городам Подмосковья с разделением по направлениям и районам",
    });

    expect(rules).toContain("Exhaustive coverage (critical");
    expect(rules).toContain("every direction/region branch");
    expect(rules).toContain("Hierarchy depth (critical)");
    expect(rules).toContain("**** = district");
  });

  it("includes mermaid sequence format and participant minimums", () => {
    const rules = buildDiagramFormatRules("mermaid", "sequence", {
      participants: 5,
    });

    expect(rules).toContain("sequenceDiagram");
    expect(rules).toContain("Minimum floor: 5 distinct participants");
    expect(rules).not.toContain("@startuml");
  });

  it("covers plantuml activity with lanes and steps", () => {
    const rules = getWizardDiagramFormatRules("plantuml", "activity", {
      lanes: 3,
      steps: 6,
    });

    expect(rules).toContain("swimlanes");
    expect(rules).toContain("Minimum floor: 3 swimlanes");
    expect(rules).toContain("Minimum floor: 6 activity steps");
  });

  it("covers plantuml types without dedicated switch default", () => {
    const rules = getWizardDiagramFormatRules("plantuml", "sequence", {
      participants: 3,
    });

    expect(rules).toContain("sequence diagram");
    expect(rules).toContain("Minimum floor: 3 distinct participants");
  });
});
