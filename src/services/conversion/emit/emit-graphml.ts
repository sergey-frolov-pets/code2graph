import type { DiagramDirection, DiagramIR, DiagramNodeShape } from "@/services/conversion/diagram-ir";
import { DASHED_STYLE } from "@/services/graphml/graphml-types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function graphmlShapeName(shape: DiagramNodeShape | undefined): string | undefined {
  switch (shape) {
    case "rect":
    case "round":
      return "rectangle";
    case "ellipse":
      return "ellipse";
    case "diamond":
      return "diamond";
    case "parallelogram":
      return "parallelogram";
    case "trapezoid":
      return "trapezoid";
    case "hexagon":
      return "hexagon";
    default:
      return undefined;
  }
}

function rankdirAttribute(direction: DiagramDirection | undefined): string {
  if (direction === "LR" || direction === "RL" || direction === "BT") {
    return ` rankdir="${direction}"`;
  }

  return "";
}

export function emitGraphmlFromIr(ir: DiagramIR): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
    '  <key id="d0" for="node" attr.name="label" attr.type="string"/>',
    '  <key id="d1" for="edge" attr.name="label" attr.type="string"/>',
    '  <key id="d2" for="node" attr.name="x" attr.type="double"/>',
    '  <key id="d3" for="node" attr.name="y" attr.type="double"/>',
    '  <key id="d4" for="node" attr.name="fill" attr.type="string"/>',
    '  <key id="d5" for="node" attr.name="shape" attr.type="string"/>',
    '  <key id="d6" for="node" attr.name="width" attr.type="double"/>',
    '  <key id="d7" for="node" attr.name="height" attr.type="double"/>',
    '  <key id="d8" for="edge" attr.name="style" attr.type="string"/>',
    `  <graph edgedefault="directed"${rankdirAttribute(ir.direction)}>`,
  ];

  for (const node of ir.nodes) {
    lines.push(`    <node id="${escapeXml(node.id)}">`);
    lines.push(`      <data key="d0">${escapeXml(node.label)}</data>`);
    if (node.visual?.x !== undefined) {
      lines.push(`      <data key="d2">${node.visual.x}</data>`);
    }
    if (node.visual?.y !== undefined) {
      lines.push(`      <data key="d3">${node.visual.y}</data>`);
    }
    if (node.visual?.fill) {
      lines.push(`      <data key="d4">${escapeXml(node.visual.fill)}</data>`);
    }
    const shape = graphmlShapeName(node.visual?.shape);
    if (shape) {
      lines.push(`      <data key="d5">${escapeXml(shape)}</data>`);
    }
    if (node.visual?.width !== undefined) {
      lines.push(`      <data key="d6">${node.visual.width}</data>`);
    }
    if (node.visual?.height !== undefined) {
      lines.push(`      <data key="d7">${node.visual.height}</data>`);
    }
    lines.push("    </node>");
  }

  for (const edge of ir.edges) {
    lines.push(
      `    <edge source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}">`,
    );
    if (edge.label) {
      lines.push(`      <data key="d1">${escapeXml(edge.label)}</data>`);
    }
    if (edge.kind === "dashed") {
      lines.push(`      <data key="d8">${DASHED_STYLE}</data>`);
    }
    lines.push("    </edge>");
  }

  lines.push("  </graph>", "</graphml>");
  return lines.join("\n");
}
