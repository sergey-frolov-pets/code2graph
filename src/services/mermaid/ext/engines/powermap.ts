import {
  arrowMarker,
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
} from "../common";
import { growPlotToAspect, parseAspectDirective, type ChartAspect } from "../chart-aspect";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";
import { isColor } from "./waterfall/directive-parsers";
import {
  AVATAR_DEFAULT_PX,
  avatarBoxSize,
  parseAvatarDirective,
  parseGender,
  renderAvatarBox,
  sanitizePhotoHref,
  type AvatarGender,
} from "./avatar";
import { drawReportingElbows, layoutOrgTree, type PlacedTreeNode } from "./orgchart";

export type ReportStyle = "solid" | "dotted";
export type LinkStroke = "solid" | "dash" | "dot" | "dashdot";

export interface ScoreSwatch {
  code: string;
  name: string;
  color: string;
}

export interface PowerPerson {
  id: string;
  name: string;
  title: string;
  photo?: string;
  gender?: AvatarGender;
  hideAvatar?: boolean;
  role?: ScoreSwatch;
  influence?: ScoreSwatch;
  action?: ScoreSwatch;
  attitude?: ScoreSwatch;
  counterpart: string;
}

export interface PowerLinkStyle {
  name: string;
  color: string;
  style: LinkStroke;
  label: string;
  width: number;
}

export interface PowerReportEdge {
  from: string;
  to: string;
  style: ReportStyle;
}

export interface PowerInfluenceEdge {
  from: string;
  to: string;
  name: string;
}

export interface PowerModel {
  title?: string;
  company?: string;
  legend: boolean;
  avatarSize: number;
  mono?: boolean;
  monoInvert?: boolean;
  ratio?: ChartAspect;
  people: PowerPerson[];
  reports: PowerReportEdge[];
  influences: PowerInfluenceEdge[];
  links: PowerLinkStyle[];
  root: string | null;
  virtualRoot: boolean;
}

const ROLES: readonly ScoreSwatch[] = [
  { code: "E", name: "Endorser", color: "#e5534b" },
  { code: "D", name: "Decider", color: "#2da44e" },
  { code: "A", name: "Assessor", color: "#e7a0b4" },
  { code: "U", name: "User", color: "#5b8def" },
  { code: "C", name: "Coach", color: "#e3c34a" },
];

const INFLUENCE: readonly ScoreSwatch[] = [
  { code: "L", name: "Large", color: "#2da44e" },
  { code: "M", name: "Medium", color: "#e7a0b4" },
  { code: "S", name: "Small", color: "#9ec9e8" },
];

const ACTIONS: readonly ScoreSwatch[] = [
  { code: "U", name: "Urgent", color: "#2da44e" },
  { code: "S", name: "Significant", color: "#e7a0b4" },
  { code: "M", name: "Modest", color: "#9ec9e8" },
];

const ATTITUDES: readonly ScoreSwatch[] = [
  { code: "++", name: "Enthusiastic", color: "#1a7f37" },
  { code: "+", name: "Positive", color: "#8fd18a" },
  { code: "0", name: "Neutral", color: "#f6f8fa" },
  { code: "-", name: "Negative", color: "#e7a0b4" },
  { code: "--", name: "Hostile", color: "#e5534b" },
];

const COUNTERPART_COLOR = "#ddd6fe";
const EMPTY_CHIP = "#f6f8fa";
const CHIP_STROKE = "#d0d7de";

const NAME_FONT = 12;
const TITLE_FONT = 10;
const CHIP_FONT = 10;
const LINE_HEIGHT = 16;
const CARD_PAD_X = 10;
const CARD_PAD_Y = 8;
const CARD_GAP = 8;
const CHIP_H = 16;
const COUNTER_H = 16;
const CARD_MIN_WIDTH = 120;
const HEADER_PAD = 20;
/** Зазор между низом легенды и первой карточкой. */
const LEGEND_CLEARANCE = 28;

const LINK_STROKE_WIDTH = 1.4;
const BUILTIN_LINK_WIDTH = 1.4;

const BUILTIN_LINKS: Record<string, PowerLinkStyle> = {
  supporter: { name: "supporter", color: "#1a7f37", style: "solid", label: "supporter", width: BUILTIN_LINK_WIDTH },
  enemy: { name: "enemy", color: "#cf222e", style: "dash", label: "enemy", width: BUILTIN_LINK_WIDTH },
};

const STROKE_DASH: Record<LinkStroke, string | undefined> = {
  solid: undefined,
  dash: "7 4",
  dot: "1.5 3.5",
  dashdot: "8 3 1.5 3",
};

