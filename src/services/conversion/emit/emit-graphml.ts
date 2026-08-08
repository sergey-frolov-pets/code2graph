import type { DiagramIR } from "@/services/conversion/diagram-ir";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    `  <graph edgedefault="directed"${ir.direction === "LR" ? ' rankdir="LR"' : ""}>`,
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
    if (node.visual?.shape) {
      lines.push(`      <data key="d5">${escapeXml(node.visual.shape)}</data>`);
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
    lines.push("    </edge>");
  }

  lines.push("  </graph>", "</graphml>");
  return lines.join("\n");
}
