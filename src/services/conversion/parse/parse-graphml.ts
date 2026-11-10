import type { DiagramFormat } from "@/constants/diagram-formats";
import { CONVERSION_IR_VERSION } from "@/constants/conversion-settings";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  type DiagramEdge,
  type DiagramIR,
  type DiagramNode,
  type DiagramNodeSemanticKind,
  type DiagramNodeShape,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { DiagramParseError } from "@/services/conversion/parse/parse-source-to-ir";
import { parseGraphml } from "@/services/graphml/graphml-engine";
import type { GraphmlEdge, GraphmlGeometry, GraphmlNode, GraphmlNodeShape } from "@/services/graphml/graphml-types";
import {
  HEX_BYTE_MAX,
  HEX_CHANNEL_BASE,
  LUMA_BLUE,
  LUMA_GREEN,
  LUMA_RED,
  SRGB_GAMMA,
  SRGB_LINEAR_THRESHOLD,
  SRGB_OFFSET,
  SRGB_SCALE,
  SRGB_SLOPE,
} from "@/services/graphml/graphml-types";

const COINCIDENT_GEOMETRY_EPSILON = 0.01;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{6})$/;

function normalizeFlowLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sameGeometry(left: GraphmlGeometry, right: GraphmlGeometry): boolean {
  return (
    Math.abs(left.x - right.x) <= COINCIDENT_GEOMETRY_EPSILON
    && Math.abs(left.y - right.y) <= COINCIDENT_GEOMETRY_EPSILON
    && Math.abs(left.width - right.width) <= COINCIDENT_GEOMETRY_EPSILON
    && Math.abs(left.height - right.height) <= COINCIDENT_GEOMETRY_EPSILON
  );
}

function collapseCoincidentNodes(
  nodes: GraphmlNode[],
  edges: GraphmlEdge[],
): { nodes: GraphmlNode[]; edges: GraphmlEdge[] } {
  const redirect = new Map<string, string>();
  const dropped = new Set<string>();

  for (let earlier = 0; earlier < nodes.length; earlier += 1) {
    const previous = nodes[earlier];
    if (!previous || dropped.has(previous.id) || !previous.geometry) {
      continue;
    }

    for (let later = earlier + 1; later < nodes.length; later += 1) {
      const next = nodes[later];
      if (!next || dropped.has(next.id) || !next.geometry) {
        continue;
      }
      if (!sameGeometry(previous.geometry, next.geometry)) {
        continue;
      }
      if (normalizeFlowLabel(previous.label) !== normalizeFlowLabel(next.label)) {
        continue;
      }

      redirect.set(previous.id, next.id);
      dropped.add(previous.id);
      break;
    }
  }

  const resolve = (id: string): string => {
    const seen = new Set<string>();
    let current = id;
    while (redirect.has(current) && !seen.has(current)) {
      seen.add(current);
      current = redirect.get(current) ?? current;
    }
    return current;
  };

  return {
    nodes: nodes.filter((node) => !dropped.has(node.id)),
    edges: edges.flatMap((edge) => {
      const source = resolve(edge.source);
      const target = resolve(edge.target);
      if (source === target) {
        return [];
      }
      return [{ ...edge, source, target }];
    }),
  };
}

function channelLuminance(value: number): number {
  const normalized = value / HEX_BYTE_MAX;
  if (normalized <= SRGB_LINEAR_THRESHOLD) {
    return normalized / SRGB_SLOPE;
  }
  return ((normalized + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA;
}

function colorLuminance(fill: string): number | undefined {
  const match = HEX_COLOR_PATTERN.exec(fill);
  if (!match) {
    return undefined;
  }
  const red = Number.parseInt(fill.slice(1, 3), HEX_CHANNEL_BASE);
  const green = Number.parseInt(fill.slice(3, 5), HEX_CHANNEL_BASE);
  const blue = Number.parseInt(fill.slice(5, 7), HEX_CHANNEL_BASE);
  return (
    LUMA_RED * channelLuminance(red)
    + LUMA_GREEN * channelLuminance(green)
    + LUMA_BLUE * channelLuminance(blue)
  );
}

function displayFill(fill?: string, fill2?: string): string | undefined {
  if (!fill) {
    return fill2;
  }
  if (!fill2) {
    return fill;
  }
  const primary = colorLuminance(fill);
  const secondary = colorLuminance(fill2);
  if (primary === undefined || secondary === undefined) {
    return fill;
  }
  return secondary < primary ? fill2 : fill;
}

function visualShape(shape: GraphmlNodeShape): DiagramNodeShape {
  switch (shape) {
    case "diamond":
      return "diamond";
    case "ellipse":
      return "ellipse";
    case "parallelogram":
      return "parallelogram";
    case "trapezoid":
    case "trapezoid2":
      return "trapezoid";
    case "hexagon":
      return "hexagon";
    default:
      return "rect";
  }
}

function semanticKind(
  node: GraphmlNode,
  edges: GraphmlEdge[],
): DiagramNodeSemanticKind | undefined {
  if (node.shape === "diamond") {
    return "decision";
  }
  if (node.shape !== "ellipse") {
    return undefined;
  }
  const incoming = edges.some((edge) => edge.target === node.id);
  const outgoing = edges.some((edge) => edge.source === node.id);
  if (!incoming) {
    return "start";
  }
  if (!outgoing) {
    return "end";
  }
  return undefined;
}

export function parseGraphmlToIr(source: string, format: DiagramFormat): DiagramIR {
  let parsed;
  try {
    parsed = parseGraphml(source);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "conversion.error.parseFailed";
    throw new DiagramParseError(message);
  }

  const collapsed = collapseCoincidentNodes(parsed.nodes, parsed.edges);
  const usedIds = new Set<string>();
  const nodes: DiagramNode[] = collapsed.nodes.map((node) => {
    const shape = visualShape(node.shape);
    const kind = semanticKind(node, collapsed.edges);
    return {
      id: uniqueDiagramId(node.id, usedIds),
      label: node.label,
      kind,
      visual: {
        x: node.geometry?.x,
        y: node.geometry?.y,
        width: node.geometry?.width,
        height: node.geometry?.height,
        fill: displayFill(node.fill, node.fill2),
        stroke: node.stroke,
        shape,
      },
      matchConfidence: 1,
    };
  });

  const idByOriginal = new Map(
    collapsed.nodes.map((node, index) => [node.id, nodes[index]!.id]),
  );

  const edges: DiagramEdge[] = collapsed.edges.map((edge, index) => ({
    id: `e${index + 1}`,
    source: idByOriginal.get(edge.source) ?? edge.source,
    target: idByOriginal.get(edge.target) ?? edge.target,
    label: edge.label,
    kind: edge.dashed ? "dashed" : undefined,
    matchConfidence: 1,
  }));

  return {
    version: CONVERSION_IR_VERSION,
    kind: "graph",
    direction: parsed.direction ?? detectDiagramDirection(source, format),
    nodes,
    edges,
    groups: [],
    metadata: { sourceFormat: format },
  };
}
