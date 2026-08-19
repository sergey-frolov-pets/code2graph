import type { AppLocale } from "@/constants/i18n";
import { getWizardDiagramFormatRules } from "@/services/llm/diagram-format-rules";
import { getWizardTypePromptHint } from "@/constants/wizard-prompt-hints";
import {
  formatMermaidRequirementText,
  formatMermaidSankeyCsvField,
  sanitizeMermaidArchitectureLabel,
} from "@/services/conversion/emit/mermaid-emit-utils";
import { formatMermaidGitRef } from "@/utils/mermaid-gitgraph";

export const WIZARD_DIAGRAM_TYPES = [
  "sequence",
  "class",
  "component",
  "activity",
  "state",
  "c4_context",
  "c4_container",
  "gantt",
  "mindmap",
  "er",
  "graph",
  "flowchart",
  "pie",
  "journey",
  "gitgraph",
  "timeline",
  "sankey",
  "xychart",
  "block",
  "requirement",
  "quadrant",
  "architecture",
  "packet",
  "usecase",
  "deployment",
  "object",
  "timing",
  "wbs",
  "nwdiag",
  "archimate",
] as const;

export type WizardDiagramType = (typeof WIZARD_DIAGRAM_TYPES)[number];

export const WIZARD_DIAGRAM_DIRECTIONS = ["TB", "LR"] as const;

export type WizardDiagramDirection = (typeof WIZARD_DIAGRAM_DIRECTIONS)[number];

export const WIZARD_DIAGRAM_THEMES = ["default", "dark"] as const;

export type WizardDiagramTheme = (typeof WIZARD_DIAGRAM_THEMES)[number];

export const WIZARD_CREATION_MODES = ["ai", "manual", "fromCode"] as const;

export type WizardCreationMode = (typeof WIZARD_CREATION_MODES)[number];

export const WIZARD_LANGUAGES = ["plantuml", "mermaid", "graphml"] as const;

export type WizardLanguage = (typeof WIZARD_LANGUAGES)[number];

export const WIZARD_PARAM_IDS = [
  "participants",
  "classes",
  "components",
  "lanes",
  "steps",
  "states",
  "actors",
  "externalSystems",
  "containers",
  "nodes",
  "tasks",
  "edges",
  "entities",
] as const;

export type WizardParamId = (typeof WIZARD_PARAM_IDS)[number];

export const WIZARD_STRUCTURAL_ELEMENT_IDS = [
  "note",
  "if",
  "switch",
  "package",
  "alt",
  "loop",
  "opt",
  "par",
  "fork",
  "interface",
  "enum",
  "abstract",
  "artifact",
  "choice",
  "milestone",
  "cluster",
  "boundary",
  "queue",
  "section",
] as const;

export type WizardStructuralElementId = (typeof WIZARD_STRUCTURAL_ELEMENT_IDS)[number];

export const WIZARD_STEP_IDS = [
  "mode",
  "language",
  "type",
  "direction",
  "params",
  "context",
  "prompt",
  "codeSource",
  "codeTree",
  "codeDiagramType",
  "codeIrReview",
  "codeBatch",
  "result",
] as const;

export type WizardStepId = (typeof WIZARD_STEP_IDS)[number];

export interface WizardParamField {
  id: WizardParamId;
  min: number;
  max: number;
  default: number;
}

export interface WizardState {
  creationMode: WizardCreationMode;
  language: WizardLanguage;
  diagramType: WizardDiagramType;
  theme: WizardDiagramTheme;
  direction: WizardDiagramDirection;
  typeParams: Record<WizardParamId, number>;
  structuralElements: Record<WizardStructuralElementId, boolean>;
  contextText: string;
  typeSpecificText: string;
  promptText: string;
}

const SWIMLANE_COLORS = [
  "#E3F2FD",
  "#E8F5E9",
  "#FFF3E0",
  "#FCE4EC",
  "#EDE7F6",
  "#E0F7FA",
  "#FFF9C4",
  "#F3E5F5",
] as const;

export const WIZARD_TYPE_PARAM_FIELDS: Record<WizardDiagramType, WizardParamField[]> = {
  sequence: [{ id: "participants", min: 2, max: 15, default: 3 }],
  class: [{ id: "classes", min: 2, max: 12, default: 4 }],
  component: [{ id: "components", min: 2, max: 12, default: 4 }],
  activity: [
    { id: "lanes", min: 1, max: 8, default: 3 },
    { id: "steps", min: 2, max: 20, default: 5 },
  ],
  state: [{ id: "states", min: 2, max: 12, default: 4 }],
  c4_context: [
    { id: "actors", min: 1, max: 8, default: 2 },
    { id: "externalSystems", min: 1, max: 8, default: 2 },
  ],
  c4_container: [{ id: "containers", min: 2, max: 12, default: 4 }],
  gantt: [{ id: "tasks", min: 2, max: 20, default: 4 }],
  mindmap: [
    { id: "nodes", min: 2, max: 24, default: 8 },
    { id: "steps", min: 1, max: 24, default: 6 },
  ],
  er: [{ id: "entities", min: 2, max: 12, default: 3 }],
  graph: [
    { id: "nodes", min: 2, max: 15, default: 4 },
    { id: "edges", min: 1, max: 20, default: 3 },
  ],
  flowchart: [
    { id: "nodes", min: 2, max: 15, default: 4 },
    { id: "edges", min: 1, max: 20, default: 3 },
  ],
  pie: [{ id: "nodes", min: 2, max: 10, default: 4 }],
  journey: [{ id: "steps", min: 2, max: 12, default: 4 }],
  gitgraph: [{ id: "steps", min: 2, max: 12, default: 4 }],
  timeline: [{ id: "steps", min: 2, max: 12, default: 4 }],
  sankey: [
    { id: "nodes", min: 2, max: 10, default: 3 },
    { id: "edges", min: 1, max: 10, default: 2 },
  ],
  xychart: [{ id: "steps", min: 2, max: 12, default: 4 }],
  block: [{ id: "nodes", min: 2, max: 12, default: 4 }],
  requirement: [{ id: "nodes", min: 2, max: 12, default: 4 }],
  quadrant: [{ id: "nodes", min: 2, max: 12, default: 4 }],
  architecture: [{ id: "components", min: 2, max: 12, default: 4 }],
  packet: [{ id: "steps", min: 2, max: 12, default: 4 }],
  usecase: [
    { id: "actors", min: 1, max: 8, default: 2 },
    { id: "components", min: 2, max: 12, default: 4 },
  ],
  deployment: [{ id: "nodes", min: 2, max: 12, default: 4 }],
  object: [{ id: "classes", min: 2, max: 12, default: 3 }],
  timing: [
    { id: "participants", min: 2, max: 10, default: 3 },
    { id: "steps", min: 2, max: 12, default: 4 },
  ],
  wbs: [
    { id: "nodes", min: 2, max: 12, default: 4 },
    { id: "steps", min: 1, max: 8, default: 2 },
  ],
  nwdiag: [
    { id: "nodes", min: 2, max: 12, default: 4 },
    { id: "edges", min: 1, max: 12, default: 3 },
  ],
  archimate: [{ id: "nodes", min: 2, max: 12, default: 4 }],
};

export const WIZARD_TYPE_STRUCTURAL_ELEMENTS: Record<
  WizardDiagramType,
  WizardStructuralElementId[]
> = {
  sequence: ["note", "alt", "loop", "opt", "par"],
  class: ["package", "interface", "enum", "abstract", "note"],
  component: ["package", "interface", "note"],
  activity: ["if", "switch", "fork", "note", "artifact"],
  state: ["choice", "fork", "note"],
  c4_context: ["boundary", "note"],
  c4_container: ["boundary", "queue", "note"],
  gantt: ["milestone", "section"],
  mindmap: ["note"],
  er: ["note"],
  graph: ["cluster"],
  flowchart: ["if", "fork", "note"],
  pie: ["note"],
  journey: ["section", "note"],
  gitgraph: ["note"],
  timeline: ["section", "note"],
  sankey: ["note"],
  xychart: ["note"],
  block: ["note"],
  requirement: ["note"],
  quadrant: ["note"],
  architecture: ["note"],
  packet: ["note"],
  usecase: ["note"],
  deployment: ["artifact", "note"],
  object: ["note"],
  timing: ["note"],
  wbs: ["note"],
  nwdiag: ["note"],
  archimate: ["note"],
};

