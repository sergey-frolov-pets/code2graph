import { describe, expect, it } from "vitest";
import {
  buildManualScaffold,
  buildWizardPrompt,
  createDefaultTypeParams,
  getWizardSteps,
  type WizardState,
} from "@/constants/llm-wizard";

function createState(overrides: Partial<WizardState> = {}): WizardState {
  return {
    creationMode: "manual",
    language: "plantuml",
    diagramType: "activity",
    theme: "default",
    direction: "TB",
    typeParams: createDefaultTypeParams(),
    contextText: "",
    typeSpecificText: "",
    promptText: "",
    ...overrides,
  };
}

describe("llm-wizard", () => {
  it("builds manual activity scaffold with swimlanes and steps", () => {
    const source = buildManualScaffold(
      createState({
        typeParams: {
          ...createDefaultTypeParams(),
          lanes: 2,
          steps: 3,
        },
      }),
      "ru",
    );

    expect(source).toContain("|#E3F2FD|Дорожка 1|");
    expect(source).toContain("|#E8F5E9|Дорожка 2|");
    expect(source).toContain(":Шаг 1;");
    expect(source).toContain(":Шаг 3;");
    expect(source).toContain("top to bottom direction");
  });

  it("includes structural parameters in AI prompt", () => {
    const prompt = buildWizardPrompt(
      createState({
        creationMode: "ai",
        diagramType: "sequence",
        contextText: "Order API",
        typeParams: {
          ...createDefaultTypeParams(),
          participants: 4,
        },
      }),
    );

    expect(prompt).toContain("participants: 4");
    expect(prompt).toContain("Order API");
    expect(prompt).toContain("PlantUML sequence");
  });

  it("skips direction step for sequence diagrams", () => {
    const steps = getWizardSteps(
      createState({
        diagramType: "sequence",
        language: "plantuml",
      }),
    );

    expect(steps).not.toContain("direction");
    expect(steps[0]).toBe("mode");
    expect(steps).toContain("params");
  });

  it("adds context and prompt steps only for AI mode", () => {
    const manualSteps = getWizardSteps(createState({ creationMode: "manual" }));
    const aiSteps = getWizardSteps(createState({ creationMode: "ai" }));

    expect(manualSteps).not.toContain("context");
    expect(manualSteps).not.toContain("prompt");
    expect(aiSteps).toContain("context");
    expect(aiSteps).toContain("prompt");
  });

  it("builds mermaid flowchart scaffold with LR direction", () => {
    const source = buildManualScaffold(
      createState({
        language: "mermaid",
        diagramType: "component",
        direction: "LR",
        typeParams: {
          ...createDefaultTypeParams(),
          components: 3,
        },
      }),
      "en",
    );

    expect(source.startsWith("flowchart LR")).toBe(true);
    expect(source).toContain("Node 1");
    expect(source).toContain("N3");
  });
});
