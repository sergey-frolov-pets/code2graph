import dagre from "dagre";
import type {
  DiagramClassMember,
  DiagramDirection,
  DiagramEntityAttribute,
  DiagramGroup,
  DiagramIR,
  DiagramNode,
  DiagramNodeShape,
} from "@/services/conversion/diagram-ir";
import {
  GRAPH_MARGIN,
  GROUP_MIN_HEIGHT,
  GROUP_MIN_WIDTH,
  LAYOUT_EDGE_SEP,
  LAYOUT_NODE_SEP,
  LAYOUT_RANK_SEP,
  NODE_CHAR_WIDTH,
  NODE_HEIGHT,
  NODE_LABEL_LINE_HEIGHT,
  NODE_LABEL_PADDING,
  NODE_WIDTH,
  type GraphmlGeometry,
  type GraphmlRankDirection,
  type PolyPoint,
} from "@/services/graphml/graphml-types";

export interface IrNodeLayout {
  node: DiagramNode;
  displayLabel: string;
  shape: DiagramNodeShape;
  fill?: string;
  stroke?: string;
  geometry: GraphmlGeometry;
}

export interface IrGroupLayout {
  group: DiagramGroup;
  fill?: string;
  stroke?: string;
  geometry: GraphmlGeometry;
}

export interface IrEdgeLayout {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: DiagramIR["edges"][number]["kind"];
  directed: boolean;
  dashed: boolean;
  color?: string;
  sourceLabel?: string;
  targetLabel?: string;
  bends: PolyPoint[];
}

export interface IrGraphmlLayoutResult {
  direction: GraphmlRankDirection;
  nodes: Map<string, IrNodeLayout>;
  groups: Map<string, IrGroupLayout>;
  edges: IrEdgeLayout[];
}

const DEFAULT_PALETTE = {
  actorFill: "#dbeafe",
  actorStroke: "#2563eb",
  decisionFill: "#fef3c7",
  decisionStroke: "#d97706",
  startFill: "#dcfce7",
  startStroke: "#15803d",
  endFill: "#fee2e2",
  endStroke: "#dc2626",
  classFill: "#f8fafc",
  classStroke: "#334155",
  interfaceFill: "#e8f5e9",
  interfaceStroke: "#2e7d32",
  enumFill: "#fff3e0",
  enumStroke: "#e65100",
  systemFill: "#e0f2fe",
  systemStroke: "#0284c7",
  containerFill: "#ede9fe",
  containerStroke: "#7c3aed",
  noteFill: "#fef9c3",
  noteStroke: "#ca8a04",
  groupFill: "#f8fafc",
  groupStroke: "#94a3b8",
} as const;

const SEQUENCE_COL_WIDTH = 150;
const SEQUENCE_COL_GAP = 70;
const SEQUENCE_TOP_Y = 36;
const SEQUENCE_MSG_START_Y = 104;
const SEQUENCE_MSG_STEP_Y = 42;
const SEQUENCE_SELF_LOOP_DX = 44;
const SEQUENCE_SELF_LOOP_DY = 18;

const TREE_LEVEL_GAP_X = 210;
const TREE_LEVEL_GAP_Y = 96;
const TREE_SIBLING_GAP_X = 36;
const TREE_SIBLING_GAP_Y = 28;

const GROUP_PAD_X = 28;
const GROUP_PAD_TOP = 34;
const GROUP_PAD_BOTTOM = 24;

const MIN_MULTI_LINE_PAD_Y = 16;
const CLASS_DIVIDER = "────────────";

function formatClassMembersLines(members: readonly DiagramClassMember[]): string[] {
  return members.map((member) => {
    const vis = member.visibility ?? "+";
    const typeSuffix = member.type ? `: ${member.type}` : "";
    return `${vis}${member.name}${typeSuffix}`;
  });
}

