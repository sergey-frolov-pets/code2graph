import type { DiagramIR } from "@/services/conversion/diagram-ir";
import {
  escapeMermaidQuoted,
  flattenMermaidLabel,
  formatMermaidNodeLabel,
  formatMermaidRequirementText,
  formatMermaidSankeyCsvField,
  sanitizeMermaidArchitectureLabel,
  toMermaidArchitectureServiceId,
} from "@/services/conversion/emit/mermaid-emit-utils";
import { formatMermaidGitRef } from "@/utils/mermaid-gitgraph";
import {
  emitPlantUmlComponentNode,
  escapePlantUmlQuoted,
  flattenPlantUmlLabel,
  formatPlantUmlActivityLabel,
  formatPlantUmlEdgeSuffix,
} from "@/services/conversion/emit/plantuml-emit-utils";

function flowDirection(ir: DiagramIR): string {
  return ir.direction === "LR" ? "LR" : "TD";
}

function wrapPlantUml(body: string): string {
  return `@startuml\n!pragma layout smetana\n\n${body}\n@enduml`;
}

export function emitMermaidMindmap(ir: DiagramIR): string {
  const lines = ["mindmap"];
  const root = ir.nodes[0];
  if (root) {
    lines.push(`  root((${escapeMermaidQuoted(root.label)}))`);
  }
  for (const node of ir.nodes.slice(1)) {
    lines.push(`    ${escapeMermaidQuoted(node.label)}`);
  }
  return lines.join("\n");
}

export function emitMermaidPie(ir: DiagramIR): string {
  const lines = ["pie showData"];
  if (ir.extras?.title) {
    lines.push(`    title ${ir.extras.title}`);
  }
  const slices = ir.extras?.slices ?? ir.nodes.map((node, index) => ({
    label: node.label,
    value: Number(node.semantic?.value ?? (index + 1) * 10),
  }));
  for (const slice of slices) {
    lines.push(`    "${escapeMermaidQuoted(slice.label)}" : ${slice.value}`);
  }
  return lines.join("\n");
}

export function emitMermaidJourney(ir: DiagramIR): string {
  const lines = ["journey"];
  if (ir.extras?.title) {
    lines.push(`    title ${ir.extras.title}`);
  }
  const tasks = ir.extras?.journeyTasks ?? ir.nodes.map((node, index) => ({
    section: undefined as string | undefined,
    action: node.label,
    score: index + 3,
    actor: "User",
  }));
  let currentSection: string | undefined;
  for (const task of tasks) {
    if (task.section && task.section !== currentSection) {
      currentSection = task.section;
      lines.push(`    section ${currentSection}`);
    }
    lines.push(`      ${task.action}: ${task.score}: ${task.actor}`);
  }
  return lines.join("\n");
}

export function emitMermaidGitgraph(ir: DiagramIR): string {
  const lines = ["gitGraph"];
  const actions = ir.extras?.gitActions;
  if (actions && actions.length > 0) {
    for (const action of actions) {
      switch (action.type) {
        case "commit":
          lines.push(action.id ? `    commit id: "${escapeMermaidQuoted(action.id)}"` : "    commit");
          break;
        case "branch":
          lines.push(`    branch ${formatMermaidGitRef(action.branch ?? "")}`);
          break;
        case "checkout":
          lines.push(`    checkout ${formatMermaidGitRef(action.branch ?? "")}`);
          break;
        case "merge":
          lines.push(`    merge ${formatMermaidGitRef(action.branch ?? "")}`);
          break;
      }
    }
    return lines.join("\n");
  }
  for (const node of ir.nodes) {
    lines.push(`    commit id: "${escapeMermaidQuoted(node.label)}"`);
  }
  return lines.join("\n");
}

export function emitMermaidTimeline(ir: DiagramIR): string {
  const lines = ["timeline"];
  if (ir.extras?.title) {
    lines.push(`    title ${ir.extras.title}`);
  }
  const events = ir.extras?.timelineEvents ?? ir.nodes.map((node, index) => ({
    date: String(2020 + index),
    event: node.label,
    section: undefined as string | undefined,
  }));
  let currentSection: string | undefined;
  for (const event of events) {
    if (event.section && event.section !== currentSection) {
      currentSection = event.section;
      lines.push(`    section ${currentSection}`);
    }
    lines.push(`    ${event.date} : ${event.event}`);
  }
  return lines.join("\n");
}

