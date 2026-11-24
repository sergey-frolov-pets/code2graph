/**
 * Страховочная трассировка ортогональных связей.
 *
 * Основные раскладки powermap и orgchart считают «полки» эвристиками: одну
 * горизонталь между карточками и вертикальные выходы из кромок. Эвристики
 * ошибаются, когда карточка стоит прямо над точкой выхода — вертикальная ножка
 * проходит сквозь чужую карточку. Здесь путь проверяется целиком и, если он
 * пересекает препятствия, прокладывается по сетке коридоров.
 */

export interface LaneBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LanePoint {
  x: number;
  y: number;
}

export type LaneDir = "up" | "down" | "left" | "right";

/** Зазор до препятствий по умолчанию: линия не идёт по кромке карточки. */
export const LANE_CLEAR = 6;
/** Длина перпендикулярного выхода из кромки карточки. */
const LANE_STUB = 12;

function grow(box: LaneBox, by: number): LaneBox {
  return {
    left: box.left - by,
    right: box.right + by,
    top: box.top - by,
    bottom: box.bottom + by,
  };
}

function horizontalHit(p: LanePoint, q: LanePoint, box: LaneBox): boolean {
  if (p.y <= box.top || p.y >= box.bottom) return false;
  const lo = Math.min(p.x, q.x);
  const hi = Math.max(p.x, q.x);
  return hi > box.left && lo < box.right;
}

function verticalHit(p: LanePoint, q: LanePoint, box: LaneBox): boolean {
  if (p.x <= box.left || p.x >= box.right) return false;
  const lo = Math.min(p.y, q.y);
  const hi = Math.max(p.y, q.y);
  return hi > box.top && lo < box.bottom;
}

/** Пересекает ли ортогональный отрезок внутренность прямоугольника. */
export function laneSegmentHits(
  p: LanePoint,
  q: LanePoint,
  box: LaneBox,
): boolean {
  if (Math.abs(p.y - q.y) < 0.01) return horizontalHit(p, q, box);
  if (Math.abs(p.x - q.x) < 0.01) return verticalHit(p, q, box);
  return false;
}

/** Пересекает ли ломаная хоть одно препятствие. */
export function lanePathHits(
  points: readonly LanePoint[],
  boxes: readonly LaneBox[],
  clear = 0,
): boolean {
  const grown = clear > 0 ? boxes.map((box) => grow(box, clear)) : boxes;
  for (let index = 0; index < points.length - 1; index += 1) {
    for (const box of grown) {
      if (laneSegmentHits(points[index], points[index + 1], box)) return true;
    }
  }
  return false;
}

function dedupe(points: readonly LanePoint[]): LanePoint[] {
  const kept: LanePoint[] = [];
  for (const point of points) {
    const prev = kept[kept.length - 1];
    if (prev && Math.abs(prev.x - point.x) < 0.4 && Math.abs(prev.y - point.y) < 0.4) continue;
    kept.push(point);
  }
  for (let index = kept.length - 2; index > 0; index -= 1) {
    const before = kept[index - 1];
    const point = kept[index];
    const after = kept[index + 1];
    const collinear =
      (Math.abs(before.x - point.x) < 0.4 && Math.abs(point.x - after.x) < 0.4) ||
      (Math.abs(before.y - point.y) < 0.4 && Math.abs(point.y - after.y) < 0.4);
    if (collinear) kept.splice(index, 1);
  }
  return kept;
}

function stubOf(point: LanePoint, dir: LaneDir, length: number): LanePoint {
  switch (dir) {
    case "up":
      return { x: point.x, y: point.y - length };
    case "down":
      return { x: point.x, y: point.y + length };
    case "left":
      return { x: point.x - length, y: point.y };
    default:
      return { x: point.x + length, y: point.y };
  }
}

interface Grid {
  xs: number[];
  ys: number[];
  cols: number;
  rows: number;
}

