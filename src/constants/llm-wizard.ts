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
    "Edit the PlantUML source below according to the user request.",
    "Return the FULL updated source in JSON field plantuml (not only the fragment).",
    "Preserve parts outside the selection unless the user asks to change them.",
    "",
    `Selection range: lines ${startLine}-${endLine}`,
    "",
    "=== FULL SOURCE ===",
    fullSource,
    "",
    "=== SELECTED FRAGMENT ===",
    selectedFragment,
    "",
    "=== USER REQUEST ===",
    userPrompt.trim(),
  ].join("\n");
}