const SCORE_ALIASES: Record<string, ScoreSwatch> = {};
for (const item of ROLES) SCORE_ALIASES[`role:${item.code.toLowerCase()}`] = item;
SCORE_ALIASES["role:endorser"] = ROLES[0];
SCORE_ALIASES["role:decider"] = ROLES[1];
SCORE_ALIASES["role:assessor"] = ROLES[2];
SCORE_ALIASES["role:user"] = ROLES[3];
SCORE_ALIASES["role:coach"] = ROLES[4];
for (const item of INFLUENCE) SCORE_ALIASES[`influence:${item.code.toLowerCase()}`] = item;
SCORE_ALIASES["influence:large"] = INFLUENCE[0];
SCORE_ALIASES["influence:medium"] = INFLUENCE[1];
SCORE_ALIASES["influence:small"] = INFLUENCE[2];
for (const item of ACTIONS) SCORE_ALIASES[`action:${item.code.toLowerCase()}`] = item;
SCORE_ALIASES["action:urgent"] = ACTIONS[0];
SCORE_ALIASES["action:significant"] = ACTIONS[1];
SCORE_ALIASES["action:modest"] = ACTIONS[2];
for (const item of ATTITUDES) SCORE_ALIASES[`attitude:${item.code}`] = item;
SCORE_ALIASES["attitude:enthusiastic"] = ATTITUDES[0];
SCORE_ALIASES["attitude:positive"] = ATTITUDES[1];
SCORE_ALIASES["attitude:neutral"] = ATTITUDES[2];
SCORE_ALIASES["attitude:negative"] = ATTITUDES[3];
SCORE_ALIASES["attitude:hostile"] = ATTITUDES[4];

function lookupScore(axis: string, raw: string): ScoreSwatch | null {
  return SCORE_ALIASES[`${axis}:${raw.trim().toLowerCase()}`] ?? SCORE_ALIASES[`${axis}:${raw.trim()}`] ?? null;
}

