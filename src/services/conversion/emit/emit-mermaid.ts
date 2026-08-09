import type { DiagramIR } from "@/services/conversion/diagram-ir";
import {
  escapeMermaidQuoted,
  flattenMermaidLabel,
  formatMermaidNodeLabel,
} from "@/services/conversion/emit/mermaid-emit-utils";

function flowDirection(ir: DiagramIR): string {
  return ir.direction === "LR" ? "LR" : "TD";
}

function formatMermaidNodeLine(node: DiagramIR["nodes"][number]): string {
  const shape =
    node.kind === "decision"
      ? `{${escapeMermaidQuoted(node.label)}}`
      : node.kind === "start" || node.kind === "end"
        ? `(["${escapeMermaidQuoted(node.label)}"])`
        : formatMermaidNodeLabel(node.label);
  return `  ${node.id}${shape}`;
}

function emitMermaidFlowchart(ir: DiagramIR): string {
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

    const labelSuffix = group.label
      ? ` [${escapeMermaidQuoted(group.label)}]`
      : "";
    lines.push(`  subgraph ${group.id}${labelSuffix}`);
    for (const node of groupNodes) {
      lines.push(formatMermaidNodeLine(node));
      groupedNodeIds.add(node.id);
    }
    lines.push("  end");
  }

  for (const node of ir.nodes) {
    if (groupedNodeIds.has(node.id) || groupIds.has(node.id)) {
      continue;
    }
    lines.push(formatMermaidNodeLine(node));
  }

  for (const edge of ir.edges) {
    const label = edge.label
      ? `|${escapeMermaidQuoted(edge.label)}|`
      : "";
    lines.push(`  ${edge.source} -->${label} ${edge.target}`);
  }
  return lines.join("\n");
}

export function emitMermaidFromIr(ir: DiagramIR): string {
  switch (ir.kind) {
    case "class":
      return emitMermaidClass(ir);
    case "state":
      return emitMermaidState(ir);
    case "sequence":
      return emitMermaidSequence(ir);
    case "er":
      return emitMermaidEr(ir);
    case "gantt":
      return emitMermaidGantt(ir);
    case "activity":
    case "c4_context":
    case "c4_container":
    case "graph":
    case "unknown":
    default:
      return emitMermaidFlowchart(ir);
  }
}

function emitMermaidClass(ir: DiagramIR): string {
  const lines = ["classDiagram"];
  for (const node of ir.nodes) {
    lines.push(`  class ${node.id}`);
  }
  for (const edge of ir.edges) {
    lines.push(`  ${edge.source} --> ${edge.target}`);
  }
  return lines.join("\n");
}

function emitMermaidState(ir: DiagramIR): string {
  const lines = ["stateDiagram-v2"];
  for (const edge of ir.edges) {
    const label = edge.label ? ` : ${edge.label}` : "";
    lines.push(`  ${edge.source} --> ${edge.target}${label}`);
  }
  return lines.join("\n");
}

function emitMermaidSequence(ir: DiagramIR): string {
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

function emitMermaidEr(ir: DiagramIR): string {
  const lines = ["erDiagram"];
  for (const node of ir.nodes) {
    const attributes = Array.isArray(node.semantic?.attributes)
      ? (node.semantic!.attributes as string[])
      : null;
    lines.push(`  ${node.id} {`);
    if (attributes && attributes.length > 0) {
      for (const attribute of attributes) {
        lines.push(`    ${attribute}`);
      }
    }
    lines.push("  }");
  }
  for (const edge of ir.edges) {
    lines.push(`  ${edge.source} ||--o{ ${edge.target} : relates`);
  }
  return lines.join("\n");
}

function emitMermaidGantt(ir: DiagramIR): string {
  const lines = [
    "gantt",
    "title Converted plan",
    "dateFormat YYYY-MM-DD",
    "section Tasks",
  ];
  ir.nodes.forEach((node, index) => {
    const label = flattenMermaidLabel(node.label) || node.id;
    const startDate =
      typeof node.semantic?.startDate === "string"
        ? node.semantic.startDate
        : "2026-01-01";
    const duration =
      typeof node.semantic?.duration === "string"
        ? node.semantic.duration
        : "3d";
    if (index === 0) {
      lines.push(`${label} :${node.id}, ${startDate}, ${duration}`);
      return;
    }
    const prev = ir.nodes[index - 1];
    lines.push(`${label} :${node.id}, after ${prev.id}, ${duration}`);
  });
  return lines.join("\n");
}
