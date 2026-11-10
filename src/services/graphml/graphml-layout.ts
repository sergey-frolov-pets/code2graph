import dagre from "dagre";
import { measureNodeWidth } from "@/services/graphml/graphml-parser";
import {
  CLIP_T_EPSILON,
  DARK_CANVAS,
  DARK_TEXT,
  EDGE_LABEL_CHAR_WIDTH,
  EDGE_LABEL_GAP,
  EDGE_LABEL_LINE_HEIGHT,
  EDGE_LABEL_PAD_X,
  EDGE_LABEL_SAMPLE_STEP,
  ELLIPSE_BOUNDARY_EPSILON,
  GRAPH_MARGIN,
  GROUP_LABEL_ASCENT,
  GROUP_LABEL_BASELINE_GAP,
  GROUP_LABEL_CHAR_WIDTH,
  GROUP_LABEL_DESCENT,
  GROUP_LABEL_INSET_X,
  GROUP_MIN_HEIGHT,
  GROUP_MIN_WIDTH,
  HEXAGON_INSET_RATIO,
  LABEL_SEPARATION_STEPS,
  LAYOUT_EDGE_SEP,
  LAYOUT_NODE_SEP,
  LAYOUT_RANK_SEP,
  LIGHT_CANVAS,
  LIGHT_TEXT,
  MIN_NODE_EXTENT,
  MIN_SEGMENT_LENGTH,
  NODE_HEIGHT,
  OBSTACLE_PAD,
  PARALLELOGRAM_INSET_RATIO,
  SEGMENT_PARALLEL_EPSILON,
  TRAPEZOID_INSET_RATIO,
  type AxisBox,
  type EdgeLayout,
  type GraphmlEdge,
  type GraphmlEdgeLabelAnchor,
  type GraphmlGeometry,
  type GraphmlNode,
  type GraphmlNodeShape,
  type GraphmlRankDirection,
  type ParsedGraphml,
  type PlacedEdgeLabel,
  type PolyPoint,
  type ThemeColors,
} from "@/services/graphml/graphml-types";

export function layoutGraph(
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

export function hasAbsoluteGeometry(graph: ParsedGraphml): boolean {
  return graph.nodes.length > 0 && graph.nodes.every((node) => node.geometry);
}

export function shapeOutline(
  shape: GraphmlNodeShape,
  x: number,
  y: number,
  width: number,
  height: number,
): PolyPoint[] {
  const right = x + width;
  const bottom = y + height;
  const midX = x + width / 2;
  const midY = y + height / 2;

  if (shape === "diamond") {
    return [
      { x: midX, y },
      { x: right, y: midY },
      { x: midX, y: bottom },
      { x, y: midY },
    ];
  }

  if (shape === "hexagon") {
    const inset = width * HEXAGON_INSET_RATIO;
    return [
      { x: x + inset, y },
      { x: right - inset, y },
      { x: right, y: midY },
      { x: right - inset, y: bottom },
      { x: x + inset, y: bottom },
      { x, y: midY },
    ];
  }

  if (shape === "parallelogram") {
    const inset = width * PARALLELOGRAM_INSET_RATIO;
    return [
      { x: x + inset, y },
      { x: right, y },
      { x: right - inset, y: bottom },
      { x, y: bottom },
    ];
  }

  if (shape === "trapezoid") {
    const inset = width * TRAPEZOID_INSET_RATIO;
    return [
      { x: x + inset, y },
      { x: right - inset, y },
      { x: right, y: bottom },
      { x, y: bottom },
    ];
  }

  if (shape === "trapezoid2") {
    const inset = width * TRAPEZOID_INSET_RATIO;
    return [
      { x, y },
      { x: right, y },
      { x: right - inset, y: bottom },
      { x: x + inset, y: bottom },
    ];
  }

  return [
    { x, y },
    { x: right, y },
    { x: right, y: bottom },
    { x, y: bottom },
  ];
}

function nodeCenter(node: GraphmlNode): PolyPoint {
  const geometry = node.geometry;
  if (!geometry) {
    return { x: 0, y: 0 };
  }

  return {
    x: geometry.x + geometry.width / 2,
    y: geometry.y + geometry.height / 2,
  };
}

function pointInPolygon(point: PolyPoint, polygon: PolyPoint[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (!current || !prior || current.y === prior.y) {
      continue;
    }

    const crosses = (current.y > point.y) !== (prior.y > point.y);
    const xAtY = ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
    if (crosses && point.x < xAtY) {
      inside = !inside;
    }
  }

  return inside;
}

function segmentHitT(
  origin: PolyPoint,
  toward: PolyPoint,
  start: PolyPoint,
  end: PolyPoint,
): number | undefined {
  const rx = toward.x - origin.x;
  const ry = toward.y - origin.y;
  const sx = end.x - start.x;
  const sy = end.y - start.y;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < SEGMENT_PARALLEL_EPSILON) {
    return undefined;
  }

  const offsetX = start.x - origin.x;
  const offsetY = start.y - origin.y;
  const t = (offsetX * sy - offsetY * sx) / denominator;
  const u = (offsetX * ry - offsetY * rx) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return undefined;
  }

  return t;
}