function unquote(raw: string): string {
  const t = String(raw ?? "").trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

function unquoteLabel(raw: string): string {
  const base = unquote(raw).replace(/\\\[/g, "[").replace(/\\\]/g, "]");
  const parts = base.split(/\\n|\r?\n/).map((line) => line.trim());
  const nonEmpty = parts.filter((line) => line.length > 0);
  return (nonEmpty.length > 0 ? nonEmpty : [""]).join("\n");
}

function splitPerson(label: string, id: string): { name: string; title: string } {
  const source = label.trim() || id;
  if (source.includes("|")) {
    const [name, ...rest] = source.split("|");
    return { name: name.trim() || id, title: rest.join("|").trim() };
  }
  const lines = splitLabelLines(source);
  return { name: lines[0] || id, title: lines.slice(1).join("\n") };
}

function normalizeLinkStyle(raw: string): LinkStroke | null {
  switch (raw.trim().toLowerCase()) {
    case "solid":
    case "-":
      return "solid";
    case "dash":
    case "dashed":
    case "--":
      return "dash";
    case "dot":
    case "dotted":
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

const PERSON_ATTR_RE =
  /^(role|influence|action|attitude|counterpart|photo|gender|avatar)=("[^"]*"|'[^']*'|\S*)\s*/i;

interface PersonAttrs {
  role?: ScoreSwatch;
  influence?: ScoreSwatch;
  action?: ScoreSwatch;
  attitude?: ScoreSwatch;
  counterpart?: string;
  photo?: string;
  gender?: AvatarGender;
  hideAvatar?: boolean;
}

function parsePersonAttrs(tail: string): { attrs?: PersonAttrs; error?: string } {
  if (!tail) return { attrs: {} };
  const attrs: PersonAttrs = {};
  let rest = tail.trim();
  for (let guard = 0; guard < 24 && rest; guard += 1) {
    const match = PERSON_ATTR_RE.exec(rest);
    if (!match) {
      return { error: `неизвестный параметр узла «${rest}»` };
    }
    const key = match[1].toLowerCase();
    const value = unquote(match[2]);
    if (key === "role" || key === "influence" || key === "action" || key === "attitude") {
      const score = lookupScore(key, value);
      if (!score) {
        return { error: `${key}: неизвестное значение «${value}»` };
      }
      attrs[key] = score;
    } else if (key === "counterpart") {
      attrs.counterpart = value;
    } else if (key === "photo") {
      const href = sanitizePhotoHref(value);
      if (!href) {
        return { error: `фото: ожидается http(s)-адрес или data:image (png, jpeg, gif, webp)` };
      }
      attrs.photo = href;
    } else if (key === "gender") {
      const gender = parseGender(value);
      if (!gender) return { error: `пол: ожидается m, f или ?, получено «${value}»` };
      attrs.gender = gender;
    } else if (key === "avatar") {
      if (!/^(off|none|hide)$/i.test(value)) {
        return { error: `avatar узла: ожидается off, получено «${value}»` };
      }
      attrs.hideAvatar = true;
    }
    rest = rest.slice(match[0].length).trim();
  }
  if (rest) return { error: `неизвестный параметр узла «${rest}»` };
  return { attrs };
}

function splitBracket(raw: string): { body: string; tail: string } {
  let open = -1;
  let close = -1;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === "\\") {
      i += 1;
      continue;
    }
    if (raw[i] === "[" && open < 0) open = i;
    if (raw[i] === "]") close = i;
  }
  if (open >= 0 && close > open) {
    return { body: raw.slice(0, close + 1).trim(), tail: raw.slice(close + 1).trim() };
  }
  const attrAt = /(?:^|\s)(?:role|influence|action|attitude|counterpart|photo|gender|avatar)=/i.exec(raw);
  if (attrAt && attrAt.index > 0) {
    return { body: raw.slice(0, attrAt.index).trim(), tail: raw.slice(attrAt.index).trim() };
  }
  return { body: raw.trim(), tail: "" };
}

const NAMED_EDGE_RE = /^(.*?)\s+-\s*([\p{L}][\p{L}\p{N}_-]*)\s*->\s*(.+)$/u;

function parseRelation(
  raw: string,
): { kind: "report"; style: ReportStyle; from: string; to: string } | { kind: "influence"; name: string; from: string; to: string } | null {
  const dottedAt = raw.indexOf("-.->");
  if (dottedAt >= 0) {
    const from = unquote(raw.slice(0, dottedAt));
    const to = unquote(raw.slice(dottedAt + 4));
    if (!from || !to) return null;
    return { kind: "report", style: "dotted", from, to };
  }
  const named = NAMED_EDGE_RE.exec(raw);
  if (named) {
    const from = unquote(named[1]);
    const to = unquote(named[3]);
    if (!from || !to) return null;
    return { kind: "influence", name: named[2], from, to };
  }
  const solidAt = raw.indexOf("->");
  if (solidAt >= 0) {
    const from = unquote(raw.slice(0, solidAt));
    const to = unquote(raw.slice(solidAt + 2));
    if (!from || !to) return null;
    return { kind: "report", style: "solid", from, to };
  }
  return null;
}

const LINK_ATTR_RE = /^(color|colour|style|label|width)=("[^"]*"|'[^']*'|\S*)\s*/i;

function parseLinkLine(raw: string): { link?: PowerLinkStyle; error?: string } | null {
  const match = /^link\s+([\p{L}][\p{L}\p{N}_-]*)\s*(.*)$/iu.exec(raw.trim());
  if (!match) return null;
  const name = match[1];
  const builtin = BUILTIN_LINKS[name.toLowerCase()];
  const link: PowerLinkStyle = builtin
    ? { ...builtin, name }
    : { name, color: "#6e7781", style: "solid", label: name, width: LINK_STROKE_WIDTH };
  let rest = match[2].trim();
  for (let guard = 0; guard < 8 && rest; guard += 1) {
    const attr = LINK_ATTR_RE.exec(rest);
    if (!attr) return { error: `неизвестный параметр связи «${rest}»` };
    const key = attr[1].toLowerCase();
    const value = unquote(attr[2]);
    if (key === "color" || key === "colour") {
      if (!isColor(value)) return { error: `цвет связи: ожидается #hex или имя, получено «${value}»` };
      link.color = value;
    } else if (key === "style") {
      const style = normalizeLinkStyle(value);
      if (!style) return { error: `стиль связи: ожидается solid|dash|dot|dashdot, получено «${value}»` };
      link.style = style;
    } else if (key === "label") {
      link.label = value || name;
    } else if (key === "width") {
      const width = Number(value.replace(/px$/i, "").replace(",", "."));
      if (!Number.isFinite(width) || width <= 0) {
        return { error: `толщина связи: ожидается положительное число, получено «${value}»` };
      }
      link.width = Math.min(8, Math.max(0.5, width));
    }
    rest = rest.slice(attr[0].length).trim();
  }
  if (rest) return { error: `неизвестный параметр связи «${rest}»` };
  return { link };
}

function applyAttrs(person: PowerPerson, attrs: PersonAttrs | undefined): void {
  if (!attrs) return;
  if (attrs.role) person.role = attrs.role;
  if (attrs.influence) person.influence = attrs.influence;
  if (attrs.action) person.action = attrs.action;
  if (attrs.attitude) person.attitude = attrs.attitude;
  if (attrs.counterpart !== undefined) person.counterpart = attrs.counterpart || "-";
  if (attrs.photo) person.photo = attrs.photo;
  if (attrs.gender) person.gender = attrs.gender;
  if (attrs.hideAvatar) person.hideAvatar = true;
}

export function parsePowermap(source: string): ExtParseResult<PowerModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);
  let title: string | undefined;
  let company: string | undefined;
  let legend = true;
  let avatarSize = AVATAR_DEFAULT_PX;
  let mono = false;
  let monoInvert = false;
  let ratio: ChartAspect | undefined;
  const people: PowerPerson[] = [];
  const index = new Map<string, PowerPerson>();
  const reports: PowerReportEdge[] = [];
  const influences: PowerInfluenceEdge[] = [];
  const links: PowerLinkStyle[] = [];
  const linkIndex = new Map<string, PowerLinkStyle>();
  let seenType = false;

  const ensure = (id: string, label?: string, attrs?: PersonAttrs): PowerPerson => {
    const existing = index.get(id);
    if (existing) {
      if (label && existing.name === existing.id && !existing.title) {
        const parts = splitPerson(label, id);
        existing.name = parts.name;
        existing.title = parts.title;
      }
      applyAttrs(existing, attrs);
      return existing;
    }
    const parts = splitPerson(label || id, id);
    const person: PowerPerson = {
      id,
      name: parts.name,
      title: parts.title,
      counterpart: "-",
    };
    applyAttrs(person, attrs);
    index.set(id, person);
    people.push(person);
    return person;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;
    if (!seenType) {
      seenType = true;
      continue;
    }

    if (/^title\b/i.test(raw)) {
      title = raw.replace(/^title\s*/i, "").trim() || undefined;
      continue;
    }
    if (/^company\b/i.test(raw)) {
      company = unquote(raw.replace(/^company\s*/i, "")) || undefined;
      continue;
    }
    if (/^legend\b/i.test(raw)) {
      const flag = raw.replace(/^legend\s*/i, "").trim().toLowerCase();
      if (!flag || flag === "on") legend = true;
      else if (flag === "off") legend = false;
      else errors.push({ message: `легенда: ожидается on или off, получено «${flag}»`, line: lineNo, col: 0 });
      continue;
    }
    const avatar = parseAvatarDirective(raw);
    if (avatar) {
      if ("error" in avatar) errors.push({ message: avatar.error, line: lineNo, col: 0 });
      else avatarSize = avatar.enabled ? avatar.size : 0;
      continue;
    }
    const aspect = parseAspectDirective(raw);
    if (aspect) {
      if ("error" in aspect) errors.push({ message: aspect.error, line: lineNo, col: 0 });
      else ratio = aspect.aspect;
      continue;
    }
    if (/^mono\b/i.test(raw)) {
      const parsed = parseMonoDirective(raw.replace(/^mono\s*/i, ""));
      if ("error" in parsed) errors.push({ message: parsed.error, line: lineNo, col: 0 });
      else {
        const flags = monoFlagsFromMode(parsed.mode);
        mono = flags.mono;
        monoInvert = flags.monoInvert;
      }
      continue;
    }

    const linkLine = parseLinkLine(raw);
    if (linkLine) {
      if (linkLine.error || !linkLine.link) {
        errors.push({ message: linkLine.error ?? "не удалось разобрать связь", line: lineNo, col: 0 });
      } else {
        const key = linkLine.link.name.toLowerCase();
        const previous = linkIndex.get(key);
        if (previous) {
          Object.assign(previous, linkLine.link);
        } else {
          linkIndex.set(key, linkLine.link);
          links.push(linkLine.link);
        }
      }
      continue;
    }

    const relation = parseRelation(raw);
    if (relation?.kind === "report") {
      ensure(relation.from);
      ensure(relation.to);
      reports.push({ from: relation.from, to: relation.to, style: relation.style });
      continue;
    }
    if (relation?.kind === "influence") {
      if (relation.from === relation.to) {
        errors.push({ message: `стрелка «${relation.name}» замыкается на тот же узел`, line: lineNo, col: 0 });
        continue;
      }
      ensure(relation.from);
      ensure(relation.to);
      influences.push({ from: relation.from, to: relation.to, name: relation.name });
      continue;
    }
    if (/->|=>|<-/.test(raw)) {
      errors.push({
        message: `недопустимый синтаксис ребра «${raw}»: ожидается «A -> B», «A -.-> B» или «A -name-> B»`,
        line: lineNo,
        col: 0,
      });
      continue;
    }

    const { body, tail } = splitBracket(raw);
    const parsedAttrs = parsePersonAttrs(tail);
    if (parsedAttrs.error) {
      errors.push({ message: parsedAttrs.error, line: lineNo, col: 0 });
      continue;
    }
    const bracket = /^(.*?)\s*\[(.*)\]\s*$/.exec(body);
    const id = unquote(bracket ? bracket[1] : body);
    const label = bracket ? unquoteLabel(bracket[2]) : unquoteLabel(body);
    if (!id) {
      errors.push({ message: `пустой идентификатор узла в строке «${raw}»`, line: lineNo, col: 0 });
      continue;
    }
    ensure(id, label || id, parsedAttrs.attrs);
  }

  if (people.length === 0) {
    errors.push({ message: "нет людей: ожидается хотя бы один узел", line: 1, col: 0 });
  }

  for (const edge of influences) {
    const key = edge.name.toLowerCase();
    if (!linkIndex.has(key) && !BUILTIN_LINKS[key]) {
      errors.push({
        message: `неизвестная связь «${edge.name}»: объявите её строкой «link ${edge.name} color=#hex»`,
        line: 1,
        col: 0,
      });
    }
  }

  if (errors.length) return { ok: false, errors };

  const hasParent = new Set(reports.map((edge) => edge.to));
  const roots = people.filter((person) => !hasParent.has(person.id)).map((person) => person.id);
  if (roots.length === 0) {
    return {
      ok: false,
      errors: [{ message: "не найден корень: все узлы в цикле", line: 1, col: 0 }],
    };
  }

  return {
    ok: true,
    errors: [],
    value: {
      title,
      company,
      legend,
      avatarSize,
      mono,
      monoInvert,
      ratio,
      people,
      reports,
      influences,
      links,
      root: roots.length > 1 ? null : roots[0],
      virtualRoot: roots.length > 1,
    },
  };
}

