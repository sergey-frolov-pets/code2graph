import {
  cloneDiagramIr,
  type DiagramDirection,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNodeShape,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import {
  layoutIrForGraphml,
  type IrEdgeLayout,
  type IrGroupLayout,
  type IrNodeLayout,
} from "@/services/conversion/emit/graphml-layout-ir";
import { DASHED_STYLE, type GraphmlGeometry } from "@/services/graphml/graphml-types";

export const GRAPHML_IR_PAYLOAD_ATTR_NAME = "c2g_ir" as const;

export interface EmitGraphmlOptions {
  /** Emit yEd `<y:ShapeNode>` / `<y:PolyLineEdge>` blocks alongside standard keys (default: false to keep clean GraphML unless requested). */
  includeYedGraphics?: boolean;
  /** Embed lossless Code2Graph IR JSON payload on `<graph>` (default: true). */
  includeIrPayload?: boolean;
}

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
    case "stadium":
    case "cylinder":
    case "document":
      return "rectangle";
    case "ellipse":
    case "circle":
      return "ellipse";
    case "diamond":
      return "diamond";
    case "parallelogram":
      return "parallelogram";
    case "trapezoid":
      return "trapezoid";
    case "hexagon":
      return "hexagon";
    case "predefinedProcess":
      return "predefinedProcess";
    case "note":
      return "note";
    default:
      return undefined;
  }
}

function yedShapeType(shape: DiagramNodeShape | undefined): string {
  switch (shape) {
    case "round":
    case "stadium":
      return "roundrectangle";
    case "ellipse":
    case "circle":
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
      return "rectangle";
  }
}

function rankdirAttribute(direction: DiagramDirection | undefined): string {
  if (direction === "LR" || direction === "RL" || direction === "BT") {
    return ` rankdir="${direction}"`;
  }
  return "";
}