function formatEntityAttributesLines(
  attributes: readonly DiagramEntityAttribute[],
): string[] {
  return attributes.map((attr) => {
    const keyBadge = attr.isPrimaryKey
      ? " [PK]"
      : attr.isForeignKey
        ? " [FK]"
        : "";
    return `${attr.name}: ${attr.type}${keyBadge}`;
  });
}

export function buildRichNodeDisplayLabel(ir: DiagramIR, node: DiagramNode): string {
  const baseLabel = node.label.replace(/\\n/g, "\n").trim() || node.id;

  if (ir.kind === "class" || node.kind === "class") {
    const stereo = node.semantic?.stereotype
      ? `<<${String(node.semantic.stereotype)}>>`
      : undefined;
    const members = ir.extras?.classMembers?.[node.id] ?? [];
    const headerLines = stereo ? [stereo, baseLabel] : [baseLabel];
    if (members.length === 0) {
      return headerLines.join("\n");
    }
    return [...headerLines, CLASS_DIVIDER, ...formatClassMembersLines(members)].join("\n");
  }

  if (ir.kind === "er") {
    const attributes = ir.extras?.entityAttributes?.[node.id] ?? [];
    if (attributes.length === 0) {
      return baseLabel;
    }
    return [baseLabel, CLASS_DIVIDER, ...formatEntityAttributesLines(attributes)].join("\n");
  }

  if (ir.kind === "object") {
    const fields = ir.extras?.objectFields?.[node.id] ?? [];
    if (fields.length === 0) {
      return baseLabel;
    }
    const fieldLines = fields.map((f) => `${f.name} = ${f.value}`);
    return [baseLabel, CLASS_DIVIDER, ...fieldLines].join("\n");
  }

  if (ir.kind === "state") {
    const descriptions = node.semantic?.descriptions as string[] | undefined;
    if (descriptions && descriptions.length > 0 && !baseLabel.includes("\n")) {
      return [baseLabel, ...descriptions].join("\n");
    }
  }

  if (ir.kind === "c4_context" || ir.kind === "c4_container") {
    const tech = node.semantic?.technology ? String(node.semantic.technology).trim() : "";
    const desc = node.semantic?.description ? String(node.semantic.description).trim() : "";
    const extra: string[] = [];
    if (tech && !baseLabel.includes(tech)) {
      extra.push(`[${tech}]`);
    }
    if (desc && !baseLabel.includes(desc)) {
      extra.push(desc);
    }
    if (extra.length > 0) {
      return [baseLabel, ...extra].join("\n");
    }
  }

  return baseLabel;
}

export function resolveNodeShape(ir: DiagramIR, node: DiagramNode): DiagramNodeShape {
  if (node.kind === "start" || node.kind === "end") {
    return "ellipse";
  }

  if (node.visual?.shape) {
    return node.visual.shape;
  }

  const stereo = String(node.semantic?.stereotype ?? "").toLowerCase();
  if (stereo === "choice" || node.kind === "decision") {
    return "diamond";
  }

  if (node.kind === "usecase" || node.kind === "actor") {
    return "ellipse";
  }

  if (node.kind === "artifact") {
    return "note";
  }

  const c4Type = String(node.semantic?.c4Type ?? "").toLowerCase();
  if (c4Type.includes("db") || c4Type.includes("database")) {
    return "cylinder";
  }
  if (c4Type.includes("queue")) {
    return "parallelogram";
  }

  if (node.kind === "system" && /db|database|sql|база|бд|storage|store/i.test(node.label)) {
    return "cylinder";
  }

  if (ir.kind === "state") {
    return "round";
  }

  return "rect";
}