interface LegendLink {
  label: string;
  color: string;
  style: LinkStroke | "dotted-report" | "solid-report";
}

function legendLinks(model: PowerModel): LegendLink[] {
  const rows: LegendLink[] = [];
  if (model.reports.some((edge) => edge.style === "solid")) {
    rows.push({ label: "Direct report", color: "#656d76", style: "solid-report" });
  }
  if (model.reports.some((edge) => edge.style === "dotted")) {
    rows.push({ label: "Dotted report", color: "#656d76", style: "dotted-report" });
  }
  const declared = new Set(model.links.map((link) => link.name.toLowerCase()));
  for (const link of model.links) rows.push({ label: link.label, color: link.color, style: link.style });
  for (const edge of model.influences) {
    const key = edge.name.toLowerCase();
    if (declared.has(key)) continue;
    const builtin = BUILTIN_LINKS[key];
    if (!builtin) continue;
    declared.add(key);
    rows.push({ label: builtin.label, color: builtin.color, style: builtin.style });
  }
  return rows;
}

function resolveLink(model: PowerModel, name: string): PowerLinkStyle {
  return (
    model.links.find((link) => link.name.toLowerCase() === name.toLowerCase()) ??
    BUILTIN_LINKS[name.toLowerCase()] ??
    BUILTIN_LINKS.supporter
  );
}

