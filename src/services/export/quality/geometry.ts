/**
 * Геометрия и цвет для проверок качества SVG.
 *
 * Работает без браузерной раскладки: ширина текста оценивается по метрикам
 * `diagram-text-metrics` (то же, что использует PlantUML-фит), координаты
 * берутся из атрибутов, смещения — из `transform="translate(...)"` предков.
 * Повороты и масштабы не учитываются: проверки эвристические, а лишний шум
 * на старте дороже точности.
 */

import { estimateElementTextBox, elementFontSizePx } from "@/services/diagram-text-metrics";
import { toOpaqueColor } from "../svg-background";

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

/** [(x1, y1), (x2, y2)] — отрезок прямой. */
export type Segment = [Point, Point];

const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  silver: [192, 192, 192],
  lightgray: [211, 211, 211],
  lightgrey: [211, 211, 211],
  darkgray: [169, 169, 169],
  darkgrey: [169, 169, 169],
};

/** Цвет в rgb, или null если разобрать не удалось (градиент, url(#…)). */
export function parseColorRgb(value: string | null | undefined): [number, number, number] | null {
  if (!value) {
    return null;
  }
  const raw = toOpaqueColor(value).toLowerCase();
  if (!raw) {
    return null;
  }
  const named = NAMED_COLORS[raw];
  if (named) {
    return named;
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    const digits = hex[1];
    return [
      parseInt(digits.slice(0, 2), 16),
      parseInt(digits.slice(2, 4), 16),
      parseInt(digits.slice(4, 6), 16),
    ];
  }
  const short = /^#([0-9a-f]{3})$/i.exec(raw);
  if (short) {
    const [r, g, b] = short[1].split("");
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(raw);
  if (fn) {
    const parts = fn[1]
      .split(/[,/]/)
      .map((part) => Number.parseFloat(part.trim()))
      .filter((part) => Number.isFinite(part));
    if (parts.length >= 3) {
      return [parts[0], parts[1], parts[2]];
    }
  }
  return null;
}

function channelLuminance(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Коэффициент контраста WCAG: 1 — неразличимо, 21 — чёрное на белом. */
export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function styleValue(element: Element, property: string): string {
  const inline = (element as HTMLElement).style?.getPropertyValue?.(property) ?? "";
  if (inline) {
    return inline.trim();
  }
  const styleText = element.getAttribute("style") ?? "";
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i").exec(styleText);
  return match ? match[1].trim() : "";
}

/** Значение свойства с наследованием вверх по дереву (`fill`, `color`). */
export function inheritedPaint(element: Element, property: "fill" | "color"): string {
  let current: Element | null = element;
  while (current && current.nodeType === 1) {
    const fromStyle = styleValue(current, property);
    if (fromStyle) {
      return fromStyle;
    }
    const attribute = current.getAttribute?.(property);
    if (attribute) {
      return attribute;
    }
    current = current.parentElement;
  }
  return "";
}

function parseTranslate(transform: string): Point | null {
  const translate = /translate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?/i.exec(transform);
  if (translate) {
    return { x: Number.parseFloat(translate[1]), y: Number.parseFloat(translate[2] ?? "0") };
  }
  const matrix = /matrix\(\s*[^)]*?,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i.exec(transform);
  if (matrix) {
    return { x: Number.parseFloat(matrix[1]), y: Number.parseFloat(matrix[2]) };
  }
  return null;
}

/** Суммарное смещение от `transform="translate(...)"` предков. */
export function ancestorOffset(element: Element): Point {
  let x = 0;
  let y = 0;
  let current: Element | null = element;
  while (current) {
    const transform = current.getAttribute?.("transform");
    if (transform) {
      const move = parseTranslate(transform);
      if (move) {
        x += move.x;
        y += move.y;
      }
    }
    current = current.parentElement;
  }
  return { x, y };
}

/** Первое число из атрибута вида "12" или "12 34". */
export function firstNumber(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }
  const match = /[-\d.]+/.exec(raw);
  if (!match) {
    return null;
  }
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

/** Прямоугольник подписи с учётом `text-anchor` и смещений предков. */
export function textBox(element: Element): Box | null {
  const text = (element.textContent ?? "").trim();
  if (!text) {
    return null;
  }
  const local = estimateElementTextBox(element);
  const shift = ancestorOffset(element);
  const anchorX = firstNumber(element.getAttribute("x")) ?? 0;
  const anchorY = firstNumber(element.getAttribute("y")) ?? 0;
  const anchor = (element.getAttribute("text-anchor") ?? "start").toLowerCase();
  const left = anchor === "middle" ? -local.width / 2 : anchor === "end" ? -local.width : 0;
  return {
    left: anchorX + left + shift.x,
    right: anchorX + left + local.width + shift.x,
    top: anchorY + local.top + shift.y,
    bottom: anchorY + local.top + local.height + shift.y,
  };
}

/** Габариты фигуры: rect, ellipse, circle, polygon. */
export function shapeBox(element: Element): Box | null {
  const tag = element.tagName.toLowerCase();
  const shift = ancestorOffset(element);
  const number = (name: string): number => firstNumber(element.getAttribute(name)) ?? 0;
  if (tag === "rect") {
    const x = number("x");
    const y = number("y");
    return {
      left: x + shift.x,
      top: y + shift.y,
      right: x + number("width") + shift.x,
      bottom: y + number("height") + shift.y,
    };
  }
  if (tag === "ellipse" || tag === "circle") {
    const cx = number("cx") + shift.x;
    const cy = number("cy") + shift.y;
    const rx = tag === "circle" ? number("r") : number("rx");
    const ry = tag === "circle" ? number("r") : number("ry");
    return { left: cx - rx, top: cy - ry, right: cx + rx, bottom: cy + ry };
  }
  if (tag === "polygon" || tag === "polyline") {
    const box = pointsBox(element, shift);
    return box;
  }
  return null;
}

function pointsBox(element: Element, shift: Point): Box | null {
  const points = pointsOf(element);
  if (points.length === 0) {
    return null;
  }
  const xs = points.map((point) => point.x + shift.x);
  const ys = points.map((point) => point.y + shift.y);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
}

function pointsOf(element: Element): Point[] {
  const raw = element.getAttribute("points") ?? "";
  const numbers = raw.match(/[-\d.]+/g) ?? [];
  const points: Point[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: Number.parseFloat(numbers[index]), y: Number.parseFloat(numbers[index + 1]) });
  }
  return points;
}