function buildGrid(
  start: LanePoint,
  end: LanePoint,
  boxes: readonly LaneBox[],
  gutter: number,
): Grid {
  const xs = new Set<number>([start.x, end.x]);
  const ys = new Set<number>([start.y, end.y]);
  for (const box of boxes) {
    xs.add(box.left - gutter);
    xs.add(box.right + gutter);
    ys.add(box.top - gutter);
    ys.add(box.bottom + gutter);
  }
  xs.add((start.x + end.x) / 2);
  ys.add((start.y + end.y) / 2);
  const xsList = [...xs].sort((left, right) => left - right);
  const ysList = [...ys].sort((left, right) => left - right);
  return { xs: xsList, ys: ysList, cols: xsList.length, rows: ysList.length };
}

function pointOf(grid: Grid, index: number): LanePoint {
  return {
    x: grid.xs[index % grid.cols],
    y: grid.ys[Math.floor(index / grid.cols)],
  };
}

const TURN_COST = 18;
const MAX_STEPS = 20000;

/** A* по сетке коридоров; возвращает ломаную без лишних изломов. */
function gridRoute(
  start: LanePoint,
  end: LanePoint,
  boxes: readonly LaneBox[],
  gutter: number,
): LanePoint[] | null {
  const grid = buildGrid(start, end, boxes, gutter);
  const indexOf = (point: LanePoint): number => {
    const col = grid.xs.findIndex((value) => Math.abs(value - point.x) < 0.01);
    const row = grid.ys.findIndex((value) => Math.abs(value - point.y) < 0.01);
    if (col < 0 || row < 0) return -1;
    return row * grid.cols + col;
  };
  const startIndex = indexOf(start);
  const endIndex = indexOf(end);
  if (startIndex < 0 || endIndex < 0) return null;

  const free = (from: number, to: number): boolean =>
    !lanePathHits([pointOf(grid, from), pointOf(grid, to)], boxes);

  interface Item {
    node: number;
    dir: number;
    cost: number;
    prevNode: number;
    prevDir: number;
  }
  const best = new Map<number, Item>();
  const queue: Item[] = [
    { node: startIndex, dir: 0, cost: 0, prevNode: -1, prevDir: -1 },
    { node: startIndex, dir: 1, cost: 0, prevNode: -1, prevDir: -1 },
  ];
  const key = (node: number, dir: number): number => node * 2 + dir;
  let finished: Item | null = null;

  for (let guard = 0; queue.length > 0 && guard < MAX_STEPS; guard += 1) {
    queue.sort((left, right) => left.cost - right.cost);
    const item = queue.shift()!;
    const id = key(item.node, item.dir);
    if (best.has(id)) continue;
    best.set(id, item);
    if (item.node === endIndex) {
      finished = item;
      break;
    }
    const col = item.node % grid.cols;
    const row = Math.floor(item.node / grid.cols);
    const moves: { node: number; dir: number; len: number }[] = [];
    if (col > 0) {
      moves.push({ node: item.node - 1, dir: 0, len: grid.xs[col] - grid.xs[col - 1] });
    }
    if (col + 1 < grid.cols) {
      moves.push({ node: item.node + 1, dir: 0, len: grid.xs[col + 1] - grid.xs[col] });
    }
    if (row > 0) {
      moves.push({ node: item.node - grid.cols, dir: 1, len: grid.ys[row] - grid.ys[row - 1] });
    }
    if (row + 1 < grid.rows) {
      moves.push({
        node: item.node + grid.cols,
        dir: 1,
        len: grid.ys[row + 1] - grid.ys[row],
      });
    }
    for (const move of moves) {
      if (!free(item.node, move.node)) continue;
      const turn = move.dir === item.dir ? 0 : TURN_COST;
      queue.push({
        node: move.node,
        dir: move.dir,
        cost: item.cost + move.len + turn,
        prevNode: item.node,
        prevDir: item.dir,
      });
    }
  }
  if (!finished) return null;

  const chain: number[] = [];
  let node = endIndex;
  let dir = finished.dir;
  for (let guard = 0; guard < 500; guard += 1) {
    chain.push(node);
    const item = best.get(key(node, dir));
    if (!item || item.prevNode < 0) break;
    node = item.prevNode;
    dir = item.prevDir;
  }
  const points = chain.reverse().map((index) => pointOf(grid, index));
  if (points.length < 2) return null;
  points[0] = start;
  points[points.length - 1] = end;
  return dedupe(points);
}

