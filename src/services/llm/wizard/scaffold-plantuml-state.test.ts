import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIZARD_STATE,
  buildManualScaffold,
  createDefaultStructuralElements,
  createDefaultTypeParams,
} from "@/constants/llm-wizard";

describe("PlantUML state diagram scaffold", () => {
  it("quotes Russian state names with spaces in transitions", () => {
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

    expect(source).toContain("[*] --> \"Состояние 1\"");
    expect(source).toContain("\"Состояние 1\" --> \"Состояние 2\"");
    expect(source).toContain("\"Состояние 4\" --> [*]");
    expect(source).not.toMatch(/\[\*\] --> Состояние/);
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
    expect(source).toContain("\"State 1\" --> wizard_choice");
    expect(source).toContain("wizard_choice --> \"State 2\"");
    expect(source).toContain("state wizard_fork <<fork>>");
    expect(source).toContain("\"State 1\" --> wizard_fork");
    expect(source).toContain("wizard_fork --> \"State 2\"");
    expect(source).toContain("note right of \"State 1\": Note");
    expect(source).not.toMatch(/ --> choice\n/);
    expect(source).not.toMatch(/^choice --> /m);
  });
});
