import type { AppLocale } from "@/constants/i18n";
import type { WizardState } from "@/constants/llm-wizard";
import {
  actorLabel,
  appendPlantUmlActivityStructure,
  appendPlantUmlClassStructure,
  appendPlantUmlComponentStructure,
  appendPlantUmlGanttStructure,
  appendPlantUmlSequenceStructure,
  appendPlantUmlStateStructure,
  branchLabel,
  buildPlantUmlDirectionLine,
  buildPlantUmlHeader,
  buildPlantUmlThemeBlock,
  classLabel,
  componentLabel,
  containerLabel,
  externalSystemLabel,
  hasStructural,
  laneLabel,
  participantLabel,
  stateLabel,
  stepLabel,
  subBranchLabel,
  SWIMLANE_COLORS,
  taskLabel,
} from "@/services/llm/wizard/scaffold-shared";

export function buildPlantUmlSequence(
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

  appendPlantUmlSequenceStructure(lines, state, locale);
  lines.push("@enduml");
  return lines.join("\n");
}

export function buildPlantUmlClass(state: WizardState, locale: AppLocale): string {
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

export function buildPlantUmlComponent(state: WizardState, locale: AppLocale): string {
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

export function buildPlantUmlActivity(state: WizardState, locale: AppLocale): string {
  const laneCount = state.typeParams.lanes;
  const stepCount = state.typeParams.steps;
  const title = locale === "ru" ? "Диаграмма активности" : "Activity diagram";
  const lines = buildPlantUmlHeader(state, title, false);

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

export function buildPlantUmlState(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.states;
  const title = locale === "ru" ? "Диаграмма состояний" : "State diagram";
  const lines = buildPlantUmlHeader(state, title, true);

  lines.push("[*] --> " + stateLabel(1, locale));

  for (let index = 1; index < count; index += 1) {
    lines.push(`${stateLabel(index, locale)} --> ${stateLabel(index + 1, locale)}`);
  }

  lines.push(stateLabel(count, locale) + " --> [*]");
  appendPlantUmlStateStructure(lines, state, locale);
  lines.push("@enduml");
  return lines.join("\n");
}

export function buildPlantUmlC4Context(state: WizardState, locale: AppLocale): string {
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

export function buildPlantUmlC4Container(state: WizardState, locale: AppLocale): string {
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

export function buildPlantUmlGantt(state: WizardState, locale: AppLocale): string {
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

export function buildPlantUmlMindmap(state: WizardState, locale: AppLocale): string {
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

