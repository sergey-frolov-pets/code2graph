import type { AppLocale } from "@/constants/i18n";
import { wizardCopy } from "@/services/llm/wizard/wizard-copy";
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
  entityLabel,
  externalSystemLabel,
  hasStructural,
  laneLabel,
  nodeLabel,
  participantLabel,
  plantUmlStateDeclaration,
  plantUmlStateRef,
  serverLabel,
  signalLabel,
  stepLabel,
  subBranchLabel,
  SWIMLANE_COLORS,
  taskLabel,
  useCaseLabel,
} from "@/services/llm/wizard/scaffold-shared";

export function buildPlantUmlSequence(
  state: WizardState,
  locale: AppLocale,
): string {
  const count = state.typeParams.participants;
  const title = wizardCopy(locale, "sequenceDiagram");
  const lines = buildPlantUmlHeader(state, title, false, false);

  for (let index = 1; index <= count; index += 1) {
    lines.push(`actor ${participantLabel(index, locale).replace(/\s+/g, "_")}`);
  }

  if (count >= 2) {
    const from = participantLabel(1, locale).replace(/\s+/g, "_");
    const to = participantLabel(2, locale).replace(/\s+/g, "_");
    const message = wizardCopy(locale, "message");
    lines.push("", `${from} -> ${to}: ${message}`);
  }

  appendPlantUmlSequenceStructure(lines, state, locale);
  lines.push("@enduml");
  return lines.join("\n");
}

