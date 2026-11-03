import dagre from "dagre";
import { LocalizedAppError } from "@/utils/localized-app-error";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const NODE_RX = 6;
const NODE_CHAR_WIDTH = 8;
const NODE_LABEL_PADDING = 28;
const GROUP_MIN_WIDTH = 220;
const GROUP_MIN_HEIGHT = 120;
const GROUP_LABEL_OUTSET = 18;
const GRAPH_MARGIN = 24;
const HEXAGON_INSET_RATIO = 0.22;
const DASHED_STROKE_PATTERN = "6 4";
const LABEL_ATTR_NAMES = ["label", "nodeLabel", "edgeLabel"] as const;
const SHAPE_ATTR_NAME = "shape";
const STYLE_ATTR_NAME = "style";
const FILL_ATTR_NAME = "fill";
const STROKE_ATTR_NAME = "stroke";
const COLOR_ATTR_NAME = "color";
const DASHED_STYLE = "dashed";
const UNDIRECTED_EDGE_DEFAULT = "undirected";
const DIRECTED_EDGE_FLAG = "true";
const UNDIRECTED_EDGE_FLAG = "false";
const NON_LABEL_ATTRS = new Set([
  SHAPE_ATTR_NAME,
  STYLE_ATTR_NAME,
  FILL_ATTR_NAME,
  STROKE_ATTR_NAME,
  COLOR_ATTR_NAME,
]);
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RANK_DIRECTIONS = ["TB", "LR", "BT", "RL"] as const;
const LAYOUT_NODE_SEP = 56;
const LAYOUT_RANK_SEP = 84;
const LAYOUT_EDGE_SEP = 28;
const FONT_FAMILY = "system-ui, sans-serif";
const STROKE_WIDTH = 1.5;
const EDGE_LABEL_FONT_SIZE = 11;
const EDGE_LABEL_CHAR_WIDTH = 7;
const EDGE_LABEL_LINE_HEIGHT = 16;
const EDGE_LABEL_PAD_X = 5;
const EDGE_LABEL_GAP = 6;
const EDGE_LABEL_SAMPLE_STEP = 12;
const LABEL_SEPARATION_STEPS = 32;
const GROUP_LABEL_FONT_SIZE = 12;
const GROUP_LABEL_CHAR_WIDTH = 7.2;
const GROUP_LABEL_INSET_X = 10;
const GROUP_LABEL_BASELINE_GAP = 6;
const GROUP_LABEL_ASCENT = 12;
const GROUP_LABEL_DESCENT = 4;
const OBSTACLE_PAD = 4;
const LIGHT_TEXT = "#0f172a";
const DARK_TEXT = "#f8fafc";
const LIGHT_CANVAS = "#ffffff";
const DARK_CANVAS = "#171d24";
const TEXT_LUMINANCE_THRESHOLD = 0.55;
const SRGB_LINEAR_THRESHOLD = 0.03928;
const SRGB_OFFSET = 0.055;
const SRGB_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const SRGB_SLOPE = 12.92;
const LUMA_RED = 0.2126;
const LUMA_GREEN = 0.7152;
const LUMA_BLUE = 0.0722;
const HEX_CHANNEL_BASE = 16;
const HEX_BYTE_MAX = 255;

const NODE_SHAPES = ["rectangle", "ellipse", "diamond", "hexagon"] as const;

type GraphmlNodeShape = (typeof NODE_SHAPES)[number];
type GraphmlRankDirection = (typeof RANK_DIRECTIONS)[number];

interface GraphmlNode {
  id: string;
  label: string;
  shape: GraphmlNodeShape;
  fill?: string;
  stroke?: string;
  parentId?: string;
  isGroup: boolean;
}

interface GraphmlEdge {
  source: string;
  target: string;
  label?: string;
  color?: string;
  directed: boolean;
  dashed: boolean;
}

interface ParsedGraphml {
  nodes: GraphmlNode[];
  edges: GraphmlEdge[];
  direction: GraphmlRankDirection;
}

interface DataEntry {
  name?: string;
  value: string;
}