const PLANTUML_ONLY_STRUCTURAL_ELEMENTS = new Set<WizardStructuralElementId>([
  "artifact",
  "switch",
  "choice",
  "boundary",
  "queue",
  "abstract",
  "enum",
]);

const GRAPHML_STRUCTURAL_ELEMENTS = new Set<WizardStructuralElementId>(["cluster"]);

const PLANTUML_WIZARD_TYPES: WizardDiagramType[] = [
  "sequence",
  "class",
  "component",
  "activity",
  "state",
  "c4_context",
  "c4_container",
  "gantt",
  "mindmap",
  "er",
  "usecase",
  "deployment",
  "object",
  "timing",
  "wbs",
  "nwdiag",
  "archimate",
];

const MERMAID_WIZARD_TYPES: WizardDiagramType[] = [
  "sequence",
  "class",
  "component",
  "activity",
  "state",
  "gantt",
  "mindmap",
  "er",
  "flowchart",
  "pie",
  "journey",
  "gitgraph",
  "timeline",
  "sankey",
  "xychart",
  "block",
  "c4_context",
  "requirement",
  "quadrant",
  "architecture",
  "packet",
];

const GRAPHML_WIZARD_TYPES: WizardDiagramType[] = ["graph"];

const DIRECTION_SUPPORTED_TYPES: WizardDiagramType[] = [
  "class",
  "component",
  "state",
  "c4_context",
  "c4_container",
  "mindmap",
  "graph",
  "flowchart",
  "usecase",
  "deployment",
  "archimate",
];

export function createDefaultTypeParams(): Record<WizardParamId, number> {
  const params = {} as Record<WizardParamId, number>;

  for (const paramId of WIZARD_PARAM_IDS) {
    params[paramId] = 3;
  }

  for (const fields of Object.values(WIZARD_TYPE_PARAM_FIELDS)) {
    for (const field of fields) {
      params[field.id] = field.default;
    }
  }

  return params;
}

export function createDefaultStructuralElements(): Record<
  WizardStructuralElementId,
  boolean
> {
  const elements = {} as Record<WizardStructuralElementId, boolean>;

  for (const elementId of WIZARD_STRUCTURAL_ELEMENT_IDS) {
    elements[elementId] = false;
  }

  return elements;
}

export function getWizardStructuralElementsForType(
  diagramType: WizardDiagramType,
  language: WizardLanguage,
): WizardStructuralElementId[] {
  const base = WIZARD_TYPE_STRUCTURAL_ELEMENTS[diagramType] ?? [];

  if (language === "graphml") {
    return base.filter((elementId) => GRAPHML_STRUCTURAL_ELEMENTS.has(elementId));
  }

  if (language === "mermaid") {
    return base.filter((elementId) => !PLANTUML_ONLY_STRUCTURAL_ELEMENTS.has(elementId));
  }

  return base;
}

export function getSelectedStructuralElements(
  state: WizardState,
): WizardStructuralElementId[] {
  return getWizardStructuralElementsForType(state.diagramType, state.language).filter(
    (elementId) => state.structuralElements[elementId],
  );
}

export const DEFAULT_WIZARD_STATE: WizardState = {
  creationMode: "manual",
  language: "plantuml",
  diagramType: "sequence",
  theme: "default",
  direction: "TB",
  typeParams: createDefaultTypeParams(),
  structuralElements: createDefaultStructuralElements(),
  contextText: "",
  typeSpecificText: "",
  promptText: "",
};

export function isWizardDiagramType(value: string): value is WizardDiagramType {
  return (WIZARD_DIAGRAM_TYPES as readonly string[]).includes(value);
}

export function isWizardCreationMode(value: string): value is WizardCreationMode {
  return (WIZARD_CREATION_MODES as readonly string[]).includes(value);
}

export function isWizardLanguage(value: string): value is WizardLanguage {
  return (WIZARD_LANGUAGES as readonly string[]).includes(value);
}

export function getWizardLanguagesForMode(mode: WizardCreationMode): WizardLanguage[] {
  return mode === "ai" ? ["plantuml", "mermaid"] : [...WIZARD_LANGUAGES];
}

export function getWizardTypesForLanguage(language: WizardLanguage): WizardDiagramType[] {
  if (language === "graphml") {
    return [...GRAPHML_WIZARD_TYPES];
  }

  if (language === "mermaid") {
    return [...MERMAID_WIZARD_TYPES];
  }

  return [...PLANTUML_WIZARD_TYPES];
}

export function isWizardLanguageAiSupported(language: WizardLanguage): boolean {
  return language === "plantuml" || language === "mermaid";
}

export function wizardTypeSupportsDirection(
  diagramType: WizardDiagramType,
  language: WizardLanguage,
): boolean {
  if (language === "mermaid") {
    return ["class", "component", "activity", "state", "flowchart"].includes(diagramType);
  }

  if (language === "graphml") {
    return diagramType === "graph";
  }

  return DIRECTION_SUPPORTED_TYPES.includes(diagramType);
}

export function getWizardSteps(state: WizardState): WizardStepId[] {
  if (state.creationMode === "fromCode") {
    return [
      "mode",
      "codeSource",
      "codeTree",
      "codeDiagramType",
      "codeIrReview",
      "codeBatch",
      "result",
    ];
  }

  const steps: WizardStepId[] = ["mode", "language", "type"];

  if (state.creationMode === "ai") {
    steps.push("context", "result");
    return steps;
  }

  if (wizardTypeSupportsDirection(state.diagramType, state.language)) {
    steps.push("direction");
  }

  steps.push("params", "result");

  return steps;
}

export function wizardTypeHasStructureStep(
  diagramType: WizardDiagramType,
  language: WizardLanguage,
): boolean {
  return (
    WIZARD_TYPE_PARAM_FIELDS[diagramType].length > 0 ||
    getWizardStructuralElementsForType(diagramType, language).length > 0
  );
}

export function getWizardStepTitleKey(stepId: WizardStepId): string {
  return `llm.wizard.step.${stepId}`;
}

export function resolveWizardStateWithDefaults(
  state: WizardState,
  visitedStepIds: readonly WizardStepId[],
): WizardState {
  const visited = new Set(visitedStepIds);
  const resolved: WizardState = {
    creationMode: visited.has("mode")
      ? state.creationMode
      : DEFAULT_WIZARD_STATE.creationMode,
    language: visited.has("language")
      ? state.language
      : DEFAULT_WIZARD_STATE.language,
    diagramType: visited.has("type")
      ? state.diagramType
      : DEFAULT_WIZARD_STATE.diagramType,
    theme: DEFAULT_WIZARD_STATE.theme,
    direction: visited.has("direction")
      ? state.direction
      : DEFAULT_WIZARD_STATE.direction,
    typeParams: visited.has("params")
      ? { ...state.typeParams }
      : createDefaultTypeParams(),
    structuralElements: visited.has("params")
      ? { ...state.structuralElements }
      : createDefaultStructuralElements(),
    contextText: visited.has("context") ? state.contextText : "",
    typeSpecificText: visited.has("params") ? state.typeSpecificText : "",
    promptText: visited.has("prompt") ? state.promptText : "",
  };

  const allowedLanguages = getWizardLanguagesForMode(resolved.creationMode);
  if (!allowedLanguages.includes(resolved.language)) {
    resolved.language = allowedLanguages[0];
  }

  const allowedTypes = getWizardTypesForLanguage(resolved.language);
  if (!allowedTypes.includes(resolved.diagramType)) {
    resolved.diagramType = allowedTypes[0];
  }

  if (!wizardTypeSupportsDirection(resolved.diagramType, resolved.language)) {
    resolved.direction = DEFAULT_WIZARD_STATE.direction;
  }

  return resolved;
}

export { getWizardDiagramFormatRules };

export function buildWizardPrompt(state: WizardState, locale: AppLocale = "en"): string {
  const typeLabel = state.diagramType.replace(/_/g, " ");
  const paramLines = formatTypeParamsForPrompt(state);
  const typePromptHint = getWizardTypePromptHint(state.diagramType, locale);
  const formatLabel =
    state.language === "mermaid"
      ? "Mermaid"
      : state.language === "graphml"
        ? "GraphML"
        : "PlantUML";

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

  lines.push(
    "",
    "Output requirement:",
    state.language === "mermaid"
      ? "Return the COMPLETE Mermaid source in JSON field plantuml (same field name as PlantUML responses). Include every element from Description and Additional requirements."
      : "Return the COMPLETE PlantUML source in JSON field plantuml. Include every element from Description and Additional requirements.",
    "Optional explanation field: summarize how you organized main themes (1–3 sentences).",
  );

  return lines.join("\n");
}

