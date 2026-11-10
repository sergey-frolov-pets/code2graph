import {
  COLOR_ATTR_NAME,
  DARK_TEXT,
  DASHED_STYLE,
  DIRECTED_EDGE_FLAG,
  FILL_ATTR_NAME,
  HEX_BYTE_MAX,
  HEX_CHANNEL_BASE,
  HEIGHT_ATTR_NAME,
  HEX_ALPHA_PATTERN,
  HEX_COLOR_PATTERN,
  HEX_RGB_LENGTH,
  TABLE_LANE_MAIN,
  LABEL_ATTR_NAMES,
  LIGHT_TEXT,
  LUMA_BLUE,
  LUMA_GREEN,
  LUMA_RED,
  NODE_CHAR_WIDTH,
  NODE_LABEL_PADDING,
  NODE_SHAPES,
  NODE_WIDTH,
  NON_LABEL_ATTRS,
  RECT_SHAPE_ALIAS,
  ROUND_SHAPE_ALIAS,
  RANK_DIRECTIONS,
  SHAPE_ATTR_NAME,
  SRGB_GAMMA,
  SRGB_LINEAR_THRESHOLD,
  SRGB_OFFSET,
  SRGB_SCALE,
  SRGB_SLOPE,
  STROKE_ATTR_NAME,
  STYLE_ATTR_NAME,
  TEXT_LUMINANCE_THRESHOLD,
  WIDTH_ATTR_NAME,
  X_ATTR_NAME,
  Y_ATTR_NAME,
  UNDIRECTED_EDGE_DEFAULT,
  UNDIRECTED_EDGE_FLAG,
  type DataEntry,
  type GraphmlEdge,
  type GraphmlGeometry,
  type GraphmlNode,
  type GraphmlNodeShape,
  type GraphmlRankDirection,
  type ParsedGraphml,
} from "@/services/graphml/graphml-types";
import { readYedEdgeGraphics, readYedNodeGraphics } from "@/services/graphml/graphml-yed";
import { LocalizedAppError } from "@/utils/localized-app-error";

export function escapeXml(value: string): string {
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

export function measureNodeWidth(label: string): number {
  return Math.max(NODE_WIDTH, label.length * NODE_CHAR_WIDTH + NODE_LABEL_PADDING);
}

function parseShape(value: string | undefined): GraphmlNodeShape {
  if (value === RECT_SHAPE_ALIAS || value === ROUND_SHAPE_ALIAS) {
    return "rectangle";
  }
  if (value && (NODE_SHAPES as readonly string[]).includes(value)) {
    return value as GraphmlNodeShape;
  }

  return "rectangle";
}

function readNamedNumber(entries: DataEntry[], name: string): number | undefined {
  const raw = readNamedData(entries, [name]);
  if (!raw) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function geometryFromEntries(entries: DataEntry[]): GraphmlGeometry | undefined {
  const x = readNamedNumber(entries, X_ATTR_NAME);
  const y = readNamedNumber(entries, Y_ATTR_NAME);
  const width = readNamedNumber(entries, WIDTH_ATTR_NAME);
  const height = readNamedNumber(entries, HEIGHT_ATTR_NAME);
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return undefined;
  }
  return { x, y, width, height };
}

export function parseRankDirection(value: string | null | undefined): GraphmlRankDirection {
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
  if (!value) {
    return undefined;
  }

  const alpha = HEX_ALPHA_PATTERN.exec(value.trim());
  const rgb = alpha ? `#${alpha[1].slice(0, HEX_RGB_LENGTH)}` : value.trim();
  if (!HEX_COLOR_PATTERN.test(rgb)) {
    return undefined;
  }

  const hex = rgb.toLowerCase();
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

export function textColorForFill(fill: string, fallback: string): string {
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

function absolutizeNestedGeometry(nodes: GraphmlNode[], edges: GraphmlEdge[]): void {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    const geometry = node.geometry;
    const parent = node.parentId ? nodesById.get(node.parentId) : undefined;
    if (!geometry || !parent?.geometry) {
      continue;
    }

    geometry.x += parent.geometry.x;
    geometry.y += parent.geometry.y;
  }

  for (const edge of edges) {
    const origin = bendOrigin(edge, nodesById);
    if (!origin || !edge.bends?.length) {
      continue;
    }

    for (const bend of edge.bends) {
      bend.x += origin.x;
      bend.y += origin.y;
    }
  }
}

function bendOrigin(
  edge: GraphmlEdge,
  nodesById: Map<string, GraphmlNode>,
): GraphmlGeometry | undefined {
  const source = nodesById.get(edge.source);
  const target = nodesById.get(edge.target);
  const sharedParent = source?.parentId;
  if (!sharedParent || sharedParent !== target?.parentId) {
    return undefined;
  }

  return nodesById.get(sharedParent)?.geometry;
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
      const yed = readYedNodeGraphics(child);
      const nestedGraph = findChildGraph(child);
      const namedLabel = readNamedData(entries, LABEL_ATTR_NAMES);
      nodes.push({
        id,
        label: namedLabel ?? yed?.label ?? readLabel(entries) ?? id,
        shape: yed?.shape ?? parseShape(readNamedData(entries, [SHAPE_ATTR_NAME])),
        fill: readHexColor(yed?.fill ?? readNamedData(entries, [FILL_ATTR_NAME])),
        fill2: readHexColor(yed?.fill2),
        stroke: readHexColor(yed?.stroke ?? readNamedData(entries, [STROKE_ATTR_NAME])),
        dashed: yed?.dashed ?? false,
        geometry: yed?.geometry ?? geometryFromEntries(entries),
        parentId,
        isGroup: Boolean(nestedGraph),
        lanes: yed?.lanes?.map((lane) => ({
          ...lane,
          fill: readHexColor(lane.fill) ?? TABLE_LANE_MAIN,
        })),
        headerHeight: yed?.headerHeight,
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
      const yed = readYedEdgeGraphics(child);
      const namedLabel = readNamedData(entries, LABEL_ATTR_NAMES);
      edges.push({
        source,
        target,
        label: namedLabel ?? yed?.label ?? readLabel(entries),
        color: readHexColor(yed?.color ?? readNamedData(entries, [COLOR_ATTR_NAME])),
        directed: yed?.directed ?? isDirectedEdge(child, defaultDirected),
        dashed: yed
          ? yed.dashed
          : readNamedData(entries, [STYLE_ATTR_NAME]) === DASHED_STYLE,
        bends: yed?.bends,
        sourceOffset: yed?.sourceOffset,
        targetOffset: yed?.targetOffset,
        labelAnchor: yed?.labelAnchor,
        labelBox: yed?.labelBox,
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
  absolutizeNestedGeometry(nodes, edges);

  if (nodes.length === 0) {
    throw new LocalizedAppError("graphml.noNodes");
  }

  const direction = parseRankDirection(graphElement.getAttribute("rankdir"));

  return { nodes, edges, direction };
}