export function emitMermaidSankey(ir: DiagramIR): string {
  const lines = ["sankey-beta"];
  const flows = ir.extras?.sankeyFlows ?? ir.edges.map((edge) => ({
    source: ir.nodes.find((node) => node.id === edge.source)?.label ?? edge.source,
    target: ir.nodes.find((node) => node.id === edge.target)?.label ?? edge.target,
    value: Number(edge.label ?? 10),
  }));
  for (const flow of flows) {
    lines.push(
      `    ${formatMermaidSankeyCsvField(flow.source)},${formatMermaidSankeyCsvField(flow.target)},${flow.value}`,
    );
  }
  return lines.join("\n");
}

export function emitMermaidXychart(ir: DiagramIR): string {
  const chart = ir.extras?.chartData;
  const lines = ["xychart-beta"];
  if (ir.extras?.title) {
    lines.push(`    title "${escapeMermaidQuoted(ir.extras.title)}"`);
  }
  const xLabels = chart?.xLabels ?? ir.nodes.map((node) => node.label);
  lines.push(`    x-axis [${xLabels.join(", ")}]`);
  lines.push(`    y-axis "${chart?.yAxis ?? "Value"}" ${chart?.yMin ?? 0} --> ${chart?.yMax ?? 100}`);
  if (chart?.bar) {
    lines.push(`    bar [${chart.bar.join(", ")}]`);
  } else if (chart?.line) {
    lines.push(`    line [${chart.line.join(", ")}]`);
  } else {
    lines.push(`    bar [${xLabels.map((_, index) => (index + 1) * 10).join(", ")}]`);
  }
  return lines.join("\n");
}

export function emitMermaidBlock(ir: DiagramIR): string {
  const columns = ir.extras?.blockColumns ?? 3;
  const lines = ["block-beta", `    columns ${columns}`];
  for (const node of ir.nodes) {
    lines.push(`    ${node.label}`);
  }
  return lines.join("\n");
}

export function emitMermaidC4(ir: DiagramIR): string {
  const keyword = ir.kind === "c4_container" ? "C4Container" : "C4Context";
  const lines = [keyword];
  for (const node of ir.nodes) {
    const c4Type = String(node.semantic?.c4Type ?? "System");
    lines.push(`    ${c4Type}(${node.id}, "${escapeMermaidQuoted(node.label)}", "")`);
  }
  for (const edge of ir.edges) {
    const label = edge.label ? `, "${escapeMermaidQuoted(edge.label)}"` : ', ""';
    lines.push(`    Rel(${edge.source}, ${edge.target}${label})`);
  }
  return lines.join("\n");
}

export function emitMermaidRequirement(ir: DiagramIR): string {
  const lines = ["requirementDiagram"];
  const requirements = ir.extras?.requirements ?? ir.nodes
    .filter((node) => node.semantic?.requirementId || node.label)
    .map((node, index) => ({
      id: String(node.semantic?.requirementId ?? node.id),
      numericId: index + 1,
      text: node.label,
    }));
  for (const req of requirements) {
    lines.push(
      `    requirement ${req.id} {`,
      `      id: ${req.numericId ?? 1}`,
      `      text: ${formatMermaidRequirementText(req.text)}`,
      "    }",
    );
  }
  for (const edge of ir.edges) {
    if (edge.kind === "satisfies") {
      lines.push(`    ${edge.source} - satisfies -> ${edge.target}`);
    }
  }
  return lines.join("\n");
}

export function emitMermaidQuadrant(ir: DiagramIR): string {
  const axes = ir.extras?.quadrantAxes;
  const title = ir.extras?.title ?? "Priorities";
  const lines = [
    "quadrantChart",
    `    title ${formatMermaidRequirementText(title)}`,
    `    x-axis ${axes?.xFrom ?? "Low"} --> ${axes?.xTo ?? "High"}`,
    `    y-axis ${axes?.yFrom ?? "Low"} --> ${axes?.yTo ?? "High"}`,
    `    quadrant-1 ${formatMermaidRequirementText("High priority")}`,
  ];
  const items = ir.extras?.quadrantItems ?? ir.nodes.map((node, index) => ({
    label: node.label,
    x: Number(node.semantic?.x ?? 0.2 + index * 0.15),
    y: Number(node.semantic?.y ?? 0.3 + index * 0.1),
  }));
  for (const item of items) {
    lines.push(`    ${formatMermaidRequirementText(item.label)}: [${item.x}, ${item.y}]`);
  }
  return lines.join("\n");
}

