import {
  PREVIEW_MIN_ZOOM,
  PREVIEW_WHEEL_LINE_PIXELS,
  PREVIEW_ZOOM_SENSITIVITY,
  PREVIEW_ZOOM_STEP,
} from "@/constants/preview-pan-zoom";
import { isTransparentBackground } from "@/services/export/svg-background";
import { parseSvgCssSize } from "@/services/export/svg-geometry";
import { PAN_ZOOM_SCALE_EPSILON } from "@/services/preview/pan-zoom-math";
import {
  FRAME_EFFECT_FLY_DISTANCE,
  FRAME_EFFECT_POP_OVERSHOOT,
  FRAME_EFFECT_POP_START,
  FRAME_EFFECT_PULSE_AMOUNT,
  FRAME_EFFECT_SPIN_DEGREES,
  FRAME_EFFECT_SPIN_MIN_OPACITY,
  FRAME_EFFECT_TEAR_AMPLITUDE,
  FRAME_EFFECT_TEAR_TEETH,
  FRAME_EFFECT_ZOOM_AMOUNT,
  PRESENTATION_CHROME_REVEAL_MS,
  PRESENTATION_DEFAULT_TRANSITION_MS,
  PRESENTATION_GIF_FALLBACK_BACKGROUND,
  PRESENTATION_MAX_SCALE,
  PRESENTATION_OVERLAY_TEXT_HEIGHT_RATIO,
  PRESENTATION_OVERLAY_TEXT_MAX_PX,
  PRESENTATION_OVERLAY_TEXT_MIN_PX,
} from "@/services/presentation/constants";
import {
  artworkFitTransform,
  overlayArtwork,
  rotationTransform,
} from "@/services/presentation/glyph-art";
import { overlayCssColor } from "@/services/presentation/overlay-color";
import {
  isLineArrow,
  lineArrowPath,
  overlayOutline,
  overlayRotates,
  positiveBox,
  type OverlayBox,
} from "@/services/presentation/overlay-geometry";
import {
  overlayTextFontSize,
  overlayTextLinePlacements,
} from "@/services/presentation/overlay-text";
import type { PresentationGifTheme } from "@/services/presentation/gif-export";
import type { PresentationOverlay, PresentationTrack } from "@/services/presentation/types";
import { LocalizedAppError } from "@/utils/localized-app-error";

const HTML_MIME_TYPE = "text/html;charset=utf-8";
const HTML_FILE_EXTENSION = ".html";
const SVG_XMLNS = "http://www.w3.org/2000/svg";
const UNSAFE_FILE_CHARS = /[\\/:*?"<>|]/g;
const SAFE_CSS_COLOR = /^[#a-zA-Z0-9(),.%\s+/-]+$/;
const SAFE_LANG = /^[a-z]{2}(?:-[A-Za-z0-9]{2,8})*$/;
const FRAME_DATA_URL = /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/;
const CSS_COLOR_MAX_LENGTH = 64;
const COORDINATE_PRECISION = 1000;
const HTML_FALLBACK_VIEWPORT_WIDTH = 960;
const HTML_FALLBACK_VIEWPORT_HEIGHT = 540;
const HTML_FRAME_FALLBACK_MS = 16;
/** Same resting opacity as the in-app presentation dock while a tour plays. */
const HTML_PLAYER_DIM_OPACITY = 0.12;
const HTML_STICKER_WIDTH = 168;
const HTML_STICKER_HEIGHT = 112;
/** Smallest sticker box: about one line of the sticker font. */
const HTML_STICKER_MIN_WIDTH = 18;
const HTML_STICKER_MIN_HEIGHT = 18;
const HTML_STICKER_NUDGE = 16;
const HTML_STICKER_RADIUS = 10;
const HTML_STICKER_PAD = 3;
const HTML_STICKER_BORDER = 1;
const HTML_STICKER_SHADOW_Y = 8;
const HTML_STICKER_SHADOW_BLUR = 18;
const HTML_STICKER_SHADOW_ALPHA = 18;
const HTML_STICKER_CHROME = 16;
const HTML_STICKER_CLOSE_FONT = 16;
const HTML_STICKER_PALETTE_MAX = "11rem";
const HTML_STICKER_BAR_HEIGHT = 28;
const HTML_HANDLE_PILL = 999;
const HTML_STICKER_HANDLE_SIZE = 22;
const HTML_STICKER_RESIZE_SIZE = 22;
const HTML_STICKER_RESIZE_OUTSET = 8;
const HTML_STICKER_RESIZE_ICON = 14;
const HTML_STICKER_RESIZE_STROKE = 1.6;
const HTML_STICKER_RESIZE_PATH = "M3.2 10.8 L10.8 3.2 M7.4 3.2 H10.8 V6.6 M3.2 7.4 V10.8 H6.6";
const HTML_STICKER_FONT_DOWN_PX = 12;
const HTML_STICKER_FONT_MARK_PX = 13;
const HTML_STICKER_FONT_UP_PX = 16;
const HTML_STICKER_FONT_BUTTON = 20;
const HTML_STICKER_FONT_SCALE_MIN = 0.5;
const HTML_STICKER_FONT_SCALE_MAX = 10;
const HTML_STICKER_FONT_SCALE_STEP = 0.5;

function stickerFontScaleSteps(): number[] {
  const scales: number[] = [];
  for (
    let value = HTML_STICKER_FONT_SCALE_MIN;
    value <= HTML_STICKER_FONT_SCALE_MAX;
    value += HTML_STICKER_FONT_SCALE_STEP
  ) {
    scales.push(Math.round(value * 100) / 100);
  }
  return scales;
}

/** Text size relative to the card. Resizing the card still scales the text on top of this. */
const HTML_STICKER_FONT_SCALES = stickerFontScaleSteps();
/** Six-dot drag handle, same grip as the in-app presentation dock. */
const HTML_STICKER_GRIP_WIDTH = 40;
const HTML_STICKER_GRIP_HEIGHT = 22;
const HTML_STICKER_COLOR_GAP = 4;
const HTML_GRIP_COLUMNS = 3;
const HTML_GRIP_ROWS = 2;
const HTML_GRIP_ORIGIN_X = 5;
const HTML_GRIP_ORIGIN_Y = 9;
const HTML_GRIP_STEP_X = 7;
const HTML_GRIP_STEP_Y = 6;
const HTML_GRIP_DOT_RADIUS = 1.45;
const HTML_GRIP_VIEWBOX = 24;
const HTML_GRIP_ICON_WIDTH = 22;
const HTML_GRIP_ICON_HEIGHT = 16;
const HTML_STICKER_FONT_PX = 14;
const HTML_STICKER_FILL = "#fff4b8";
const HTML_STICKER_STROKE = "#e2c56a";
const HTML_STICKER_INK = "#1a1f24";
const HTML_INK_LIGHT = "#ffffff";
const HTML_INK_LUMA = 0.62;
const HTML_PEN_COLOR = "#e23d3d";
const HTML_PEN_WIDTH_MIN = 1;
const HTML_PEN_WIDTH_MAX = 16;
const HTML_PEN_WIDTH_DEFAULT = 3;
const HTML_PEN_MIN_STEP = 0.75;
const HTML_PEN_STROKE_LIMIT = 200;
const HTML_PEN_POINT_LIMIT = 4000;
const HTML_NOTE_TEXT_LIMIT = 8000;
const HTML_COPY_SUFFIX = "copy";
const NOTE_COLORS: ReadonlyArray<{ fill: string; ink: string }> = [
  { fill: HTML_STICKER_FILL, ink: HTML_STICKER_INK },
  { fill: "#ffd6e0", ink: HTML_STICKER_INK },
  { fill: "#d9f5d3", ink: HTML_STICKER_INK },
  { fill: "#d6ecff", ink: HTML_STICKER_INK },
  { fill: "#ffe0c2", ink: HTML_STICKER_INK },
  { fill: "#e4d7ff", ink: HTML_STICKER_INK },
  { fill: HTML_INK_LIGHT, ink: HTML_STICKER_INK },
  { fill: HTML_STICKER_INK, ink: HTML_INK_LIGHT },
];
const HTML_PAN_KEY_STEP = 48;
const HTML_PNG_MAX_PIXEL_RATIO = 2;
const HTML_CHECKER_CELL = 8;
const HTML_DOWNLOAD_REVOKE_MS = 1000;
const HTML_WHEEL_CTRL_MULTIPLIER = 2;
const HTML_WHEEL_LINE_STEP_LIMIT = 3;
const SHAPE_STROKE_PX = 2;
const ARROW_STROKE_PX = 2.5;
const ARROW_HEAD_SCREEN_PX = 12;
const OVERLAY_DASHARRAY = "8 5";
const FALLBACK_LANG = "en";
const FALLBACK_TITLE = "presentation";
const THEME_ACCENT = "#0f6cbd";
const THEME_SURFACE = "#ffffff";
const THEME_TEXT = "#1a1f24";
/** Screen-pixel reach of the eraser, before the current zoom. */
const HTML_ERASER_RADIUS = 12;
const HTML_TOOL_CURSOR_SIZE = 24;
const HTML_TOOL_CURSOR_STROKE = 1.6;
/** Tip of the pencil glyph, where a stroke should start. */
const HTML_PENCIL_CURSOR_HOT_X = 2;
const HTML_PENCIL_CURSOR_HOT_Y = 21;
/** Lower corner of the eraser glyph. */
const HTML_ERASER_CURSOR_HOT_X = 6;
const HTML_ERASER_CURSOR_HOT_Y = 20;
const PENCIL_CURSOR_SHAPE = "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z";
const ERASER_CURSOR_BODY = "m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21";

function toolCursorUrl(body: string): string {
  const frame = `xmlns="http://www.w3.org/2000/svg" width="${HTML_TOOL_CURSOR_SIZE}" height="${HTML_TOOL_CURSOR_SIZE}" viewBox="0 0 ${HTML_TOOL_CURSOR_SIZE} ${HTML_TOOL_CURSOR_SIZE}"`;
  return `data:image/svg+xml,${encodeURIComponent(`<svg ${frame}>${body}</svg>`)}`;
}

const PENCIL_CURSOR_URL = toolCursorUrl(
  `<path d="${PENCIL_CURSOR_SHAPE}" fill="none" stroke="${THEME_SURFACE}" stroke-width="${HTML_TOOL_CURSOR_STROKE * 2}" stroke-linejoin="round"/>`
  + `<path d="${PENCIL_CURSOR_SHAPE}" fill="${HTML_PEN_COLOR}" stroke="${THEME_TEXT}" stroke-width="${HTML_TOOL_CURSOR_STROKE}" stroke-linejoin="round"/>`
  + `<path d="m15 5 4 4" fill="none" stroke="${THEME_TEXT}" stroke-width="${HTML_TOOL_CURSOR_STROKE}" stroke-linecap="round"/>`,
);
const ERASER_CURSOR_URL = toolCursorUrl(
  `<path d="${ERASER_CURSOR_BODY}" fill="${THEME_SURFACE}" stroke="${THEME_TEXT}" stroke-width="${HTML_TOOL_CURSOR_STROKE}" stroke-linejoin="round"/>`
  + `<path d="M22 21H7" fill="none" stroke="${THEME_TEXT}" stroke-width="${HTML_TOOL_CURSOR_STROKE}" stroke-linecap="round"/>`
  + `<path d="m5 11 9 9" fill="none" stroke="${HTML_PEN_COLOR}" stroke-width="${HTML_TOOL_CURSOR_STROKE}" stroke-linecap="round"/>`,
);
const PEN_COLORS = [
  HTML_PEN_COLOR,
  THEME_ACCENT,
  "#1f8a4c",
  "#e09b12",
  "#6b4c9a",
  HTML_STICKER_INK,
  HTML_INK_LIGHT,
] as const;
const OVERLAY_FILL_FALLBACK = "color-mix(in srgb, var(--c2g-surface) 88%, transparent)";
const OVERLAY_STROKE_FALLBACK = "var(--c2g-accent)";
const OVERLAY_TEXT_FALLBACK = "var(--c2g-text)";

const OVERLAY_FONT_FAMILY = {
  sans: "sans-serif",
  serif: "serif",
  mono: "ui-monospace, monospace",
} as const;

export const PRESENTATION_HTML_MIME = HTML_MIME_TYPE;

export interface PresentationHtmlLabels {
  first: string;
  prev: string;
  next: string;
  play: string;
  pause: string;
  repeat: string;
  explore: string;
  playback: string;
  zoomIn: string;
  zoomOut: string;
  zoomLevel: string;
  resetView: string;
  savePng: string;
  addSticker: string;
  removeSticker: string;
  resizeSticker: string;
  moveSticker: string;
  sticker: string;
  stickerColor: string;
  stickerFontSmaller: string;
  stickerFontLarger: string;
  saveCopy: string;
  hideMarks: string;
  showMarks: string;
  pen: string;
  eraser: string;
  penColor: string;
  penWidth: string;
  copySuffix: string;
  keys: string;
  keysClose: string;
  keysHelp: string;
}

export interface PresentationHtmlSource {
  svg: string;
  frameHref?: string | null;
  track: PresentationTrack;
  showOverlays: boolean;
  imageWidth: number;
  imageHeight: number;
  theme: PresentationGifTheme;
  lang: string;
  dir: "ltr" | "rtl";
  labels: PresentationHtmlLabels;
}

interface PlayerViewpoint {
  id: string;
  x: number;
  y: number;
  scale: number;
  dwellMs: number;
  effects: PresentationTrack["viewpoints"][number]["effects"];
}

interface PlayerTransition {
  id: string;
  durationMs: number;
  path: PresentationTrack["transitions"][number]["path"];
  points: PresentationTrack["transitions"][number]["points"];
  controls: PresentationTrack["transitions"][number]["controls"];
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlEscape(value: string): string {
  return xmlEscape(value);
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return String(Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION);
}

function cssColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length === 0
    || trimmed.length > CSS_COLOR_MAX_LENGTH
    || !SAFE_CSS_COLOR.test(trimmed)
  ) {
    return fallback;
  }
  return trimmed;
}

function htmlLang(value: string): string {
  const trimmed = value.trim();
  return SAFE_LANG.test(trimmed) ? trimmed : FALLBACK_LANG;
}

function presentationTitle(name: string): string {
  const cleaned = name.replace(/\s+/g, " ").trim();
  return cleaned || FALLBACK_TITLE;
}

function embedJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function isUnsafeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("javascript:")
    || trimmed.startsWith("vbscript:")
    || trimmed.startsWith("data:text/html");
}

function embeddableSvg(svg: string): string {
  if (!svg.includes("<svg")) {
    throw new LocalizedAppError("app.exportHtmlFailed");
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.localName !== "svg") {
    throw new LocalizedAppError("app.exportHtmlFailed");
  }
  root.querySelectorAll("script, iframe, object, embed").forEach((node) => {
    node.remove();
  });
  for (const node of root.querySelectorAll("*")) {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
        continue;
      }
      if ((name === "href" || name === "src" || name.endsWith(":href")) && isUnsafeUrl(attr.value)) {
        node.removeAttribute(attr.name);
      }
    }
  }
  if (!root.getAttribute("xmlns")) {
    root.setAttribute("xmlns", SVG_XMLNS);
  }
  return new XMLSerializer().serializeToString(root);
}

