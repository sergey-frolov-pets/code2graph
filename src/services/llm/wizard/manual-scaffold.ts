import type { AppLocale } from "@/constants/i18n";
import type {
  WizardDiagramDirection,
  WizardDiagramTheme,
  WizardState,
  WizardStructuralElementId,
} from "@/constants/llm-wizard";

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

function buildPlantUmlState(state: WizardState, locale: AppLocale): string {
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
  const nodeCount = state.typeParams.components || state.typeParams.nodes;
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
  return buildMermaidFlowchart(state, locale);
}

function buildMermaidComponent(state: WizardState, locale: AppLocale): string {
  return buildMermaidFlowchart(state, locale);
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
    lines.push("", stateLabel(1, locale) + " --> choice");
    lines.push("choice --> " + stateLabel(2, locale));
  }

  if (hasStructural(state, "fork")) {
    lines.push("", stateLabel(1, locale) + " --> fork");
    lines.push("fork --> " + stateLabel(2, locale));
  }

  if (hasStructural(state, "note")) {
    const noteText = locale === "ru" ? "Примечание" : "Note";
    lines.push("", `note right of ${stateLabel(1, locale)}: ${noteText}`);
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
    default:
      return buildPlantUmlSequence(state, locale);
  }
}
