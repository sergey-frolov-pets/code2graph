import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  CONVERSION_IR_VERSION,
  LEGACY_CONVERSION_IR_VERSION,
} from "@/constants/conversion-settings";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  type DiagramEdge,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  type DiagramNodeSemanticKind,
  type DiagramNodeShape,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { GRAPHML_IR_PAYLOAD_ATTR_NAME } from "@/services/conversion/emit/emit-graphml";
import { DiagramParseError } from "@/services/conversion/parse/parse-source-to-ir";
import { parseGraphml } from "@/services/graphml/graphml-engine";
import type {
  GraphmlEdge,
  GraphmlGeometry,
  GraphmlNode,
  GraphmlNodeShape,
} from "@/services/graphml/graphml-types";
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
    Math.abs(left.x - right.x) <= COINCIDENT_GEOMETRY_EPSILON &&
    Math.abs(left.y - right.y) <= COINCIDENT_GEOMETRY_EPSILON &&
    Math.abs(left.width - right.width) <= COINCIDENT_GEOMETRY_EPSILON &&
    Math.abs(left.height - right.height) <= COINCIDENT_GEOMETRY_EPSILON
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
    if (!previous || dropped.has(previous.id) || !previous.geometry || previous.isGroup) {
      continue;
    }

    for (let later = earlier + 1; later < nodes.length; later += 1) {
      const next = nodes[later];
      if (!next || dropped.has(next.id) || !next.geometry || next.isGroup) {
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
      if (source === target && edge.source !== edge.target) {
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
    LUMA_RED * channelLuminance(red) +
    LUMA_GREEN * channelLuminance(green) +
    LUMA_BLUE * channelLuminance(blue)
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
    case "predefinedProcess":
      return "predefinedProcess";
    case "note":
      return "note";
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
  if (node.shape === "note") {
    return "artifact";
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

interface ExtraDomMetadata {
  payloadIr?: DiagramIR;
  title?: string;
  nodeKindById: Map<string, DiagramNodeSemanticKind>;
  nodeStereoById: Map<string, string>;
  edgeKindByIndex: Map<number, DiagramEdge["kind"]>;
  edgeSourceLabelByIndex: Map<number, string>;
  edgeTargetLabelByIndex: Map<number, string>;
}

function localName(tagName: string): string {
  const separatorIndex = tagName.indexOf(":");
  return separatorIndex >= 0 ? tagName.slice(separatorIndex + 1) : tagName;
}

function readExtraGraphmlDomMetadata(source: string): ExtraDomMetadata {
  const result: ExtraDomMetadata = {
    nodeKindById: new Map(),
    nodeStereoById: new Map(),
    edgeKindByIndex: new Map(),
    edgeSourceLabelByIndex: new Map(),
    edgeTargetLabelByIndex: new Map(),
  };

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(source, "application/xml");
    if (doc.querySelector("parsererror")) {
      return result;
    }
    const root = doc.documentElement;
    const keyMap = new Map<string, string>();
    for (const child of Array.from(root.children)) {
      const tag = localName(child.tagName);
      if (tag === "key") {
        const id = child.getAttribute("id");
        const attrName = child.getAttribute("attr.name");
        if (id && attrName) {
          keyMap.set(id, attrName);
        }
      } else if (tag === "desc" && !result.title) {
        const text = child.textContent?.trim();
        if (text) {
          result.title = text;
        }
      }
    }

    const graphEl = Array.from(root.children).find(
      (child) => localName(child.tagName) === "graph",
    );
    if (!graphEl) {
      return result;
    }

    for (const child of Array.from(graphEl.children)) {
      if (localName(child.tagName) !== "data") {
        continue;
      }
      const key = child.getAttribute("key");
      const attrName = key ? keyMap.get(key) : undefined;
      if (attrName === GRAPHML_IR_PAYLOAD_ATTR_NAME) {
        const rawJson = child.textContent?.trim();
        if (rawJson) {
          try {
            const parsedIr = JSON.parse(rawJson) as DiagramIR & { version: number };
            if (
              (parsedIr.version === CONVERSION_IR_VERSION ||
                parsedIr.version === LEGACY_CONVERSION_IR_VERSION) &&
              Array.isArray(parsedIr.nodes) &&
              Array.isArray(parsedIr.edges)
            ) {
              result.payloadIr = parsedIr;
            }
          } catch {
            // Ignore malformed payload and fall back to standard GraphML elements
          }
        }
      }
    }

    let edgeCursor = 0;
    const walkGraph = (gEl: Element): void => {
      for (const child of Array.from(gEl.children)) {
        const tag = localName(child.tagName);
        if (tag === "node") {
          const id = child.getAttribute("id");
          if (id) {
            for (const dEl of Array.from(child.children)) {
              const dTag = localName(dEl.tagName);
              if (dTag === "data") {
                const k = dEl.getAttribute("key");
                const name = k ? keyMap.get(k) : undefined;
                const val = dEl.textContent?.trim() ?? "";
                if (name === "kind" && val) {
                  result.nodeKindById.set(id, val as DiagramNodeSemanticKind);
                } else if (name === "stereotype" && val) {
                  result.nodeStereoById.set(id, val);
                }
              } else if (dTag === "graph") {
                walkGraph(dEl);
              }
            }
          }
        } else if (tag === "edge") {
          for (const dEl of Array.from(child.children)) {
            if (localName(dEl.tagName) !== "data") {
              continue;
            }
            const k = dEl.getAttribute("key");
            const name = k ? keyMap.get(k) : undefined;
            const val = dEl.textContent?.trim() ?? "";
            if (name === "kind" && val) {
              result.edgeKindByIndex.set(edgeCursor, val as DiagramEdge["kind"]);
            } else if (name === "sourceLabel" && val) {
              result.edgeSourceLabelByIndex.set(edgeCursor, val);
            } else if (name === "targetLabel" && val) {
              result.edgeTargetLabelByIndex.set(edgeCursor, val);
            }
          }
          edgeCursor += 1;
        }
      }
    };
    walkGraph(graphEl);
  } catch {
    return result;
  }

  return result;
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

  const extraMeta = readExtraGraphmlDomMetadata(source);
  if (extraMeta.payloadIr) {
    return {
      ...extraMeta.payloadIr,
      version: CONVERSION_IR_VERSION,
      direction:
        extraMeta.payloadIr.direction ??
        parsed.direction ??
        detectDiagramDirection(source, format),
      metadata: {
        ...extraMeta.payloadIr.metadata,
        sourceFormat: format,
      },
    };
  }

  const collapsed = collapseCoincidentNodes(parsed.nodes, parsed.edges);
  const usedIds = new Set<string>();
  const groupIdByOriginal = new Map<string, string>();
  const groups: DiagramGroup[] = [];

  for (const node of collapsed.nodes) {
    if (!node.isGroup) {
      continue;
    }
    const id = uniqueDiagramId(node.id, usedIds);
    groupIdByOriginal.set(node.id, id);
    groups.push({
      id,
      label: node.label || node.id,
      parentId: node.parentId,
      fill: displayFill(node.fill, node.fill2),
      stroke: node.stroke,
    });
  }

  for (const grp of groups) {
    if (grp.parentId) {
      grp.parentId = groupIdByOriginal.get(grp.parentId) ?? grp.parentId;
    }
  }

  const leafGraphmlNodes = collapsed.nodes.filter((node) => !node.isGroup);
  const nodes: DiagramNode[] = leafGraphmlNodes.map((node) => {
    const shape = visualShape(node.shape);
    const kind =
      extraMeta.nodeKindById.get(node.id) ??
      semanticKind(node, collapsed.edges);
    const stereo = extraMeta.nodeStereoById.get(node.id);
    const groupId = node.parentId
      ? (groupIdByOriginal.get(node.parentId) ?? node.parentId)
      : undefined;

    return {
      id: uniqueDiagramId(node.id, usedIds),
      label: node.label,
      kind,
      groupId,
      semantic: stereo ? { stereotype: stereo } : undefined,
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
    leafGraphmlNodes.map((node, index) => [node.id, nodes[index]!.id]),
  );

  const edges: DiagramEdge[] = collapsed.edges
    .filter(
      (edge) =>
        idByOriginal.has(edge.source) && idByOriginal.has(edge.target),
    )
    .map((edge, index) => {
      const explicitKind = extraMeta.edgeKindByIndex.get(index);
      const sourceLabel = extraMeta.edgeSourceLabelByIndex.get(index);
      const targetLabel = extraMeta.edgeTargetLabelByIndex.get(index);
      return {
        id: `e${index + 1}`,
        source: idByOriginal.get(edge.source) ?? edge.source,
        target: idByOriginal.get(edge.target) ?? edge.target,
        label: edge.label,
        kind: explicitKind ?? (edge.dashed ? "dashed" : undefined),
        directed: edge.directed,
        color: edge.color,
        sourceLabel,
        targetLabel,
        semantic:
          sourceLabel || targetLabel
            ? {
                sourceCardinality: sourceLabel,
                targetCardinality: targetLabel,
              }
            : undefined,
        matchConfidence: 1,
      };
    });

  return {
    version: CONVERSION_IR_VERSION,
    kind: "graph",
    direction: parsed.direction ?? detectDiagramDirection(source, format),
    nodes,
    edges,
    groups,
    extras: extraMeta.title ? { title: extraMeta.title } : {},
    metadata: { sourceFormat: format },
  };
}
