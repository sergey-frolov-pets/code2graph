import {
  ARROW_NONE,
  DASHED_STYLE,
  DIRECTED_EDGE_FLAG,
  DOTTED_STYLE,
  HIDDEN_FLAG,
  type GraphmlEdgeLabelAnchor,
  type GraphmlGeometry,
  type GraphmlNodeShape,
  type PolyPoint,
} from "@/services/graphml/graphml-types";

const FLOWCHART_SHAPES: Record<string, GraphmlNodeShape> = {
  "com.yworks.flowchart.start1": "ellipse",
  "com.yworks.flowchart.start2": "ellipse",
  "com.yworks.flowchart.terminator": "ellipse",
  "com.yworks.flowchart.decision": "diamond",
  "com.yworks.flowchart.process": "rectangle",
  "com.yworks.flowchart.predefinedProcess": "predefinedProcess",
  "com.yworks.flowchart.data": "parallelogram",
  "com.yworks.flowchart.manualOperation": "trapezoid2",
  "com.yworks.flowchart.preparation": "hexagon",
};

const SHAPE_NODE_SHAPES: Record<string, GraphmlNodeShape> = {
  rectangle: "rectangle",
  roundrectangle: "rectangle",
  ellipse: "ellipse",
  diamond: "diamond",
  hexagon: "hexagon",
  parallelogram: "parallelogram",
  parallelogram2: "parallelogram",
  trapezoid: "trapezoid",
  trapezoid2: "trapezoid2",
};

export interface YedNodeGraphics {
  label?: string;
  shape: GraphmlNodeShape;
  fill?: string;
  fill2?: string;
  stroke?: string;
  dashed: boolean;
  geometry?: GraphmlGeometry;
}

export interface YedEdgeGraphics {
  label?: string;
  color?: string;
  dashed: boolean;
  directed?: boolean;
  bends: PolyPoint[];
  sourceOffset: PolyPoint;
  targetOffset: PolyPoint;
  labelAnchor?: GraphmlEdgeLabelAnchor;
}

function localName(tagName: string): string {
  const separatorIndex = tagName.indexOf(":");
  return separatorIndex >= 0 ? tagName.slice(separatorIndex + 1) : tagName;
}

function dataElements(element: Element): Element[] {
  return Array.from(element.children).filter(
    (child) => localName(child.tagName) === "data",
  );
}

function descendantsNamed(root: Element, name: string): Element[] {
  return Array.from(root.getElementsByTagName("*")).filter(
    (element) => localName(element.tagName) === name,
  );
}

function firstDescendant(root: Element, name: string): Element | undefined {
  return descendantsNamed(root, name)[0];
}

function readNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function directText(element: Element): string {
  let text = "";
  for (const child of Array.from(element.childNodes)) {
    if (
      child.nodeType === Node.TEXT_NODE
      || child.nodeType === Node.CDATA_SECTION_NODE
    ) {
      text += child.textContent ?? "";
    }
  }

  return text.replace(/\r\n/g, "\n").trim();
}

function visibleLabel(root: Element, tagName: string): string | undefined {
  for (const label of descendantsNamed(root, tagName)) {
    if (label.getAttribute("visible") === HIDDEN_FLAG) {
      continue;
    }

    const text = directText(label);
    if (text) {
      return text;
    }
  }

  return undefined;
}

function readGeometry(graphic: Element): GraphmlGeometry | undefined {
  const geometry = firstDescendant(graphic, "Geometry");
  if (!geometry) {
    return undefined;
  }

  const x = readNumber(geometry.getAttribute("x"));
  const y = readNumber(geometry.getAttribute("y"));
  const width = readNumber(geometry.getAttribute("width"));
  const height = readNumber(geometry.getAttribute("height"));
  if (
    x === undefined
    || y === undefined
    || width === undefined
    || height === undefined
  ) {
    return undefined;
  }

  return { x, y, width, height };
}

function isDashedStroke(type: string | null): boolean {
  return type === DASHED_STYLE || type === DOTTED_STYLE;
}