const LEGEND_FONT = 10;
const LEGEND_TITLE = 11;
const SWATCH = 16;
const LEGEND_ROW = 18;
const LEGEND_PAD = 10;
const LEGEND_GAP = 20;
/** Заголовки колонок жирные, измерение этого не учитывает. */
const LEGEND_TITLE_EMPHASIS = 1.12;
const LEGEND_ROW_ORIGIN = 28;
const INFLUENCE_LANE_GAP = 18;

interface LegendColumn {
  title: string;
  rows: { code: string; name: string; color: string }[];
}

function legendColumns(): LegendColumn[] {
  return [
    { title: "Roles", rows: ROLES.map((item) => ({ ...item })) },
    { title: "Influence", rows: INFLUENCE.map((item) => ({ ...item })) },
    { title: "Need for Action", rows: ACTIONS.map((item) => ({ ...item })) },
    { title: "Attitude vs. Company", rows: ATTITUDES.map((item) => ({ ...item })) },
    { title: "Company counterpart", rows: [{ code: "", name: "", color: COUNTERPART_COLOR }] },
  ];
}

function legendColumnWidth(column: LegendColumn): number {
  const titleW = measureText(column.title, LEGEND_TITLE) * LEGEND_TITLE_EMPHASIS;
  const body = Math.max(
    SWATCH,
    ...column.rows.map((row) => SWATCH + 6 + measureText(row.name || row.code, LEGEND_FONT)),
  );
  return Math.max(titleW, body);
}

function measureLegend(model: PowerModel): { width: number; height: number; columns: LegendColumn[]; links: LegendLink[] } {
  const columns = legendColumns();
  let width = LEGEND_PAD;
  let rows = 1;
  for (const column of columns) {
    width += legendColumnWidth(column) + LEGEND_GAP;
    rows = Math.max(rows, column.rows.length);
  }
  const links = legendLinks(model);
  const linkW = links.reduce(
    (max, link) => Math.max(max, 28 + 8 + measureText(link.label, LEGEND_FONT)),
    0,
  );
  const scalesH = LEGEND_PAD + LEGEND_ROW_ORIGIN + rows * LEGEND_ROW + 8;
  const linksH = links.length > 0 ? 18 + links.length * LEGEND_ROW : 0;
  return {
    width: Math.max(width, linkW + LEGEND_PAD * 2),
    height: scalesH + linksH + LEGEND_PAD,
    columns,
    links,
  };
}

function chipFill(color: string, mono: boolean, invert: boolean, index: number): string {
  if (!mono) return color;
  return monoGray(index, 6, invert);
}

