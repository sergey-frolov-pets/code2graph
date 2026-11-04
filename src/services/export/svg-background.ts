const SVG_XMLNS = "http://www.w3.org/2000/svg";
const LIGHT_SVG_FILLS = new Set(["#ffffff", "#fff", "white"]);

/** Containers whose white rects are paint data, not a page background. */
const SVG_PAINT_CONTAINER_TAGS = new Set([
  "mask",
  "clippath",
  "pattern",
  "marker",
  "defs",
]);

const SVG_LABEL_KNOCKOUT_MAX_SHORTER_EDGE_PX = 32;

import { normalizeSvgRootSize, parseViewBoxSize } from "@/services/export/svg-geometry";

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

function setSvgBackgroundColor(root: Element, color: string): void {
  const style = root.getAttribute("style") ?? "";
  const without = style
    .replace(/(?:^|;)\s*background(?:-color)?\s*:[^;]*/gi, "")
    .replace(/^;+|;+$/g, "")
    .trim();
  const next = without ? `${without};background-color:${color}` : `background-color:${color}`;
  root.setAttribute("style", next);
}

function isInsideSvgPaintContainer(element: Element): boolean {
  let parent = element.parentElement;
  while (parent) {
    if (SVG_PAINT_CONTAINER_TAGS.has(parent.tagName.toLowerCase())) {
      return true;
    }
    parent = parent.parentElement;
  }

  return false;
}

function isLabelKnockoutRect(rect: Element): boolean {
  const width = Number.parseFloat(rect.getAttribute("width") ?? "");
  const height = Number.parseFloat(rect.getAttribute("height") ?? "");
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }

  return Math.min(width, height) <= SVG_LABEL_KNOCKOUT_MAX_SHORTER_EDGE_PX;
}

function isCanvasBackgroundRect(rect: Element): boolean {
  if (rect.getAttribute("data-bg") !== "canvas") {
    return false;
  }
  const parent = rect.parentElement;
  if (!parent || parent.tagName.toLowerCase() === "svg") {
    return true;
  }
  if (parent.tagName.toLowerCase() !== "g") {
    return false;
  }
  return !parent.getAttribute("transform");
}

function markCanvasBackground(root: Element): void {
  const viewBox = parseViewBoxSize(root.getAttribute("viewBox"));
  if (!viewBox) {
    return;
  }

  for (const rect of root.querySelectorAll("rect")) {
    if (!isCanvasBackgroundRect(rect)) {
      const width = Number.parseFloat(rect.getAttribute("width") ?? "");
      const height = Number.parseFloat(rect.getAttribute("height") ?? "");
      const x = Number.parseFloat(rect.getAttribute("x") ?? "0");
      const y = Number.parseFloat(rect.getAttribute("y") ?? "0");
      const coversCanvas =
        x <= 0 &&
        y <= 0 &&
        width >= viewBox.width - 0.5 &&
        height >= viewBox.height - 0.5;
      if (!coversCanvas) {
        continue;
      }
      rect.setAttribute("data-bg", "canvas");
    }

    const fill = rect.getAttribute("fill") ?? "";
    if (normalizeColor(fill)) {
      for (const knockout of root.querySelectorAll("rect[data-break-gap], rect[data-line-gap]")) {
        if (!knockout.getAttribute("data-bg-fill")) {
          knockout.setAttribute("data-bg-fill", fill);
        }
      }
    }
    return;
  }
}

function clearCanvasBackground(root: Element): void {
  for (const rect of root.querySelectorAll("rect[data-bg='canvas']")) {
    if (!isCanvasBackgroundRect(rect)) {
      continue;
    }
    rect.setAttribute("fill", "none");
  }
}

function removeCanvasBackground(root: Element): void {
  for (const rect of root.querySelectorAll("rect[data-bg='canvas']")) {
    if (!isCanvasBackgroundRect(rect)) {
      continue;
    }
    const parent = rect.parentElement;
    rect.remove();
    if (parent && parent.tagName.toLowerCase() === "g" && parent.childElementCount === 0) {
      parent.remove();
    }
  }
}

