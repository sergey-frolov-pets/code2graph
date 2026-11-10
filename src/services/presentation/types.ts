export const PRESENTATION_PATH_KINDS = [
  "line",
  "polyline",
  "quadratic",
  "cubic",
] as const;

export type PresentationPathKind = (typeof PRESENTATION_PATH_KINDS)[number];

export const PRESENTATION_OVERLAY_KINDS = [
  "rect",
  "ellipse",
  "text",
  "arrow",
] as const;

export type PresentationOverlayKind = (typeof PRESENTATION_OVERLAY_KINDS)[number];

export const PRESENTATION_TEXT_BACKINGS = ["none", "rectangle", "bubble"] as const;

export type PresentationTextBacking = (typeof PRESENTATION_TEXT_BACKINGS)[number];

export const PRESENTATION_ARROW_KINDS = ["straight", "elbow", "curve"] as const;

export type PresentationArrowKind = (typeof PRESENTATION_ARROW_KINDS)[number];

export const PRESENTATION_ARROW_HEADS = ["none", "end", "start", "both"] as const;

export type PresentationArrowHead = (typeof PRESENTATION_ARROW_HEADS)[number];

export const PRESENTATION_LINE_STYLES = ["solid", "dashed"] as const;

export type PresentationLineStyle = (typeof PRESENTATION_LINE_STYLES)[number];

export const PRESENTATION_FONTS = ["sans", "serif", "mono"] as const;

export type PresentationFont = (typeof PRESENTATION_FONTS)[number];

/** Point on the rendered image, as a fraction of its width and height. */
export interface NormPoint {
  x: number;
  y: number;
}

export interface Viewpoint {
  id: string;
  anchor: NormPoint;
  scale: number;
  dwellMs: number;
}

export interface PresentationTransition {
  id: string;
  fromId: string;
  toId: string;
  durationMs: number;
  path: PresentationPathKind;
  /** Intermediate vertices of a polyline. Endpoints are the viewpoints. */
  points: NormPoint[];
  /** Quadratic uses the first control, cubic uses the first two. */
  controls: NormPoint[];
}

export interface OverlayOwner {
  kind: "viewpoint" | "transition";
  id: string;
}

export interface PresentationOverlay {
  id: string;
  owner: OverlayOwner;
  shape: PresentationOverlayKind;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  backing: PresentationTextBacking;
  arrowKind: PresentationArrowKind;
  arrowHead: PresentationArrowHead;
  /** Empty string keeps the theme color. */
  stroke: string;
  fill: string;
  textColor: string;
  font: PresentationFont;
  line: PresentationLineStyle;
}

export interface PresentationTrack {
  id: string;
  name: string;
  viewpoints: Viewpoint[];
  transitions: PresentationTransition[];
  overlays: PresentationOverlay[];
}

export interface PresentationDocument {
  version: number;
  activeTrackId: string;
  showOverlays: boolean;
  tracks: PresentationTrack[];
}

export interface CameraFrame {
  anchorX: number;
  anchorY: number;
  scale: number;
}