function measureCard(person: PowerPerson, framePx: number): { width: number; height: number; titleLines: string[] } {
  const titleLines = person.title ? splitLabelLines(person.title) : [];
  const slot = avatarBoxSize(framePx, person);
  const textW = Math.max(
    measureText(person.name, NAME_FONT),
    ...titleLines.map((line) => measureText(line, TITLE_FONT)),
    measureText(person.counterpart || "-", TITLE_FONT),
    4 * 22,
  );
  const width = Math.max(CARD_MIN_WIDTH, textW + CARD_PAD_X * 2, slot + CARD_PAD_X * 2);
  let height = CARD_PAD_Y;
  if (slot > 0) height += slot + CARD_GAP;
  height += LINE_HEIGHT;
  height += titleLines.length * LINE_HEIGHT;
  height += CARD_GAP + CHIP_H + COUNTER_H + CARD_PAD_Y;
  return { width, height, titleLines };
}

interface AxisBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function segmentHits(x1: number, y1: number, x2: number, y2: number, skip: AxisBox, boxes: readonly AxisBox[]): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  for (const box of boxes) {
    if (box === skip) continue;
    if (maxX <= box.x + 1 || minX >= box.x + box.width - 1) continue;
    if (maxY <= box.y + 1 || minY >= box.y + box.height - 1) continue;
    return true;
  }
  return false;
}

interface InfluencePort {
  x: number;
  y: number;
  via: "right" | "top" | "bottom";
  gateY: number;
}

/** Выход из карточки в правый коридор, не через чужие карточки. */
function influencePort(box: AxisBox, laneX: number, boxes: readonly AxisBox[], slot: number): InfluencePort {
  const right = box.x + box.width;
  const midY = box.y + box.height / 2;
  if (!segmentHits(right, midY, laneX, midY, box, boxes)) {
    return { x: right, y: midY, via: "right", gateY: midY };
  }
  const drop = 16 + slot * 14;
  const cx = box.x + box.width / 2;
  const downY = box.y + box.height + drop;
  if (
    !segmentHits(cx, box.y + box.height, cx, downY, box, boxes) &&
    !segmentHits(cx, downY, laneX, downY, box, boxes)
  ) {
    return { x: cx, y: box.y + box.height, via: "bottom", gateY: downY };
  }
  const upY = box.y - drop;
  return { x: cx, y: box.y, via: "top", gateY: upY };
}

function routeInfluence(
  from: AxisBox,
  to: AxisBox,
  laneX: number,
  boxes: readonly AxisBox[],
  slot: number,
): { d: string; labelY: number } {
  const start = influencePort(from, laneX, boxes, slot);
  const end = influencePort(to, laneX, boxes, slot);
  const points: Array<[number, number]> = [[start.x, start.y]];
  if (start.via !== "right") points.push([start.x, start.gateY]);
  points.push([laneX, start.gateY]);
  points.push([laneX, end.gateY]);
  if (end.via !== "right") points.push([end.x, end.gateY]);
  points.push([end.x, end.y]);
  const compact: Array<[number, number]> = [];
  for (const point of points) {
    const prev = compact[compact.length - 1];
    if (prev && Math.abs(prev[0] - point[0]) < 0.4 && Math.abs(prev[1] - point[1]) < 0.4) continue;
    compact.push(point);
  }
  const d = compact.map((point, index) => `${index === 0 ? "M" : "L"}${fmt(point[0])} ${fmt(point[1])}`).join("");
  const laneYs = compact.filter((point) => Math.abs(point[0] - laneX) < 0.4).map((point) => point[1]);
  const labelY = laneYs.length > 0 ? (Math.min(...laneYs) + Math.max(...laneYs)) / 2 : (start.y + end.y) / 2;
  return { d, labelY };
}

