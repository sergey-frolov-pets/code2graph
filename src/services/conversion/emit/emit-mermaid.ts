import type { DiagramIR } from "@/services/conversion/diagram-ir";
import {
  escapeMermaidQuoted,
  flattenMermaidLabel,
  formatMermaidNodeLabel,
} from "@/services/conversion/emit/mermaid-emit-utils";

function flowDirection(ir: DiagramIR): string {
  return ir.direction === "LR" ? "LR" : "TD";
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

function emitMermaidFlowchart(ir: DiagramIR): string {
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
    const label = edge.label
      ? `|${escapeMermaidQuoted(edge.label)}|`
      : "";
    lines.push(`  ${edge.source} -->${label} ${edge.target}`);
  }
  return lines.join("\n");
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
    lines.push(`  ${node.id} {`, "    int id PK", "    string name", "  }");
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
    if (index === 0) {
      lines.push(`${label} :${node.id}, 2026-01-01, 3d`);
      return;
    }
    const prev = ir.nodes[index - 1];
    lines.push(`${label} :${node.id}, after ${prev.id}, 3d`);
  });
  return lines.join("\n");
}