function bendCount(points: readonly LanePoint[]): number {
  let bends = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = points[index - 1];
    const point = points[index];
    const after = points[index + 1];
    const same =
      (Math.abs(before.x - point.x) < 0.4 && Math.abs(point.x - after.x) < 0.4) ||
      (Math.abs(before.y - point.y) < 0.4 && Math.abs(point.y - after.y) < 0.4);
    if (!same) bends += 1;
  }
  return bends;
}

function pathBlocked(points: readonly LanePoint[], boxes: readonly LaneBox[], own: readonly LaneBox[]): boolean {
  const shaped = dedupe(points);
  if (shaped.length < 2) return true;
  if (lanePathHits(shaped, boxes, 0)) return true;
  return own.length > 0 && lanePathHits(shaped, own, 0);
}

/**
 * Короткая ортогональная связь: прямая, одна полка или обход в боковой жёлоб.
 * Больше четырёх изломов не бывает — сетка по краям препятствий сюда не входит.
 */
export function routeCompact(
  start: LanePoint,
  end: LanePoint,
  boxes: readonly LaneBox[],
  options: { startBox?: LaneBox; endBox?: LaneBox; clear?: number } = {},
): LanePoint[] {
  const clear = options.clear ?? LANE_CLEAR;
  const blockers = boxes.map((box) => grow(box, clear));
  const own = [options.startBox, options.endBox].filter((box): box is LaneBox => Boolean(box));
  const ok = (points: LanePoint[]): LanePoint[] | null =>
    pathBlocked(points, blockers, own) ? null : dedupe(points);

  if (Math.abs(start.x - end.x) < 0.6 || Math.abs(start.y - end.y) < 0.6) {
    const direct = ok([start, end]);
    if (direct) return direct;
  }

  const x0 = Math.min(start.x, end.x);
  const x1 = Math.max(start.x, end.x);
  const shelves: number[] = [];
  const gap = Math.abs(start.y - end.y);
  if (gap > 16) shelves.push((start.y + end.y) / 2);
  shelves.push(Math.max(start.y, end.y) + 18, Math.min(start.y, end.y) - 18);

  let left = Math.min(start.x, end.x);
  let right = Math.max(start.x, end.x);
  for (const box of blockers) {
    left = Math.min(left, box.left);
    right = Math.max(right, box.right);
    if (box.right > x0 && box.left < x1) {
      shelves.push(box.top - 8, box.bottom + 8);
    }
  }

  let best: LanePoint[] | null = null;
  const consider = (points: LanePoint[]): void => {
    const shaped = ok(points);
    if (!shaped) return;
    if (!best || bendCount(shaped) < bendCount(best)) best = shaped;
  };

  for (const y of shelves) {
    consider([start, { x: start.x, y }, { x: end.x, y }, end]);
    if (best && bendCount(best) <= 2) return best;
  }

  const stub = 12;
  const gutters = [left - 16, right + 16];
  for (const gutter of gutters) {
    const leave = start.y <= end.y ? start.y + stub : start.y - stub;
    const approach = start.y <= end.y ? end.y - stub : end.y + stub;
    consider([
      start,
      { x: start.x, y: leave },
      { x: gutter, y: leave },
      { x: gutter, y: approach },
      { x: end.x, y: approach },
      end,
    ]);
  }
  if (best) return best;

  const mid = (start.y + end.y) / 2;
  return dedupe([start, { x: start.x, y: mid }, { x: end.x, y: mid }, end]);
}

/**
 * Путь между двумя точками на кромках карточек. Пробует простые формы
 * (выход перпендикулярно кромке + полка), затем обход жёлобом, и только
 * потом сетку коридоров. Возвращает null, если свободного пути нет.
 */