export function renderPowermap(model: PowerModel, options: ExtRenderOptions): string {
  const themeDark = Boolean(options.dark) || usesInvertedMono(model.mono, model.monoInvert, false);
  const invertedMono = usesInvertedMono(model.mono, model.monoInvert, options.dark);
  const palette = getPalette(themeDark);
  const mono = Boolean(model.mono);
  const measured = new Map<string, { width: number; height: number; titleLines: string[] }>();
  for (const person of model.people) measured.set(person.id, measureCard(person, model.avatarSize));

  const laid = layoutOrgTree(
    model.people,
    model.reports,
    model.virtualRoot,
    model.root,
    (person) => {
      const box = measured.get(person.id)!;
      return { lines: [person.name], width: box.width, height: box.height };
    },
  );
  const legend = model.legend ? measureLegend(model) : null;
  const titleLines = model.title ? (hasLabelBreak(model.title) ? splitLabelLines(model.title) : [model.title]) : [];
  const companyLines = model.company ? [model.company] : [];
  const titleBlock =
    (titleLines.length > 0 ? 22 + (titleLines.length - 1) * labelLineStep(15) : 0) +
    (companyLines.length > 0 ? 18 : 0);
  const headerH = Math.max(
    titleBlock + HEADER_PAD,
    legend ? legend.height + LEGEND_CLEARANCE : 0,
    titleLines.length || companyLines.length || legend ? 36 : 16,
  );

  const influenceLabels = model.influences.map((edge) => resolveLink(model, edge.name));
  const influenceLabelWidth = influenceLabels.reduce(
    (max, link) => Math.max(max, measureText(link.label, 10)),
    0,
  );
  const influenceLanes = model.influences.length;
  const influencePad =
    influenceLanes === 0
      ? 0
      : 24 + (influenceLanes - 1) * INFLUENCE_LANE_GAP + influenceLabelWidth + 12;

  let width = 24 + laid.width + 24 + influencePad;
  let height = headerH + laid.height + 36 + influenceLanes * 14;
  const headingWidth = Math.max(
    0,
    ...titleLines.map((line) => measureText(line, 15)),
    model.company ? measureText(model.company, 12) : 0,
  );
  if (legend) width = Math.max(width, 24 + headingWidth + 28 + legend.width + 16);
  let padX = 0;
  let padY = 0;
  if (model.ratio) {
    const grown = growPlotToAspect(
      { plotWidth: laid.width, plotHeight: laid.height, totalWidth: width, totalHeight: height },
      model.ratio,
    );
    padX = Math.max(0, grown.plotWidth - laid.width);
    padY = Math.max(0, grown.plotHeight - laid.height);
    width += padX;
    height += padY;
  }

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
    background: model.monoInvert ? true : false,
  });

  const offsetX = 24 + padX / 2;
  const offsetY = headerH + padY / 2;
  titleLines.forEach((line, idx) => {
    svg.text(24, 22 + idx * labelLineStep(15), line, {
      "font-size": 15,
      "font-weight": 700,
      fill: palette.fg,
      "text-anchor": "start",
    });
  });
  if (model.company) {
    svg.text(24, 22 + titleLines.length * labelLineStep(15) + 4, model.company, {
      "font-size": 12,
      fill: palette.fgDim,
      "text-anchor": "start",
    });
  }

  if (legend) {
    drawLegend(svg, width - 16 - legend.width, 10, legend, palette.fg, palette.bg, mono, invertedMono);
  }

  const marker = arrowMarker(palette, "ext-pm-report");
  svg.raw(marker.markup);
  const placed: PlacedTreeNode<PowerPerson>[] = laid.placed;
  drawReportingElbows(svg, placed, model.reports, offsetX, offsetY, palette.axis, marker.ref);

  placed.forEach((card, cardIndex) => {
    drawCard(svg, card, offsetX, offsetY, model, palette.bg, palette.fg, palette.axis, mono, invertedMono, cardIndex);
  });

  const byId = new Map(placed.map((card) => [card.node.id, card]));
  const cardBoxes: AxisBox[] = placed.map((card) => ({
    x: offsetX + card.x,
    y: offsetY + card.y,
    width: card.width,
    height: card.height,
  }));
  const treeRight = offsetX + laid.width;
  const labelX = treeRight + 24 + Math.max(0, influenceLanes - 1) * INFLUENCE_LANE_GAP + 8;
  const usedLabelY: number[] = [];
  model.influences.forEach((edge, index) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return;
    const link = resolveLink(model, edge.name);
    const color = mono ? monoPaint(link.color, invertedMono) : link.color;
    const fromBox = cardBoxes[placed.indexOf(from)];
    const toBox = cardBoxes[placed.indexOf(to)];
    const laneX = treeRight + 24 + index * INFLUENCE_LANE_GAP;
    const route = routeInfluence(fromBox, toBox, laneX, cardBoxes, index);
    const arrow = arrowMarker(palette, `ext-pm-link-${index}`, color);
    svg.raw(arrow.markup);
    const dash = STROKE_DASH[link.style];
    svg.path(route.d, {
      fill: "none",
      stroke: color,
      "stroke-width": link.width,
      "marker-end": arrow.ref,
      ...(dash ? { "stroke-dasharray": dash } : {}),
    });
    let labelY = route.labelY;
    while (usedLabelY.some((prev) => Math.abs(prev - labelY) < 12)) labelY += 12;
    usedLabelY.push(labelY);
    svg.text(labelX, labelY, link.label, {
      "font-size": 10,
      fill: color,
      "text-anchor": "start",
    });
  });

  return svg.toString();
}

