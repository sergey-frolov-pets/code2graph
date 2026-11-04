import { diagramFormatLabel } from "@shared/agent-diagram";
import type { AppLocale } from "@/constants/i18n";
import {
  getSelectedStructuralElements,
  wizardTypeSupportsDirection,
  WIZARD_TYPE_PARAM_FIELDS,
  type WizardState,
} from "@/constants/llm-wizard";
import { getWizardTypePromptHint } from "@/constants/wizard-prompt-hints";
import {
  buildDiagramFormatRules,
  getWizardDiagramFormatRules,
  LLM_GENERATE_ROLE_PROMPT,
  LLM_WIZARD_ROLE_PROMPT,
  type DiagramFormatPromptContext,
  type DiagramFormatTypeParams,
} from "@/services/llm/diagram-format-rules";

export {
  buildDiagramFormatRules,
  getWizardDiagramFormatRules,
  LLM_GENERATE_ROLE_PROMPT,
  LLM_WIZARD_ROLE_PROMPT,
  type DiagramFormatPromptContext,
  type DiagramFormatTypeParams,
};

function formatTypeParamsForPrompt(state: WizardState): string[] {
  const fields = WIZARD_TYPE_PARAM_FIELDS[state.diagramType];
  return fields.map((field) => {
    const value = state.typeParams[field.id];
    return `- ${field.id}: ${value}`;
  });
}

export function buildWizardPrompt(state: WizardState, locale: AppLocale = "en"): string {
  const typeLabel = state.diagramType.replace(/_/g, " ");
  const paramLines = formatTypeParamsForPrompt(state);
  const typePromptHint = getWizardTypePromptHint(state.diagramType, locale);
  const formatLabel = diagramFormatLabel(state.language);

  const lines = [
    `Create a new ${formatLabel} ${typeLabel} diagram.`,
    `Output language/format: ${state.language}.`,
    getWizardDiagramFormatRules(
      state.language,
      state.diagramType,
      state.typeParams,
      {
        description: state.contextText,
        additionalRequirements: state.typeSpecificText,
      },
    ),
    `Diagram theme preference: ${state.theme}.`,
  ];

  if (
    state.language === "plantuml" &&
    state.diagramType === "activity"
  ) {
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

  if (typePromptHint.trim()) {
    lines.push("", "Type structure guide:", typePromptHint.trim());
  }

  if (state.typeSpecificText.trim()) {
    lines.push("", "Additional requirements:", state.typeSpecificText.trim());
  }

  if (state.diagramType.startsWith("c4_") && state.language === "plantuml") {
    lines.push(
      "",
      "Use bundled C4 library includes from ./plantuml-lib/C4/ where appropriate.",
    );
  }

  const sourceName =
    state.language === "plantuml" ? "PlantUML" : formatLabel;
  lines.push(
    "",
    "Output requirement:",
    `Return the COMPLETE ${sourceName} source in JSON field plantuml (field name stays plantuml for API compatibility). Include every element from Description and Additional requirements.`,
    "Optional explanation field: summarize how you organized main themes (1–3 sentences).",
  );

  return lines.join("\n");
}
