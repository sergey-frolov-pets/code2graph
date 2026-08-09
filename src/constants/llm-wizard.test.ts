import { describe, expect, it } from "vitest";
import {
  buildManualScaffold,
  buildWizardPrompt,
  createDefaultStructuralElements,
  createDefaultTypeParams,
  DEFAULT_WIZARD_STATE,
  getWizardLanguagesForMode,
  getWizardDiagramFormatRules,
  getWizardSteps,
  getWizardStructuralElementsForType,
  getWizardTypesForLanguage,
  resolveWizardStateWithDefaults,
  WIZARD_DIAGRAM_TYPES,
  type WizardState,
} from "@/constants/llm-wizard";
import { enMessages } from "@/locales/en";
import { ruMessages } from "@/locales/ru";

function createState(overrides: Partial<WizardState> = {}): WizardState {
  return {
    creationMode: "manual",
    language: "plantuml",
    diagramType: "activity",
    theme: "default",
    direction: "TB",
    typeParams: createDefaultTypeParams(),
    structuralElements: createDefaultStructuralElements(),
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
    expect(source).not.toContain("top to bottom direction");
  });

  it("skips direction step for plantuml activity diagrams", () => {
    const steps = getWizardSteps(
      createState({
        diagramType: "activity",
        language: "plantuml",
      }),
    );

    expect(steps).not.toContain("direction");
  });

  it("keeps direction step for mermaid activity diagrams", () => {
    const steps = getWizardSteps(
      createState({
        diagramType: "activity",
        language: "mermaid",
      }),
    );

    expect(steps).toContain("direction");
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
    expect(prompt).toContain("Description:");
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

  it("adds context and result steps only for AI mode (no prompt step)", () => {
    const manualSteps = getWizardSteps(createState({ creationMode: "manual" }));
    const aiSteps = getWizardSteps(createState({ creationMode: "ai" }));

    expect(manualSteps).not.toContain("context");
    expect(manualSteps).not.toContain("prompt");
    expect(aiSteps).toEqual(["mode", "language", "type", "context", "result"]);
    expect(aiSteps).not.toContain("prompt");
    expect(aiSteps).not.toContain("params");
    expect(aiSteps).not.toContain("style");
  });

  it("defaults to manual creation mode", () => {
    expect(DEFAULT_WIZARD_STATE.creationMode).toBe("manual");
  });

  it("adds structural elements to manual scaffold when selected", () => {
    const elements = createDefaultStructuralElements();
    elements.alt = true;
    elements.note = true;

    const source = buildManualScaffold(
      createState({
        diagramType: "sequence",
        structuralElements: elements,
      }),
      "en",
    );

    expect(source).toContain("alt success");
    expect(source).toContain("note right of Participant_1");
  });

  it("exposes structural elements per diagram type and language", () => {
    expect(getWizardStructuralElementsForType("activity", "plantuml")).toContain("switch");
    expect(getWizardStructuralElementsForType("activity", "mermaid")).not.toContain("switch");
    expect(getWizardStructuralElementsForType("graph", "graphml")).toEqual(["cluster"]);
  });

  it("builds mermaid component scaffold with component nodes", () => {
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
    expect(source).toContain("C1[[Component 1]]");
    expect(source).toContain("C3[[Component 3]]");
    expect(source).toContain("C1 --> C2");
    expect(source).not.toContain("([Start])");
    expect(source).not.toContain("Шаг");
  });

  it("builds mermaid activity scaffold with steps instead of generic nodes", () => {
    const source = buildManualScaffold(
      createState({
        language: "mermaid",
        diagramType: "activity",
        typeParams: {
          ...createDefaultTypeParams(),
          steps: 3,
        },
      }),
      "ru",
    );

    expect(source).toContain("start([Старт])");
    expect(source).toContain("S1[Шаг 1]");
    expect(source).toContain("S3[Шаг 3]");
    expect(source).not.toContain("[[Компонент");
  });

  it("builds plantuml component scaffold with component title", () => {
    const source = buildManualScaffold(
      createState({
        diagramType: "component",
        typeParams: {
          ...createDefaultTypeParams(),
          components: 2,
        },
      }),
      "ru",
    );

    expect(source).toContain("title Диаграмма компонентов");
    expect(source).toContain("[Компонент 1]");
    expect(source).not.toContain("Диаграмма активности");
    expect(source).not.toContain("|#E3F2FD|");
  });

  it("uses defaults for wizard steps not yet visited", () => {
    const resolved = resolveWizardStateWithDefaults(
      createState({
        creationMode: "manual",
        language: "mermaid",
        diagramType: "component",
        direction: "LR",
        theme: "dark",
      }),
      ["mode", "language", "type"],
    );

    expect(resolved.creationMode).toBe("manual");
    expect(resolved.language).toBe("mermaid");
    expect(resolved.diagramType).toBe("component");
    expect(resolved.direction).toBe(DEFAULT_WIZARD_STATE.direction);
    expect(resolved.theme).toBe(DEFAULT_WIZARD_STATE.theme);
    expect(resolved.typeParams.components).toBe(
      createDefaultTypeParams().components,
    );
  });

  it("builds plantuml gantt scaffold", () => {
    const source = buildManualScaffold(
      createState({
        diagramType: "gantt",
        typeParams: {
          ...createDefaultTypeParams(),
          tasks: 3,
        },
      }),
      "en",
    );

    expect(source).toContain("@startgantt");
    expect(source).toContain("[Task 1]");
    expect(source).toContain("[Task 3]");
    expect(source).toContain("@endgantt");
  });

  it("builds mermaid er scaffold", () => {
    const source = buildManualScaffold(
      createState({
        language: "mermaid",
        diagramType: "er",
        typeParams: {
          ...createDefaultTypeParams(),
          entities: 3,
        },
      }),
      "en",
    );

    expect(source).toContain("erDiagram");
    expect(source).toContain("Entity_1");
    expect(source).toContain("Entity_2");
  });

  it("builds graphml scaffold with nodes and edges", () => {
    const source = buildManualScaffold(
      createState({
        language: "graphml",
        diagramType: "graph",
        typeParams: {
          ...createDefaultTypeParams(),
          nodes: 3,
          edges: 2,
        },
      }),
      "en",
    );

    expect(source).toContain("<graphml");
    expect(source).toContain("<node id=\"n1\">");
    expect(source).toContain("<node id=\"n3\">");
    expect(source).toContain("<edge source=\"n1\" target=\"n2\"/>");
    expect(source).toContain("<edge source=\"n2\" target=\"n3\"/>");
  });

  it("embeds rankdir when direction is LR", () => {
    const source = buildManualScaffold(
      createState({
        language: "graphml",
        diagramType: "graph",
        direction: "LR",
        typeParams: {
          ...createDefaultTypeParams(),
          nodes: 2,
          edges: 1,
        },
      }),
      "en",
    );

    expect(source).toContain('rankdir="LR"');
  });

  it("exposes graphml only for manual mode", () => {
    expect(getWizardLanguagesForMode("manual")).toContain("graphml");
    expect(getWizardLanguagesForMode("ai")).not.toContain("graphml");
  });

  it("lists gantt for plantuml and mermaid", () => {
    expect(getWizardTypesForLanguage("plantuml")).toContain("gantt");
    expect(getWizardTypesForLanguage("mermaid")).toContain("gantt");
    expect(getWizardTypesForLanguage("graphml")).toEqual(["graph"]);
  });

  it("lists mindmap for plantuml and mermaid", () => {
    expect(getWizardTypesForLanguage("plantuml")).toContain("mindmap");
    expect(getWizardTypesForLanguage("mermaid")).toContain("mindmap");
  });

  it("builds plantuml mindmap scaffold with branches and sub-branches", () => {
    const source = buildManualScaffold(
      createState({
        diagramType: "mindmap",
        direction: "TB",
        typeParams: {
          ...createDefaultTypeParams(),
          nodes: 2,
          steps: 2,
        },
      }),
      "en",
    );

    expect(source).toContain("@startmindmap");
    expect(source).toContain("top to bottom direction");
    expect(source).toContain("* Root topic");
    expect(source).toContain("** Branch 1");
    expect(source).toContain("*** Sub-branch 2");
    expect(source).toContain("@endmindmap");
  });

  it("builds mermaid mindmap scaffold", () => {
    const source = buildManualScaffold(
      createState({
        language: "mermaid",
        diagramType: "mindmap",
        typeParams: {
          ...createDefaultTypeParams(),
          nodes: 2,
          steps: 1,
        },
      }),
      "ru",
    );

    expect(source).toContain("mindmap");
    expect(source).toContain("root((Корневая тема))");
    expect(source).toContain("Ветка 1");
    expect(source).toContain("Подветка 1");
  });

  it("includes direction step for plantuml mindmap diagrams", () => {
    const steps = getWizardSteps(
      createState({
        diagramType: "mindmap",
        language: "plantuml",
      }),
    );

    expect(steps).toContain("direction");
  });

  it("mentions Mermaid in AI wizard prompt", () => {
    const prompt = buildWizardPrompt(
      createState({
        creationMode: "ai",
        language: "mermaid",
        diagramType: "sequence",
        contextText: "Chat app",
      }),
    );

    expect(prompt).toContain("Mermaid");
    expect(prompt).toContain("Chat app");
  });

  it("includes mindmap format rules in PlantUML AI wizard prompt", () => {
    const prompt = buildWizardPrompt(
      createState({
        creationMode: "ai",
        language: "plantuml",
        diagramType: "mindmap",
        contextText: "Project planning topics",
      }),
    );

    expect(prompt).toContain("@startmindmap");
    expect(prompt).toContain("@endmindmap");
    expect(prompt).toContain("do NOT use @startuml/@enduml");
    expect(prompt).toContain("Project planning topics");
  });

  it("includes mindmap format rules for mermaid wizard prompt", () => {
    const rules = getWizardDiagramFormatRules("mermaid", "mindmap");

    expect(rules).toContain("mindmap");
    expect(rules).not.toContain("@startuml");
  });

  it("lists new mermaid diagram types in wizard", () => {
    const types = getWizardTypesForLanguage("mermaid");
    expect(types).toContain("flowchart");
    expect(types).toContain("pie");
    expect(types).toContain("journey");
    expect(types).toContain("gitgraph");
    expect(types).toContain("c4_context");
    expect(types).toContain("requirement");
    expect(types).toContain("architecture");
    expect(types).toContain("packet");
  });

  it("lists new plantuml diagram types in wizard", () => {
    const types = getWizardTypesForLanguage("plantuml");
    expect(types).toContain("er");
    expect(types).toContain("usecase");
    expect(types).toContain("deployment");
    expect(types).toContain("wbs");
    expect(types).toContain("nwdiag");
    expect(types).toContain("archimate");
  });

  it("builds mermaid pie scaffold", () => {
    const source = buildManualScaffold(
      createState({
        language: "mermaid",
        diagramType: "pie",
        typeParams: {
          ...createDefaultTypeParams(),
          nodes: 3,
        },
      }),
      "en",
    );

    expect(source).toContain("pie showData");
    expect(source).toContain('"Slice 1"');
  });

  it("builds plantuml usecase scaffold", () => {
    const source = buildManualScaffold(
      createState({
        diagramType: "usecase",
        typeParams: {
          ...createDefaultTypeParams(),
          actors: 2,
          components: 3,
        },
      }),
      "en",
    );

    expect(source).toContain("@startuml");
    expect(source).toContain('usecase "Use case 1"');
    expect(source).toContain("Actor_1 --> UC1");
  });

  it("builds plantuml wbs scaffold", () => {
    const source = buildManualScaffold(
      createState({
        diagramType: "wbs",
        typeParams: {
          ...createDefaultTypeParams(),
          nodes: 2,
          steps: 2,
        },
      }),
      "en",
    );

    expect(source).toContain("@startwbs");
    expect(source).toContain("* Project");
    expect(source).toContain("** Branch 1");
    expect(source).toContain("@endwbs");
  });

  it("builds plantuml timing scaffold with note top of at time marker", () => {
    const source = buildManualScaffold(
      createState({
        diagramType: "timing",
        typeParams: {
          ...createDefaultTypeParams(),
          participants: 2,
          steps: 2,
        },
        structuralElements: {
          ...createDefaultStructuralElements(),
          note: true,
        },
      }),
      "ru",
    );

    expect(source).toContain('concise "Сигнал 1" as S1');
    expect(source).toContain("@0");
    expect(source).toContain("note top of S1: Примечание");
    expect(source).not.toContain("note over");
  });
});

describe("wizard diagram type i18n", () => {
  it.each(["ru", "en"] as const)("covers all diagram types in %s locale", (locale) => {
    const messages = locale === "ru" ? ruMessages : enMessages;

    for (const type of WIZARD_DIAGRAM_TYPES) {
      expect(messages[`llm.wizard.type.${type}`]).toBeTruthy();
      expect(messages[`llm.wizard.typeDesc.${type}`]).toBeTruthy();
      expect(messages[`llm.wizard.detailsPlaceholder.${type}`]).toBeTruthy();
    }
  });
});
