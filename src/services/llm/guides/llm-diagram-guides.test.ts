import { describe, expect, it } from "vitest";
import { getWizardTypesForLanguage } from "@/constants/llm-wizard";
import {
  getLlmDiagramGuide,
  guideForPlantUmlText,
  listLlmDiagramGuideKeys,
  LLM_DIAGRAM_GUIDE_HEADING,
} from "@/services/llm/guides/llm-diagram-guides";
import {
  buildLlmSystemPrompt,
  buildWizardLlmSystemPrompt,
} from "@/services/llm/llm-prompts";

describe("llm diagram type guides", () => {
  it("has a guide for every wizard type and every diagram language", () => {
    for (const language of ["plantuml", "mermaid"] as const) {
      for (const diagramType of getWizardTypesForLanguage(language)) {
        expect(getLlmDiagramGuide(language, diagramType).length).toBeGreaterThan(80);
      }
    }

    expect(getLlmDiagramGuide("graphviz", "digraph")).toContain("digraph");
    expect(getLlmDiagramGuide("graphviz", "graph")).toContain("undirected");
    expect(getLlmDiagramGuide("graphml", "graph")).toContain("<graphml");
    expect(getLlmDiagramGuide("wiremark", "wireframe")).toContain("Wireframe");
    expect(getLlmDiagramGuide("ditaa", "diagram")).toContain("@startditaa");
    expect(getLlmDiagramGuide("other", "freeform")).toContain("other");
    expect(listLlmDiagramGuideKeys()).toEqual(
      expect.arrayContaining([
        "plantuml:sequence",
        "mermaid:flowchart",
        "graphml:graph",
        "wiremark:wireframe",
        "ditaa:diagram",
        "other:freeform",
      ]),
    );
  });

  it("picks the guide from diagram source before loose wording", () => {
    const classSource = [
      "@startuml",
      "class Order {",
      "  +book(): void",
      "}",
      "note top of Order: sequence of steps",
      "@enduml",
    ].join("\n");

    expect(guideForPlantUmlText("@startmindmap\n* Topic\n@endmindmap")).toContain(
      "@startmindmap",
    );
    expect(guideForPlantUmlText("@startditaa\n+--+\n@endditaa")).toContain("@startditaa");
    expect(guideForPlantUmlText("@startdot\ndigraph G { a -> b }\n@enddot")).toContain(
      "digraph Name",
    );
    expect(guideForPlantUmlText("@startdot\ngraph G { a -- b }\n@enddot")).toContain(
      "undirected",
    );
    expect(guideForPlantUmlText(classSource)).toContain("class Name");
    expect(guideForPlantUmlText("Create a sequence diagram for checkout")).toContain(
      "Declare every participant",
    );
    expect(guideForPlantUmlText("draw flow")).toBe("");
  });

  it("inserts the type guide into wizard and freeform system prompts", () => {
    const sequencePrompt = buildWizardLlmSystemPrompt(
      "Generate",
      "Format rules",
      "plantuml",
      "sequence",
    );
    const piePrompt = buildWizardLlmSystemPrompt(
      "Generate",
      "Format rules",
      "mermaid",
      "pie",
    );
    const aliasedGraphPrompt = buildWizardLlmSystemPrompt(
      "Generate",
      "Format rules",
      "mermaid",
      "graph",
    );
    const freeformPrompt = buildLlmSystemPrompt(
      "Generate",
      guideForPlantUmlText("Create a sequence diagram for checkout"),
    );

    expect(sequencePrompt).toContain(LLM_DIAGRAM_GUIDE_HEADING);
    expect(sequencePrompt).toContain("Declare every participant");
    expect(piePrompt).toContain("pie showData");
    expect(aliasedGraphPrompt).toContain("flowchart TD");
    expect(freeformPrompt).toContain("Declare every participant");
  });
});
