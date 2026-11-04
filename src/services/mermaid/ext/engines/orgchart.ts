import {
  arrowMarker,
  clamp,
  createSvg,
  fmt,
  getPalette,
  measureText,
  truncate,
} from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

// --- Модель ---------------------------------------------------------------

export type OrgEdgeStyle = "solid" | "dotted";

export interface OrgNode {
  id: string;
  label: string;
}

export interface OrgEdge {
  from: string;
  to: string;
  style: OrgEdgeStyle;
}

export interface OrgModel {
  title?: string;
  nodes: OrgNode[];
  edges: OrgEdge[];
  /** id реального корня; null — корней несколько. */
  root: string | null;
  /** true — корней несколько, рисуется виртуальный корень. */
  virtualRoot: boolean;
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

/** `A [Подпись]` → { id: "A", label: "Подпись" } */
function parseNodeLine(raw: string): OrgNode {
  const bracket = /^(.*?)\s*\[(.*)\]\s*$/.exec(raw);
  if (bracket) {
    const id = unquote(bracket[1]);
    const label = unquote(bracket[2]);
    return { id, label: label || id };
  }
  const id = unquote(raw);
  return { id, label: id };
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
  const nodes: OrgNode[] = [];
  const nodeIndex = new Map<string, OrgNode>();
  const edges: OrgEdge[] = [];
  let seenType = false;

  const ensureNode = (id: string, label?: string): OrgNode => {
    const existing = nodeIndex.get(id);
    if (existing) {
      if (label && existing.label === existing.id) existing.label = label;
      return existing;
    }
    const node: OrgNode = { id, label: label || id };
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

    const node = parseNodeLine(raw);
    if (!node.id) {
      errors.push({ message: `пустой идентификатор узла в строке «${raw}»`, line: lineNo, col: 0 });
      continue;
    }
    ensureNode(node.id, node.label);
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
      nodes,
      edges,
      root: virtualRoot ? null : roots[0],
      virtualRoot,
    },
  };
}

// --- Раскладка ------------------------------------------------------------

