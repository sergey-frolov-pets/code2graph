import {
  arrowMarker,
  clamp,
  contrastTextColor,
  createSvg,
  fmt,
  getPalette,
  hasLabelBreak,
  labelLineStep,
  measureText,
  monoFlagsFromMode,
  monoGray,
  monoPaint,
  parseMonoDirective,
  splitLabelLines,
  usesInvertedMono,
  type SvgBuilder,
} from "../common";
import {
  avatarBoxSize,
  parseAvatarDirective,
  parseGender,
  renderAvatarBox,
  sanitizePhotoHref,
  type AvatarGender,
} from "./avatar";
import { growPlotToAspect, parseAspectDirective, type ChartAspect } from "../chart-aspect";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";
import { isColor } from "./waterfall/directive-parsers";

// --- Модель ---------------------------------------------------------------

export type OrgEdgeStyle = "solid" | "dotted";

/** Стиль обводки блока: сплошная, штрих, точки, штрих-пунктир. */
export type OrgBorderStyle = "solid" | "dash" | "dot" | "dashdot";

export interface OrgNode {
  id: string;
  label: string;
  /** Заливка (`color=` / `fill=`). */
  fill?: string;
  /** Цвет границы (`border=` / `stroke=`). */
  border?: string;
  /** Стиль границы (`style=` или `border=dash`). */
  borderStyle?: OrgBorderStyle;
  /** Толщина границы в px (`width=`). */
  borderWidth?: number;
  /** Снимок `photo=`. */
  photo?: string;
  /** Силуэт, если снимка нет. */
  gender?: AvatarGender;
  /** `avatar=off` прячет блок только у этого узла. */
  hideAvatar?: boolean;
}

export interface OrgEdge {
  from: string;
  to: string;
  style: OrgEdgeStyle;
}

export interface OrgModel {
  title?: string;
  /** `mono` — блоки отличаются светлотой, а не цветом. */
  mono?: boolean;
  /** `mono invert` — светлая серая шкала для тёмного фона. */
  monoInvert?: boolean;
  nodes: OrgNode[];
  edges: OrgEdge[];
  /** id реального корня; null — корней несколько. */
  root: string | null;
  /** true — корней несколько, рисуется виртуальный корень. */
  virtualRoot: boolean;
  ratio?: ChartAspect;
  /**
   * Сторона блока фото. 0 — аватар выключен (так и есть, пока нет `avatar`).
   * Старые схемы без директивы рисуются как раньше.
   */
  avatarSize: number;
}

/** Служебный id виртуального корня. */
export const VIRTUAL_ROOT_ID = "__root__";

// --- Разбор ---------------------------------------------------------------

function unquote(raw: string): string {
  const t = String(raw ?? "").trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

export { splitLabelLines } from "../common";

function unquoteLabel(raw: string): string {
  const base = unquote(raw).replace(/\\\[/g, "[").replace(/\\\]/g, "]");
  if (!base) return "";
  // Всегда нормализуем: `\n` становится настоящим переводом строки,
  // пробелы по краям строк снимаются — как до выноса splitLabelLines в common.
  const parts = base.split(/\\n|\r?\n/).map((line) => line.trim());
  const nonEmpty = parts.filter((line) => line.length > 0);
  return (nonEmpty.length > 0 ? nonEmpty : [""]).join("\n");
}

const DEFAULT_NODE_STROKE_WIDTH = 1.2;
const MIN_NODE_STROKE_WIDTH = 0.5;
const MAX_NODE_STROKE_WIDTH = 8;

/** Штрих границы. `solid` — без dasharray. */
const BORDER_DASH: Record<OrgBorderStyle, string | undefined> = {
  solid: undefined,
  dash: "7 4",
  dot: "1.5 3.5",
  dashdot: "8 3 1.5 3",
};

const FILL_KEYS = new Set(["color", "colour", "fill"]);
const BORDER_KEYS = new Set(["border", "stroke"]);
const STYLE_KEYS = new Set(["style", "borderstyle", "border-style"]);
const WIDTH_KEYS = new Set(["width", "thickness", "borderwidth", "border-width"]);

const NODE_ATTR_RE =
  /^(border-style|borderstyle|border-width|borderwidth|color|colour|fill|border|stroke|style|width|thickness|photo|gender|avatar)=("[^"]*"|'[^']*'|\S*)\s*/i;

/** Имена, которые принимает `isColor`, в hex — чтобы подобрать контрастный текст. */
const NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  orange: "#ffa500",
  purple: "#800080",
  teal: "#008080",
  navy: "#000080",
  maroon: "#800000",
  olive: "#808000",
  gold: "#ffd700",
  crimson: "#dc143c",
  steelblue: "#4682b4",
  darkgreen: "#006400",
  darkred: "#8b0000",
  darkblue: "#00008b",
};