export function routeAvoiding(
  start: LanePoint,
  end: LanePoint,
  boxes: readonly LaneBox[],
  options: {
    startDirs?: readonly LaneDir[];
    endDirs?: readonly LaneDir[];
    /** Карточка источника и цель: линия может касаться кромки, но не входить внутрь. */
    startBox?: LaneBox;
    endBox?: LaneBox;
    clear?: number;
    gutter?: number;
  } = {},
): LanePoint[] | null {
  const clear = options.clear ?? LANE_CLEAR;
  const gutter = options.gutter ?? clear + 6;
  const blockers: LaneBox[] = [...boxes];
  if (options.startBox) blockers.push(options.startBox);
  if (options.endBox) blockers.push(options.endBox);
  const startDirs = options.startDirs ?? ["down", "up", "left", "right"];
  const endDirs = options.endDirs ?? ["up", "down", "left", "right"];
  const stubs: { start: LanePoint; end: LanePoint }[] = [];
  for (const startDir of startDirs) {
    for (const endDir of endDirs) {
      stubs.push({
        start: stubOf(start, startDir, LANE_STUB),
        end: stubOf(end, endDir, LANE_STUB),
      });
    }
  }

  const accept = (points: LanePoint[]): LanePoint[] | null => {
    const full = dedupe(points);
    if (lanePathHits(full, boxes, clear)) return null;
    // Концы проверяем без зазора: касание своей кромки разрешено, вход внутрь — нет.
    const ends: LaneBox[] = [];
    if (options.startBox) ends.push(options.startBox);
    if (options.endBox) ends.push(options.endBox);
    if (ends.length > 0 && lanePathHits(full, ends, 0)) return null;
    return full;
  };

  // 1. Простые формы: одна полка по X или по Y.
  for (const stub of stubs) {
    const { start: a, end: b } = stub;
    const candidates: LanePoint[][] = [
      [start, a, { x: a.x, y: b.y }, b, end],
      [start, a, { x: b.x, y: a.y }, b, end],
      [start, a, { x: b.x, y: a.y }, { x: b.x, y: b.y }, b, end],
      [start, a, { x: a.x, y: b.y }, b, end],
    ];
    for (const candidate of candidates) {
      const ok = accept(candidate);
      if (ok) return ok;
    }
  }

  // 2. Обход в боковой жёлоб: не больше четырёх изломов.
  for (const stub of stubs) {
    const compact = routeCompact(stub.start, stub.end, blockers, { clear: 0 });
    const ok = accept([start, ...compact, end]);
    if (ok && bendCount(ok) <= 4) return ok;
  }

  // 3. Сетка коридоров — только если жёлоб тоже перекрыт.

  for (const stub of stubs) {
    const points = gridRoute(stub.start, stub.end, blockers, gutter);
    if (!points) continue;
    const ok = accept([start, ...points, end]);
    if (ok) return ok;
  }
  return null;
}

/**
 * Точка входа должна стоять на ближней к предыдущей точке кромке карточки.
 * Иначе линия входит в карточку с дальней стороны и перечёркивает её.
 */
export function clipToNearEdge(
  point: LanePoint,
  prev: LanePoint,
  box: LaneBox,
): LanePoint {
  const insideX = point.x >= box.left - 0.5 && point.x <= box.right + 0.5;
  const insideY = point.y >= box.top - 0.5 && point.y <= box.bottom + 0.5;
  if (Math.abs(point.x - prev.x) < 1 && insideX) {
    if (prev.y < box.top) return { x: point.x, y: box.top };
    if (prev.y > box.bottom) return { x: point.x, y: box.bottom };
  }
  if (Math.abs(point.y - prev.y) < 1 && insideY) {
    if (prev.x < box.left) return { x: box.left, y: point.y };
    if (prev.x > box.right) return { x: box.right, y: point.y };
  }
  return point;
}

/**
 * Ремонт уже разложенного пути. Пост-обработки (разведение контактов, полок)
 * двигают точки по отдельности, и линия может вернуться в карточку.
 * Возвращает исправленный путь или null, если исходный уже чист.
 */
