export interface ImageSize {
  width: number;
  height: number;
}

export const MIN_IMAGE_SIDE = 64;
export const MAX_IMAGE_SIDE = 4096;

export function clampImageSide(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_IMAGE_SIDE;
  }
  return Math.min(MAX_IMAGE_SIDE, Math.max(MIN_IMAGE_SIDE, Math.round(value)));
}

export function parseViewBoxSize(viewBox: string | null): { width: number; height: number } | null {
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

function parsePositiveLength(value: string | null): number | null {
  if (isPercentageOrMissingSvgLength(value)) {
    return null;
  }
  return Number.parseFloat((value ?? "").trim());
}

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

const FALLBACK_IMAGE_WIDTH = 800;
const FALLBACK_IMAGE_HEIGHT = 600;

const MIN_PIXEL_SIDE = 1;

/** Width or height in pixels. A fractional viewBox is not a pixel size. */
export function wholeImagePixels(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.max(MIN_PIXEL_SIDE, Math.round(value));
}

/**
 * CSS box of the root svg, the rectangle the preview actually scales.
 * Width and height attributes win over the viewBox: a viewBox origin or a
 * tighter content box must not change how big the element is on screen.
 */
export function parseSvgCssSize(
  svg: string,
  fallback: { width: number; height: number },
): { width: number; height: number } {
  if (!svg.includes("<svg")) {
    return fallback;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    return fallback;
  }

  const width = parsePositiveLength(root.getAttribute("width"));
  const height = parsePositiveLength(root.getAttribute("height"));
  const viewBox = parseViewBoxSize(root.getAttribute("viewBox"));
  return {
    width: width ?? viewBox?.width ?? fallback.width,
    height: height ?? viewBox?.height ?? fallback.height,
  };
}

export function parseSvgSize(svg: string): { width: number; height: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;

  const viewBoxSize = parseViewBoxSize(root.getAttribute("viewBox"));
  if (viewBoxSize) {
    return {
      width: wholeImagePixels(viewBoxSize.width, FALLBACK_IMAGE_WIDTH),
      height: wholeImagePixels(viewBoxSize.height, FALLBACK_IMAGE_HEIGHT),
    };
  }

  const width = Number.parseFloat(root.getAttribute("width") ?? "");
  const height = Number.parseFloat(root.getAttribute("height") ?? "");

  return {
    width: wholeImagePixels(width, FALLBACK_IMAGE_WIDTH),
    height: wholeImagePixels(height, FALLBACK_IMAGE_HEIGHT),
  };
}

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

  if (!parseViewBoxSize(root.getAttribute("viewBox"))) {
    root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  return new XMLSerializer().serializeToString(root);
}