export function emitMermaidArchitecture(ir: DiagramIR): string {
  const lines = ["architecture-beta"];
  const group = ir.groups?.[0];
  const groupId = group?.id && /^[a-zA-Z][\w]*$/.test(group.id) ? group.id : "api";
  const groupLabel = sanitizeMermaidArchitectureLabel(group?.label ?? "API");
  lines.push(`    group ${groupId}(cloud)[${groupLabel}]`);

  const services = ir.extras?.architectureServices ?? ir.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    icon: String(node.semantic?.icon ?? "server"),
  }));

  for (let index = 0; index < services.length; index += 1) {
    const service = services[index];
    const serviceId = toMermaidArchitectureServiceId(service.id, index + 1);
    const label = sanitizeMermaidArchitectureLabel(service.label);
    lines.push(
      `        service ${serviceId}(${service.icon ?? "server"})[${label}] in ${groupId}`,
    );
  }

  for (const edge of ir.edges) {
    const source = toMermaidArchitectureServiceId(edge.source);
    const target = toMermaidArchitectureServiceId(edge.target);
    lines.push(`    ${source}:R -- L:${target}`);
  }

  return lines.join("\n");
}

export function emitMermaidPacket(ir: DiagramIR): string {
  const lines = ["packet-beta"];
  if (ir.extras?.title) {
    lines.push(`    title ${ir.extras.title}`);
  }
  const fields = ir.extras?.packetFields ?? ir.nodes.map((node, index) => ({
    start: index * 8,
    end: index * 8 + 7,
    label: node.label,
  }));
  for (const field of fields) {
    lines.push(`    ${field.start}-${field.end}: "${escapeMermaidQuoted(field.label)}"`);
  }
  return lines.join("\n");
}

export function emitMermaidFlowchart(ir: DiagramIR): string {
  const lines = [`flowchart ${flowDirection(ir)}`];
  for (const node of ir.nodes) {
    const shape =
      node.kind === "decision"
        ? `{${escapeMermaidQuoted(node.label)}}`
        : node.kind === "start" || node.kind === "end"
          ? `(["${escapeMermaidQuoted(node.label)}"])`
          : formatMermaidNodeLabel(node.label);
    lines.push(`  ${node.id}${shape}`);
  }
  for (const edge of ir.edges) {
    const label = edge.label ? `|${escapeMermaidQuoted(edge.label)}|` : "";
    lines.push(`  ${edge.source} -->${label} ${edge.target}`);
  }
  return lines.join("\n");
}