export function repairLanePath(
  points: readonly LanePoint[],
  others: readonly LaneBox[],
  own: readonly LaneBox[] = [],
  clear = LANE_CLEAR,
): LanePoint[] | null {
  if (points.length < 2) return null;
  const fixed = points.map((point) => ({ x: point.x, y: point.y }));
  const startBox = own[0];
  const endBox = own[own.length - 1];
  if (startBox) fixed[0] = clipToNearEdge(fixed[0], fixed[1], startBox);
  if (endBox) {
    const last = fixed.length - 1;
    fixed[last] = clipToNearEdge(fixed[last], fixed[last - 1], endBox);
  }
  const blockers = [...own, ...others];
  if (!lanePathHits(fixed, blockers, 0)) return null;
  // Строгий зазор может не влезть в тесный ряд — пробуем последовательно меньше.
  for (const gap of [clear, Math.min(clear, 3), 0]) {
    const routed = routeAvoiding(fixed[0], fixed[fixed.length - 1], others, {
      startBox,
      endBox,
      clear: gap,
      gutter: gap + 6,
    });
    if (!routed) continue;
    if (lanePathHits(routed, others, gap)) continue;
    if (lanePathHits(routed, own, 0)) continue;
    return routed;
  }
  return null;
}

/** Линия не должна совпадать с обводкой рамки: ближе этого зазора её отодвигаем. */
export const FRAME_STROKE_CLEAR = 8;
/** Короче этого отрезок считается пересечением границы, а не ходом вдоль неё. */
const FRAME_RIDE_MIN = 10;

function spanOverlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.min(Math.max(a0, a1), Math.max(b0, b1)) - Math.max(Math.min(a0, a1), Math.min(b0, b1));
}

/** К какой кромке карточки приклеена точка: по этой оси её двигать нельзя. */
function cardAttachment(
  point: LanePoint,
  cards: readonly LaneBox[],
): { box: LaneBox; axis: "x" | "y" } | null {
  for (const box of cards) {
    const onX = point.x >= box.left - 1 && point.x <= box.right + 1;
    const onY = point.y >= box.top - 1 && point.y <= box.bottom + 1;
    if (onX && (Math.abs(point.y - box.top) < 1.2 || Math.abs(point.y - box.bottom) < 1.2)) {
      return { box, axis: "y" };
    }
    if (onY && (Math.abs(point.x - box.left) < 1.2 || Math.abs(point.x - box.right) < 1.2)) {
      return { box, axis: "x" };
    }
  }
  return null;
}

function segmentClearOfCards(a: LanePoint, b: LanePoint, cards: readonly LaneBox[]): boolean {
  return !cards.some((card) => laneSegmentHits(a, b, card));
}

/**
 * Зазор до параллельной кромки рамки на участке, где отрезок идёт вдоль неё.
 * Пересечение кромки поперёк почти не перекрывает её по длине и сюда не попадает.
 */
function frameClearance(
  horizontal: boolean,
  fixed: number,
  from: number,
  to: number,
  frames: readonly LaneBox[],
): number {
  let best = Number.POSITIVE_INFINITY;
  for (const frame of frames) {
    if (horizontal) {
      if (spanOverlap(from, to, frame.left, frame.right) < FRAME_RIDE_MIN) continue;
      best = Math.min(best, Math.abs(fixed - frame.top), Math.abs(fixed - frame.bottom));
    } else {
      if (spanOverlap(from, to, frame.top, frame.bottom) < FRAME_RIDE_MIN) continue;
      best = Math.min(best, Math.abs(fixed - frame.left), Math.abs(fixed - frame.right));
    }
  }
  return best;
}

function gapAhead(
  horizontal: boolean,
  edge: number,
  sign: number,
  from: number,
  to: number,
  frames: readonly LaneBox[],
): number {
  let gap = Number.POSITIVE_INFINITY;
  for (const frame of frames) {
    const edges = horizontal ? [frame.top, frame.bottom] : [frame.left, frame.right];
    const spanLo = horizontal ? frame.left : frame.top;
    const spanHi = horizontal ? frame.right : frame.bottom;
    if (spanOverlap(from, to, spanLo, spanHi) < FRAME_RIDE_MIN) continue;
    for (const other of edges) {
      const delta = (other - edge) * sign;
      if (delta > 0.4) gap = Math.min(gap, delta);
    }
  }
  return gap;
}

