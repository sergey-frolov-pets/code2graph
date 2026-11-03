import { LocalizedAppError } from "@/utils/localized-app-error";

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

/**
 * Shorter side of a paper chip drawn behind a label so a stroke does not cut
 * the glyphs. WireMark floating labels are 13px tall and connector captions
 * 23px; page and frame fills are taller than this (the smallest nested
 * background we still clear is 40px).
 */
const SVG_LABEL_KNOCKOUT_MAX_SHORTER_EDGE_PX = 32;

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
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

function transparentizeLightBackground(root: Element): void {
  for (const rect of root.querySelectorAll("rect")) {
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

function parseViewBoxSize(viewBox: string | null): { width: number; height: number } | null {
  if (!viewBox) {
    return null;
  }

  const parts = viewBox.split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return null;
  }

  if (parts[2] <= 0 || parts[3] <= 0) {
    return null;
  }

  return { width: parts[2], height: parts[3] };
}

function isPercentageOrMissingSvgLength(value: string | null): boolean {
  if (!value) {
    return true;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.endsWith("%")) {
    return true;
  }

  const numeric = Number.parseFloat(trimmed);
  return !Number.isFinite(numeric) || numeric <= 0;
}

/** Materialize percentage / missing SVG root size from viewBox for reliable layout. */
export function normalizeSvgRootSize(root: Element): void {
  const viewBoxSize = parseViewBoxSize(root.getAttribute("viewBox"));
  if (!viewBoxSize) {
    return;
  }

  if (isPercentageOrMissingSvgLength(root.getAttribute("width"))) {
    root.setAttribute("width", String(viewBoxSize.width));
  }

  if (isPercentageOrMissingSvgLength(root.getAttribute("height"))) {
    root.setAttribute("height", String(viewBoxSize.height));
  }

  const style = root.getAttribute("style") ?? "";
  if (/max-width\s*:/i.test(style)) {
    root.setAttribute(
      "style",
      style.replace(/max-width\s*:\s*[^;]+;?/gi, "").trim(),
    );
  }
}

export function parseSvgSize(svg: string): { width: number; height: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;

  const viewBoxSize = parseViewBoxSize(root.getAttribute("viewBox"));
  if (viewBoxSize) {
    return viewBoxSize;
  }

  const width = Number.parseFloat(root.getAttribute("width") ?? "800");
  const height = Number.parseFloat(root.getAttribute("height") ?? "600");

  return {
    width: Number.isFinite(width) && width > 0 ? width : 800,
    height: Number.isFinite(height) && height > 0 ? height : 600,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new LocalizedAppError("engine.svgLoadFailed"));
    image.src = url;
  });
}

export function downloadTextFile(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Размер готового изображения в пикселях. */
export interface ImageSize {
  width: number;
  height: number;
}

/** Пределы для ручного размера: больше — уже не картинка, а canvas-лимит браузера. */
export const MIN_IMAGE_SIDE = 64;
export const MAX_IMAGE_SIDE = 4096;

function clampImageSide(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_IMAGE_SIDE;
  }
  return Math.min(MAX_IMAGE_SIDE, Math.max(MIN_IMAGE_SIDE, Math.round(value)));
}

/**
 * Подставляет в корневой `<svg>` новый размер (width/height + viewBox с теми же
 * пропорциями содержимого). Нужно и для превью, и для PNG-экспорта: картинка
 * рисуется в заданном размере, а не в «натуральном» размере SVG.
 */
export function applySvgSize(svg: string, size: ImageSize): string {
  if (!svg.includes("<svg")) {
    return svg;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    return svg;
  }

  const width = clampImageSide(size.width);
  const height = clampImageSide(size.height);

  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));

  // viewBox сохраняем исходный: он задаёт систему координат содержимого,
  // а width/height — итоговый размер полотна. Если viewBox нет — ставим свой.
  if (!parseViewBoxSize(root.getAttribute("viewBox"))) {
    root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  return new XMLSerializer().serializeToString(root);
}

export async function svgToPngBlob(
  svg: string,
  backgroundColor = "#ffffff",
  size?: ImageSize,
): Promise<Blob> {
  const natural = parseSvgSize(svg);
  const { width, height } = size
    ? { width: clampImageSide(size.width), height: clampImageSide(size.height) }
    : natural;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new LocalizedAppError("engine.canvasUnavailable");
    }

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new LocalizedAppError("engine.pngCreateFailed"));
      }, "image/png");
    });

    return pngBlob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
  transparentizeLightBackground(root);

  return new XMLSerializer().serializeToString(root);
}
