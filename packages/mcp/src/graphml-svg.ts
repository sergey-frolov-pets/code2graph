import dagre from "dagre";
import { DiagramImageError } from "./diagram-image-error.js";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const NODE_RX = 6;
const GRAPH_MARGIN = 24;
const NODE_SEPARATION = 40;
const RANK_SEPARATION = 56;
const MIN_CANVAS_PX = 1;
const LABEL_FONT_SIZE = 13;
const EDGE_LABEL_FONT_SIZE = 11;
const STROKE_WIDTH = 1.5;

const NODE_FILL = "#ffffff";
const NODE_STROKE = "#64748b";
const TEXT_FILL = "#0f172a";
const FONT_FAMILY = "sans-serif";

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
  direction: "TB" | "LR";
}

interface LayoutPoint {
  x: number;
  y: number;
}

interface LayoutNode extends LayoutPoint {
  width: number;
  height: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readAttribute(attrs: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(attrs);
  return match?.[1] ?? null;
}

function collectElements(
  source: string,
  tagName: "node" | "edge",
): Array<{ attrs: string; inner: string }> {
  const results: Array<{ attrs: string; inner: string }> = [];
  const pattern = new RegExp(`<${tagName}\\b([^>]*?)(/?)>`, "g");
  let match = pattern.exec(source);

  while (match) {
    const attrs = match[1] ?? "";
    const selfClosing = match[2] === "/";
    if (selfClosing) {
      results.push({ attrs, inner: "" });
      match = pattern.exec(source);
      continue;
    }

    const closeAt = source.indexOf(`</${tagName}>`, pattern.lastIndex);
    const inner = closeAt >= 0 ? source.slice(pattern.lastIndex, closeAt) : "";
    if (closeAt >= 0) {
      pattern.lastIndex = closeAt + `</${tagName}>`.length;
    }
    results.push({ attrs, inner });
    match = pattern.exec(source);
  }

  return results;
}

function readDataText(inner: string): string | undefined {
  const match = /<data\b[^>]*>([\s\S]*?)<\/data>/i.exec(inner);
  const text = match?.[1]?.trim();
  return text ? decodeXml(text) : undefined;
}

function parseGraphml(source: string): ParsedGraphml {
  const graphTag = /<graph\b([^>]*)>/i.exec(source);
  const rankdir = graphTag ? readAttribute(graphTag[1] ?? "", "rankdir") : null;
  const direction: "TB" | "LR" =
    rankdir?.toUpperCase() === "LR" || rankdir?.toUpperCase() === "RL" ? "LR" : "TB";

  const nodes = collectElements(source, "node").flatMap((element) => {
    const id = readAttribute(element.attrs, "id");
    if (!id) {
      return [];
    }
    return [{ id, label: readDataText(element.inner) ?? id }];
  });

  if (nodes.length === 0) {
    throw new DiagramImageError("GraphML diagram has no nodes");
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = collectElements(source, "edge").flatMap((element) => {
    const sourceId = readAttribute(element.attrs, "source");
    const targetId = readAttribute(element.attrs, "target");
    if (!sourceId || !targetId || !nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
      return [];
    }
    const label = readDataText(element.inner);
    return [{ source: sourceId, target: targetId, label }];
  });

  return { nodes, edges, direction };
}

function layoutGraph(graph: ParsedGraphml): dagre.graphlib.Graph {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({
    rankdir: graph.direction,
    marginx: GRAPH_MARGIN,
    marginy: GRAPH_MARGIN,
    nodesep: NODE_SEPARATION,
    ranksep: RANK_SEPARATION,
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

function readLayoutNode(
  dagreGraph: dagre.graphlib.Graph,
  id: string,
): LayoutNode | null {
  const layoutNode = dagreGraph.node(id) as LayoutNode | undefined;
  if (!layoutNode || !Number.isFinite(layoutNode.x) || !Number.isFinite(layoutNode.y)) {
    return null;
  }
  return layoutNode;
}

function buildEdgePath(points: LayoutPoint[]): string {
  const [firstPoint, ...rest] = points;
  if (!firstPoint) {
    return "";
  }
  const segments = rest.map((point) => `L ${point.x} ${point.y}`);
  return `M ${firstPoint.x} ${firstPoint.y} ${segments.join(" ")}`;
}

export function renderGraphmlSvg(source: string): string {
  const graph = parseGraphml(source);
  const dagreGraph = layoutGraph(graph);

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of graph.nodes) {
    const layoutNode = readLayoutNode(dagreGraph, node.id);
    if (!layoutNode) {
      continue;
    }
    minX = Math.min(minX, layoutNode.x - layoutNode.width / 2);
    minY = Math.min(minY, layoutNode.y - layoutNode.height / 2);
    maxX = Math.max(maxX, layoutNode.x + layoutNode.width / 2);
    maxY = Math.max(maxY, layoutNode.y + layoutNode.height / 2);
  }

  const width = Math.max(maxX - minX + GRAPH_MARGIN * 2, MIN_CANVAS_PX);
  const height = Math.max(maxY - minY + GRAPH_MARGIN * 2, MIN_CANVAS_PX);
  const offsetX = GRAPH_MARGIN - minX;
  const offsetY = GRAPH_MARGIN - minY;

  const nodeElements = graph.nodes
    .map((node) => {
      const layoutNode = readLayoutNode(dagreGraph, node.id);
      if (!layoutNode) {
        return "";
      }
      const x = layoutNode.x - layoutNode.width / 2 + offsetX;
      const y = layoutNode.y - layoutNode.height / 2 + offsetY;
      return `<g class="graphml-node">
  <rect x="${x}" y="${y}" width="${layoutNode.width}" height="${layoutNode.height}" rx="${NODE_RX}" fill="${NODE_FILL}" stroke="${NODE_STROKE}" stroke-width="${STROKE_WIDTH}"/>
  <text x="${x + layoutNode.width / 2}" y="${y + layoutNode.height / 2}" fill="${TEXT_FILL}" font-family="${FONT_FAMILY}" font-size="${LABEL_FONT_SIZE}" text-anchor="middle" dominant-baseline="middle">${escapeXml(node.label)}</text>
</g>`;
    })
    .join("\n");

  const edgeElements = graph.edges
    .map((edge) => {
      const layoutEdge = dagreGraph.edge(edge.source, edge.target) as
        | { points?: LayoutPoint[] }
        | undefined;
      if (!layoutEdge?.points?.length) {
        return "";
      }
      const shifted = layoutEdge.points.map((point) => ({
        x: point.x + offsetX,
        y: point.y + offsetY,
      }));
      const midpoint = shifted[Math.floor(shifted.length / 2)];
      const labelMarkup =
        edge.label && midpoint
          ? `<text x="${midpoint.x}" y="${midpoint.y - 6}" fill="${TEXT_FILL}" font-family="${FONT_FAMILY}" font-size="${EDGE_LABEL_FONT_SIZE}" text-anchor="middle">${escapeXml(edge.label)}</text>`
          : "";
      return `<g class="graphml-edge">
  <path d="${buildEdgePath(shifted)}" fill="none" stroke="${NODE_STROKE}" stroke-width="${STROKE_WIDTH}" marker-end="url(#graphml-arrow)"/>
  ${labelMarkup}
</g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <defs>
    <marker id="graphml-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${NODE_STROKE}"/>
    </marker>
  </defs>
  ${edgeElements}
  ${nodeElements}
</svg>`;
}
