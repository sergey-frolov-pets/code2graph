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
const DASHED_STYLE = "dashed";
const UNDIRECTED_EDGE_DEFAULT = "undirected";
const DIRECTED_EDGE_FLAG = "true";
const UNDIRECTED_EDGE_FLAG = "false";
const NON_LABEL_ATTRS = new Set([SHAPE_ATTR_NAME, STYLE_ATTR_NAME]);

const NODE_SHAPES = ["rectangle", "ellipse", "diamond", "hexagon"] as const;

type GraphmlNodeShape = (typeof NODE_SHAPES)[number];

interface GraphmlNode {
  id: string;
  label: string;
  shape: GraphmlNodeShape;
  parentId?: string;
  isGroup: boolean;
}

interface GraphmlEdge {
  source: string;
  target: string;
  label?: string;
  directed: boolean;
  dashed: boolean;
}

interface ParsedGraphml {
  nodes: GraphmlNode[];
  edges: GraphmlEdge[];
  direction: "TB" | "LR";
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

  const rankdir = graphElement.getAttribute("rankdir");
  const direction: "TB" | "LR" =
    rankdir?.toUpperCase() === "LR" || rankdir?.toUpperCase() === "RL"
      ? "LR"
      : "TB";

  return { nodes, edges, direction };
}

function layoutGraph(
  graph: ParsedGraphml,
  rankdir: "TB" | "LR" = "TB",
): dagre.graphlib.Graph {
  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setGraph({
    rankdir,
    marginx: GRAPH_MARGIN,
    marginy: GRAPH_MARGIN,
    nodesep: 40,
    ranksep: 56,
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

  for (const edge of graph.edges) {
    dagreGraph.setEdge(edge.source, edge.target);
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
      textFill: "#f8fafc",
      edgeStroke: "#94a3b8",
      groupFill: "#111827",
      groupStroke: "#64748b",
    };
  }

  return {
    nodeFill: "#ffffff",
    nodeStroke: "#64748b",
    textFill: "#0f172a",
    edgeStroke: "#64748b",
    groupFill: "#f8fafc",
    groupStroke: "#94a3b8",
  };
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
  const paint = `fill="${fill}" stroke="${stroke}" stroke-width="1.5"`;
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

function renderGraphmlSvg(
  graph: ParsedGraphml,
  dagreGraph: dagre.graphlib.Graph,
  dark: boolean,
): string {
  const colors = themeColors(dark);

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
  }

  const width = Math.max(maxX - minX + GRAPH_MARGIN * 2, 320);
  const height = Math.max(maxY - minY + GRAPH_MARGIN * 2, 240);
  const offsetX = GRAPH_MARGIN - minX;
  const offsetY = GRAPH_MARGIN - minY;

  const groupElements = graph.nodes
    .filter((node) => node.isGroup)
    .map((node) => {
      const layoutNode = dagreGraph.node(node.id);
      if (!layoutNode) {
        return "";
      }

      const x = layoutNode.x - layoutNode.width / 2 + offsetX;
      const y = layoutNode.y - layoutNode.height / 2 + offsetY;
      const label = escapeXml(node.label);

      return `<g class="graphml-group">
  <rect x="${x}" y="${y}" width="${layoutNode.width}" height="${layoutNode.height}" rx="${NODE_RX}" fill="${colors.groupFill}" stroke="${colors.groupStroke}" stroke-width="1.5"/>
  <text x="${x + layoutNode.width / 2}" y="${y - 4}" fill="${colors.textFill}" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">${label}</text>
</g>`;
    })
    .join("\n");

  const nodeElements = graph.nodes
    .filter((node) => !node.isGroup)
    .map((node) => {
      const layoutNode = dagreGraph.node(node.id);
      if (!layoutNode) {
        return "";
      }

      const x = layoutNode.x - layoutNode.width / 2 + offsetX;
      const y = layoutNode.y - layoutNode.height / 2 + offsetY;
      const label = escapeXml(node.label);
      const shape = renderNodeShape(
        node.shape,
        x,
        y,
        layoutNode.width,
        layoutNode.height,
        colors.nodeFill,
        colors.nodeStroke,
      );

      return `<g class="graphml-node">
  ${shape}
  <text x="${x + layoutNode.width / 2}" y="${y + layoutNode.height / 2}" fill="${colors.textFill}" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle" dominant-baseline="middle">${label}</text>
</g>`;
    })
    .join("\n");

  const edgeElements = graph.edges
    .map((edge) => {
      const layoutEdge = dagreGraph.edge(edge.source, edge.target);
      if (!layoutEdge?.points?.length) {
        return "";
      }

      const shiftedPoints = layoutEdge.points.map((point) => ({
        x: point.x + offsetX,
        y: point.y + offsetY,
      }));
      const path = buildEdgePath(shiftedPoints);
      const marker = edge.directed ? ' marker-end="url(#graphml-arrow)"' : "";
      const dash = edge.dashed ? ` stroke-dasharray="${DASHED_STROKE_PATTERN}"` : "";
      const labelPoint = shiftedPoints[Math.floor(shiftedPoints.length / 2)];
      const labelMarkup = edge.label
        ? `<text x="${labelPoint.x}" y="${labelPoint.y - 6}" fill="${colors.textFill}" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">${escapeXml(edge.label)}</text>`
        : "";

      return `<g class="graphml-edge">
  <path d="${path}" fill="none" stroke="${colors.edgeStroke}" stroke-width="1.5"${dash}${marker}/>
  ${labelMarkup}
</g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <defs>
    <marker id="graphml-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${colors.edgeStroke}"/>
    </marker>
  </defs>
  ${groupElements}
  ${edgeElements}
  ${nodeElements}
</svg>`;
}

export async function renderGraphmlToSvg(
  source: string,
  options: { dark?: boolean; direction?: "TB" | "LR" } = {},
): Promise<string> {
  const graph = parseGraphml(source);
  const rankdir =
    options.direction === "LR" || graph.direction === "LR" ? "LR" : "TB";
  const dagreGraph = layoutGraph(graph, rankdir);
  return renderGraphmlSvg(graph, dagreGraph, Boolean(options.dark));
}