function pointAlong(origin: PolyPoint, toward: PolyPoint, t: number): PolyPoint {
  return {
    x: origin.x + (toward.x - origin.x) * t,
    y: origin.y + (toward.y - origin.y) * t,
  };
}

function clipPolygon(port: PolyPoint, toward: PolyPoint, outline: PolyPoint[]): PolyPoint {
  let nearest = 1;
  for (let index = 0; index < outline.length; index += 1) {
    const start = outline[index];
    const end = outline[(index + 1) % outline.length];
    if (!start || !end) {
      continue;
    }

    const t = segmentHitT(port, toward, start, end);
    if (t !== undefined && t > CLIP_T_EPSILON && t < nearest) {
      nearest = t;
    }
  }

  return pointAlong(port, toward, nearest);
}

function clipEllipse(port: PolyPoint, toward: PolyPoint, geometry: GraphmlGeometry): PolyPoint {
  const radiusX = Math.max(geometry.width / 2, MIN_NODE_EXTENT);
  const radiusY = Math.max(geometry.height / 2, MIN_NODE_EXTENT);
  const centerX = geometry.x + geometry.width / 2;
  const centerY = geometry.y + geometry.height / 2;
  const offsetX = port.x - centerX;
  const offsetY = port.y - centerY;
  const inside = (offsetX * offsetX) / (radiusX * radiusX)
    + (offsetY * offsetY) / (radiusY * radiusY);
  if (inside >= 1 - ELLIPSE_BOUNDARY_EPSILON) {
    return port;
  }

  const deltaX = toward.x - port.x;
  const deltaY = toward.y - port.y;
  const a = (deltaX * deltaX) / (radiusX * radiusX) + (deltaY * deltaY) / (radiusY * radiusY);
  const b = 2 * ((offsetX * deltaX) / (radiusX * radiusX) + (offsetY * deltaY) / (radiusY * radiusY));
  const c = inside - 1;
  const discriminant = b * b - 4 * a * c;
  if (a === 0 || discriminant < 0) {
    return toward;
  }

  const root = Math.sqrt(discriminant);
  const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)]
    .filter((t) => t > CLIP_T_EPSILON && t <= 1);
  const t = candidates.length > 0 ? Math.min(...candidates) : 1;
  return pointAlong(port, toward, t);
}

function clipPort(node: GraphmlNode, port: PolyPoint, toward: PolyPoint): PolyPoint {
  const geometry = node.geometry;
  if (!geometry) {
    return port;
  }

  if (node.shape === "ellipse") {
    return clipEllipse(port, toward, geometry);
  }

  const outline = shapeOutline(
    node.shape,
    geometry.x,
    geometry.y,
    geometry.width,
    geometry.height,
  );
  if (!pointInPolygon(port, outline)) {
    return port;
  }

  return clipPolygon(port, toward, outline);
}