export function buildPlantUmlClass(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.classes;
  const title = wizardCopy(locale, "classDiagram");
  const lines = buildPlantUmlHeader(state, title, true);

  if (hasStructural(state, "package")) {
    const packageName = wizardCopy(locale, "domain");
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
  const title = wizardCopy(locale, "componentDiagram");
  const lines = buildPlantUmlHeader(state, title, true);

  if (hasStructural(state, "package")) {
    const packageName = wizardCopy(locale, "domain");
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
  const title = wizardCopy(locale, "activityDiagram");
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

export function buildPlantUmlState(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.states;
  const title = wizardCopy(locale, "stateDiagram");
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

export function buildPlantUmlC4Context(state: WizardState, locale: AppLocale): string {
  const actorCount = state.typeParams.actors;
  const externalCount = state.typeParams.externalSystems;
  const title = wizardCopy(locale, "c4Context");
  const systemName = wizardCopy(locale, "system");
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
      `Rel(${actorLabel(1, locale).replace(/\s+/g, "_")}, ${systemName}, "${wizardCopy(locale, "uses")}")`,
    );
  }

  if (hasStructural(state, "boundary")) {
    const boundary = wizardCopy(locale, "boundary");
    lines.push("", `System_Boundary(${boundary}, "${boundary}") {`, `  System(${systemName}, "${systemName}", "")`, "}");
  }

  if (hasStructural(state, "note")) {
    const noteText = wizardCopy(locale, "note");
    lines.push("", `note right of ${systemName}: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

export function buildPlantUmlC4Container(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.containers;
  const title = wizardCopy(locale, "c4Container");
  const systemName = wizardCopy(locale, "system");
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
      `Rel(${from}, ${to}, "${wizardCopy(locale, "calls")}")`,
    );
  }

  if (hasStructural(state, "queue")) {
    const queue = wizardCopy(locale, "queue");
    lines.push("", `ContainerQueue(${queue}, "${queue}", "")`);
  }

  if (hasStructural(state, "note")) {
    const noteText = wizardCopy(locale, "note");
    lines.push("", `note right of ${containerLabel(1, locale).replace(/\s+/g, "_")}: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

export function buildPlantUmlGantt(state: WizardState, locale: AppLocale): string {
  const taskCount = state.typeParams.tasks;
  const title = wizardCopy(locale, "ganttChart");
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
  const root = wizardCopy(locale, "rootTopic");
  const title = wizardCopy(locale, "mindMap");
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
    const noteText = wizardCopy(locale, "note");
    lines.push(`** ${noteText}`);
  }

  lines.push("@endmindmap");
  return lines.join("\n");
}

export function buildPlantUmlEr(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.entities;
  const title = wizardCopy(locale, "erDiagram");
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
    const noteText = wizardCopy(locale, "note");
    lines.push("", `note top of ${entityLabel(1, locale).replace(/\s+/g, "_")}: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

export function buildPlantUmlUsecase(state: WizardState, locale: AppLocale): string {
  const actorCount = state.typeParams.actors;
  const useCaseCount = state.typeParams.components;
  const title = wizardCopy(locale, "useCaseDiagram");
  const systemName = wizardCopy(locale, "system");
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
    const noteText = wizardCopy(locale, "note");
    lines.push("", `note right of UC1: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

export function buildPlantUmlDeployment(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.nodes;
  const title = wizardCopy(locale, "deploymentDiagram");
  const lines = buildPlantUmlHeader(state, title, true);

  for (let index = 1; index <= count; index += 1) {
    const label = serverLabel(index, locale);
    lines.push(`node "${label}" {`);
    if (hasStructural(state, "artifact")) {
      const artifact = wizardCopy(locale, "application");
      lines.push(`  artifact "${artifact}.war"`);
    }
    lines.push("}");
  }

  if (count >= 2) {
    lines.push("", `"${serverLabel(1, locale)}" --> "${serverLabel(2, locale)}"`);
  }

  if (hasStructural(state, "note")) {
    const noteText = wizardCopy(locale, "note");
    lines.push("", `note right of "${serverLabel(1, locale)}": ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

export function buildPlantUmlObject(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.classes;
  const title = wizardCopy(locale, "objectDiagram");
  const lines = buildPlantUmlHeader(state, title, true);

  for (let index = 1; index <= count; index += 1) {
    const name = classLabel(index, locale);
    lines.push(`object ${name} {`, `  field${index} = value${index}`, "}");
  }

  if (count >= 2) {
    lines.push("", `${classLabel(1, locale)} --> ${classLabel(2, locale)}`);
  }

  if (hasStructural(state, "note")) {
    const noteText = wizardCopy(locale, "note");
    lines.push("", `note right of ${classLabel(1, locale)}: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

export function buildPlantUmlTiming(state: WizardState, locale: AppLocale): string {
  const signalCount = state.typeParams.participants;
  const stepCount = state.typeParams.steps;
  const title = wizardCopy(locale, "timingDiagram");
  const lines = buildPlantUmlHeader(state, title, false, false);

  for (let index = 1; index <= signalCount; index += 1) {
    const label = signalLabel(index, locale);
    lines.push(`concise "${label}" as S${index}`);
  }

  lines.push("");
  const noteText = wizardCopy(locale, "note");
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

export function buildPlantUmlWbs(state: WizardState, locale: AppLocale): string {
  const branchCount = state.typeParams.nodes;
  const subCount = state.typeParams.steps;
  const root = wizardCopy(locale, "project");
  const title = wizardCopy(locale, "workBreakdown");
  const lines = ["@startwbs", `title ${title}`, "", `* ${root}`];

  for (let branchIndex = 1; branchIndex <= branchCount; branchIndex += 1) {
    lines.push(`** ${branchLabel(branchIndex, locale)}`);
    for (let subIndex = 1; subIndex <= subCount; subIndex += 1) {
      lines.push(`*** ${subBranchLabel(subIndex, locale)}`);
    }
  }

  if (hasStructural(state, "note")) {
    const noteText = wizardCopy(locale, "note");
    lines.push(`** ${noteText}`);
  }

  lines.push("@endwbs");
  return lines.join("\n");
}

export function buildPlantUmlNwdiag(state: WizardState, locale: AppLocale): string {
  const nodeCount = state.typeParams.nodes;
  const edgeCount = Math.min(state.typeParams.edges, nodeCount > 1 ? nodeCount - 1 : 0);
  const title = wizardCopy(locale, "networkTopology");
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

export function buildPlantUmlArchimate(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.nodes;
  const title = wizardCopy(locale, "archimate");
  const customer = wizardCopy(locale, "customer");
  const application = wizardCopy(locale, "application");
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
  lines.push("", 'Rel_Triggering(customer, app1, "Uses")');

  if (hasStructural(state, "note")) {
    const noteText = wizardCopy(locale, "note");
    lines.push("", `note right of app1: ${noteText}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}