interface OrgNodePaint {
  fill?: string;
  border?: string;
  borderStyle?: OrgBorderStyle;
  borderWidth?: number;
  photo?: string;
  gender?: AvatarGender;
  hideAvatar?: boolean;
}

function unquoteAttr(raw: string): string {
  const t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function normalizeBorderStyle(raw: string): OrgBorderStyle | null {
  const t = raw.trim().toLowerCase();
  switch (t) {
    case "solid":
    case "none":
    case "-":
      return "solid";
    case "dash":
    case "dashed":
    case "dashes":
    case "--":
      return "dash";
    case "dot":
    case "dotted":
    case "dots":
    case "..":
      return "dot";
    case "dashdot":
    case "dash-dot":
    case "-.":
      return "dashdot";
    default:
      return null;
  }
}

function lastUnescaped(raw: string, ch: string): number {
  let last = -1;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === "\\") {
      i += 1;
      continue;
    }
    if (raw[i] === ch) last = i;
  }
  return last;
}

function firstUnescaped(raw: string, ch: string): number {
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === "\\") {
      i += 1;
      continue;
    }
    if (raw[i] === ch) return i;
  }
  return -1;
}

/**
 * Подпись в `[...]` остаётся подписью, даже если внутри есть `color=`.
 * Параметры пишутся после закрывающей скобки: `id [роль] color=#hex style=dash`.
 * Без скобок параметры — хвост из `key=value`.
 */
const NODE_ATTR_START_RE =
  /(?:^|\s)(?:border-style|borderstyle|border-width|borderwidth|color|colour|fill|border|stroke|style|width|thickness|photo|gender|avatar)=/i;

function splitNodeAttrs(raw: string): { body: string; tail: string } {
  const open = firstUnescaped(raw, "[");
  const close = lastUnescaped(raw, "]");
  if (open >= 0 && close > open) {
    return { body: raw.slice(0, close + 1).trim(), tail: raw.slice(close + 1).trim() };
  }
  const attrAt = NODE_ATTR_START_RE.exec(raw);
  if (attrAt && attrAt.index > 0) {
    return { body: raw.slice(0, attrAt.index).trim(), tail: raw.slice(attrAt.index).trim() };
  }
  if (attrAt && attrAt.index === 0) return { body: "", tail: raw.trim() };
  return { body: raw.trim(), tail: "" };
}

function parseNodeAttrs(
  tail: string,
): { paint?: OrgNodePaint; error?: string } {
  if (!tail) return { paint: {} };
  const paint: OrgNodePaint = {};
  let rest = tail.trim();
  for (let guard = 0; guard < 24 && rest; guard += 1) {
    const match = NODE_ATTR_RE.exec(rest);
    if (!match) {
      return {
        error: `неизвестный параметр узла «${rest}» (ожидается color=, border=, style= или width=)`,
      };
    }
    const key = match[1].toLowerCase();
    const value = unquoteAttr(match[2]);
    if (FILL_KEYS.has(key)) {
      if (!isColor(value)) {
        return {
          error: `не удалось разобрать цвет блока «${value}» (ожидается #rgb, #rrggbb или имя цвета)`,
        };
      }
      paint.fill = value;
    } else if (BORDER_KEYS.has(key)) {
      const asStyle = key === "border" ? normalizeBorderStyle(value) : null;
      if (asStyle) {
        paint.borderStyle = asStyle;
      } else if (isColor(value)) {
        paint.border = value;
      } else {
        return {
          error: `граница блока: ожидается цвет (#hex или имя) или стиль solid|dash|dot|dashdot, получено «${value}»`,
        };
      }
    } else if (STYLE_KEYS.has(key)) {
      const style = normalizeBorderStyle(value);
      if (!style) {
        return {
          error: `стиль границы: ожидается solid|dash|dot|dashdot, получено «${value}»`,
        };
      }
      paint.borderStyle = style;
    } else if (WIDTH_KEYS.has(key)) {
      const width = Number(value.replace(/\s*(px|pt)$/i, "").replace(",", "."));
      if (!Number.isFinite(width) || width <= 0) {
        return {
          error: `толщина границы: ожидается положительное число, получено «${value}»`,
        };
      }
      paint.borderWidth = clamp(width, MIN_NODE_STROKE_WIDTH, MAX_NODE_STROKE_WIDTH);
    } else if (key === "photo") {
      const href = sanitizePhotoHref(value);
      if (!href) {
        return {
          error: `фото: ожидается http(s)-адрес или data:image (png, jpeg, gif, webp), получено «${value.slice(0, 48)}»`,
        };
      }
      paint.photo = href;
    } else if (key === "gender") {
      const gender = parseGender(value);
      if (!gender) {
        return { error: `пол: ожидается m, f или ?, получено «${value}»` };
      }
      paint.gender = gender;
    } else if (key === "avatar") {
      if (!/^(off|none|hide)$/i.test(value)) {
        return { error: `avatar узла: ожидается off, получено «${value}»` };
      }
      paint.hideAvatar = true;
    }
    rest = rest.slice(match[0].length).trim();
  }
  if (rest) {
    return {
      error: `неизвестный параметр узла «${rest}» (ожидается color=, border=, style= или width=)`,
    };
  }
  return { paint };
}