function labelPointOnRoute(points: PolyPoint[], anchor: GraphmlEdgeLabelAnchor): PolyPoint {
  const segmentCount = points.length - 1;
  const fallback = points[0] ?? { x: 0, y: 0 };
  if (segmentCount <= 0) {
    return fallback;
  }

  const index = anchor.segment < 0 ? segmentCount + anchor.segment : anchor.segment;
  const bounded = Math.max(0, Math.min(segmentCount - 1, index));
  const start = points[bounded] ?? fallback;
  const end = points[bounded + 1] ?? start;
  const ratio = Math.min(1, Math.max(0, anchor.ratio));
  const x = start.x + (end.x - start.x) * ratio;
  const y = start.y + (end.y - start.y) * ratio;
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length < MIN_SEGMENT_LENGTH || anchor.distance === 0) {
    return { x, y };
  }

  return {
    x: x + (-(end.y - start.y) / length) * anchor.distance,
    y: y + ((end.x - start.x) / length) * anchor.distance,
  };
}

function routeAbsoluteEdge(
  source: GraphmlNode,
  target: GraphmlNode,
  edge: GraphmlEdge,
): { points: PolyPoint[]; labelPoint?: PolyPoint } {
  const sourceCenter = nodeCenter(source);
  const targetCenter = nodeCenter(target);
  const start = {
    x: sourceCenter.x + (edge.sourceOffset?.x ?? 0),
    y: sourceCenter.y + (edge.sourceOffset?.y ?? 0),
  };
  const end = {
    x: targetCenter.x + (edge.targetOffset?.x ?? 0),
    y: targetCenter.y + (edge.targetOffset?.y ?? 0),
  };
  const bends = edge.bends ?? [];
  const raw = [start, ...bends, end];
  const next = raw[1] ?? end;
  const previous = raw[raw.length - 2] ?? start;
  const points = [clipPort(source, start, next), ...bends, clipPort(target, end, previous)];
  const labelPoint = edge.label && edge.labelAnchor
    ? labelPointOnRoute(points, edge.labelAnchor)
    : undefined;

  return { points, labelPoint };
}

export function layoutAbsolute(graph: ParsedGraphml): dagre.graphlib.Graph {
  const dagreGraph = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  dagreGraph.setGraph({
    marginx: GRAPH_MARGIN,
    marginy: GRAPH_MARGIN,
  });
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const node of graph.nodes) {
    const geometry = node.geometry;
    dagreGraph.setNode(node.id, {
      label: node.label,
      width: geometry?.width ?? 0,
      height: geometry?.height ?? 0,
      x: (geometry?.x ?? 0) + (geometry?.width ?? 0) / 2,
      y: (geometry?.y ?? 0) + (geometry?.height ?? 0) / 2,
    });
  }

  for (const node of graph.nodes) {
    if (node.parentId) {
      dagreGraph.setParent(node.id, node.parentId);
    }
  }

  for (const [index, edge] of graph.edges.entries()) {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    if (!source || !target) {
      continue;
    }

    const routed = routeAbsoluteEdge(source, target, edge);
    dagreGraph.setEdge(edge.source, edge.target, routed, `e${index}`);
  }

  return dagreGraph;
}

export function buildEdgePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return "";
  }

  const [firstPoint, ...rest] = points;
  const segments = rest.map((point) => `L ${point.x} ${point.y}`);
  return `M ${firstPoint.x} ${firstPoint.y} ${segments.join(" ")}`;
}

export function themeColors(dark: boolean): ThemeColors {
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

export function formatCoord(value: number): string {
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

export function groupLabelBox(groupLeft: number, groupTop: number, label: string): AxisBox {
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

export function labelBox(label: PlacedEdgeLabel, gap = 0): AxisBox {
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

export function placeEdgeLabels(edges: EdgeLayout[], obstacles: AxisBox[]): Array<PlacedEdgeLabel | undefined> {
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
    const anchor = edge.labelPoint
      ?? pool[Math.floor(pool.length / 2)]
      ?? edge.points[0]
      ?? { x: 0, y: 0 };

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
