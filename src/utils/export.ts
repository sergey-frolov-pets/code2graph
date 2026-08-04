import { LocalizedAppError } from "@/utils/localized-app-error";

const SVG_XMLNS = "http://www.w3.org/2000/svg";
const LIGHT_SVG_FILLS = new Set(["#ffffff", "#fff", "white"]);

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

function transparentizeLightBackground(root: Element): void {
  for (const rect of root.querySelectorAll("rect")) {
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

export function parseSvgSize(svg: string): { width: number; height: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;

  const viewBox = root.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const width = Number.parseFloat(root.getAttribute("width") ?? "800");
  const height = Number.parseFloat(root.getAttribute("height") ?? "600");

  return {
    width: Number.isFinite(width) ? width : 800,
    height: Number.isFinite(height) ? height : 600,
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

export async function svgToPngBlob(
  svg: string,
  backgroundColor = "#ffffff",
): Promise<Blob> {
  const { width, height } = parseSvgSize(svg);
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

  transparentizeLightBackground(root);

  return new XMLSerializer().serializeToString(root);
}
