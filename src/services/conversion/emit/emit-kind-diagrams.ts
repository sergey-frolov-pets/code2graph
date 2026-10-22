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
  const wbsItems = ir.extras?.wbsItems;
  if (wbsItems && wbsItems.length > 0) {
    const rootItem = wbsItems[0];
    lines.push(`  root((${escapeMermaidQuoted(rootItem.label)}))`);
    for (const item of wbsItems.slice(1)) {
      const indent = "  ".repeat(Math.max(2, item.level));
      lines.push(`${indent}${escapeMermaidQuoted(item.label)}`);
    }
    return lines.join("\n");
  }

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
    date: String(node.semantic?.date ?? 2020 + index),
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
    value: Number(edge.label ?? 10) || 10,
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
    if (/\s/.test(node.label)) {
      lines.push(`    ${node.id}["${escapeMermaidQuoted(node.label)}"]`);
    } else {
      lines.push(`    ${node.label}`);
    }
  }
  return lines.join("\n");
}

export function emitMermaidC4(ir: DiagramIR): string {
  const keyword = ir.kind === "c4_container" ? "C4Container" : "C4Context";
  const lines = [keyword];
  if (ir.extras?.title) {
    lines.push(`    title ${ir.extras.title}`);
  }
  for (const node of ir.nodes) {
    const rawType = String(node.semantic?.c4Type ?? (node.kind === "actor" ? "Person" : node.kind === "container" ? "Container" : "System"));
    const c4Type = rawType === "Deployment_Node" ? "Container" : rawType;
    const desc = String(node.semantic?.description ?? "");
    const tech = String(node.semantic?.technology ?? "");
    if (c4Type.startsWith("Container") || c4Type.startsWith("Component")) {
      lines.push(
        `    ${c4Type}(${node.id}, "${escapeMermaidQuoted(node.label)}", "${escapeMermaidQuoted(tech)}", "${escapeMermaidQuoted(desc)}")`,
      );
    } else {
      lines.push(
        `    ${c4Type}(${node.id}, "${escapeMermaidQuoted(node.label)}", "${escapeMermaidQuoted(desc)}")`,
      );
    }
  }
  for (const edge of ir.edges) {
    const label = edge.label ? `, "${escapeMermaidQuoted(edge.label)}"` : ', "Uses"';
    const tech = edge.semantic?.technology
      ? `, "${escapeMermaidQuoted(String(edge.semantic.technology))}"`
      : "";
    lines.push(`    Rel(${edge.source}, ${edge.target}${label}${tech})`);
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
  const elements = ir.extras?.elements ?? [];
  for (const el of elements) {
    lines.push(
      `    element ${el.id} {`,
      `      type: ${el.type || "component"}`,
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

  const serviceIdMap = new Map<string, string>();

  for (let index = 0; index < services.length; index += 1) {
    const service = services[index];
    const serviceId = toMermaidArchitectureServiceId(service.id, index + 1);
    serviceIdMap.set(service.id, serviceId);
    const label = sanitizeMermaidArchitectureLabel(service.label);
    lines.push(
      `        service ${serviceId}(${service.icon ?? "server"})[${label}] in ${groupId}`,
    );
  }

  for (const edge of ir.edges) {
    const source = serviceIdMap.get(edge.source) ?? toMermaidArchitectureServiceId(edge.source);
    const target = serviceIdMap.get(edge.target) ?? toMermaidArchitectureServiceId(edge.target);
    lines.push(`    ${source}:R --> L:${target}`);
  }

  return lines.join("\n");
}

export function emitMermaidPacket(ir: DiagramIR): string {
  const lines = ["packet-beta"];
  if (ir.extras?.title) {
    lines.push(`    title ${ir.extras.title}`);
  }
  const fields = ir.extras?.packetFields ?? ir.nodes.map((node, index) => ({
    start: Number(node.semantic?.start ?? index * 8),
    end: Number(node.semantic?.end ?? index * 8 + 7),
    label: node.label,
  }));
  for (const field of fields) {
    lines.push(`    ${field.start}-${field.end}: "${escapeMermaidQuoted(field.label)}"`);
  }
  return lines.join("\n");
}

function renderMermaidNodeLine(node: DiagramIR["nodes"][number], indent = "  "): string {
  const shape =
    node.kind === "decision"
      ? `{"${escapeMermaidQuoted(node.label)}"}`
      : node.kind === "start" || node.kind === "end" || node.kind === "usecase"
        ? `(["${escapeMermaidQuoted(node.label)}"])`
        : node.kind === "system" && /db|database|sql|база|бд/i.test(node.label)
          ? `[("${escapeMermaidQuoted(node.label)}")]`
          : formatMermaidNodeLabel(node.label);
  return `${indent}${node.id}${shape}`;
}

export function emitMermaidFlowchart(ir: DiagramIR): string {
  const lines = [`flowchart ${flowDirection(ir)}`];
  const groupedNodeIds = new Set<string>();
  const groupIds = new Set((ir.groups ?? []).map((group) => group.id));

  for (const group of ir.groups ?? []) {
    const groupNodes = ir.nodes.filter(
      (node) => node.groupId === group.id && !groupIds.has(node.id),
    );
    if (groupNodes.length === 0) {
      continue;
    }
    const groupLabel = escapeMermaidQuoted(group.label ?? group.id);
    lines.push(`  subgraph ${group.id}["${groupLabel}"]`);
    for (const node of groupNodes) {
      lines.push(renderMermaidNodeLine(node, "    "));
      groupedNodeIds.add(node.id);
    }
    lines.push("  end");
  }

  for (const node of ir.nodes) {
    if (groupedNodeIds.has(node.id) || groupIds.has(node.id)) {
      continue;
    }
    lines.push(renderMermaidNodeLine(node, "  "));
  }

  for (const edge of ir.edges) {
    const arrow = edge.kind === "dashed" ? "-.->" : "-->";
    const label = edge.label ? `|${escapeMermaidQuoted(edge.label)}|` : "";
    lines.push(`  ${edge.source} ${arrow}${label} ${edge.target}`);
  }
  return lines.join("\n");
}

export function emitPlantUmlEr(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const node of ir.nodes) {
    const attrs = ir.extras?.entityAttributes?.[node.id] ?? [
      { name: "id", type: "int", isPrimaryKey: true },
      { name: "name", type: "string" },
    ];
    const pkAttrs = attrs.filter((attr) => attr.isPrimaryKey);
    const otherAttrs = attrs.filter((attr) => !attr.isPrimaryKey);

    lines.push(`entity "${escapePlantUmlQuoted(node.label)}" as ${node.id} {`);
    for (const pk of pkAttrs) {
      lines.push(`  * ${pk.name} : ${pk.type}`);
    }
    if (pkAttrs.length > 0 && otherAttrs.length > 0) {
      lines.push("  --");
    }
    for (const col of otherAttrs) {
      const fkSuffix = col.isForeignKey ? " <<FK>>" : "";
      lines.push(`  ${col.name} : ${col.type}${fkSuffix}`);
    }
    lines.push("}");
  }
  for (const edge of ir.edges) {
    const card = String(edge.semantic?.cardinality ?? "||--o{");
    const suffix = formatPlantUmlEdgeSuffix(edge.label);
    lines.push(`${edge.source} ${card} ${edge.target}${suffix}`);
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
    lines.push(`${"*".repeat(Math.max(1, item.level))} ${flattenPlantUmlLabel(item.label)}`);
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
  const useCases = ir.nodes.filter((node) => node.kind !== "actor");
  for (const actor of actors) {
    lines.push(`actor "${escapePlantUmlQuoted(actor.label)}" as ${actor.id}`);
  }
  const boundary = ir.extras?.systemBoundary ?? "System";
  if (useCases.length > 0) {
    lines.push("", `rectangle "${escapePlantUmlQuoted(boundary)}" {`);
    for (const useCase of useCases) {
      lines.push(`  usecase "${escapePlantUmlQuoted(useCase.label)}" as ${useCase.id}`);
    }
    lines.push("}");
  }
  for (const edge of ir.edges) {
    const arrow = edge.kind === "dashed" ? "..>" : "-->";
    lines.push(`${edge.source} ${arrow} ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlDeployment(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const node of ir.nodes) {
    const kw =
      node.kind === "system"
        ? "database"
        : node.kind === "artifact"
          ? "artifact"
          : "node";
    lines.push(`${kw} "${escapePlantUmlQuoted(node.label)}" as ${node.id}`);
  }
  for (const edge of ir.edges) {
    lines.push(`${edge.source} --> ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlObject(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const node of ir.nodes) {
    const fields = ir.extras?.objectFields?.[node.id] ?? [];
    lines.push(`object "${escapePlantUmlQuoted(node.label)}" as ${node.id} {`);
    for (const field of fields) {
      lines.push(`  ${field.name} = ${field.value}`);
    }
    lines.push("}");
  }
  for (const edge of ir.edges) {
    lines.push(`${edge.source} --> ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlTiming(ir: DiagramIR): string {
  const lines: string[] = [];
  const signals = ir.extras?.timingSignals && ir.extras.timingSignals.length > 0
    ? ir.extras.timingSignals
    : ir.nodes.map((node) => ({
        name: node.id,
        states: [{ time: 0, state: "Idle" }, { time: 100, state: "Active" }],
      }));
  for (const signal of signals) {
    const label = ir.nodes.find((n) => n.id === signal.name)?.label ?? signal.name;
    lines.push(`concise "${escapePlantUmlQuoted(label)}" as ${signal.name}`);
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
    lines.push(`${"*".repeat(Math.max(1, item.level))} ${flattenPlantUmlLabel(item.label)}`);
  }
  lines.push("@endwbs");
  return lines.join("\n");
}

export function emitPlantUmlNwdiag(ir: DiagramIR): string {
  const lines = ["@startnwdiag", "network {"];
  lines.push("  address = 192.168.0.0/24");
  const networkNodes = ir.extras?.networkNodes && ir.extras.networkNodes.length > 0
    ? ir.extras.networkNodes
    : ir.nodes.map((node, idx) => ({
        id: node.id,
        address: `192.168.0.${idx + 1}`,
      }));
  for (const node of networkNodes) {
    const addr = node.address ?? "192.168.0.1";
    lines.push(`  ${node.id} [address = "${addr}"]`);
  }
  for (const edge of ir.edges) {
    lines.push(`  ${edge.source} -- ${edge.target}`);
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
    const label = edge.label ? escapePlantUmlQuoted(edge.label) : "Uses";
    lines.push(`Rel_Flow(${edge.source}, ${edge.target}, "${label}")`);
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
    const arrow = edge.kind === "dashed" ? "..>" : "-->";
    lines.push(`${edge.source} ${arrow} ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlActivity(ir: DiagramIR): string {
  const lines = ["start"];
  let currentGroupId: string | undefined;
  const groupById = new Map((ir.groups ?? []).map((g) => [g.id, g.label || g.id]));

  for (const node of ir.nodes) {
    if (node.groupId && node.groupId !== currentGroupId && groupById.has(node.groupId)) {
      currentGroupId = node.groupId;
      lines.push(`|${flattenPlantUmlLabel(groupById.get(node.groupId)!)}|`);
    }
    lines.push(`:${formatPlantUmlActivityLabel(node.label)};`);
  }
  lines.push("stop");
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlGantt(ir: DiagramIR): string {
  const title = ir.extras?.title || "Converted plan";
  const lines = [
    "@startgantt",
    `title ${flattenPlantUmlLabel(title)}`,
    "project starts 2026-01-06",
    "",
  ];
  ir.nodes.forEach((node, index) => {
    const label = flattenPlantUmlLabel(node.label) || node.id;
    const rawDuration = String(node.semantic?.duration ?? "3 days");
    const daysMatch = rawDuration.match(/^(\d+)\s*d(?:ays?)?$/i);
    const durationText = daysMatch ? `${daysMatch[1]} days` : rawDuration;

    if (node.semantic?.milestone) {
      if (index > 0) {
        const prev = ir.nodes[index - 1];
        const prevLabel = flattenPlantUmlLabel(prev.label) || prev.id;
        lines.push(`[${label}] happens at [${prevLabel}]'s end`);
      } else {
        lines.push(`[${label}] happens at 2026-01-06`);
      }
      return;
    }

    if (index === 0) {
      lines.push(`[${label}] lasts ${durationText}`);
      return;
    }
    const incoming = ir.edges.find((e) => e.target === node.id);
    const depNode = incoming
      ? ir.nodes.find((n) => n.id === incoming.source)
      : ir.nodes[index - 1];
    const prevLabel = depNode ? flattenPlantUmlLabel(depNode.label) || depNode.id : label;
    lines.push(`[${label}] lasts ${durationText} and starts at [${prevLabel}]'s end`);
  });
  lines.push("@endgantt");
  return lines.join("\n");
}

export function emitMermaidGantt(ir: DiagramIR): string {
  const title = ir.extras?.title || "Converted plan";
  const lines = [
    "gantt",
    `title ${flattenMermaidLabel(title)}`,
    "dateFormat YYYY-MM-DD",
    "section Tasks",
  ];
  let currentSection = "Tasks";

  ir.nodes.forEach((node, index) => {
    const section = node.semantic?.section ? String(node.semantic.section) : undefined;
    if (section && section !== currentSection) {
      currentSection = section;
      lines.push(`section ${flattenMermaidLabel(currentSection)}`);
    }
    const label = flattenMermaidLabel(node.label).replace(/:/g, " -") || node.id;
    const rawDur = String(node.semantic?.duration ?? "3d");
    const daysMatch = rawDur.match(/^(\d+)\s*d(?:ays?)?$/i);
    const dur = daysMatch ? `${daysMatch[1]}d` : /^\d+[dwmyh]$/i.test(rawDur) ? rawDur : "3d";

    if (node.semantic?.milestone) {
      const prev = ir.nodes[index - 1];
      const dep = prev ? `after ${prev.id}` : "2026-01-06";
      lines.push(`${label} :milestone, ${node.id}, ${dep}, 0d`);
      return;
    }

    if (index === 0) {
      const start = String(node.semantic?.startDate ?? "2026-01-06");
      lines.push(`${label} :${node.id}, ${start}, ${dur}`);
      return;
    }
    const incoming = ir.edges.find((e) => e.target === node.id);
    const prevId = incoming?.source ?? ir.nodes[index - 1].id;
    lines.push(`${label} :${node.id}, after ${prevId}, ${dur}`);
  });
  return lines.join("\n");
}

export function emitMermaidClass(ir: DiagramIR): string {
  const lines = ["classDiagram"];
  if (ir.direction === "LR") {
    lines.push("  direction LR");
  }
  for (const node of ir.nodes) {
    const members = ir.extras?.classMembers?.[node.id] ?? [];
    const stereo = node.semantic?.stereotype ? String(node.semantic.stereotype) : undefined;
    if (members.length > 0 || stereo) {
      lines.push(`  class ${node.id} {`);
      if (stereo) {
        lines.push(`    <<${stereo}>>`);
      }
      for (const m of members) {
        const vis = m.visibility ?? "+";
        if (m.isMethod) {
          const ret = m.type ? ` ${m.type}` : "";
          lines.push(`    ${vis}${m.name}${ret}`);
        } else {
          const t = m.type ? `${m.type} ` : "";
          lines.push(`    ${vis}${t}${m.name}`);
        }
      }
      lines.push("  }");
    } else {
      lines.push(`  class ${node.id}`);
    }
  }
  for (const edge of ir.edges) {
    const labelSuffix = edge.label ? ` : ${escapeMermaidQuoted(edge.label)}` : "";
    if (edge.kind === "inherit") {
      const isRealization = edge.semantic?.relationType === "realization";
      const arrow = isRealization ? "..|>" : "--|>";
      lines.push(`  ${edge.source} ${arrow} ${edge.target}${labelSuffix}`);
    } else if (edge.kind === "dashed") {
      lines.push(`  ${edge.source} ..> ${edge.target}${labelSuffix}`);
    } else {
      lines.push(`  ${edge.source} --> ${edge.target}${labelSuffix}`);
    }
  }
  return lines.join("\n");
}

export function emitMermaidState(ir: DiagramIR): string {
  const lines = ["stateDiagram-v2"];
  for (const node of ir.nodes) {
    if (node.label !== node.id) {
      lines.push(`  state "${escapeMermaidQuoted(node.label)}" as ${node.id}`);
    }
    if (node.semantic?.stereotype === "choice") {
      lines.push(`  state ${node.id} <<choice>>`);
    }
  }

  const initialNodes = ir.nodes.filter((n) => n.semantic?.isInitial);
  if (initialNodes.length > 0) {
    for (const init of initialNodes) {
      lines.push(`  [*] --> ${init.id}`);
    }
  } else if (ir.nodes.length > 0) {
    lines.push(`  [*] --> ${ir.nodes[0].id}`);
  }

  for (const edge of ir.edges) {
    const label = edge.label ? ` : ${flattenMermaidLabel(edge.label)}` : "";
    lines.push(`  ${edge.source} --> ${edge.target}${label}`);
  }

  for (const node of ir.nodes) {
    if (node.semantic?.isFinal) {
      lines.push(`  ${node.id} --> [*]`);
    }
  }

  return lines.join("\n");
}

export function emitMermaidSequence(ir: DiagramIR): string {
  const lines = ["sequenceDiagram"];
  for (const node of ir.nodes) {
    const pType = node.semantic?.participantType === "actor" ? "actor" : "participant";
    lines.push(`  ${pType} ${node.id} as "${escapeMermaidQuoted(node.label)}"`);
  }
  for (const edge of ir.edges) {
    const arrow = edge.semantic?.dashed ? "-->>" : "->>";
    const label = edge.label ? `: ${escapeMermaidQuoted(edge.label)}` : ": message";
    lines.push(`  ${edge.source}${arrow}${edge.target}${label}`);
  }
  return lines.join("\n");
}

export function emitMermaidEr(ir: DiagramIR): string {
  const lines = ["erDiagram"];
  for (const node of ir.nodes) {
    const attrs = ir.extras?.entityAttributes?.[node.id] ?? [
      { name: "id", type: "int", isPrimaryKey: true },
      { name: "name", type: "string" },
    ];
    lines.push(`  ${node.id} {`);
    for (const attr of attrs) {
      const keyFlag = attr.isPrimaryKey ? " PK" : attr.isForeignKey ? " FK" : "";
      const cleanType = (attr.type || "string").replace(/[^a-zA-Z0-9_-]/g, "") || "string";
      const cleanName = attr.name.replace(/[^a-zA-Z0-9_-]/g, "_") || "field";
      lines.push(`    ${cleanType} ${cleanName}${keyFlag}`);
    }
    lines.push("  }");
  }
  for (const edge of ir.edges) {
    const card = String(edge.semantic?.cardinality ?? "||--o{");
    const relLabel = edge.label
      ? `"${escapeMermaidQuoted(edge.label)}"`
      : "relates";
    lines.push(`  ${edge.source} ${card} ${edge.target} : ${relLabel}`);
  }
  return lines.join("\n");
}

export function emitPlantUmlClass(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const node of ir.nodes) {
    const stereo = node.semantic?.stereotype ? String(node.semantic.stereotype) : undefined;
    const kw =
      stereo === "interface"
        ? "interface"
        : stereo === "enumeration" || stereo === "enum"
          ? "enum"
          : stereo === "abstract"
            ? "abstract class"
            : "class";
    const members = ir.extras?.classMembers?.[node.id] ?? [];
    lines.push(`${kw} ${node.id} {`);
    for (const m of members) {
      const vis = m.visibility ?? "+";
      const typeSuffix = m.type ? `: ${m.type}` : "";
      lines.push(`  ${vis}${m.name}${typeSuffix}`);
    }
    lines.push("}", "");
  }
  for (const edge of ir.edges) {
    const suffix = formatPlantUmlEdgeSuffix(edge.label);
    if (edge.kind === "inherit") {
      const arrow = edge.semantic?.relationType === "realization" ? "..|>" : "--|>";
      lines.push(`${edge.source} ${arrow} ${edge.target}${suffix}`);
    } else if (edge.kind === "dashed") {
      lines.push(`${edge.source} ..> ${edge.target}${suffix}`);
    } else {
      lines.push(`${edge.source} --> ${edge.target}${suffix}`);
    }
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlState(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const node of ir.nodes) {
    if (node.label !== node.id) {
      lines.push(`state "${escapePlantUmlQuoted(node.label)}" as ${node.id}`);
    }
    if (node.semantic?.stereotype === "choice") {
      lines.push(`state ${node.id} <<choice>>`);
    }
  }
  const initialNodes = ir.nodes.filter((n) => n.semantic?.isInitial);
  if (initialNodes.length > 0) {
    for (const init of initialNodes) {
      lines.push(`[*] --> ${init.id}`);
    }
  } else if (ir.edges.length > 0) {
    lines.push(`[*] --> ${ir.edges[0]!.source}`);
  } else if (ir.nodes.length > 0) {
    lines.push(`[*] --> ${ir.nodes[0]!.id}`);
  }

  for (const edge of ir.edges) {
    lines.push(`${edge.source} --> ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }

  for (const node of ir.nodes) {
    if (node.semantic?.isFinal) {
      lines.push(`${node.id} --> [*]`);
    }
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlSequence(ir: DiagramIR): string {
  const lines: string[] = [];
  for (const node of ir.nodes) {
    const pType = String(node.semantic?.participantType ?? "actor");
    const validType = [
      "actor",
      "participant",
      "boundary",
      "control",
      "entity",
      "database",
      "queue",
      "collections",
    ].includes(pType)
      ? pType
      : "participant";
    lines.push(`${validType} "${escapePlantUmlQuoted(node.label)}" as ${node.id}`);
  }
  lines.push("");
  for (const edge of ir.edges) {
    const arrow = edge.semantic?.dashed ? "-->" : "->";
    lines.push(`${edge.source} ${arrow} ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
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
    const rawType = String(
      node.semantic?.c4Type ??
        (node.kind === "actor"
          ? "Person"
          : node.kind === "container"
            ? "Container"
            : "System"),
    );
    const c4Type = rawType === "Deployment_Node" ? "Container" : rawType;
    const desc = escapePlantUmlQuoted(String(node.semantic?.description ?? ""));
    const tech = escapePlantUmlQuoted(String(node.semantic?.technology ?? ""));
    if (c4Type.startsWith("Container") || c4Type.startsWith("Component")) {
      lines.push(
        `${c4Type}(${node.id}, "${escapePlantUmlQuoted(node.label)}", "${tech}", "${desc}")`,
      );
    } else {
      lines.push(
        `${c4Type}(${node.id}, "${escapePlantUmlQuoted(node.label)}", "${desc}")`,
      );
    }
  }
  for (const edge of ir.edges) {
    const label = edge.label ? `, "${escapePlantUmlQuoted(edge.label)}"` : ', "Uses"';
    const tech = edge.semantic?.technology
      ? `, "${escapePlantUmlQuoted(String(edge.semantic.technology))}"`
      : "";
    lines.push(`Rel(${edge.source}, ${edge.target}${label}${tech})`);
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
