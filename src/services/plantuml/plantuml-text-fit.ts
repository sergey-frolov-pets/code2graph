/**
 * Запасной проход после подмены шрифта: если подпись всё ещё шире блока
 * (онлайн-сервер измерил другой шрифт, или вес 500/600 не совпал с метрикой),
 * ужимаем её в textLength и расширяем viewBox, чтобы заголовок не обрезался.
 */

const TEXT_FIT_PADDING_PX = 3;
const TEXT_OVERFLOW_EPSILON_PX = 0.75;
const VIEWBOX_MARGIN_PX = 2;
const SHAPE_SELECTOR = "rect, ellipse, polygon";
const MAX_CONTAINER_AREA_RATIO = 0.9;
const DUPLICATE_XMLNS_PATTERN =
  /(xmlns="http:\/\/www\.w3\.org\/2000\/svg")(?=[^>]*\1)/g;

export interface AxisBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextFitRequest {
  anchor: string;
  textX: number;
  textWidth: number;
  shape: AxisBox;
}

export function horizontalTextLimit(request: TextFitRequest): number | null {
  const { shape, textWidth, textX } = request;
  const left = shape.x + TEXT_FIT_PADDING_PX;
  const right = shape.x + shape.width - TEXT_FIT_PADDING_PX;
  const anchor = request.anchor || "start";
  let limit = right - textX;

  if (anchor === "middle") {
    const half = Math.min(textX - left, right - textX);
    limit = half * 2;
  } else if (anchor === "end") {
    limit = textX - left;
  }

  if (!Number.isFinite(limit) || limit <= 0) return null;
  if (textWidth <= limit + TEXT_OVERFLOW_EPSILON_PX) return null;
  return limit;
}