export function emitPlantUmlEr(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const node of ir.nodes) {
    lines.push(`entity ${node.id} {`, "  * id : int", "  --", "  name : string", "}");
  }
  for (const edge of ir.edges) {
    lines.push(`${edge.source} ||--o{ ${edge.target}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlMindmap(ir: DiagramIR): string {
  const lines = ["@startmindmap"];
  if (ir.direction === "LR") {
    lines.push("left to right direction");
  }
  const items = ir.extras?.wbsItems ?? ir.nodes.map((node, index) => ({
    level: index === 0 ? 1 : 2,
    label: node.label,
  }));
  for (const item of items) {
    lines.push(`${"*".repeat(item.level)} ${item.label}`);
  }
  lines.push("@endmindmap");
  return lines.join("\n");
}

export function emitPlantUmlUsecase(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  const actors = ir.nodes.filter((node) => node.kind === "actor");
  const useCases = ir.nodes.filter((node) => node.kind === "usecase");
  for (const actor of actors) {
    lines.push(`actor ${actor.id} as "${escapePlantUmlQuoted(actor.label)}"`);
  }
  const boundary = ir.extras?.systemBoundary ?? "System";
  lines.push("", `rectangle "${escapePlantUmlQuoted(boundary)}" {`);
  for (const useCase of useCases) {
    lines.push(`  usecase "${escapePlantUmlQuoted(useCase.label)}" as ${useCase.id}`);
  }
  lines.push("}");
  for (const edge of ir.edges) {
    lines.push(`${edge.source} --> ${edge.target}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlDeployment(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const node of ir.nodes) {
    lines.push(`node "${escapePlantUmlQuoted(node.label)}" {`, "}");
  }
  for (const edge of ir.edges) {
    const from = ir.nodes.find((node) => node.id === edge.source)?.label ?? edge.source;
    const to = ir.nodes.find((node) => node.id === edge.target)?.label ?? edge.target;
    lines.push(`"${escapePlantUmlQuoted(from)}" --> "${escapePlantUmlQuoted(to)}"`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlObject(ir: DiagramIR): string {
  const lines: string[] = [];
  for (const node of ir.nodes) {
    const fields = ir.extras?.objectFields?.[node.id] ?? [];
    lines.push(`object ${node.id} {`);
    for (const field of fields) {
      lines.push(`  ${field.name} = ${field.value}`);
    }
    lines.push("}");
  }
  for (const edge of ir.edges) {
    lines.push(`${edge.source} --> ${edge.target}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlTiming(ir: DiagramIR): string {
  const lines: string[] = [];
  const signals = ir.extras?.timingSignals ?? ir.nodes.map((node) => ({
    name: node.id,
    states: [{ time: 0, state: "Idle" }, { time: 100, state: "Active" }],
  }));
  for (const signal of signals) {
    lines.push(`concise "${signal.name}" as ${signal.name}`);
  }
  lines.push("");
  const times = [...new Set(signals.flatMap((signal) => signal.states.map((state) => state.time)))].sort((a, b) => a - b);
  for (const time of times) {
    lines.push(`@${time}`);
    for (const signal of signals) {
      const state = signal.states.find((item) => item.time === time)?.state ?? "Idle";
      lines.push(`${signal.name} is ${state}`);
    }
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlWbs(ir: DiagramIR): string {
  const lines = ["@startwbs"];
  const items = ir.extras?.wbsItems ?? ir.nodes.map((node, index) => ({
    level: index === 0 ? 1 : 2,
    label: node.label,
  }));
  for (const item of items) {
    lines.push(`${"*".repeat(item.level)} ${item.label}`);
  }
  lines.push("@endwbs");
  return lines.join("\n");
}

export function emitPlantUmlNwdiag(ir: DiagramIR): string {
  const lines = ["@startnwdiag", "network {", "  address = 192.168.0.0/24"];
  const networkNodes = ir.extras?.networkNodes ?? ir.nodes.map((node) => ({
    id: node.label,
    address: `192.168.0.${ir.nodes.indexOf(node) + 1}`,
  }));
  for (const node of networkNodes) {
    lines.push(`  ${node.id} [address = ${node.address}]`);
  }
  for (const edge of ir.edges) {
    const from = ir.nodes.find((node) => node.id === edge.source)?.label ?? edge.source;
    const to = ir.nodes.find((node) => node.id === edge.target)?.label ?? edge.target;
    lines.push(`  ${from} -- ${to}`);
  }
  lines.push("}", "@endnwdiag");
  return lines.join("\n");
}

export function emitPlantUmlArchimate(ir: DiagramIR): string {
  const lines = ["!include <archimate/Archimate>", ""];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const node of ir.nodes) {
    const type = String(node.semantic?.archimateType ?? "Application_Component");
    lines.push(`${type}(${node.id}, "${escapePlantUmlQuoted(node.label)}")`);
  }
  for (const edge of ir.edges) {
    lines.push(`Rel(${edge.source}, ${edge.target}, "Uses")`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlGraph(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }

  const groupedNodeIds = new Set<string>();
  const groupIds = new Set((ir.groups ?? []).map((group) => group.id));

  for (const group of ir.groups ?? []) {
    const groupNodes = ir.nodes.filter(
      (node) => node.groupId === group.id && !groupIds.has(node.id),
    );
    if (groupNodes.length === 0) {
      continue;
    }

    lines.push(`package "${escapePlantUmlQuoted(group.label ?? group.id)}" {`);
    for (const node of groupNodes) {
      lines.push(`  ${emitPlantUmlComponentNode(node.id, node.label)}`);
      groupedNodeIds.add(node.id);
    }
    lines.push("}", "");
  }

  for (const node of ir.nodes) {
    if (groupedNodeIds.has(node.id) || groupIds.has(node.id)) {
      continue;
    }
    lines.push(emitPlantUmlComponentNode(node.id, node.label));
  }

  for (const edge of ir.edges) {
    lines.push(`${edge.source} --> ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlActivity(ir: DiagramIR): string {
  const lines = ["start"];
  for (const node of ir.nodes) {
    lines.push(`:${formatPlantUmlActivityLabel(node.label)};`);
  }
  lines.push("stop");
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlGantt(ir: DiagramIR): string {
  const lines = [
    "@startgantt",
    "title Converted plan",
    "project starts 2026-01-06",
    "",
  ];
  ir.nodes.forEach((node, index) => {
    const label = flattenPlantUmlLabel(node.label) || node.id;
    if (index === 0) {
      lines.push(`[${label}] lasts 3 days`);
      return;
    }
    const prev = ir.nodes[index - 1];
    const prevLabel = flattenPlantUmlLabel(prev.label) || prev.id;
    lines.push(`[${label}] lasts 3 days and starts at [${prevLabel}]'s end`);
  });
  lines.push("@endgantt");
  return lines.join("\n");
}

export function emitMermaidGantt(ir: DiagramIR): string {
  const lines = [
    "gantt",
    "title Converted plan",
    "dateFormat YYYY-MM-DD",
    "section Tasks",
  ];
  ir.nodes.forEach((node, index) => {
    const label = flattenMermaidLabel(node.label) || node.id;
    if (index === 0) {
      lines.push(`${label} :${node.id}, 2026-01-01, 3d`);
      return;
    }
    const prev = ir.nodes[index - 1];
    lines.push(`${label} :${node.id}, after ${prev.id}, 3d`);
  });
  return lines.join("\n");
}

export function emitMermaidClass(ir: DiagramIR): string {
  const lines = ["classDiagram"];
  for (const node of ir.nodes) {
    lines.push(`  class ${node.id}`);
  }
  for (const edge of ir.edges) {
    lines.push(`  ${edge.source} --> ${edge.target}`);
  }
  return lines.join("\n");
}

export function emitMermaidState(ir: DiagramIR): string {
  const lines = ["stateDiagram-v2"];
  for (const edge of ir.edges) {
    const label = edge.label ? ` : ${edge.label}` : "";
    lines.push(`  ${edge.source} --> ${edge.target}${label}`);
  }
  return lines.join("\n");
}

export function emitMermaidSequence(ir: DiagramIR): string {
  const lines = ["sequenceDiagram"];
  for (const node of ir.nodes) {
    lines.push(`  participant ${node.id} as "${escapeMermaidQuoted(node.label)}"`);
  }
  for (const edge of ir.edges) {
    const label = edge.label ? `: ${escapeMermaidQuoted(edge.label)}` : "";
    lines.push(`  ${edge.source}->>${edge.target}${label}`);
  }
  return lines.join("\n");
}

export function emitMermaidEr(ir: DiagramIR): string {
  const lines = ["erDiagram"];
  for (const node of ir.nodes) {
    lines.push(`  ${node.id} {`, "    int id PK", "    string name", "  }");
  }
  for (const edge of ir.edges) {
    lines.push(`  ${edge.source} ||--o{ ${edge.target} : relates`);
  }
  return lines.join("\n");
}

export function emitPlantUmlClass(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const node of ir.nodes) {
    lines.push(`class ${node.id} {`, "}", "");
  }
  for (const edge of ir.edges) {
    lines.push(`${edge.source} --> ${edge.target}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlState(ir: DiagramIR): string {
  const lines: string[] = [];
  const labelById = new Map(ir.nodes.map((node) => [node.id, node.label]));
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  if (ir.edges.length > 0) {
    const firstTarget = labelById.get(ir.edges[0]!.target) ?? ir.edges[0]!.target;
    lines.push(`[*] --> ${firstTarget}`);
  }
  for (const edge of ir.edges) {
    const from = labelById.get(edge.source) ?? edge.source;
    const to = labelById.get(edge.target) ?? edge.target;
    lines.push(`${from} --> ${to}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlSequence(ir: DiagramIR): string {
  const lines: string[] = [];
  for (const node of ir.nodes) {
    lines.push(`actor ${node.id} as "${escapePlantUmlQuoted(node.label)}"`);
  }
  lines.push("");
  for (const edge of ir.edges) {
    lines.push(`${edge.source} -> ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlC4(ir: DiagramIR): string {
  const include =
    ir.kind === "c4_container"
      ? "!include ./plantuml-lib/C4/C4_Container.puml"
      : "!include ./plantuml-lib/C4/C4_Context.puml";
  const lines = [include, ""];
  for (const node of ir.nodes) {
    const c4Type = String(node.semantic?.c4Type ?? "System");
    lines.push(`${c4Type}(${node.id}, "${escapePlantUmlQuoted(node.label)}", "")`);
  }
  for (const edge of ir.edges) {
    const label = edge.label ? `, "${escapePlantUmlQuoted(edge.label)}"` : ', ""';
    lines.push(`Rel(${edge.source}, ${edge.target}${label})`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlPieAsGraph(ir: DiagramIR): string {
  const lines: string[] = ["title Pie chart (converted)", ""];
  const slices = ir.extras?.slices ?? ir.nodes.map((node, index) => ({
    label: node.label,
    value: (index + 1) * 10,
  }));
  for (const slice of slices) {
    lines.push(`[${escapePlantUmlQuoted(slice.label)} (${slice.value})]`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitMermaidPieFromGraph(ir: DiagramIR): string {
  return emitMermaidPie({
    ...ir,
    kind: "pie",
    extras: {
      slices: ir.nodes.map((node, index) => ({
        label: node.label,
        value: (index + 1) * 10,
      })),
    },
  });
}
