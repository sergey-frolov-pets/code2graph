import {
  arrowMarker,
  clamp,
  contrastTextColor,
  createSvg,
  drawLabelLines,
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
  /** Команда: id из директивы `team` или значение атрибута `team=`. */
  team?: string;
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
  /** Объявленные команды. Пусто — команды не используются, раскладка прежняя. */
  teams: TeamStyle[];
  teamLayout: TeamLayoutSpec;
}

/** Служебный id виртуального корня. */
export const VIRTUAL_ROOT_ID = "__root__";

// --- Команды: общий блок для orgchart и powermap ---------------------------

/** Команда: рамка с подписью вокруг своей части дерева. */
export interface TeamStyle {
  id: string;
  label: string;
  /** id родительской команды: рамки вкладываются друг в друга. */
  parent?: string;
  fill?: string;
  stroke?: string;
  radius: number;
  padding: number;
}

/** Как команды стоят друг относительно друга. */
export interface TeamLayoutSpec {
  mode: "auto" | "row" | "column" | "grid";
  dir: "lr" | "tb";
  gap: number;
  columns: number;
}

/** Виртуальная команда для людей без `team=`: рамки у неё нет. */
export const TEAM_UNGROUPED = "__ungrouped__";
export const TEAM_HEADER = 18;
export const TEAM_HEADER_GAP = 6;
const TEAM_DEFAULT_RADIUS = 10;
const TEAM_DEFAULT_PADDING = 14;
export const DEFAULT_TEAM_LAYOUT: TeamLayoutSpec = { mode: "auto", dir: "lr", gap: 24, columns: 2 };

export interface TeamBoxFrame {
  id: string;
  label: string;
  /** id родительской рамки: вложенные команды рисуются внутри. */
  parent?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  headerHeight: number;
  radius: number;
  fill?: string;
  stroke?: string;
  /** Люди без `team=` — виртуальная команда без рамки и подписи. */
  ghost: boolean;
}

export interface TeamBox<T extends { id: string }> extends TeamBoxFrame {
  placed: PlacedTreeNode<T>[];
}

const TEAM_ATTR_RE = /^(label|parent|fill|stroke|colour|color|radius|padding)=("[^"]*"|'[^']*'|\S*)\s*/i;

/** `team front [Front Office] fill=#f6f8fa radius=12` */
export function parseTeamLine(raw: string): { team?: TeamStyle; error?: string } | null {
  const match = /^team\s+([\p{L}\p{N}_./-]+)(.*)$/iu.exec(raw.trim());
  if (!match) return null;
  const id = match[1];
  let rest = match[2].trim();
  let label = "";
  const bracket = /^\[(.*?)\]\s*/.exec(rest);
  if (bracket) {
    label = unquoteLabel(bracket[1]);
    rest = rest.slice(bracket[0].length).trim();
  }
  // `team sales/moscow` — вложенная команда: путь задаёт родителя.
  const slash = id.lastIndexOf("/");
  const parentFromPath = slash > 0 ? id.slice(0, slash) : undefined;
  const team: TeamStyle = {
    id,
    label,
    radius: TEAM_DEFAULT_RADIUS,
    padding: TEAM_DEFAULT_PADDING,
  };
  if (parentFromPath) team.parent = parentFromPath;
  for (let guard = 0; guard < 12 && rest; guard += 1) {
    const attr = TEAM_ATTR_RE.exec(rest);
    if (!attr) return { error: `неизвестный параметр команды «${rest}»` };
    const key = attr[1].toLowerCase();
    const value = unquote(attr[2]);
    if (key === "label") {
      label = unquoteLabel(value);
      team.label = label;
    } else if (key === "parent") {
      const parent = unquote(value);
      if (!parent || !/^[\p{L}\p{N}_./-]+$/u.test(parent) || parent === id) {
        return { error: `родитель команды: ожидается id другой команды, получено «${value}»` };
      }
      team.parent = parent;
    } else if (key === "fill" || key === "stroke" || key === "colour" || key === "color") {
      if (!isColor(value)) {
        return { error: `цвет команды: ожидается #hex или имя, получено «${value}»` };
      }
      if (key === "fill") team.fill = value;
      else team.stroke = value;
    } else if (key === "radius") {
      const radius = Number(value.replace(/px$/i, "").replace(",", "."));
      if (!Number.isFinite(radius) || radius < 0 || radius > 40) {
        return { error: `радиус команды: ожидается число 0–40, получено «${value}»` };
      }
      team.radius = radius;
    } else if (key === "padding") {
      const padding = Number(value.replace(/px$/i, "").replace(",", "."));
      if (!Number.isFinite(padding) || padding < 0 || padding > 48) {
        return { error: `отступ команды: ожидается число 0–48, получено «${value}»` };
      }
      team.padding = padding;
    }
    rest = rest.slice(attr[0].length).trim();
  }
  if (rest) return { error: `неизвестный параметр команды «${rest}»` };
  return { team };
}

