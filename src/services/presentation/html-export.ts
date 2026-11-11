import { PREVIEW_MIN_ZOOM } from "@/constants/preview-pan-zoom";
import { isTransparentBackground } from "@/services/export/svg-background";
import { parseSvgCssSize } from "@/services/export/svg-geometry";
import {
  FRAME_EFFECT_PULSE_AMOUNT,
  FRAME_EFFECT_ZOOM_AMOUNT,
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
  const visible = overlay.owner.kind === "viewpoint" && overlay.owner.id === firstViewpointId;
  const hidden = visible ? "" : " style=\"display:none\"";
  const drawn = overlayBody(overlay, box, index);
  return {
    defs: drawn.defs,
    group: `<g data-owner-kind="${xmlEscape(overlay.owner.kind)}" data-owner-id="${xmlEscape(overlay.owner.id)}" data-overlay-id="${xmlEscape(overlay.id)}" data-cx="${formatNumber(box.x + box.width / 2)}" data-cy="${formatNumber(box.y + box.height / 2)}"${hidden}>${drawn.body}</g>`,
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
  var playButton = document.getElementById("c2g-play");
  var prevButton = document.getElementById("c2g-prev");
  var nextButton = document.getElementById("c2g-next");
  var indexNode = document.getElementById("c2g-index");
  var repeatBox = document.getElementById("c2g-repeat");
  if (!dataNode || !stage || !scene || !diagramWrap || !playButton || !prevButton || !nextButton || !indexNode) {
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
  var phaseStarted = 0;
  var frameId = 0;
  var reduceMotion = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var identity = { opacity: 1, scale: 1 };

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
  function effectVisual(effects, elapsed, target, overlayId) {
    var list = effects || [];
    var latest = null;
    for (var i = 0; i < list.length; i += 1) {
      var effect = list[i];
      if (effect.target !== target) continue;
      if (target === "overlay" && effect.overlayId !== overlayId) continue;
      if (elapsed < effect.startMs || elapsed >= effect.startMs + effect.durationMs) continue;
      if (!latest || effect.startMs >= latest.startMs) latest = effect;
    }
    if (!latest || latest.durationMs <= 0) return identity;
    var progress = (elapsed - latest.startMs) / latest.durationMs;
    if (latest.kind === "fade") return { opacity: progress, scale: 1 };
    if (latest.kind === "pulse") {
      return { opacity: 1, scale: 1 + payload.pulse * Math.sin(progress * Math.PI) };
    }
    return { opacity: 1, scale: 1 + payload.zoom * progress };
  }
  function applyVisual(element, visual) {
    if (!element) return;
    element.style.opacity = String(visual.opacity);
    element.style.transform = visual.scale === 1 ? "" : "scale(" + visual.scale + ")";
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
  function place(anchorX, anchorY, scale) {
    var size = viewportSize();
    var clamped = Math.min(payload.maxScale, Math.max(payload.minScale, scale));
    if (!isFinite(clamped) || clamped <= 0) clamped = 1;
    var panX = size.width / 2 - anchorX * payload.imageWidth * clamped;
    var panY = size.height / 2 - anchorY * payload.imageHeight * clamped;
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
  function showOwner(kind, id, effects, elapsed, animate) {
    for (var i = 0; i < overlays.length; i += 1) {
      var node = overlays[i];
      var visible = node.getAttribute("data-owner-kind") === kind && node.getAttribute("data-owner-id") === id;
      node.style.display = visible ? "" : "none";
      if (!visible) continue;
      var visual = animate
        ? effectVisual(effects, elapsed, "overlay", node.getAttribute("data-overlay-id") || "")
        : identity;
      node.style.opacity = String(visual.opacity);
      if (visual.scale === 1) {
        node.removeAttribute("transform");
      } else {
        var cx = Number(node.getAttribute("data-cx"));
        var cy = Number(node.getAttribute("data-cy"));
        node.setAttribute("transform", "translate(" + cx + " " + cy + ") scale(" + visual.scale + ") translate(" + (-cx) + " " + (-cy) + ")");
      }
    }
  }
  function paint() {
    var animate = playing || moving;
    if (phase === "travel" && count > 1) {
      var from = payload.viewpoints[travelOrigin];
      var to = payload.viewpoints[(travelOrigin + 1) % count];
      var transition = transitionAt(travelOrigin);
      var eased = ease(travelAmount);
      var point = sample({ x: from.x, y: from.y }, { x: to.x, y: to.y }, transition, eased);
      place(point.x, point.y, lerpScale(from.scale, to.scale, eased));
      applyVisual(frameWrap, identity);
      applyVisual(diagramWrap, identity);
      showOwner("transition", transition.id, from.effects, effectElapsed, animate);
      return;
    }
    var current = payload.viewpoints[index];
    place(current.x, current.y, current.scale);
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
  function updateChrome() {
    indexNode.textContent = (index + 1) + " / " + count;
    stage.dataset.phase = phase;
    stage.dataset.index = String(index);
    playButton.setAttribute("aria-label", playing ? payload.labels.pause : payload.labels.play);
    playButton.setAttribute("aria-pressed", playing ? "true" : "false");
    playButton.dataset.state = playing ? "pause" : "play";
    prevButton.disabled = count < 2;
    nextButton.disabled = count < 2;
  }
  function render(now) {
    if (playing || moving) integrate(now);
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
      kick();
      return;
    }
    playing = true;
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
  window.addEventListener("keydown", function (event) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    var tag = event.target && event.target.tagName;
    if (event.key === "ArrowRight") {
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      goFirst();
    } else if (event.key === " " || event.key === "Spacebar") {
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
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

function playerChrome(title: string, labels: PresentationHtmlLabels, stepCount: number): string {
  const safeTitle = htmlEscape(title);
  return `<nav id="c2g-bar" aria-label="${safeTitle}">
    <strong class="c2g-name" title="${safeTitle}">${safeTitle}</strong>
    <div class="c2g-transport">
      <button id="c2g-first" type="button" aria-label="${htmlEscape(labels.first)}">${icon("M6 6v12M18 6 11 12l7 6")}</button>
      <button id="c2g-prev" type="button" aria-label="${htmlEscape(labels.prev)}">${icon("M14.5 6.5 8.5 12l6 5.5")}</button>
      <span id="c2g-index" aria-live="polite">1 / ${stepCount}</span>
      <button id="c2g-next" type="button" aria-label="${htmlEscape(labels.next)}">${icon("M9.5 6.5 15.5 12l-6 5.5")}</button>
      <button id="c2g-play" type="button" data-state="play" aria-pressed="false" aria-label="${htmlEscape(labels.play)}">
        <svg class="c2g-icon-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5L8 5.5z" fill="currentColor"/></svg>
        <svg class="c2g-icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>
      </button>
    </div>
    <label class="c2g-repeat"><input id="c2g-repeat" type="checkbox"> ${htmlEscape(labels.repeat)}</label>
  </nav>`;
}

export function presentationHtmlFileName(trackName: string): string {
  const cleaned = trackName.replace(UNSAFE_FILE_CHARS, " ").replace(/\s+/g, " ").trim();
  const base = cleaned || FALLBACK_TITLE;
  return base.toLowerCase().endsWith(HTML_FILE_EXTENSION) ? base : `${base}${HTML_FILE_EXTENSION}`;
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
    textMin: PRESENTATION_OVERLAY_TEXT_MIN_PX,
    textMax: PRESENTATION_OVERLAY_TEXT_MAX_PX,
    textRatio: PRESENTATION_OVERLAY_TEXT_HEIGHT_RATIO,
    arrowHead: ARROW_HEAD_SCREEN_PX,
    fallbackWidth: HTML_FALLBACK_VIEWPORT_WIDTH,
    fallbackHeight: HTML_FALLBACK_VIEWPORT_HEIGHT,
    frameMs: HTML_FRAME_FALLBACK_MS,
    labels: {
      play: source.labels.play,
      pause: source.labels.pause,
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
${playerChrome(title, source.labels, source.track.viewpoints.length)}
<script type="application/json" id="c2g-data">${embedJson(payload)}</script>
<script>${PLAYER_SCRIPT}</script>
</body>
</html>
`;
}
