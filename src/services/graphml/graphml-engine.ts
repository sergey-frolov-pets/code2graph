import type dagre from "dagre";
import {
  buildEdgePath,
  formatCoord,
  groupLabelBox,
  labelBox,
  layoutGraph,
  placeEdgeLabels,
  themeColors,
} from "@/services/graphml/graphml-layout";
import {
  escapeXml,
  parseGraphml,
  parseRankDirection,
  textColorForFill,
} from "@/services/graphml/graphml-parser";
import { applyMarkedAspectFrame } from "@/utils/svg-aspect-frame";
import {
  DASHED_STROKE_PATTERN,
  EDGE_LABEL_FONT_SIZE,
  FONT_FAMILY,
  GRAPH_MARGIN,
  GROUP_LABEL_BASELINE_GAP,
  GROUP_LABEL_FONT_SIZE,
  GROUP_LABEL_INSET_X,
  GROUP_LABEL_OUTSET,
  HEXAGON_INSET_RATIO,
  NODE_RX,
  STROKE_WIDTH,
  type AxisBox,
  type EdgeLayout,
  type GraphmlNode,
  type GraphmlNodeShape,
  type GraphmlRankDirection,
  type ParsedGraphml,
  type PolyPoint,
} from "@/services/graphml/graphml-types";

export { parseGraphml };

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
  return applyMarkedAspectFrame(
    source,
    renderGraphmlSvg(graph, dagreGraph, Boolean(options.dark)),
  );
}