interface ThemeColors {
  nodeFill: string;
  nodeStroke: string;
  textFill: string;
  edgeStroke: string;
  groupFill: string;
  groupStroke: string;
  canvas: string;
}

interface AxisBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface PolyPoint {
  x: number;
  y: number;
}

interface PlacedEdgeLabel {
  text: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

interface EdgeLayout {
  label?: string;
  color?: string;
  directed: boolean;
  dashed: boolean;
  points: PolyPoint[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function localName(tagName: string): string {
  const separatorIndex = tagName.indexOf(":");
  return separatorIndex >= 0 ? tagName.slice(separatorIndex + 1) : tagName;
}

function measureNodeWidth(label: string): number {
  return Math.max(NODE_WIDTH, label.length * NODE_CHAR_WIDTH + NODE_LABEL_PADDING);
}

function parseShape(value: string | undefined): GraphmlNodeShape {
  if (value && (NODE_SHAPES as readonly string[]).includes(value)) {
    return value as GraphmlNodeShape;
  }

  return "rectangle";
}

function parseRankDirection(value: string | null | undefined): GraphmlRankDirection {
  const normalized = value?.toUpperCase();
  if (
    normalized &&
    (RANK_DIRECTIONS as readonly string[]).includes(normalized)
  ) {
    return normalized as GraphmlRankDirection;
  }

  return "TB";
}

function readHexColor(value: string | undefined): string | undefined {
  if (!value || !HEX_COLOR_PATTERN.test(value)) {
    return undefined;
  }

  const hex = value.toLowerCase();
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  return hex;
}

function channelLuminance(value: number): number {
  const normalized = value / HEX_BYTE_MAX;
  if (normalized <= SRGB_LINEAR_THRESHOLD) {
    return normalized / SRGB_SLOPE;
  }

  return ((normalized + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA;
}

function textColorForFill(fill: string, fallback: string): string {
  const expanded = readHexColor(fill) ?? fill;
  const red = Number.parseInt(expanded.slice(1, 3), HEX_CHANNEL_BASE);
  const green = Number.parseInt(expanded.slice(3, 5), HEX_CHANNEL_BASE);
  const blue = Number.parseInt(expanded.slice(5, 7), HEX_CHANNEL_BASE);
  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return fallback;
  }

  const luminance =
    LUMA_RED * channelLuminance(red) +
    LUMA_GREEN * channelLuminance(green) +
    LUMA_BLUE * channelLuminance(blue);

  return luminance > TEXT_LUMINANCE_THRESHOLD ? LIGHT_TEXT : DARK_TEXT;
}

function readDataEntries(element: Element, keyMap: Map<string, string>): DataEntry[] {
  return Array.from(element.children)
    .filter((child) => localName(child.tagName) === "data")
    .map((dataElement) => {
      const key = dataElement.getAttribute("key");
      const value = dataElement.textContent?.trim() ?? "";
      const name = key ? keyMap.get(key) : undefined;
      return { name, value };
    })
    .filter((entry) => entry.value.length > 0);
}

function readNamedData(entries: DataEntry[], names: readonly string[]): string | undefined {
  for (const entry of entries) {
    if (entry.name && names.includes(entry.name)) {
      return entry.value;
    }
  }

  return undefined;
}

function readLabel(entries: DataEntry[]): string | undefined {
  const named = readNamedData(entries, LABEL_ATTR_NAMES);
  if (named) {
    return named;
  }

  for (const entry of entries) {
    if (!entry.name || !NON_LABEL_ATTRS.has(entry.name)) {
      return entry.value;
    }
  }

  return undefined;
}

function isDirectedEdge(edge: Element, defaultDirected: boolean): boolean {
  const flag = edge.getAttribute("directed");
  if (flag === DIRECTED_EDGE_FLAG) {
    return true;
  }
  if (flag === UNDIRECTED_EDGE_FLAG) {
    return false;
  }
  return defaultDirected;
}

function findChildGraph(node: Element): Element | undefined {
  return Array.from(node.children).find(
    (child) => localName(child.tagName) === "graph",
  );
}

function collectGraph(
  graphElement: Element,
  keyMap: Map<string, string>,
  nodes: GraphmlNode[],
  edges: GraphmlEdge[],
  parentId?: string,
): void {
  const defaultDirected =
    graphElement.getAttribute("edgedefault") !== UNDIRECTED_EDGE_DEFAULT;

  for (const child of Array.from(graphElement.children)) {
    const tag = localName(child.tagName);
    if (tag === "node") {
      const id = child.getAttribute("id");
      if (!id) {
        continue;
      }

      const entries = readDataEntries(child, keyMap);
      const nestedGraph = findChildGraph(child);
      nodes.push({
        id,
        label: readLabel(entries) ?? id,
        shape: parseShape(readNamedData(entries, [SHAPE_ATTR_NAME])),
        fill: readHexColor(readNamedData(entries, [FILL_ATTR_NAME])),
        stroke: readHexColor(readNamedData(entries, [STROKE_ATTR_NAME])),
        parentId,
        isGroup: Boolean(nestedGraph),
      });

      if (nestedGraph) {
        collectGraph(nestedGraph, keyMap, nodes, edges, id);
      }
      continue;
    }

    if (tag === "edge") {
      const source = child.getAttribute("source");
      const target = child.getAttribute("target");
      if (!source || !target) {
        continue;
      }

      const entries = readDataEntries(child, keyMap);
      edges.push({
        source,
        target,
        label: readLabel(entries),
        color: readHexColor(readNamedData(entries, [COLOR_ATTR_NAME])),
        directed: isDirectedEdge(child, defaultDirected),
        dashed: readNamedData(entries, [STYLE_ATTR_NAME]) === DASHED_STYLE,
      });
    }
  }
}

export function parseGraphml(source: string): ParsedGraphml {
  const parser = new DOMParser();
  const document = parser.parseFromString(source, "application/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    throw new LocalizedAppError("graphml.parseFailed");
  }

  const root = document.documentElement;
  if (localName(root.tagName) !== "graphml") {
    throw new LocalizedAppError("graphml.invalidRoot");
  }

  const keyMap = new Map<string, string>();
  for (const keyElement of Array.from(root.children)) {
    if (localName(keyElement.tagName) !== "key") {
      continue;
    }

    const id = keyElement.getAttribute("id");
    const attrName = keyElement.getAttribute("attr.name");
    if (id && attrName) {
      keyMap.set(id, attrName);
    }
  }

  const graphElement = Array.from(root.children).find(
    (child) => localName(child.tagName) === "graph",
  );
  if (!graphElement) {
    throw new LocalizedAppError("graphml.noGraph");
  }

  const nodes: GraphmlNode[] = [];
  const edges: GraphmlEdge[] = [];
  collectGraph(graphElement, keyMap, nodes, edges);

  if (nodes.length === 0) {
    throw new LocalizedAppError("graphml.noNodes");
  }

  const direction = parseRankDirection(graphElement.getAttribute("rankdir"));

  return { nodes, edges, direction };
}

function layoutGraph(
  graph: ParsedGraphml,
  rankdir: GraphmlRankDirection = "TB",
): dagre.graphlib.Graph {
  const dagreGraph = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  dagreGraph.setGraph({
    rankdir,
    marginx: GRAPH_MARGIN,
    marginy: GRAPH_MARGIN,
    nodesep: LAYOUT_NODE_SEP,
    ranksep: LAYOUT_RANK_SEP,
    edgesep: LAYOUT_EDGE_SEP,
  });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) {
    dagreGraph.setNode(node.id, {
      label: node.label,
      width: node.isGroup ? GROUP_MIN_WIDTH : measureNodeWidth(node.label),
      height: node.isGroup ? GROUP_MIN_HEIGHT : NODE_HEIGHT,
    });
  }

  for (const node of graph.nodes) {
    if (node.parentId) {
      dagreGraph.setParent(node.id, node.parentId);
    }
  }

  for (const [index, edge] of graph.edges.entries()) {
    dagreGraph.setEdge(edge.source, edge.target, {}, `e${index}`);
  }

  dagre.layout(dagreGraph);
  return dagreGraph;
}

function buildEdgePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return "";
  }

