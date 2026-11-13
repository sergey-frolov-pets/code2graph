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
const HTML_STICKER_MIN_SIZE = 72;
const HTML_STICKER_NUDGE = 16;
const HTML_STICKER_RADIUS = 10;
const HTML_STICKER_PAD = 10;
const HTML_STICKER_HEADER = 22;
const HTML_STICKER_FONT_PX = 14;
const HTML_STICKER_FILL = "#fff4b8";
const HTML_STICKER_STROKE = "#e2c56a";
const HTML_STICKER_INK = "#1a1f24";
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
  sticker: string;
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
#c2g-notes {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
#c2g-notes[hidden],
#c2g-transport[hidden],
#c2g-zoom[hidden],
#c2g-repeat-wrap[hidden] {
  display: none;
}
#c2g-stage.is-exploring { cursor: grab; touch-action: none; }
#c2g-stage.is-panning { cursor: grabbing; }
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
.c2g-sticker {
  position: absolute;
  pointer-events: auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: ${HTML_STICKER_FILL};
  color: ${HTML_STICKER_INK};
  border: 1px solid ${HTML_STICKER_STROKE};
  border-radius: ${HTML_STICKER_RADIUS}px;
  box-shadow: 0 8px 18px color-mix(in srgb, ${HTML_STICKER_INK} 18%, transparent);
  font-family: sans-serif;
}
.c2g-sticker-move {
  height: ${HTML_STICKER_HEADER}px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  cursor: grab;
  touch-action: none;
}
.c2g-sticker-close {
  width: ${HTML_STICKER_HEADER}px;
  height: ${HTML_STICKER_HEADER}px;
  border: 0;
  padding: 0;
  background: transparent;
  color: ${HTML_STICKER_INK};
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.c2g-sticker-text {
  flex: 1;
  min-height: 0;
  margin: 0 ${HTML_STICKER_PAD}px ${HTML_STICKER_PAD}px;
  overflow: auto;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: ${HTML_STICKER_FONT_PX}px;
  line-height: 1.35;
}
.c2g-sticker-text:empty:before {
  content: attr(data-placeholder);
  opacity: 0.45;
}
.c2g-sticker-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: ${HTML_STICKER_HEADER}px;
  height: ${HTML_STICKER_HEADER}px;
  border: 0;
  padding: 0;
  background: linear-gradient(135deg, transparent 50%, ${HTML_STICKER_STROKE} 50%);
  cursor: nwse-resize;
  touch-action: none;
}
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
  var notes = document.getElementById("c2g-notes");
  var repeatWrap = document.getElementById("c2g-repeat-wrap");
  if (
    !dataNode || !stage || !scene || !diagramWrap || !playButton || !prevButton || !nextButton
    || !indexNode || !modeButton || !transport || !zoomPanel || !zoomInButton || !zoomOutButton
    || !zoomResetButton || !cameraButton || !stickerButton || !notes
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
    style.textContent = "svg{display:block;width:100%;height:100%}";
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
    if (drag.kind === "move" && drag.note) {
      drag.note.style.left = (drag.left + event.clientX - drag.startX) + "px";
      drag.note.style.top = (drag.top + event.clientY - drag.startY) + "px";
      clampSticker(drag.note);
      return;
    }
    if (drag.kind === "resize" && drag.note) {
      drag.note.style.width = Math.max(payload.stickerMin, drag.width + event.clientX - drag.startX) + "px";
      drag.note.style.height = Math.max(payload.stickerMin, drag.height + event.clientY - drag.startY) + "px";
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
  function readBox(note) {
    return {
      left: parseFloat(note.style.left) || 0,
      top: parseFloat(note.style.top) || 0,
      width: note.offsetWidth || parseFloat(note.style.width) || payload.stickerWidth,
      height: note.offsetHeight || parseFloat(note.style.height) || payload.stickerHeight
    };
  }
  function clampSticker(note) {
    var size = viewportSize();
    var box = readBox(note);
    var keep = payload.stickerMin / 2;
    var left = Math.min(size.width - keep, Math.max(keep - box.width, box.left));
    var top = Math.min(size.height - keep, Math.max(keep - box.height, box.top));
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
  function addSticker() {
    if (!exploring) return;
    var size = viewportSize();
    var width = payload.stickerWidth;
    var height = payload.stickerHeight;
    var nudge = (stickerSeq % 5) * payload.stickerNudge;
    stickerSeq += 1;
    var note = document.createElement("article");
    note.className = "c2g-sticker";
    note.style.left = Math.round(size.width / 2 - width / 2 + nudge) + "px";
    note.style.top = Math.round(size.height / 2 - height / 2 + nudge) + "px";
    note.style.width = width + "px";
    note.style.height = height + "px";
    var header = document.createElement("div");
    header.className = "c2g-sticker-move";
    var close = document.createElement("button");
    close.type = "button";
    close.className = "c2g-sticker-close";
    close.setAttribute("aria-label", payload.labels.removeSticker);
    close.textContent = "×";
    var text = document.createElement("div");
    text.className = "c2g-sticker-text";
    text.contentEditable = "true";
    text.setAttribute("role", "textbox");
    text.setAttribute("aria-label", payload.labels.sticker);
    text.setAttribute("data-placeholder", payload.labels.sticker);
    var handle = document.createElement("button");
    handle.type = "button";
    handle.className = "c2g-sticker-resize";
    handle.setAttribute("aria-label", payload.labels.resizeSticker);
    header.appendChild(close);
    note.appendChild(header);
    note.appendChild(text);
    note.appendChild(handle);
    notes.appendChild(note);
    clampSticker(note);
    text.focus();
    header.addEventListener("pointerdown", function (event) {
      if (event.target === close) return;
      event.preventDefault();
      event.stopPropagation();
      beginStickerDrag(event, note, "move");
    });
    handle.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      beginStickerDrag(event, note, "resize");
    });
    close.addEventListener("click", function (event) {
      event.stopPropagation();
      note.remove();
    });
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
    var url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    return loadImage(url).then(function (image) {
      URL.revokeObjectURL(url);
      return image;
    }, function (error) {
      URL.revokeObjectURL(url);
      throw error;
    });
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
  function drawStickers(ctx) {
    var items = notes.querySelectorAll(".c2g-sticker");
    var i;
    for (i = 0; i < items.length; i += 1) {
      var note = items[i];
      var box = readBox(note);
      ctx.save();
      roundedRect(ctx, box.left, box.top, box.width, box.height, payload.stickerRadius);
      ctx.fillStyle = payload.stickerFill;
      ctx.fill();
      ctx.strokeStyle = payload.stickerStroke;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(box.left, box.top + payload.stickerHeader);
      ctx.lineTo(box.left + box.width, box.top + payload.stickerHeader);
      ctx.stroke();
      var textNode = note.querySelector(".c2g-sticker-text");
      var text = textNode && textNode.textContent ? textNode.textContent.trim() : "";
      if (text) {
        ctx.fillStyle = payload.stickerInk;
        ctx.font = payload.stickerFontPx + "px sans-serif";
        var maxWidth = Math.max(8, box.width - payload.stickerPad * 2);
        var lines = wrapLines(ctx, text, maxWidth);
        var lineHeight = payload.stickerFontPx * 1.35;
        var n;
        for (n = 0; n < lines.length; n += 1) {
          var lineY = box.top + payload.stickerHeader + payload.stickerPad + payload.stickerFontPx + n * lineHeight;
          if (lineY > box.top + box.height - payload.stickerPad) break;
          ctx.fillText(lines[n], box.left + payload.stickerPad, lineY);
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
      if (shadowSvg) {
        jobs.push(loadSvg(shadowSvg, payload.imageWidth, payload.imageHeight).then(function (image) {
          diagramImage = image;
        }));
      }
      if (overlaySvg) {
        jobs.push(loadSvg(overlaySvg, payload.imageWidth, payload.imageHeight).then(function (image) {
          overlayImage = image;
        }));
      }
      if (frame && frameWrap && !frameWrap.hidden && frame.getAttribute("src")) {
        jobs.push(loadImage(frame.getAttribute("src")).then(function (image) {
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
        if (frameImage) ctx.drawImage(frameImage, 0, 0, payload.imageWidth, payload.imageHeight);
        if (diagramImage) ctx.drawImage(diagramImage, 0, 0, payload.imageWidth, payload.imageHeight);
        if (overlayImage) ctx.drawImage(overlayImage, 0, 0, payload.imageWidth, payload.imageHeight);
        ctx.restore();
        drawStickers(ctx);
        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) { resolve(blob); }, "image/png");
        });
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
    notes.hidden = !exploring;
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
    if (!playing || !event.pointerType || event.pointerType === "mouse") return;
    revealBar();
  });
  function typingTarget(event) {
    var target = event.target;
    if (!target) return false;
    if (target.closest && target.closest(".c2g-sticker")) return true;
    var tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA";
  }
  window.addEventListener("keydown", function (event) {
    if (event.altKey || event.metaKey || event.ctrlKey || typingTarget(event)) return;
    if (exploring) {
      var distance = event.shiftKey ? payload.panKeyStep * 2 : payload.panKeyStep;
      if (event.key === "ArrowRight") { event.preventDefault(); applyCamera(camera.panX + distance, camera.panY, camera.scale); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); applyCamera(camera.panX - distance, camera.panY, camera.scale); }
      else if (event.key === "ArrowUp") { event.preventDefault(); applyCamera(camera.panX, camera.panY - distance, camera.scale); }
      else if (event.key === "ArrowDown") { event.preventDefault(); applyCamera(camera.panX, camera.panY + distance, camera.scale); }
      else if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomByStep(1); }
      else if (event.key === "-" || event.key === "_") { event.preventDefault(); zoomByStep(-1); }
      else if (event.key === "Escape") { event.preventDefault(); toggleExplore(); }
      else if (event.key === "0") { event.preventDefault(); resetView(); }
      return;
    }
    var tag = event.target && event.target.tagName;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goFirst();
    } else if (event.key === " " || event.key === "Spacebar") {
      if (tag === "BUTTON") return;
      event.preventDefault();
      togglePlay();
    }
  });
  window.addEventListener("resize", function () { render(nowMs()); });
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
    </div>
    <label id="c2g-repeat-wrap" class="c2g-repeat"><input id="c2g-repeat" type="checkbox"> ${htmlEscape(labels.repeat)}</label>
  </nav>`;
}

export function presentationHtmlFileName(trackName: string): string {
  const cleaned = trackName.replace(UNSAFE_FILE_CHARS, " ").replace(/\s+/g, " ").trim();
  const base = cleaned || FALLBACK_TITLE;
  return base.toLowerCase().endsWith(HTML_FILE_EXTENSION) ? base : `${base}${HTML_FILE_EXTENSION}`;
}

function presentationPngFileName(trackName: string): string {
  return presentationHtmlFileName(trackName).replace(/\.html$/i, ".png");
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
    stickerMin: HTML_STICKER_MIN_SIZE,
    stickerNudge: HTML_STICKER_NUDGE,
    stickerRadius: HTML_STICKER_RADIUS,
    stickerPad: HTML_STICKER_PAD,
    stickerHeader: HTML_STICKER_HEADER,
    stickerFontPx: HTML_STICKER_FONT_PX,
    stickerFill: HTML_STICKER_FILL,
    stickerStroke: HTML_STICKER_STROKE,
    stickerInk: HTML_STICKER_INK,
    labels: {
      play: source.labels.play,
      pause: source.labels.pause,
      explore: source.labels.explore,
      playback: source.labels.playback,
      zoomLevel: source.labels.zoomLevel,
      removeSticker: source.labels.removeSticker,
      resizeSticker: source.labels.resizeSticker,
      sticker: source.labels.sticker,
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
  </div>
</main>
<div id="c2g-notes" hidden></div>
${playerChrome(title, source.labels, source.track.viewpoints.length)}
<script type="application/json" id="c2g-data">${embedJson(payload)}</script>
<script>${PLAYER_SCRIPT}</script>
</body>
</html>
`;
}