function formatTypeParamsForPrompt(state: WizardState): string[] {
  const fields = WIZARD_TYPE_PARAM_FIELDS[state.diagramType];
  return fields.map((field) => {
    const value = state.typeParams[field.id];
    return `- ${field.id}: ${value}`;
  });
}

function buildPlantUmlThemeBlock(theme: WizardDiagramTheme): string[] {
  if (theme === "dark") {
    return [
      "skinparam backgroundColor #1e1e1e",
      "skinparam defaultFontColor #eeeeee",
      "skinparam shadowing false",
    ];
  }

  return [];
}

function buildPlantUmlDirectionLine(
  direction: WizardDiagramDirection,
): string | null {
  if (direction === "LR") {
    return "left to right direction";
  }

  return "top to bottom direction";
}

function buildPlantUmlHeader(
  state: WizardState,
  title: string,
  includeDirection: boolean,
  includeLayoutPragma = true,
): string[] {
  const lines = ["@startuml"];

  if (includeLayoutPragma) {
    lines.push("!pragma layout smetana", "");
  }

  lines.push(`title ${title}`, "", ...buildPlantUmlThemeBlock(state.theme));

  if (includeDirection) {
    const directionLine = buildPlantUmlDirectionLine(state.direction);
    if (directionLine) {
      lines.push(directionLine, "");
    }
  }

  return lines;
}

function participantLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Участник ${index}` : `Participant ${index}`;
}

function classLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Класс${index}` : `Class${index}`;
}

function componentLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Компонент ${index}` : `Component ${index}`;
}

function laneLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Дорожка ${index}` : `Lane ${index}`;
}

function stepLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Шаг ${index}` : `Step ${index}`;
}

function stateLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Состояние ${index}` : `State ${index}`;
}

function plantUmlStateAlias(index: number): string {
  return `wizard_state_${index}`;
}

function plantUmlStateDeclaration(index: number, locale: AppLocale): string {
  const label = stateLabel(index, locale);
  return `state "${label.replace(/"/g, '\\"')}" as ${plantUmlStateAlias(index)}`;
}

function plantUmlStateRef(index: number, _locale?: AppLocale): string {
  return plantUmlStateAlias(index);
}

function actorLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Актор ${index}` : `Actor ${index}`;
}

function externalSystemLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Внешняя система ${index}` : `External system ${index}`;
}

function containerLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Контейнер ${index}` : `Container ${index}`;
}

function nodeLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Узел ${index}` : `Node ${index}`;
}