/** `teams layout=grid dir=lr gap=24 columns=3` */
export function parseTeamsLine(raw: string): { patch?: Partial<TeamLayoutSpec>; error?: string } | null {
  if (!/^teams\b/i.test(raw.trim())) return null;
  let rest = raw.trim().replace(/^teams\s*/i, "").trim();
  const patch: Partial<TeamLayoutSpec> = {};
  for (let guard = 0; guard < 8 && rest; guard += 1) {
    const attr = /^(layout|dir|gap|columns)=("[^"]*"|'[^']*'|\S*)\s*/i.exec(rest);
    if (!attr) return { error: `неизвестный параметр раскладки команд «${rest}»` };
    const key = attr[1].toLowerCase();
    const value = unquote(attr[2]).toLowerCase();
    if (key === "layout") {
      if (value !== "auto" && value !== "row" && value !== "column" && value !== "grid") {
        return { error: `раскладка команд: ожидается auto, row, column или grid, получено «${value}»` };
      }
      patch.mode = value;
    } else if (key === "dir") {
      if (value !== "lr" && value !== "tb") {
        return { error: `направление команд: ожидается lr или tb, получено «${value}»` };
      }
      patch.dir = value;
    } else if (key === "gap") {
      const gap = Number(value.replace(/px$/i, "").replace(",", "."));
      if (!Number.isFinite(gap) || gap < 0 || gap > 200) {
        return { error: `зазор между командами: ожидается число 0–200, получено «${value}»` };
      }
      patch.gap = gap;
    } else if (key === "columns") {
      const columns = Number(value);
      if (!Number.isInteger(columns) || columns < 1 || columns > 12) {
        return { error: `число команд в ряду: ожидается целое 1–12, получено «${value}»` };
      }
      patch.columns = columns;
    }
    rest = rest.slice(attr[0].length).trim();
  }
  if (rest) return { error: `неизвестный параметр раскладки команд «${rest}»` };
  return { patch };
}

/**
 * Порядок объявления: родитель раньше детей. Неизвестный родитель создаётся
 * сам (как и команда из `team=`), цикл вложенности разрывается.
 */
export function orderTeams(teams: readonly TeamStyle[]): TeamStyle[] {
  const list = teams.map((team) => ({ ...team }));
  const index = new Map(list.map((team) => [team.id, team]));
  // Родитель, которого не объявили: создаём рамку с подписью-идентификатором.
  for (let cursor = 0; cursor < list.length; cursor += 1) {
    const parent = list[cursor].parent;
    if (!parent || index.has(parent)) continue;
    const stub: TeamStyle = { id: parent, label: parent, radius: 10, padding: 14 };
    index.set(parent, stub);
    list.push(stub);
  }
  const out: TeamStyle[] = [];
  const done = new Set<string>();
  const remaining = [...list];
  while (remaining.length > 0) {
    let moved = false;
    for (let index = 0; index < remaining.length; ) {
      const team = remaining[index];
      if (!team.parent || done.has(team.parent)) {
        out.push(team);
        done.add(team.id);
        remaining.splice(index, 1);
        moved = true;
      } else {
        index += 1;
      }
    }
    if (!moved) {
      // Цикл: рамки вкладывать некуда, оставляем их верхним уровнем.
      for (const team of remaining) {
        delete team.parent;
        out.push(team);
      }
      remaining.length = 0;
    }
  }
  return out;
}