function embeddableFrame(href: string | null | undefined): string {
  if (!href || !FRAME_DATA_URL.test(href)) {
    return "";
  }
  return href;
}

function imageBox(
  overlay: PresentationOverlay,
  imageWidth: number,
  imageHeight: number,
): OverlayBox {
  return {
    x: overlay.x * imageWidth,
    y: overlay.y * imageHeight,
    width: overlay.width * imageWidth,
    height: overlay.height * imageHeight,
  };
}

function paintAttrs(overlay: PresentationOverlay): string {
  const stroke = overlayCssColor(overlay.stroke, OVERLAY_STROKE_FALLBACK);
  const fill = overlayCssColor(overlay.fill, OVERLAY_FILL_FALLBACK);
  const dash = overlay.line === "dashed" ? ` stroke-dasharray="${OVERLAY_DASHARRAY}"` : "";
  return ` fill="${xmlEscape(fill)}" stroke="${xmlEscape(stroke)}" stroke-width="${SHAPE_STROKE_PX}" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"${dash}`;
}

function artworkMarkup(overlay: PresentationOverlay, box: OverlayBox): string {
  const artwork = overlayArtwork(overlay);
  if (!artwork) {
    return "";
  }
  const parts = artwork.parts.map((part) => {
    const width = part.strokeWidth > 0 ? ` stroke-width="${formatNumber(part.strokeWidth)}"` : "";
    return `<path d="${xmlEscape(part.d)}" fill="${xmlEscape(part.fill)}" stroke="${xmlEscape(part.stroke)}"${width} stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  const fitted = artwork.transform
    ? `<g transform="${xmlEscape(artworkFitTransform(box, artwork))}"><g transform="${xmlEscape(artwork.transform)}">${parts}</g></g>`
    : `<g transform="${xmlEscape(artworkFitTransform(box, artwork))}">${parts}</g>`;
  const rotation = overlayRotates(overlay) ? rotationTransform(box, overlay.rotation) : undefined;
  return rotation ? `<g transform="${xmlEscape(rotation)}">${fitted}</g>` : fitted;
}

function shapeMarkup(overlay: PresentationOverlay, box: OverlayBox): string {
  const outline = overlayOutline(overlay, box);
  if (!outline) {
    return "";
  }
  const path = `<path d="${xmlEscape(outline)}"${paintAttrs(overlay)}/>`;
  const rotation = overlayRotates(overlay) ? rotationTransform(box, overlay.rotation) : undefined;
  return rotation ? `<g transform="${xmlEscape(rotation)}">${path}</g>` : path;
}

function cssId(value: string, index: number): string {
  const cleaned = value.replace(/[^A-Za-z0-9_-]/g, "");
  return `${cleaned || "mark"}-${index}`;
}

function arrowMarker(id: string, path: string, refX: string, stroke: string): string {
  return `<marker id="${id}" markerUnits="userSpaceOnUse" viewBox="0 0 8 8" refX="${refX}" refY="3" orient="auto" markerWidth="${ARROW_HEAD_SCREEN_PX}" markerHeight="${ARROW_HEAD_SCREEN_PX}"><path d="${path}" fill="${xmlEscape(stroke)}"/></marker>`;
}

function lineMarkup(
  overlay: PresentationOverlay,
  box: OverlayBox,
  index: number,
): { defs: string; body: string } {
  const stroke = overlayCssColor(overlay.stroke, OVERLAY_STROKE_FALLBACK);
  const dash = overlay.line === "dashed" ? ` stroke-dasharray="${OVERLAY_DASHARRAY}"` : "";
  const token = cssId(overlay.id, index);
  const end = overlay.arrowHead === "end" || overlay.arrowHead === "both";
  const start = overlay.arrowHead === "start" || overlay.arrowHead === "both";
  const endId = `c2g-arrow-end-${token}`;
  const startId = `c2g-arrow-start-${token}`;
  const defs = `${end ? arrowMarker(endId, "M0 0 L7 3 L0 6 Z", "7", stroke) : ""}${start ? arrowMarker(startId, "M7 0 L0 3 L7 6 Z", "1", stroke) : ""}`;
  const refs = `${end ? ` marker-end="url(#${endId})"` : ""}${start ? ` marker-start="url(#${startId})"` : ""}`;
  return {
    defs,
    body: `<path d="${xmlEscape(lineArrowPath(box, overlay.arrowKind))}" fill="none" stroke="${xmlEscape(stroke)}" stroke-width="${ARROW_STROKE_PX}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"${dash}${refs}/>`,
  };
}

function textMarkup(overlay: PresentationOverlay, box: OverlayBox): string {
  if (overlay.shape !== "text" || !overlay.text) {
    return "";
  }
  const placed = positiveBox(box);
  const fontSize = overlayTextFontSize(placed.height);
  const centerX = placed.x + placed.width / 2;
  const centerY = placed.y + placed.height / 2;
  const color = overlayCssColor(overlay.textColor, OVERLAY_TEXT_FALLBACK);
  const lines = overlayTextLinePlacements(overlay.text, fontSize).map((line) => {
    const em = fontSize === 0 ? 0 : line.centerOffset / fontSize;
    return `<tspan x="${formatNumber(centerX)}" y="${formatNumber(centerY)}" dy="${formatNumber(em)}em">${xmlEscape(line.text)}</tspan>`;
  }).join("");
  return `<text data-box-height="${formatNumber(placed.height)}" text-anchor="middle" dominant-baseline="middle" font-size="${formatNumber(fontSize)}" font-family="${xmlEscape(OVERLAY_FONT_FAMILY[overlay.font])}" fill="${xmlEscape(color)}">${lines}</text>`;
}

function overlayBody(
  overlay: PresentationOverlay,
  box: OverlayBox,
  index: number,
): { defs: string; body: string } {
  if (overlayArtwork(overlay)) {
    return { defs: "", body: artworkMarkup(overlay, box) };
  }
  if (isLineArrow(overlay)) {
    return lineMarkup(overlay, box, index);
  }
  return { defs: "", body: `${shapeMarkup(overlay, box)}${textMarkup(overlay, box)}` };
}

function overlayMarkup(
  overlay: PresentationOverlay,
  imageWidth: number,
  imageHeight: number,
  firstViewpointId: string,
  index: number,
): { defs: string; group: string } {
  const box = imageBox(overlay, imageWidth, imageHeight);
  const placed = positiveBox(box);
  const visible = overlay.owner.kind === "viewpoint" && overlay.owner.id === firstViewpointId;
  const hidden = visible ? "" : " style=\"display:none\"";
  const drawn = overlayBody(overlay, box, index);
  return {
    defs: drawn.defs,
    group: `<g data-owner-kind="${xmlEscape(overlay.owner.kind)}" data-owner-id="${xmlEscape(overlay.owner.id)}" data-overlay-id="${xmlEscape(overlay.id)}" data-cx="${formatNumber(placed.x + placed.width / 2)}" data-cy="${formatNumber(placed.y + placed.height / 2)}" data-x="${formatNumber(placed.x)}" data-y="${formatNumber(placed.y)}" data-w="${formatNumber(placed.width)}" data-h="${formatNumber(placed.height)}"${hidden}>${drawn.body}</g>`,
  };
}

function playerViewpoints(track: PresentationTrack): PlayerViewpoint[] {
  return track.viewpoints.map((viewpoint) => ({
    id: viewpoint.id,
    x: viewpoint.anchor.x,
    y: viewpoint.anchor.y,
    scale: viewpoint.scale,
    dwellMs: viewpoint.dwellMs,
    effects: viewpoint.effects,
  }));
}

function playerTransitions(track: PresentationTrack): PlayerTransition[] {
  return track.transitions.map((transition) => ({
    id: transition.id,
    durationMs: transition.durationMs,
    path: transition.path,
    points: transition.points,
    controls: transition.controls,
  }));
}

const PLAYER_CSS = `
:root {
  color-scheme: light dark;
}
html, body {
  margin: 0;
  height: 100%;
  background: var(--c2g-bg);
  color: var(--c2g-text);
  font-family: sans-serif;
}
body.c2g-checker {
  background-color: #ffffff;
  background-image:
    linear-gradient(45deg, #e4e4e4 25%, transparent 25%),
    linear-gradient(-45deg, #e4e4e4 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e4e4e4 75%),
    linear-gradient(-45deg, transparent 75%, #e4e4e4 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}
#c2g-stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  --c2g-inv: 1;
}
#c2g-scene {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}
#c2g-picture { position: relative; }
#c2g-frame-wrap { position: absolute; inset: 0; }
#c2g-frame-wrap[hidden] { display: none; }
#c2g-frame { width: 100%; height: 100%; object-fit: fill; display: block; }
#c2g-diagram-wrap { position: relative; width: 100%; height: 100%; }
#c2g-frame-wrap, #c2g-diagram-wrap { transform-origin: center center; }
#c2g-overlays {
  position: absolute;
  top: 0;
  left: 0;
  overflow: visible;
  pointer-events: none;
}
#c2g-bar {
  position: fixed;
  z-index: 2;
  left: 50%;
  bottom: max(16px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: calc(100% - 24px);
  padding: 8px 12px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--c2g-surface) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--c2g-text) 16%, transparent);
  box-shadow: 0 8px 28px color-mix(in srgb, var(--c2g-text) 18%, transparent);
  user-select: none;
}
#c2g-bar.is-dim {
  opacity: ${HTML_PLAYER_DIM_OPACITY};
  transition: none;
}
#c2g-bar.is-dim:not(.is-held):hover,
#c2g-bar.is-dim.is-revealed {
  opacity: 1;
}
.c2g-name {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
  font-weight: 650;
}
.c2g-transport {
  display: flex;
  align-items: center;
  gap: 4px;
  direction: ltr;
}
#c2g-bar button {
  position: relative;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--c2g-text);
  cursor: pointer;
}
#c2g-bar button[aria-label]::after {
  content: attr(aria-label);
  position: absolute;
  z-index: 6;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  max-width: 16rem;
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--c2g-text);
  color: var(--c2g-surface);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  white-space: normal;
  text-align: center;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
}
#c2g-bar button[aria-label]:hover::after,
#c2g-bar button[aria-label]:focus-visible::after {
  opacity: 1;
  visibility: visible;
}
#c2g-bar button svg { width: 18px; height: 18px; display: block; }
#c2g-bar button:hover { background: color-mix(in srgb, var(--c2g-accent) 14%, transparent); }
#c2g-bar button:disabled { opacity: 0.35; cursor: default; }
#c2g-bar button:focus-visible { outline: 2px solid var(--c2g-accent); outline-offset: 2px; }
#c2g-play { background: var(--c2g-accent); color: var(--c2g-surface); }
#c2g-play:hover { filter: brightness(1.08); }
#c2g-play .c2g-icon-pause { display: none; }
#c2g-play[data-state="pause"] .c2g-icon-play { display: none; }
#c2g-play[data-state="pause"] .c2g-icon-pause { display: block; }
#c2g-index {
  min-width: 3.5rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
}
.c2g-repeat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  white-space: nowrap;
}
#c2g-ink {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;
  overflow: visible;
  pointer-events: none;
}
#c2g-notes {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 3;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
}
#c2g-stage.is-marks-hidden #c2g-notes,
#c2g-stage.is-marks-hidden #c2g-ink {
  display: none;
}
#c2g-notes[hidden],
#c2g-transport[hidden],
#c2g-zoom[hidden],
#c2g-pen-tools[hidden],
#c2g-keys[hidden],
#c2g-repeat-wrap[hidden] {
  display: none;
}
#c2g-keys {
  position: fixed;
  z-index: 5;
  left: 50%;
  bottom: 84px;
  transform: translateX(-50%);
  width: min(32rem, calc(100% - 24px));
  max-height: min(70vh, 28rem);
  overflow: auto;
  padding: 16px 16px 12px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--c2g-surface) 96%, transparent);
  color: var(--c2g-text);
  border: 1px solid color-mix(in srgb, var(--c2g-text) 16%, transparent);
  box-shadow: 0 12px 40px color-mix(in srgb, var(--c2g-text) 22%, transparent);
}
.c2g-keys-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
#c2g-keys h2,
#c2g-keys h3 {
  margin: 0;
  font-size: 1rem;
}
#c2g-keys h3 { margin: 12px 0 6px; font-size: 0.95rem; }
#c2g-keys p { margin: 0 0 6px; font-size: 0.9rem; line-height: 1.45; }
#c2g-keys-close {
  width: 32px;
  height: 32px;
  flex: none;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--c2g-text);
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}
#c2g-keys-close:hover { background: color-mix(in srgb, var(--c2g-accent) 14%, transparent); }
#c2g-keys-close:focus-visible { outline: 2px solid var(--c2g-accent); outline-offset: 2px; }
#c2g-stage.is-exploring { cursor: grab; touch-action: none; }
#c2g-stage.is-panning { cursor: grabbing; }
#c2g-stage.is-drawing,
#c2g-stage.is-drawing #c2g-scene,
#c2g-stage.is-drawing #c2g-picture,
#c2g-stage.is-drawing #c2g-diagram-wrap,
#c2g-stage.is-drawing #c2g-frame {
  cursor: url("${PENCIL_CURSOR_URL}") ${HTML_PENCIL_CURSOR_HOT_X} ${HTML_PENCIL_CURSOR_HOT_Y}, crosshair;
}
#c2g-stage.is-erasing,
#c2g-stage.is-erasing #c2g-scene,
#c2g-stage.is-erasing #c2g-picture,
#c2g-stage.is-erasing #c2g-diagram-wrap,
#c2g-stage.is-erasing #c2g-frame {
  cursor: url("${ERASER_CURSOR_URL}") ${HTML_ERASER_CURSOR_HOT_X} ${HTML_ERASER_CURSOR_HOT_Y}, cell;
}
#c2g-mode .c2g-icon-playback { display: none; }
#c2g-mode[data-state="playback"] .c2g-icon-explore { display: none; }
#c2g-mode[data-state="playback"] .c2g-icon-playback { display: block; }
#c2g-mode[aria-pressed="true"] {
  background: color-mix(in srgb, var(--c2g-accent) 18%, transparent);
}
#c2g-zoom-level {
  min-width: 3.5rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
}
.c2g-pen-tools {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 6px;
}
#c2g-pen-colors {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 4px;
}
#c2g-bar button.c2g-swatch {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--c2g-text) 35%, transparent);
}
#c2g-bar button.c2g-swatch[aria-pressed="true"] {
  outline: 2px solid var(--c2g-accent);
  outline-offset: 1px;
}
#c2g-pen-width {
  width: 4.5rem;
  accent-color: var(--c2g-accent);
}
#c2g-pen-width-value {
  min-width: 1.25rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;
}
#c2g-pen-custom {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
#c2g-pen .c2g-icon-pencil { display: none; }
#c2g-pen[aria-pressed="true"] {
  background: color-mix(in srgb, var(--c2g-accent) 18%, transparent);
}
#c2g-pen[aria-pressed="true"] .c2g-icon-pen { display: none; }
#c2g-pen[aria-pressed="true"] .c2g-icon-pencil { display: block; }
#c2g-eraser[aria-pressed="true"] {
  background: color-mix(in srgb, var(--c2g-accent) 18%, transparent);
}
#c2g-marks .c2g-icon-show { display: none; }
#c2g-marks[data-state="hidden"] .c2g-icon-hide { display: none; }
#c2g-marks[data-state="hidden"] .c2g-icon-show { display: block; }
.c2g-sticker {
  position: absolute;
  pointer-events: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: var(--c2g-note, ${HTML_STICKER_FILL});
  color: var(--c2g-note-ink, ${HTML_STICKER_INK});
  border: ${HTML_STICKER_BORDER}px solid color-mix(in srgb, var(--c2g-note-ink, ${HTML_STICKER_INK}) 28%, var(--c2g-note, ${HTML_STICKER_FILL}));
  border-radius: ${HTML_STICKER_RADIUS}px;
  box-shadow: 0 ${HTML_STICKER_SHADOW_Y}px ${HTML_STICKER_SHADOW_BLUR}px color-mix(in srgb, ${HTML_STICKER_INK} ${HTML_STICKER_SHADOW_ALPHA}%, transparent);
  font-family: sans-serif;
  font-size: ${HTML_STICKER_FONT_PX}px;
}
.c2g-sticker:not(.is-active) .c2g-sticker-ui { display: none; }
.c2g-sticker-chrome {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(100% / var(--c2g-inv, 1));
  height: calc(100% / var(--c2g-inv, 1));
  transform: scale(var(--c2g-inv, 1));
  transform-origin: 0 0;
  pointer-events: none;
  z-index: 1;
  --c2g-handle-shadow: 0 1px 2px color-mix(in srgb, ${HTML_STICKER_INK} 14%, transparent), 0 8px 16px color-mix(in srgb, ${HTML_STICKER_INK} 16%, transparent);
}
.c2g-sticker-chrome .c2g-sticker-ui { pointer-events: auto; }
.c2g-sticker-bar {
  position: absolute;
  left: 0;
  right: 0;
  top: -${HTML_STICKER_BAR_HEIGHT}px;
  height: ${HTML_STICKER_BAR_HEIGHT}px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${HTML_STICKER_COLOR_GAP}px;
  pointer-events: none;
}
.c2g-sticker-colors {
  position: absolute;
  left: 0;
  bottom: calc(100% + ${HTML_STICKER_BAR_HEIGHT + HTML_STICKER_COLOR_GAP}px);
  display: flex;
  flex-wrap: wrap;
  gap: ${HTML_STICKER_COLOR_GAP}px;
  max-width: ${HTML_STICKER_PALETTE_MAX};
}
.c2g-sticker-swatch,
.c2g-sticker-picker {
  width: ${HTML_STICKER_CHROME}px;
  height: ${HTML_STICKER_CHROME}px;
  border-radius: ${HTML_HANDLE_PILL}px;
  border: ${HTML_STICKER_BORDER}px solid color-mix(in srgb, ${HTML_STICKER_INK} 35%, transparent);
  padding: 0;
  cursor: pointer;
}
.c2g-sticker-picker {
  border-radius: 4px;
  background: transparent;
}
.c2g-sticker-move,
.c2g-sticker-close,
.c2g-sticker-font,
.c2g-sticker-resize {
  box-sizing: border-box;
  border: ${HTML_STICKER_BORDER}px solid color-mix(in srgb, ${HTML_STICKER_INK} 16%, transparent);
  background: ${THEME_SURFACE};
  color: ${HTML_STICKER_INK};
  box-shadow: var(--c2g-handle-shadow);
}
.c2g-sticker-move {
  position: relative;
  flex: none;
  width: ${HTML_STICKER_GRIP_WIDTH}px;
  height: ${HTML_STICKER_GRIP_HEIGHT}px;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: ${HTML_HANDLE_PILL}px;
  cursor: grab;
  touch-action: none;
}
.c2g-sticker-move:active { cursor: grabbing; }
.c2g-sticker-move:hover,
.c2g-sticker-close:hover,
.c2g-sticker-resize:hover { background: color-mix(in srgb, ${THEME_ACCENT} 10%, ${THEME_SURFACE}); }
.c2g-sticker-move svg { width: ${HTML_GRIP_ICON_WIDTH}px; height: ${HTML_GRIP_ICON_HEIGHT}px; display: block; }
.c2g-sticker-font {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  height: ${HTML_STICKER_HANDLE_SIZE}px;
  padding: 0 2px;
  border-radius: ${HTML_HANDLE_PILL}px;
}
.c2g-sticker-font button {
  width: ${HTML_STICKER_FONT_BUTTON}px;
  height: ${HTML_STICKER_FONT_BUTTON}px;
  border: 0;
  padding: 0;
  border-radius: ${HTML_HANDLE_PILL}px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-family: sans-serif;
  line-height: 1;
}
.c2g-sticker-font button:hover:not(:disabled) { background: color-mix(in srgb, ${THEME_ACCENT} 12%, transparent); }
.c2g-sticker-font button:disabled { opacity: 0.35; cursor: default; }
.c2g-sticker-font-down { font-size: ${HTML_STICKER_FONT_DOWN_PX}px; }
.c2g-sticker-font-mark {
  width: ${HTML_STICKER_FONT_MARK_PX}px;
  font-size: ${HTML_STICKER_FONT_MARK_PX}px;
  font-weight: 700;
  text-align: center;
}
.c2g-sticker-font-up { font-size: ${HTML_STICKER_FONT_UP_PX}px; font-weight: 700; }
.c2g-sticker-close {
  position: relative;
  flex: none;
  width: ${HTML_STICKER_HANDLE_SIZE}px;
  height: ${HTML_STICKER_HANDLE_SIZE}px;
  border-radius: ${HTML_HANDLE_PILL}px;
  padding: 0;
  cursor: pointer;
  font-size: ${HTML_STICKER_CLOSE_FONT}px;
  line-height: 1;
}
.c2g-sticker-text {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: ${HTML_STICKER_PAD / HTML_STICKER_FONT_PX}em;
  overflow: hidden;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: inherit;
  line-height: 1.25;
}
.c2g-sticker.is-active .c2g-sticker-text { overflow: auto; }
.c2g-sticker-text:empty:before {
  content: attr(data-placeholder);
  opacity: 0.45;
}
.c2g-sticker-resize {
  position: absolute;
  right: -${HTML_STICKER_RESIZE_OUTSET}px;
  bottom: -${HTML_STICKER_RESIZE_OUTSET}px;
  width: ${HTML_STICKER_RESIZE_SIZE}px;
  height: ${HTML_STICKER_RESIZE_SIZE}px;
  border-radius: ${HTML_HANDLE_PILL}px;
  padding: 0;
  display: grid;
  place-items: center;
  cursor: nwse-resize;
  touch-action: none;
}
.c2g-sticker-resize svg { width: ${HTML_STICKER_RESIZE_ICON}px; height: ${HTML_STICKER_RESIZE_ICON}px; display: block; }
`.trim();

const PLAYER_SCRIPT = `
"use strict";
(function () {
  var dataNode = document.getElementById("c2g-data");
  var stage = document.getElementById("c2g-stage");
  var scene = document.getElementById("c2g-scene");
  var frameWrap = document.getElementById("c2g-frame-wrap");
  var frame = document.getElementById("c2g-frame");
  var diagramWrap = document.getElementById("c2g-diagram-wrap");
  var bar = document.getElementById("c2g-bar");
  var playButton = document.getElementById("c2g-play");
  var prevButton = document.getElementById("c2g-prev");
  var nextButton = document.getElementById("c2g-next");
  var indexNode = document.getElementById("c2g-index");
  var repeatBox = document.getElementById("c2g-repeat");
  var modeButton = document.getElementById("c2g-mode");
  var transport = document.getElementById("c2g-transport");
  var zoomPanel = document.getElementById("c2g-zoom");
  var zoomInButton = document.getElementById("c2g-zoom-in");
  var zoomOutButton = document.getElementById("c2g-zoom-out");
  var zoomResetButton = document.getElementById("c2g-zoom-reset");
  var zoomLevelNode = document.getElementById("c2g-zoom-level");
  var cameraButton = document.getElementById("c2g-camera");
  var stickerButton = document.getElementById("c2g-sticker");
  var penButton = document.getElementById("c2g-pen");
  var eraserButton = document.getElementById("c2g-eraser");
  var penTools = document.getElementById("c2g-pen-tools");
  var penColors = document.getElementById("c2g-pen-colors");
  var penWidthInput = document.getElementById("c2g-pen-width");
  var penWidthValue = document.getElementById("c2g-pen-width-value");
  var penCustom = document.getElementById("c2g-pen-custom");
  var saveCopyButton = document.getElementById("c2g-save-copy");
  var marksButton = document.getElementById("c2g-marks");
  var keysButton = document.getElementById("c2g-help");
  var keysPanel = document.getElementById("c2g-keys");
  var keysClose = document.getElementById("c2g-keys-close");
  var notes = document.getElementById("c2g-notes");
  var ink = document.getElementById("c2g-ink");
  var repeatWrap = document.getElementById("c2g-repeat-wrap");
  if (
    !dataNode || !stage || !scene || !diagramWrap || !playButton || !prevButton || !nextButton
    || !indexNode || !modeButton || !transport || !zoomPanel || !zoomInButton || !zoomOutButton
    || !zoomResetButton || !cameraButton || !stickerButton || !penButton || !eraserButton || !saveCopyButton
    || !marksButton || !keysButton || !keysPanel || !keysClose || !notes || !ink
  ) {
    return;
  }
  var payload;
  try {
    payload = JSON.parse(dataNode.textContent || "");
  } catch (error) {
    return;
  }
  if (!payload || !payload.viewpoints || payload.viewpoints.length === 0) {
    return;
  }

  if (payload.frame && frame) {
    frame.src = payload.frame;
    if (frameWrap) frameWrap.hidden = false;
  }
  var parsed = new DOMParser().parseFromString(payload.svg || "", "image/svg+xml");
  var svgRoot = parsed.documentElement;
  if (svgRoot && svgRoot.localName === "svg") {
    var shadow = diagramWrap.attachShadow({ mode: "open" });
    var style = document.createElement("style");
    style.textContent = "svg{display:block;width:100%;height:100%;cursor:inherit}";
    shadow.appendChild(style);
    shadow.appendChild(document.importNode(svgRoot, true));
  }

  var markers = Array.prototype.slice.call(document.querySelectorAll("#c2g-overlays marker"));
  var overlays = Array.prototype.slice.call(document.querySelectorAll("#c2g-overlays [data-owner-id]"));
  var count = payload.viewpoints.length;
  var index = 0;
  var phase = "dwell";
  var travelOrigin = 0;
  var reverse = false;
  var travelAmount = 0;
  var effectElapsed = 0;
  var playing = false;
  var moving = false;
  var exploring = false;
  var saving = false;
  var camera = { panX: 0, panY: 0, scale: 1 };
  var pointers = {};
  var drag = null;
  var stickerSeq = 0;
  var penOn = false;
  var eraserOn = false;
  var penColor = safeColor(payload.penColor, payload.stickerInk);
  var penWidth = clampPenWidth(payload.penWidth);
  var marksHidden = false;
  var keysOpen = false;
  var strokes = [];
  var barHeld = false;
  var revealTimer = 0;
  var phaseStarted = 0;
  var frameId = 0;
  var reduceMotion = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function visualOf(opacity, scale, translateX, translateY, rotate, clip) {
    return {
      opacity: opacity,
      scale: scale,
      translateX: translateX,
      translateY: translateY,
      rotate: rotate,
      clip: clip
    };
  }
  var identity = visualOf(1, 1, 0, 0, 0, null);

  function nowMs() {
    return performance.now();
  }
  function requestFrame(callback) {
    if (typeof requestAnimationFrame === "function") {
      return requestAnimationFrame(callback);
    }
    return setTimeout(function () { callback(nowMs()); }, payload.frameMs);
  }
  function cancelFrame(id) {
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(id);
    }
    clearTimeout(id);
  }
  function clampUnit(value) {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
  }
  function ease(value) {
    var t = clampUnit(value);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  function lerp(from, to, t) {
    return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  }
  function lerpScale(from, to, t) {
    var amount = clampUnit(t);
    return from + (to - from) * amount;
  }
  function pointOnPolyline(points, t) {
    if (points.length === 0) return { x: 0, y: 0 };
    if (points.length === 1 || t <= 0) return points[0];
    if (t >= 1) return points[points.length - 1];
    var lengths = [];
    var total = 0;
    var i;
    for (i = 1; i < points.length; i += 1) {
      var length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      lengths.push(length);
      total += length;
    }
    if (total === 0) return points[0];
    var remaining = t * total;
    for (i = 0; i < lengths.length; i += 1) {
      if (remaining <= lengths[i]) {
        var local = lengths[i] === 0 ? 0 : remaining / lengths[i];
        return lerp(points[i], points[i + 1], local);
      }
      remaining -= lengths[i];
    }
    return points[points.length - 1];
  }
  function quadratic(from, control, to, t) {
    var inverse = 1 - t;
    return {
      x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
      y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y
    };
  }
  function cubic(from, controlA, controlB, to, t) {
    var inverse = 1 - t;
    return {
      x: Math.pow(inverse, 3) * from.x + 3 * inverse * inverse * t * controlA.x + 3 * inverse * t * t * controlB.x + Math.pow(t, 3) * to.x,
      y: Math.pow(inverse, 3) * from.y + 3 * inverse * inverse * t * controlA.y + 3 * inverse * t * t * controlB.y + Math.pow(t, 3) * to.y
    };
  }
  function sample(from, to, transition, amount) {
    var t = clampUnit(amount);
    if (transition.path === "polyline" && transition.points.length > 0) {
      return pointOnPolyline([from].concat(transition.points, [to]), t);
    }
    if (transition.path === "quadratic" && transition.controls[0]) {
      return quadratic(from, transition.controls[0], to, t);
    }
    if (transition.path === "cubic" && transition.controls[0] && transition.controls[1]) {
      return cubic(from, transition.controls[0], transition.controls[1], to, t);
    }
    return lerp(from, to, t);
  }
  function transitionAt(origin) {
    return payload.transitions[origin] || {
      id: "",
      durationMs: payload.defaultTransitionMs,
      path: "line",
      points: [],
      controls: []
    };
  }
  function clamp01(value) {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
  }
  function flyDirection(kind) {
    if (kind === "flyInLeft" || kind === "flyOutLeft") return { x: -1, y: 0 };
    if (kind === "flyInRight" || kind === "flyOutRight") return { x: 1, y: 0 };
    if (kind === "flyInUp" || kind === "flyOutUp") return { x: 0, y: -1 };
    if (kind === "flyInDown" || kind === "flyOutDown") return { x: 0, y: 1 };
    return null;
  }
  function holdsFinal(kind) {
    return kind === "fadeOut" || kind === "shrink" || kind.indexOf("flyOut") === 0;
  }
  function tearClip(progress) {
    if (progress >= 1) return null;
    var amplitude = payload.tearAmplitude * (1 - progress);
    var reveal = progress / 2;
    var points = [];
    var index;
    for (index = 0; index <= payload.tearTeeth; index += 1) {
      var topTooth = index % 2 === 0 ? -amplitude : amplitude;
      points.push({ x: index / payload.tearTeeth, y: clamp01(0.5 - reveal + topTooth) });
    }
    for (index = payload.tearTeeth; index >= 0; index -= 1) {
      var bottomTooth = index % 2 === 0 ? amplitude : -amplitude;
      points.push({ x: index / payload.tearTeeth, y: clamp01(0.5 + reveal + bottomTooth) });
    }
    return points;
  }
  function wipeClip(progress) {
    if (progress >= 1) return null;
    return [
      { x: 0, y: 0 },
      { x: progress, y: 0 },
      { x: progress, y: 1 },
      { x: 0, y: 1 }
    ];
  }
  function sampleEffect(kind, progress) {
    var direction = flyDirection(kind);
    if (direction) {
      var entering = kind.indexOf("flyIn") === 0;
      var travel = (entering ? 1 - progress : progress) * payload.fly;
      return visualOf(1, 1, direction.x * travel, direction.y * travel, 0, null);
    }
    if (kind === "fade") return visualOf(progress, 1, 0, 0, 0, null);
    if (kind === "fadeOut") return visualOf(1 - progress, 1, 0, 0, 0, null);
    if (kind === "pulse") {
      return visualOf(1, 1 + payload.pulse * Math.sin(progress * Math.PI), 0, 0, 0, null);
    }
    if (kind === "zoom") return visualOf(1, 1 + payload.zoom * progress, 0, 0, 0, null);
    if (kind === "tear") return visualOf(1, 1, 0, 0, 0, tearClip(progress));
    if (kind === "wipe") return visualOf(1, 1, 0, 0, 0, wipeClip(progress));
    if (kind === "spin") {
      return visualOf(
        payload.spinOpacity + (1 - payload.spinOpacity) * progress,
        1,
        0,
        0,
        (1 - progress) * -payload.spin,
        null
      );
    }
    if (kind === "pop") {
      var settled = payload.popStart + (1 - payload.popStart) * progress;
      return visualOf(1, settled + payload.popOvershoot * Math.sin(progress * Math.PI), 0, 0, 0, null);
    }
    if (kind === "shrink") return visualOf(1 - progress, 1 - progress, 0, 0, 0, null);
    return identity;
  }
  function effectVisual(effects, elapsed, target, overlayId) {
    var list = effects || [];
    var applicable = [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      var effect = list[i];
      if (effect.target !== target) continue;
      if (target === "overlay" && effect.overlayId !== overlayId) continue;
      applicable.push(effect);
    }
    var latest = null;
    for (i = 0; i < applicable.length; i += 1) {
      var active = applicable[i];
      if (active.durationMs <= 0) continue;
      if (elapsed < active.startMs || elapsed >= active.startMs + active.durationMs) continue;
      if (!latest || active.startMs >= latest.startMs) latest = active;
    }
    if (latest) return sampleEffect(latest.kind, (elapsed - latest.startMs) / latest.durationMs);
    var held = null;
    for (i = 0; i < applicable.length; i += 1) {
      var done = applicable[i];
      if (!holdsFinal(done.kind) || done.durationMs <= 0) continue;
      if (elapsed < done.startMs + done.durationMs) continue;
      if (!held) {
        held = done;
        continue;
      }
      var end = done.startMs + done.durationMs;
      var heldEnd = held.startMs + held.durationMs;
      if (end > heldEnd || (end === heldEnd && done.startMs >= held.startMs)) held = done;
    }
    if (held) return sampleEffect(held.kind, 1);
    return identity;
  }
  function clipCss(points) {
    var parts = [];
    for (var i = 0; i < points.length; i += 1) {
      parts.push((points[i].x * 100) + "% " + (points[i].y * 100) + "%");
    }
    return "polygon(" + parts.join(", ") + ")";
  }
  function applyVisual(element, visual) {
    if (!element) return;
    element.style.opacity = String(visual.opacity);
    var parts = [];
    if (visual.translateX || visual.translateY) {
      parts.push("translate(" + (visual.translateX * 100) + "%, " + (visual.translateY * 100) + "%)");
    }
    if (visual.rotate) parts.push("rotate(" + visual.rotate + "deg)");
    if (visual.scale !== 1) parts.push("scale(" + visual.scale + ")");
    element.style.transform = parts.join(" ");
    element.style.clipPath = visual.clip ? clipCss(visual.clip) : "";
  }
  function applyOverlayVisual(node, visual) {
    node.style.opacity = String(visual.opacity);
    var cx = Number(node.getAttribute("data-cx"));
    var cy = Number(node.getAttribute("data-cy"));
    var width = Number(node.getAttribute("data-w"));
    var height = Number(node.getAttribute("data-h"));
    if (visual.scale === 1 && !visual.translateX && !visual.translateY && !visual.rotate) {
      node.removeAttribute("transform");
    } else {
      var shiftX = visual.translateX * width;
      var shiftY = visual.translateY * height;
      node.setAttribute(
        "transform",
        "translate(" + cx + " " + cy + ") rotate(" + visual.rotate + ") translate(" + shiftX + " " + shiftY + ") scale(" + visual.scale + ") translate(" + (-cx) + " " + (-cy) + ")"
      );
    }
    var clipId = "c2g-clip-" + (node.getAttribute("data-overlay-id") || "");
    var svg = node.ownerSVGElement;
    var existing = document.getElementById(clipId);
    if (!visual.clip || !svg) {
      node.removeAttribute("clip-path");
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    var x = Number(node.getAttribute("data-x"));
    var y = Number(node.getAttribute("data-y"));
    var coords = [];
    for (var p = 0; p < visual.clip.length; p += 1) {
      coords.push((x + visual.clip[p].x * width) + "," + (y + visual.clip[p].y * height));
    }
    var clip = existing;
    if (!clip) {
      clip = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      clip.setAttribute("id", clipId);
      clip.setAttribute("clipPathUnits", "userSpaceOnUse");
      clip.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "polygon"));
      svg.appendChild(clip);
    }
    var polygon = clip.querySelector("polygon");
    if (polygon) polygon.setAttribute("points", coords.join(" "));
    node.setAttribute("clip-path", "url(#" + clipId + ")");
  }
  function noteFont(boxHeight, scale) {
    var scaled = Math.abs(boxHeight) * scale * payload.textRatio;
    var px = Math.max(payload.textMin, Math.min(payload.textMax, scaled));
    return px / scale;
  }
  function viewportSize() {
    var width = stage.clientWidth || window.innerWidth;
    var height = stage.clientHeight || window.innerHeight;
    return {
      width: width > 0 ? width : payload.fallbackWidth,
      height: height > 0 ? height : payload.fallbackHeight
    };
  }
  function applyCamera(panX, panY, scale) {
    var clamped = Math.min(payload.maxScale, Math.max(payload.minScale, scale));
    if (!isFinite(clamped) || clamped <= 0) clamped = 1;
    if (!isFinite(panX)) panX = 0;
    if (!isFinite(panY)) panY = 0;
    camera.panX = panX;
    camera.panY = panY;
    camera.scale = clamped;
    scene.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + clamped + ")";
    stage.style.setProperty("--c2g-inv", String(1 / clamped));
    var head = payload.arrowHead / clamped;
    for (var i = 0; i < markers.length; i += 1) {
      if (!markers[i]) continue;
      markers[i].setAttribute("markerWidth", String(head));
      markers[i].setAttribute("markerHeight", String(head));
    }
    var texts = document.querySelectorAll("#c2g-overlays text[data-box-height]");
    for (var n = 0; n < texts.length; n += 1) {
      texts[n].setAttribute("font-size", String(noteFont(Number(texts[n].getAttribute("data-box-height")), clamped)));
    }
  }
  function place(anchorX, anchorY, scale) {
    var size = viewportSize();
    var clamped = Math.min(payload.maxScale, Math.max(payload.minScale, scale));
    if (!isFinite(clamped) || clamped <= 0) clamped = 1;
    applyCamera(
      size.width / 2 - anchorX * payload.imageWidth * clamped,
      size.height / 2 - anchorY * payload.imageHeight * clamped,
      clamped
    );
  }
  function updateZoomLabel() {
    if (!zoomLevelNode) return;
    var percent = String(Math.round(camera.scale * 100));
    zoomLevelNode.textContent = percent + "%";
    var template = payload.labels.zoomLevel || "{percent}%";
    zoomLevelNode.setAttribute("aria-label", template.split("{percent}").join(percent));
  }
  function zoomAt(cursorX, cursorY, factor) {
    if (!exploring || factor === 1 || !isFinite(factor)) return;
    var oldScale = camera.scale;
    var nextScale = Math.min(payload.maxScale, Math.max(payload.minScale, oldScale * factor));
    if (Math.abs(nextScale - oldScale) < payload.scaleEpsilon) return;
    var ratio = nextScale / oldScale;
    applyCamera(
      cursorX - (cursorX - camera.panX) * ratio,
      cursorY - (cursorY - camera.panY) * ratio,
      nextScale
    );
    updateZoomLabel();
  }
  function zoomByStep(direction) {
    var size = viewportSize();
    zoomAt(size.width / 2, size.height / 2, direction < 0 ? 1 / payload.zoomStep : payload.zoomStep);
  }
  function wheelFactor(event) {
    var delta = event.deltaY;
    var lineMode = window.WheelEvent ? WheelEvent.DOM_DELTA_LINE : 1;
    var pageMode = window.WheelEvent ? WheelEvent.DOM_DELTA_PAGE : 2;
    if (event.deltaMode === lineMode) delta *= payload.wheelLine;
    else if (event.deltaMode === pageMode) delta *= viewportSize().height;
    if (event.ctrlKey) delta *= payload.wheelCtrl;
    if (delta === 0) return 1;
    if (event.deltaMode === lineMode && Math.abs(event.deltaY) <= payload.wheelLineLimit) {
      return event.deltaY < 0 ? payload.zoomStep : 1 / payload.zoomStep;
    }
    return Math.exp(-delta * payload.wheelSensitivity);
  }
  function onWheel(event) {
    if (!exploring) return;
    event.preventDefault();
    var rect = stage.getBoundingClientRect();
    zoomAt(event.clientX - rect.left, event.clientY - rect.top, wheelFactor(event));
  }
  function pointerList() {
    var list = [];
    for (var id in pointers) {
      if (Object.prototype.hasOwnProperty.call(pointers, id)) list.push(pointers[id]);
    }
    return list;
  }
  function endDrag() {
    drag = null;
    pointers = {};
    stage.classList.remove("is-panning");
  }
  function capturePointer(target, pointerId) {
    if (!target || !target.setPointerCapture) return;
    try { target.setPointerCapture(pointerId); } catch (error) { void error; }
  }
  function onStagePointerDown(event) {
    if (!exploring || event.button > 0) return;
    var target = event.target;
    if (target && target.closest && target.closest(".c2g-sticker, #c2g-bar")) return;
    if (eraserOn) {
      event.preventDefault();
      if (beginErase(event)) return;
    }
    if (penOn) {
      event.preventDefault();
      if (beginStroke(event)) return;
    }
    pointers[event.pointerId] = { id: event.pointerId, x: event.clientX, y: event.clientY };
    var list = pointerList();
    if (list.length >= 2) {
      var dist = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
      drag = { kind: "pinch", pointerId: null, distance: dist || 1 };
      stage.classList.remove("is-panning");
      return;
    }
    drag = {
      kind: "pan",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: camera.panX,
      panY: camera.panY
    };
    stage.classList.add("is-panning");
    capturePointer(stage, event.pointerId);
  }
  function onPointerMove(event) {
    if (pointers[event.pointerId]) {
      pointers[event.pointerId].x = event.clientX;
      pointers[event.pointerId].y = event.clientY;
    }
    if (!drag || (drag.pointerId && drag.pointerId !== event.pointerId && drag.kind !== "pinch")) return;
    if (drag.kind === "pan") {
      applyCamera(
        drag.panX + (event.clientX - drag.startX),
        drag.panY + (event.clientY - drag.startY),
        camera.scale
      );
      return;
    }
    if (drag.kind === "erase") {
      eraseSegment(drag.x, drag.y, event.clientX, event.clientY);
      drag.x = event.clientX;
      drag.y = event.clientY;
      return;
    }
    if (drag.kind === "draw" && drag.stroke) {
      var drawn = scenePoint(event.clientX, event.clientY);
      var pts = drag.stroke.points;
      var last = pts[pts.length - 1];
      if (!last || Math.hypot(drawn.x - last.x, drawn.y - last.y) < payload.penMinStep / (camera.scale || 1)) return;
      if (pts.length >= payload.penPointLimit) return;
      pts.push(drawn);
      syncStrokeNode(drag);
      return;
    }
    if (drag.kind === "move" && drag.note) {
      var movedX = (event.clientX - drag.startX) / camera.scale;
      var movedY = (event.clientY - drag.startY) / camera.scale;
      drag.note.style.left = (drag.left + movedX) + "px";
      drag.note.style.top = (drag.top + movedY) + "px";
      clampSticker(drag.note);
      return;
    }
    if (drag.kind === "resize" && drag.note) {
      var grownX = (event.clientX - drag.startX) / camera.scale;
      var grownY = (event.clientY - drag.startY) / camera.scale;
      var floor = screenUnit();
      drag.note.style.width = Math.max(payload.stickerMinWidth * floor, drag.width + grownX) + "px";
      drag.note.style.height = Math.max(payload.stickerMinHeight * floor, drag.height + grownY) + "px";
      syncStickerScale(drag.note);
      return;
    }
    if (drag.kind === "pinch") {
      var list = pointerList();
      if (list.length < 2 || !(drag.distance > 0)) return;
      var dist = Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
      var rect = stage.getBoundingClientRect();
      zoomAt(
        (list[0].x + list[1].x) / 2 - rect.left,
        (list[0].y + list[1].y) / 2 - rect.top,
        dist / drag.distance
      );
      drag.distance = dist;
    }
  }
  function onPointerUp(event) {
    if (pointers[event.pointerId]) delete pointers[event.pointerId];
    if (!drag) return;
    if (drag.kind === "pinch") {
      var list = pointerList();
      if (list.length >= 2) return;
      if (list.length === 1) {
        drag = {
          kind: "pan",
          pointerId: list[0].id,
          startX: list[0].x,
          startY: list[0].y,
          panX: camera.panX,
          panY: camera.panY
        };
        return;
      }
    } else if (drag.pointerId !== event.pointerId) {
      return;
    }
    endDrag();
  }
  function safeColor(value, fallback) {
    if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) return fallback;
    return value;
  }
  function finiteNumber(value, fallback) {
    var number = Number(value);
    return isFinite(number) ? number : fallback;
  }
  function clampPenWidth(value) {
    var width = Number(value);
    if (!isFinite(width)) width = payload.penWidth;
    return Math.min(payload.penWidthMax, Math.max(payload.penWidthMin, width));
  }
  function inkFor(fill) {
    var hex = String(fill || "").slice(1);
    var red = parseInt(hex.slice(0, 2), 16);
    var green = parseInt(hex.slice(2, 4), 16);
    var blue = parseInt(hex.slice(4, 6), 16);
    if (!isFinite(red) || !isFinite(green) || !isFinite(blue)) return payload.stickerInk;
    var luma = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    return luma >= payload.inkLuma ? payload.stickerInk : payload.inkLight;
  }
  function roundCoord(value) {
    return Math.round(value * 100) / 100;
  }
  function screenUnit() {
    var scale = camera.scale || 1;
    return scale > 0 ? 1 / scale : 1;
  }
  function stickerRatio(height) {
    var ratio = payload.stickerHeight > 0 ? height / payload.stickerHeight : 1;
    return ratio > 0 ? ratio : 1;
  }
  function fontScales() {
    var scales = payload.stickerFontScales;
    return scales && scales.length ? scales : [1];
  }
  function fontScaleIndex(scale) {
    var scales = fontScales();
    var best = 0;
    var i;
    for (i = 1; i < scales.length; i += 1) {
      if (Math.abs(scales[i] - scale) < Math.abs(scales[best] - scale)) best = i;
    }
    return best;
  }
  function stickerFontScale(note) {
    var raw = note ? Number(note.getAttribute("data-font-scale")) : 1;
    var scales = fontScales();
    if (!isFinite(raw) || !(raw > 0)) return scales[fontScaleIndex(1)];
    return scales[fontScaleIndex(raw)];
  }
  function applyFontScale(note, index) {
    var scales = fontScales();
    var next = index;
    if (next < 0) next = 0;
    if (next > scales.length - 1) next = scales.length - 1;
    note.setAttribute("data-font-scale", String(scales[next]));
    syncStickerScale(note);
    var down = note.querySelector(".c2g-sticker-font-down");
    var up = note.querySelector(".c2g-sticker-font-up");
    if (down) down.disabled = next <= 0;
    if (up) up.disabled = next >= scales.length - 1;
  }
  function syncStickerScale(note) {
    var ratio = stickerRatio(readBox(note).height);
    note.style.fontSize = (payload.stickerFontPx * ratio * stickerFontScale(note)) + "px";
    note.style.borderRadius = (payload.stickerRadius * ratio) + "px";
    note.style.borderWidth = ratio + "px";
    note.style.boxShadow = "0 " + (${HTML_STICKER_SHADOW_Y} * ratio) + "px " + (${HTML_STICKER_SHADOW_BLUR} * ratio) + "px color-mix(in srgb, ${HTML_STICKER_INK} ${HTML_STICKER_SHADOW_ALPHA}%, transparent)";
  }
  function scenePoint(clientX, clientY) {
    var rect = stage.getBoundingClientRect();
    var scale = camera.scale || 1;
    return {
      x: (clientX - rect.left - camera.panX) / scale,
      y: (clientY - rect.top - camera.panY) / scale
    };
  }
  function readBox(note) {
    return {
      left: parseFloat(note.style.left) || 0,
      top: parseFloat(note.style.top) || 0,
      width: parseFloat(note.style.width) || note.offsetWidth || payload.stickerWidth,
      height: parseFloat(note.style.height) || note.offsetHeight || payload.stickerHeight
    };
  }
  function clampSticker(note) {
    var box = readBox(note);
    var limitW = Math.max(payload.imageWidth, payload.layoutWidth);
    var limitH = Math.max(payload.imageHeight, payload.layoutHeight);
    var keepX = Math.min(box.width / 2, payload.stickerMinWidth);
    var keepY = Math.min(box.height / 2, payload.stickerMinHeight);
    var left = Math.min(limitW - keepX, Math.max(keepX - box.width, box.left));
    var top = Math.min(limitH - keepY, Math.max(keepY - box.height, box.top));
    note.style.left = left + "px";
    note.style.top = top + "px";
  }
  function beginStickerDrag(event, note, kind) {
    var box = readBox(note);
    drag = {
      kind: kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      note: note
    };
    capturePointer(event.currentTarget, event.pointerId);
  }
  function notePlain(node) {
    if (!node) return "";
    return (node.textContent || "").replace(/\\u00a0/g, " ");
  }
  function applyNoteColor(note, fill, ink) {
    var safeFill = safeColor(fill, payload.stickerFill);
    var safeInk = safeColor(ink, inkFor(safeFill));
    note.style.setProperty("--c2g-note", safeFill);
    note.style.setProperty("--c2g-note-ink", safeInk);
    note.setAttribute("data-fill", safeFill);
    note.setAttribute("data-ink", safeInk);
    var picker = note.querySelector(".c2g-sticker-picker");
    if (picker && picker.value !== safeFill) picker.value = safeFill;
  }
  function createSticker(spec, focusNow) {
    var note = document.createElement("article");
    var width = finiteNumber(spec.w, payload.stickerWidth);
    var height = finiteNumber(spec.h, payload.stickerHeight);
    if (!(width > 0)) width = payload.stickerWidth;
    if (!(height > 0)) height = payload.stickerHeight;
    note.className = "c2g-sticker";
    note.style.left = spec.x + "px";
    note.style.top = spec.y + "px";
    note.style.width = width + "px";
    note.style.height = height + "px";
    var chrome = document.createElement("div");
    chrome.className = "c2g-sticker-chrome";
    var colors = document.createElement("div");
    colors.className = "c2g-sticker-ui c2g-sticker-colors";
    var palette = payload.noteColors || [];
    var i;
    for (i = 0; i < palette.length; i += 1) {
      var entry = palette[i];
      if (!entry) continue;
      var fill = safeColor(entry.fill, "");
      var ink = safeColor(entry.ink, "");
      if (!fill || !ink) continue;
      var swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "c2g-sticker-swatch";
      swatch.style.background = fill;
      swatch.setAttribute("data-fill", fill);
      swatch.setAttribute("data-ink", ink);
      swatch.setAttribute("aria-label", payload.labels.stickerColor);
      swatch.setAttribute("title", payload.labels.stickerColor);
      swatch.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var target = event.currentTarget;
        applyNoteColor(note, target.getAttribute("data-fill"), target.getAttribute("data-ink"));
      });
      colors.appendChild(swatch);
    }
    var picker = document.createElement("input");
    picker.type = "color";
    picker.className = "c2g-sticker-picker";
    picker.setAttribute("aria-label", payload.labels.stickerColor);
    picker.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
    picker.addEventListener("input", function () {
      applyNoteColor(note, picker.value, inkFor(safeColor(picker.value, payload.stickerFill)));
    });
    colors.appendChild(picker);
    var mover = document.createElement("button");
    mover.type = "button";
    mover.className = "c2g-sticker-ui c2g-sticker-move";
    mover.setAttribute("aria-label", payload.labels.moveSticker);
    mover.setAttribute("title", payload.labels.moveSticker);
    mover.appendChild(gripIcon());
    var font = document.createElement("div");
    font.className = "c2g-sticker-ui c2g-sticker-font";
    var fontDown = document.createElement("button");
    fontDown.type = "button";
    fontDown.className = "c2g-sticker-font-down";
    fontDown.textContent = "\\u2212";
    fontDown.setAttribute("aria-label", payload.labels.stickerFontSmaller);
    fontDown.setAttribute("title", payload.labels.stickerFontSmaller);
    var fontMark = document.createElement("span");
    fontMark.className = "c2g-sticker-font-mark";
    fontMark.setAttribute("aria-hidden", "true");
    fontMark.textContent = "A";
    var fontUp = document.createElement("button");
    fontUp.type = "button";
    fontUp.className = "c2g-sticker-font-up";
    fontUp.textContent = "+";
    fontUp.setAttribute("aria-label", payload.labels.stickerFontLarger);
    fontUp.setAttribute("title", payload.labels.stickerFontLarger);
    font.appendChild(fontDown);
    font.appendChild(fontMark);
    font.appendChild(fontUp);
    var close = document.createElement("button");
    close.type = "button";
    close.className = "c2g-sticker-ui c2g-sticker-close";
    close.setAttribute("aria-label", payload.labels.removeSticker);
    close.setAttribute("title", payload.labels.removeSticker);
    close.textContent = "×";
    var text = document.createElement("div");
    text.className = "c2g-sticker-text";
    text.setAttribute("contenteditable", "true");
    text.tabIndex = 0;
    text.setAttribute("role", "textbox");
    text.setAttribute("aria-label", payload.labels.sticker);
    text.setAttribute("data-placeholder", payload.labels.sticker);
    if (spec.text) text.textContent = String(spec.text).slice(0, payload.noteTextLimit);
    var handle = document.createElement("button");
    handle.type = "button";
    handle.className = "c2g-sticker-ui c2g-sticker-resize";
    handle.setAttribute("aria-label", payload.labels.resizeSticker);
    handle.setAttribute("title", payload.labels.resizeSticker);
    handle.appendChild(resizeIcon());
    var toolbar = document.createElement("div");
    toolbar.className = "c2g-sticker-bar";
    toolbar.appendChild(mover);
    toolbar.appendChild(font);
    toolbar.appendChild(close);
    chrome.appendChild(colors);
    chrome.appendChild(toolbar);
    chrome.appendChild(handle);
    note.appendChild(text);
    note.appendChild(chrome);
    notes.appendChild(note);
    applyNoteColor(note, spec.fill, spec.ink);
    clampSticker(note);
    applyFontScale(note, fontScaleIndex(finiteNumber(spec.fontScale, 1)));
    fontDown.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
    fontUp.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
    fontDown.addEventListener("click", function (event) {
      event.stopPropagation();
      applyFontScale(note, fontScaleIndex(stickerFontScale(note)) - 1);
    });
    fontUp.addEventListener("click", function (event) {
      event.stopPropagation();
      applyFontScale(note, fontScaleIndex(stickerFontScale(note)) + 1);
    });
    mover.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      beginStickerDrag(event, note, "move");
    });
    handle.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      beginStickerDrag(event, note, "resize");
    });
    close.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
    close.addEventListener("click", function (event) {
      event.stopPropagation();
      note.remove();
    });
    note.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
    note.addEventListener("focusin", function () { note.classList.add("is-active"); });
    note.addEventListener("focusout", function (event) {
      var next = event.relatedTarget;
      if (next && note.contains(next)) return;
      note.classList.remove("is-active");
    });
    text.addEventListener("input", function () {
      var raw = text.textContent || "";
      if (raw.length > payload.noteTextLimit) text.textContent = raw.slice(0, payload.noteTextLimit);
    });
    if (focusNow) {
      note.classList.add("is-active");
      text.focus();
    }
    return note;
  }
  function addSticker() {
    if (!exploring) return;
    var rect = stage.getBoundingClientRect();
    var size = viewportSize();
    var unit = screenUnit();
    var width = payload.stickerWidth * unit;
    var height = payload.stickerHeight * unit;
    var nudge = (stickerSeq % 5) * payload.stickerNudge * unit;
    stickerSeq += 1;
    var point = scenePoint(rect.left + size.width / 2, rect.top + size.height / 2);
    createSticker({
      x: point.x - width / 2 + nudge,
      y: point.y - height / 2 + nudge,
      w: width,
      h: height,
      text: "",
      fill: payload.stickerFill,
      ink: payload.stickerInk
    }, true);
  }
  var svgNs = "http://www.w3.org/2000/svg";
  function gripIcon() {
    var svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 ${HTML_GRIP_VIEWBOX} ${HTML_GRIP_VIEWBOX}");
    svg.setAttribute("aria-hidden", "true");
    var row;
    var col;
    for (row = 0; row < ${HTML_GRIP_ROWS}; row += 1) {
      for (col = 0; col < ${HTML_GRIP_COLUMNS}; col += 1) {
        var dot = document.createElementNS(svgNs, "circle");
        dot.setAttribute("cx", String(${HTML_GRIP_ORIGIN_X} + col * ${HTML_GRIP_STEP_X}));
        dot.setAttribute("cy", String(${HTML_GRIP_ORIGIN_Y} + row * ${HTML_GRIP_STEP_Y}));
        dot.setAttribute("r", "${HTML_GRIP_DOT_RADIUS}");
        dot.setAttribute("fill", "currentColor");
        svg.appendChild(dot);
      }
    }
    return svg;
  }
  function resizeIcon() {
    var svg = document.createElementNS(svgNs, "svg");
    svg.setAttribute("viewBox", "0 0 ${HTML_STICKER_RESIZE_ICON} ${HTML_STICKER_RESIZE_ICON}");
    svg.setAttribute("aria-hidden", "true");
    var mark = document.createElementNS(svgNs, "path");
    mark.setAttribute("d", "${HTML_STICKER_RESIZE_PATH}");
    mark.setAttribute("fill", "none");
    mark.setAttribute("stroke", "currentColor");
    mark.setAttribute("stroke-width", "${HTML_STICKER_RESIZE_STROKE}");
    mark.setAttribute("stroke-linecap", "round");
    mark.setAttribute("stroke-linejoin", "round");
    svg.appendChild(mark);
    return svg;
  }
  function pointsAttr(points) {
    var parts = [];
    var i;
    for (i = 0; i < points.length; i += 1) {
      parts.push(roundCoord(points[i].x) + "," + roundCoord(points[i].y));
    }
    return parts.join(" ");
  }
  function renderStroke(stroke) {
    if (stroke.points.length < 2) {
      var dot = document.createElementNS(svgNs, "circle");
      var point = stroke.points[0] || { x: 0, y: 0 };
      dot.setAttribute("cx", String(roundCoord(point.x)));
      dot.setAttribute("cy", String(roundCoord(point.y)));
      dot.setAttribute("r", String(roundCoord(stroke.width / 2)));
      dot.setAttribute("fill", stroke.color);
      return dot;
    }
    var poly = document.createElementNS(svgNs, "polyline");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", stroke.color);
    poly.setAttribute("stroke-width", String(stroke.width));
    poly.setAttribute("stroke-linecap", "round");
    poly.setAttribute("stroke-linejoin", "round");
    poly.setAttribute("points", pointsAttr(stroke.points));
    return poly;
  }
  function syncStrokeNode(state) {
    var stroke = state.stroke;
    var node = stroke.node;
    if (stroke.points.length >= 2 && node && node.localName === "polyline") {
      node.setAttribute("points", pointsAttr(stroke.points));
      return;
    }
    var next = renderStroke(stroke);
    if (node && node.parentNode) node.parentNode.replaceChild(next, node);
    stroke.node = next;
    state.node = next;
  }
  function segmentDistance(point, start, end) {
    var dx = end.x - start.x;
    var dy = end.y - start.y;
    var lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    var t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
  }
  function pointHitsStroke(stroke, point, radius) {
    var reach = radius + stroke.width / 2;
    var points = stroke.points;
    var i;
    if (!points.length) return false;
    if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y) <= reach;
    for (i = 1; i < points.length; i += 1) {
      if (segmentDistance(point, points[i - 1], points[i]) <= reach) return true;
    }
    return false;
  }
  function eraseScenePoint(point) {
    var radius = payload.eraserRadius / (camera.scale || 1);
    var kept = [];
    var i;
    for (i = 0; i < strokes.length; i += 1) {
      var stroke = strokes[i];
      if (pointHitsStroke(stroke, point, radius)) {
        if (stroke.node && stroke.node.parentNode) stroke.node.parentNode.removeChild(stroke.node);
      } else {
        kept.push(stroke);
      }
    }
    strokes = kept;
  }
  function eraseSegment(fromX, fromY, toX, toY) {
    var from = scenePoint(fromX, fromY);
    var to = scenePoint(toX, toY);
    var span = Math.hypot(to.x - from.x, to.y - from.y);
    var step = Math.max(payload.eraserRadius / (camera.scale || 1), 1);
    var count = Math.ceil(span / step);
    var i;
    for (i = 0; i <= count; i += 1) {
      var t = count === 0 ? 1 : i / count;
      eraseScenePoint({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t
      });
    }
  }
  function beginErase(event) {
    drag = { kind: "erase", pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    capturePointer(stage, event.pointerId);
    eraseSegment(event.clientX, event.clientY, event.clientX, event.clientY);
    return true;
  }
  function normalizeStroke(raw) {
    if (!raw || !raw.points || !raw.points.length) return null;
    var color = safeColor(raw.color, penColor);
    var width = clampPenWidth(raw.width);
    var points = [];
    var i;
    for (i = 0; i < raw.points.length && points.length < payload.penPointLimit; i += 1) {
      var point = raw.points[i];
      if (!point) continue;
      var x = finiteNumber(point.x !== undefined ? point.x : point[0], NaN);
      var y = finiteNumber(point.y !== undefined ? point.y : point[1], NaN);
      if (!isFinite(x) || !isFinite(y)) continue;
      points.push({ x: x, y: y });
    }
    if (!points.length) return null;
    return { color: color, width: width, points: points };
  }
  function beginStroke(event) {
    if (!ink || strokes.length >= payload.penStrokeLimit) return false;
    var point = scenePoint(event.clientX, event.clientY);
    var stroke = { color: penColor, width: penWidth * screenUnit(), points: [point], node: null };
    strokes.push(stroke);
    stroke.node = renderStroke(stroke);
    ink.appendChild(stroke.node);
    drag = { kind: "draw", pointerId: event.pointerId, stroke: stroke, node: stroke.node };
    capturePointer(stage, event.pointerId);
    return true;
  }
  function selectPenColor(color) {
    penColor = safeColor(color, penColor);
    if (penCustom && penCustom.value !== penColor) penCustom.value = penColor;
    if (!penColors) return;
    var swatches = penColors.querySelectorAll(".c2g-swatch");
    var i;
    for (i = 0; i < swatches.length; i += 1) {
      swatches[i].setAttribute("aria-pressed", swatches[i].getAttribute("data-color") === penColor ? "true" : "false");
    }
  }
  function buildPenColors() {
    if (!penColors || !payload.penColors) return;
    var i;
    for (i = 0; i < payload.penColors.length; i += 1) {
      var color = safeColor(payload.penColors[i], "");
      if (!color) continue;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "c2g-swatch";
      button.style.background = color;
      button.setAttribute("data-color", color);
      button.setAttribute("aria-label", payload.labels.penColor);
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        selectPenColor(event.currentTarget.getAttribute("data-color"));
      });
      penColors.appendChild(button);
    }
    selectPenColor(penColor);
  }
  function roundedRect(ctx, x, y, width, height, radius) {
    var r = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
  function wrapLines(ctx, text, maxWidth) {
    var paragraphs = String(text || "").split("\\n");
    var lines = [];
    var p;
    for (p = 0; p < paragraphs.length; p += 1) {
      var words = paragraphs[p].split(/\\s+/);
      var line = "";
      var i;
      for (i = 0; i < words.length; i += 1) {
        var word = words[i];
        if (!word) continue;
        var next = line ? line + " " + word : word;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      var settled = false;
      function ok() {
        if (settled) return;
        settled = true;
        resolve(image);
      }
      function fail() {
        if (settled) return;
        settled = true;
        reject(new Error("image"));
      }
      image.onload = ok;
      image.onerror = fail;
      image.src = src;
      if (image.complete && image.naturalWidth > 0) ok();
    });
  }
  function loadSvg(node, width, height) {
    var clone = node.cloneNode(true);
    if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    var xml = new XMLSerializer().serializeToString(clone);
    // data: stays readable. blob: taints the canvas when the diagram has a foreignObject.
    return loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml));
  }
  function settledImage(task) {
    return task.then(function (image) { return image; }, function () { return null; });
  }
  function paintChecker(ctx, width, height) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#e4e4e4";
    var cell = payload.checkerCell;
    var x;
    var y;
    for (y = 0; y < height; y += cell) {
      for (x = 0; x < width; x += cell) {
        if (((x / cell) + (y / cell)) % 2 === 0) ctx.fillRect(x, y, cell, cell);
      }
    }
  }
  function drawStrokes(ctx) {
    var i;
    for (i = 0; i < strokes.length; i += 1) {
      var stroke = strokes[i];
      if (!stroke.points.length) continue;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      if (stroke.points.length < 2) {
        var radius = stroke.width / 2;
        ctx.moveTo(stroke.points[0].x + radius, stroke.points[0].y);
        ctx.arc(stroke.points[0].x, stroke.points[0].y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        var n;
        for (n = 1; n < stroke.points.length; n += 1) ctx.lineTo(stroke.points[n].x, stroke.points[n].y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawStickers(ctx) {
    var items = notes.querySelectorAll(".c2g-sticker");
    var i;
    for (i = 0; i < items.length; i += 1) {
      var note = items[i];
      var box = readBox(note);
      var textNode = note.querySelector(".c2g-sticker-text");
      var text = notePlain(textNode).trim();
      var ratio = stickerRatio(box.height);
      ctx.save();
      roundedRect(ctx, box.left, box.top, box.width, box.height, payload.stickerRadius * ratio);
      ctx.fillStyle = note.getAttribute("data-fill") || payload.stickerFill;
      ctx.fill();
      ctx.strokeStyle = note.getAttribute("data-ink") || payload.stickerStroke;
      ctx.lineWidth = ratio;
      ctx.stroke();
      if (text) {
        ctx.fillStyle = note.getAttribute("data-ink") || payload.stickerInk;
        var fontPx = payload.stickerFontPx * ratio * stickerFontScale(note);
        ctx.font = fontPx + "px sans-serif";
        var pad = payload.stickerPad * ratio;
        var maxWidth = Math.max(fontPx, box.width - pad * 2);
        var lines = wrapLines(ctx, text, maxWidth);
        var lineHeight = fontPx * 1.25;
        var n;
        for (n = 0; n < lines.length; n += 1) {
          var lineY = box.top + pad + fontPx + n * lineHeight;
          if (lineY > box.top + box.height) break;
          ctx.fillText(lines[n], box.left + pad, lineY);
        }
      }
      ctx.restore();
    }
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, payload.downloadRevokeMs);
  }
  function pngFromDataUrl(canvas) {
    try {
      var data = canvas.toDataURL("image/png");
      var comma = data.indexOf(",");
      var binary = atob(comma >= 0 ? data.slice(comma + 1) : "");
      var bytes = new Uint8Array(binary.length);
      var i;
      for (i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: "image/png" });
    } catch (error) {
      void error;
      return null;
    }
  }
  function canvasPng(canvas) {
    return new Promise(function (resolve) {
      var done = false;
      function finish(blob) {
        if (done) return;
        done = true;
        resolve(blob || null);
      }
      try {
        if (typeof canvas.toBlob === "function") {
          canvas.toBlob(function (blob) {
            if (blob) { finish(blob); return; }
            finish(pngFromDataUrl(canvas));
          }, "image/png");
          return;
        }
      } catch (error) {
        void error;
      }
      finish(pngFromDataUrl(canvas));
    });
  }
  function safeJson(value) {
    return JSON.stringify(value).replace(/[<>&]/g, function (char) {
      var hex = char.charCodeAt(0).toString(16);
      while (hex.length < 4) hex = "0" + hex;
      return "\\\\u" + hex;
    });
  }
  function collectAnnotations() {
    var items = notes.querySelectorAll(".c2g-sticker");
    var stickers = [];
    var i;
    for (i = 0; i < items.length; i += 1) {
      var note = items[i];
      var box = readBox(note);
      var textNode = note.querySelector(".c2g-sticker-text");
      stickers.push({
        x: roundCoord(box.left),
        y: roundCoord(box.top),
        w: roundCoord(box.width),
        h: roundCoord(box.height),
        text: notePlain(textNode).slice(0, payload.noteTextLimit),
        fontScale: roundCoord(stickerFontScale(note)),
        fill: note.getAttribute("data-fill") || payload.stickerFill,
        ink: note.getAttribute("data-ink") || payload.stickerInk
      });
    }
    var drawn = [];
    for (i = 0; i < strokes.length; i += 1) {
      var stroke = strokes[i];
      var points = [];
      var n;
      for (n = 0; n < stroke.points.length; n += 1) {
        points.push([roundCoord(stroke.points[n].x), roundCoord(stroke.points[n].y)]);
      }
      drawn.push({ color: stroke.color, width: stroke.width, points: points });
    }
    return { hidden: marksHidden, stickers: stickers, strokes: drawn };
  }
  function saveCopy() {
    var next = {};
    var key;
    for (key in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) next[key] = payload[key];
    }
    next.annotations = collectAnnotations();
    var clone = document.documentElement.cloneNode(true);
    var data = clone.querySelector("#c2g-data");
    if (data) data.textContent = safeJson(next);
    var cloneNotes = clone.querySelector("#c2g-notes");
    if (cloneNotes) cloneNotes.textContent = "";
    var cloneInk = clone.querySelector("#c2g-ink");
    if (cloneInk) cloneInk.textContent = "";
    var cloneKeys = clone.querySelector("#c2g-keys");
    if (cloneKeys) cloneKeys.hidden = true;
    downloadBlob(new Blob(["<!DOCTYPE html>\\n" + clone.outerHTML], { type: "text/html;charset=utf-8" }), payload.copyName);
  }
  function restoreAnnotations(saved) {
    if (!saved) return;
    marksHidden = Boolean(saved.hidden);
    var list = saved.stickers || [];
    var i;
    for (i = 0; i < list.length; i += 1) {
      var item = list[i];
      if (!item) continue;
      createSticker({
        x: finiteNumber(item.x, 0),
        y: finiteNumber(item.y, 0),
        w: finiteNumber(item.w, payload.stickerWidth),
        h: finiteNumber(item.h, payload.stickerHeight),
        text: typeof item.text === "string" ? item.text : "",
        fontScale: finiteNumber(item.fontScale, 1),
        fill: item.fill,
        ink: item.ink
      }, false);
    }
    var drawn = saved.strokes || [];
    for (i = 0; i < drawn.length && strokes.length < payload.penStrokeLimit; i += 1) {
      var stroke = normalizeStroke(drawn[i]);
      if (!stroke) continue;
      stroke.node = renderStroke(stroke);
      strokes.push(stroke);
      ink.appendChild(stroke.node);
    }
  }
  function finishSave() {
    saving = false;
    updateChrome();
  }
  function savePng() {
    if (!exploring || saving) return;
    saving = true;
    try {
      updateChrome();
      var size = viewportSize();
      var ratio = Math.min(payload.maxPixelRatio, window.devicePixelRatio || 1);
      if (!isFinite(ratio) || ratio <= 0) ratio = 1;
      var canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(size.width * ratio));
      canvas.height = Math.max(1, Math.round(size.height * ratio));
      var ctx = canvas.getContext("2d");
      var jobs = [];
      var diagramImage = null;
      var overlayImage = null;
      var frameImage = null;
      var shadowSvg = diagramWrap.shadowRoot && diagramWrap.shadowRoot.querySelector("svg");
      var overlaySvg = document.getElementById("c2g-overlays");
      var pictureWidth = payload.layoutWidth > 0 ? payload.layoutWidth : payload.imageWidth;
      var pictureHeight = payload.layoutHeight > 0 ? payload.layoutHeight : payload.imageHeight;
      if (shadowSvg) {
        jobs.push(settledImage(loadSvg(shadowSvg, pictureWidth, pictureHeight)).then(function (image) {
          diagramImage = image;
        }));
      }
      if (overlaySvg) {
        jobs.push(settledImage(loadSvg(overlaySvg, payload.imageWidth, payload.imageHeight)).then(function (image) {
          overlayImage = image;
        }));
      }
      if (frame && frameWrap && !frameWrap.hidden && frame.getAttribute("src")) {
        jobs.push(settledImage(loadImage(frame.getAttribute("src"))).then(function (image) {
          frameImage = image;
        }));
      }
      Promise.all(jobs).then(function () {
        if (!ctx) return null;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.beginPath();
        ctx.rect(0, 0, size.width, size.height);
        ctx.clip();
        if (document.body.classList.contains("c2g-checker")) paintChecker(ctx, size.width, size.height);
        else {
          ctx.fillStyle = payload.background;
          ctx.fillRect(0, 0, size.width, size.height);
        }
        ctx.save();
        ctx.translate(camera.panX, camera.panY);
        ctx.scale(camera.scale, camera.scale);
        if (frameImage) ctx.drawImage(frameImage, 0, 0, pictureWidth, pictureHeight);
        if (diagramImage) ctx.drawImage(diagramImage, 0, 0, pictureWidth, pictureHeight);
        if (overlayImage) ctx.drawImage(overlayImage, 0, 0, payload.imageWidth, payload.imageHeight);
        if (!marksHidden) {
          drawStrokes(ctx);
          drawStickers(ctx);
        }
        ctx.restore();
        return canvasPng(canvas);
      }).then(function (blob) {
        if (blob) downloadBlob(blob, payload.pngName);
      }).catch(function () {
        return null;
      }).then(finishSave);
    } catch (error) {
      void error;
      finishSave();
    }
  }
  function showOwner(kind, id, effects, elapsed, animate) {
    for (var i = 0; i < overlays.length; i += 1) {
      var node = overlays[i];
      var visible = node.getAttribute("data-owner-kind") === kind && node.getAttribute("data-owner-id") === id;
      node.style.display = visible ? "" : "none";
      if (!visible) continue;
      var visual = animate
        ? effectVisual(effects, elapsed, "overlay", node.getAttribute("data-overlay-id") || "")
        : identity;
      applyOverlayVisual(node, visual);
    }
  }
  function paint() {
    var animate = !exploring && (playing || moving);
    if (exploring) applyCamera(camera.panX, camera.panY, camera.scale);
    if (phase === "travel" && count > 1) {
      var from = payload.viewpoints[travelOrigin];
      var to = payload.viewpoints[(travelOrigin + 1) % count];
      var transition = transitionAt(travelOrigin);
      var eased = ease(travelAmount);
      var point = sample({ x: from.x, y: from.y }, { x: to.x, y: to.y }, transition, eased);
      if (!exploring) place(point.x, point.y, lerpScale(from.scale, to.scale, eased));
      applyVisual(frameWrap, identity);
      applyVisual(diagramWrap, identity);
      showOwner("transition", transition.id, from.effects, effectElapsed, animate);
      return;
    }
    var current = payload.viewpoints[index];
    if (!exploring) place(current.x, current.y, current.scale);
    applyVisual(frameWrap, animate ? effectVisual(current.effects, effectElapsed, "frame", "") : identity);
    applyVisual(diagramWrap, animate ? effectVisual(current.effects, effectElapsed, "diagram", "") : identity);
    showOwner("viewpoint", current.id, current.effects, effectElapsed, animate);
  }
  function integrate(now) {
    var elapsed = Math.max(0, now - phaseStarted);
    effectElapsed = elapsed;
    if (phase === "travel" && count > 1) {
      var transition = transitionAt(travelOrigin);
      var duration = transition.durationMs > 0 ? transition.durationMs : payload.defaultTransitionMs;
      var raw = Math.min(1, elapsed / duration);
      if (raw < 1) {
        travelAmount = reverse ? 1 - raw : raw;
        return;
      }
      index = reverse ? travelOrigin : (travelOrigin + 1) % count;
      phase = "dwell";
      reverse = false;
      phaseStarted = now;
      effectElapsed = 0;
      if (!playing) moving = false;
      return;
    }
    if (!playing || phase !== "dwell") return;
    var current = payload.viewpoints[index];
    if (elapsed < current.dwellMs) return;
    if (count < 2 || (index >= count - 1 && !(repeatBox && repeatBox.checked))) {
      playing = false;
      moving = false;
      return;
    }
    if (reduceMotion) {
      index = (index + 1) % count;
      phaseStarted = now;
      effectElapsed = 0;
      return;
    }
    phase = "travel";
    reverse = false;
    travelOrigin = index;
    travelAmount = 0;
    phaseStarted = now;
    effectElapsed = 0;
    moving = true;
  }
  function syncBar() {
    if (!bar) return;
    if (!playing) {
      barHeld = false;
      bar.classList.remove("is-dim", "is-held", "is-revealed");
      if (revealTimer) {
        clearTimeout(revealTimer);
        revealTimer = 0;
      }
      return;
    }
    bar.classList.add("is-dim");
    bar.classList.toggle("is-held", barHeld);
  }
  function revealBar() {
    if (!bar || !playing) return;
    bar.classList.add("is-revealed");
    if (revealTimer) clearTimeout(revealTimer);
    revealTimer = setTimeout(function () {
      revealTimer = 0;
      if (bar) bar.classList.remove("is-revealed");
    }, payload.revealMs);
  }
  function updateChrome() {
    indexNode.textContent = (index + 1) + " / " + count;
    stage.dataset.phase = phase;
    stage.dataset.index = String(index);
    playButton.setAttribute("aria-label", playing ? payload.labels.pause : payload.labels.play);
    playButton.setAttribute("aria-pressed", playing ? "true" : "false");
    playButton.dataset.state = playing ? "pause" : "play";
    prevButton.disabled = count < 2;
    nextButton.disabled = count < 2;
    stage.classList.toggle("is-exploring", exploring);
    stage.dataset.mode = exploring ? "explore" : "playback";
    transport.hidden = exploring;
    zoomPanel.hidden = !exploring;
    if (repeatWrap) repeatWrap.hidden = exploring;
    stage.classList.toggle("is-drawing", exploring && penOn);
    stage.classList.toggle("is-erasing", exploring && eraserOn);
    if (penTools) penTools.hidden = !(exploring && penOn);
    penButton.setAttribute("aria-pressed", penOn ? "true" : "false");
    eraserButton.setAttribute("aria-pressed", eraserOn ? "true" : "false");
    stage.classList.toggle("is-marks-hidden", marksHidden);
    marksButton.setAttribute("aria-pressed", marksHidden ? "true" : "false");
    marksButton.setAttribute("aria-label", marksHidden ? payload.labels.showMarks : payload.labels.hideMarks);
    marksButton.dataset.state = marksHidden ? "hidden" : "shown";
    modeButton.setAttribute("aria-pressed", exploring ? "true" : "false");
    modeButton.setAttribute("aria-label", exploring ? payload.labels.playback : payload.labels.explore);
    modeButton.dataset.state = exploring ? "playback" : "explore";
    cameraButton.disabled = saving;
    updateZoomLabel();
    syncBar();
  }
  function toggleExplore() {
    playing = false;
    moving = false;
    barHeld = false;
    endDrag();
    exploring = !exploring;
    if (!exploring) {
      penOn = false;
      eraserOn = false;
    }
    kick();
  }
  function resetView() {
    if (!exploring) return;
    exploring = false;
    paint();
    exploring = true;
    updateChrome();
  }
  function render(now) {
    if (!exploring && (playing || moving)) integrate(now);
    paint();
    updateChrome();
  }
  function stopLoop() {
    if (!frameId) return;
    cancelFrame(frameId);
    frameId = 0;
  }
  function tick(now) {
    render(now);
    if (playing || (moving && phase === "travel")) {
      frameId = requestFrame(tick);
    } else {
      frameId = 0;
      moving = false;
    }
  }
  function kick() {
    render(nowMs());
    stopLoop();
    if (playing || (moving && phase === "travel")) {
      frameId = requestFrame(tick);
    }
  }
  function togglePlay() {
    if (playing) {
      playing = false;
      moving = false;
      barHeld = false;
      kick();
      return;
    }
    playing = true;
    barHeld = true;
    if (bar) bar.classList.remove("is-revealed");
    if (phase === "travel") {
      var transition = transitionAt(travelOrigin);
      var duration = transition.durationMs > 0 ? transition.durationMs : payload.defaultTransitionMs;
      var raw = reverse ? 1 - travelAmount : travelAmount;
      phaseStarted = nowMs() - raw * duration;
    } else {
      phaseStarted = nowMs();
    }
    kick();
  }
  function step(direction) {
    if (count < 2) {
      index = 0;
      phase = "dwell";
      kick();
      return;
    }
    if (reduceMotion) {
      index = direction < 0 ? (index - 1 + count) % count : (index + 1) % count;
      phase = "dwell";
      reverse = false;
      moving = false;
      phaseStarted = nowMs();
      effectElapsed = 0;
      kick();
      return;
    }
    reverse = direction < 0;
    travelOrigin = reverse ? (index - 1 + count) % count : index;
    phase = "travel";
    travelAmount = reverse ? 1 : 0;
    moving = true;
    phaseStarted = nowMs();
    effectElapsed = 0;
    kick();
  }
  function goFirst() {
    playing = false;
    moving = false;
    index = 0;
    phase = "dwell";
    reverse = false;
    effectElapsed = 0;
    phaseStarted = nowMs();
    kick();
  }
  function goLast() {
    playing = false;
    moving = false;
    index = count - 1;
    phase = "dwell";
    reverse = false;
    effectElapsed = 0;
    phaseStarted = nowMs();
    kick();
  }
  function setKeys(open) {
    keysOpen = open;
    keysPanel.hidden = !open;
    keysButton.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) keysClose.focus();
    else keysButton.focus();
  }
  function visibleControl(node) {
    if (!node || node.disabled) return false;
    var current = node;
    while (current && current !== document.body) {
      if (current.hidden) return false;
      var style = window.getComputedStyle(current);
      if (style.display === "none" || style.visibility === "hidden") return false;
      current = current.parentElement;
    }
    return true;
  }
  function tabbables() {
    var selector = keysOpen
      ? "#c2g-keys button, #c2g-keys input, #c2g-keys a"
      : "#c2g-bar button, #c2g-bar input, .c2g-sticker-text, .c2g-sticker.is-active button, .c2g-sticker.is-active input";
    var nodes = document.querySelectorAll(selector);
    var list = [];
    var i;
    for (i = 0; i < nodes.length; i += 1) {
      if (visibleControl(nodes[i])) list.push(nodes[i]);
    }
    return list;
  }
  function moveFocus(direction) {
    var list = tabbables();
    if (!list.length) return;
    var index = list.indexOf(document.activeElement);
    var next = index < 0
      ? (direction < 0 ? list[list.length - 1] : list[0])
      : list[(index + direction + list.length) % list.length];
    if (next && next.focus) next.focus();
  }
  function nudgePenWidth(direction) {
    penWidth = clampPenWidth(penWidth + direction);
    var shown = String(penWidth);
    if (penWidthInput) penWidthInput.value = shown;
    if (penWidthValue) penWidthValue.textContent = shown;
  }
  function focusedSticker() {
    var active = document.activeElement;
    if (!active || !active.closest) return null;
    return active.closest(".c2g-sticker");
  }

  document.getElementById("c2g-first").addEventListener("click", goFirst);
  prevButton.addEventListener("click", function () { step(-1); });
  nextButton.addEventListener("click", function () { step(1); });
  playButton.addEventListener("click", togglePlay);
  modeButton.addEventListener("click", toggleExplore);
  zoomInButton.addEventListener("click", function () { zoomByStep(1); });
  zoomOutButton.addEventListener("click", function () { zoomByStep(-1); });
  zoomResetButton.addEventListener("click", resetView);
  cameraButton.addEventListener("click", savePng);
  stickerButton.addEventListener("click", addSticker);
  function setPen(on) {
    penOn = on;
    if (on) eraserOn = false;
    endDrag();
    updateChrome();
  }
  function setEraser(on) {
    eraserOn = on;
    if (on) penOn = false;
    endDrag();
    updateChrome();
  }
  penButton.addEventListener("click", function () {
    if (!exploring) return;
    setPen(!penOn);
  });
  eraserButton.addEventListener("click", function () {
    if (!exploring) return;
    if (eraserOn) {
      toggleExplore();
      return;
    }
    setEraser(true);
  });
  saveCopyButton.addEventListener("click", saveCopy);
  marksButton.addEventListener("click", function () {
    marksHidden = !marksHidden;
    updateChrome();
  });
  keysButton.addEventListener("click", function () { setKeys(!keysOpen); });
  keysClose.addEventListener("click", function () { setKeys(false); });
  if (penWidthInput) {
    penWidthInput.addEventListener("input", function () {
      penWidth = clampPenWidth(penWidthInput.value);
      if (penWidthValue) penWidthValue.textContent = String(penWidth);
    });
  }
  if (penCustom) {
    penCustom.addEventListener("input", function () { selectPenColor(penCustom.value); });
  }
  stage.addEventListener("pointerdown", onStagePointerDown);
  stage.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  if (bar) {
    bar.addEventListener("pointerleave", function () {
      barHeld = false;
      syncBar();
    });
  }
  window.addEventListener("pointerdown", function (event) {
    if (keysOpen && !keysPanel.contains(event.target) && !keysButton.contains(event.target)) setKeys(false);
    if (!playing || !event.pointerType || event.pointerType === "mouse") return;
    revealBar();
  });
  function typingTarget(event) {
    var target = event.target;
    if (!target) return false;
    if (target.closest && target.closest(".c2g-sticker-text")) return true;
    if (target.isContentEditable) return true;
    var tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA";
  }
  window.addEventListener("keydown", function (event) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (keysOpen) {
        setKeys(false);
        return;
      }
      var sticker = focusedSticker();
      if (sticker) {
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        sticker.classList.remove("is-active");
        return;
      }
      if (exploring && (penOn || eraserOn)) {
        penOn = false;
        eraserOn = false;
        endDrag();
        updateChrome();
        return;
      }
      if (exploring) {
        toggleExplore();
        return;
      }
      if (playing) togglePlay();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      moveFocus(event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === "F1" || event.code === "F1") {
      event.preventDefault();
      setKeys(!keysOpen);
      return;
    }
    if (event.key === "?" && !typingTarget(event)) {
      event.preventDefault();
      setKeys(!keysOpen);
      return;
    }
    if (keysOpen || typingTarget(event)) return;
    var tag = event.target && event.target.tagName;
    var onButton = tag === "BUTTON";
    if (onButton && (event.key === "Enter" || event.key === " " || event.key === "Spacebar")) return;
    if (event.code === "KeyM") {
      event.preventDefault();
      toggleExplore();
      return;
    }
    if (event.code === "KeyH") {
      event.preventDefault();
      marksHidden = !marksHidden;
      updateChrome();
      return;
    }
    if (event.code === "KeyS") {
      event.preventDefault();
      saveCopy();
      return;
    }
    if (exploring) {
      var distance = event.shiftKey ? payload.panKeyStep * 2 : payload.panKeyStep;
      if (event.key === "ArrowRight") { event.preventDefault(); applyCamera(camera.panX + distance, camera.panY, camera.scale); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); applyCamera(camera.panX - distance, camera.panY, camera.scale); }
      else if (event.key === "ArrowUp") { event.preventDefault(); applyCamera(camera.panX, camera.panY - distance, camera.scale); }
      else if (event.key === "ArrowDown") { event.preventDefault(); applyCamera(camera.panX, camera.panY + distance, camera.scale); }
      else if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomByStep(1); }
      else if (event.key === "-" || event.key === "_") { event.preventDefault(); zoomByStep(-1); }
      else if (event.key === "0") { event.preventDefault(); resetView(); }
      else if (event.key === "Enter") { event.preventDefault(); addSticker(); }
      else if (event.code === "KeyP") {
        event.preventDefault();
        setPen(!penOn);
      }
      else if (event.code === "KeyE") {
        event.preventDefault();
        setEraser(!eraserOn);
      }
      else if (event.code === "KeyC") { event.preventDefault(); savePng(); }
      else if (event.code === "BracketLeft") { event.preventDefault(); nudgePenWidth(-1); }
      else if (event.code === "BracketRight") { event.preventDefault(); nudgePenWidth(1); }
      return;
    }
    var rtl = document.documentElement.getAttribute("dir") === "rtl";
    var nextKey = rtl ? "ArrowLeft" : "ArrowRight";
    var prevKey = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === nextKey || event.key === "ArrowDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === prevKey || event.key === "ArrowUp") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goFirst();
    } else if (event.key === "End") {
      event.preventDefault();
      goLast();
    } else if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      togglePlay();
    }
  });
  window.addEventListener("resize", function () { render(nowMs()); });
  buildPenColors();
  if (penWidthValue) penWidthValue.textContent = String(penWidth);
  restoreAnnotations(payload.annotations);
  phaseStarted = nowMs();
  kick();
})();
`.trim();

function icon(path: string, className = ""): string {
  const classAttr = className ? ` class="${className}"` : "";
  return `<svg${classAttr} viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const GLYPH_STROKE = `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;

function glyph(body: string, className = ""): string {
  const classAttr = className ? ` class="${className}"` : "";
  return `<svg${classAttr} viewBox="0 0 24 24" aria-hidden="true" ${GLYPH_STROKE}>${body}</svg>`;
}

function playerChrome(title: string, labels: PresentationHtmlLabels, stepCount: number): string {
  const safeTitle = htmlEscape(title);
  return `<nav id="c2g-bar" aria-label="${safeTitle}">
    <strong class="c2g-name" title="${safeTitle}">${safeTitle}</strong>
    <button id="c2g-mode" type="button" data-state="explore" aria-pressed="false" aria-label="${htmlEscape(labels.explore)}">
      ${glyph(`<path d="M5 9 2 12l3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/>`, "c2g-icon-explore")}
      ${glyph(`<path d="M8 5.5v13l11-6.5L8 5.5z" fill="currentColor" stroke="none"/>`, "c2g-icon-playback")}
    </button>
    <div id="c2g-transport" class="c2g-transport">
      <button id="c2g-first" type="button" aria-label="${htmlEscape(labels.first)}">${icon("M6 6v12M18 6 11 12l7 6")}</button>
      <button id="c2g-prev" type="button" aria-label="${htmlEscape(labels.prev)}">${icon("M14.5 6.5 8.5 12l6 5.5")}</button>
      <span id="c2g-index" aria-live="polite">1 / ${stepCount}</span>
      <button id="c2g-next" type="button" aria-label="${htmlEscape(labels.next)}">${icon("M9.5 6.5 15.5 12l-6 5.5")}</button>
      <button id="c2g-play" type="button" data-state="play" aria-pressed="false" aria-label="${htmlEscape(labels.play)}">
        <svg class="c2g-icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5L8 5.5z" fill="currentColor"/></svg>
        <svg class="c2g-icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>
      </button>
    </div>
    <div id="c2g-zoom" class="c2g-transport" hidden>
      <button id="c2g-zoom-out" type="button" aria-label="${htmlEscape(labels.zoomOut)}">${glyph(`<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/>`)}</button>
      <span id="c2g-zoom-level" aria-live="polite">100%</span>
      <button id="c2g-zoom-in" type="button" aria-label="${htmlEscape(labels.zoomIn)}">${glyph(`<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>`)}</button>
      <button id="c2g-zoom-reset" type="button" aria-label="${htmlEscape(labels.resetView)}">${glyph(`<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>`)}</button>
      <button id="c2g-camera" type="button" aria-label="${htmlEscape(labels.savePng)}">${glyph(`<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>`)}</button>
      <button id="c2g-sticker" type="button" aria-label="${htmlEscape(labels.addSticker)}">${glyph(`<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M15 3v6h6"/>`)}</button>
      <button id="c2g-pen" type="button" aria-pressed="false" aria-label="${htmlEscape(labels.pen)}">
        ${glyph(`<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>`, "c2g-icon-pen")}
        ${glyph(`<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>`, "c2g-icon-pencil")}
      </button>
      <button id="c2g-eraser" type="button" aria-pressed="false" aria-label="${htmlEscape(labels.eraser)}">${glyph(`<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>`)}</button>
      <div id="c2g-pen-tools" class="c2g-pen-tools" hidden>
        <input id="c2g-pen-width" type="range" min="${HTML_PEN_WIDTH_MIN}" max="${HTML_PEN_WIDTH_MAX}" value="${HTML_PEN_WIDTH_DEFAULT}" aria-label="${htmlEscape(labels.penWidth)}">
        <span id="c2g-pen-width-value">${HTML_PEN_WIDTH_DEFAULT}</span>
        <div id="c2g-pen-colors"></div>
        <input id="c2g-pen-custom" type="color" value="${HTML_PEN_COLOR}" aria-label="${htmlEscape(labels.penColor)}">
      </div>
    </div>
    <button id="c2g-help" type="button" aria-expanded="false" aria-controls="c2g-keys" aria-label="${htmlEscape(labels.keys)}">${glyph(`<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.2 2.4c-.8.3-1.2 1-1.2 1.8"/><path d="M12 17h.01"/>`)}</button>
    <button id="c2g-save-copy" type="button" aria-label="${htmlEscape(labels.saveCopy)}">${glyph(`<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>`)}</button>
    <button id="c2g-marks" type="button" data-state="shown" aria-pressed="false" aria-label="${htmlEscape(labels.hideMarks)}">
      ${glyph(`<path d="M3 3 21 21"/><path d="M10.6 6.1A11 11 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-3.2 4.2"/><path d="M6.7 6.7C4 8.4 2 12 2 12s3.5 6 10 6c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>`, "c2g-icon-hide")}
      ${glyph(`<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>`, "c2g-icon-show")}
    </button>
    <label id="c2g-repeat-wrap" class="c2g-repeat"><input id="c2g-repeat" type="checkbox"> ${htmlEscape(labels.repeat)}</label>
  </nav>
  <div id="c2g-keys" role="dialog" aria-modal="true" aria-labelledby="c2g-keys-title" hidden>
    <div class="c2g-keys-head">
      <h2 id="c2g-keys-title">${htmlEscape(labels.keys)}</h2>
      <button id="c2g-keys-close" type="button" aria-label="${htmlEscape(labels.keysClose)}">×</button>
    </div>
    ${keysHelpMarkup(labels.keysHelp)}
  </div>`;
}

function keysHelpMarkup(value: string): string {
  return value.split(/\n\s*\n/).map((section) => {
    const lines = section.split("\n").map((line) => line.trim()).filter(Boolean);
    const title = lines[0];
    if (!title) return "";
    const heading = `<h3>${htmlEscape(title)}</h3>`;
    const body = lines.slice(1).map((line) => `<p>${htmlEscape(line)}</p>`).join("");
    return heading + body;
  }).join("");
}

export function presentationHtmlFileName(trackName: string): string {
  const cleaned = trackName.replace(UNSAFE_FILE_CHARS, " ").replace(/\s+/g, " ").trim();
  const base = cleaned || FALLBACK_TITLE;
  return base.toLowerCase().endsWith(HTML_FILE_EXTENSION) ? base : `${base}${HTML_FILE_EXTENSION}`;
}

function presentationPngFileName(trackName: string): string {
  return presentationHtmlFileName(trackName).replace(/\.html$/i, ".png");
}

function presentationHtmlCopyFileName(trackName: string, suffix: string): string {
  const file = presentationHtmlFileName(trackName);
  const cleaned = suffix.replace(UNSAFE_FILE_CHARS, " ").replace(/\s+/g, " ").trim();
  const label = cleaned || HTML_COPY_SUFFIX;
  return file.replace(/\.html$/i, ` ${label}.html`);
}

export function renderPresentationHtml(source: PresentationHtmlSource): string {
  if (
    source.track.viewpoints.length === 0
    || source.imageWidth <= 0
    || source.imageHeight <= 0
  ) {
    throw new LocalizedAppError("app.exportHtmlFailed");
  }

  const svg = embeddableSvg(source.svg);
  const frame = embeddableFrame(source.frameHref);
  const layout = parseSvgCssSize(svg, {
    width: source.imageWidth,
    height: source.imageHeight,
  });
  const transparent = isTransparentBackground(source.theme.background);
  const background = transparent
    ? PRESENTATION_GIF_FALLBACK_BACKGROUND
    : cssColor(source.theme.background, PRESENTATION_GIF_FALLBACK_BACKGROUND);
  const title = presentationTitle(source.track.name);
  const firstViewpointId = source.track.viewpoints[0]?.id ?? "";
  const drawnOverlays = source.showOverlays
    ? source.track.overlays.map((overlay, index) => overlayMarkup(
      overlay,
      source.imageWidth,
      source.imageHeight,
      firstViewpointId,
      index,
    ))
    : [];
  const overlayDefs = drawnOverlays.map((item) => item.defs).join("");
  const overlays = drawnOverlays.map((item) => item.group).join("");
  const payload = {
    svg,
    frame,
    imageWidth: source.imageWidth,
    imageHeight: source.imageHeight,
    layoutWidth: layout.width,
    layoutHeight: layout.height,
    showOverlays: source.showOverlays,
    minScale: PREVIEW_MIN_ZOOM,
    maxScale: PRESENTATION_MAX_SCALE,
    defaultTransitionMs: PRESENTATION_DEFAULT_TRANSITION_MS,
    pulse: FRAME_EFFECT_PULSE_AMOUNT,
    zoom: FRAME_EFFECT_ZOOM_AMOUNT,
    fly: FRAME_EFFECT_FLY_DISTANCE,
    tearTeeth: FRAME_EFFECT_TEAR_TEETH,
    tearAmplitude: FRAME_EFFECT_TEAR_AMPLITUDE,
    spin: FRAME_EFFECT_SPIN_DEGREES,
    spinOpacity: FRAME_EFFECT_SPIN_MIN_OPACITY,
    popStart: FRAME_EFFECT_POP_START,
    popOvershoot: FRAME_EFFECT_POP_OVERSHOOT,
    textMin: PRESENTATION_OVERLAY_TEXT_MIN_PX,
    textMax: PRESENTATION_OVERLAY_TEXT_MAX_PX,
    textRatio: PRESENTATION_OVERLAY_TEXT_HEIGHT_RATIO,
    arrowHead: ARROW_HEAD_SCREEN_PX,
    fallbackWidth: HTML_FALLBACK_VIEWPORT_WIDTH,
    fallbackHeight: HTML_FALLBACK_VIEWPORT_HEIGHT,
    frameMs: HTML_FRAME_FALLBACK_MS,
    revealMs: PRESENTATION_CHROME_REVEAL_MS,
    background,
    pngName: presentationPngFileName(source.track.name),
    copyName: presentationHtmlCopyFileName(source.track.name, source.labels.copySuffix),
    zoomStep: PREVIEW_ZOOM_STEP,
    wheelLine: PREVIEW_WHEEL_LINE_PIXELS,
    wheelSensitivity: PREVIEW_ZOOM_SENSITIVITY,
    wheelCtrl: HTML_WHEEL_CTRL_MULTIPLIER,
    wheelLineLimit: HTML_WHEEL_LINE_STEP_LIMIT,
    scaleEpsilon: PAN_ZOOM_SCALE_EPSILON,
    panKeyStep: HTML_PAN_KEY_STEP,
    maxPixelRatio: HTML_PNG_MAX_PIXEL_RATIO,
    checkerCell: HTML_CHECKER_CELL,
    downloadRevokeMs: HTML_DOWNLOAD_REVOKE_MS,
    stickerWidth: HTML_STICKER_WIDTH,
    stickerHeight: HTML_STICKER_HEIGHT,
    stickerMinWidth: HTML_STICKER_MIN_WIDTH,
    stickerMinHeight: HTML_STICKER_MIN_HEIGHT,
    stickerNudge: HTML_STICKER_NUDGE,
    stickerRadius: HTML_STICKER_RADIUS,
    stickerPad: HTML_STICKER_PAD,
    stickerFontPx: HTML_STICKER_FONT_PX,
    stickerFontScales: HTML_STICKER_FONT_SCALES,
    stickerFill: HTML_STICKER_FILL,
    stickerStroke: HTML_STICKER_STROKE,
    stickerInk: HTML_STICKER_INK,
    inkLight: HTML_INK_LIGHT,
    inkLuma: HTML_INK_LUMA,
    penColor: HTML_PEN_COLOR,
    penWidth: HTML_PEN_WIDTH_DEFAULT,
    penWidthMin: HTML_PEN_WIDTH_MIN,
    penWidthMax: HTML_PEN_WIDTH_MAX,
    penMinStep: HTML_PEN_MIN_STEP,
    penStrokeLimit: HTML_PEN_STROKE_LIMIT,
    penPointLimit: HTML_PEN_POINT_LIMIT,
    eraserRadius: HTML_ERASER_RADIUS,
    noteTextLimit: HTML_NOTE_TEXT_LIMIT,
    noteColors: NOTE_COLORS,
    penColors: PEN_COLORS,
    labels: {
      play: source.labels.play,
      pause: source.labels.pause,
      explore: source.labels.explore,
      playback: source.labels.playback,
      zoomLevel: source.labels.zoomLevel,
      removeSticker: source.labels.removeSticker,
      resizeSticker: source.labels.resizeSticker,
      moveSticker: source.labels.moveSticker,
      sticker: source.labels.sticker,
      stickerColor: source.labels.stickerColor,
      stickerFontSmaller: source.labels.stickerFontSmaller,
      stickerFontLarger: source.labels.stickerFontLarger,
      showMarks: source.labels.showMarks,
      hideMarks: source.labels.hideMarks,
      penColor: source.labels.penColor,
    },
    viewpoints: playerViewpoints(source.track),
    transitions: playerTransitions(source.track),
  };
  const checker = transparent ? " c2g-checker" : "";
  const dir = source.dir === "rtl" ? "rtl" : "ltr";

  return `<!DOCTYPE html>
