import type { AppLocale } from "@/constants/i18n";
import type { WizardDiagramDirection, WizardState } from "@/constants/llm-wizard";
import {
  appendGraphmlClusterStructure,
  appendMermaidFlowStructure,
  appendMermaidGanttStructure,
  appendMermaidSequenceStructure,
  branchLabel,
  classLabel,
  componentLabel,
  entityLabel,
  hasStructural,
  nodeLabel,
  participantLabel,
  stateLabel,
  stepLabel,
  subBranchLabel,
  taskLabel,
} from "@/services/llm/wizard/scaffold-shared";

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
