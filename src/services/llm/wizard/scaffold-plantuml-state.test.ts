import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIZARD_STATE,
  buildManualScaffold,
  createDefaultStructuralElements,
  createDefaultTypeParams,
} from "@/constants/llm-wizard";

describe("PlantUML state diagram scaffold", () => {
  it("declares states with aliases instead of quoted transition labels", () => {
    const state = {
      ...DEFAULT_WIZARD_STATE,
      diagramType: "state" as const,
      language: "plantuml" as const,
      typeParams: {
        ...createDefaultTypeParams(),
        states: 4,
      },
      structuralElements: createDefaultStructuralElements(),
    };

    const source = buildManualScaffold(state, "ru");

    expect(source).toContain('state "Состояние 1" as wizard_state_1');
    expect(source).toContain("[*] --> wizard_state_1");
    expect(source).toContain("wizard_state_1 --> wizard_state_2");
    expect(source).toContain("wizard_state_4 --> [*]");
    expect(source).not.toMatch(/\[\*\] --> "/);
    expect(source).not.toMatch(/ --> "Состояние/);
  });

  it("uses stereotypes for choice and fork structural elements", () => {
    const structuralElements = createDefaultStructuralElements();
    structuralElements.choice = true;
    structuralElements.fork = true;
    structuralElements.note = true;

    const state = {
      ...DEFAULT_WIZARD_STATE,
      diagramType: "state" as const,
      language: "plantuml" as const,
      typeParams: {
        ...createDefaultTypeParams(),
        states: 4,
      },
      structuralElements,
    };

    const source = buildManualScaffold(state, "en");

    expect(source).toContain("state wizard_choice <<choice>>");
    expect(source).toContain("wizard_state_1 --> wizard_choice");
    expect(source).toContain("wizard_choice --> wizard_state_2");
    expect(source).toContain("state wizard_fork <<fork>>");
    expect(source).toContain("wizard_state_1 --> wizard_fork");
    expect(source).toContain("wizard_fork --> wizard_state_2");
    expect(source).toContain("note right of wizard_state_1: Note");
    expect(source).not.toMatch(/ --> choice\n/);
    expect(source).not.toMatch(/^choice --> /m);
  });
});