<html lang="${htmlEscape(htmlLang(source.lang))}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlEscape(title)}</title>
<style>
:root {
  --c2g-bg: ${background};
  --c2g-accent: ${cssColor(source.theme.accent, THEME_ACCENT)};
  --c2g-surface: ${cssColor(source.theme.surface, THEME_SURFACE)};
  --c2g-text: ${cssColor(source.theme.text, THEME_TEXT)};
}
${PLAYER_CSS}
</style>
</head>
<body class="${checker.trim()}">
<main id="c2g-stage" data-phase="dwell" data-index="0">
  <div id="c2g-scene">
    <div id="c2g-picture" style="width:${formatNumber(layout.width)}px;height:${formatNumber(layout.height)}px">
      <div id="c2g-frame-wrap" hidden><img id="c2g-frame" alt=""></div>
      <div id="c2g-diagram-wrap"></div>
    </div>
    <svg id="c2g-overlays" xmlns="${SVG_XMLNS}" width="${formatNumber(source.imageWidth)}" height="${formatNumber(source.imageHeight)}" viewBox="0 0 ${formatNumber(source.imageWidth)} ${formatNumber(source.imageHeight)}" overflow="visible">
      ${overlayDefs ? `<defs>${overlayDefs}</defs>` : ""}
      ${overlays}
    </svg>
    <svg id="c2g-ink" xmlns="${SVG_XMLNS}" width="${formatNumber(layout.width)}" height="${formatNumber(layout.height)}" viewBox="0 0 ${formatNumber(layout.width)} ${formatNumber(layout.height)}" overflow="visible"></svg>
    <div id="c2g-notes"></div>
  </div>
</main>
${playerChrome(title, source.labels, source.track.viewpoints.length)}
<script type="application/json" id="c2g-data">${embedJson(payload)}</script>
<script>${PLAYER_SCRIPT}</script>
</body>
</html>
`;
}
