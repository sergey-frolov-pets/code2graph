import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { flattenPlantUmlLabel } from "@/services/conversion/emit/plantuml-emit-utils";

function cleanD2Text(value: string): string {
  return flattenPlantUmlLabel(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .trim();
}

function safeD2Identifier(value: string, fallbackIndex = 1): string {
  const sanitized = value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  if (!sanitized) {
    return `node_${fallbackIndex}`;
  }
  return /^\d/.test(sanitized) ? `n_${sanitized}` : sanitized;
}

function d2DirectionKeyword(ir: DiagramIR): "right" | "down" {
  return ir.direction === "LR" ? "right" : "down";
}

function mapSemanticToD2Shape(
  node: DiagramIR["nodes"][number],
  kind: DiagramIR["kind"],
): string | undefined {
  const explicitShape = node.semantic?.d2Shape;
  if (typeof explicitShape === "string" && explicitShape.trim()) {
    return explicitShape.trim();
  }

  const c4Type = String(node.semantic?.c4Type ?? "").toLowerCase();
  if (c4Type.startsWith("person")) {
    return "person";
  }
  if (c4Type.includes("db") || c4Type.includes("database")) {
    return "cylinder";
  }
  if (c4Type.includes("queue")) {
    return "queue";
  }

  switch (node.kind) {
    case "actor":
      return "person";
    case "decision":
      return "diamond";
    case "start":
    case "end":
      return "oval";
    case "system":
      return kind === "deployment" ? "cylinder" : "rectangle";
    case "container":
      return kind === "architecture" ? "hexagon" : "rectangle";
    default:
      return undefined;
  }
}

function emitD2Sequence(ir: DiagramIR): string {
  const lines = [
    `direction: ${d2DirectionKeyword(ir)}`,
    "",
    "sequence: {",
    "  shape: sequence_diagram",
  ];

  const idMap = new Map<string, string>();
  ir.nodes.forEach((node, index) => {
    const d2Id = safeD2Identifier(node.id, index + 1);
    idMap.set(node.id, d2Id);
    lines.push(`  ${d2Id}: "${cleanD2Text(node.label || node.id)}"`);
  });

  if (ir.edges.length > 0) {
    lines.push("");
    for (const edge of ir.edges) {
      const from = idMap.get(edge.source) ?? safeD2Identifier(edge.source);
      const to = idMap.get(edge.target) ?? safeD2Identifier(edge.target);
      const labelSuffix = edge.label ? `: "${cleanD2Text(edge.label)}"` : "";
      lines.push(`  ${from} -> ${to}${labelSuffix}`);
    }
  }

  lines.push("}");
  return lines.join("\n");
}

function emitD2Class(ir: DiagramIR): string {
  const lines = [`direction: ${d2DirectionKeyword(ir)}`, ""];
  const idMap = new Map<string, string>();

  ir.nodes.forEach((node, index) => {
    const d2Id = safeD2Identifier(node.id, index + 1);
    idMap.set(node.id, d2Id);
    const members = ir.extras?.classMembers?.[node.id] ?? [];
    lines.push(`${d2Id}: "${cleanD2Text(node.label || node.id)}" {`);
    lines.push("  shape: class");
    for (const member of members) {
      const vis = member.visibility ?? "+";
      const typeSuffix = member.type ? `: ${cleanD2Text(member.type)}` : "";
      lines.push(`  ${vis}${cleanD2Text(member.name)}${typeSuffix}`);
    }
    lines.push("}", "");
  });

  for (const edge of ir.edges) {
    const from = idMap.get(edge.source) ?? safeD2Identifier(edge.source);
    const to = idMap.get(edge.target) ?? safeD2Identifier(edge.target);
    const labelSuffix = edge.label ? `: "${cleanD2Text(edge.label)}"` : "";
    lines.push(`${from} -> ${to}${labelSuffix}`);
  }

  return lines.join("\n").trim();
}

function emitD2Er(ir: DiagramIR): string {
  const lines = [`direction: ${d2DirectionKeyword(ir)}`, ""];
  const idMap = new Map<string, string>();

  ir.nodes.forEach((node, index) => {
    const d2Id = safeD2Identifier(node.id, index + 1);
    idMap.set(node.id, d2Id);
    const attributes = ir.extras?.entityAttributes?.[node.id] ?? [
      { name: "id", type: "int", isPrimaryKey: true },
      { name: "name", type: "string" },
    ];
    lines.push(`${d2Id}: "${cleanD2Text(node.label || node.id)}" {`);
    lines.push("  shape: sql_table");
    for (const attr of attributes) {
      const constraint = attr.isPrimaryKey
        ? " {constraint: primary_key}"
        : attr.isForeignKey
          ? " {constraint: foreign_key}"
          : "";
      lines.push(
        `  ${safeD2Identifier(attr.name)}: ${cleanD2Text(attr.type || "string")}${constraint}`,
      );
    }
    lines.push("}", "");
  });

  for (const edge of ir.edges) {
    const from = idMap.get(edge.source) ?? safeD2Identifier(edge.source);
    const to = idMap.get(edge.target) ?? safeD2Identifier(edge.target);
    const labelSuffix = edge.label ? `: "${cleanD2Text(edge.label)}"` : "";
    lines.push(`${from} -> ${to}${labelSuffix}`);
  }

  return lines.join("\n").trim();
}

function emitD2Graph(ir: DiagramIR): string {
  const lines = [`direction: ${d2DirectionKeyword(ir)}`, ""];
  const idMap = new Map<string, string>();
  const groupPrefixMap = new Map<string, string>();
  const groupedNodeIds = new Set<string>();
  const groupIds = new Set((ir.groups ?? []).map((group) => group.id));

  ir.nodes.forEach((node, index) => {
    idMap.set(node.id, safeD2Identifier(node.id, index + 1));
  });

  for (const group of ir.groups ?? []) {
    const groupNodes = ir.nodes.filter(
      (node) => node.groupId === group.id && !groupIds.has(node.id),
    );
    if (groupNodes.length === 0) {
      continue;
    }
    const groupKey = safeD2Identifier(group.id);
    groupPrefixMap.set(group.id, groupKey);
    lines.push(`${groupKey}: "${cleanD2Text(group.label || group.id)}" {`);
    for (const node of groupNodes) {
      const d2Id = idMap.get(node.id)!;
      const shape = mapSemanticToD2Shape(node, ir.kind);
      if (shape) {
        lines.push(`  ${d2Id}: "${cleanD2Text(node.label || node.id)}" {`);
        lines.push(`    shape: ${shape}`);
        lines.push("  }");
      } else {
        lines.push(`  ${d2Id}: "${cleanD2Text(node.label || node.id)}"`);
      }
      groupedNodeIds.add(node.id);
    }
    lines.push("}", "");
  }

  for (const node of ir.nodes) {
    if (groupedNodeIds.has(node.id) || groupIds.has(node.id)) {
      continue;
    }
    const d2Id = idMap.get(node.id)!;
    const shape = mapSemanticToD2Shape(node, ir.kind);
    if (shape) {
      lines.push(`${d2Id}: "${cleanD2Text(node.label || node.id)}" {`);
      lines.push(`  shape: ${shape}`);
      lines.push("}");
    } else {
      lines.push(`${d2Id}: "${cleanD2Text(node.label || node.id)}"`);
    }
  }

  if (ir.edges.length > 0) {
    lines.push("");
    for (const edge of ir.edges) {
      const resolveRef = (nodeId: string): string => {
        const node = ir.nodes.find((entry) => entry.id === nodeId);
        const d2Id = idMap.get(nodeId) ?? safeD2Identifier(nodeId);
        if (node?.groupId && groupPrefixMap.has(node.groupId)) {
          return `${groupPrefixMap.get(node.groupId)}.${d2Id}`;
        }
        return d2Id;
      };
      const from = resolveRef(edge.source);
      const to = resolveRef(edge.target);
      const labelSuffix = edge.label ? `: "${cleanD2Text(edge.label)}"` : "";
      lines.push(`${from} -> ${to}${labelSuffix}`);
    }
  } else if (ir.nodes.length === 0) {
    lines.push('node_1: "Diagram"');
  }

  return lines.join("\n").trim();
}

export function emitD2FromIr(ir: DiagramIR): string {
  switch (ir.kind) {
    case "sequence":
      return emitD2Sequence(ir);
    case "class":
    case "object":
      return emitD2Class(ir);
    case "er":
      return emitD2Er(ir);
    default:
      return emitD2Graph(ir);
  }
}

export function isD2TargetFormat(format: DiagramFormat): boolean {
  return format === "d2";
}
