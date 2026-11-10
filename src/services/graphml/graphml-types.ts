export const NODE_WIDTH = 140;
export const NODE_HEIGHT = 44;
export const NODE_RX = 6;
export const NODE_CHAR_WIDTH = 8;
export const NODE_LABEL_PADDING = 28;
export const GROUP_MIN_WIDTH = 220;
export const GROUP_MIN_HEIGHT = 120;
export const GROUP_LABEL_OUTSET = 18;
export const GRAPH_MARGIN = 24;
export const HEXAGON_INSET_RATIO = 0.22;
export const PARALLELOGRAM_INSET_RATIO = 0.1;
export const TRAPEZOID_INSET_RATIO = 0.15;
export const PREDEFINED_PROCESS_BAR_RATIO = 0.12;
export const PREDEFINED_PROCESS_BAR_MAX = 12;
export const NODE_LABEL_FONT_SIZE = 13;
export const NODE_LABEL_LINE_HEIGHT = 16;
export const NODE_LABEL_MIN_FONT_SIZE = 9;
export const NODE_LABEL_EM_WIDTH = 0.5;
export const NODE_SHAPE_LABEL_INSET_X = 6;
export const NODE_SHAPE_LABEL_INSET_Y = 4;
export const NODE_LABEL_FIT_STEPS = 6;
export const CLIP_T_EPSILON = 0.0001;
export const SEGMENT_PARALLEL_EPSILON = 1e-9;
export const ELLIPSE_BOUNDARY_EPSILON = 0.0001;
export const MIN_NODE_EXTENT = 1;
export const MIN_SEGMENT_LENGTH = 1;
export const DASHED_STROKE_PATTERN = "6 4";
export const LABEL_ATTR_NAMES = ["label", "nodeLabel", "edgeLabel"] as const;
export const SHAPE_ATTR_NAME = "shape";
export const STYLE_ATTR_NAME = "style";
export const FILL_ATTR_NAME = "fill";
export const STROKE_ATTR_NAME = "stroke";
export const COLOR_ATTR_NAME = "color";
export const X_ATTR_NAME = "x";
export const Y_ATTR_NAME = "y";
export const WIDTH_ATTR_NAME = "width";
export const HEIGHT_ATTR_NAME = "height";
export const RECT_SHAPE_ALIAS = "rect";
export const ROUND_SHAPE_ALIAS = "round";
export const DASHED_STYLE = "dashed";
export const DOTTED_STYLE = "dotted";
export const ARROW_NONE = "none";
export const HIDDEN_FLAG = "false";
export const UNDIRECTED_EDGE_DEFAULT = "undirected";
export const DIRECTED_EDGE_FLAG = "true";
export const UNDIRECTED_EDGE_FLAG = "false";
export const NON_LABEL_ATTRS = new Set([
  SHAPE_ATTR_NAME,
  STYLE_ATTR_NAME,
  FILL_ATTR_NAME,
  STROKE_ATTR_NAME,
  COLOR_ATTR_NAME,
  X_ATTR_NAME,
  Y_ATTR_NAME,
  WIDTH_ATTR_NAME,
  HEIGHT_ATTR_NAME,
  "kind",
  "stereotype",
  "sourceLabel",
  "targetLabel",
  "c2g_ir",
]);
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const HEX_ALPHA_PATTERN = /^#([0-9a-fA-F]{8})$/;
export const HEX_RGB_LENGTH = 6;
export const NOTE_FOLD_RATIO = 0.22;
export const NOTE_FOLD_MAX = 16;
export const TABLE_LANE_MAIN = "#c4d7ed";
export const TABLE_LANE_ALTERNATING = "#abc8e2";
export const TABLE_LANE_MAIN_PROPERTY = "yed.table.lane.color.main";
export const TABLE_LANE_ALT_PROPERTY = "yed.table.lane.color.alternating";
export const LANE_LABEL_FONT_SIZE = 12;
export const RANK_DIRECTIONS = ["TB", "LR", "BT", "RL"] as const;
export const LAYOUT_NODE_SEP = 56;
export const LAYOUT_RANK_SEP = 84;
export const LAYOUT_EDGE_SEP = 28;
export const FONT_FAMILY = "system-ui, sans-serif";
export const STROKE_WIDTH = 1.5;
export const EDGE_LABEL_FONT_SIZE = 11;
export const EDGE_LABEL_CHAR_WIDTH = 7;
export const EDGE_LABEL_LINE_HEIGHT = 16;
export const EDGE_LABEL_PAD_X = 5;
export const EDGE_LABEL_GAP = 6;
export const EDGE_LABEL_SAMPLE_STEP = 12;
export const LABEL_SEPARATION_STEPS = 32;
export const GROUP_LABEL_FONT_SIZE = 12;
export const GROUP_LABEL_CHAR_WIDTH = 7.2;
export const GROUP_LABEL_INSET_X = 10;
export const GROUP_LABEL_BASELINE_GAP = 6;
export const GROUP_LABEL_ASCENT = 12;
export const GROUP_LABEL_DESCENT = 4;
export const OBSTACLE_PAD = 4;
export const LIGHT_TEXT = "#0f172a";
export const DARK_TEXT = "#f8fafc";
export const LIGHT_CANVAS = "#ffffff";
export const DARK_CANVAS = "#171d24";
export const TEXT_LUMINANCE_THRESHOLD = 0.55;
export const SRGB_LINEAR_THRESHOLD = 0.03928;
export const SRGB_OFFSET = 0.055;
export const SRGB_SCALE = 1.055;
export const SRGB_GAMMA = 2.4;
export const SRGB_SLOPE = 12.92;
export const LUMA_RED = 0.2126;
export const LUMA_GREEN = 0.7152;
export const LUMA_BLUE = 0.0722;
export const HEX_CHANNEL_BASE = 16;
export const HEX_BYTE_MAX = 255;

