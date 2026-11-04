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
