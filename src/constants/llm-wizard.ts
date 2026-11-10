import type { LocaleKey } from "@/locales/types";
import {
  AGENT_DIAGRAM_LANGUAGES,
  AGENT_TYPES_BY_LANGUAGE,
} from "@shared/agent-diagram";
import { buildManualScaffold } from "@/services/llm/wizard/manual-scaffold";

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
  "wireframe",
] as const;

export type WizardDiagramType = (typeof WIZARD_DIAGRAM_TYPES)[number];

export const WIZARD_DIAGRAM_DIRECTIONS = ["TB", "LR"] as const;

export type WizardDiagramDirection = (typeof WIZARD_DIAGRAM_DIRECTIONS)[number];

export const WIZARD_DIAGRAM_THEMES = ["default", "dark"] as const;

export type WizardDiagramTheme = (typeof WIZARD_DIAGRAM_THEMES)[number];

export const WIZARD_CREATION_MODES = ["manual", "builder"] as const;

export type WizardCreationMode = (typeof WIZARD_CREATION_MODES)[number];

export const WIZARD_LANGUAGES = AGENT_DIAGRAM_LANGUAGES;

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
  "result",
  "builder-data",
  "builder-canvas",
  "builder-options",
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
  wireframe: [{ id: "steps", min: 1, max: 8, default: 3 }],
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
  wireframe: [],
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

  if (
    language === "d2" ||
    language === "structurizr" ||
    language === "wiremark"
  ) {
    return [];
  }

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

export function getWizardLanguagesForMode(
  _mode: WizardCreationMode,
): WizardLanguage[] {
  return [...WIZARD_LANGUAGES];
}

export function getWizardTypesForLanguage(language: WizardLanguage): WizardDiagramType[] {
  return [...AGENT_TYPES_BY_LANGUAGE[language]];
}

export function isWizardLanguageAiSupported(language: WizardLanguage): boolean {
  return WIZARD_LANGUAGES.includes(language);
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

  if (language === "d2") {
    return AGENT_TYPES_BY_LANGUAGE.d2.includes(diagramType);
  }

  if (language === "structurizr") {
    return AGENT_TYPES_BY_LANGUAGE.structurizr.includes(diagramType);
  }

  if (language === "wiremark") {
    return false;
  }

  return DIRECTION_SUPPORTED_TYPES.includes(diagramType);
}

export function getWizardSteps(state: WizardState): WizardStepId[] {
  const steps: WizardStepId[] = [];

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

export function getWizardStepTitleKey(stepId: WizardStepId): LocaleKey {
  return `llm.wizard.step.${stepId}`;
}

export function resolveWizardStateWithDefaults(
  state: WizardState,
  visitedStepIds: readonly WizardStepId[],
): WizardState {
  const visited = new Set(visitedStepIds);
  const resolved: WizardState = {
    creationMode: state.creationMode,
    language: state.language,
    diagramType: state.diagramType,
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

export { buildManualScaffold };