/** Команда каждого узла: неизвестная или пустая — виртуальная группа. */
export function teamMembership<T extends { id: string }>(
  nodes: readonly T[],
  teams: readonly TeamStyle[],
  teamOf: (node: T) => string | undefined,
): Map<string, string> {
  const known = new Set(teams.map((team) => team.id));
  const map = new Map<string, string>();
  for (const node of nodes) {
    const id = teamOf(node);
    map.set(node.id, id && known.has(id) ? id : TEAM_UNGROUPED);
  }
  return map;
}

/**
 * Раскладка с командами: внутри команды — обычное дерево, команды — shelf-паковка.
 * Координаты узлов возвращаются абсолютными, как у `layoutOrgTree`.
 */
export function layoutTeamGroups<T extends { id: string }>(options: {
  nodes: readonly T[];
  edges: readonly { from: string; to: string }[];
  teams: readonly TeamStyle[];
  layout: TeamLayoutSpec;
  teamOf: (node: T) => string | undefined;
  measure: (node: T) => { lines: string[]; width: number; height: number };
  vGap?: number | ((upperDepth: number) => number);
}): {
  placed: PlacedTreeNode<T>[];
  boxes: TeamBox<T>[];
  width: number;
  height: number;
  localEdges: { from: string; to: string }[];
  crossEdges: { from: string; to: string }[];
} {
  const { nodes, edges, teams: declared, layout, teamOf, measure, vGap } = options;
  const teams = orderTeams(declared);
  const membership = teamMembership(nodes, teams, teamOf);
  const groups = new Map<string, T[]>();
  for (const team of teams) groups.set(team.id, []);
  for (const node of nodes) {
    const id = membership.get(node.id) as string;
    const list = groups.get(id) ?? [];
    list.push(node);
    groups.set(id, list);
  }

  const localEdges: { from: string; to: string }[] = [];
  const crossEdges: { from: string; to: string }[] = [];
  for (const edge of edges) {
    const from = membership.get(edge.from);
    const to = membership.get(edge.to);
    if (from === undefined || to === undefined) continue;
    if (from === to) localEdges.push(edge);
    else crossEdges.push(edge);
  }

  const ghostTeam: TeamStyle = { id: TEAM_UNGROUPED, label: "", radius: 0, padding: 0 };
  const byId = new Map<string, TeamStyle>(teams.map((team) => [team.id, team]));
  byId.set(TEAM_UNGROUPED, ghostTeam);
  const known = new Set(teams.map((team) => team.id));
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const team of teams) {
    const parent = team.parent && team.parent !== team.id && known.has(team.parent) ? team.parent : undefined;
    if (!parent) {
      roots.push(team.id);
      continue;
    }
    const list = children.get(parent) ?? [];
    list.push(team.id);
    children.set(parent, list);
  }
  if ((groups.get(TEAM_UNGROUPED) ?? []).length > 0 && !roots.includes(TEAM_UNGROUPED)) {
    roots.push(TEAM_UNGROUPED);
  }

  interface PackItem {
    width: number;
    height: number;
  }
  interface TeamNode {
    id: string;
    box: TeamBox<T>;
    contentWidth: number;
    contentHeight: number;
    insetY: number;
    padding: number;
    items: { x: number; y: number; cards?: PlacedTreeNode<T>[]; kid?: TeamNode }[];
  }

  /** Shelf-паковка: row / column / grid. Тот же порядок и зазоры на всех уровнях. */
  const packItems = (
    items: readonly PackItem[],
    mode: TeamLayoutSpec["mode"],
    columns: number,
    gap: number,
  ): { pos: { x: number; y: number }[]; rows: { start: number; end: number; height: number }[]; width: number; height: number } => {
    const perRow = mode === "grid" ? Math.max(1, columns) : mode === "column" ? 1 : Math.max(1, items.length);
    const pos: { x: number; y: number }[] = [];
    const rows: { start: number; end: number; height: number }[] = [];
    let cursorX = 0;
    let cursorY = 0;
    let rowHeight = 0;
    let totalWidth = 0;
    items.forEach((item, index) => {
      if (index > 0) {
        if (index % perRow === 0) {
          rows.push({ start: index - perRow, end: index, height: rowHeight });
          cursorX = 0;
          cursorY += rowHeight + gap;
          rowHeight = 0;
        } else {
          cursorX += items[index - 1].width + gap;
        }
      }
      pos.push({ x: cursorX, y: cursorY });
      rowHeight = Math.max(rowHeight, item.height);
      totalWidth = Math.max(totalWidth, cursorX + item.width);
    });
    rows.push({
      start: Math.max(0, items.length - (items.length % perRow || perRow)),
      end: items.length,
      height: rowHeight,
    });
    return { pos, rows, width: totalWidth, height: cursorY + rowHeight };
  };

  /** Свои люди команды: обычное дерево внутри её рамки. */
  const cardsOf = (teamId: string): { placed: PlacedTreeNode<T>[]; width: number; height: number } | null => {
    const members = groups.get(teamId) ?? [];
    if (members.length === 0) return null;
    const ids = new Set(members.map((member) => member.id));
    const reports = localEdges.filter((edge) => ids.has(edge.from));
    const hasParent = new Set(reports.map((edge) => edge.to));
    const idRoots = members.filter((member) => !hasParent.has(member.id)).map((member) => member.id);
    const virtualRoot = idRoots.length !== 1;
    return layoutOrgTree(members, reports, virtualRoot, virtualRoot ? null : idRoots[0], measure, vGap);
  };

  const mode = layout.mode === "auto" ? (layout.dir === "tb" ? "column" : "row") : layout.mode;

  /**
   * Замер узла: своя группа людей и/или вложенные команды, упакованные как элементы.
   * Верхний уровень живёт по `teams layout=`, вложенные — по `dir`: дети в ряд или в столбец.
   */
  const measureNode = (teamId: string, depth: number): TeamNode | null => {
    const team = byId.get(teamId);
    if (!team) return null;
    const ghost = teamId === TEAM_UNGROUPED;
    const laid = cardsOf(teamId);
    const kids = (children.get(teamId) ?? [])
      .map((id) => measureNode(id, depth + 1))
      .filter((node): node is TeamNode => node !== null);
    if (!laid && kids.length === 0) return null;
    const items: PackItem[] = [];
    if (laid) items.push({ width: laid.width, height: laid.height });
    for (const kid of kids) items.push({ width: kid.box.width, height: kid.box.height });
    const innerMode: TeamLayoutSpec["mode"] =
      depth === 0 ? mode : layout.dir === "tb" ? "column" : "row";
    const packed = packItems(items, innerMode, layout.columns, layout.gap);
    const contentWidth = packed.width;
    const contentHeight = packed.height;
    // Рамки одного ряда выравниваются по высоте: разная высота команд выглядит случайной.
    for (const row of packed.rows) {
      for (let index = Math.max(0, row.start); index < Math.min(row.end, items.length); index += 1) {
        items[index].height = row.height;
      }
    }
    for (let index = 0; index < kids.length; index += 1) {
      kids[index].box.height = items[laid ? index + 1 : index].height;
    }
    const headerHeight = ghost || !team.label ? 0 : TEAM_HEADER;
    const padding = ghost ? 0 : team.padding;
    const insetY = headerHeight ? TEAM_HEADER_GAP + headerHeight : 0;
    const box: TeamBox<T> = {
      id: teamId,
      label: team.label,
      parent: ghost ? undefined : team.parent,
      x: 0,
      y: 0,
      width: contentWidth + 2 * padding,
      height: contentHeight + insetY + 2 * padding,
      headerHeight,
      radius: ghost ? 0 : team.radius,
      fill: team.fill,
      stroke: team.stroke,
      ghost,
      placed: [],
    };
    const node: TeamNode = {
      id: teamId,
      box,
      contentWidth,
      contentHeight,
      insetY,
      padding,
      items: [],
    };
    let kidIndex = 0;
    items.forEach((_item, index) => {
      const slot: TeamNode["items"][number] = { x: packed.pos[index].x, y: packed.pos[index].y };
      if (laid && index === 0) slot.cards = laid.placed;
      else {
        slot.kid = kids[kidIndex];
        kidIndex += 1;
      }
      node.items.push(slot);
    });
    return node;
  };

  /** Абсолютные координаты: содержимое центрируется в рамке (в т.ч. после выравнивания ряда). */
  const placeNode = (node: TeamNode, x: number, y: number): void => {
    node.box.x = x;
    node.box.y = y;
    const dx = node.padding + (node.box.width - 2 * node.padding - node.contentWidth) / 2;
    const slack = node.box.height - node.insetY - 2 * node.padding - node.contentHeight;
    const dy = node.insetY + node.padding + Math.max(0, slack) / 2;
    for (const item of node.items) {
      if (item.cards) {
        for (const card of item.cards) {
          node.box.placed.push({ ...card, x: x + dx + item.x + card.x, y: y + dy + item.y + card.y });
        }
      }
      if (item.kid) placeNode(item.kid, x + dx + item.x, y + dy + item.y);
    }
  };

  const rootNodes = roots
    .map((id) => measureNode(id, 0))
    .filter((node): node is TeamNode => node !== null);
  const topItems: PackItem[] = rootNodes.map((node) => ({ width: node.box.width, height: node.box.height }));
  const top = packItems(topItems, mode, layout.columns, layout.gap);
  for (const row of top.rows) {
    for (let index = Math.max(0, row.start); index < Math.min(row.end, topItems.length); index += 1) {
      topItems[index].height = row.height;
      rootNodes[index].box.height = topItems[index].height;
    }
  }
  rootNodes.forEach((node, index) => placeNode(node, top.pos[index].x, top.pos[index].y));

  const boxes: TeamBox<T>[] = [];
  const placed: PlacedTreeNode<T>[] = [];
  const walk = (node: TeamNode): void => {
    boxes.push(node.box);
    for (const card of node.box.placed) placed.push(card);
    for (const item of node.items) if (item.kid) walk(item.kid);
  };
  for (const node of rootNodes) walk(node);

  return { placed, boxes, width: top.width, height: top.height, localEdges, crossEdges };
}

