import type { AppLocale } from "@/constants/i18n";

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

export const WIZARD_CREATION_MODES = ["ai", "manual"] as const;

export type WizardCreationMode = (typeof WIZARD_CREATION_MODES)[number];

export const WIZARD_LANGUAGES = ["plantuml", "mermaid"] as const;

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
] as const;

export type WizardParamId = (typeof WIZARD_PARAM_IDS)[number];

export const WIZARD_STEP_IDS = [
  "mode",
  "language",
  "type",
  "direction",
  "style",
  "params",
  "context",
  "prompt",
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
};

const MERMAID_ONLY_TYPES: WizardDiagramType[] = [
  "sequence",
  "class",
  "component",
  "activity",
  "state",
];

const DIRECTION_SUPPORTED_TYPES: WizardDiagramType[] = [
  "class",
  "component",
  "activity",
  "state",
  "c4_context",
  "c4_container",
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

export const DEFAULT_WIZARD_STATE: WizardState = {
  creationMode: "ai",
  language: "plantuml",
  diagramType: "sequence",
  theme: "default",
  direction: "TB",
  typeParams: createDefaultTypeParams(),
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
  return mode === "ai" ? ["plantuml"] : [...WIZARD_LANGUAGES];
}

export function getWizardTypesForLanguage(language: WizardLanguage): WizardDiagramType[] {
  if (language === "mermaid") {
    return [...MERMAID_ONLY_TYPES];
  }

  return [...WIZARD_DIAGRAM_TYPES];
}

export function wizardTypeSupportsDirection(
  diagramType: WizardDiagramType,
  language: WizardLanguage,
): boolean {
  if (language === "mermaid") {
    return ["class", "component", "activity", "state"].includes(diagramType);
  }

  return DIRECTION_SUPPORTED_TYPES.includes(diagramType);
}

export function getWizardSteps(state: WizardState): WizardStepId[] {
  const steps: WizardStepId[] = ["mode", "language", "type"];

  if (wizardTypeSupportsDirection(state.diagramType, state.language)) {
    steps.push("direction");
  }

  steps.push("style", "params");

  if (state.creationMode === "ai") {
    steps.push("context", "prompt", "result");
  } else {
    steps.push("result");
  }

  return steps;
}

export function getWizardStepTitleKey(stepId: WizardStepId): string {
  return `llm.wizard.step.${stepId}`;
}

export function buildWizardPrompt(state: WizardState): string {
  const typeLabel = state.diagramType.replace(/_/g, " ");
  const paramLines = formatTypeParamsForPrompt(state);

  const lines = [
    `Create a new ${state.language === "mermaid" ? "Mermaid" : "PlantUML"} ${typeLabel} diagram.`,
    `Output language/format: ${state.language}.`,
    `Layout direction: ${state.direction}.`,
    `Diagram theme preference: ${state.theme}.`,
  ];

  if (paramLines.length > 0) {
    lines.push("", "Structural parameters:", ...paramLines);
  }

  lines.push(
    "",
    "System / domain context:",
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
): string[] {
  const lines = [
    "@startuml",
    "!pragma layout smetana",
    "",
    `title ${title}`,
    "",
    ...buildPlantUmlThemeBlock(state.theme),
  ];

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
  const lines = buildPlantUmlHeader(state, title, false);

  for (let index = 1; index <= count; index += 1) {
    lines.push(`actor ${participantLabel(index, locale).replace(/\s+/g, "_")}`);
  }

  if (count >= 2) {
    const from = participantLabel(1, locale).replace(/\s+/g, "_");
    const to = participantLabel(2, locale).replace(/\s+/g, "_");
    const message = locale === "ru" ? "сообщение" : "message";
    lines.push("", `${from} -> ${to}: ${message}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlClass(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.classes;
  const title = locale === "ru" ? "Диаграмма классов" : "Class diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  for (let index = 1; index <= count; index += 1) {
    const name = classLabel(index, locale);
    lines.push(`class ${name} {`, `  +field${index}: String`, "}");
  }

  if (count >= 2) {
    lines.push("", `${classLabel(1, locale)} --> ${classLabel(2, locale)}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlComponent(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.components;
  const title = locale === "ru" ? "Диаграмма компонентов" : "Component diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  for (let index = 1; index <= count; index += 1) {
    lines.push(`[${componentLabel(index, locale)}]`);
  }

  if (count >= 2) {
    lines.push(
      "",
      `[${componentLabel(1, locale)}] --> [${componentLabel(2, locale)}]`,
    );
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function buildPlantUmlActivity(state: WizardState, locale: AppLocale): string {
  const laneCount = state.typeParams.lanes;
  const stepCount = state.typeParams.steps;
  const title = locale === "ru" ? "Диаграмма активности" : "Activity diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  for (let laneIndex = 1; laneIndex <= laneCount; laneIndex += 1) {
    const color = SWIMLANE_COLORS[(laneIndex - 1) % SWIMLANE_COLORS.length];
    lines.push(`|${color}|${laneLabel(laneIndex, locale)}|`);
  }

  lines.push("", "start");

  for (let stepIndex = 1; stepIndex <= stepCount; stepIndex += 1) {
    const laneIndex = ((stepIndex - 1) % laneCount) + 1;
    lines.push(`|${laneLabel(laneIndex, locale)}|`, `:${stepLabel(stepIndex, locale)};`);
  }

  lines.push("stop", "@enduml");
  return lines.join("\n");
}

function buildPlantUmlState(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.states;
  const title = locale === "ru" ? "Диаграмма состояний" : "State diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  lines.push("[*] --> " + stateLabel(1, locale));

  for (let index = 1; index < count; index += 1) {
    lines.push(`${stateLabel(index, locale)} --> ${stateLabel(index + 1, locale)}`);
  }

  lines.push(stateLabel(count, locale) + " --> [*]", "@enduml");
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

  return lines.join("\n");
}

function buildMermaidClass(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.classes;
  const direction = state.direction === "LR" ? "LR" : "TB";
  const lines = ["classDiagram", `  direction ${direction}`];

  for (let index = 1; index <= count; index += 1) {
    const name = classLabel(index, locale);
    lines.push(`  class ${name}`);
  }

  if (count >= 2) {
    lines.push(`  ${classLabel(1, locale)} --> ${classLabel(2, locale)}`);
  }

  return lines.join("\n");
}

function buildMermaidFlowchart(
  state: WizardState,
  locale: AppLocale,
): string {
  const nodeCount = state.typeParams.components || state.typeParams.nodes;
  const flow = mermaidFlowDirection(state.direction);
  const startLabel = locale === "ru" ? "Старт" : "Start";
  const endLabel = locale === "ru" ? "Готово" : "Done";
  const lines = [`flowchart ${flow}`, `  A([${startLabel})]`];

  for (let index = 1; index <= nodeCount; index += 1) {
    const label = nodeLabel(index, locale);
    const nodeId = `N${index}`;
    lines.push(`  ${nodeId}[${label}]`);
  }

  lines.push(`  Z([${endLabel})]`);

  if (nodeCount >= 1) {
    lines.push(`  A --> N1`);
    for (let index = 1; index < nodeCount; index += 1) {
      lines.push(`  N${index} --> N${index + 1}`);
    }
    lines.push(`  N${nodeCount} --> Z`);
  } else {
    lines.push("  A --> Z");
  }

  return lines.join("\n");
}

function buildMermaidActivity(state: WizardState, locale: AppLocale): string {
  return buildMermaidFlowchart(state, locale);
}

function buildMermaidComponent(state: WizardState, locale: AppLocale): string {
  return buildMermaidFlowchart(state, locale);
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

  return lines.join("\n");
}

export function buildManualScaffold(state: WizardState, locale: AppLocale): string {
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

export function buildFullDiagramEditPrompt(
  fullSource: string,
  userPrompt: string,
): string {
  const lines = [
    "Edit the ENTIRE PlantUML diagram according to the user request.",
    "Return JSON with field plantuml containing the FULL updated source.",
    "You MUST apply the user request. Do not return text identical to the current source.",
    "Preserve parts of the diagram that the user did not ask to change unless the request implies a global rewrite.",
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