function buildPlantUmlSequence(
  state: WizardState,
  locale: AppLocale,
): string {
  const count = state.typeParams.participants;
  const title = locale === "ru" ? "Диаграмма последовательности" : "Sequence diagram";
  const lines = buildPlantUmlHeader(state, title, false, false);

  for (let index = 1; index <= count; index += 1) {
    lines.push(`actor ${participantLabel(index, locale).replace(/\s+/g, "_")}`);
  }

  if (count >= 2) {
    const from = participantLabel(1, locale).replace(/\s+/g, "_");
    const to = participantLabel(2, locale).replace(/\s+/g, "_");
    const message = locale === "ru" ? "сообщение" : "message";
    lines.push("", `${from} -> ${to}: ${message}`);
  }

  appendPlantUmlSequenceStructure(lines, state, locale);
  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlClass(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.classes;
  const title = locale === "ru" ? "Диаграмма классов" : "Class diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  if (hasStructural(state, "package")) {
    const packageName = locale === "ru" ? "Домен" : "Domain";
    lines.push(`package ${packageName} {`);
  }

  for (let index = 1; index <= count; index += 1) {
    const name = classLabel(index, locale);
    lines.push(`class ${name} {`, `  +field${index}: String`, "}");
  }

  if (hasStructural(state, "package")) {
    lines.push("}");
  }

  if (count >= 2) {
    lines.push("", `${classLabel(1, locale)} --> ${classLabel(2, locale)}`);
  }

  appendPlantUmlClassStructure(lines, state, locale);
  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlComponent(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.components;
  const title = locale === "ru" ? "Диаграмма компонентов" : "Component diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  if (hasStructural(state, "package")) {
    const packageName = locale === "ru" ? "Домен" : "Domain";
    lines.push(`package "${packageName}" {`);
  }

  for (let index = 1; index <= count; index += 1) {
    lines.push(`  [${componentLabel(index, locale)}]`);
  }

  if (hasStructural(state, "package")) {
    lines.push("}");
  }

  if (count >= 2) {
    lines.push(
      "",
      `[${componentLabel(1, locale)}] --> [${componentLabel(2, locale)}]`,
    );
  }

  appendPlantUmlComponentStructure(lines, state, locale);
  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlActivity(state: WizardState, locale: AppLocale): string {
  const laneCount = state.typeParams.lanes;
  const stepCount = state.typeParams.steps;
  const title = locale === "ru" ? "Диаграмма активности" : "Activity diagram";
  const lines = buildPlantUmlHeader(state, title, false, false);

  for (let laneIndex = 1; laneIndex <= laneCount; laneIndex += 1) {
    const color = SWIMLANE_COLORS[(laneIndex - 1) % SWIMLANE_COLORS.length];
    lines.push(`|${color}|${laneLabel(laneIndex, locale)}|`);
  }

  lines.push("", "start");

  for (let stepIndex = 1; stepIndex <= stepCount; stepIndex += 1) {
    const laneIndex = ((stepIndex - 1) % laneCount) + 1;
    lines.push(`|${laneLabel(laneIndex, locale)}|`, `:${stepLabel(stepIndex, locale)};`);
  }

  appendPlantUmlActivityStructure(lines, state, locale);
  lines.push("stop", "@enduml");
  return lines.join("\n");
}

function buildPlantUmlState(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.states;
  const title = locale === "ru" ? "Диаграмма состояний" : "State diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  for (let index = 1; index <= count; index += 1) {
    lines.push(plantUmlStateDeclaration(index, locale));
  }

  lines.push("", "[*] --> " + plantUmlStateRef(1, locale));

  for (let index = 1; index < count; index += 1) {
    lines.push(
      `${plantUmlStateRef(index, locale)} --> ${plantUmlStateRef(index + 1, locale)}`,
    );
  }

  lines.push(plantUmlStateRef(count, locale) + " --> [*]");
  appendPlantUmlStateStructure(lines, state, locale);
  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlC4Context(state: WizardState, locale: AppLocale): string {
  const actorCount = state.typeParams.actors;
  const externalCount = state.typeParams.externalSystems;
  const title = locale === "ru" ? "C4 Context" : "C4 Context";
  const systemName = locale === "ru" ? "Система" : "System";
  const lines = buildPlantUmlHeader(state, title, true);

  lines.push(
    "!include ./plantuml-lib/C4/C4_Context.puml",
    "",
    `Person(${actorLabel(1, locale).replace(/\s+/g, "_")}, "${actorLabel(1, locale)}", "")`,
  );

  for (let index = 2; index <= actorCount; index += 1) {
    const label = actorLabel(index, locale);
    lines.push(`Person(${label.replace(/\s+/g, "_")}, "${label}", "")`);
  }

  lines.push(
    `System(${systemName}, "${systemName}", "")`,
  );

  for (let index = 1; index <= externalCount; index += 1) {
    const label = externalSystemLabel(index, locale);
    lines.push(`System_Ext(${label.replace(/\s+/g, "_")}, "${label}", "")`);
  }

  if (actorCount >= 1) {
    lines.push(
      "",
      `Rel(${actorLabel(1, locale).replace(/\s+/g, "_")}, ${systemName}, "${locale === "ru" ? "использует" : "uses"}")`,
    );
  }

  if (hasStructural(state, "boundary")) {
    const boundary = locale === "ru" ? "Граница" : "Boundary";
    lines.push("", `System_Boundary(${boundary}, "${boundary}") {`, `  System(${systemName}, "${systemName}", "")`, "}");
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note right of ${systemName}: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlC4Container(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.containers;
  const title = locale === "ru" ? "C4 Container" : "C4 Container";
  const systemName = locale === "ru" ? "Система" : "System";
  const lines = buildPlantUmlHeader(state, title, true);

  lines.push(
    "!include ./plantuml-lib/C4/C4_Container.puml",
    "",
    `System_Boundary(${systemName}, "${systemName}") {`,
  );

  for (let index = 1; index <= count; index += 1) {
    const label = containerLabel(index, locale);
    lines.push(
      `  Container(${label.replace(/\s+/g, "_")}, "${label}", "", "")`,
    );
  }

  lines.push("}");

  if (count >= 2) {
    const from = containerLabel(1, locale).replace(/\s+/g, "_");
    const to = containerLabel(2, locale).replace(/\s+/g, "_");
    lines.push(
      "",
      `Rel(${from}, ${to}, "${locale === "ru" ? "вызывает" : "calls"}")`,
    );
  }

  if (hasStructural(state, "queue")) {
    const queue = locale === "ru" ? "Очередь" : "Queue";
    lines.push("", `ContainerQueue(${queue}, "${queue}", "")`);
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note right of ${containerLabel(1, locale).replace(/\s+/g, "_")}: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function mermaidFlowDirection(direction: WizardDiagramDirection): string {
  return direction === "LR" ? "LR" : "TD";
}

function buildMermaidSequence(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.participants;
  const lines = ["sequenceDiagram"];

  for (let index = 1; index <= count; index += 1) {
    const label = participantLabel(index, locale);
    lines.push(`  participant ${label.replace(/\s+/g, "_")} as "${label}"`);
  }

  if (count >= 2) {
    const from = participantLabel(1, locale).replace(/\s+/g, "_");
    const to = participantLabel(2, locale).replace(/\s+/g, "_");
    const message = locale === "ru" ? "сообщение" : "message";
    lines.push(`  ${from}->>${to}: ${message}`);
  }

  appendMermaidSequenceStructure(lines, state, locale);
  return lines.join("\n");
}

function buildMermaidClass(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.classes;
  const direction = state.direction === "LR" ? "LR" : "TB";
  const lines = ["classDiagram", `  direction ${direction}`];

  if (hasStructural(state, "package")) {
    const packageName = locale === "ru" ? "Домен" : "Domain";
    lines.push(`  namespace ${packageName} {`);
  }

  for (let index = 1; index <= count; index += 1) {
    const name = classLabel(index, locale);
    lines.push(`  class ${name}`);
  }

  if (hasStructural(state, "package")) {
    lines.push("  }");
  }

  if (count >= 2) {
    lines.push(`  ${classLabel(1, locale)} --> ${classLabel(2, locale)}`);
  }

  if (hasStructural(state, "interface")) {
    const iface = locale === "ru" ? "Интерфейс" : "Interface";
    lines.push(`  class ${iface} {`, "    <<interface>>", "    +method()", "  }");
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`  note for ${classLabel(1, locale)} "${noteText}"`);
  }

  return lines.join("\n");
}

function buildMermaidFlowchart(
  state: WizardState,
  locale: AppLocale,
): string {
  const nodeCount =
    state.diagramType === "flowchart"
      ? state.typeParams.nodes
      : state.typeParams.components || state.typeParams.nodes;
  const flow = mermaidFlowDirection(state.direction);
  const startLabel = locale === "ru" ? "Старт" : "Start";
  const endLabel = locale === "ru" ? "Готово" : "Done";
  const lines = [`flowchart ${flow}`, `  A([${startLabel}])`];

  for (let index = 1; index <= nodeCount; index += 1) {
    const label = nodeLabel(index, locale);
    const nodeId = `N${index}`;
    lines.push(`  ${nodeId}[${label}]`);
  }

  lines.push(`  Z([${endLabel}])`);

  if (nodeCount >= 1) {
    lines.push(`  A --> N1`);
    for (let index = 1; index < nodeCount; index += 1) {
      lines.push(`  N${index} --> N${index + 1}`);
    }
    lines.push(`  N${nodeCount} --> Z`);
  } else {
    lines.push("  A --> Z");
  }

  appendMermaidFlowStructure(lines, state, locale);
  return lines.join("\n");
}

function buildMermaidActivity(state: WizardState, locale: AppLocale): string {
  const stepCount = state.typeParams.steps;
  const flow = mermaidFlowDirection(state.direction);
  const startLabel = locale === "ru" ? "Старт" : "Start";
  const endLabel = locale === "ru" ? "Готово" : "Done";
  const lines = [`flowchart ${flow}`, `  start([${startLabel}])`];

  for (let index = 1; index <= stepCount; index += 1) {
    const label = stepLabel(index, locale);
    lines.push(`  S${index}[${label}]`);
  }

  lines.push(`  stop([${endLabel}])`, `  start --> S1`);

  for (let index = 1; index < stepCount; index += 1) {
    lines.push(`  S${index} --> S${index + 1}`);
  }

  if (stepCount >= 1) {
    lines.push(`  S${stepCount} --> stop`);
  } else {
    lines.push("  start --> stop");
  }

  appendMermaidFlowStructure(lines, state, locale);
  return lines.join("\n");
}

function buildMermaidComponent(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.components;
  const flow = mermaidFlowDirection(state.direction);
  const lines = [`flowchart ${flow}`];
  const indent = hasStructural(state, "package") ? "    " : "  ";

  if (hasStructural(state, "package")) {
    const packageName = locale === "ru" ? "Домен" : "Domain";
    lines.push(`  subgraph ${packageName.replace(/\s+/g, "_")}["${packageName}"]`);
  }

  for (let index = 1; index <= count; index += 1) {
    const label = componentLabel(index, locale);
    lines.push(`${indent}C${index}[[${label}]]`);
  }

  if (hasStructural(state, "package")) {
    lines.push("  end");
  }

  if (count >= 2) {
    lines.push("  C1 --> C2");
  }

  if (hasStructural(state, "interface")) {
    const iface = locale === "ru" ? "Интерфейс" : "Interface";
    lines.push(`  IF(["${iface}"])`);
    lines.push("  IF -.-> C1");
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`  C1@{ shape: braces, label: "${noteText}" }`);
  }

  return lines.join("\n");
}

function taskLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Задача ${index}` : `Task ${index}`;
}

function entityLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Сущность ${index}` : `Entity ${index}`;
}

function branchLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Ветка ${index}` : `Branch ${index}`;
}

function subBranchLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Подветка ${index}` : `Sub-branch ${index}`;
}

function hasStructural(
  state: WizardState,
  elementId: WizardStructuralElementId,
): boolean {
  return state.structuralElements[elementId] === true;
}

function appendPlantUmlSequenceStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const from = participantLabel(1, locale).replace(/\s+/g, "_");
  const to = participantLabel(2, locale).replace(/\s+/g, "_");
  const ok = locale === "ru" ? "успех" : "success";
  const fail = locale === "ru" ? "ошибка" : "failure";
  const noteText = locale === "ru" ? "Примечание" : "Note";

  if (hasStructural(state, "note")) {
    lines.push("", `note right of ${from}: ${noteText}`);
  }

  if (hasStructural(state, "alt")) {
    lines.push(
      "",
      `alt ${ok}`,
      `  ${from} -> ${to}: ${ok}`,
      "else " + fail,
      `  ${from} -> ${to}: ${fail}`,
      "end",
    );
  }

  if (hasStructural(state, "loop")) {
    const retry = locale === "ru" ? "повтор" : "retry";
    lines.push("", `loop ${retry}`, `  ${from} -> ${to}: ${retry}`, "end");
  }

  if (hasStructural(state, "opt")) {
    const optional = locale === "ru" ? "опционально" : "optional";
    lines.push("", `opt ${optional}`, `  ${from} -> ${to}: ${optional}`, "end");
  }

  if (hasStructural(state, "par")) {
    const parallel = locale === "ru" ? "параллельно" : "parallel";
    lines.push(
      "",
      "par " + parallel,
      `  ${from} -> ${to}: A`,
      `  ${from} -> ${to}: B`,
      "end",
    );
  }
}

function appendMermaidSequenceStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const from = participantLabel(1, locale).replace(/\s+/g, "_");
  const to = participantLabel(2, locale).replace(/\s+/g, "_");
  const ok = locale === "ru" ? "успех" : "success";
  const fail = locale === "ru" ? "ошибка" : "failure";

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`  Note right of ${from}: ${noteText}`);
  }

  if (hasStructural(state, "alt")) {
    lines.push(
      `  alt ${ok}`,
      `    ${from}->>${to}: ${ok}`,
      `  else ${fail}`,
      `    ${from}->>${to}: ${fail}`,
      "  end",
    );
  }

  if (hasStructural(state, "loop")) {
    const retry = locale === "ru" ? "повтор" : "retry";
    lines.push(`  loop ${retry}`, `    ${from}->>${to}: ${retry}`, "  end");
  }

  if (hasStructural(state, "opt")) {
    const optional = locale === "ru" ? "опционально" : "optional";
    lines.push(`  opt ${optional}`, `    ${from}->>${to}: ${optional}`, "  end");
  }

  if (hasStructural(state, "par")) {
    lines.push(
      "  par",
      `    ${from}->>${to}: A`,
      `    ${from}->>${to}: B`,
      "  end",
    );
  }
}

function appendPlantUmlClassStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const noteText = locale === "ru" ? "Примечание" : "Note";

  if (hasStructural(state, "interface")) {
    const iface = locale === "ru" ? "Интерфейс" : "Interface";
    lines.push("", `interface ${iface} {`, "  +method()", "}");
  }

  if (hasStructural(state, "enum")) {
    const enumName = locale === "ru" ? "Статус" : "Status";
    lines.push("", `enum ${enumName} {`, "  ACTIVE", "  INACTIVE", "}");
  }

  if (hasStructural(state, "abstract")) {
    const abstractName = locale === "ru" ? "БазовыйКласс" : "BaseClass";
    lines.push("", `abstract class ${abstractName} {`, "  +id: String", "}");
  }

  if (hasStructural(state, "note")) {
    lines.push("", `note top of ${classLabel(1, locale)}: ${noteText}`);
  }
}

function appendPlantUmlComponentStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const noteText = locale === "ru" ? "Примечание" : "Note";

  if (hasStructural(state, "interface")) {
    const iface = locale === "ru" ? "Интерфейс" : "Interface";
    lines.push("", `() ${iface}`, "");
  }

  if (hasStructural(state, "note")) {
    lines.push(`note right of [${componentLabel(1, locale)}]: ${noteText}`);
  }
}

function appendPlantUmlActivityStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const noteText = locale === "ru" ? "Примечание" : "Note";
  const yes = locale === "ru" ? "да" : "yes";
  const no = locale === "ru" ? "нет" : "no";
  const caseA = locale === "ru" ? "вариант A" : "case A";
  const caseB = locale === "ru" ? "вариант B" : "case B";

  if (hasStructural(state, "if")) {
    lines.push("", `if (${yes}?) then (${yes})`, `  :${stepLabel(1, locale)};`, "else (" + no + ")", `  :${stepLabel(2, locale)};`, "endif");
  }

  if (hasStructural(state, "switch")) {
    lines.push(
      "",
      "switch (" + caseA + ")",
      "case (" + caseA + ")",
      `  :${stepLabel(1, locale)};`,
      "case (" + caseB + ")",
      `  :${stepLabel(2, locale)};`,
      "endswitch",
    );
  }

  if (hasStructural(state, "fork")) {
    lines.push("", "fork", `  :${stepLabel(1, locale)};`, "fork again", `  :${stepLabel(2, locale)};`, "end fork");
  }

  if (hasStructural(state, "note")) {
    lines.push("", `floating note right: ${noteText}`);
  }

  if (hasStructural(state, "artifact")) {
    const artifact = locale === "ru" ? "Артефакт" : "Artifact";
    lines.push("", `:${artifact};`, "<<artifact>>");
  }
}

function appendMermaidFlowStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  const yes = locale === "ru" ? "Да" : "Yes";
  const no = locale === "ru" ? "Нет" : "No";

  if (hasStructural(state, "if")) {
    lines.push("  B{Decision?}", `  B -->|${yes}| N1`, `  B -->|${no}| Z`);
  }

  if (hasStructural(state, "fork")) {
    lines.push("  F{{Fork}}", "  F --> N1", "  F --> N2");
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`  N1@{ shape: braces, label: "${noteText}" }`);
  }
}

function appendPlantUmlStateStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (hasStructural(state, "choice")) {
    lines.push(
      "",
      "state wizard_choice <<choice>>",
      `${plantUmlStateRef(1, locale)} --> wizard_choice`,
      `wizard_choice --> ${plantUmlStateRef(2, locale)}`,
    );
  }

  if (hasStructural(state, "fork")) {
    lines.push(
      "",
      "state wizard_fork <<fork>>",
      `${plantUmlStateRef(1, locale)} --> wizard_fork`,
      `wizard_fork --> ${plantUmlStateRef(2, locale)}`,
    );
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note right of ${plantUmlStateRef(1, locale)}: ${noteText}`);
  }
}

function appendPlantUmlGanttStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (hasStructural(state, "section")) {
    const section = locale === "ru" ? "Этап 2" : "Phase 2";
    lines.push("", "[" + section + "] lasts 2 days");
  }

  if (hasStructural(state, "milestone")) {
    const milestone = locale === "ru" ? "Веха" : "Milestone";
    lines.push("", `[${milestone}] happens at [${taskLabel(1, locale)}]'s end`);
  }
}

function appendMermaidGanttStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (hasStructural(state, "section")) {
    const section = locale === "ru" ? "Этап 2" : "Phase 2";
    lines.push("", `section ${section}`, `${taskLabel(2, locale)} :t2, after t1, 2d`);
  }

  if (hasStructural(state, "milestone")) {
    const milestone = locale === "ru" ? "Веха" : "Milestone";
    lines.push("", `${milestone} :milestone, after t1, 0d`);
  }
}

function appendGraphmlClusterStructure(
  lines: string[],
  state: WizardState,
  locale: AppLocale,
): void {
  if (!hasStructural(state, "cluster")) {
    return;
  }

  const clusterLabel = locale === "ru" ? "Группа" : "Cluster";
  lines.splice(
    lines.length - 2,
    0,
    `    <node id="cluster1">`,
    `      <data key="d0">${clusterLabel}</data>`,
    `      <graph id="cluster1_graph" edgedefault="directed">`,
    `        <node id="n1"><data key="d0">${nodeLabel(1, locale)}</data></node>`,
    `      </graph>`,
    `    </node>`,
  );
}

function buildPlantUmlGantt(state: WizardState, locale: AppLocale): string {
  const taskCount = state.typeParams.tasks;
  const title = locale === "ru" ? "Диаграмма Ганта" : "Gantt chart";
  const lines = [
    "@startgantt",
    `title ${title}`,
    "project starts 2026-01-06",
    "saturday are closed",
    "sunday are closed",
    "",
  ];

  for (let index = 1; index <= taskCount; index += 1) {
    const label = taskLabel(index, locale);
    if (index === 1) {
      lines.push(`[${label}] lasts 3 days`);
    } else {
      const prev = taskLabel(index - 1, locale);
      lines.push(`[${label}] lasts 3 days and starts at [${prev}]'s end`);
    }
  }

  appendPlantUmlGanttStructure(lines, state, locale);
  lines.push("@endgantt");
  return lines.join("\n");
}

function buildMermaidGantt(state: WizardState, locale: AppLocale): string {
  const taskCount = state.typeParams.tasks;
  const title = locale === "ru" ? "План проекта" : "Project plan";
  const section = locale === "ru" ? "Этапы" : "Stages";
  const lines = [
    "gantt",
    `title ${title}`,
    "dateFormat YYYY-MM-DD",
    "excludes weekends",
    "",
    `section ${section}`,
  ];

  for (let index = 1; index <= taskCount; index += 1) {
    const label = taskLabel(index, locale);
    const id = `t${index}`;
    if (index === 1) {
      lines.push(`${label} :${id}, 2026-01-06, 3d`);
    } else {
      const prevId = `t${index - 1}`;
      lines.push(`${label} :${id}, after ${prevId}, 3d`);
    }
  }

  appendMermaidGanttStructure(lines, state, locale);
  return lines.join("\n");
}

