import dagre from "dagre";
import { measureNodeWidth } from "@/services/graphml/graphml-parser";
import {
  DARK_CANVAS,
  DARK_TEXT,
  EDGE_LABEL_CHAR_WIDTH,
  EDGE_LABEL_GAP,
  EDGE_LABEL_LINE_HEIGHT,
  EDGE_LABEL_PAD_X,
  EDGE_LABEL_SAMPLE_STEP,
  GRAPH_MARGIN,
  GROUP_LABEL_ASCENT,
  GROUP_LABEL_BASELINE_GAP,
  GROUP_LABEL_CHAR_WIDTH,
  GROUP_LABEL_DESCENT,
  GROUP_LABEL_INSET_X,
  GROUP_MIN_HEIGHT,
  GROUP_MIN_WIDTH,
  LABEL_SEPARATION_STEPS,
  LAYOUT_EDGE_SEP,
  LAYOUT_NODE_SEP,
  LAYOUT_RANK_SEP,
  LIGHT_CANVAS,
  LIGHT_TEXT,
  NODE_HEIGHT,
  OBSTACLE_PAD,
  type AxisBox,
  type EdgeLayout,
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