export function toOpaqueColor(value: string): string {
  const raw = value.trim();
  if (!raw) {
    return "";
  }

  const lower = raw.toLowerCase();
  if (lower === "transparent" || lower === "none") {
    return "";
  }

  const hex = /^#([0-9a-f]{3,8})$/i.exec(raw);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 4) {
      return `#${digits.slice(0, 3)}`;
    }
    if (digits.length === 8) {
      return `#${digits.slice(0, 6)}`;
    }
    return raw;
  }

  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/i.exec(raw);
  if (fn) {
    const parts = fn[2]
      .split(/[,/]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const keep = 3;
    if (parts.length > keep) {
      const name = fn[1].toLowerCase().replace("a", "");
      return `${name}(${parts.slice(0, keep).join(", ")})`;
    }
    return raw;
  }

  return raw;
}

export function isTransparentBackground(value: string | null | undefined): boolean {
  const normalized = normalizeColor(value ?? "");
  return normalized === "" || normalized === "transparent" || normalized === "none";
}

export function applyPreviewBackground(svg: string, background: string): string {
  if (!svg.includes("<svg")) {
    return svg;
  }

  const transparent = isTransparentBackground(background);
  const fill = transparent ? "#ffffff" : toOpaqueColor(background);
  if (!fill) {
    return svg;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    return svg;
  }

  markCanvasBackground(root);
  const canvas = root.querySelector("rect[data-bg='canvas']");
  if (canvas) {
    canvas.setAttribute("fill", transparent ? "transparent" : fill);
    if (!transparent) {
      canvas.removeAttribute("fill-opacity");
      canvas.removeAttribute("opacity");
    }
  }
  setSvgBackgroundColor(root, transparent ? "transparent" : fill);

  for (const rect of root.querySelectorAll(
    "rect[data-break-gap], rect[data-line-gap], rect[data-bg-fill]",
  )) {
    rect.setAttribute("fill", fill);
  }

  return new XMLSerializer().serializeToString(root);
}

function transparentizeLightBackground(root: Element): void {
  for (const rect of root.querySelectorAll("rect")) {
    if (isCanvasBackgroundRect(rect)) {
      continue;
    }

    if (isInsideSvgPaintContainer(rect) || isLabelKnockoutRect(rect)) {
      continue;
    }

    const fill = normalizeColor(rect.getAttribute("fill") ?? "");
    if (!LIGHT_SVG_FILLS.has(fill)) {
      continue;
    }

    const width = rect.getAttribute("width") ?? "";
    const height = rect.getAttribute("height") ?? "";
    const coversWidth = width.includes("%") || Number.parseFloat(width) > 0;
    const coversHeight = height.includes("%") || Number.parseFloat(height) > 0;

    if (coversWidth && coversHeight) {
      rect.setAttribute("fill", "none");
    }
  }
}

export function withTransparentSvgBackground(svg: string): string {
  if (!svg.includes("<svg")) {
    return svg;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;

  if (root.tagName.toLowerCase() !== "svg") {
    return svg;
  }

  markCanvasBackground(root);
  clearCanvasBackground(root);
  transparentizeLightBackground(root);
  return new XMLSerializer().serializeToString(root);
}

export function sanitizeSvgForPreview(svg: string): string {
  if (!svg.includes("<svg")) {
    return svg;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;

  if (root.tagName.toLowerCase() !== "svg") {
    return svg;
  }

  if (!root.getAttribute("xmlns")) {
    root.setAttribute("xmlns", SVG_XMLNS);
  }

  normalizeSvgRootSize(root);
  markCanvasBackground(root);
  removeCanvasBackground(root);
  transparentizeLightBackground(root);

  return new XMLSerializer().serializeToString(root);
}