export const NODE_SHAPES = [
  "rectangle",
  "ellipse",
  "diamond",
  "hexagon",
  "parallelogram",
  "trapezoid",
  "trapezoid2",
  "predefinedProcess",
  "note",
] as const;

export type GraphmlNodeShape = (typeof NODE_SHAPES)[number];
export type GraphmlRankDirection = (typeof RANK_DIRECTIONS)[number];

export interface GraphmlGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphmlEdgeLabelAnchor {
  segment: number;
  ratio: number;
  distance: number;
}

export interface GraphmlLane {
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  labelBand: number;
}

export interface GraphmlEdgeLabelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphmlNode {
  id: string;
  label: string;
  shape: GraphmlNodeShape;
  fill?: string;
  fill2?: string;
  stroke?: string;
  dashed: boolean;
  geometry?: GraphmlGeometry;
  parentId?: string;
  isGroup: boolean;
  lanes?: GraphmlLane[];
  headerHeight?: number;
}

export interface GraphmlEdge {
  source: string;
  target: string;
  label?: string;
  color?: string;
  directed: boolean;
  dashed: boolean;
  bends?: PolyPoint[];
  sourceOffset?: PolyPoint;
  targetOffset?: PolyPoint;
  labelAnchor?: GraphmlEdgeLabelAnchor;
  labelBox?: GraphmlEdgeLabelBox;
}

export interface ParsedGraphml {
  nodes: GraphmlNode[];
  edges: GraphmlEdge[];
  direction: GraphmlRankDirection;
}

export interface DataEntry {
  name?: string;
  value: string;
}

export interface ThemeColors {
  nodeFill: string;
  nodeStroke: string;
  textFill: string;
  edgeStroke: string;
  groupFill: string;
  groupStroke: string;
  canvas: string;
}

export interface AxisBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PolyPoint {
  x: number;
  y: number;
}

export interface PlacedEdgeLabel {
  text: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  pinned: boolean;
}

export interface EdgeLayout {
  label?: string;
  color?: string;
  directed: boolean;
  dashed: boolean;
  points: PolyPoint[];
  labelPoint?: PolyPoint;
  labelPinned: boolean;
}
