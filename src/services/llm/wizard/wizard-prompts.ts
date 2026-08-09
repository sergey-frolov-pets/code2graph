import type {
  WizardDiagramType,
  WizardLanguage,
  WizardState,
} from "@/constants/llm-wizard";
import {
  getSelectedStructuralElements,
  wizardTypeSupportsDirection,
  WIZARD_TYPE_PARAM_FIELDS,
} from "@/constants/llm-wizard";

export function getWizardDiagramFormatRules(
  language: WizardLanguage,
  diagramType: WizardDiagramType,
): string {
  if (language === "mermaid") {
    switch (diagramType) {
      case "mindmap":
        return [
          "Format: Mermaid mindmap.",
          "Start with the `mindmap` keyword.",
          "Use root((Central topic)) for the root node and indent child branches.",
          "Do not use flowchart or graph syntax.",
        ].join(" ");
      case "gantt":
        return "Format: Mermaid gantt with title, dateFormat, section blocks, and task definitions.";
      case "sequence":
        return "Format: Mermaid sequenceDiagram with participants and messages.";
      case "class":
        return "Format: Mermaid classDiagram with classes and relationships.";
      case "state":
        return "Format: Mermaid stateDiagram-v2 with states and transitions.";
      case "er":
        return "Format: Mermaid erDiagram with entities and relationships.";
      case "activity":
      case "component":
        return "Format: Mermaid flowchart with nodes and directed edges.";
      default:
        return "Format: valid Mermaid diagram for the requested type.";
    }
  }

  switch (diagramType) {
    case "mindmap":
      return [
        "Format: PlantUML mindmap.",
        "Use @startmindmap and @endmindmap — do NOT use @startuml/@enduml.",
        "Root topic with *, branches with **, sub-branches with ***.",
        "Optional layout: top to bottom direction or left to right direction.",
      ].join(" ");
    case "gantt":
      return [
        "Format: PlantUML Gantt chart.",
        "Use @startgantt and @endgantt — do NOT use @startuml/@enduml.",
        "Define tasks with [Task name] lasts N days.",
      ].join(" ");
    case "c4_context":
      return [
        "Format: PlantUML C4 Context diagram with @startuml/@enduml.",
        "Use !include ./plantuml-lib/C4/C4_Context.puml and C4 Person/System/System_Ext elements.",
      ].join(" ");
    case "c4_container":
      return [
        "Format: PlantUML C4 Container diagram with @startuml/@enduml.",
        "Use !include ./plantuml-lib/C4/C4_Container.puml and C4 Container elements.",
      ].join(" ");
    default:
      return "Format: PlantUML diagram with @startuml and @enduml.";
  }
}

function formatTypeParamsForPrompt(state: WizardState): string[] {
  const fields = WIZARD_TYPE_PARAM_FIELDS[state.diagramType];
  return fields.map((field) => {
    const value = state.typeParams[field.id];
    return `- ${field.id}: ${value}`;
  });
}

export function buildWizardPrompt(state: WizardState): string {
  const typeLabel = state.diagramType.replace(/_/g, " ");
  const paramLines = formatTypeParamsForPrompt(state);
  const formatLabel =
    state.language === "mermaid"
      ? "Mermaid"
      : state.language === "graphml"
        ? "GraphML"
        : "PlantUML";

  const lines = [
    `Create a new ${formatLabel} ${typeLabel} diagram.`,
    `Output language/format: ${state.language}.`,
    getWizardDiagramFormatRules(state.language, state.diagramType),
    `Diagram theme preference: ${state.theme}.`,
  ];

  if (state.language === "plantuml" && state.diagramType === "activity") {
    lines.push(
      "Layout: activity diagrams use the default top-to-bottom flow. Do not use top to bottom direction or left to right direction directives.",
    );
  } else if (wizardTypeSupportsDirection(state.diagramType, state.language)) {
    lines.push(`Layout direction: ${state.direction}.`);
  }

  if (paramLines.length > 0) {
    lines.push("", "Structural parameters:", ...paramLines);
  }

  const structuralElements = getSelectedStructuralElements(state);
  if (structuralElements.length > 0) {
    lines.push(
      "",
      "Include these diagram constructs:",
      ...structuralElements.map((elementId) => `- ${elementId}`),
    );
  }

  lines.push(
    "",
    "Description:",
    state.contextText.trim() || "(not specified)",
  );

  if (state.typeSpecificText.trim()) {
    lines.push("", "Additional requirements:", state.typeSpecificText.trim());
  }

  if (state.diagramType.startsWith("c4_") && state.language === "plantuml") {
    lines.push(
      "",
      "Use bundled C4 library includes from ./plantuml-lib/C4/ where appropriate.",
    );
  }

  lines.push(
    "",
    state.language === "mermaid"
      ? "Return the complete Mermaid source in JSON field plantuml (same field name as PlantUML responses)."
      : "Return the complete PlantUML source in JSON field plantuml.",
  );

  return lines.join("\n");
}