function formatNum(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function augmentIrWithNotes(ir: DiagramIR): DiagramIR {
  const notes = ir.extras?.notes ?? [];
  if (notes.length === 0) {
    return ir;
  }

  const clone = cloneDiagramIr(ir);
  const usedIds = new Set(clone.nodes.map((n) => n.id));
  for (const grp of clone.groups ?? []) {
    usedIds.add(grp.id);
  }

  notes.forEach((note, index) => {
    const cleanText = note.text.replace(/\\n/g, "\n").trim();
    if (!cleanText) {
      return;
    }
    const alreadyExists = clone.nodes.some(
      (n) => n.visual?.shape === "note" && n.label === cleanText,
    );
    if (alreadyExists) {
      return;
    }

    const noteId = uniqueDiagramId(`note_${index + 1}`, usedIds);
    const targetNode = note.targetId
      ? clone.nodes.find(
          (n) => n.id === note.targetId || n.label === note.targetId,
        )
      : undefined;

    clone.nodes.push({
      id: noteId,
      label: cleanText,
      kind: "artifact",
      groupId: targetNode?.groupId,
      visual: {
        shape: "note",
        fill: "#fef9c3",
        stroke: "#ca8a04",
      },
      matchConfidence: 1,
    });

    if (targetNode) {
      clone.edges.push({
        id: `enote_${index + 1}`,
        source: noteId,
        target: targetNode.id,
        kind: "dashed",
        directed: false,
        matchConfidence: 1,
      });
    }
  });

  return clone;
}

function emitLeafNodeLines(
  nodeLayout: IrNodeLayout,
  parentOrigin: { x: number; y: number },
  indent: string,
  includeYed: boolean,
): string[] {
  const { node, displayLabel, shape, fill, stroke, geometry } = nodeLayout;
  const relX = geometry.x - parentOrigin.x;
  const relY = geometry.y - parentOrigin.y;
  const lines: string[] = [`${indent}<node id="${escapeXml(node.id)}">`];

  lines.push(`${indent}  <data key="d0">${escapeXml(displayLabel)}</data>`);
  lines.push(`${indent}  <data key="d2">${formatNum(relX)}</data>`);
  lines.push(`${indent}  <data key="d3">${formatNum(relY)}</data>`);
  if (fill) {
    lines.push(`${indent}  <data key="d4">${escapeXml(fill)}</data>`);
  }
  const graphmlShape = graphmlShapeName(shape);
  if (graphmlShape) {
    lines.push(`${indent}  <data key="d5">${escapeXml(graphmlShape)}</data>`);
  }
  lines.push(`${indent}  <data key="d6">${formatNum(geometry.width)}</data>`);
  lines.push(`${indent}  <data key="d7">${formatNum(geometry.height)}</data>`);
  if (stroke) {
    lines.push(`${indent}  <data key="d9">${escapeXml(stroke)}</data>`);
  }
  if (node.kind && node.kind !== "default") {
    lines.push(`${indent}  <data key="d10">${escapeXml(node.kind)}</data>`);
  }
  const stereo = node.semantic?.stereotype
    ? String(node.semantic.stereotype)
    : undefined;
  if (stereo) {
    lines.push(`${indent}  <data key="d11">${escapeXml(stereo)}</data>`);
  }

  if (includeYed) {
    const yedFill = fill ?? "#ffffff";
    const yedStroke = stroke ?? "#64748b";
    lines.push(
      `${indent}  <data key="d15">`,
      `${indent}    <y:ShapeNode>`,
      `${indent}      <y:Geometry x="${formatNum(relX)}" y="${formatNum(relY)}" width="${formatNum(geometry.width)}" height="${formatNum(geometry.height)}"/>`,
      `${indent}      <y:Fill color="${escapeXml(yedFill)}" transparent="false"/>`,
      `${indent}      <y:BorderStyle color="${escapeXml(yedStroke)}" type="line" width="1.5"/>`,
      `${indent}      <y:NodeLabel>${escapeXml(displayLabel)}</y:NodeLabel>`,
      `${indent}      <y:Shape type="${yedShapeType(shape)}"/>`,
      `${indent}    </y:ShapeNode>`,
      `${indent}  </data>`,
    );
  }

  lines.push(`${indent}</node>`);
  return lines;
}

function emitGroupNodeLines(
  group: DiagramGroup,
  allGroups: readonly DiagramGroup[],
  groupLayouts: Map<string, IrGroupLayout>,
  nodeLayouts: Map<string, IrNodeLayout>,
  emittedNodes: Set<string>,
  emittedGroups: Set<string>,
  parentOrigin: { x: number; y: number },
  indent: string,
  includeYed: boolean,
): string[] {
  if (emittedGroups.has(group.id)) {
    return [];
  }
  const grpLayout = groupLayouts.get(group.id);
  const childGroups = allGroups.filter(
    (g) => g.parentId === group.id && !emittedGroups.has(g.id),
  );
  const memberLayouts: IrNodeLayout[] = [];
  for (const layout of nodeLayouts.values()) {
    if (layout.node.groupId === group.id && !emittedNodes.has(layout.node.id)) {
      memberLayouts.push(layout);
    }
  }

  if (memberLayouts.length === 0 && childGroups.length === 0) {
    return [];
  }

  emittedGroups.add(group.id);

  const absGeo: GraphmlGeometry = grpLayout?.geometry ?? {
    x: parentOrigin.x,
    y: parentOrigin.y,
    width: 220,
    height: 120,
  };
  const relX = absGeo.x - parentOrigin.x;
  const relY = absGeo.y - parentOrigin.y;
  const label = group.label ?? group.id;
  const fill = grpLayout?.fill ?? group.fill;
  const stroke = grpLayout?.stroke ?? group.stroke;

  const lines: string[] = [`${indent}<node id="${escapeXml(group.id)}">`];
  lines.push(`${indent}  <data key="d0">${escapeXml(label)}</data>`);
  lines.push(`${indent}  <data key="d2">${formatNum(relX)}</data>`);
  lines.push(`${indent}  <data key="d3">${formatNum(relY)}</data>`);
  if (fill) {
    lines.push(`${indent}  <data key="d4">${escapeXml(fill)}</data>`);
  }
  lines.push(`${indent}  <data key="d6">${formatNum(absGeo.width)}</data>`);
  lines.push(`${indent}  <data key="d7">${formatNum(absGeo.height)}</data>`);
  if (stroke) {
    lines.push(`${indent}  <data key="d9">${escapeXml(stroke)}</data>`);
  }
  if (group.kind) {
    lines.push(`${indent}  <data key="d10">${escapeXml(group.kind)}</data>`);
  }

  lines.push(
    `${indent}  <graph id="${escapeXml(group.id)}_graph" edgedefault="directed">`,
  );

  const nextOrigin = { x: absGeo.x, y: absGeo.y };
  for (const childGrp of childGroups) {
    lines.push(
      ...emitGroupNodeLines(
        childGrp,
        allGroups,
        groupLayouts,
        nodeLayouts,
        emittedNodes,
        emittedGroups,
        nextOrigin,
        `${indent}    `,
        includeYed,
      ),
    );
  }

  for (const memberLayout of memberLayouts) {
    emittedNodes.add(memberLayout.node.id);
    lines.push(
      ...emitLeafNodeLines(
        memberLayout,
        nextOrigin,
        `${indent}    `,
        includeYed,
      ),
    );
  }

  lines.push(`${indent}  </graph>`);
  lines.push(`${indent}</node>`);
  return lines;
}

function emitEdgeLines(
  edge: IrEdgeLayout,
  indent: string,
  includeYed: boolean,
): string[] {
  const directedAttr = edge.directed ? "" : ' directed="false"';
  const idAttr = edge.id ? ` id="${escapeXml(edge.id)}"` : "";
  const lines: string[] = [
    `${indent}<edge${idAttr} source="${escapeXml(edge.source)}" target="${escapeXml(edge.target)}"${directedAttr}>`,
  ];

  if (edge.label) {
    lines.push(`${indent}  <data key="d1">${escapeXml(edge.label)}</data>`);
  }
  if (edge.dashed) {
    lines.push(`${indent}  <data key="d8">${DASHED_STYLE}</data>`);
  }
  if (edge.color) {
    lines.push(`${indent}  <data key="d12">${escapeXml(edge.color)}</data>`);
  }
  if (edge.kind && edge.kind !== "arrow") {
    lines.push(`${indent}  <data key="d13">${escapeXml(edge.kind)}</data>`);
  }
  if (edge.sourceLabel) {
    lines.push(`${indent}  <data key="d17">${escapeXml(edge.sourceLabel)}</data>`);
  }
  if (edge.targetLabel) {
    lines.push(`${indent}  <data key="d18">${escapeXml(edge.targetLabel)}</data>`);
  }

  if (includeYed) {
    const stroke = edge.color ?? "#64748b";
    const lineType = edge.dashed ? "dashed" : "line";
    const targetArrow = edge.directed ? "standard" : "none";
    lines.push(`${indent}  <data key="d16">`);
    lines.push(`${indent}    <y:PolyLineEdge>`);
    if (edge.bends.length > 0) {
      lines.push(`${indent}      <y:Path sx="0.0" sy="0.0" tx="0.0" ty="0.0">`);
      for (const pt of edge.bends) {
        lines.push(
          `${indent}        <y:Point x="${formatNum(pt.x)}" y="${formatNum(pt.y)}"/>`,
        );
      }
      lines.push(`${indent}      </y:Path>`);
    }
    lines.push(
      `${indent}      <y:LineStyle color="${escapeXml(stroke)}" type="${lineType}" width="1.5"/>`,
      `${indent}      <y:Arrows source="none" target="${targetArrow}"/>`,
    );
    if (edge.label) {
      lines.push(`${indent}      <y:EdgeLabel>${escapeXml(edge.label)}</y:EdgeLabel>`);
    }
    lines.push(`${indent}    </y:PolyLineEdge>`);
    lines.push(`${indent}  </data>`);
  }

  lines.push(`${indent}</edge>`);
  return lines;
}

export function emitGraphmlFromIr(
  ir: DiagramIR,
  options: EmitGraphmlOptions = {},
): string {
  const includeYed = options.includeYedGraphics ?? false;
  const includeIrPayload = options.includeIrPayload ?? true;

  const workingIr = augmentIrWithNotes(ir);
  const layout = layoutIrForGraphml(workingIr);

  const xmlnsY = includeYed
    ? ' xmlns:y="http://www.yworks.com/xml/graphml"'
    : "";

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"${xmlnsY}>`,
    '  <key id="d0" for="node" attr.name="label" attr.type="string"/>',
    '  <key id="d1" for="edge" attr.name="label" attr.type="string"/>',
    '  <key id="d2" for="node" attr.name="x" attr.type="double"/>',
    '  <key id="d3" for="node" attr.name="y" attr.type="double"/>',
    '  <key id="d4" for="node" attr.name="fill" attr.type="string"/>',
    '  <key id="d5" for="node" attr.name="shape" attr.type="string"/>',
    '  <key id="d6" for="node" attr.name="width" attr.type="double"/>',
    '  <key id="d7" for="node" attr.name="height" attr.type="double"/>',
    '  <key id="d8" for="edge" attr.name="style" attr.type="string"/>',
    '  <key id="d9" for="node" attr.name="stroke" attr.type="string"/>',
    '  <key id="d10" for="node" attr.name="kind" attr.type="string"/>',
    '  <key id="d11" for="node" attr.name="stereotype" attr.type="string"/>',
    '  <key id="d12" for="edge" attr.name="color" attr.type="string"/>',
    '  <key id="d13" for="edge" attr.name="kind" attr.type="string"/>',
    `  <key id="d14" for="graph" attr.name="${GRAPHML_IR_PAYLOAD_ATTR_NAME}" attr.type="string"/>`,
    '  <key id="d17" for="edge" attr.name="sourceLabel" attr.type="string"/>',
    '  <key id="d18" for="edge" attr.name="targetLabel" attr.type="string"/>',
  ];

  if (includeYed) {
    lines.push(
      '  <key id="d15" for="node" yfiles.type="nodegraphics"/>',
      '  <key id="d16" for="edge" yfiles.type="edgegraphics"/>',
    );
  }

  if (ir.extras?.title) {
    lines.push(`  <desc>${escapeXml(ir.extras.title)}</desc>`);
  }

  lines.push(`  <graph edgedefault="directed"${rankdirAttribute(ir.direction)}>`);

  if (includeIrPayload) {
    const payloadIr: DiagramIR = {
      ...cloneDiagramIr(ir),
      nodes: ir.nodes.map((node) => {
        const computed = layout.nodes.get(node.id);
        if (!computed) {
          return node;
        }
        return {
          ...node,
          visual: {
            ...node.visual,
            x: computed.geometry.x,
            y: computed.geometry.y,
            width: computed.geometry.width,
            height: computed.geometry.height,
            fill: node.visual?.fill ?? computed.fill,
            stroke: node.visual?.stroke ?? computed.stroke,
            shape: node.visual?.shape ?? computed.shape,
          },
        };
      }),
    };
    lines.push(`    <data key="d14">${escapeXml(JSON.stringify(payloadIr))}</data>`);
  }

  const allGroups = workingIr.groups ?? [];
  const usedEntityIds = new Set(workingIr.nodes.map((n) => n.id));
  const groupEmitIdMap = new Map<string, string>();
  for (const grp of allGroups) {
    let emitId = grp.id;
    if (usedEntityIds.has(emitId)) {
      emitId = uniqueDiagramId(`${grp.id}_group`, usedEntityIds);
    } else {
      usedEntityIds.add(emitId);
    }
    groupEmitIdMap.set(grp.id, emitId);
  }

  const normalizedGroups: DiagramGroup[] = allGroups.map((grp) => ({
    ...grp,
    id: groupEmitIdMap.get(grp.id) ?? grp.id,
    parentId: grp.parentId
      ? (groupEmitIdMap.get(grp.parentId) ?? grp.parentId)
      : undefined,
  }));
  const normalizedGroupLayouts = new Map<string, IrGroupLayout>();
  for (const [origId, grpLayout] of layout.groups.entries()) {
    const mappedId = groupEmitIdMap.get(origId) ?? origId;
    normalizedGroupLayouts.set(mappedId, {
      ...grpLayout,
      group: {
        ...grpLayout.group,
        id: mappedId,
      },
    });
  }
  for (const nodeLayout of layout.nodes.values()) {
    if (nodeLayout.node.groupId && groupEmitIdMap.has(nodeLayout.node.groupId)) {
      nodeLayout.node = {
        ...nodeLayout.node,
        groupId: groupEmitIdMap.get(nodeLayout.node.groupId),
      };
    }
  }

  const groupIds = new Set(normalizedGroups.map((g) => g.id));
  const emittedNodes = new Set<string>();
  const emittedGroups = new Set<string>();
  const rootOrigin = { x: 0, y: 0 };

  const topLevelGroups = normalizedGroups.filter(
    (g) => !g.parentId || !groupIds.has(g.parentId),
  );
  for (const grp of topLevelGroups) {
    lines.push(
      ...emitGroupNodeLines(
        grp,
        normalizedGroups,
        normalizedGroupLayouts,
        layout.nodes,
        emittedNodes,
        emittedGroups,
        rootOrigin,
        "    ",
        includeYed,
      ),
    );
  }

  for (const node of workingIr.nodes) {
    if (emittedNodes.has(node.id) || groupIds.has(node.id)) {
      continue;
    }
    const nodeLayout = layout.nodes.get(node.id);
    if (!nodeLayout) {
      continue;
    }
    emittedNodes.add(node.id);
    lines.push(
      ...emitLeafNodeLines(nodeLayout, rootOrigin, "    ", includeYed),
    );
  }

  for (const edge of layout.edges) {
    if (!emittedNodes.has(edge.source) || !emittedNodes.has(edge.target)) {
      continue;
    }
    lines.push(...emitEdgeLines(edge, "    ", includeYed));
  }

  lines.push("  </graph>", "</graphml>");
  return lines.join("\n");
}