/** Фон команды и её подпись. Рисуется до рёбер, чтобы линии шли поверх рамки. */
export function drawTeamBoxes(
  svg: SvgBuilder,
  boxes: readonly TeamBoxFrame[],
  offsetX: number,
  offsetY: number,
  palette: { bg: string; fg: string; fgDim: string; axis: string },
  mono: boolean,
  invert: boolean,
  kind: "powermap" | "orgchart" = "powermap",
): void {
  for (const box of boxes) {
    if (box.ghost) continue;
    const x = offsetX + box.x;
    const y = offsetY + box.y;
    const fill = mono ? monoPaint(box.fill ?? palette.bg, invert) : (box.fill ?? palette.bg);
    const stroke = mono ? monoPaint(box.stroke ?? palette.axis, invert) : (box.stroke ?? palette.axis);
    svg.rect(x, y, box.width, box.height, {
      rx: box.radius,
      ry: box.radius,
      fill,
      "fill-opacity": box.fill ? 0.55 : 0.35,
      stroke,
      "stroke-width": 1.2,
      "stroke-dasharray": "6 4",
      "data-team": kind,
      "data-team-id": box.id,
    });
    if (box.headerHeight) {
      drawLabelLines(
        svg,
        x + 12,
        y + box.headerHeight - 3,
        box.label,
        11,
        { fill: palette.fg, "font-weight": 600, "text-anchor": "start", "data-team-label": "1" },
        "down",
      );
    }
  }
}