/**
 * Отрезки элемента. Кривые Безье и дуги аппроксимируются хордой по конечным
 * точкам команды — для эвристик «пересекает / не пересекает» этого достаточно,
 * а неразобранные команды просто пропускаются, чтобы не давать ложных срабатываний.
 */
export function segmentsOf(element: Element): Segment[] {
  const tag = element.tagName.toLowerCase();
  const shift = ancestorOffset(element);
  const move = (point: Point): Point => ({ x: point.x + shift.x, y: point.y + shift.y });

  if (tag === "line") {
    const number = (name: string): number => firstNumber(element.getAttribute(name)) ?? 0;
    return [
      [
        move({ x: number("x1"), y: number("y1") }),
        move({ x: number("x2"), y: number("y2") }),
      ],
    ];
  }

  const points = pointsOf(element).map(move);
  if (points.length >= 2) {
    const segments: Segment[] = [];
    for (let index = 1; index < points.length; index += 1) {
      segments.push([points[index - 1], points[index]]);
    }
    return segments;
  }

  const path = element.getAttribute("d");
  if (!path) {
    return [];
  }
  return pathSegments(path, move);
}

function pathSegments(path: string, move: (point: Point) => Point): Segment[] {
  const commands = path.match(/[a-zA-Z][^a-zA-Z]*/g) ?? [];
  const segments: Segment[] = [];
  let cursor: Point | null = null;
  let start: Point | null = null;

  for (const chunk of commands) {
    const command = chunk[0];
    const upper = command.toUpperCase();
    const numbers = (chunk.slice(1).match(/[-\d.]+/g) ?? []).map(Number.parseFloat);
    const pairs: Point[] = [];
    for (let index = 0; index + 1 < numbers.length; index += 2) {
      pairs.push({ x: numbers[index], y: numbers[index + 1] });
    }

    if (upper === "M" && pairs.length > 0) {
      cursor = move(pairs[0]);
      start = cursor;
      for (let index = 1; index < pairs.length; index += 1) {
        const next = move(pairs[index]);
        segments.push([cursor, next]);
        cursor = next;
      }
      continue;
    }
    if (upper === "L" || upper === "H" || upper === "V") {
      const targets: Point[] = [];
      if (upper === "L") {
        targets.push(...pairs);
      } else if (upper === "H") {
        targets.push(...numbers.map((x) => ({ x, y: cursor?.y ?? 0 })));
      } else {
        targets.push(...numbers.map((y) => ({ x: cursor?.x ?? 0, y })));
      }
      for (const target of targets) {
        const next = move(target);
        if (cursor) {
          segments.push([cursor, next]);
        }
        cursor = next;
      }
      continue;
    }
    if (upper === "Z" && cursor && start) {
      segments.push([cursor, start]);
      cursor = start;
    }
    // C/S/Q/T/A не разбираем: хорда по конечной точке дала бы ложные пересечения.
  }
  return segments;
}

