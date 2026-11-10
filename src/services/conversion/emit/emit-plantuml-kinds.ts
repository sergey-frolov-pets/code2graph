import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { resolveHierarchyItems, wrapPlantUml } from "@/services/conversion/emit/emit-kind-shared";
import { emitPlantUmlActivityBody } from "@/services/conversion/emit/plantuml-activity-emit";
import {
  emitPlantUmlComponentNode,
  escapePlantUmlQuoted,
  flattenPlantUmlLabel,
  formatPlantUmlEdgeSuffix,
} from "@/services/conversion/emit/plantuml-emit-utils";
import { plantUmlColorToken } from "@/services/conversion/parse/plantuml-style";
import { buildGraphIndex } from "@/services/conversion/graph/graph-analysis";

function plantUmlArrowForDirection(
  direction: DiagramIR["direction"],
  dashed = false,
): string {
  const dirPart =
    direction === "BT"
      ? "up"
      : direction === "RL"
        ? "left"
        : "";
  if (dashed) {
    return dirPart ? `.${dirPart}.>` : "..>";
  }
  return dirPart ? `-${dirPart}->` : "-->";
}

function pushPlantUmlDirection(lines: string[], direction: DiagramIR["direction"]): void {
  if (direction === "LR" || direction === "RL") {
    lines.push("left to right direction", "");
  }
}

export function emitPlantUmlEr(ir: DiagramIR): string {
  const lines: string[] = [];
  pushPlantUmlDirection(lines, ir.direction);
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
  if (ir.direction === "LR" || ir.direction === "RL") {
    lines.push("left to right direction");
  } else if (ir.direction === "TB" || ir.direction === "BT") {
    lines.push("top to bottom direction");
  }
  for (const item of resolveHierarchyItems(ir)) {
    lines.push(`${"*".repeat(Math.max(1, item.level))} ${flattenPlantUmlLabel(item.label)}`);
  }
  lines.push("@endmindmap");
  return lines.join("\n");
}

