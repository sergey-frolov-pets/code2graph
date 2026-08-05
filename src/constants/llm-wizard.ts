export const WIZARD_DIAGRAM_TYPES = [
  "sequence",
  "class",
  "component",
  "activity",
  "state",
  "c4_context",
  "c4_container",
] as const;

export type WizardDiagramType = (typeof WIZARD_DIAGRAM_TYPES)[number];

export const WIZARD_DIAGRAM_DIRECTIONS = ["TB", "LR"] as const;

export type WizardDiagramDirection = (typeof WIZARD_DIAGRAM_DIRECTIONS)[number];

export const WIZARD_DIAGRAM_THEMES = ["default", "dark"] as const;

export type WizardDiagramTheme = (typeof WIZARD_DIAGRAM_THEMES)[number];

export interface WizardState {
  diagramType: WizardDiagramType;
  theme: WizardDiagramTheme;
  direction: WizardDiagramDirection;
  contextText: string;
  typeSpecificText: string;
  promptText: string;
}

export const DEFAULT_WIZARD_STATE: WizardState = {
  diagramType: "sequence",
  theme: "default",
  direction: "TB",
  contextText: "",
  typeSpecificText: "",
  promptText: "",
};

export function isWizardDiagramType(value: string): value is WizardDiagramType {
  return (WIZARD_DIAGRAM_TYPES as readonly string[]).includes(value);
}

export function buildWizardPrompt(state: WizardState): string {
  const typeLabel = state.diagramType.replace(/_/g, " ");
  const lines = [
    `Create a new PlantUML ${typeLabel} diagram.`,
    `Layout direction: ${state.direction}.`,
    `Diagram theme preference: ${state.theme}.`,
    "",
    "System / domain context:",
    state.contextText.trim() || "(not specified)",
  ];

  if (state.typeSpecificText.trim()) {
    lines.push("", "Additional requirements:", state.typeSpecificText.trim());
  }

  if (state.diagramType.startsWith("c4_")) {
    lines.push(
      "",
      "Use bundled C4 library includes from ./plantuml-lib/C4/ where appropriate.",
    );
  }

  lines.push(
    "",
    "Return the complete PlantUML source in JSON field plantuml.",
  );

  return lines.join("\n");
}

export function buildPatchPrompt(
  fullSource: string,
  selectedFragment: string,
  selectionStart: number,
  selectionEnd: number,
  userPrompt: string,
): string {
  const startLine = fullSource.slice(0, selectionStart).split(/\r?\n/).length;
  const endLine = fullSource.slice(0, selectionEnd).split(/\r?\n/).length;

  return [
    "Edit ONLY the selected PlantUML fragment according to the user request.",
    "Return JSON with field replacement containing the NEW text for the selected region (not the full file).",
    "You MUST apply the user request to the selection. Do not return text identical to the selected fragment.",
    "Keep syntax valid within the fragment; the app will merge replacement into the full source.",
    "",
    `Selection range: lines ${startLine}-${endLine}`,
    "",
    "=== FULL SOURCE (context, do not repeat unchanged parts in replacement) ===",
    fullSource,
    "",
    "=== SELECTED FRAGMENT (replace this) ===",
    selectedFragment,
    "",
    "=== USER REQUEST ===",
    userPrompt.trim(),
  ].join("\n");
}

export function buildPatchNoChangeRetryPrompt(
  userPrompt: string,
  selectedFragment: string,
  parsedMode: "replacement" | "full",
): string {
  const lines = [
    "Your previous response did not change the selected fragment.",
    `User request: ${userPrompt.trim()}`,
    "",
    "Return JSON with field replacement containing NEW text for the selected region.",
    "The replacement MUST differ from the selected fragment and MUST satisfy the user request.",
    "",
    "=== SELECTED FRAGMENT (must change) ===",
    selectedFragment,
  ];

  if (parsedMode === "full") {
    lines.push(
      "",
      "Do not return the full plantuml file. Use only the replacement field for the selected fragment.",
    );
  }

  return lines.join("\n");
}
