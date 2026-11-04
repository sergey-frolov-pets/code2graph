import type { AppLocale } from "@/constants/i18n";
import type { WizardDiagramDirection, WizardState } from "@/constants/llm-wizard";
import {
  formatMermaidRequirementText,
  formatMermaidSankeyCsvField,
  sanitizeMermaidArchitectureLabel,
} from "@/services/conversion/emit/mermaid-emit-utils";
import {
  actorLabel,
  appendGraphmlClusterStructure,
  appendMermaidFlowStructure,
  appendMermaidGanttStructure,
  appendMermaidSequenceStructure,
  branchLabel,
  classLabel,
  commitLabel,
  componentLabel,
  entityLabel,
  eventLabel,
  externalSystemLabel,
  fieldLabel,
  hasStructural,
  nodeLabel,
  participantLabel,
  sliceLabel,
  stateLabel,
  stepLabel,
  subBranchLabel,
  taskLabel,
} from "@/services/llm/wizard/scaffold-shared";
import { formatMermaidGitRef } from "@/utils/mermaid-gitgraph";

export function mermaidFlowDirection(direction: WizardDiagramDirection): string {
  return direction === "LR" ? "LR" : "TD";
}

export function buildMermaidSequence(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidClass(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidFlowchart(
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

export function buildMermaidActivity(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidComponent(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidGantt(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidMindmap(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidEr(state: WizardState, locale: AppLocale): string {
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

export function buildGraphmlGraph(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidState(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidPie(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidJourney(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidGitgraph(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidTimeline(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidSankey(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidXychart(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidBlock(state: WizardState, locale: AppLocale): string {
  const count = state.typeParams.nodes;
  const columns = Math.min(count, 3);
  const lines = ["block-beta", `    columns ${columns}`];

  for (let index = 1; index <= count; index += 1) {
    lines.push(`    ${nodeLabel(index, locale)}`);
  }

  return lines.join("\n");
}

export function buildMermaidC4Context(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidRequirement(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidQuadrant(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidArchitecture(state: WizardState, locale: AppLocale): string {
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

export function buildMermaidPacket(state: WizardState, locale: AppLocale): string {
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
