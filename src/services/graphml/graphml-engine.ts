import dagre from "dagre";
import { LocalizedAppError } from "@/utils/localized-app-error";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const NODE_RX = 6;
const GRAPH_MARGIN = 24;
const LABEL_ATTR = "label";

interface GraphmlNode {
  id: string;
  label: string;
}

interface GraphmlEdge {
  source: string;
  target: string;
  label?: string;
}

interface ParsedGraphml {
  nodes: GraphmlNode[];
  edges: GraphmlEdge[];
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

function readNodeLabel(node: Element, keyMap: Map<string, string>): string {
  const dataElements = Array.from(node.children).filter(
    (child) => localName(child.tagName) === "data",
  );

  for (const dataElement of dataElements) {
    const key = dataElement.getAttribute("key");
    if (!key) {
      continue;
    }

    const mappedName = keyMap.get(key);
    if (mappedName === LABEL_ATTR || mappedName === "nodeLabel") {
      const value = dataElement.textContent?.trim();
      if (value) {
        return value;
      }
    }
  }

  for (const dataElement of dataElements) {
    const value = dataElement.textContent?.trim();
    if (value) {
      return value;
    }
  }

  return node.getAttribute("id") ?? "node";
}

function readEdgeLabel(edge: Element, keyMap: Map<string, string>): string | undefined {
  const dataElements = Array.from(edge.children).filter(
    (child) => localName(child.tagName) === "data",
  );

  for (const dataElement of dataElements) {
    const key = dataElement.getAttribute("key");
    if (!key) {
      continue;
    }

    const mappedName = keyMap.get(key);
    if (mappedName === LABEL_ATTR || mappedName === "edgeLabel") {
      const value = dataElement.textContent?.trim();
      if (value) {
        return value;
      }
    }
  }

  for (const dataElement of dataElements) {
    const value = dataElement.textContent?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
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

  for (const child of Array.from(graphElement.children)) {
    const tag = localName(child.tagName);
    if (tag === "node") {
      const id = child.getAttribute("id");
      if (!id) {
        continue;
      }
      nodes.push({
        id,
        label: readNodeLabel(child, keyMap),
      });
      continue;
    }

    if (tag === "edge") {
      const source = child.getAttribute("source");
      const target = child.getAttribute("target");
      if (!source || !target) {
        continue;
      }
      edges.push({
        source,
        target,
        label: readEdgeLabel(child, keyMap),
      });
    }
  }

  if (nodes.length === 0) {
    throw new LocalizedAppError("graphml.noNodes");
  }

  return { nodes, edges };
}

function layoutGraph(
  graph: ParsedGraphml,
  rankdir: "TB" | "LR" = "TB",
): dagre.graphlib.Graph {
  const dagreGraph = new dagre.graphlib.Graph();
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
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  for (const edge of graph.edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);
  return dagreGraph;
}

function buildEdgePath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length === 0) {
    return "";
  }

  const [firstPoint, ...rest] = points;
  const segments = rest.map((point) => `L ${point.x} ${point.y}`);
  return `M ${firstPoint.x} ${firstPoint.y} ${segments.join(" ")}`;
}

function renderGraphmlSvg(
  graph: ParsedGraphml,
  dagreGraph: dagre.graphlib.Graph,
  dark: boolean,
): string {
  const nodeFill = dark ? "#1f2937" : "#ffffff";
  const nodeStroke = dark ? "#94a3b8" : "#64748b";
  const textFill = dark ? "#f8fafc" : "#0f172a";
  const edgeStroke = dark ? "#94a3b8" : "#64748b";

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of graph.nodes) {
    const layoutNode = dagreGraph.node(node.id);
    if (!layoutNode) {
      continue;
    }

    minX = Math.min(minX, layoutNode.x - layoutNode.width / 2);
    minY = Math.min(minY, layoutNode.y - layoutNode.height / 2);
    maxX = Math.max(maxX, layoutNode.x + layoutNode.width / 2);
    maxY = Math.max(maxY, layoutNode.y + layoutNode.height / 2);
  }

  const width = Math.max(maxX - minX + GRAPH_MARGIN * 2, 320);
  const height = Math.max(maxY - minY + GRAPH_MARGIN * 2, 240);
  const offsetX = GRAPH_MARGIN - minX;
  const offsetY = GRAPH_MARGIN - minY;

  const nodeElements = graph.nodes
    .map((node) => {
      const layoutNode = dagreGraph.node(node.id);
      if (!layoutNode) {
        return "";
      }

      const x = layoutNode.x - layoutNode.width / 2 + offsetX;
      const y = layoutNode.y - layoutNode.height / 2 + offsetY;
      const label = escapeXml(node.label);

      return `<g class="graphml-node">
  <rect x="${x}" y="${y}" width="${layoutNode.width}" height="${layoutNode.height}" rx="${NODE_RX}" fill="${nodeFill}" stroke="${nodeStroke}" stroke-width="1.5"/>
  <text x="${x + layoutNode.width / 2}" y="${y + layoutNode.height / 2}" fill="${textFill}" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle" dominant-baseline="middle">${label}</text>
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
      const markerId = "graphml-arrow";
      const labelMarkup = edge.label
        ? `<text x="${shiftedPoints[Math.floor(shiftedPoints.length / 2)].x}" y="${shiftedPoints[Math.floor(shiftedPoints.length / 2)].y - 6}" fill="${textFill}" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle">${escapeXml(edge.label)}</text>`
        : "";

      return `<g class="graphml-edge">
  <path d="${path}" fill="none" stroke="${edgeStroke}" stroke-width="1.5" marker-end="url(#${markerId})"/>
  ${labelMarkup}
</g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <defs>
    <marker id="graphml-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${edgeStroke}"/>
    </marker>
  </defs>
  ${edgeElements}
  ${nodeElements}
</svg>`;
}

export async function renderGraphmlToSvg(
  source: string,
  options: { dark?: boolean; direction?: "TB" | "LR" } = {},
): Promise<string> {
  const graph = parseGraphml(source);
  const rankdir = options.direction === "LR" ? "LR" : "TB";
  const dagreGraph = layoutGraph(graph, rankdir);
  return renderGraphmlSvg(graph, dagreGraph, Boolean(options.dark));
}
