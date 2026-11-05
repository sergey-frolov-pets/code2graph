export interface ImageSize {
  width: number;
  height: number;
}

/** Доли кадра, например 16×9. Не пиксели. */
export interface AspectRatio {
  width: number;
  height: number;
}

export const MIN_IMAGE_SIDE = 64;
export const MAX_IMAGE_SIDE = 4096;

/** Слишком вытянутый кадр превращает диаграмму в полоску. */
const MAX_ASPECT_RATIO = 8;

const ASPECT_PRESET_TOLERANCE = 0.015;

/**
 * Пресеты кадра. Работают для любой диаграммы, которая рендерится в SVG:
 * содержимое вписывается в кадр, а не растягивается.
 */
export const IMAGE_ASPECT_PRESETS: readonly AspectRatio[] = [
  { width: 1, height: 1 },
  { width: 4, height: 3 },
  { width: 3, height: 2 },
  { width: 16, height: 10 },
  { width: 16, height: 9 },
  { width: 21, height: 9 },
  { width: 3, height: 4 },
  { width: 9, height: 16 },
];

const ASPECT_RATIO_PATTERN =
  /^\s*(\d+(?:[.,]\d+)?)\s*[xх×:/]\s*(\d+(?:[.,]\d+)?)\s*$/i;

const SVG_NS = "http://www.w3.org/2000/svg";

const ASPECT_FRAME_ATTR = "data-aspect-frame";

/** Теги, которые нельзя класть под transform: ссылки и стили от этого ломаются. */
const UNMOVED_SVG_TAGS = new Set(["defs", "style", "title", "desc", "metadata", "script"]);

export function clampImageSide(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_IMAGE_SIDE;
  }
  return Math.min(MAX_IMAGE_SIDE, Math.max(MIN_IMAGE_SIDE, Math.round(value)));
}

function formatSvgNumber(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

/**
 * Разбирает «4x3», «16×9», «16:9», «16/9» и кириллическую «х».
 * Возвращает null, если строка не пропорция или кадр слишком вытянутый.
 */
export function parseAspectRatio(input: string): AspectRatio | null {
  const match = ASPECT_RATIO_PATTERN.exec(input.trim());
  if (!match) {
    return null;
  }

  const width = Number(match[1].replace(",", "."));
  const height = Number(match[2].replace(",", "."));
  if (!(width > 0) || !(height > 0)) {
    return null;
  }

  const aspect = width / height;
  if (aspect > MAX_ASPECT_RATIO || 1 / aspect > MAX_ASPECT_RATIO) {
    return null;
  }

  return { width, height };
}

/**
 * Расширяет натуральный кадр до заданных пропорций.
 * Короткая сторона растёт, содержимое не обрезается. Стороны зажимаются в допустимый диапазон.
 */
export function fitSizeToAspectRatio(natural: ImageSize, ratio: AspectRatio): ImageSize {
  const target = ratio.width / ratio.height;
  const baseWidth = natural.width > 0 ? natural.width : MIN_IMAGE_SIDE;
  const baseHeight = natural.height > 0 ? natural.height : MIN_IMAGE_SIDE;
  const current = baseWidth / baseHeight;

  let width = baseWidth;
  let height = baseHeight;
  if (current < target) {
    width = baseHeight * target;
  } else {
    height = baseWidth / target;
  }

  const shrink = Math.min(1, MAX_IMAGE_SIDE / width, MAX_IMAGE_SIDE / height);
  width *= shrink;
  height *= shrink;

  const grow = Math.max(1, MIN_IMAGE_SIDE / width, MIN_IMAGE_SIDE / height);
  width *= grow;
  height *= grow;

  return {
    width: clampImageSide(width),
    height: clampImageSide(height),
  };
}

export function aspectRatiosMatch(size: ImageSize, ratio: AspectRatio): boolean {
  if (size.width <= 0 || size.height <= 0 || ratio.width <= 0 || ratio.height <= 0) {
    return false;
  }

  const actual = size.width / size.height;
  const target = ratio.width / ratio.height;
  return Math.abs(actual - target) / target <= ASPECT_PRESET_TOLERANCE;
}

export function matchingAspectPreset(size: ImageSize): AspectRatio | null {
  for (const preset of IMAGE_ASPECT_PRESETS) {
    if (aspectRatiosMatch(size, preset)) {
      return preset;
    }
  }

  return null;
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

interface ViewBoxRect {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

function readViewBoxRect(root: Element): ViewBoxRect | null {
  const parsed = parseViewBoxSize(root.getAttribute("viewBox"));
  if (!parsed) {
    return null;
  }

  const parts = root.getAttribute("viewBox")?.trim().split(/\s+/).map(Number) ?? [];
  return {
    minX: parts[0] ?? 0,
    minY: parts[1] ?? 0,
    width: parsed.width,
    height: parsed.height,
  };
}

function rootBackgroundFill(root: Element): string {
  const style = root.getAttribute("style") ?? "";
  const match = /background-color\s*:\s*([^;]+)/i.exec(style);
  const color = match?.[1]?.trim() ?? "";
  if (!color || color.toLowerCase() === "transparent" || color.toLowerCase() === "none") {
    return "none";
  }

  return color;
}

/**
 * Ставит у SVG запрошенный размер кадра.
 * Если пропорции не совпадают с видом, содержимое равномерно вписывается в кадр
 * и дополняется полями. Растяжения нет: это один и тот же приём для всех
 * форматов, которые отдают SVG.
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
  const source = readViewBoxRect(root) ?? { minX: 0, minY: 0, width, height };

  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  root.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const sameFrame =
    Math.abs(source.minX) < 0.01 &&
    Math.abs(source.minY) < 0.01 &&
    Math.abs(source.width - width) < 0.5 &&
    Math.abs(source.height - height) < 0.5;
  if (sameFrame) {
    return new XMLSerializer().serializeToString(root);
  }

  const scale = Math.min(width / source.width, height / source.height);
  const offsetX = (width - source.width * scale) / 2;
  const offsetY = (height - source.height * scale) / 2;
  const translateX = offsetX - source.minX * scale;
  const translateY = offsetY - source.minY * scale;

  const frame = doc.createElementNS(SVG_NS, "rect");
  frame.setAttribute(ASPECT_FRAME_ATTR, "1");
  frame.setAttribute("x", "0");
  frame.setAttribute("y", "0");
  frame.setAttribute("width", String(width));
  frame.setAttribute("height", String(height));
  frame.setAttribute("fill", rootBackgroundFill(root));
  frame.setAttribute("stroke", "none");

  const group = doc.createElementNS(SVG_NS, "g");
  group.setAttribute(
    "transform",
    `translate(${formatSvgNumber(translateX)} ${formatSvgNumber(translateY)}) scale(${formatSvgNumber(scale)})`,
  );

  const movable = [...root.children].filter(
    (child) => !UNMOVED_SVG_TAGS.has(child.tagName.toLowerCase()),
  );
  for (const child of movable) {
    group.appendChild(child);
  }

  root.insertBefore(frame, root.firstChild);
  frame.after(group);

  return new XMLSerializer().serializeToString(root);
}