interface PlacedNode {
  node: OrgNode;
  depth: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const FONT = 11;
const NODE_PADDING_X = 14;
const NODE_PADDING_Y = 9;
const NODE_MIN_WIDTH = 72;
const NODE_MAX_WIDTH = 180;
const H_GAP = 18;
const V_GAP = 52;

/** Глубина узла от корня; циклы не разворачиваем повторно. */
function computeDepths(model: OrgModel): Map<string, number> {
  const children = new Map<string, string[]>();
  for (const e of model.edges) {
    const list = children.get(e.from) ?? [];
    list.push(e.to);
    children.set(e.from, list);
  }

  const depth = new Map<string, number>();
  const queue: string[] = [];

  if (model.virtualRoot) {
    for (const n of model.nodes) {
      if (!model.edges.some((e) => e.to === n.id)) {
        depth.set(n.id, 1);
        queue.push(n.id);
      }
    }
  } else if (model.root) {
    depth.set(model.root, 0);
    queue.push(model.root);
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
  for (const n of model.nodes) {
    if (!depth.has(n.id)) {
      depth.set(n.id, maxDepth + 1);
      maxDepth += 1;
    }
  }

  return depth;
}

function layout(model: OrgModel): { placed: PlacedNode[]; width: number; height: number } {
  const depth = computeDepths(model);
  const levels = new Map<number, OrgNode[]>();
  for (const n of model.nodes) {
    const d = depth.get(n.id) ?? 0;
    const list = levels.get(d) ?? [];
    list.push(n);
    levels.set(d, list);
  }

  const placed: PlacedNode[] = [];
  const levelKeys = [...levels.keys()].sort((a, b) => a - b);

  let maxRowWidth = 0;
  const rowWidths = new Map<number, number>();
  for (const d of levelKeys) {
    const row = levels.get(d) as OrgNode[];
    const widths = row.map((n) =>
      clamp(measureText(n.label, FONT) + NODE_PADDING_X * 2, NODE_MIN_WIDTH, NODE_MAX_WIDTH),
    );
    const total = widths.reduce((a, b) => a + b, 0) + H_GAP * Math.max(0, row.length - 1);
    rowWidths.set(d, total);
    maxRowWidth = Math.max(maxRowWidth, total);
  }

  const contentWidth = Math.max(maxRowWidth, NODE_MIN_WIDTH);
  const rowHeights = new Map<number, number>();
  for (const d of levelKeys) {
    const row = levels.get(d) as OrgNode[];
    const h = row.reduce((acc, n) => {
      const lines = Math.max(1, Math.ceil(measureText(n.label, FONT) / (NODE_MAX_WIDTH - NODE_PADDING_X * 2)));
      return Math.max(acc, lines * FONT * 1.2 + NODE_PADDING_Y * 2);
    }, NODE_PADDING_Y * 2 + FONT);
    rowHeights.set(d, h);
  }

  let y = 0;
  for (const d of levelKeys) {
    const row = levels.get(d) as OrgNode[];
    const total = rowWidths.get(d) ?? 0;
    let x = (contentWidth - total) / 2;
    const h = rowHeights.get(d) ?? 40;
    for (const n of row) {
      const w = clamp(measureText(n.label, FONT) + NODE_PADDING_X * 2, NODE_MIN_WIDTH, NODE_MAX_WIDTH);
      placed.push({ node: n, depth: d, x, y, width: w, height: h });
      x += w + H_GAP;
    }
    y += h + V_GAP;
  }

  const height = Math.max(0, y - V_GAP);
  return { placed, width: contentWidth, height };
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
 * На одном горизонтальном коридоре сплошной и пунктирный «локоть»
 * разводятся по вертикали, иначе общий участок ложится друг на друга.
 */
const ELBOW_STYLE_SEPARATION = 10;

interface DrawableEdge {
  edge: OrgEdge;
  from: PlacedNode;
  to: PlacedNode;
  y1: number;
  y2: number;
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

function elbowY(y1: number, y2: number, style: OrgEdgeStyle, separateStyles: boolean): number {
  const mid = y1 + (y2 - y1) / 2;
  if (!separateStyles) return mid;
  const room = Math.abs(y2 - y1) / 2;
  const half = Math.min(ELBOW_STYLE_SEPARATION / 2, room / 2);
  if (half <= 0) return mid;
  return style === "solid" ? mid - half : mid + half;
}

export function renderOrgchart(model: OrgModel, options: ExtRenderOptions): string {
  const palette = getPalette(Boolean(options.dark));
  const { placed, width: contentWidth, height: contentHeight } = layout(model);

  const width = PADDING.left + contentWidth + PADDING.right;
  const height = PADDING.top + contentHeight + PADDING.bottom;

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
    // Тесты считают прямоугольники по тегам: фон дал бы лишний <rect>.
    background: false,
  });

  if (model.title) {
    svg.text(width / 2, 24, model.title, { "font-size": 15, "font-weight": 600, fill: palette.fg });
  }

  const byId = new Map(placed.map((p) => [p.node.id, p]));
  const offsetX = PADDING.left;
  const offsetY = PADDING.top;

  const marker = arrowMarker(palette, "ext-org-arrow");
  svg.raw(marker.markup);

  const drawable: DrawableEdge[] = [];
  for (const edge of model.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    drawable.push({
      edge,
      from,
      to,
      y1: offsetY + from.y + from.height,
      y2: offsetY + to.y,
    });
  }

  const mixedCorridors = new Set<string>();
  const stylesByCorridor = new Map<string, OrgEdgeStyle[]>();
  for (const item of drawable) {
    const key = corridorKey(item.y1, item.y2);
    const styles = stylesByCorridor.get(key) ?? [];
    if (!styles.includes(item.edge.style)) styles.push(item.edge.style);
    stylesByCorridor.set(key, styles);
    if (styles.length > 1) mixedCorridors.add(key);
  }

  // Рёбра — под узлами. Сплошная и пунктирная линии не делят одну точку
  // контакта на карточке и не ложатся на общий горизонтальный участок.
  for (const item of drawable) {
    const { edge, from, to, y1, y2 } = item;
    const outStyles = uniqueStyles(drawable, (candidate) => candidate.edge.from === edge.from);
    const inStyles = uniqueStyles(drawable, (candidate) => candidate.edge.to === edge.to);
    const x1 =
      offsetX + from.x + from.width / 2 + styleContactShift(from.width, outStyles, edge.style);
    const x2 = offsetX + to.x + to.width / 2 + styleContactShift(to.width, inStyles, edge.style);
    const midY = elbowY(y1, y2, edge.style, mixedCorridors.has(corridorKey(y1, y2)));
    const d = `M ${fmt(x1)} ${fmt(y1)} L ${fmt(x1)} ${fmt(midY)} L ${fmt(x2)} ${fmt(midY)} L ${fmt(x2)} ${fmt(y2)}`;
    const attrs: Record<string, string | number> = {
      d,
      fill: "none",
      stroke: palette.axis,
      "stroke-width": 1.2,
      "marker-end": marker.ref,
    };
    if (edge.style === "dotted") attrs["stroke-dasharray"] = "4 4";
    svg.path(d, attrs);
  }

  // Узлы
  for (const p of placed) {
    const x = offsetX + p.x;
    const y = offsetY + p.y;
    const isRoot = !model.virtualRoot && p.node.id === model.root;
    svg.rect(x, y, p.width, p.height, {
      fill: isRoot ? palette.accent : palette.bg,
      stroke: isRoot ? palette.accent : palette.axis,
      "stroke-width": 1.2,
      rx: 4,
    });
    const label = truncate(p.node.label, p.width - NODE_PADDING_X * 2, FONT);
    svg.text(x + p.width / 2, y + p.height / 2 + 4, label, {
      "font-size": FONT,
      fill: isRoot ? palette.bg : palette.fg,
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