  const [firstPoint, ...rest] = points;
  const segments = rest.map((point) => `L ${point.x} ${point.y}`);
  return `M ${firstPoint.x} ${firstPoint.y} ${segments.join(" ")}`;
}

function themeColors(dark: boolean): ThemeColors {
  if (dark) {
    return {
      nodeFill: "#1f2937",
      nodeStroke: "#94a3b8",
      textFill: DARK_TEXT,
      edgeStroke: "#94a3b8",
      groupFill: "#111827",
      groupStroke: "#64748b",
      canvas: DARK_CANVAS,
    };
  }

  return {
    nodeFill: "#ffffff",
    nodeStroke: "#64748b",
    textFill: LIGHT_TEXT,
    edgeStroke: "#64748b",
    groupFill: "#f8fafc",
    groupStroke: "#94a3b8",
    canvas: LIGHT_CANVAS,
  };
}

function formatCoord(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function edgeLabelSize(text: string): { width: number; height: number } {
  return {
    width: text.length * EDGE_LABEL_CHAR_WIDTH + EDGE_LABEL_PAD_X * 2,
    height: EDGE_LABEL_LINE_HEIGHT,
  };
}

function toBox(cx: number, cy: number, width: number, height: number): AxisBox {
  return {
    left: cx - width / 2,
    top: cy - height / 2,
    right: cx + width / 2,
    bottom: cy + height / 2,
  };
}

function expandedBox(box: AxisBox, pad: number): AxisBox {
  return {
    left: box.left - pad,
    top: box.top - pad,
    right: box.right + pad,
    bottom: box.bottom + pad,
  };
}

function boxesOverlap(a: AxisBox, b: AxisBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function overlapAmounts(a: AxisBox, b: AxisBox): { x: number; y: number } {
  return {
    x: Math.min(a.right, b.right) - Math.max(a.left, b.left),
    y: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  };
}

function pointInside(box: AxisBox, x: number, y: number): boolean {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

function groupLabelBox(groupLeft: number, groupTop: number, label: string): AxisBox {
  const baseline = groupTop - GROUP_LABEL_BASELINE_GAP;
  const left = groupLeft + GROUP_LABEL_INSET_X;
  return {
    left,
    right: left + label.length * GROUP_LABEL_CHAR_WIDTH,
    top: baseline - GROUP_LABEL_ASCENT,
    bottom: baseline + GROUP_LABEL_DESCENT,
  };
}

function samplePolyline(
  points: PolyPoint[],
): Array<{ x: number; y: number }> {
  const samples: Array<{ x: number; y: number }> = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if (!start || !end) {
      continue;
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) {
      continue;
    }

    const count = Math.max(1, Math.round(length / EDGE_LABEL_SAMPLE_STEP));
    for (let step = 0; step <= count; step += 1) {
      const t = step / count;
      samples.push({
        x: start.x + dx * t,
        y: start.y + dy * t,
      });
    }
  }

  return samples;
}

function labelBox(label: PlacedEdgeLabel, gap = 0): AxisBox {
  return expandedBox(toBox(label.cx, label.cy, label.width, label.height), gap);
}

function pushLabelsApart(first: PlacedEdgeLabel, second: PlacedEdgeLabel): boolean {
  const firstBox = labelBox(first, EDGE_LABEL_GAP / 2);
  const secondBox = labelBox(second, EDGE_LABEL_GAP / 2);
  if (!boxesOverlap(firstBox, secondBox)) {
    return false;
  }

  const amount = overlapAmounts(firstBox, secondBox);
  if (amount.x <= 0 || amount.y <= 0) {
    return false;
  }

  if (amount.x < amount.y) {
    const direction = first.cx <= second.cx ? -1 : 1;
    const push = amount.x / 2 + 0.5;
    first.cx += direction * push;
    second.cx -= direction * push;
    return true;
  }

  const direction = first.cy <= second.cy ? -1 : 1;
  const push = amount.y / 2 + 0.5;
  first.cy += direction * push;
  second.cy -= direction * push;
  return true;
}

function pushLabelOutOfObstacle(label: PlacedEdgeLabel, obstacle: AxisBox): boolean {
  const box = labelBox(label);
  const padded = expandedBox(obstacle, OBSTACLE_PAD);
  if (!boxesOverlap(box, padded)) {
    return false;
  }

  const amount = overlapAmounts(box, padded);
  const obstacleCenterX = (obstacle.left + obstacle.right) / 2;
  const obstacleCenterY = (obstacle.top + obstacle.bottom) / 2;
  if (amount.x < amount.y) {
    const direction = label.cx >= obstacleCenterX ? 1 : -1;
    label.cx += direction * (amount.x + 0.5);
    return true;
  }

  const direction = label.cy >= obstacleCenterY ? 1 : -1;
  label.cy += direction * (amount.y + 0.5);
  return true;
}

function placeEdgeLabels(edges: EdgeLayout[], obstacles: AxisBox[]): Array<PlacedEdgeLabel | undefined> {
  const placements: Array<PlacedEdgeLabel | undefined> = edges.map((edge) => {
    if (!edge.label) {
      return undefined;
    }

    const size = edgeLabelSize(edge.label);
    const samples = samplePolyline(edge.points);
    const freeSamples = samples.filter(
      (sample) => !obstacles.some((obstacle) => pointInside(obstacle, sample.x, sample.y)),
    );
    const pool = freeSamples.length > 0 ? freeSamples : samples;
    const anchor = pool[Math.floor(pool.length / 2)] ?? edge.points[0] ?? { x: 0, y: 0 };

    return {
      text: edge.label,
      cx: anchor.x,
      cy: anchor.y,
      width: size.width,
      height: size.height,
    };
  });

  for (let step = 0; step < LABEL_SEPARATION_STEPS; step += 1) {
    let moved = false;
    for (let index = 0; index < placements.length; index += 1) {
      const label = placements[index];
      if (!label) {
        continue;
      }

      for (let otherIndex = index + 1; otherIndex < placements.length; otherIndex += 1) {
        const other = placements[otherIndex];
        if (!other) {
          continue;
        }
        moved = pushLabelsApart(label, other) || moved;
      }

      for (const obstacle of obstacles) {
        moved = pushLabelOutOfObstacle(label, obstacle) || moved;
      }
    }

    if (!moved) {
      break;
    }
  }

  return placements;
}

function markerId(color: string): string {
  return `graphml-arrow-${color.slice(1)}`;
}

function renderNodeShape(
  shape: GraphmlNodeShape,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
): string {
  const paint = `fill="${fill}" stroke="${stroke}" stroke-width="${STROKE_WIDTH}"`;
  if (shape === "ellipse") {
    return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" ${paint}/>`;
  }

  if (shape === "diamond") {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const points = `${centerX},${y} ${x + width},${centerY} ${centerX},${y + height} ${x},${centerY}`;
    return `<polygon points="${points}" ${paint}/>`;
  }

  if (shape === "hexagon") {
    const inset = width * HEXAGON_INSET_RATIO;
    const midY = y + height / 2;
    const points = [
      `${x + inset},${y}`,
      `${x + width - inset},${y}`,
      `${x + width},${midY}`,
      `${x + width - inset},${y + height}`,
      `${x + inset},${y + height}`,
      `${x},${midY}`,
    ].join(" ");
    return `<polygon points="${points}" ${paint}/>`;
  }

  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${NODE_RX}" ${paint}/>`;
}

interface RenderedNode {
  node: GraphmlNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

function renderGraphmlSvg(
  graph: ParsedGraphml,
  dagreGraph: dagre.graphlib.Graph,
  dark: boolean,
): string {
  const colors = themeColors(dark);
  const renderedNodes: RenderedNode[] = [];

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of graph.nodes) {
    const layoutNode = dagreGraph.node(node.id);
    if (!layoutNode) {
      continue;
    }

    const labelOutset = node.isGroup ? GROUP_LABEL_OUTSET : 0;
    minX = Math.min(minX, layoutNode.x - layoutNode.width / 2);
    minY = Math.min(minY, layoutNode.y - layoutNode.height / 2 - labelOutset);
    maxX = Math.max(maxX, layoutNode.x + layoutNode.width / 2);
    maxY = Math.max(maxY, layoutNode.y + layoutNode.height / 2);
    renderedNodes.push({
      node,
      x: layoutNode.x - layoutNode.width / 2,
      y: layoutNode.y - layoutNode.height / 2,
      width: layoutNode.width,
      height: layoutNode.height,
    });
  }

  const offsetX = GRAPH_MARGIN - minX;
  const offsetY = GRAPH_MARGIN - minY;
  for (const rendered of renderedNodes) {
    rendered.x += offsetX;
    rendered.y += offsetY;
  }

  const obstacles: AxisBox[] = [];
  for (const rendered of renderedNodes) {
    if (rendered.node.isGroup) {
      obstacles.push(
        groupLabelBox(rendered.x, rendered.y, rendered.node.label),
      );
      continue;
    }

    obstacles.push({
      left: rendered.x,
      top: rendered.y,
      right: rendered.x + rendered.width,
      bottom: rendered.y + rendered.height,
    });
  }

  const edgeLayouts: EdgeLayout[] = graph.edges.flatMap((edge, index) => {
    const layoutEdge = dagreGraph.edge({
      v: edge.source,
      w: edge.target,
      name: `e${index}`,
    });
    if (!layoutEdge?.points?.length) {
      return [];
    }

    return [{
      label: edge.label,
      color: edge.color,
      directed: edge.directed,
      dashed: edge.dashed,
      points: layoutEdge.points.map((point: PolyPoint) => ({
        x: point.x + offsetX,
        y: point.y + offsetY,
      })),
    }];
  });

  const placedLabels = placeEdgeLabels(edgeLayouts, obstacles);
  const contentBoxes: AxisBox[] = [
    ...renderedNodes.map((rendered) => ({
      left: rendered.x,
      top: rendered.node.isGroup ? rendered.y - GROUP_LABEL_OUTSET : rendered.y,
      right: rendered.x + rendered.width,
      bottom: rendered.y + rendered.height,
    })),
    ...placedLabels.flatMap((label) => (label ? [labelBox(label)] : [])),
    ...edgeLayouts.flatMap((edge) =>
      edge.points.map((point) => ({
        left: point.x,
        top: point.y,
        right: point.x,
        bottom: point.y,
      })),
    ),
  ];

  let contentLeft = GRAPH_MARGIN;
  let contentTop = GRAPH_MARGIN;
  let contentRight = GRAPH_MARGIN;
  let contentBottom = GRAPH_MARGIN;
  for (const box of contentBoxes) {
    contentLeft = Math.min(contentLeft, box.left);
    contentTop = Math.min(contentTop, box.top);
    contentRight = Math.max(contentRight, box.right);
    contentBottom = Math.max(contentBottom, box.bottom);
  }

  const shiftX = GRAPH_MARGIN - contentLeft;
  const shiftY = GRAPH_MARGIN - contentTop;
  if (shiftX !== 0 || shiftY !== 0) {
    for (const rendered of renderedNodes) {
      rendered.x += shiftX;
      rendered.y += shiftY;
    }
    for (const edge of edgeLayouts) {
      for (const point of edge.points) {
        point.x += shiftX;
        point.y += shiftY;
      }
    }
    for (const label of placedLabels) {
      if (!label) {
        continue;
      }
      label.cx += shiftX;
      label.cy += shiftY;
    }
  }

  const width = Math.max(contentRight - contentLeft + GRAPH_MARGIN * 2, 320);
  const height = Math.max(contentBottom - contentTop + GRAPH_MARGIN * 2, 240);
  const markerColors = new Set<string>([colors.edgeStroke]);
  for (const edge of edgeLayouts) {
    if (edge.directed) {
      markerColors.add(edge.color ?? colors.edgeStroke);
    }
  }

  const groupElements = renderedNodes
    .filter((rendered) => rendered.node.isGroup)
    .map((rendered) => {
      const label = escapeXml(rendered.node.label);
      const fill = rendered.node.fill ?? colors.groupFill;
      const stroke = rendered.node.stroke ?? colors.groupStroke;
      return `<g class="graphml-group">
  <rect x="${formatCoord(rendered.x)}" y="${formatCoord(rendered.y)}" width="${formatCoord(rendered.width)}" height="${formatCoord(rendered.height)}" rx="${NODE_RX}" fill="${fill}" stroke="${stroke}" stroke-width="${STROKE_WIDTH}"/>
  <text x="${formatCoord(rendered.x + GROUP_LABEL_INSET_X)}" y="${formatCoord(rendered.y - GROUP_LABEL_BASELINE_GAP)}" fill="${colors.textFill}" font-family="${FONT_FAMILY}" font-size="${GROUP_LABEL_FONT_SIZE}" text-anchor="start">${label}</text>
</g>`;
    })
    .join("\n");

  const nodeElements = renderedNodes
    .filter((rendered) => !rendered.node.isGroup)
    .map((rendered) => {
      const fill = rendered.node.fill ?? colors.nodeFill;
      const stroke = rendered.node.stroke ?? colors.nodeStroke;
      const textFill = rendered.node.fill
        ? textColorForFill(fill, colors.textFill)
        : colors.textFill;
      const shape = renderNodeShape(
        rendered.node.shape,
        rendered.x,
        rendered.y,
        rendered.width,
        rendered.height,
        fill,
        stroke,
      );

      return `<g class="graphml-node">
  ${shape}
  <text x="${formatCoord(rendered.x + rendered.width / 2)}" y="${formatCoord(rendered.y + rendered.height / 2)}" fill="${textFill}" font-family="${FONT_FAMILY}" font-size="13" text-anchor="middle" dominant-baseline="middle">${escapeXml(rendered.node.label)}</text>
</g>`;
    })
    .join("\n");

  const edgeElements = edgeLayouts
    .map((edge, index) => {
      const path = buildEdgePath(edge.points);
      const stroke = edge.color ?? colors.edgeStroke;
      const marker = edge.directed
        ? ` marker-end="url(#${markerId(stroke)})"`
        : "";
      const dash = edge.dashed ? ` stroke-dasharray="${DASHED_STROKE_PATTERN}"` : "";
      const label = placedLabels[index];
      const labelMarkup = label
        ? `<rect class="graphml-edge-label" x="${formatCoord(label.cx - label.width / 2)}" y="${formatCoord(label.cy - label.height / 2)}" width="${formatCoord(label.width)}" height="${formatCoord(label.height)}" rx="${NODE_RX}" fill="${colors.canvas}"/>
  <text x="${formatCoord(label.cx)}" y="${formatCoord(label.cy)}" fill="${colors.textFill}" font-family="${FONT_FAMILY}" font-size="${EDGE_LABEL_FONT_SIZE}" text-anchor="middle" dominant-baseline="middle">${escapeXml(label.text)}</text>`
        : "";

      return `<g class="graphml-edge">
  <path d="${path}" fill="none" stroke="${stroke}" stroke-width="${STROKE_WIDTH}"${dash}${marker}/>
  ${labelMarkup}
</g>`;
    })
    .join("\n");

  const markerElements = [...markerColors]
    .map(
      (color) => `<marker id="${markerId(color)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/>
    </marker>`,
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${formatCoord(width)}" height="${formatCoord(height)}" viewBox="0 0 ${formatCoord(width)} ${formatCoord(height)}" role="img">
  <defs>
    ${markerElements}
  </defs>
  ${groupElements}
  ${edgeElements}
  ${nodeElements}
</svg>`;
}

export async function renderGraphmlToSvg(
  source: string,
  options: { dark?: boolean; direction?: GraphmlRankDirection } = {},
): Promise<string> {
  const graph = parseGraphml(source);
  const rankdir = parseRankDirection(options.direction ?? graph.direction);
  const dagreGraph = layoutGraph(graph, rankdir);
  return renderGraphmlSvg(graph, dagreGraph, Boolean(options.dark));
}