/** Отрезок на новой координате и короткие уступы к ней не входят в карточки. */
function spanClear(
  horizontal: boolean,
  cross: number,
  from: number,
  to: number,
  cards: readonly LaneBox[],
  jogAt: readonly { along: number; from: number; to: number }[] = [],
): boolean {
  const at = (along: number, value: number): LanePoint =>
    horizontal ? { x: along, y: value } : { x: value, y: along };
  if (!segmentClearOfCards(at(from, cross), at(to, cross), cards)) return false;
  return jogAt.every((jog) => segmentClearOfCards(at(jog.along, jog.from), at(jog.along, jog.to), cards));
}

/**
 * Если весь отрезок сдвинуть нельзя (конец сидит на карточке),
 * уводим только ту часть, что идёт вдоль границы.
 */
function jogOffFrame(
  points: readonly LanePoint[],
  index: number,
  frames: readonly LaneBox[],
  cards: readonly LaneBox[],
  clear: number,
): LanePoint[] | null {
  const a = points[index];
  const b = points[index + 1];
  const horizontal = Math.abs(a.y - b.y) < 0.6;
  if (!horizontal && Math.abs(a.x - b.x) >= 0.6) return null;
  const alongA = horizontal ? a.x : a.y;
  const alongB = horizontal ? b.x : b.y;
  const cross = horizontal ? a.y : a.x;
  const lo = Math.min(alongA, alongB);
  const hi = Math.max(alongA, alongB);
  let best: { cutLo: number; cutHi: number; target: number; room: number } | null = null;
  for (const frame of frames) {
    const edges = horizontal ? [frame.top, frame.bottom] : [frame.left, frame.right];
    const spanLo = horizontal ? frame.left : frame.top;
    const spanHi = horizontal ? frame.right : frame.bottom;
    const mid = horizontal ? (frame.top + frame.bottom) / 2 : (frame.left + frame.right) / 2;
    const cutLo = Math.max(lo, spanLo);
    const cutHi = Math.min(hi, spanHi);
    if (cutHi - cutLo < FRAME_RIDE_MIN) continue;
    for (const edge of edges) {
      const dist = Math.abs(cross - edge);
      if (dist >= clear - 0.2) continue;
      const outward = edge <= mid ? -1 : 1;
      const sign = dist < 0.4 ? outward : Math.sign(cross - edge);
      for (const candidateSign of [sign, -sign]) {
        const gap = gapAhead(horizontal, edge, candidateSign, cutLo, cutHi, frames);
        const offset = Math.min(clear, gap / 2);
        if (offset < 3) continue;
        const target = edge + candidateSign * offset;
        const jogAt = [
          { along: cutLo, from: cross, to: target },
          { along: cutHi, from: cross, to: target },
        ];
        if (!spanClear(horizontal, target, cutLo, cutHi, cards, jogAt)) continue;
        const room = frameClearance(horizontal, target, cutLo, cutHi, frames);
        if (room <= dist + 0.4) continue;
        if (!best || room > best.room + 0.2) best = { cutLo, cutHi, target, room };
      }
    }
  }
  if (!best) return null;
  const at = (along: number, value: number): LanePoint =>
    horizontal ? { x: along, y: value } : { x: value, y: along };
  const dir = Math.sign(alongB - alongA) || 1;
  const first = dir > 0 ? best.cutLo : best.cutHi;
  const second = dir > 0 ? best.cutHi : best.cutLo;
  const seq: LanePoint[] = [];
  const push = (point: LanePoint) => {
    const prev = seq[seq.length - 1];
    if (prev && Math.abs(prev.x - point.x) < 0.4 && Math.abs(prev.y - point.y) < 0.4) return;
    seq.push(point);
  };
  push({ ...a });
  if (Math.abs(alongA - first) > 0.4) push(at(first, cross));
  push(at(first, best.target));
  push(at(second, best.target));
  if (Math.abs(alongB - second) > 0.4) push(at(second, cross));
  push({ ...b });
  return seq.length > 2 ? seq : null;
}