function buildPlantUmlMindmap(state: WizardState, locale: AppLocale): string {
  const branchCount = state.typeParams.nodes;
  const subCount = state.typeParams.steps;
  const root = locale === "ru" ? "Корневая тема" : "Root topic";
  const title = locale === "ru" ? "Mind map" : "Mind map";
  const lines = ["@startmindmap"];

  const directionLine = buildPlantUmlDirectionLine(state.direction);
  if (directionLine) {
    lines.push(directionLine);
  }

  lines.push("", `title ${title}`, "", ...buildPlantUmlThemeBlock(state.theme), `* ${root}`);

  for (let branchIndex = 1; branchIndex <= branchCount; branchIndex += 1) {
    lines.push(`** ${branchLabel(branchIndex, locale)}`);
    for (let subIndex = 1; subIndex <= subCount; subIndex += 1) {
      lines.push(`*** ${subBranchLabel(subIndex, locale)}`);
    }
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`** ${noteText}`);
  }

  lines.push("@endmindmap");
  return lines.join("\n");
}

function buildMermaidMindmap(state: WizardState, locale: AppLocale): string {
  const branchCount = state.typeParams.nodes;
  const subCount = state.typeParams.steps;
  const root = locale === "ru" ? "Корневая тема" : "Root topic";
  const lines = ["mindmap", `  root((${root}))`];

  for (let branchIndex = 1; branchIndex <= branchCount; branchIndex += 1) {
    lines.push(`    ${branchLabel(branchIndex, locale)}`);
    for (let subIndex = 1; subIndex <= subCount; subIndex += 1) {
      lines.push(`      ${subBranchLabel(subIndex, locale)}`);
    }
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`    ${noteText}`);
  }

  return lines.join("\n");
}

function buildMermaidEr(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.entities;
  const lines = ["erDiagram"];

  for (let index = 1; index <= count; index += 1) {
    const name = entityLabel(index, locale).replace(/\s+/g, "_");
    lines.push(`  ${name} {`, `    int id PK`, `    string name`, "  }");
  }

  if (count >= 2) {
    const from = entityLabel(1, locale).replace(/\s+/g, "_");
    const to = entityLabel(2, locale).replace(/\s+/g, "_");
    const rel = locale === "ru" ? "связан с" : "relates to";
    lines.push(`  ${from} ||--o{ ${to} : "${rel}"`);
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`  %% ${noteText}`);
  }

  return lines.join("\n");
}

function buildGraphmlGraph(state: WizardState, locale: AppLocale): string {
  const nodeCount = state.typeParams.nodes;
  const edgeCount = Math.min(
    state.typeParams.edges,
    nodeCount > 1 ? nodeCount - 1 : 0,
  );
  const lines = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<graphml xmlns=\"http://graphml.graphdrawing.org/xmlns\">",
    "  <key id=\"d0\" for=\"node\" attr.name=\"label\" attr.type=\"string\"/>",
    `  <graph edgedefault="directed"${state.direction === "LR" ? ' rankdir="LR"' : ""}>`,
  ];

  for (let index = 1; index <= nodeCount; index += 1) {
    const label = nodeLabel(index, locale);
    lines.push(
      `    <node id="n${index}">`,
      `      <data key="d0">${label}</data>`,
      "    </node>",
    );
  }

  for (let index = 1; index <= edgeCount; index += 1) {
    lines.push(`    <edge source="n${index}" target="n${index + 1}"/>`);
  }

  appendGraphmlClusterStructure(lines, state, locale);
  lines.push("  </graph>", "</graphml>");
  return lines.join("\n");
}

function buildMermaidState(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.states;
  const lines = ["stateDiagram-v2"];

  lines.push(`  [*] --> ${stateLabel(1, locale).replace(/\s+/g, "_")}`);

  for (let index = 1; index < count; index += 1) {
    const from = stateLabel(index, locale).replace(/\s+/g, "_");
    const to = stateLabel(index + 1, locale).replace(/\s+/g, "_");
    lines.push(`  ${from} --> ${to}`);
  }

  lines.push(
    `  ${stateLabel(count, locale).replace(/\s+/g, "_")} --> [*]`,
  );

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`  note right of ${stateLabel(1, locale).replace(/\s+/g, "_")}: ${noteText}`);
  }

  return lines.join("\n");
}

function sliceLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Сегмент ${index}` : `Slice ${index}`;
}

function eventLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Событие ${index}` : `Event ${index}`;
}

function commitLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Коммит ${index}` : `Commit ${index}`;
}

function useCaseLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Сценарий ${index}` : `Use case ${index}`;
}

function serverLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Сервер ${index}` : `Server ${index}`;
}

function signalLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Сигнал ${index}` : `Signal ${index}`;
}

function fieldLabel(index: number, locale: AppLocale): string {
  return locale === "ru" ? `Поле ${index}` : `Field ${index}`;
}

function buildMermaidPie(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.nodes;
  const title = locale === "ru" ? "Распределение" : "Distribution";
  const lines = ["pie showData", `    title ${title}`];

  for (let index = 1; index <= count; index += 1) {
    const label = sliceLabel(index, locale);
    const value = (count - index + 1) * 10;
    lines.push(`    "${label}" : ${value}`);
  }

  return lines.join("\n");
}

function buildMermaidJourney(state: WizardState, locale: AppLocale): string {
  const stepCount = state.typeParams.steps;
  const title = locale === "ru" ? "Путь пользователя" : "User journey";
  const section = locale === "ru" ? "Этап" : "Stage";
  const actor = locale === "ru" ? "Пользователь" : "User";
  const lines = ["journey", `    title ${title}`];

  if (hasStructural(state, "section")) {
    lines.push(`    section ${section} 1`);
  }

  for (let index = 1; index <= stepCount; index += 1) {
    const action = stepLabel(index, locale);
    lines.push(`      ${action}: ${index + 2}: ${actor}`);
  }

  return lines.join("\n");
}

function buildMermaidGitgraph(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.steps;
  const branch = locale === "ru" ? "разработка" : "develop";
  const branchRef = formatMermaidGitRef(branch);
  const lines = ["gitGraph"];

  lines.push(`    commit id: "${commitLabel(1, locale)}"`);
  lines.push(`    branch ${branchRef}`);

  for (let index = 2; index <= count; index += 1) {
    lines.push(`    commit id: "${commitLabel(index, locale)}"`);
  }

  if (count >= 2) {
    lines.push("    checkout main", `    merge ${branchRef}`);
  }

  return lines.join("\n");
}

function buildMermaidTimeline(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.steps;
  const title = locale === "ru" ? "Хронология" : "Timeline";
  const lines = ["timeline", `    title ${title}`];

  if (hasStructural(state, "section")) {
    lines.push(`    section ${locale === "ru" ? "События" : "Events"}`);
  }

  for (let index = 1; index <= count; index += 1) {
    lines.push(`    202${index} : ${eventLabel(index, locale)}`);
  }

  return lines.join("\n");
}

function buildMermaidSankey(state: WizardState, locale: AppLocale): string {
  const nodeCount = state.typeParams.nodes;
  const edgeCount = Math.min(state.typeParams.edges, nodeCount > 1 ? nodeCount - 1 : 0);
  const lines = ["sankey-beta"];

  for (let index = 1; index <= edgeCount; index += 1) {
    const from = nodeLabel(index, locale);
    const to = nodeLabel(index + 1, locale);
    lines.push(
      `    ${formatMermaidSankeyCsvField(from)},${formatMermaidSankeyCsvField(to)},${index * 10}`,
    );
  }

  return lines.join("\n");
}

function buildMermaidXychart(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.steps;
  const title = locale === "ru" ? "Данные" : "Data";
  const yLabel = locale === "ru" ? "Значение" : "Value";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const axisLabels = months.slice(0, count);
  const values = Array.from({ length: count }, (_, index) => (index + 1) * 10);
  const lines = [
    "xychart-beta",
    `    title "${title}"`,
    `    x-axis [${axisLabels.join(", ")}]`,
    `    y-axis "${yLabel}" 0 --> ${count * 15}`,
    `    bar [${values.join(", ")}]`,
  ];

  return lines.join("\n");
}

function buildMermaidBlock(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.nodes;
  const columns = Math.min(count, 3);
  const lines = ["block-beta", `    columns ${columns}`];

  for (let index = 1; index <= count; index += 1) {
    lines.push(`    ${nodeLabel(index, locale)}`);
  }

  return lines.join("\n");
}