export function resolveNodeColors(
  ir: DiagramIR,
  node: DiagramNode,
): { fill?: string; stroke?: string } {
  const explicitFill = normalizeHexColor(node.visual?.fill);
  const explicitStroke = normalizeHexColor(node.visual?.stroke);
  if (explicitFill || explicitStroke) {
    return { fill: explicitFill, stroke: explicitStroke };
  }

  const stereo = String(node.semantic?.stereotype ?? "").toLowerCase();
  if (stereo === "interface") {
    return {
      fill: DEFAULT_PALETTE.interfaceFill,
      stroke: DEFAULT_PALETTE.interfaceStroke,
    };
  }
  if (stereo === "enumeration" || stereo === "enum") {
    return {
      fill: DEFAULT_PALETTE.enumFill,
      stroke: DEFAULT_PALETTE.enumStroke,
    };
  }

  switch (node.kind) {
    case "start":
      return { fill: DEFAULT_PALETTE.startFill, stroke: DEFAULT_PALETTE.startStroke };
    case "end":
      return { fill: DEFAULT_PALETTE.endFill, stroke: DEFAULT_PALETTE.endStroke };
    case "decision":
      return { fill: DEFAULT_PALETTE.decisionFill, stroke: DEFAULT_PALETTE.decisionStroke };
    case "actor":
      return { fill: DEFAULT_PALETTE.actorFill, stroke: DEFAULT_PALETTE.actorStroke };
    case "system":
      return { fill: DEFAULT_PALETTE.systemFill, stroke: DEFAULT_PALETTE.systemStroke };
    case "container":
      return { fill: DEFAULT_PALETTE.containerFill, stroke: DEFAULT_PALETTE.containerStroke };
    case "artifact":
      return { fill: DEFAULT_PALETTE.noteFill, stroke: DEFAULT_PALETTE.noteStroke };
    case "class":
      return { fill: DEFAULT_PALETTE.classFill, stroke: DEFAULT_PALETTE.classStroke };
    default:
      break;
  }

  if (ir.kind === "er" || ir.kind === "class") {
    return { fill: DEFAULT_PALETTE.classFill, stroke: DEFAULT_PALETTE.classStroke };
  }

  return {};
}

const NAMED_COLORS: Record<string, string> = {
  lightblue: "#dbeafe",
  lightyellow: "#fef9c3",
  lightgreen: "#dcfce7",
  pink: "#fce7f3",
  coral: "#fed7aa",
  lightgray: "#f1f5f9",
  lightgrey: "#f1f5f9",
  white: "#ffffff",
  red: "#fee2e2",
  green: "#dcfce7",
  blue: "#dbeafe",
  yellow: "#fef9c3",
  orange: "#ffedd5",
};

