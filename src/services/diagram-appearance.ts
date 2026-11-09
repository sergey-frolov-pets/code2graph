import { contrastTextColor, parseHexColor } from "@/services/mermaid/ext/common";

/**
 * Окно «Внешний вид» задаёт фон и цвет текста.
 * PlantUML и штатный Mermaid (Гант, block и остальные) рисуют подписи
 * и линии своим цветом темы. На тёмном или своём фоне они пропадают,
 * а заливка задач и блоков должна остаться как в исходнике.
 */

const CANVAS_COVER_SLACK_PX = 1;

const PAGE_INK = new Set([
  "#000000",
  "#181818",
  "#1f2328",
  "#24292f",
  "#333333",
  "#cccccc",
  "#dddddd",
  "#e6edf3",
  "#ffffff",
]);

const STROKE_TAGS = new Set(["line", "polyline", "path", "polygon"]);
const TEXT_TAGS = new Set(["text", "tspan"]);
const HTML_TEXT_TAGS = new Set(["p", "span", "div"]);

export interface DiagramAppearanceInput {
  background?: string;
  textColor?: string;
}

interface AxisBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function opaqueHex(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "transparent" || lower === "none") return null;
  if (lower === "black") return "#000000";
  if (lower === "white") return "#ffffff";
  const rgb = parseHexColor(trimmed);
  if (!rgb) return null;
  const channel = (part: number) => part.toString(16).padStart(2, "0");
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

function isPageInk(color: string | null): boolean {
  return color !== null && PAGE_INK.has(color);
}

function readNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readBox(element: Element): AxisBox | null {
  const x = readNumber(element.getAttribute("x"));
  const y = readNumber(element.getAttribute("y"));
  const width = readNumber(element.getAttribute("width"));
  const height = readNumber(element.getAttribute("height"));
  if (x === null || y === null || width === null || height === null) return null;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function readViewBox(root: Element): AxisBox | null {
  const parts = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/);
  if (parts.length < 4) return null;
  const [x, y, width, height] = parts.map((part) => Number.parseFloat(part));
  if (![x, y, width, height].every((part) => Number.isFinite(part))) return null;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function coversCanvas(box: AxisBox, canvas: AxisBox | null): boolean {
  if (!canvas) return false;
  return (
    box.x <= canvas.x + CANVAS_COVER_SLACK_PX &&
    box.y <= canvas.y + CANVAS_COVER_SLACK_PX &&
    box.width >= canvas.width - CANVAS_COVER_SLACK_PX &&
    box.height >= canvas.height - CANVAS_COVER_SLACK_PX
  );
}

function containsPoint(box: AxisBox, x: number, y: number): boolean {
  return x >= box.x && y >= box.y && x <= box.x + box.width && y <= box.y + box.height;
}

function styleDeclaration(style: string, name: string): string | null {
  const pattern = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;!]+)`, "i");
  const match = pattern.exec(style);
  return match?.[1]?.trim() ?? null;
}

function solidFill(element: Element): string | null {
  const style = element.getAttribute("style") ?? "";
  const raw = styleDeclaration(style, "fill") ?? element.getAttribute("fill");
  return opaqueHex(raw);
}

function explicitPaint(element: Element): string | null {
  const style = element.getAttribute("style") ?? "";
  const raw =
    styleDeclaration(style, "fill") ??
    styleDeclaration(style, "color") ??
    element.getAttribute("fill") ??
    element.getAttribute("color");
  return opaqueHex(raw);
}

function setSvgBackground(root: Element, color: string): void {
  const style = root.getAttribute("style") ?? "";
  const without = style
    .replace(/(?:^|;)\s*background(?:-color)?\s*:[^;]*/gi, "")
    .replace(/^;+|;+$/g, "")
    .trim();
  root.setAttribute(
    "style",
    without ? `${without};background-color:${color}` : `background-color:${color}`,
  );
}

function paintElement(element: Element, color: string): void {
  const name = element.localName.toLowerCase();
  if (TEXT_TAGS.has(name)) {
    element.setAttribute("fill", color);
  }
  const style = element.getAttribute("style") ?? "";
  const cleaned = style
    .replace(/(?:^|;)\s*(?:fill|color)\s*:[^;]*/gi, "")
    .replace(/^;+|;+$/g, "")
    .trim();
  const next = `fill:${color} !important;color:${color} !important`;
  element.setAttribute("style", cleaned ? `${cleaned};${next}` : next);
}

function anchorPoint(element: Element): { x: number; y: number } | null {
  const name = element.localName.toLowerCase();
  if (name === "foreignobject" || HTML_TEXT_TAGS.has(name)) {
    const box = readBox(name === "foreignobject" ? element : foreignObjectOf(element) ?? element);
    if (!box) return null;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  const x = readNumber(element.getAttribute("x"));
  const y = readNumber(element.getAttribute("y"));
  if (x === null || y === null) return null;
  return { x, y };
}

function foreignObjectOf(element: Element): Element | null {
  let current: Element | null = element;
  while (current) {
    if (current.localName.toLowerCase() === "foreignobject") return current;
    current = current.parentElement;
  }
  return null;
}

function classList(element: Element): string[] {
  return (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

function closestNode(element: Element): Element | null {
  let current: Element | null = element;
  while (current) {
    if (classList(current).includes("node")) return current;
    current = current.parentElement;
  }
  return null;
}

function nodeLook(element: Element): string | null {
  return element.getAttribute("data-look");
}

interface CssRule {
  selector: string;
  body: string;
}

function extractKeyframes(css: string): { rest: string; frames: string } {
  const frames: string[] = [];
  const rest = css.replace(/@-?(?:webkit-)?keyframes\b[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/gi, (block) => {
    frames.push(block);
    return "";
  });
  return { rest, frames: frames.join("") };
}

function cssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match = pattern.exec(css);
  while (match) {
    rules.push({ selector: match[1] ?? "", body: match[2] ?? "" });
    match = pattern.exec(css);
  }
  return rules;
}

const NODE_SHAPE_SELECTOR = "rect, polygon, ellipse, circle, path";

/** Вложенные path (формулы KaTeX, иконки) не задают заливку самого блока. */
function isNodeShapeRule(selector: string): boolean {
  if (!selector.includes(".node")) return false;
  if (!/\b(?:rect|path|circle|polygon|ellipse)\b/.test(selector)) return false;
  return !/katex|label-icon|icon-shape|marker|arrowhead/.test(selector);
}

function cssNodeFill(css: string, look: string | null): string | null {
  let generic: string | null = null;
  let looked: string | null = null;
  for (const rule of cssRules(css)) {
    const selector = rule.selector.toLowerCase();
    if (!isNodeShapeRule(selector)) continue;
    const fill = opaqueHex(styleDeclaration(rule.body, "fill"));
    if (!fill) continue;
    if (look && selector.includes(`data-look="${look}"`)) {
      looked = fill;
    } else if (!selector.includes("data-look")) {
      generic = fill;
    }
  }
  return looked ?? generic;
}

function stylesheetText(root: Element): string {
  return [...root.querySelectorAll("style")]
    .map((style) => style.textContent ?? "")
    .join("\n");
}

function shapeFillIn(container: Element, canvas: AxisBox | null): string | null {
  for (const shape of container.querySelectorAll(NODE_SHAPE_SELECTOR)) {
    const fill = solidFill(shape);
    if (!fill) continue;
    const box = readBox(shape);
    if (box && coversCanvas(box, canvas)) continue;
    return fill;
  }
  return null;
}

function siblingShapeFill(element: Element, canvas: AxisBox | null): string | null {
  const parent = element.parentElement;
  const point = anchorPoint(element);
  if (!parent || !point) return null;
  for (const child of parent.children) {
    if (child === element || child.contains(element)) continue;
    if (child.localName.toLowerCase() !== "rect") continue;
    const fill = solidFill(child);
    const box = readBox(child);
    if (!fill || !box || coversCanvas(box, canvas)) continue;
    if (containsPoint(box, point.x, point.y)) return fill;
  }
  return null;
}

function fillBehind(element: Element, canvas: AxisBox | null, css: string): string | null {
  const node = closestNode(element);
  if (node) {
    return shapeFillIn(node, canvas) ?? cssNodeFill(css, nodeLook(node));
  }
  return siblingShapeFill(element, canvas);
}

function isHtmlLabel(element: Element): boolean {
  return HTML_TEXT_TAGS.has(element.localName.toLowerCase()) && foreignObjectOf(element) !== null;
}

function recolorLabels(
  root: Element,
  pageText: string,
  canvas: AxisBox | null,
  css: string,
): void {
  for (const element of root.querySelectorAll("*")) {
    const name = element.localName.toLowerCase();
    if (!TEXT_TAGS.has(name) && !isHtmlLabel(element)) continue;
    const current = explicitPaint(element);
    if (current && !isPageInk(current)) continue;
    const behind = fillBehind(element, canvas, css);
    const target = behind ? contrastTextColor(behind) ?? pageText : pageText;
    paintElement(element, target);
  }
}

function recolorInkStrokes(root: Element, pageText: string): void {
  for (const element of root.querySelectorAll("line, polyline, path, polygon")) {
    if (!STROKE_TAGS.has(element.localName.toLowerCase())) continue;
    const fill = solidFill(element);
    if (fill && !isPageInk(fill)) continue;
    const stroke = opaqueHex(element.getAttribute("stroke"));
    if (stroke && isPageInk(stroke)) element.setAttribute("stroke", pageText);
    if (fill && isPageInk(fill)) element.setAttribute("fill", pageText);
  }
}

function isEdgeSelector(selector: string): boolean {
  const lower = selector.toLowerCase();
  if (/label|span|\btext\b|title|\.node/.test(lower)) return false;
  return /marker|arrowhead|flowchart-link|edge-pattern|relation/.test(lower);
}

function rewriteEdgeInk(css: string, pageText: string): string {
  const { rest, frames } = extractKeyframes(css);
  const rewritten = rest.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector: string, body: string) => {
    if (!isEdgeSelector(selector)) return rule;
    const next = body.replace(
      /(fill|stroke)\s*:\s*(#[0-9a-f]{3,8})/gi,
      (declaration, property: string, color: string) => {
        const hex = opaqueHex(color);
        if (!hex || !isPageInk(hex)) return declaration;
        return `${property}:${pageText}`;
      },
    );
    return `${selector}{${next}}`;
  });
  return `${rewritten}${frames}`;
}

function recolorEdgeStyles(root: Element, pageText: string): void {
  for (const style of root.querySelectorAll("style")) {
    const text = style.textContent ?? "";
    const next = rewriteEdgeInk(text, pageText);
    if (next !== text) style.textContent = next;
  }
}

/**
 * Подгоняет подписи и линии темы под фон окна «Внешний вид».
 * Заливка фигур (полосы Ганта, `style` у блоков) не меняется.
 * Текст на фигуре остаётся контрастным к её заливке, а не к фону холста.
 */
export function applyDiagramAppearance(svg: string, options: DiagramAppearanceInput): string {
  if (!svg.includes("<svg") || typeof DOMParser === "undefined") return svg;

  const background = opaqueHex(options.background);
  const manualText = opaqueHex(options.textColor);
  const pageText = manualText ?? (background ? contrastTextColor(background) : null);
  if (!background && !pageText) return svg;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") return svg;

  if (background) setSvgBackground(root, background);
  if (!pageText) return new XMLSerializer().serializeToString(root);

  const canvas = readViewBox(root);
  const css = extractKeyframes(stylesheetText(root)).rest;
  recolorLabels(root, pageText, canvas, css);
  recolorInkStrokes(root, pageText);
  recolorEdgeStyles(root, pageText);
  return new XMLSerializer().serializeToString(root);
}
