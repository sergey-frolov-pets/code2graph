export interface VisualBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualNodeHint {
  domId?: string;
  semanticId?: string;
  label: string;
  bbox: VisualBBox;
  fill?: string;
  stroke?: string;
  shape?: "rect" | "round" | "diamond" | "ellipse";
}

export interface VisualEdgeHint {
  sourceLabel?: string;
  targetLabel?: string;
  label?: string;
}

export type VisualHintSource =
  | "mermaid-dom"
  | "plantuml-geometry"
  | "metadata"
  | "graphml-dom";

export interface VisualHints {
  nodes: VisualNodeHint[];
  edges: VisualEdgeHint[];
  source: VisualHintSource;
}