function buildMermaidC4Context(state: WizardState, locale: AppLocale): string {
  const actorCount = state.typeParams.actors;
  const externalCount = state.typeParams.externalSystems;
  const title = locale === "ru" ? "Контекст системы" : "System Context";
  const systemName = locale === "ru" ? "Система" : "System";
  const lines = [
    "C4Context",
    `    title ${title}`,
    `    Person(${actorLabel(1, locale).replace(/\s+/g, "_")}, "${actorLabel(1, locale)}", "")`,
  ];

  for (let index = 2; index <= actorCount; index += 1) {
    const label = actorLabel(index, locale);
    lines.push(`    Person(${label.replace(/\s+/g, "_")}, "${label}", "")`);
  }

  lines.push(`    System(${systemName}, "${systemName}", "")`);

  for (let index = 1; index <= externalCount; index += 1) {
    const label = externalSystemLabel(index, locale);
    lines.push(`    System_Ext(${label.replace(/\s+/g, "_")}, "${label}", "")`);
  }

  if (actorCount >= 1) {
    lines.push(
      `    Rel(${actorLabel(1, locale).replace(/\s+/g, "_")}, ${systemName}, "${locale === "ru" ? "использует" : "uses"}")`,
    );
  }

  return lines.join("\n");
}

function buildMermaidRequirement(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.nodes;
  const lines = ["requirementDiagram"];

  for (let index = 1; index <= count; index += 1) {
    const reqId = `req${index}`;
    const text = locale === "ru" ? `Требование ${index}` : `Requirement ${index}`;
    lines.push(
      `    requirement ${reqId} {`,
      `      id: ${index}`,
      `      text: ${formatMermaidRequirementText(text)}`,
      "    }",
    );
  }

  lines.push("    element comp1 {", "      type: component", "    }");
  lines.push("    comp1 - satisfies -> req1");

  return lines.join("\n");
}

function buildMermaidQuadrant(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.nodes;
  const title = locale === "ru" ? "Приоритеты" : "Priorities";
  const quadrantLabel = locale === "ru" ? "Высокий приоритет" : "High priority";
  const lines = [
    "quadrantChart",
    `    title ${formatMermaidRequirementText(title)}`,
    "    x-axis Low --> High",
    "    y-axis Low --> High",
    `    quadrant-1 ${formatMermaidRequirementText(quadrantLabel)}`,
  ];

  for (let index = 1; index <= count; index += 1) {
    const label = nodeLabel(index, locale);
    const x = (0.2 + index * 0.15).toFixed(1);
    const y = (0.3 + index * 0.1).toFixed(1);
    lines.push(`    ${formatMermaidRequirementText(label)}: [${x}, ${y}]`);
  }

  return lines.join("\n");
}

function buildMermaidArchitecture(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.components;
  const groupId = "api";
  const groupLabel = "API";
  const lines = [
    "architecture-beta",
    `    group ${groupId}(cloud)[${groupLabel}]`,
  ];

  for (let index = 1; index <= count; index += 1) {
    const serviceId = `component_${index}`;
    const display = sanitizeMermaidArchitectureLabel(componentLabel(index, locale));
    lines.push(`        service ${serviceId}(server)[${display}] in ${groupId}`);
  }

  if (count >= 2) {
    lines.push("    component_1:R -- L:component_2");
  }

  return lines.join("\n");
}

function buildMermaidPacket(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.steps;
  const title = locale === "ru" ? "Структура пакета" : "Packet structure";
  const lines = ["packet-beta", `    title ${title}`];
  const bitsPerField = Math.floor(32 / count);

  for (let index = 1; index <= count; index += 1) {
    const start = (index - 1) * bitsPerField;
    const end = index === count ? 31 : index * bitsPerField - 1;
    const label = fieldLabel(index, locale);
    lines.push(`    ${start}-${end}: "${label}"`);
  }

  return lines.join("\n");
}

