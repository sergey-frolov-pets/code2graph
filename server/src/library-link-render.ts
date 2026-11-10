const NODE_WIDTH = 160;
const NODE_HEIGHT = 40;
const NODE_GAP = 28;
const CANVAS_MARGIN = 16;
const LABEL_FONT_SIZE = 13;

export const LIBRARY_LINK_LIVE_LANGUAGES = ["graphml"] as const;

export function libraryLinkSupportsLiveRender(language: string): boolean {
  return (LIBRARY_LINK_LIVE_LANGUAGES as readonly string[]).includes(language);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface GraphNode {
  id: string;
  label: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

function readNodes(source: string): GraphNode[] {
  const nodes: GraphNode[] = [];
  const pattern = /<node\b([^>]*)>([\s\S]*?)<\/node>|<node\b([^>]*)\/>/gi;
  for (const match of source.matchAll(pattern)) {
    const attrs = match[1] || match[3] || "";
    const body = match[2] ?? "";
    const id = /id="([^"]+)"/.exec(attrs)?.[1];
    if (!id) {
      continue;
    }
    const data = /<data\b[^>]*>([^<]*)<\/data>/i.exec(body)?.[1]?.trim();
    nodes.push({ id, label: data || id });
  }
  return nodes;
}

function readEdges(source: string): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const pattern = /<edge\b([^>]*)\/?>/gi;
  for (const match of source.matchAll(pattern)) {
    const attrs = match[1] ?? "";
    const sourceId = /source="([^"]+)"/.exec(attrs)?.[1];
    const targetId = /target="([^"]+)"/.exec(attrs)?.[1];
    if (sourceId && targetId) {
      edges.push({ source: sourceId, target: targetId });
    }
  }
  return edges;
}

/** In-process GraphML SVG. Other languages stay on the snapshot path. */
export function renderLibraryLinkSvg(language: string, source: string): string | null {
  if (!libraryLinkSupportsLiveRender(language)) {
    return null;
  }

  const nodes = readNodes(source);
  if (nodes.length === 0) {
    return null;
  }

  const index = new Map(nodes.map((node, position) => [node.id, position]));
  const width = NODE_WIDTH + CANVAS_MARGIN * 2;
  const height =
    CANVAS_MARGIN * 2 + nodes.length * NODE_HEIGHT + (nodes.length - 1) * NODE_GAP;
  const lines = readEdges(source)
    .flatMap((edge) => {
      const from = index.get(edge.source);
      const to = index.get(edge.target);
      if (from === undefined || to === undefined) {
        return [];
      }
      const x = CANVAS_MARGIN + NODE_WIDTH / 2;
      const y1 = CANVAS_MARGIN + from * (NODE_HEIGHT + NODE_GAP) + NODE_HEIGHT;
      const y2 = CANVAS_MARGIN + to * (NODE_HEIGHT + NODE_GAP);
      return [
        `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#64748b" stroke-width="1.5"/>`,
      ];
    })
    .join("");
  const boxes = nodes
    .map((node, position) => {
      const y = CANVAS_MARGIN + position * (NODE_HEIGHT + NODE_GAP);
      const label = escapeXml(node.label);
      return `<rect x="${CANVAS_MARGIN}" y="${y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="6" fill="#ffffff" stroke="#64748b"/>
<text x="${CANVAS_MARGIN + NODE_WIDTH / 2}" y="${y + 25}" text-anchor="middle" font-size="${LABEL_FONT_SIZE}" font-family="sans-serif" fill="#0f172a">${label}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">${lines}${boxes}</svg>`;
}
