import type { DiagramIR } from "@/services/conversion/diagram-ir";
import {
  emitPlantUmlComponentNode,
  escapePlantUmlQuoted,
  flattenPlantUmlLabel,
  formatPlantUmlActivityLabel,
  formatPlantUmlEdgeSuffix,
} from "@/services/conversion/emit/plantuml-emit-utils";

export function emitPlantUmlFromIr(ir: DiagramIR): string {
  switch (ir.kind) {
    case "class":
      return emitPlantUmlClass(ir);
    case "state":
      return emitPlantUmlState(ir);
    case "sequence":
      return emitPlantUmlSequence(ir);
    case "gantt":
      return emitPlantUmlGantt(ir);
    case "c4_context":
    case "c4_container":
      return emitPlantUmlC4(ir);
    case "activity":
      return emitPlantUmlActivity(ir);
    case "er":
      return emitPlantUmlGraph(ir);
    case "graph":
    case "unknown":
    default:
      return emitPlantUmlGraph(ir);
  }
}

function wrapPlantUml(body: string): string {
  return `@startuml\n!pragma layout smetana\n\n${body}\n@enduml`;
}

function emitPlantUmlGraph(ir: DiagramIR): string {
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
    lines.push(
      `${edge.source} --> ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`,
    );
  }
  return wrapPlantUml(lines.join("\n"));
}

function emitPlantUmlClass(ir: DiagramIR): string {
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

function emitPlantUmlState(ir: DiagramIR): string {
  const lines: string[] = [];
  if (ir.direction === "LR") {
    lines.push("left to right direction", "");
  }
  for (const edge of ir.edges) {
    lines.push(
      `${edge.source} --> ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`,
    );
  }
  return wrapPlantUml(lines.join("\n"));
}

function emitPlantUmlSequence(ir: DiagramIR): string {
  const lines: string[] = [];
  for (const node of ir.nodes) {
    lines.push(`actor ${node.id} as "${escapePlantUmlQuoted(node.label)}"`);
  }
  lines.push("");
  for (const edge of ir.edges) {
    lines.push(
      `${edge.source} -> ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`,
    );
  }
  return wrapPlantUml(lines.join("\n"));
}

function emitPlantUmlActivity(ir: DiagramIR): string {
  const lines = ["start"];
  for (const node of ir.nodes) {
    lines.push(`:${formatPlantUmlActivityLabel(node.label)};`);
  }
  lines.push("stop");
  return wrapPlantUml(lines.join("\n"));
}

function emitPlantUmlC4(ir: DiagramIR): string {
  const include =
    ir.kind === "c4_container"
      ? "!include ./plantuml-lib/C4/C4_Container.puml"
      : "!include ./plantuml-lib/C4/C4_Context.puml";
  const lines = [include, ""];
  for (const node of ir.nodes) {
    const c4Type = String(node.semantic?.c4Type ?? "System");
    lines.push(
      `${c4Type}(${node.id}, "${escapePlantUmlQuoted(node.label)}", "")`,
    );
  }
  for (const edge of ir.edges) {
    const label = edge.label
      ? `, "${escapePlantUmlQuoted(edge.label)}"`
      : ', ""';
    lines.push(`Rel(${edge.source}, ${edge.target}${label})`);
  }
  return wrapPlantUml(lines.join("\n"));
}

function emitPlantUmlGantt(ir: DiagramIR): string {
  const lines = [
    "@startgantt",
    "title Converted plan",
    "project starts 2026-01-06",
    "",
  ];
  ir.nodes.forEach((node, index) => {
    const label = flattenPlantUmlLabel(node.label) || node.id;
    const duration =
      typeof node.semantic?.duration === "string"
        ? node.semantic.duration
        : "3 days";
    if (index === 0) {
      lines.push(`[${label}] lasts ${duration}`);
      return;
    }
    const prev = ir.nodes[index - 1];
    const prevLabel = flattenPlantUmlLabel(prev.label) || prev.id;
    lines.push(
      `[${label}] lasts ${duration} and starts at [${prevLabel}]'s end`,
    );
  });
  lines.push("@endgantt");
  return lines.join("\n");
}