function buildPlantUmlEr(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.entities;
  const title = locale === "ru" ? "ER-диаграмма" : "ER diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  for (let index = 1; index <= count; index += 1) {
    const name = entityLabel(index, locale).replace(/\s+/g, "_");
    lines.push(`entity ${name} {`, "  * id : int", "  --", "  name : string", "}");
  }

  if (count >= 2) {
    const from = entityLabel(1, locale).replace(/\s+/g, "_");
    const to = entityLabel(2, locale).replace(/\s+/g, "_");
    lines.push("", `${from} ||--o{ ${to}`);
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note top of ${entityLabel(1, locale).replace(/\s+/g, "_")}: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlUsecase(state: WizardState, locale: AppLocale): string {
  const actorCount = state.typeParams.actors;
  const useCaseCount = state.typeParams.components;
  const title = locale === "ru" ? "Диаграмма вариантов использования" : "Use case diagram";
  const systemName = locale === "ru" ? "Система" : "System";
  const lines = buildPlantUmlHeader(state, title, true);

  for (let index = 1; index <= actorCount; index += 1) {
    lines.push(`actor ${actorLabel(index, locale).replace(/\s+/g, "_")} as "${actorLabel(index, locale)}"`);
  }

  lines.push("", `rectangle "${systemName}" {`);
  for (let index = 1; index <= useCaseCount; index += 1) {
    const label = useCaseLabel(index, locale);
    lines.push(`  usecase "${label}" as UC${index}`);
  }
  lines.push("}");

  if (actorCount >= 1 && useCaseCount >= 1) {
    lines.push(
      "",
      `${actorLabel(1, locale).replace(/\s+/g, "_")} --> UC1`,
    );
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note right of UC1: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlDeployment(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.nodes;
  const title = locale === "ru" ? "Диаграмма развертывания" : "Deployment diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  for (let index = 1; index <= count; index += 1) {
    const label = serverLabel(index, locale);
    lines.push(`node "${label}" {`);
    if (hasStructural(state, "artifact")) {
      const artifact = locale === "ru" ? "Приложение" : "Application";
      lines.push(`  artifact "${artifact}.war"`);
    }
    lines.push("}");
  }

  if (count >= 2) {
    lines.push("", `"${serverLabel(1, locale)}" --> "${serverLabel(2, locale)}"`);
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note right of "${serverLabel(1, locale)}": ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlObject(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.classes;
  const title = locale === "ru" ? "Диаграмма объектов" : "Object diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  for (let index = 1; index <= count; index += 1) {
    const name = classLabel(index, locale);
    lines.push(`object ${name} {`, `  field${index} = value${index}`, "}");
  }

  if (count >= 2) {
    lines.push("", `${classLabel(1, locale)} --> ${classLabel(2, locale)}`);
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note right of ${classLabel(1, locale)}: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlTiming(state: WizardState, locale: AppLocale): string {
  const signalCount = state.typeParams.participants;
  const stepCount = state.typeParams.steps;
  const title = locale === "ru" ? "Диаграмма синхронизации" : "Timing diagram";
  const lines = buildPlantUmlHeader(state, title, false, false);

  for (let index = 1; index <= signalCount; index += 1) {
    const label = signalLabel(index, locale);
    lines.push(`concise "${label}" as S${index}`);
  }

  lines.push("");
  const noteText = locale === "ru" ? "Примечание" : "Note";
  const includeNote = hasStructural(state, "note");

  for (let stepIndex = 0; stepIndex <= stepCount; stepIndex += 1) {
    const time = stepIndex * 100;
    lines.push(`@${time}`);
    for (let signalIndex = 1; signalIndex <= signalCount; signalIndex += 1) {
      const stateName = stepIndex % 2 === 0 ? "Idle" : "Active";
      lines.push(`S${signalIndex} is ${stateName}`);
    }
    if (includeNote && stepIndex === 0) {
      lines.push(`note top of S1: ${noteText}`);
    }
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlWbs(state: WizardState, locale: AppLocale): string {
  const branchCount = state.typeParams.nodes;
  const subCount = state.typeParams.steps;
  const root = locale === "ru" ? "Проект" : "Project";
  const title = locale === "ru" ? "Иерархия работ" : "Work breakdown";
  const lines = ["@startwbs", `title ${title}`, "", `* ${root}`];

  for (let branchIndex = 1; branchIndex <= branchCount; branchIndex += 1) {
    lines.push(`** ${branchLabel(branchIndex, locale)}`);
    for (let subIndex = 1; subIndex <= subCount; subIndex += 1) {
      lines.push(`*** ${subBranchLabel(subIndex, locale)}`);
    }
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push(`** ${noteText}`);
  }

  lines.push("@endwbs");
  return lines.join("\n");
}

function buildPlantUmlNwdiag(state: WizardState, locale: AppLocale): string {
  const nodeCount = state.typeParams.nodes;
  const edgeCount = Math.min(state.typeParams.edges, nodeCount > 1 ? nodeCount - 1 : 0);
  const title = locale === "ru" ? "Сетевая топология" : "Network topology";
  const lines = [
    "@startnwdiag",
    `title ${title}`,
    "network {",
    "  address = 192.168.0.0/24",
  ];

  for (let index = 1; index <= nodeCount; index += 1) {
    const label = serverLabel(index, locale).replace(/\s+/g, "_").toLowerCase();
    lines.push(`  ${label} [address = 192.168.0.${index}]`);
  }

  for (let index = 1; index <= edgeCount; index += 1) {
    const from = serverLabel(index, locale).replace(/\s+/g, "_").toLowerCase();
    const to = serverLabel(index + 1, locale).replace(/\s+/g, "_").toLowerCase();
    lines.push(`  ${from} -- ${to}`);
  }

  lines.push("}", "@endnwdiag");
  return lines.join("\n");
}

function buildPlantUmlArchimate(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.nodes;
  const title = locale === "ru" ? "ArchiMate" : "ArchiMate";
  const customer = locale === "ru" ? "Клиент" : "Customer";
  const application = locale === "ru" ? "Приложение" : "Application";
  const lines = buildPlantUmlHeader(state, title, true);

  lines.push(
    "!include <archimate/Archimate>",
    "",
    `Business_Actor(customer, "${customer}")`,
  );

  for (let index = 2; index <= count; index += 1) {
    const label = nodeLabel(index, locale);
    lines.push(`Application_Component(app${index}, "${label}")`);
  }

  lines.push(`Application_Component(app1, "${application}")`);
  lines.push("", 'Rel(customer, app1, "Uses")');

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note right of app1: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

export function buildManualScaffold(state: WizardState, locale: AppLocale): string {
  if (state.language === "graphml") {
    return buildGraphmlGraph(state, locale);
  }

  if (state.language === "mermaid") {
    switch (state.diagramType) {
      case "sequence":
        return buildMermaidSequence(state, locale);
      case "class":
        return buildMermaidClass(state, locale);
      case "component":
        return buildMermaidComponent(state, locale);
      case "activity":
        return buildMermaidActivity(state, locale);
      case "state":
        return buildMermaidState(state, locale);
      case "gantt":
        return buildMermaidGantt(state, locale);
      case "mindmap":
        return buildMermaidMindmap(state, locale);
      case "er":
        return buildMermaidEr(state, locale);
      case "flowchart":
        return buildMermaidFlowchart(state, locale);
      case "pie":
        return buildMermaidPie(state, locale);
      case "journey":
        return buildMermaidJourney(state, locale);
      case "gitgraph":
        return buildMermaidGitgraph(state, locale);
      case "timeline":
        return buildMermaidTimeline(state, locale);
      case "sankey":
        return buildMermaidSankey(state, locale);
      case "xychart":
        return buildMermaidXychart(state, locale);
      case "block":
        return buildMermaidBlock(state, locale);
      case "c4_context":
        return buildMermaidC4Context(state, locale);
      case "requirement":
        return buildMermaidRequirement(state, locale);
      case "quadrant":
        return buildMermaidQuadrant(state, locale);
      case "architecture":
        return buildMermaidArchitecture(state, locale);
      case "packet":
        return buildMermaidPacket(state, locale);
      default:
        return buildMermaidFlowchart(state, locale);
    }
  }

  switch (state.diagramType) {
    case "sequence":
      return buildPlantUmlSequence(state, locale);
    case "class":
      return buildPlantUmlClass(state, locale);
    case "component":
      return buildPlantUmlComponent(state, locale);
    case "activity":
      return buildPlantUmlActivity(state, locale);
    case "state":
      return buildPlantUmlState(state, locale);
    case "c4_context":
      return buildPlantUmlC4Context(state, locale);
    case "c4_container":
      return buildPlantUmlC4Container(state, locale);
    case "gantt":
      return buildPlantUmlGantt(state, locale);
    case "mindmap":
      return buildPlantUmlMindmap(state, locale);
    case "er":
      return buildPlantUmlEr(state, locale);
    case "usecase":
      return buildPlantUmlUsecase(state, locale);
    case "deployment":
      return buildPlantUmlDeployment(state, locale);
    case "object":
      return buildPlantUmlObject(state, locale);
    case "timing":
      return buildPlantUmlTiming(state, locale);
    case "wbs":
      return buildPlantUmlWbs(state, locale);
    case "nwdiag":
      return buildPlantUmlNwdiag(state, locale);
    case "archimate":
      return buildPlantUmlArchimate(state, locale);
    default:
      return buildPlantUmlSequence(state, locale);
  }
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
    "You MUST apply the user request fully to the selection — substantive changes, not token-sized edits.",
    "Do not return text identical to the selected fragment.",
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

export function buildPatchFollowUpPrompt(userPrompt: string): string {
  return [
    "Follow-up message in the edit chat. Apply it to the diagram edit.",
    "Return JSON with field replacement containing the NEW text for the selected fragment.",
    "",
    "User follow-up:",
    userPrompt.trim(),
  ].join("\n");
}

export function buildFullDiagramEditPrompt(
  fullSource: string,
  userPrompt: string,
): string {
  const lines = [
    "Edit the ENTIRE PlantUML diagram according to the user request.",
    "Return JSON with field plantuml containing the FULL updated source.",
    "You MUST apply the user request completely. Do not return text identical to the current source.",
    "Include all elements the user asked to add or change; preserve unrelated parts unless the request implies a global rewrite.",
  ];

  if (isActivitySwimlaneDiagram(fullSource)) {
    lines.push("", buildActivitySwimlaneEditHints());
  }

  lines.push(
    "",
    "=== CURRENT DIAGRAM SOURCE ===",
    fullSource,
    "",
    "=== USER REQUEST ===",
    userPrompt.trim(),
  );

  return lines.join("\n");
}

export function buildFullDiagramFollowUpPrompt(userPrompt: string): string {
  return [
    "Follow-up message in the edit chat. Revise the FULL diagram accordingly.",
    "Return JSON with field plantuml containing the complete updated source.",
    "The plantuml field MUST differ from the current source when changes are requested.",
    "",
    "User follow-up:",
    userPrompt.trim(),
  ].join("\n");
}

export function buildFullDiagramNoChangeRetryPrompt(
  userPrompt: string,
  fullSource?: string,
): string {
  const lines = [
    "Your previous response did not change the diagram source.",
    `User request: ${userPrompt.trim()}`,
    "",
    "Return JSON with field plantuml containing a REVISED full diagram that satisfies the request.",
    "The plantuml field MUST differ from the current source.",
    "Do NOT echo the input diagram unchanged.",
  ];

  if (fullSource && isActivitySwimlaneDiagram(fullSource)) {
    lines.push("", buildActivitySwimlaneEditHints());
  }

  return lines.join("\n");
}

export function buildFullDiagramRevertRetryPrompt(
  userPrompt: string,
  validationIssues: string,
): string {
  return [
    "Do NOT return the original unchanged diagram.",
    "You already tried to apply the user request but the result failed validation or was reverted.",
    `User request: ${userPrompt.trim()}`,
    "",
    "Return JSON with field plantuml containing the FULL diagram that:",
    "1) Applies the user request (e.g. new swimlanes, artifacts, steps)",
    "2) Passes PlantUML syntax rules",
    "",
    "Fix these validation errors while keeping the intended changes:",
    validationIssues,
  ].join("\n");
}

function isActivitySwimlaneDiagram(source: string): boolean {
  return (
    /@startuml/i.test(source) &&
    (/swimlane/i.test(source) ||
      /\|[^|\n]+\|/.test(source) ||
      /:\s*[^;]+;\s*$/m.test(source))
  );
}

function buildActivitySwimlaneEditHints(): string {
  return [
    "Activity swimlane editing:",
    "- Add a lane: |#Color|Lane name| (example: |#LightPink|Clients| or |#LightCoral|Customer|).",
    "- Switch lanes with another |...| line before steps in that lane.",
    "- Artifacts: floating note right: Artifact label; or :Create artifact; <<artifact>>;",
    "- Keep @startuml/@enduml and existing skinparam blocks.",
  ].join("\n");
}

export function requestsStructuralDiagramEdit(userPrompt: string): boolean {
  return /swimlane|swim\s*line|артефакт|artifact|дорожк|линию|клиент|customer|lane/i.test(
    userPrompt,
  );
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
