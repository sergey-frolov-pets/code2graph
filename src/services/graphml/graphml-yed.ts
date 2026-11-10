import {
  ARROW_NONE,
  DASHED_STYLE,
  DIRECTED_EDGE_FLAG,
  DOTTED_STYLE,
  HIDDEN_FLAG,
  TABLE_LANE_ALT_PROPERTY,
  TABLE_LANE_ALTERNATING,
  TABLE_LANE_MAIN,
  TABLE_LANE_MAIN_PROPERTY,
  type GraphmlEdgeLabelAnchor,
  type GraphmlGeometry,
  type GraphmlLane,
  type GraphmlNodeShape,
  type PolyPoint,
} from "@/services/graphml/graphml-types";

const BPMN_EVENT = "com.yworks.bpmn.Event";
const BPMN_GATEWAY = "com.yworks.bpmn.Gateway";
const BPMN_ARTIFACT = "com.yworks.bpmn.Artifact";
const SBGN_UNIT_OF_INFORMATION = "com.yworks.sbgn.UnitOfInformation";
const SHADOW_SUFFIX = ".withShadow";
const REALIZER_TAGS = [
  "GenericNode",
  "GenericGroupNode",
  "GroupNode",
  "ShapeNode",
  "TableNode",
  "UMLNoteNode",
  "ImageNode",
  "SVGNode",
] as const;

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
  lanes?: GraphmlLane[];
  headerHeight?: number;
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

function childByName(element: Element, name: string): Element | undefined {
  return Array.from(element.children).find(
    (child) => localName(child.tagName) === name,
  );
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

function genericConfigurationShape(configuration: string): GraphmlNodeShape {
  const flowchart = FLOWCHART_SHAPES[configuration];
  if (flowchart) {
    return flowchart;
  }

  const plain = configuration.endsWith(SHADOW_SUFFIX)
    ? configuration.slice(0, -SHADOW_SUFFIX.length)
    : configuration;
  if (plain === BPMN_EVENT) {
    return "ellipse";
  }
  if (plain === BPMN_GATEWAY) {
    return "diamond";
  }
  if (plain === BPMN_ARTIFACT) {
    return "note";
  }
  if (plain === SBGN_UNIT_OF_INFORMATION) {
    return "rectangle";
  }

  return "rectangle";
}

function realizerShape(graphic: Element): GraphmlNodeShape {
  const tag = localName(graphic.tagName);
  if (tag === "GenericNode" || tag === "GenericGroupNode") {
    return genericConfigurationShape(graphic.getAttribute("configuration") ?? "");
  }
  if (tag === "UMLNoteNode") {
    return "note";
  }
  if (tag === "ShapeNode" || tag === "GroupNode") {
    const shape = firstDescendant(graphic, "Shape");
    const type = shape?.getAttribute("type") ?? "";
    return SHAPE_NODE_SHAPES[type] ?? "rectangle";
  }

  return "rectangle";
}

function activeRealizer(proxy: Element): Element | undefined {
  const realizers = childByName(proxy, "Realizers");
  const options = realizers ? Array.from(realizers.children) : [];
  const first = options[0];
  if (!realizers || !first) {
    return undefined;
  }

  const active = readNumber(realizers.getAttribute("active")) ?? 0;
  const index = Math.min(options.length - 1, Math.max(0, Math.trunc(active)));
  return options[index] ?? first;
}

function findRealizer(data: Element): Element | undefined {
  const proxy = childByName(data, "ProxyAutoBoundsNode")
    ?? childByName(data, "ProxyShapeNode");
  if (proxy) {
    return activeRealizer(proxy);
  }

  for (const tag of REALIZER_TAGS) {
    const found = childByName(data, tag);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function styleValue(graphic: Element, name: string): string | undefined {
  for (const property of descendantsNamed(graphic, "Property")) {
    if (property.getAttribute("name") === name) {
      return property.getAttribute("value") ?? undefined;
    }
  }

  return undefined;
}

function insetStart(element: Element | undefined, axis: "top" | "left"): number {
  return readNumber(element?.getAttribute(axis) ?? null)
    ?? readNumber(element?.getAttribute(`${axis}F`) ?? null)
    ?? 0;
}

function rowLabel(graphic: Element, rowId: string): string | undefined {
  if (!rowId) {
    return undefined;
  }

  for (const label of descendantsNamed(graphic, "NodeLabel")) {
    const parameter = descendantsNamed(label, "RowNodeLabelModelParameter")
      .find((item) => item.getAttribute("id") === rowId);
    if (!parameter) {
      continue;
    }

    const text = directText(label);
    if (text) {
      return text;
    }
  }

  return undefined;
}

function readTableLanes(
  graphic: Element,
  width: number,
): { lanes: GraphmlLane[]; headerHeight: number } | undefined {
  if (localName(graphic.tagName) !== "TableNode") {
    return undefined;
  }

  const table = childByName(graphic, "Table");
  if (!table) {
    return undefined;
  }

  const headerHeight = insetStart(childByName(table, "Insets"), "top");
  const labelBand = insetStart(childByName(table, "DefaultRowInsets"), "left");
  const main = styleValue(graphic, TABLE_LANE_MAIN_PROPERTY) ?? TABLE_LANE_MAIN;
  const alternating = styleValue(graphic, TABLE_LANE_ALT_PROPERTY) ?? TABLE_LANE_ALTERNATING;
  const rows = descendantsNamed(table, "Row").filter(
    (row) => localName(row.parentElement?.tagName ?? "") === "Rows",
  );
  let y = headerHeight;
  const lanes: GraphmlLane[] = [];
  for (const row of rows) {
    const height = readNumber(row.getAttribute("height"));
    if (height === undefined || height <= 0) {
      continue;
    }

    lanes.push({
      label: rowLabel(graphic, row.getAttribute("id") ?? ""),
      x: 0,
      y,
      width,
      height,
      fill: lanes.length % 2 === 0 ? main : alternating,
      labelBand,
    });
    y += height;
  }

  return { lanes, headerHeight };
}

export function readYedNodeGraphics(node: Element): YedNodeGraphics | undefined {
  for (const data of dataElements(node)) {
    const graphic = findRealizer(data);
    if (!graphic) {
      continue;
    }

    const fill = firstDescendant(graphic, "Fill");
    const border = firstDescendant(graphic, "BorderStyle");
    const transparent = fill?.getAttribute("transparent") === DIRECTED_EDGE_FLAG;
    const geometry = readGeometry(graphic);
    const table = geometry ? readTableLanes(graphic, geometry.width) : undefined;

    return {
      label: visibleLabel(graphic, "NodeLabel"),
      shape: realizerShape(graphic),
      fill: transparent ? undefined : fill?.getAttribute("color") ?? undefined,
      fill2: transparent ? undefined : fill?.getAttribute("color2") ?? undefined,
      stroke: border?.getAttribute("color") ?? undefined,
      dashed: isDashedStroke(border?.getAttribute("type") ?? null),
      geometry,
      lanes: table?.lanes,
      headerHeight: table?.headerHeight,
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