export function expandViewBox(viewBox: AxisBox, boxes: readonly AxisBox[]): AxisBox | null {
  let minX = viewBox.x;
  let minY = viewBox.y;
  let maxX = viewBox.x + viewBox.width;
  let maxY = viewBox.y + viewBox.height;
  let changed = false;

  for (const box of boxes) {
    if (box.width <= 0 && box.height <= 0) continue;
    const nextMinX = box.x - VIEWBOX_MARGIN_PX;
    const nextMinY = box.y - VIEWBOX_MARGIN_PX;
    const nextMaxX = box.x + box.width + VIEWBOX_MARGIN_PX;
    const nextMaxY = box.y + box.height + VIEWBOX_MARGIN_PX;
    if (nextMinX < minX - TEXT_OVERFLOW_EPSILON_PX) {
      minX = nextMinX;
      changed = true;
    }
    if (nextMinY < minY - TEXT_OVERFLOW_EPSILON_PX) {
      minY = nextMinY;
      changed = true;
    }
    if (nextMaxX > maxX + TEXT_OVERFLOW_EPSILON_PX) {
      maxX = nextMaxX;
      changed = true;
    }
    if (nextMaxY > maxY + TEXT_OVERFLOW_EPSILON_PX) {
      maxY = nextMaxY;
      changed = true;
    }
  }

  if (!changed) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function svgBBoxIsNative(): boolean {
  const prototype = typeof SVGGraphicsElement === "undefined"
    ? undefined
    : SVGGraphicsElement.prototype;
  if (!prototype || typeof prototype.getBBox !== "function") return false;
  return /\[native code\]/.test(Function.prototype.toString.call(prototype.getBBox));
}

function formatLength(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function readBox(element: SVGGraphicsElement): AxisBox {
  const box = element.getBBox();
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

function readViewBox(svg: SVGSVGElement): AxisBox {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && (viewBox.width > 0 || viewBox.height > 0)) {
    return { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height };
  }
  const width = Number.parseFloat(svg.getAttribute("width") ?? "");
  const height = Number.parseFloat(svg.getAttribute("height") ?? "");
  return {
    x: 0,
    y: 0,
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
  };
}

function writeViewBox(svg: SVGSVGElement, box: AxisBox): void {
  svg.setAttribute(
    "viewBox",
    `${formatLength(box.x)} ${formatLength(box.y)} ${formatLength(box.width)} ${formatLength(box.height)}`,
  );
  replaceSvgLength(svg, "width", box.width);
  replaceSvgLength(svg, "height", box.height);
}

function replaceSvgLength(svg: SVGSVGElement, name: "width" | "height", value: number): void {
  const current = svg.getAttribute(name);
  if (!current || !/\d/.test(current)) return;
  svg.setAttribute(name, current.replace(/[\d.]+/, formatLength(value)));
}

function smallestContainer(text: SVGTextElement, shapes: readonly SVGGraphicsElement[]): AxisBox | null {
  const textBox = readBox(text);
  if (textBox.width <= 0) return null;
  const centerX = textBox.x + textBox.width / 2;
  const centerY = textBox.y + textBox.height / 2;
  let best: AxisBox | null = null;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const shape of shapes) {
    const box = readBox(shape);
    const area = box.width * box.height;
    if (area <= 0 || area >= bestArea) continue;
    const contains =
      centerX >= box.x &&
      centerX <= box.x + box.width &&
      centerY >= box.y &&
      centerY <= box.y + box.height;
    if (!contains) continue;
    best = box;
    bestArea = area;
  }

  return best;
}

function fitTextElement(text: SVGTextElement, shapes: readonly SVGGraphicsElement[], viewArea: number): void {
  if (text.hasAttribute("textLength")) return;
  const xAttr = text.getAttribute("x") ?? "";
  if (!xAttr || /\s/.test(xAttr)) return;
  const textBox = readBox(text);
  const container = smallestContainer(text, shapes);
  if (!container) return;
  if (container.width * container.height > viewArea * MAX_CONTAINER_AREA_RATIO) return;

  const limit = horizontalTextLimit({
    anchor: text.getAttribute("text-anchor") ?? "start",
    textX: Number.parseFloat(xAttr),
    textWidth: textBox.width,
    shape: container,
  });
  if (limit === null) return;
  text.setAttribute("textLength", formatLength(limit));
  text.setAttribute("lengthAdjust", "spacingAndGlyphs");
}

function fitSvgElement(svg: SVGSVGElement): void {
  const viewBox = readViewBox(svg);
  const viewArea = Math.max(viewBox.width * viewBox.height, 1);
  const shapes = [...svg.querySelectorAll<SVGGraphicsElement>(SHAPE_SELECTOR)].filter(
    (shape) => shape.ownerSVGElement === svg,
  );
  const texts = [...svg.querySelectorAll<SVGTextElement>("text")].filter(
    (text) => text.ownerSVGElement === svg,
  );

  for (const text of texts) {
    fitTextElement(text, shapes, viewArea);
  }

  const expanded = expandViewBox(viewBox, texts.map((text) => readBox(text)));
  if (expanded) writeViewBox(svg, expanded);
}

export function fitPlantUmlSvgText(svg: string): string {
  if (!svgBBoxIsNative() || typeof DOMParser === "undefined" || !svg.includes("<svg")) {
    return svg;
  }

  const repaired = svg.replace(DUPLICATE_XMLNS_PATTERN, "");
  const doc = new DOMParser().parseFromString(repaired, "image/svg+xml");
  const root = doc.documentElement;
  if (root.localName.toLowerCase() !== "svg" || !document.body) {
    return svg;
  }

  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.left = "-10000px";
  host.style.top = "0";
  document.body.appendChild(host);
  const copy = document.importNode(root, true);
  host.appendChild(copy);

  try {
    for (const element of copy.querySelectorAll("svg")) {
      if (element instanceof SVGSVGElement) fitSvgElement(element);
    }
    if (copy instanceof SVGSVGElement) fitSvgElement(copy);
    const declaration = svg.match(/^\s*<\?xml[\s\S]*?\?>\s*/i)?.[0] ?? "";
    return declaration + new XMLSerializer().serializeToString(copy);
  } finally {
    host.remove();
  }
}