function slideFits(
  points: readonly LanePoint[],
  index: number,
  horizontal: boolean,
  next: number,
  cards: readonly LaneBox[],
): boolean {
  const a = points[index];
  const b = points[index + 1];
  const moved = (point: LanePoint): LanePoint =>
    horizontal ? { x: point.x, y: next } : { x: next, y: point.y };
  for (const point of [a, b]) {
    const attached = cardAttachment(point, cards);
    if (!attached) continue;
    if (horizontal && attached.axis === "y") return false;
    if (!horizontal && attached.axis === "x") return false;
    const lo = horizontal ? attached.box.top + 4 : attached.box.left + 4;
    const hi = horizontal ? attached.box.bottom - 4 : attached.box.right - 4;
    if (next < lo || next > hi) return false;
  }
  const first = moved(a);
  const second = moved(b);
  if (!segmentClearOfCards(first, second, cards)) return false;
  if (index > 0 && !segmentClearOfCards(points[index - 1], first, cards)) return false;
  if (index + 2 < points.length && !segmentClearOfCards(second, points[index + 2], cards)) return false;
  return true;
}

/**
 * Отодвигает отрезки, которые идут вдоль границы рамки команды.
 * Короткое пересечение границы остаётся: линия может войти в команду и выйти из неё.
 */
export function pullOffFrameStrokes(
  points: readonly LanePoint[],
  frames: readonly LaneBox[],
  cards: readonly LaneBox[] = [],
  clear = FRAME_STROKE_CLEAR,
): LanePoint[] {
  if (points.length < 2 || frames.length === 0) return points.map((point) => ({ ...point }));
  const next = points.map((point) => ({ x: point.x, y: point.y }));
  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;
    for (let index = 0; index < next.length - 1; index += 1) {
      const a = next[index];
      const b = next[index + 1];
      const horizontal = Math.abs(a.y - b.y) < 0.6;
      const vertical = Math.abs(a.x - b.x) < 0.6;
      if (!horizontal && !vertical) continue;
      const from = horizontal ? Math.min(a.x, b.x) : Math.min(a.y, b.y);
      const to = horizontal ? Math.max(a.x, b.x) : Math.max(a.y, b.y);
      if (to - from < FRAME_RIDE_MIN) continue;
      const fixed = horizontal ? a.y : a.x;
      if (frameClearance(horizontal, fixed, from, to, frames) >= clear - 0.2) continue;
      const candidates: number[] = [];
      for (const frame of frames) {
        const edges = horizontal ? [frame.top, frame.bottom] : [frame.left, frame.right];
        const span = horizontal ? [frame.left, frame.right] : [frame.top, frame.bottom];
        if (spanOverlap(from, to, span[0], span[1]) < FRAME_RIDE_MIN) continue;
        const mid = horizontal ? (frame.top + frame.bottom) / 2 : (frame.left + frame.right) / 2;
        for (const edge of edges) {
          if (Math.abs(fixed - edge) >= clear - 0.2) continue;
          const outward = edge <= mid ? -1 : 1;
          const sign = Math.abs(fixed - edge) < 0.4 ? outward : Math.sign(fixed - edge);
          candidates.push(edge + sign * clear, edge - sign * clear);
        }
      }
      let best: number | null = null;
      let bestClear = frameClearance(horizontal, fixed, from, to, frames);
      for (const candidate of candidates) {
        if (!slideFits(next, index, horizontal, candidate, cards)) continue;
        const room = frameClearance(horizontal, candidate, from, to, frames);
        if (room < clear - 0.2) continue;
        if (best === null || room > bestClear + 0.2) {
          best = candidate;
          bestClear = room;
        }
      }
      if (best === null) {
        const jogged = jogOffFrame(next, index, frames, cards, clear);
        if (!jogged) continue;
        next.splice(index, 2, ...jogged);
        moved = true;
        break;
      }
      if (horizontal) {
        a.y = best;
        b.y = best;
      } else {
        a.x = best;
        b.x = best;
      }
      moved = true;
    }
    if (!moved) break;
  }
  return dedupe(next);
}