function drawLegend(
  svg: ReturnType<typeof createSvg>,
  x: number,
  y: number,
  legend: ReturnType<typeof measureLegend>,
  fg: string,
  bg: string,
  mono: boolean,
  invert: boolean,
): void {
  svg.rect(x, y, legend.width, legend.height, {
    fill: bg,
    stroke: CHIP_STROKE,
    "stroke-width": 1,
    rx: 4,
  });
  let cursor = x + LEGEND_PAD;
  for (const column of legend.columns) {
    svg.text(cursor, y + 16, column.title, {
      "font-size": LEGEND_TITLE,
      "font-weight": 700,
      fill: fg,
      "text-anchor": "start",
    });
    column.rows.forEach((row, index) => {
      const rowY = y + LEGEND_ROW_ORIGIN + index * LEGEND_ROW;
      const fill = chipFill(row.color, mono, invert, index);
      svg.rect(cursor, rowY, SWATCH, 12, { fill, stroke: CHIP_STROKE, rx: 2 });
      if (row.code) {
        svg.text(cursor + SWATCH / 2, rowY + 10, row.code, {
          "font-size": 8,
          "font-weight": 700,
          fill: contrastTextColor(fill) ?? fg,
        });
      }
      if (row.name) {
        svg.text(cursor + SWATCH + 6, rowY + 10, row.name, {
          "font-size": LEGEND_FONT,
          fill: fg,
          "text-anchor": "start",
        });
      }
    });
    cursor += legendColumnWidth(column) + LEGEND_GAP;
  }
  if (legend.links.length === 0) return;
  const linksTop = y + legend.height - LEGEND_PAD - legend.links.length * LEGEND_ROW - 14;
  svg.text(x + LEGEND_PAD, linksTop + 12, "Links", {
    "font-size": LEGEND_TITLE,
    "font-weight": 700,
    fill: fg,
    "text-anchor": "start",
  });
  legend.links.forEach((link, index) => {
    const rowY = linksTop + 18 + index * LEGEND_ROW;
    const color = mono ? monoGray(index, Math.max(legend.links.length, 2), invert) : link.color;
    const dash =
      link.style === "dotted-report"
        ? "4 4"
        : link.style === "solid-report"
          ? undefined
          : STROKE_DASH[link.style];
    svg.line(x + LEGEND_PAD, rowY, x + LEGEND_PAD + 22, rowY, {
      stroke: color,
      "stroke-width": 1.6,
      ...(dash ? { "stroke-dasharray": dash } : {}),
    });
    svg.text(x + LEGEND_PAD + 28, rowY + 3, link.label, {
      "font-size": LEGEND_FONT,
      fill: fg,
      "text-anchor": "start",
    });
  });
}

function drawCard(
  svg: ReturnType<typeof createSvg>,
  card: PlacedTreeNode<PowerPerson>,
  offsetX: number,
  offsetY: number,
  model: PowerModel,
  bg: string,
  fg: string,
  axis: string,
  mono: boolean,
  invert: boolean,
  cardIndex: number,
): void {
  const person = card.node;
  const x = offsetX + card.x;
  const y = offsetY + card.y;
  svg.rect(x, y, card.width, card.height, {
    fill: bg,
    stroke: axis,
    "stroke-width": 1,
    rx: 4,
  });
  let cursor = y + CARD_PAD_Y;
  const slot = avatarBoxSize(model.avatarSize, person);
  if (slot > 0) {
    renderAvatarBox(svg, x + (card.width - slot) / 2, cursor, slot, person, `ext-pm-avatar-${cardIndex}`);
    cursor += slot + CARD_GAP;
  }
  svg.text(x + card.width / 2, cursor + 11, person.name, {
    "font-size": NAME_FONT,
    "font-weight": 700,
    fill: fg,
  });
  cursor += LINE_HEIGHT;
  const box = measureCard(person, model.avatarSize);
  box.titleLines.forEach((line) => {
    svg.text(x + card.width / 2, cursor + 10, line, { "font-size": TITLE_FONT, fill: "#656d76" });
    cursor += LINE_HEIGHT;
  });
  cursor += CARD_GAP;
  const chips = [person.role, person.influence, person.action, person.attitude];
  const inner = card.width - CARD_PAD_X * 2;
  const chipW = inner / chips.length;
  chips.forEach((chip, index) => {
    const fill = chipFill(chip?.color ?? EMPTY_CHIP, mono, invert, index);
    const chipX = x + CARD_PAD_X + index * chipW;
    svg.rect(chipX, cursor, chipW, CHIP_H, { fill, stroke: CHIP_STROKE });
    if (chip) {
      svg.text(chipX + chipW / 2, cursor + 12, chip.code, {
        "font-size": CHIP_FONT,
        "font-weight": 700,
        fill: contrastTextColor(fill) ?? fg,
      });
    }
  });
  cursor += CHIP_H;
  const counterFill = mono ? monoGray(4, 6, invert) : COUNTERPART_COLOR;
  svg.rect(x + CARD_PAD_X, cursor, inner, COUNTER_H, { fill: counterFill });
  svg.text(x + card.width / 2, cursor + 12, person.counterpart || "-", {
    "font-size": TITLE_FONT,
    fill: contrastTextColor(counterFill) ?? fg,
  });
}

export const powermapEngine: ExtEngine<PowerModel> = {
  type: "powermap",
  aliases: ["powermap", "power-map", "power"],
  parse: parsePowermap,
  render: renderPowermap,
};