export function emitPlantUmlUsecase(ir: DiagramIR): string {
  const lines: string[] = [];
  pushPlantUmlDirection(lines, ir.direction);
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
    const arrow = plantUmlArrowForDirection(ir.direction, edge.kind === "dashed");
    lines.push(`${edge.source} ${arrow} ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlDeployment(ir: DiagramIR): string {
  const lines: string[] = [];
  pushPlantUmlDirection(lines, ir.direction);
  for (const node of ir.nodes) {
    const kw =
      node.kind === "system"
        ? "database"
        : node.kind === "artifact"
          ? "artifact"
          : "node";
    lines.push(`${kw} "${escapePlantUmlQuoted(node.label)}" as ${node.id}`);
  }
  const arrow = plantUmlArrowForDirection(ir.direction);
  for (const edge of ir.edges) {
    lines.push(`${edge.source} ${arrow} ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlObject(ir: DiagramIR): string {
  const lines: string[] = [];
  pushPlantUmlDirection(lines, ir.direction);
  for (const node of ir.nodes) {
    const fields = ir.extras?.objectFields?.[node.id] ?? [];
    lines.push(`object "${escapePlantUmlQuoted(node.label)}" as ${node.id} {`);
    for (const field of fields) {
      lines.push(`  ${field.name} = ${field.value}`);
    }
    lines.push("}");
  }
  const arrow = plantUmlArrowForDirection(ir.direction);
  for (const edge of ir.edges) {
    lines.push(`${edge.source} ${arrow} ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
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
  for (const item of resolveHierarchyItems(ir)) {
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
  pushPlantUmlDirection(lines, ir.direction);
  for (const node of ir.nodes) {
    const type = String(node.semantic?.archimateType ?? "Application_Component");
    lines.push(`${type}(${node.id}, "${escapePlantUmlQuoted(node.label)}")`);
  }
  const relMacro =
    ir.direction === "BT"
      ? "Rel_Flow_Up"
      : ir.direction === "RL"
        ? "Rel_Flow_Left"
        : "Rel_Flow";
  for (const edge of ir.edges) {
    const label = edge.label ? escapePlantUmlQuoted(edge.label) : "Uses";
    lines.push(`${relMacro}(${edge.source}, ${edge.target}, "${label}")`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlGraph(ir: DiagramIR): string {
  const lines: string[] = [];
  pushPlantUmlDirection(lines, ir.direction);

  const groupedNodeIds = new Set<string>();
  const groupIds = new Set((ir.groups ?? []).map((group) => group.id));

  for (const group of ir.groups ?? []) {
    const groupNodes = ir.nodes.filter(
      (node) => node.groupId === group.id && !groupIds.has(node.id),
    );
    if (groupNodes.length === 0) {
      continue;
    }

    const groupColor = plantUmlColorToken(group.fill);
    lines.push(
      `package "${escapePlantUmlQuoted(group.label ?? group.id)}"${groupColor ? ` ${groupColor}` : ""} {`,
    );
    for (const node of groupNodes) {
      lines.push(`  ${emitPlantUmlComponentNode(node.id, node.label, node.visual?.fill, node.visual?.shape)}`);
      groupedNodeIds.add(node.id);
    }
    lines.push("}", "");
  }

  for (const node of ir.nodes) {
    if (groupedNodeIds.has(node.id) || groupIds.has(node.id)) {
      continue;
    }
    lines.push(emitPlantUmlComponentNode(node.id, node.label, node.visual?.fill, node.visual?.shape));
  }

  for (const edge of ir.edges) {
    const arrow = plantUmlArrowForDirection(ir.direction, edge.kind === "dashed");
    lines.push(`${edge.source} ${arrow} ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlActivity(ir: DiagramIR): string {
  return wrapPlantUml(emitPlantUmlActivityBody(ir).join("\n"));
}

export function emitPlantUmlGantt(ir: DiagramIR): string {
  const title = ir.extras?.title || "Converted plan";
  const lines = [
    "@startgantt",
    `title ${flattenPlantUmlLabel(title)}`,
    "project starts 2026-01-06",
    "",
  ];
  const graph = buildGraphIndex(ir);
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
    const incoming = graph.incoming.get(node.id)?.[0];
    const depNode = incoming
      ? graph.nodeById.get(incoming.source)
      : ir.nodes[index - 1];
    const prevLabel = depNode ? flattenPlantUmlLabel(depNode.label) || depNode.id : label;
    lines.push(`[${label}] lasts ${durationText} and starts at [${prevLabel}]'s end`);
  });
  lines.push("@endgantt");
  return lines.join("\n");
}

export function emitPlantUmlClass(ir: DiagramIR): string {
  const lines: string[] = [];
  pushPlantUmlDirection(lines, ir.direction);
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
  const dirHint =
    ir.direction === "BT"
      ? "up"
      : ir.direction === "RL"
        ? "left"
        : "";
  for (const edge of ir.edges) {
    const suffix = formatPlantUmlEdgeSuffix(edge.label);
    if (edge.kind === "inherit") {
      const isRealization = edge.semantic?.relationType === "realization";
      const arrow = isRealization
        ? dirHint ? `.${dirHint}.|>` : "..|>"
        : dirHint ? `-${dirHint}-|>` : "--|>";
      lines.push(`${edge.source} ${arrow} ${edge.target}${suffix}`);
    } else if (edge.kind === "dashed") {
      const arrow = plantUmlArrowForDirection(ir.direction, true);
      lines.push(`${edge.source} ${arrow} ${edge.target}${suffix}`);
    } else {
      const arrow = plantUmlArrowForDirection(ir.direction, false);
      lines.push(`${edge.source} ${arrow} ${edge.target}${suffix}`);
    }
  }
  return wrapPlantUml(lines.join("\n"));
}

export function emitPlantUmlState(ir: DiagramIR): string {
  const lines: string[] = [];
  pushPlantUmlDirection(lines, ir.direction);
  for (const node of ir.nodes) {
    if (node.label !== node.id) {
      lines.push(`state "${escapePlantUmlQuoted(node.label)}" as ${node.id}`);
    }
    if (node.semantic?.stereotype === "choice") {
      lines.push(`state ${node.id} <<choice>>`);
    }
  }
  const arrow = plantUmlArrowForDirection(ir.direction);
  const initialNodes = ir.nodes.filter((n) => n.semantic?.isInitial);
  if (initialNodes.length > 0) {
    for (const init of initialNodes) {
      lines.push(`[*] ${arrow} ${init.id}`);
    }
  } else if (ir.edges.length > 0) {
    lines.push(`[*] ${arrow} ${ir.edges[0]!.source}`);
  } else if (ir.nodes.length > 0) {
    lines.push(`[*] ${arrow} ${ir.nodes[0]!.id}`);
  }

  for (const edge of ir.edges) {
    lines.push(`${edge.source} ${arrow} ${edge.target}${formatPlantUmlEdgeSuffix(edge.label)}`);
  }

  for (const node of ir.nodes) {
    if (node.semantic?.isFinal) {
      lines.push(`${node.id} ${arrow} [*]`);
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
  const lines = [include];
  if (ir.direction === "LR" || ir.direction === "RL") {
    lines.push("LAYOUT_LEFT_RIGHT()");
  } else if (ir.direction === "TB" || ir.direction === "BT") {
    lines.push("LAYOUT_TOP_DOWN()");
  }
  lines.push("");
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
  const relCall =
    ir.direction === "BT"
      ? "Rel_Up"
      : ir.direction === "RL"
        ? "Rel_Left"
        : "Rel";
  for (const edge of ir.edges) {
    const label = edge.label ? `, "${escapePlantUmlQuoted(edge.label)}"` : ', "Uses"';
    const tech = edge.semantic?.technology
      ? `, "${escapePlantUmlQuoted(String(edge.semantic.technology))}"`
      : "";
    lines.push(`${relCall}(${edge.source}, ${edge.target}${label}${tech})`);
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