export function pointInBox(point: Point, box: Box, slack = 0): boolean {
  return (
    point.x >= box.left - slack &&
    point.x <= box.right + slack &&
    point.y >= box.top - slack &&
    point.y <= box.bottom + slack
  );
}

export function boxesOverlap(a: Box, b: Box, slack = 0): boolean {
  return (
    a.left < b.right - slack &&
    b.left < a.right - slack &&
    a.top < b.bottom - slack &&
    b.top < a.bottom - slack
  );
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Пересекаются ли отрезки (включая касание концами). */
export function segmentsIntersect(a: Segment, b: Segment, epsilon = 1e-6): boolean {
  const [p1, p2] = a;
  const [q1, q2] = b;
  const d1 = orientation(q1, q2, p1);
  const d2 = orientation(q1, q2, p2);
  const d3 = orientation(p1, p2, q1);
  const d4 = orientation(p1, p2, q2);
  return (
    ((d1 > epsilon && d2 < -epsilon) || (d1 < -epsilon && d2 > epsilon)) &&
    ((d3 > epsilon && d4 < -epsilon) || (d3 < -epsilon && d4 > epsilon))
  );
}

/** Пересекает ли отрезок прямоугольник (без учёта вложенности концов). */
export function segmentCrossesBox(segment: Segment, box: Box): boolean {
  const [a, b] = segment;
  const corners: Point[] = [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.right, y: box.bottom },
    { x: box.left, y: box.bottom },
  ];
  const edges: Segment[] = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]],
  ];
  for (const edge of edges) {
    if (segmentsIntersect([a, b], edge)) {
      return true;
    }
  }
  // Отрезок целиком внутри фигуры — тоже пересечение.
  return pointInBox(a, box) && pointInBox(b, box);
}

export function pointSegmentDistance(point: Point, segment: Segment): number {
  const [a, b] = segment;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }
  const t = Math.min(1, Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function boxCenter(box: Box): Point {
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

/** Подписи диаграммы: `<text>`, но не `<tspan>` и не текст внутри foreignObject. */export function textElements(root: Element): Element[] {
  return Array.from(root.querySelectorAll("text")).filter((element) => {
    if (!(element.textContent ?? "").trim()) {
      return false;
    }
    return element.closest("foreignObject") === null;
  });
}

export function shapes(root: Element): Element[] {
  return Array.from(root.querySelectorAll("rect, ellipse, circle, polygon")).filter(
    (element) => shapeBox(element) !== null,
  );
}

export function edges(root: Element): Element[] {
  return Array.from(root.querySelectorAll("line, polyline, path")).filter(
    (element) => segmentsOf(element).length > 0,
  );
}

export interface ShapeItem {
  element: Element;
  box: Box;
}

/** Фигуры с габаритами: общий вход для фона и «подпись внутри узла». */
export function shapeItems(root: Element): ShapeItem[] {
  const items: ShapeItem[] = [];
  for (const element of Array.from(root.querySelectorAll("rect, ellipse, circle, polygon"))) {
    const box = shapeBox(element);
    if (box) {
      items.push({ element, box });
    }
  }
  return items;
}

function boxArea(box: Box): number {
  return Math.max(0, box.right - box.left) * Math.max(0, box.bottom - box.top);
}

/**
 * Самая маленькая фигура, накрывающая точку, — она и есть подложка подписи.
 *
 * В SVG подпись узла не вложена в его `<rect>`, поэтому принадлежность
 * определяется геометрией, а не деревом.
 */
export function containingShape(items: ShapeItem[], point: Point): ShapeItem | null {
  let best: ShapeItem | null = null;
  let bestArea = Number.POSITIVE_INFINITY;
  for (const item of items) {
    if (!pointInBox(point, item.box)) {
      continue;
    }
    const area = boxArea(item.box);
    if (area < bestArea) {
      best = item;
      bestArea = area;
    }
  }
  return best;
}

export function fontSizeOf(element: Element): number {
  return elementFontSizePx(element);
}