function readShape(graphic: Element, tagName: string): GraphmlNodeShape {
  if (tagName === "GenericNode") {
    const configuration = graphic.getAttribute("configuration") ?? "";
    return FLOWCHART_SHAPES[configuration] ?? "rectangle";
  }

  const shape = firstDescendant(graphic, "Shape");
  const type = shape?.getAttribute("type") ?? "";
  return SHAPE_NODE_SHAPES[type] ?? "rectangle";
}

export function readYedNodeGraphics(node: Element): YedNodeGraphics | undefined {
  for (const data of dataElements(node)) {
    const generic = firstDescendant(data, "GenericNode");
    const shapeNode = firstDescendant(data, "ShapeNode");
    const graphic = generic ?? shapeNode;
    if (!graphic) {
      continue;
    }

    const fill = firstDescendant(graphic, "Fill");
    const border = firstDescendant(graphic, "BorderStyle");
    const transparent = fill?.getAttribute("transparent") === DIRECTED_EDGE_FLAG;

    return {
      label: visibleLabel(graphic, "NodeLabel"),
      shape: readShape(graphic, generic ? "GenericNode" : "ShapeNode"),
      fill: transparent ? undefined : fill?.getAttribute("color") ?? undefined,
      fill2: transparent ? undefined : fill?.getAttribute("color2") ?? undefined,
      stroke: border?.getAttribute("color") ?? undefined,
      dashed: isDashedStroke(border?.getAttribute("type") ?? null),
      geometry: readGeometry(graphic),
    };
  }

  return undefined;
}

function readBends(path: Element | undefined): PolyPoint[] {
  if (!path) {
    return [];
  }

  const bends: PolyPoint[] = [];
  for (const child of Array.from(path.children)) {
    if (localName(child.tagName) !== "Point") {
      continue;
    }

    const x = readNumber(child.getAttribute("x"));
    const y = readNumber(child.getAttribute("y"));
    if (x === undefined || y === undefined) {
      continue;
    }

    bends.push({ x, y });
  }

  return bends;
}

function readLabelAnchor(edgeData: Element): GraphmlEdgeLabelAnchor | undefined {
  const parameter = firstDescendant(edgeData, "SmartEdgeLabelModelParameter");
  if (!parameter) {
    return undefined;
  }

  const segment = readNumber(parameter.getAttribute("segment"));
  const ratio = readNumber(parameter.getAttribute("ratio"));
  const distance = readNumber(parameter.getAttribute("distance"));
  if (segment === undefined || ratio === undefined || distance === undefined) {
    return undefined;
  }

  return { segment, ratio, distance };
}

export function readYedEdgeGraphics(edge: Element): YedEdgeGraphics | undefined {
  for (const data of dataElements(edge)) {
    const graphic = firstDescendant(data, "PolyLineEdge")
      ?? firstDescendant(data, "ArcEdge")
      ?? firstDescendant(data, "SplineEdge")
      ?? firstDescendant(data, "BezierEdge")
      ?? firstDescendant(data, "QuadCurveEdge");
    if (!graphic) {
      continue;
    }

    const path = firstDescendant(graphic, "Path");
    const line = firstDescendant(graphic, "LineStyle");
    const arrows = firstDescendant(graphic, "Arrows");
    const targetArrow = arrows?.getAttribute("target");

    return {
      label: visibleLabel(graphic, "EdgeLabel"),
      color: line?.getAttribute("color") ?? undefined,
      dashed: isDashedStroke(line?.getAttribute("type") ?? null),
      directed: targetArrow === null || targetArrow === undefined
        ? undefined
        : targetArrow !== ARROW_NONE,
      bends: readBends(path),
      sourceOffset: {
        x: readNumber(path?.getAttribute("sx") ?? null) ?? 0,
        y: readNumber(path?.getAttribute("sy") ?? null) ?? 0,
      },
      targetOffset: {
        x: readNumber(path?.getAttribute("tx") ?? null) ?? 0,
        y: readNumber(path?.getAttribute("ty") ?? null) ?? 0,
      },
      labelAnchor: readLabelAnchor(graphic),
    };
  }

  return undefined;
}