export function normalizeHexColor(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.trim().replace(/^#/, "");
  if (!trimmed) {
    return undefined;
  }
  const lower = trimmed.toLowerCase();
  if (NAMED_COLORS[lower]) {
    return NAMED_COLORS[lower];
  }
  if (/^[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${lower[0]}${lower[0]}${lower[1]}${lower[1]}${lower[2]}${lower[2]}`;
  }
  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${lower}`;
  }
  if (/^[0-9a-f]{8}$/i.test(trimmed)) {
    return `#${lower.slice(0, 6)}`;
  }
  return undefined;
}

export function measureMultilineNodeSize(
  displayLabel: string,
  shape: DiagramNodeShape,
  explicitWidth?: number,
  explicitHeight?: number,
): { width: number; height: number } {
  if (
    explicitWidth !== undefined &&
    explicitHeight !== undefined &&
    explicitWidth > 0 &&
    explicitHeight > 0
  ) {
    return { width: explicitWidth, height: explicitHeight };
  }

  const lines = displayLabel.split(/\r?\n/);
  const maxChars = Math.max(...lines.map((line) => line.length), 1);
  const shapeFactor =
    shape === "diamond"
      ? 1.45
      : shape === "hexagon" || shape === "ellipse"
        ? 1.2
        : 1;

  const computedWidth = Math.max(
    NODE_WIDTH,
    Math.ceil((maxChars * NODE_CHAR_WIDTH + NODE_LABEL_PADDING) * shapeFactor),
  );
  const computedHeight = Math.max(
    NODE_HEIGHT,
    Math.ceil(
      (lines.length * NODE_LABEL_LINE_HEIGHT + MIN_MULTI_LINE_PAD_Y) *
        (shape === "diamond" ? 1.3 : 1),
    ),
  );

  return {
    width: explicitWidth && explicitWidth > 0 ? explicitWidth : computedWidth,
    height: explicitHeight && explicitHeight > 0 ? explicitHeight : computedHeight,
  };
}

function hasCompleteValidNodeGeometry(ir: DiagramIR): boolean {
  if (ir.nodes.length === 0) {
    return false;
  }
  const allHaveCoords = ir.nodes.every(
    (node) =>
      node.visual?.x !== undefined &&
      node.visual?.y !== undefined &&
      Number.isFinite(node.visual.x) &&
      Number.isFinite(node.visual.y) &&
      (node.visual.width ?? NODE_WIDTH) > 0 &&
      (node.visual.height ?? NODE_HEIGHT) > 0,
  );
  if (!allHaveCoords) {
    return false;
  }
  if (ir.nodes.length <= 1) {
    return true;
  }
  const first = ir.nodes[0]!.visual!;
  return ir.nodes.some(
    (node) =>
      Math.abs((node.visual?.x ?? 0) - (first.x ?? 0)) > 1 ||
      Math.abs((node.visual?.y ?? 0) - (first.y ?? 0)) > 1,
  );
}

function resolveRankDirection(direction: DiagramDirection | undefined): GraphmlRankDirection {
  if (direction === "LR" || direction === "RL" || direction === "BT") {
    return direction;
  }
  return "TB";
}

function buildEdgeDisplayLabel(edge: DiagramIR["edges"][number]): {
  label?: string;
  sourceLabel?: string;
  targetLabel?: string;
} {
  const sourceCard =
    edge.sourceLabel ??
    (edge.semantic?.sourceCardinality ? String(edge.semantic.sourceCardinality) : undefined);
  const targetCard =
    edge.targetLabel ??
    (edge.semantic?.targetCardinality ? String(edge.semantic.targetCardinality) : undefined);
  const erCardinality = edge.semantic?.cardinality
    ? String(edge.semantic.cardinality)
    : undefined;
  const tech = edge.semantic?.technology ? String(edge.semantic.technology) : undefined;

  let label = edge.label;
  if (tech && label && !label.includes(tech)) {
    label = `${label} [${tech}]`;
  } else if (tech && !label) {
    label = `[${tech}]`;
  }
  if (erCardinality && label && !label.includes(erCardinality)) {
    label = `${label} (${erCardinality})`;
  } else if (erCardinality && !label) {
    label = erCardinality;
  }
  if ((sourceCard || targetCard) && label) {
    const cards = `${sourceCard ?? ""}..${targetCard ?? ""}`;
    if (!label.includes(cards)) {
      label = `${sourceCard ? `${sourceCard} ` : ""}${label}${targetCard ? ` ${targetCard}` : ""}`.trim();
    }
  } else if ((sourceCard || targetCard) && !label) {
    label = [sourceCard, targetCard].filter(Boolean).join(" → ");
  }

  return { label, sourceLabel: sourceCard, targetLabel: targetCard };
}

function isEdgeDirected(ir: DiagramIR, edge: DiagramIR["edges"][number]): boolean {
  if (edge.directed !== undefined) {
    return edge.directed;
  }
  const rawArrow = edge.semantic?.arrow ? String(edge.semantic.arrow) : "";
  if (rawArrow === "--" || rawArrow === "..") {
    return false;
  }
  if (ir.kind === "nwdiag") {
    return false;
  }
  return true;
}

function isEdgeDashed(edge: DiagramIR["edges"][number]): boolean {
  if (edge.kind === "dashed") {
    return true;
  }
  if (edge.semantic?.dashed === true) {
    return true;
  }
  if (edge.semantic?.relationType === "realization") {
    return true;
  }
  const rawArrow = edge.semantic?.arrow ? String(edge.semantic.arrow) : "";
  return rawArrow.includes(".");
}

function layoutSequenceGrid(
  ir: DiagramIR,
  direction: GraphmlRankDirection,
): IrGraphmlLayoutResult {
  const nodes = new Map<string, IrNodeLayout>();
  const groups = new Map<string, IrGroupLayout>();

  let currentX = GRAPH_MARGIN;
  for (const node of ir.nodes) {
    const displayLabel = buildRichNodeDisplayLabel(ir, node);
    const shape = resolveNodeShape(ir, node);
    const colors = resolveNodeColors(ir, node);
    const size = measureMultilineNodeSize(
      displayLabel,
      shape,
      node.visual?.width,
      node.visual?.height,
    );
    const width = Math.max(size.width, SEQUENCE_COL_WIDTH);
    nodes.set(node.id, {
      node,
      displayLabel,
      shape,
      fill: colors.fill,
      stroke: colors.stroke,
      geometry: {
        x: currentX,
        y: SEQUENCE_TOP_Y,
        width,
        height: size.height,
      },
    });
    currentX += width + SEQUENCE_COL_GAP;
  }

  const edges: IrEdgeLayout[] = ir.edges.map((edge, index) => {
    const srcLayout = nodes.get(edge.source);
    const tgtLayout = nodes.get(edge.target);
    const msgY = SEQUENCE_MSG_START_Y + index * SEQUENCE_MSG_STEP_Y;
    const bends: PolyPoint[] = [];

    if (srcLayout && tgtLayout) {
      const srcCx = srcLayout.geometry.x + srcLayout.geometry.width / 2;
      const tgtCx = tgtLayout.geometry.x + tgtLayout.geometry.width / 2;
      if (edge.source === edge.target) {
        bends.push(
          { x: srcCx, y: msgY },
          { x: srcCx + SEQUENCE_SELF_LOOP_DX, y: msgY },
          { x: srcCx + SEQUENCE_SELF_LOOP_DX, y: msgY + SEQUENCE_SELF_LOOP_DY },
          { x: srcCx, y: msgY + SEQUENCE_SELF_LOOP_DY },
        );
      } else {
        bends.push({ x: srcCx, y: msgY }, { x: tgtCx, y: msgY });
      }
    }

    const seqOrderLabel = edge.label ? `${index + 1}. ${edge.label}` : `${index + 1}`;
    return {
      id: edge.id || `e${index + 1}`,
      source: edge.source,
      target: edge.target,
      label: seqOrderLabel,
      kind: edge.kind,
      directed: isEdgeDirected(ir, edge),
      dashed: isEdgeDashed(edge),
      color: normalizeHexColor(edge.color),
      bends,
    };
  });

  return { direction, nodes, groups, edges };
}

function layoutHierarchicalTree(
  ir: DiagramIR,
  direction: GraphmlRankDirection,
): IrGraphmlLayoutResult {
  const nodes = new Map<string, IrNodeLayout>();
  const groups = new Map<string, IrGroupLayout>();
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of ir.nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }
  for (const edge of ir.edges) {
    if (adj.has(edge.source) && adj.has(edge.target) && edge.source !== edge.target) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  const levelById = new Map<string, number>();
  const roots = ir.nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  const queue: string[] = [];
  for (const root of roots.length > 0 ? roots : ir.nodes.slice(0, 1)) {
    levelById.set(root.id, 1);
    queue.push(root.id);
  }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curLevel = levelById.get(cur) ?? 1;
    for (const next of adj.get(cur) ?? []) {
      if (!levelById.has(next)) {
        levelById.set(next, curLevel + 1);
        queue.push(next);
      }
    }
  }
  for (const node of ir.nodes) {
    if (!levelById.has(node.id)) {
      levelById.set(node.id, 2);
    }
  }

  const byLevel = new Map<number, DiagramNode[]>();
  for (const node of ir.nodes) {
    const lvl = levelById.get(node.id) ?? 1;
    const list = byLevel.get(lvl) ?? [];
    list.push(node);
    byLevel.set(lvl, list);
  }

  const isHorizontal = direction === "LR" || direction === "RL";
  for (const [level, levelNodes] of byLevel.entries()) {
    let cursor = GRAPH_MARGIN;
    for (const irNode of levelNodes) {
      const displayLabel = buildRichNodeDisplayLabel(ir, irNode);
      const shape: DiagramNodeShape =
        level === 1 ? "round" : resolveNodeShape(ir, irNode);
      const colors = resolveNodeColors(ir, irNode);
      const size = measureMultilineNodeSize(displayLabel, shape);

      const x = isHorizontal
        ? GRAPH_MARGIN + (level - 1) * TREE_LEVEL_GAP_X
        : cursor;
      const y = isHorizontal
        ? cursor
        : GRAPH_MARGIN + (level - 1) * TREE_LEVEL_GAP_Y;

      nodes.set(irNode.id, {
        node: irNode,
        displayLabel,
        shape,
        fill: colors.fill ?? (level === 1 ? DEFAULT_PALETTE.actorFill : undefined),
        stroke: colors.stroke ?? (level === 1 ? DEFAULT_PALETTE.actorStroke : undefined),
        geometry: { x, y, width: size.width, height: size.height },
      });

      cursor += isHorizontal
        ? size.height + TREE_SIBLING_GAP_Y
        : size.width + TREE_SIBLING_GAP_X;
    }
  }

  const edges: IrEdgeLayout[] = ir.edges
    .filter((edge) => nodes.has(edge.source) && nodes.has(edge.target))
    .map((edge, index) => ({
      id: edge.id || `e${index + 1}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      kind: edge.kind,
      directed: true,
      dashed: isEdgeDashed(edge),
      color: normalizeHexColor(edge.color),
      bends: [],
    }));

  return { direction, nodes, groups, edges };
}

function computeGroupBoundsFromChildren(
  ir: DiagramIR,
  nodes: Map<string, IrNodeLayout>,
  groups: Map<string, IrGroupLayout>,
): void {
  const irGroups = ir.groups ?? [];
  if (irGroups.length === 0) {
    return;
  }

  // Process bottom-up so nested groups get their bounds before parent groups
  const depthOf = (group: DiagramGroup): number => {
    let depth = 0;
    let cur: DiagramGroup | undefined = group;
    const seen = new Set<string>();
    while (cur?.parentId && !seen.has(cur.id)) {
      seen.add(cur.id);
      depth += 1;
      cur = irGroups.find((g) => g.id === cur!.parentId);
    }
    return depth;
  };

  const sortedGroups = [...irGroups].sort((a, b) => depthOf(b) - depthOf(a));

  for (const group of sortedGroups) {
    const memberGeometries: GraphmlGeometry[] = [];
    for (const node of ir.nodes) {
      if (node.groupId === group.id) {
        const layout = nodes.get(node.id);
        if (layout) {
          memberGeometries.push(layout.geometry);
        }
      }
    }
    for (const childGroup of irGroups) {
      if (childGroup.parentId === group.id) {
        const childLayout = groups.get(childGroup.id);
        if (childLayout) {
          memberGeometries.push(childLayout.geometry);
        }
      }
    }

    if (memberGeometries.length === 0) {
      continue;
    }

    const minX = Math.min(...memberGeometries.map((g) => g.x)) - GROUP_PAD_X;
    const minY = Math.min(...memberGeometries.map((g) => g.y)) - GROUP_PAD_TOP;
    const maxX =
      Math.max(...memberGeometries.map((g) => g.x + g.width)) + GROUP_PAD_X;
    const maxY =
      Math.max(...memberGeometries.map((g) => g.y + g.height)) + GROUP_PAD_BOTTOM;

    groups.set(group.id, {
      group,
      fill: normalizeHexColor(group.fill) ?? DEFAULT_PALETTE.groupFill,
      stroke: normalizeHexColor(group.stroke) ?? DEFAULT_PALETTE.groupStroke,
      geometry: {
        x: Math.round(minX * 10) / 10,
        y: Math.round(minY * 10) / 10,
        width: Math.max(GROUP_MIN_WIDTH, Math.round((maxX - minX) * 10) / 10),
        height: Math.max(GROUP_MIN_HEIGHT, Math.round((maxY - minY) * 10) / 10),
      },
    });
  }
}

export function layoutIrForGraphml(ir: DiagramIR): IrGraphmlLayoutResult {
  const direction = resolveRankDirection(ir.direction);

  if (ir.kind === "sequence" && !hasCompleteValidNodeGeometry(ir)) {
    return layoutSequenceGrid(ir, direction);
  }

  if (
    (ir.kind === "mindmap" || ir.kind === "wbs") &&
    !hasCompleteValidNodeGeometry(ir)
  ) {
    return layoutHierarchicalTree(ir, direction);
  }

  const nodes = new Map<string, IrNodeLayout>();
  const groups = new Map<string, IrGroupLayout>();
  const irGroups = ir.groups ?? [];
  const leafNodeIds = new Set(ir.nodes.map((n) => n.id));
  const dagreGroupIdMap = new Map<string, string>();
  for (const grp of irGroups) {
    const dagreId = leafNodeIds.has(grp.id) ? `__group_${grp.id}` : grp.id;
    dagreGroupIdMap.set(grp.id, dagreId);
  }
  const groupIds = new Set(irGroups.map((g) => g.id));

  if (hasCompleteValidNodeGeometry(ir)) {
    for (const node of ir.nodes) {
      const displayLabel = buildRichNodeDisplayLabel(ir, node);
      const shape = resolveNodeShape(ir, node);
      const colors = resolveNodeColors(ir, node);
      const size = measureMultilineNodeSize(
        displayLabel,
        shape,
        node.visual?.width,
        node.visual?.height,
      );
      nodes.set(node.id, {
        node,
        displayLabel,
        shape,
        fill: colors.fill,
        stroke: colors.stroke,
        geometry: {
          x: Math.round((node.visual!.x ?? 0) * 10) / 10,
          y: Math.round((node.visual!.y ?? 0) * 10) / 10,
          width: size.width,
          height: size.height,
        },
      });
    }
    computeGroupBoundsFromChildren(ir, nodes, groups);

    const edges: IrEdgeLayout[] = ir.edges.map((edge, index) => {
      const labels = buildEdgeDisplayLabel(edge);
      return {
        id: edge.id || `e${index + 1}`,
        source: edge.source,
        target: edge.target,
        label: labels.label,
        kind: edge.kind,
        directed: isEdgeDirected(ir, edge),
        dashed: isEdgeDashed(edge),
        color: normalizeHexColor(edge.color),
        sourceLabel: labels.sourceLabel,
        targetLabel: labels.targetLabel,
        bends: [],
      };
    });

    return { direction, nodes, groups, edges };
  }

  const dagreGraph = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  dagreGraph.setGraph({
    rankdir: direction,
    marginx: GRAPH_MARGIN,
    marginy: GRAPH_MARGIN,
    nodesep: LAYOUT_NODE_SEP,
    ranksep: LAYOUT_RANK_SEP,
    edgesep: LAYOUT_EDGE_SEP,
  });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  for (const group of irGroups) {
    const dagreGrpId = dagreGroupIdMap.get(group.id) ?? group.id;
    dagreGraph.setNode(dagreGrpId, {
      label: group.label ?? group.id,
      width: GROUP_MIN_WIDTH,
      height: GROUP_MIN_HEIGHT,
    });
  }

  for (const group of irGroups) {
    if (group.parentId && groupIds.has(group.parentId) && group.parentId !== group.id) {
      const childDagreId = dagreGroupIdMap.get(group.id) ?? group.id;
      const parentDagreId = dagreGroupIdMap.get(group.parentId) ?? group.parentId;
      dagreGraph.setParent(childDagreId, parentDagreId);
    }
  }

  const preppedNodes = new Map<
    string,
    {
      displayLabel: string;
      shape: DiagramNodeShape;
      fill?: string;
      stroke?: string;
      width: number;
      height: number;
    }
  >();

  for (const node of ir.nodes) {
    const displayLabel = buildRichNodeDisplayLabel(ir, node);
    const shape = resolveNodeShape(ir, node);
    const colors = resolveNodeColors(ir, node);
    const size = measureMultilineNodeSize(displayLabel, shape);
    preppedNodes.set(node.id, {
      displayLabel,
      shape,
      fill: colors.fill,
      stroke: colors.stroke,
      width: size.width,
      height: size.height,
    });
    dagreGraph.setNode(node.id, {
      label: displayLabel,
      width: size.width,
      height: size.height,
    });
    if (node.groupId && groupIds.has(node.groupId)) {
      const parentDagreId = dagreGroupIdMap.get(node.groupId) ?? node.groupId;
      if (parentDagreId !== node.id) {
        dagreGraph.setParent(node.id, parentDagreId);
      }
    }
  }

  const validLeafIds = new Set(preppedNodes.keys());
  ir.edges.forEach((edge, index) => {
    if (!validLeafIds.has(edge.source) || !validLeafIds.has(edge.target)) {
      return;
    }
    dagreGraph.setEdge(edge.source, edge.target, {}, `e${index}`);
  });

  dagre.layout(dagreGraph);

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  for (const node of ir.nodes) {
    const prep = preppedNodes.get(node.id);
    const layoutNode = dagreGraph.node(node.id) as
      | { x: number; y: number; width: number; height: number }
      | undefined;
    if (!prep || !layoutNode || !Number.isFinite(layoutNode.x)) {
      continue;
    }
    const x = layoutNode.x - prep.width / 2;
    const y = layoutNode.y - prep.height / 2;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    nodes.set(node.id, {
      node,
      displayLabel: prep.displayLabel,
      shape: prep.shape,
      fill: prep.fill,
      stroke: prep.stroke,
      geometry: {
        x,
        y,
        width: prep.width,
        height: prep.height,
      },
    });
  }

  computeGroupBoundsFromChildren(ir, nodes, groups);
  for (const grpLayout of groups.values()) {
    minX = Math.min(minX, grpLayout.geometry.x);
    minY = Math.min(minY, grpLayout.geometry.y);
  }

  const shiftX = Number.isFinite(minX) ? GRAPH_MARGIN - minX : 0;
  const shiftY = Number.isFinite(minY) ? GRAPH_MARGIN - minY : 0;

  for (const nodeLayout of nodes.values()) {
    nodeLayout.geometry.x = Math.round((nodeLayout.geometry.x + shiftX) * 10) / 10;
    nodeLayout.geometry.y = Math.round((nodeLayout.geometry.y + shiftY) * 10) / 10;
  }
  for (const grpLayout of groups.values()) {
    grpLayout.geometry.x = Math.round((grpLayout.geometry.x + shiftX) * 10) / 10;
    grpLayout.geometry.y = Math.round((grpLayout.geometry.y + shiftY) * 10) / 10;
  }

  const edges: IrEdgeLayout[] = ir.edges.map((edge, index) => {
    const labels = buildEdgeDisplayLabel(edge);
    const dagreEdge = dagreGraph.edge({
      v: edge.source,
      w: edge.target,
      name: `e${index}`,
    }) as { points?: PolyPoint[] } | undefined;
    const rawPoints = dagreEdge?.points ?? [];
    const interiorPoints =
      rawPoints.length > 2
        ? rawPoints.slice(1, -1).map((pt) => ({
            x: Math.round((pt.x + shiftX) * 10) / 10,
            y: Math.round((pt.y + shiftY) * 10) / 10,
          }))
        : [];

    return {
      id: edge.id || `e${index + 1}`,
      source: edge.source,
      target: edge.target,
      label: labels.label,
      kind: edge.kind,
      directed: isEdgeDirected(ir, edge),
      dashed: isEdgeDashed(edge),
      color: normalizeHexColor(edge.color),
      sourceLabel: labels.sourceLabel,
      targetLabel: labels.targetLabel,
      bends: interiorPoints,
    };
  });

  return { direction, nodes, groups, edges };
}
