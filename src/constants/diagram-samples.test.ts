import { describe, expect, it } from "vitest";
import { getWizardTypesForLanguage } from "@/constants/llm-wizard";
import {
  MERMAID_SAMPLE_IDS,
  MERMAID_SAMPLE_WIZARD_TYPES,
  getMermaidSampleSource,
} from "@/constants/mermaid-sample-diagrams";
import {
  PLANTUML_SAMPLE_IDS,
  PLANTUML_SAMPLE_WIZARD_TYPES,
  getPlantUmlSampleSource,
} from "@/constants/plantuml-sample-diagrams";

describe("diagram samples coverage", () => {
  it("covers every PlantUML wizard diagram type", () => {
    const coveredTypes = new Set(
      PLANTUML_SAMPLE_IDS.map((id) => PLANTUML_SAMPLE_WIZARD_TYPES[id]),
    );

    for (const diagramType of getWizardTypesForLanguage("plantuml")) {
      expect(coveredTypes.has(diagramType)).toBe(true);
    }
  });

  it("covers every Mermaid wizard diagram type", () => {
    const coveredTypes = new Set(
      MERMAID_SAMPLE_IDS.map((id) => MERMAID_SAMPLE_WIZARD_TYPES[id]),
    );

    for (const diagramType of getWizardTypesForLanguage("mermaid")) {
      expect(coveredTypes.has(diagramType)).toBe(true);
    }
  });

  it("returns non-empty sources for all samples", () => {
    for (const id of PLANTUML_SAMPLE_IDS) {
      expect(getPlantUmlSampleSource(id, "ru").trim().length).toBeGreaterThan(0);
      expect(getPlantUmlSampleSource(id, "en").trim().length).toBeGreaterThan(0);
    }

    for (const id of MERMAID_SAMPLE_IDS) {
      expect(getMermaidSampleSource(id, "ru").trim().length).toBeGreaterThan(0);
      expect(getMermaidSampleSource(id, "en").trim().length).toBeGreaterThan(0);
    }
  });
});