/** `A [Подпись] color=#hex style=dash` → узел с заливкой и границей. */
function parseNodeLine(raw: string): { node?: OrgNode; error?: string } {
  const { body, tail } = splitNodeAttrs(raw);
  const attrs = parseNodeAttrs(tail);
  if (attrs.error) return { error: attrs.error };

  const bracket = /^(.*?)\s*\[(.*)\]\s*$/.exec(body);
  let id: string;
  let label: string;
  if (bracket) {
    id = unquote(bracket[1]);
    const parsedLabel = unquoteLabel(bracket[2]);
    label = parsedLabel || id;
  } else {
    id = unquote(body);
    label = unquoteLabel(body) || id;
  }
  return { node: { id, label, ...attrs.paint } };
}

function applyPaint(node: OrgNode, paint?: OrgNodePaint): void {
  if (!paint) return;
  if (paint.fill) node.fill = paint.fill;
  if (paint.border) node.border = paint.border;
  if (paint.borderStyle) node.borderStyle = paint.borderStyle;
  if (paint.borderWidth) node.borderWidth = paint.borderWidth;
  if (paint.photo) node.photo = paint.photo;
  if (paint.gender) node.gender = paint.gender;
  if (paint.hideAvatar) node.hideAvatar = true;
}

/** Hex или имя → цвет, по которому можно посчитать контраст текста. */
function colorForContrast(color: string): string {
  const named = NAMED_COLORS[color.trim().toLowerCase()];
  if (named) return named;
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(color.trim());
  if (!rgb) return color;
  const channel = (part: string) =>
    Math.max(0, Math.min(255, Math.round(Number(part))))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(rgb[1])}${channel(rgb[2])}${channel(rgb[3])}`;
}

/**
 * Разбор строки ребра: «A --> B» (сплошная) или «A -.-> B» (пунктир).
 * Ищем стрелку как подстроку, а не регуляркой — так нагляднее и без ловушек
 * с экранированием «-» и «>».
 */
function parseEdgeLine(raw: string): { from: string; to: string; style: OrgEdgeStyle } | null {
  const dotted = "-.->";
  const solid = "-" + ">" + "";
  let idx = raw.indexOf(dotted);
  let arrowLen = dotted.length;
  let style: OrgEdgeStyle = "dotted";
  if (idx < 0) {
    idx = raw.indexOf(solid);
    arrowLen = solid.length;
    style = "solid";
  }
  if (idx < 0) return null;
  const from = unquote(raw.slice(0, idx));
  const to = unquote(raw.slice(idx + arrowLen));
  if (!from || !to) return null;
  return { from, to, style };
}

export function parseOrgchart(source: string): ExtParseResult<OrgModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);

  let title: string | undefined;
  let mono = false;
  let monoInvert = false;
  let ratio: ChartAspect | undefined;
  let avatarSize = 0;
  const nodes: OrgNode[] = [];
  const nodeIndex = new Map<string, OrgNode>();
  const edges: OrgEdge[] = [];
  let seenType = false;

  const ensureNode = (id: string, label?: string, paint?: OrgNodePaint): OrgNode => {
    const existing = nodeIndex.get(id);
    if (existing) {
      if (label && existing.label === existing.id) existing.label = label;
      applyPaint(existing, paint);
      return existing;
    }
    const node: OrgNode = { id, label: label || id };
    applyPaint(node, paint);
    nodeIndex.set(id, node);
    nodes.push(node);
    return node;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;

    if (!seenType) {
      seenType = true;
      continue; // первая значимая строка — ключевое слово типа
    }

    if (/^title\b/i.test(raw)) {
      title = raw.replace(/^title\s*/i, "").trim() || undefined;
      continue;
    }

    const aspect = parseAspectDirective(raw);
    if (aspect) {
      if ("error" in aspect) {
        errors.push({ message: aspect.error, line: lineNo, col: 0 });
      } else {
        ratio = aspect.aspect;
      }
      continue;
    }

    const avatarDirective = parseAvatarDirective(raw);
    if (avatarDirective) {
      if ("error" in avatarDirective) {
        errors.push({ message: avatarDirective.error, line: lineNo, col: 0 });
      } else {
        avatarSize = avatarDirective.enabled ? avatarDirective.size : 0;
      }
      continue;
    }

    if (/^mono\b/i.test(raw)) {
      const parsed = parseMonoDirective(raw.replace(/^mono\s*/i, ""));
      if ("error" in parsed) {
        errors.push({ message: parsed.error, line: lineNo, col: 0 });
      } else {
        const flags = monoFlagsFromMode(parsed.mode);
        mono = flags.mono;
        monoInvert = flags.monoInvert;
      }
      continue;
    }

    const edgeMatch = parseEdgeLine(raw);
    if (edgeMatch) {
      ensureNode(edgeMatch.from);
      ensureNode(edgeMatch.to);
      edges.push({ from: edgeMatch.from, to: edgeMatch.to, style: edgeMatch.style });
      continue;
    }

    // Строка со стрелкой, но не по шаблону — синтаксическая ошибка ребра.
    if (/->|=>|<-/.test(raw)) {
      errors.push({
        message: `недопустимый синтаксис ребра «${raw}»: ожидается «A -> B» или «A -.-> B»`,
        line: lineNo,
        col: 0,
      });
      continue;
    }

    const parsedNode = parseNodeLine(raw);
    if (parsedNode.error || !parsedNode.node) {
      errors.push({
        message: parsedNode.error ?? `пустой идентификатор узла в строке «${raw}»`,
        line: lineNo,
        col: 0,
      });
      continue;
    }
    if (!parsedNode.node.id) {
      errors.push({ message: `пустой идентификатор узла в строке «${raw}»`, line: lineNo, col: 0 });
      continue;
    }
    ensureNode(parsedNode.node.id, parsedNode.node.label, parsedNode.node);
  }

  if (edges.length === 0) {
    errors.push({
      message: `нет рёбер: ожидается хотя бы одна строка «A -> B»`,
      line: 1,
      col: 0,
    });
    return { ok: false, errors };
  }

  if (errors.length) return { ok: false, errors };

  // Корни — узлы без входящих рёбер.
  const hasParent = new Set(edges.map((e) => e.to));
  const roots = nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id);

  if (roots.length === 0) {
    errors.push({
      message: `не найден корень: все узлы в цикле`,
      line: 1,
      col: 0,
    });
    return { ok: false, errors };
  }

  const virtualRoot = roots.length > 1;
  return {
    ok: true,
    errors: [],
    value: {
      title,
      mono,
      monoInvert,
      nodes,
      edges,
      root: virtualRoot ? null : roots[0],
      virtualRoot,
      ratio,
      avatarSize,
    },
  };
}

// --- Раскладка ------------------------------------------------------------

const FONT = 11;
const LINE_HEIGHT = FONT * 1.2;
const NODE_PADDING_X = 14;
const NODE_PADDING_Y = 9;
const NODE_MIN_WIDTH = 72;
const H_GAP = 18;
const V_GAP = 52;

const AVATAR_TEXT_GAP = 6;

function measureNode(node: OrgNode, framePx: number): { lines: string[]; width: number; height: number } {
  const lines = splitLabelLines(node.label);
  const maxTextWidth = Math.max(0, ...lines.map((line) => measureText(line, FONT)));
  const textWidth = Math.max(NODE_MIN_WIDTH, maxTextWidth + NODE_PADDING_X * 2);
  const textHeight = Math.max(1, lines.length) * LINE_HEIGHT + NODE_PADDING_Y * 2;
  const slot = avatarBoxSize(framePx, node);
  if (slot === 0) return { lines, width: textWidth, height: textHeight };
  return {
    lines,
    width: Math.max(textWidth, slot + NODE_PADDING_X * 2),
    height: textHeight + slot + AVATAR_TEXT_GAP,
  };
}

export interface PlacedTreeNode<T> {
  node: T;
  lines: string[];
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rowHeight: number;
}

interface TreeEdgeRef {
  from: string;
  to: string;
}

/** Глубина узла от корня; циклы не разворачиваем повторно. */
function computeDepths(
  nodes: readonly { id: string }[],
  edges: readonly TreeEdgeRef[],
  virtualRoot: boolean,
  root: string | null,
): Map<string, number> {
  const children = new Map<string, string[]>();
  for (const e of edges) {
    const list = children.get(e.from) ?? [];
    list.push(e.to);
    children.set(e.from, list);
  }

  const depth = new Map<string, number>();
  const queue: string[] = [];

  if (virtualRoot) {
    for (const n of nodes) {
      if (!edges.some((e) => e.to === n.id)) {
        depth.set(n.id, 1);
        queue.push(n.id);
      }
    }
  } else if (root) {
    depth.set(root, 0);
    queue.push(root);
  }

  // BFS: первый визит задаёт глубину, повторный (цикл) — игнорируем.
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const d = depth.get(id) ?? 0;
    for (const child of children.get(id) ?? []) {
      if (depth.has(child)) continue;
      depth.set(child, d + 1);
      queue.push(child);
    }
  }

  // Узлы, недостижимые из корня (циклы, висящие ветки) — на последний уровень.
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  for (const n of nodes) {
    if (!depth.has(n.id)) {
      depth.set(n.id, maxDepth + 1);
      maxDepth += 1;
    }
  }

  return depth;
}

export function layoutOrgTree<T extends { id: string }>(
  nodes: readonly T[],
  edges: readonly TreeEdgeRef[],
  virtualRoot: boolean,
  root: string | null,
  measure: (node: T) => { lines: string[]; width: number; height: number },
): { placed: PlacedTreeNode<T>[]; width: number; height: number } {
  const depth = computeDepths(nodes, edges, virtualRoot, root);
  const levels = new Map<number, T[]>();
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    const list = levels.get(d) ?? [];
    list.push(n);
    levels.set(d, list);
  }

  const placed: PlacedTreeNode<T>[] = [];
  const levelKeys = [...levels.keys()].sort((a, b) => a - b);

  const measuredById = new Map<string, { lines: string[]; width: number; height: number }>();
  for (const n of nodes) {
    measuredById.set(n.id, measure(n));
  }

  let maxRowWidth = 0;
  const rowWidths = new Map<number, number>();
  const rowHeights = new Map<number, number>();
  for (const d of levelKeys) {
    const row = levels.get(d) as T[];
    const widths = row.map((n) => measuredById.get(n.id)!.width);
    const heights = row.map((n) => measuredById.get(n.id)!.height);
    const total = widths.reduce((a, b) => a + b, 0) + H_GAP * Math.max(0, row.length - 1);
    rowWidths.set(d, total);
    maxRowWidth = Math.max(maxRowWidth, total);
    rowHeights.set(d, Math.max(NODE_PADDING_Y * 2 + FONT, ...heights));
  }

  const contentWidth = Math.max(maxRowWidth, NODE_MIN_WIDTH);

  let y = 0;
  for (const d of levelKeys) {
    const row = levels.get(d) as T[];
    const total = rowWidths.get(d) ?? 0;
    let x = (contentWidth - total) / 2;
    const rowH = rowHeights.get(d) ?? 40;
    for (const n of row) {
      const m = measuredById.get(n.id)!;
      placed.push({
        node: n,
        lines: m.lines,
        depth: d,
        x,
        y,
        width: m.width,
        height: m.height,
        rowHeight: rowH,
      });
      x += m.width + H_GAP;
    }
    y += rowH + V_GAP;
  }

  const height = Math.max(0, y - V_GAP);
  return { placed, width: contentWidth, height };
}

function layout(model: OrgModel): { placed: PlacedTreeNode<OrgNode>[]; width: number; height: number } {
  return layoutOrgTree(
    model.nodes,
    model.edges,
    model.virtualRoot,
    model.root,
    (node) => measureNode(node, model.avatarSize ?? 0),
  );
}

// --- Рендер ---------------------------------------------------------------

const PADDING = { top: 48, right: 24, bottom: 32, left: 24 };

/**
 * Если на одной стороне карточки есть и сплошное, и пунктирное ребро,
 * их точки контакта разъезжаются на этот зазор, чтобы штрихи не совпали.
 */
const CONTACT_STYLE_GAP = 16;
/** Точка контакта не ближе этого отступа к боковому краю карточки. */
const CONTACT_EDGE_INSET = 8;
/**
 * Зазор между горизонтальными «шинами» одного коридора.
 * У каждой пары «источник + стиль» своя шина, если линии иначе слиплись бы.
 */
const ELBOW_LANE_GAP = 10;
/**
 * Если точка прихода стоит на вертикали чужого ребра, её сдвигаем к своему
 * источнику, чтобы стрелки не читались как одна непрерывная линия.
 */
const ARRIVAL_ALIGN_NUDGE = 16;
/** Ближе этого зазора вертикали считаются одной линией. */
const ALIGN_EPS = 0.75;

interface DrawableEdge {
  edge: { from: string; to: string; style: OrgEdgeStyle };
  from: PlacedTreeNode<{ id: string }>;
  to: PlacedTreeNode<{ id: string }>;
  y1: number;
  y2: number;
  corridorTop: number;
  x1: number;
  x2: number;
}

interface EdgeLaneGroup {
  key: string;
  x: number;
  style: OrgEdgeStyle;
  edges: DrawableEdge[];
}

function uniqueStyles(edges: DrawableEdge[], pick: (item: DrawableEdge) => boolean): OrgEdgeStyle[] {
  const styles: OrgEdgeStyle[] = [];
  for (const item of edges) {
    if (!pick(item) || styles.includes(item.edge.style)) continue;
    styles.push(item.edge.style);
  }
  return styles;
}

/** Сдвиг точки контакта: сплошная влево, пунктир вправо. Один стиль — центр. */
function styleContactShift(cardWidth: number, styles: readonly OrgEdgeStyle[], style: OrgEdgeStyle): number {
  if (styles.length < 2 || !styles.includes(style)) return 0;
  const maxShift = Math.max(0, cardWidth / 2 - CONTACT_EDGE_INSET);
  const shift = Math.min(CONTACT_STYLE_GAP / 2, maxShift);
  return style === "solid" ? -shift : shift;
}

function corridorKey(y1: number, y2: number): string {
  return `${fmt(y1)}|${fmt(y2)}`;
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  const overlap =
    Math.min(Math.max(a0, a1), Math.max(b0, b1)) - Math.max(Math.min(a0, a1), Math.min(b0, b1));
  return overlap > 0.5;
}

function xsAlign(a: number, b: number): boolean {
  return Math.abs(a - b) < ALIGN_EPS;
}

/** Горизонтали пересекаются или вертикали стоят на одной прямой. */
function edgesWouldMerge(left: DrawableEdge, right: DrawableEdge): boolean {
  if (
    xsAlign(left.x1, right.x1) ||
    xsAlign(left.x1, right.x2) ||
    xsAlign(left.x2, right.x1) ||
    xsAlign(left.x2, right.x2)
  ) {
    return true;
  }
  return rangesOverlap(left.x1, left.x2, right.x1, right.x2);
}

function groupsWouldMerge(left: EdgeLaneGroup, right: EdgeLaneGroup): boolean {
  for (const a of left.edges) {
    for (const b of right.edges) {
      if (edgesWouldMerge(a, b)) return true;
    }
  }
  return false;
}

/**
 * Середина коридора, если шина одна. Несколько шин стоят симметрично вокруг
 * середины с шагом ELBOW_LANE_GAP (для двух шин это прежние ±5 px).
 */
function elbowLaneY(y1: number, y2: number, lane: number, laneCount: number): number {
  const mid = y1 + (y2 - y1) / 2;
  if (laneCount <= 1) return mid;
  const room = Math.abs(y2 - y1);
  const gap = Math.min(ELBOW_LANE_GAP, room / laneCount);
  if (gap <= 0) return mid;
  const span = gap * (laneCount - 1);
  return mid - span / 2 + lane * gap;
}

function contactLimits(card: PlacedTreeNode<{ id: string }>, offsetX: number): { left: number; right: number } {
  const left = offsetX + card.x + CONTACT_EDGE_INSET;
  const right = offsetX + card.x + card.width - CONTACT_EDGE_INSET;
  if (right <= left) {
    const center = offsetX + card.x + card.width / 2;
    return { left: center, right: center };
  }
  return { left, right };
}

/** Сдвигает приход с чужой вертикали, не выходя за края карточки. */
function nudgeArrival(edge: DrawableEdge, blocked: readonly number[], offsetX: number): number {
  const { left, right } = contactLimits(edge.to, offsetX);
  const origin = edge.x2;
  let dir = Math.sign(edge.x1 - origin);
  if (dir === 0) dir = 1;
  const steps = [1, -1, 2, -2];
  for (const step of steps) {
    const raw = origin + dir * step * ARRIVAL_ALIGN_NUDGE;
    const next = clamp(raw, left, right);
    if (Math.abs(next - origin) < 1) continue;
    if (blocked.some((x) => xsAlign(x, next))) continue;
    return next;
  }
  return origin;
}

function separateMergedArrivals(groups: readonly EdgeLaneGroup[], offsetX: number): void {
  for (const group of groups) {
    const blocked: number[] = [];
    for (const other of groups) {
      if (other === group) continue;
      for (const edge of other.edges) blocked.push(edge.x1, edge.x2);
    }
    for (const edge of group.edges) {
      if (!blocked.some((x) => xsAlign(x, edge.x2))) continue;
      edge.x2 = nudgeArrival(edge, blocked, offsetX);
    }
  }
}

function assignElbowLanes(groups: EdgeLaneGroup[]): Map<string, { lane: number; laneCount: number }> {
  const sorted = [...groups].sort((a, b) => {
    if (a.x !== b.x) return a.x - b.x;
    if (a.style === b.style) return 0;
    return a.style === "solid" ? -1 : 1;
  });
  const laneOf = new Map<string, number>();
  for (const group of sorted) {
    let lane = 0;
    while (sorted.some((other) => laneOf.get(other.key) === lane && groupsWouldMerge(group, other))) {
      lane += 1;
    }
    laneOf.set(group.key, lane);
  }
  const laneCount = Math.max(1, ...[...laneOf.values()].map((lane) => lane + 1));
  const assigned = new Map<string, { lane: number; laneCount: number }>();
  for (const [key, lane] of laneOf) assigned.set(key, { lane, laneCount });
  return assigned;
}

export function drawReportingElbows<T extends { id: string }>(
  svg: SvgBuilder,
  placed: readonly PlacedTreeNode<T>[],
  edges: readonly { from: string; to: string; style: OrgEdgeStyle }[],
  offsetX: number,
  offsetY: number,
  stroke: string,
  markerRef: string,
): void {
  const byId = new Map(placed.map((p) => [p.node.id, p]));
  const drawable: DrawableEdge[] = [];
  for (const edge of edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const y1 = offsetY + from.y + from.height;
    const y2 = offsetY + to.y;
    const corridorTop = from.depth < to.depth ? offsetY + from.y + from.rowHeight : y1;
    drawable.push({
      edge,
      from,
      to,
      y1,
      y2,
      corridorTop,
      x1: offsetX + from.x + from.width / 2,
      x2: offsetX + to.x + to.width / 2,
    });
  }

  for (const item of drawable) {
    const outStyles = uniqueStyles(drawable, (candidate) => candidate.edge.from === item.edge.from);
    const inStyles = uniqueStyles(drawable, (candidate) => candidate.edge.to === item.edge.to);
    item.x1 =
      offsetX + item.from.x + item.from.width / 2 + styleContactShift(item.from.width, outStyles, item.edge.style);
    item.x2 =
      offsetX + item.to.x + item.to.width / 2 + styleContactShift(item.to.width, inStyles, item.edge.style);
  }

  const corridors = new Map<string, DrawableEdge[]>();
  for (const item of drawable) {
    const key = corridorKey(item.corridorTop, item.y2);
    const list = corridors.get(key) ?? [];
    list.push(item);
    corridors.set(key, list);
  }

  const laneByEdge = new Map<DrawableEdge, { lane: number; laneCount: number }>();
  for (const items of corridors.values()) {
    const groups = new Map<string, EdgeLaneGroup>();
    for (const item of items) {
      const key = `${item.edge.from}|${item.edge.style}`;
      const group = groups.get(key) ?? { key, x: item.x1, style: item.edge.style, edges: [] };
      group.edges.push(item);
      groups.set(key, group);
    }
    const groupList = [...groups.values()];
    const lanes = assignElbowLanes(groupList);
    separateMergedArrivals(groupList, offsetX);
    for (const group of groupList) {
      const lane = lanes.get(group.key) ?? { lane: 0, laneCount: 1 };
      for (const item of group.edges) laneByEdge.set(item, lane);
    }
  }

  for (const item of drawable) {
    const { edge, y1, y2, corridorTop, x1, x2 } = item;
    const lane = laneByEdge.get(item) ?? { lane: 0, laneCount: 1 };
    const midY = elbowLaneY(corridorTop, y2, lane.lane, lane.laneCount);
    const d = `M ${fmt(x1)} ${fmt(y1)} L ${fmt(x1)} ${fmt(midY)} L ${fmt(x2)} ${fmt(midY)} L ${fmt(x2)} ${fmt(y2)}`;
    const attrs: Record<string, string | number> = {
      d,
      fill: "none",
      stroke,
      "stroke-width": 1.2,
      "marker-end": markerRef,
    };
    if (edge.style === "dotted") attrs["stroke-dasharray"] = "4 4";
    svg.path(d, attrs);
  }
}

export function renderOrgchart(model: OrgModel, options: ExtRenderOptions): string {
  const themeDark = Boolean(options.dark) || usesInvertedMono(model.mono, model.monoInvert, false);
  const invertedMono = usesInvertedMono(model.mono, model.monoInvert, options.dark);
  const palette = getPalette(themeDark);
  const { placed, width: contentWidth, height: contentHeight } = layout(model);

  const titleLines = model.title && hasLabelBreak(model.title) ? splitLabelLines(model.title) : null;
  const titleExtra = titleLines ? (titleLines.length - 1) * labelLineStep(15) : 0;
  let width = PADDING.left + contentWidth + PADDING.right;
  let height = PADDING.top + titleExtra + contentHeight + PADDING.bottom;
  let padX = 0;
  let padY = 0;
  if (model.ratio) {
    const grown = growPlotToAspect(
      {
        plotWidth: contentWidth,
        plotHeight: contentHeight,
        totalWidth: width,
        totalHeight: height,
      },
      model.ratio,
    );
    padX = Math.max(0, grown.plotWidth - contentWidth);
    padY = Math.max(0, grown.plotHeight - contentHeight);
    width += padX;
    height += padY;
  }

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
    // Тесты считают прямоугольники по тегам: фон дал бы лишний <rect>.
    // У инвертированного ч/б тёмный холст нужен, иначе светлые блоки теряются.
    background: model.monoInvert ? true : false,
  });

  if (model.title) {
    const lines = titleLines ?? [model.title];
    const step = labelLineStep(15);
    lines.forEach((line, idx) => {
      svg.text(width / 2, 24 + idx * step, line, {
        "font-size": 15,
        "font-weight": 600,
        fill: palette.fg,
      });
    });
  }

  const offsetX = PADDING.left + padX / 2;
  const offsetY = PADDING.top + titleExtra + padY / 2;

  const marker = arrowMarker(palette, "ext-org-arrow");
  svg.raw(marker.markup);
  drawReportingElbows(svg, placed, model.edges, offsetX, offsetY, palette.axis, marker.ref);

  // Узлы
  for (const p of placed) {
    const x = offsetX + p.x;
    const y = offsetY + p.y;
    const isRoot = !model.virtualRoot && p.node.id === model.root;
    const rawFill = p.node.fill ?? (isRoot ? palette.accent : palette.bg);
    const rawStroke = p.node.border ?? (p.node.fill ? p.node.fill : isRoot ? palette.accent : palette.axis);
    const fill = model.mono
      ? p.node.fill
        ? monoPaint(colorForContrast(p.node.fill), invertedMono)
        : monoGray(isRoot ? 0 : 1, 2, invertedMono)
      : rawFill;
    const stroke = model.mono
      ? p.node.border
        ? monoPaint(colorForContrast(p.node.border), invertedMono)
        : fill
      : rawStroke;
    const textFill = model.mono
      ? (contrastTextColor(fill) ?? palette.fg)
      : p.node.fill
        ? (contrastTextColor(colorForContrast(p.node.fill)) ?? palette.fg)
        : isRoot
          ? palette.bg
          : palette.fg;
    const dash = p.node.borderStyle ? BORDER_DASH[p.node.borderStyle] : undefined;
    svg.rect(x, y, p.width, p.height, {
      fill,
      stroke,
      "stroke-width": p.node.borderWidth ?? DEFAULT_NODE_STROKE_WIDTH,
      ...(dash ? { "stroke-dasharray": dash } : {}),
      rx: 4,
    });
    const slot = avatarBoxSize(model.avatarSize ?? 0, p.node);
    let firstLineY = y + p.height / 2 - ((p.lines.length - 1) * LINE_HEIGHT) / 2 + 4;
    if (slot > 0) {
      renderAvatarBox(
        svg,
        x + (p.width - slot) / 2,
        y + NODE_PADDING_Y,
        slot,
        p.node,
        `ext-org-avatar-${placed.indexOf(p)}`,
      );
      const textTop = y + NODE_PADDING_Y + slot + AVATAR_TEXT_GAP;
      firstLineY = textTop + 4;
    }
    p.lines.forEach((line, idx) => {
      svg.text(x + p.width / 2, firstLineY + idx * LINE_HEIGHT, line, {
        "font-size": FONT,
        fill: textFill,
      });
    });
  }

  return svg.toString();
}

export const orgchartEngine: ExtEngine<OrgModel> = {
  type: "orgchart",
  aliases: ["orgchart", "org"],
  parse: parseOrgchart,
  render: renderOrgchart,
};
