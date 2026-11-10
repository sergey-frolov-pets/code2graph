import type dagre from "dagre";
import {
  buildEdgePath,
  formatCoord,
  groupLabelBox,
  hasAbsoluteGeometry,
  labelBox,
  layoutAbsolute,
  layoutGraph,
  placeEdgeLabels,
  shapeOutline,
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
  NODE_LABEL_FONT_SIZE,
  NODE_LABEL_LINE_HEIGHT,
  NODE_RX,
  PREDEFINED_PROCESS_BAR_MAX,
  PREDEFINED_PROCESS_BAR_RATIO,
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

function renderPolygon(points: PolyPoint[], paint: string): string {
  const value = points
    .map((point) => `${formatCoord(point.x)},${formatCoord(point.y)}`)
    .join(" ");
  return `<polygon points="${value}" ${paint}/>`;
}

function renderNodeShape(
  shape: GraphmlNodeShape,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  dashed: boolean,
): string {
  const dash = dashed ? ` stroke-dasharray="${DASHED_STROKE_PATTERN}"` : "";
  const paint = `fill="${fill}" stroke="${stroke}" stroke-width="${STROKE_WIDTH}"${dash}`;
  if (shape === "ellipse") {
    return `<ellipse cx="${formatCoord(x + width / 2)}" cy="${formatCoord(y + height / 2)}" rx="${formatCoord(width / 2)}" ry="${formatCoord(height / 2)}" ${paint}/>`;
  }

  if (shape === "rectangle") {
    return `<rect x="${formatCoord(x)}" y="${formatCoord(y)}" width="${formatCoord(width)}" height="${formatCoord(height)}" rx="${NODE_RX}" ${paint}/>`;
  }

  const outline = shapeOutline(shape, x, y, width, height);
  const polygon = renderPolygon(outline, paint);
  if (shape !== "predefinedProcess") {
    return polygon;
  }

  const inset = Math.min(PREDEFINED_PROCESS_BAR_MAX, width * PREDEFINED_PROCESS_BAR_RATIO);
  const top = formatCoord(y);
  const bottom = formatCoord(y + height);
  const left = formatCoord(x + inset);
  const right = formatCoord(x + width - inset);
  return `${polygon}
  <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${stroke}" stroke-width="${STROKE_WIDTH}"/>
  <line x1="${right}" y1="${top}" x2="${right}" y2="${bottom}" stroke="${stroke}" stroke-width="${STROKE_WIDTH}"/>`;
}

function renderNodeLabel(
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
  textFill: string,
): string {
  const lines = label.split(/\r?\n/);
  const centerX = formatCoord(x + width / 2);
  const centerY = formatCoord(y + height / 2);
  const paint = `fill="${textFill}" font-family="${FONT_FAMILY}" font-size="${NODE_LABEL_FONT_SIZE}" text-anchor="middle" dominant-baseline="middle"`;
  if (lines.length <= 1) {
    return `<text x="${centerX}" y="${centerY}" ${paint}>${escapeXml(label)}</text>`;
  }

  const startOffset = -((lines.length - 1) * NODE_LABEL_LINE_HEIGHT) / 2;
  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? startOffset : NODE_LABEL_LINE_HEIGHT;
      return `<tspan x="${centerX}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");
  return `<text y="${centerY}" ${paint}>${tspans}</text>`;
}

function gradientId(index: number): string {
  return `graphml-fill-${index}`;
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
    }) as { points?: PolyPoint[]; labelPoint?: PolyPoint } | undefined;
    if (!layoutEdge?.points?.length) {
      return [];
    }

    const labelPoint = layoutEdge.labelPoint;
    return [{
      label: edge.label,
      color: edge.color,
      directed: edge.directed,
      dashed: edge.dashed,
      points: layoutEdge.points.map((point: PolyPoint) => ({
        x: point.x + offsetX,
        y: point.y + offsetY,
      })),
      labelPoint: labelPoint
        ? { x: labelPoint.x + offsetX, y: labelPoint.y + offsetY }
        : undefined,
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
      if (edge.labelPoint) {
        edge.labelPoint.x += shiftX;
        edge.labelPoint.y += shiftY;
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

  const gradientByNode = new Map<GraphmlNode, string>();
  const gradientElements = renderedNodes
    .flatMap((rendered, index) => {
      if (!rendered.node.fill || !rendered.node.fill2 || rendered.node.isGroup) {
        return [];
      }

      const id = gradientId(index);
      gradientByNode.set(rendered.node, id);
      return [`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${rendered.node.fill}"/>
      <stop offset="100%" stop-color="${rendered.node.fill2}"/>
    </linearGradient>`];
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
      const gradient = gradientByNode.get(rendered.node);
      const paint = gradient ? `url(#${gradient})` : fill;
      const shape = renderNodeShape(
        rendered.node.shape,
        rendered.x,
        rendered.y,
        rendered.width,
        rendered.height,
        paint,
        stroke,
        rendered.node.dashed,
      );

      return `<g class="graphml-node">
  ${shape}
  ${renderNodeLabel(rendered.node.label, rendered.x, rendered.y, rendered.width, rendered.height, textFill)}
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
    ${gradientElements}
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
  const dagreGraph = hasAbsoluteGeometry(graph)
    ? layoutAbsolute(graph)
    : layoutGraph(graph, parseRankDirection(options.direction ?? graph.direction));
  return applyMarkedAspectFrame(
    source,
    renderGraphmlSvg(graph, dagreGraph, Boolean(options.dark)),
  );
}