/**
 * Чужие рамки команд как препятствия: рамка и её подпись.
 * Свои команды (`fromTeam`/`toTeam`) не мешают — стрелка выходит из них и входит в них.
 */
export function foreignTeamBoxes(
  boxes: readonly TeamBoxFrame[],
  membership: Map<string, string> | undefined,
  fromId: string,
  toId: string,
  offsetX: number,
  offsetY: number,
  labelFont = 11,
): { left: number; right: number; top: number; bottom: number }[] {
  if (!membership) return [];
  const fromTeam = membership.get(fromId);
  const toTeam = membership.get(toId);
  // Общие предки вложенных команд не препятствие: стрелка выходит из них и входит в них.
  const parents = new Map<string, string>();
  for (const box of boxes) if (box.parent) parents.set(box.id, box.parent);
  const allowed = new Set<string>();
  for (const start of [fromTeam, toTeam]) {
    let cursor = start;
    for (let guard = 0; cursor && guard <= boxes.length; guard += 1) {
      allowed.add(cursor);
      cursor = parents.get(cursor);
    }
  }
  const out: { left: number; right: number; top: number; bottom: number }[] = [];
  for (const box of boxes) {
    if (box.ghost) continue;
    if (allowed.has(box.id)) continue;
    const left = offsetX + box.x;
    const top = offsetY + box.y;
    out.push({ left, right: left + box.width, top, bottom: top + box.height });
    if (box.headerHeight && box.label) {
      const width = measureText(box.label, labelFont + 1) * 1.05 + 8;
      out.push({
        left: left + 8,
        right: left + 8 + width,
        top: top + 1,
        bottom: top + box.headerHeight + 2,
      });
    }
  }
  return out;
}



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
  // `\n`, настоящий перевод строки, `<br>` и `|` (как имя|должность в powermap)
  // становятся строками блока. `\|` остаётся символом «|».
  const protectedPipes = base.replace(/\\\|/g, "\uE000");
  const parts = protectedPipes
    .split(/\\n|\r?\n|<br\s*\/?>|\|/i)
    .map((line) => line.trim().replace(/\uE000/g, "|"));
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
  /^(border-style|borderstyle|border-width|borderwidth|color|colour|fill|border|stroke|style|width|thickness|photo|gender|avatar|team)=("[^"]*"|'[^']*'|\S*)\s*/i;

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
  /** `team=<id>` — команда блока. `team=-` выводит из команды. */
  team?: string;
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
  /(?:^|\s)(?:border-style|borderstyle|border-width|borderwidth|color|colour|fill|border|stroke|style|width|thickness|photo|gender|avatar|team)=/i;

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
          error: `фото: ожидается ссылка на файл или http(s)-адрес; запасной вид — data:image (png, jpeg, gif, webp), получено «${value.slice(0, 48)}»`,
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
    } else if (key === "team") {
      if (!value || value === "-" || /^(off|none)$/i.test(value)) paint.team = "";
      else if (!/^[\p{L}\p{N}_./-]+$/u.test(value)) {
        return { error: `команда узла: ожидается id из букв, цифр, «_» или «-», получено «${value}»` };
      } else paint.team = value;
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
  if (paint.team !== undefined) node.team = paint.team || undefined;
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
  const teams: TeamStyle[] = [];
  const teamIndex = new Map<string, TeamStyle>();
  const teamLayout: TeamLayoutSpec = { ...DEFAULT_TEAM_LAYOUT };
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

    const teamsLine = parseTeamsLine(raw);
    if (teamsLine) {
      if (teamsLine.error || !teamsLine.patch) {
        errors.push({
          message: teamsLine.error ?? "не удалось разобрать раскладку команд",
          line: lineNo,
          col: 0,
        });
      } else {
        Object.assign(teamLayout, teamsLine.patch);
      }
      continue;
    }

    const teamLine = parseTeamLine(raw);
    if (teamLine) {
      if (teamLine.error || !teamLine.team) {
        errors.push({
          message: teamLine.error ?? "не удалось разобрать команду",
          line: lineNo,
          col: 0,
        });
      } else {
        const key = teamLine.team.id;
        const previous = teamIndex.get(key);
        if (previous) Object.assign(previous, teamLine.team);
        else {
          teamIndex.set(key, teamLine.team);
          teams.push(teamLine.team);
        }
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

  // `team=front` без директивы — команда создаётся сама, с дефолтным стилем.
  for (const node of nodes) {
    const id = node.team;
    if (!id || teamIndex.has(id)) continue;
    const slash = id.lastIndexOf("/");
    const auto: TeamStyle = {
      id,
      label: slash >= 0 ? id.slice(slash + 1) : id,
      ...(slash > 0 ? { parent: id.slice(0, slash) } : {}),
      radius: TEAM_DEFAULT_RADIUS,
      padding: TEAM_DEFAULT_PADDING,
    };
    teamIndex.set(id, auto);
    teams.push(auto);
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
      teams: orderTeams(teams),
      teamLayout,
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
  vGap?: number | ((upperDepth: number) => number),
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
  for (let index = 0; index < levelKeys.length; index += 1) {
    const d = levelKeys[index];
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
    const gap =
      index < levelKeys.length - 1
        ? typeof vGap === "function"
          ? vGap(d)
          : (vGap ?? V_GAP)
        : 0;
    y += rowH + gap;
  }

  const height = Math.max(0, y);
  return { placed, width: contentWidth, height };
}

interface OrgLayout {
  placed: PlacedTreeNode<OrgNode>[];
  width: number;
  height: number;
  /** Рамки команд; пусто — команд нет. */
  boxes: TeamBox<OrgNode>[];
  /** Связи внутри команд: рисуются локтями как раньше. */
  localEdges: OrgEdge[];
  /** Связи между командами: идут через отдельный роутер. */
  crossEdges: OrgEdge[];
  /** Команда каждого узла — только когда команды включены. */
  membership: Map<string, string> | null;
}

function layout(model: OrgModel): OrgLayout {
  const measure = (node: OrgNode) => measureNode(node, model.avatarSize ?? 0);
  if (model.teams.length === 0) {
    const tree = layoutOrgTree(model.nodes, model.edges, model.virtualRoot, model.root, measure);
    return { ...tree, boxes: [], localEdges: model.edges, crossEdges: [], membership: null };
  }

  const grouped = layoutTeamGroups({
    nodes: model.nodes,
    edges: model.edges,
    teams: model.teams,
    layout: model.teamLayout ?? DEFAULT_TEAM_LAYOUT,
    teamOf: (node) => node.team,
    measure,
  });
  const styleOf = new Map(model.edges.map((edge) => [`${edge.from}\u0000${edge.to}`, edge.style]));
  const wrap = (edge: { from: string; to: string }): OrgEdge => ({
    from: edge.from,
    to: edge.to,
    style: styleOf.get(`${edge.from}\u0000${edge.to}`) ?? "solid",
  });
  return {
    placed: grouped.placed,
    width: grouped.width,
    height: grouped.height,
    boxes: grouped.boxes,
    localEdges: grouped.localEdges.map(wrap),
    crossEdges: grouped.crossEdges.map(wrap),
    membership: teamMembership(model.nodes, model.teams, (node) => node.team),
  };
}

/** Прямоугольник карточки в координатах холста. */
interface CanvasRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function cardRect(card: PlacedTreeNode<OrgNode>, offsetX: number, offsetY: number): CanvasRect {
  const left = offsetX + card.x;
  const top = offsetY + card.y;
  return { left, right: left + card.width, top, bottom: top + card.height };
}

function crossesRect(x0: number, x1: number, y: number, rect: CanvasRect): boolean {
  if (y <= rect.top + 1 || y >= rect.bottom - 1) return false;
  const lo = Math.min(x0, x1);
  const hi = Math.max(x0, x1);
  return hi > rect.left + 1 && lo < rect.right - 1;
}

/**
 * Межкомандная связь: выход из нижней кромки, полка в свободном коридоре и вход
 * в верхнюю кромку. Полка не заходит в чужие рамки команд.
 */
function crossTeamRoute(
  from: PlacedTreeNode<OrgNode>,
  to: PlacedTreeNode<OrgNode>,
  obstacles: readonly CanvasRect[],
  offsetX: number,
  offsetY: number,
): { x1: number; y1: number; x2: number; y2: number; midY: number } {
  const a = cardRect(from, offsetX, offsetY);
  const b = cardRect(to, offsetX, offsetY);
  const down = b.top >= a.bottom;
  const up = b.bottom <= a.top;
  const x1 = (a.left + a.right) / 2;
  const x2 = (b.left + b.right) / 2;
  const y1 = down ? a.bottom : up ? a.top : a.bottom;
  const y2 = down ? b.top : up ? b.bottom : b.top;

  const lo = Math.min(y1, y2) + 6;
  const hi = Math.max(y1, y2) - 6;
  if (hi <= lo) return { x1, y1, x2, y2, midY: (y1 + y2) / 2 };

  const mid = (y1 + y2) / 2;
  const candidates = new Set<number>([mid]);
  for (const rect of obstacles) {
    candidates.add(rect.top - 8);
    candidates.add(rect.bottom + 8);
  }
  const sorted = [...candidates]
    .filter((y) => y > lo && y < hi)
    .sort((left, right) => Math.abs(left - mid) - Math.abs(right - mid));
  const free = sorted.find((y) => !obstacles.some((rect) => crossesRect(x1, x2, y, rect)));
  return { x1, y1, x2, y2, midY: free ?? mid };
}

/** Межкомандные связи: тот же стиль, что у обычных рёбер, но полка обходит чужие рамки. */
function drawCrossTeamEdges(
  svg: SvgBuilder,
  placed: readonly PlacedTreeNode<OrgNode>[],
  edges: readonly OrgEdge[],
  boxes: readonly TeamBoxFrame[],
  membership: Map<string, string> | null,
  offsetX: number,
  offsetY: number,
  stroke: string,
  markerRef: string,
): void {
  if (edges.length === 0) return;
  const byId = new Map(placed.map((card) => [card.node.id, card]));
  for (const edge of edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const obstacles = foreignTeamBoxes(
      boxes,
      membership ?? undefined,
      edge.from,
      edge.to,
      offsetX,
      offsetY,
      FONT,
    );
    const { x1, y1, x2, y2, midY } = crossTeamRoute(from, to, obstacles, offsetX, offsetY);
    const d = `M ${fmt(x1)} ${fmt(y1)} L ${fmt(x1)} ${fmt(midY)} L ${fmt(x2)} ${fmt(midY)} L ${fmt(x2)} ${fmt(y2)}`;
    const attrs: Record<string, string | number> = {
      d,
      fill: "none",
      stroke,
      "stroke-width": 1.2,
      "marker-end": markerRef,
      "data-cross-team": "1",
    };
    if (edge.style === "dotted") attrs["stroke-dasharray"] = "4 4";
    svg.path(d, attrs);
  }
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

export interface ReportingElbow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midY: number;
  style: OrgEdgeStyle;
}

/** Ломаные подчинения: те же точки, что рисует `drawReportingElbows`. */
export function reportingElbowRoutes<T extends { id: string }>(
  placed: readonly PlacedTreeNode<T>[],
  edges: readonly { from: string; to: string; style: OrgEdgeStyle }[],
  offsetX: number,
  offsetY: number,
): ReportingElbow[] {
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

  const elbows: ReportingElbow[] = [];
  for (const item of drawable) {
    const { edge, y1, y2, corridorTop, x1, x2 } = item;
    const lane = laneByEdge.get(item) ?? { lane: 0, laneCount: 1 };
    const midY = elbowLaneY(corridorTop, y2, lane.lane, lane.laneCount);
    elbows.push({ x1, y1, x2, y2, midY, style: edge.style });
  }
  return elbows;
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
  for (const elbow of reportingElbowRoutes(placed, edges, offsetX, offsetY)) {
    const { x1, y1, x2, y2, midY } = elbow;
    const d = `M ${fmt(x1)} ${fmt(y1)} L ${fmt(x1)} ${fmt(midY)} L ${fmt(x2)} ${fmt(midY)} L ${fmt(x2)} ${fmt(y2)}`;
    const attrs: Record<string, string | number> = {
      d,
      fill: "none",
      stroke,
      "stroke-width": 1.2,
      "marker-end": markerRef,
    };
    if (elbow.style === "dotted") attrs["stroke-dasharray"] = "4 4";
    svg.path(d, attrs);
  }
}

export function renderOrgchart(model: OrgModel, options: ExtRenderOptions): string {
  const themeDark = Boolean(options.dark) || usesInvertedMono(model.mono, model.monoInvert, false);
  const invertedMono = usesInvertedMono(model.mono, model.monoInvert, options.dark);
  const palette = getPalette(themeDark);
  const { placed, width: contentWidth, height: contentHeight, boxes, localEdges, crossEdges, membership } =
    layout(model);

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
    xlink: model.nodes.some((node) => Boolean(node.photo)),
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
  if (boxes.length > 0) {
    drawTeamBoxes(svg, boxes, offsetX, offsetY, palette, Boolean(model.mono), invertedMono, "orgchart");
  }
  drawReportingElbows(svg, placed, localEdges, offsetX, offsetY, palette.axis, marker.ref);
  drawCrossTeamEdges(
    svg,
    placed,
    crossEdges,
    boxes,
    membership,
    offsetX,
    offsetY,
    palette.axis,
    marker.ref,
  );

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
