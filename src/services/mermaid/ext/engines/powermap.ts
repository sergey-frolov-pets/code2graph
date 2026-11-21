import { isAppLocale, SUPPORTED_LOCALES, type AppLocale } from "@/constants/i18n";
import {
  arrowMarker,
  contrastTextColor,
  createSvg,
  drawLabelLines,
  fmt,
  getPalette,
  hasLabelBreak,
  labelLineCount,
  labelLineStep,
  measureLabelWidth,
  measureText,
  monoFlagsFromMode,
  monoGray,
  monoPaint,
  parseHexColor,
  parseMonoDirective,
  splitLabelLines,
  usesInvertedMono,
} from "../common";
import { growPlotToAspect, parseAspectDirective, type ChartAspect } from "../chart-aspect";
import { clipToNearEdge, repairLanePath, routeAvoiding } from "./edge-lanes";
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
import {
  DEFAULT_TEAM_LAYOUT,
  drawReportingElbows,
  drawTeamBoxes,
  foreignTeamBoxes,
  layoutOrgTree,
  layoutTeamGroups,
  orderTeams,
  parseHideLine,
  parseTeamLine,
  parseTeamsLine,
  reportingElbowRoutes,
  hiddenTeamIds,
  teamIsHidden,
  teamMembership,
  TEAM_UNGROUPED,
  type PlacedTreeNode,
  type TeamBox as OrgTeamBox,
  type TeamLayoutSpec,
  type TeamStyle,
} from "./orgchart";

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
  /** Люди другой компании. Не сотрудники `company`, которые стоят на карточках. */
  counterpart: string;
  /** Команда: id из директивы `team` или значение атрибута `team=`. */
  team?: string;
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
  /** Подпись этой стрелки. Подпись типа `link` на стрелку не попадает. */
  label?: string;
  /** `A <-name-> B`: стрелка в обе стороны. */
  both?: boolean;
}

/** Команда на карте влияния: рамка с подписью вокруг своей части дерева. */
export type PowerTeam = TeamStyle;

/** Как команды раскладываются друг относительно друга. */
export type PowerTeamLayout = TeamLayoutSpec;

export interface PowerModel {
  title?: string;
  company?: string;
  legend: boolean;
  /** Таблица коммуникаций под легендой. По умолчанию выключена. */
  comms: boolean;
  /** `lang ru` — язык легенды. Пусто — язык интерфейса на момент рендера. */
  legendLang?: string;
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
  /** Объявленные команды. Пусто — команды не используются, раскладка прежняя. */
  teams: PowerTeam[];
  teamLayout: PowerTeamLayout;
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
/** Шаг строк в поле counterpart: имя на строку, не больше ширины поля. */
const COUNTER_LINE = 12;
/** Отступ текста от краёв поля counterpart. */
const COUNTER_PAD = 4;
const CARD_MIN_WIDTH = 120;
const HEADER_PAD = 20;

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
  const parts = base.split(/\\n|\r?\n|<br\s*\/?>/i).map((line) => line.trim());
  const nonEmpty = parts.filter((line) => line.length > 0);
  return (nonEmpty.length > 0 ? nonEmpty : [""]).join("\n");
}

function splitPerson(label: string, id: string): { name: string; title: string } {
  const source = label.trim() || id;
  const protectedSource = source.replace(/\\\|/g, "\uE000");
  const restore = (value: string) => value.replace(/\uE000/g, "|").trim();
  if (protectedSource.includes("|")) {
    const [name, ...rest] = protectedSource.split("|");
    return { name: restore(name) || id, title: rest.map(restore).join("|") };
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
  /^(role|influence|action|attitude|counterpart|photo|gender|avatar|team)=("[^"]*"|'[^']*'|\S*)\s*/i;

interface PersonAttrs {
  role?: ScoreSwatch;
  influence?: ScoreSwatch;
  action?: ScoreSwatch;
  attitude?: ScoreSwatch;
  counterpart?: string;
  photo?: string;
  gender?: AvatarGender;
  hideAvatar?: boolean;
  team?: string;
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
        return {
          error: `фото: ожидается ссылка на файл или http(s)-адрес; запасной вид — data:image (png, jpeg, gif, webp)`,
        };
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
    } else if (key === "team") {
      if (!value || value === "-") attrs.team = undefined;
      else if (!/^[\p{L}\p{N}_./-]+$/u.test(value)) {
        return { error: `команда узла: ожидается идентификатор из букв, цифр, _ и -, получено «${value}»` };
      } else attrs.team = value;
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
  const attrAt = /(?:^|\s)(?:role|influence|action|attitude|counterpart|photo|gender|avatar|team)=/i.exec(raw);
  if (attrAt && attrAt.index > 0) {
    return { body: raw.slice(0, attrAt.index).trim(), tail: raw.slice(attrAt.index).trim() };
  }
  return { body: raw.trim(), tail: "" };
}

const NAMED_EDGE_RE = /^(.*?)\s+-\s*([\p{L}][\p{L}\p{N}_-]*)\s*->\s*(.+)$/u;
const NAMED_BOTH_RE = /^(.*?)\s+<-\s*([\p{L}][\p{L}\p{N}_-]*)\s*->\s*(.+)$/u;

/** `B label="текст"` в хвосте конкретной стрелки, не в объявлении `link`. */
function splitTrailingLabel(raw: string): { body: string; label?: string } {
  const match = /\slabel=("[^"]*"|'[^']*'|\S+)\s*$/i.exec(raw.trim());
  if (!match || match.index === undefined) return { body: raw.trim() };
  const label = unquoteLabel(match[1]);
  return {
    body: raw.trim().slice(0, match.index).trim(),
    label: label || undefined,
  };
}

function parseRelation(
  raw: string,
): { kind: "report"; style: ReportStyle; from: string; to: string } | { kind: "influence"; name: string; from: string; to: string; label?: string; both?: boolean } | null {
  const dottedAt = raw.indexOf("-.->");
  if (dottedAt >= 0) {
    const from = unquote(raw.slice(0, dottedAt));
    const to = unquote(raw.slice(dottedAt + 4));
    if (!from || !to) return null;
    return { kind: "report", style: "dotted", from, to };
  }
  const both = NAMED_BOTH_RE.exec(raw);
  if (both) {
    const from = unquote(both[1]);
    const target = splitTrailingLabel(both[3]);
    const to = unquote(target.body);
    if (!from || !to) return null;
    return { kind: "influence", name: both[2], from, to, label: target.label, both: true };
  }
  const named = NAMED_EDGE_RE.exec(raw);
  if (named) {
    const from = unquote(named[1]);
    const target = splitTrailingLabel(named[3]);
    const to = unquote(target.body);
    if (!from || !to) return null;
    return { kind: "influence", name: named[2], from, to, label: target.label };
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
  if (attrs.team !== undefined) person.team = attrs.team;
}

/** Виртуальная команда для людей без `team=`: рамки у неё нет. */
export const UNGROUPED_TEAM = TEAM_UNGROUPED;

export function parsePowermap(source: string): ExtParseResult<PowerModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);
  let title: string | undefined;
  let company: string | undefined;
  let legend = true;
  let comms = false;
  let legendLang: string | undefined;
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
  const teams: PowerTeam[] = [];
  const teamIndex = new Map<string, PowerTeam>();
  const teamLayout: PowerTeamLayout = { ...DEFAULT_TEAM_LAYOUT };
  const hidden: string[] = [];
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
    const hideLine = parseHideLine(raw);
    if (hideLine) {
      if (hideLine.length === 0) {
        errors.push({
          message: "hide: нужен хотя бы один id — сотрудник, команда или тип связи",
          line: lineNo,
          col: 0,
        });
      } else {
        hidden.push(...hideLine);
      }
      continue;
    }
    if (/^comms\b/i.test(raw)) {
      const flag = raw.replace(/^comms\s*/i, "").trim().toLowerCase();
      if (!flag || flag === "on") comms = true;
      else if (flag === "off") comms = false;
      else errors.push({ message: `таблица коммуникаций: ожидается on или off, получено «${flag}»`, line: lineNo, col: 0 });
      continue;
    }
    const langLine = /^(?:lang|language|locale)\s+(\S+)\s*$/i.exec(raw);
    if (langLine) {
      const code = langLine[1].toLowerCase();
      if (!isAppLocale(code)) {
        errors.push({
          message: `язык легенды: ожидается ${SUPPORTED_LOCALES.join(", ")}, получено «${langLine[1]}»`,
          line: lineNo,
          col: 0,
        });
      } else {
        legendLang = code;
      }
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

    const teamsLine = parseTeamsLine(raw);
    if (teamsLine) {
      if (teamsLine.error || !teamsLine.patch) {
        errors.push({ message: teamsLine.error ?? "не удалось разобрать раскладку команд", line: lineNo, col: 0 });
      } else {
        Object.assign(teamLayout, teamsLine.patch);
      }
      continue;
    }

    const teamLine = parseTeamLine(raw);
    if (teamLine) {
      if (teamLine.error || !teamLine.team) {
        errors.push({ message: teamLine.error ?? "не удалось разобрать команду", line: lineNo, col: 0 });
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
      influences.push({
        from: relation.from,
        to: relation.to,
        name: relation.name,
        ...(relation.label ? { label: relation.label } : {}),
        ...(relation.both ? { both: true } : {}),
      });
      continue;
    }
    if (/->|=>|<-/.test(raw)) {
      errors.push({
        message: `недопустимый синтаксис ребра «${raw}»: ожидается «A -> B», «A -.-> B», «A -name-> B» или «A <-name-> B»`,
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

  // `team=front` без директивы — команда создаётся сама, с дефолтным стилем.
  for (const person of people) {
    const id = person.team;
    if (!id || teamIndex.has(id)) continue;
    const slash = id.lastIndexOf("/");
    const auto: PowerTeam = {
      id,
      title: slash >= 0 ? id.slice(slash + 1) : id,
      ...(slash > 0 ? { parent: id.slice(0, slash) } : {}),
      radius: 10,
      padding: 14,
    };
    teamIndex.set(id, auto);
    teams.push(auto);
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

  if (hidden.length > 0) {
    const wanted = new Set(hidden.map((id) => id.toLowerCase()));
    const hiddenTeams = hiddenTeamIds(teams, wanted);
    const known = new Set<string>([
      ...people.map((person) => person.id.toLowerCase()),
      ...teams.map((team) => team.id.toLowerCase()),
      ...links.map((link) => link.name.toLowerCase()),
      ...influences.map((edge) => edge.name.toLowerCase()),
      ...Object.keys(BUILTIN_LINKS),
    ]);
    for (const id of wanted) {
      if (!known.has(id)) errors.push({ message: `hide: неизвестный id «${id}»`, line: 0, col: 0 });
    }
    const removed = new Set(
      people
        .filter((person) => wanted.has(person.id.toLowerCase()) || teamIsHidden(person.team, hiddenTeams))
        .map((person) => person.id),
    );
    const keptPeople = people.filter((person) => !removed.has(person.id));
    people.length = 0;
    people.push(...keptPeople);
    const keptReports = reports.filter((edge) => !removed.has(edge.from) && !removed.has(edge.to));
    reports.length = 0;
    reports.push(...keptReports);
    const keptInfluences = influences.filter(
      (edge) =>
        !removed.has(edge.from) && !removed.has(edge.to) && !wanted.has(edge.name.toLowerCase()),
    );
    influences.length = 0;
    influences.push(...keptInfluences);
    const keptTeams = teams.filter((team) => !hiddenTeams.has(team.id));
    teams.length = 0;
    teams.push(...keptTeams);
    // Скрытый тип связи уходит и из легенды.
    const keptLinks = links.filter((link) => !wanted.has(link.name.toLowerCase()));
    links.length = 0;
    links.push(...keptLinks);
  }

  if (errors.length) return { ok: false, errors };

  const hasParent = new Set(reports.map((edge) => edge.to));
  const roots = people.filter((person) => !hasParent.has(person.id)).map((person) => person.id);
  if (people.length === 0 && hidden.length > 0) {
    return {
      ok: false,
      errors: [{ message: "hide: не осталось ни одного сотрудника", line: 0, col: 0 }],
    };
  }
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
      comms,
      legendLang,
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
      teams: orderTeams(teams),
      teamLayout,
    },
  };
}

function resolveLink(model: PowerModel, name: string): PowerLinkStyle {
  return (
    model.links.find((link) => link.name.toLowerCase() === name.toLowerCase()) ??
    BUILTIN_LINKS[name.toLowerCase()] ??
    BUILTIN_LINKS.supporter
  );
}

/** Рамка команды вокруг её части дерева. */
type TeamBox = OrgTeamBox<PowerPerson>;

interface TeamLayoutResult {
  placed: PlacedTreeNode<PowerPerson>[];
  boxes: TeamBox[];
  width: number;
  height: number;
  /** Отчёты внутри команд: рисуются локальными локтями. */
  localReports: PowerReportEdge[];
  /** Отчёты между командами: идут через общий роутер как стрелки. */
  crossReports: PowerReportEdge[];
}

/**
 * Раскладка с командами: внутри команды — прежнее дерево, команды — shelf-паковка.
 * Координаты карточек возвращаются абсолютными, как у обычного `layoutOrgTree`.
 */
function layoutTeams(
  model: PowerModel,
  measured: Map<string, { width: number; height: number; titleLines: string[] }>,
  gapBelow: (upperDepth: number) => number,
): TeamLayoutResult {
  const grouped = layoutTeamGroups({
    nodes: model.people,
    edges: model.reports,
    teams: model.teams,
    layout: model.teamLayout ?? DEFAULT_TEAM_LAYOUT,
    teamOf: (person) => person.team,
    measure: (person) => {
      const box = measured.get(person.id)!;
      return { lines: [person.name], width: box.width, height: box.height };
    },
    vGap: gapBelow,
  });
  const styleOf = new Map(model.reports.map((edge) => [`${edge.from}\u0000${edge.to}`, edge.style]));
  const wrap = (edge: { from: string; to: string }): PowerReportEdge => ({
    from: edge.from,
    to: edge.to,
    style: styleOf.get(`${edge.from}\u0000${edge.to}`) ?? "solid",
  });
  return {
    placed: grouped.placed,
    boxes: grouped.boxes,
    width: grouped.width,
    height: grouped.height,
    localReports: grouped.localEdges.map(wrap),
    crossReports: grouped.crossEdges.map(wrap),
  };
}

/** Команда каждого человека: люди без объявленной команды — в виртуальной. */
function powermapMembership(model: PowerModel): Map<string, string> {
  return teamMembership(model.people, model.teams, (person) => person.team);
}

const LEGEND_FONT = 10;
const LEGEND_TITLE = 11;
const SWATCH = 16;
const LEGEND_ROW = 18;
const LEGEND_PAD = 8;
const LEGEND_GAP = 16;

/** Заголовки легенды жирные, оценка ширины этого не учитывает. */
function legendTitleWidth(text: string): number {
  return measureText(text, LEGEND_TITLE) * 1.45;
}

function legendColumnWidth(column: LegendColumn): number {
  const body = Math.max(
    SWATCH,
    ...column.rows.map((row) => SWATCH + (row.name ? 4 + measureText(row.name, LEGEND_FONT) : 0)),
  );
  return Math.max(legendTitleWidth(column.title), body);
}

/** Подписи легенды. Свой текст `label=` не переводится, известные слова типа — да. */
const LEGEND_PHRASES: Record<string, Record<AppLocale, string>> = {
  links: {
    en: "Links",
    ru: "Связи",
    es: "Vínculos",
    zh: "关系",
    ja: "関係",
    hi: "संबंध",
    pt: "Ligações",
    de: "Verbindungen",
    ar: "الروابط",
  },
  supporter: {
    en: "supporter",
    ru: "сторонник",
    es: "aliado",
    zh: "支持者",
    ja: "支援者",
    hi: "समर्थक",
    pt: "aliado",
    de: "Unterstützer",
    ar: "مؤيد",
  },
  enemy: {
    en: "enemy",
    ru: "противник",
    es: "oponente",
    zh: "对手",
    ja: "敵対者",
    hi: "विरोधी",
    pt: "oponente",
    de: "Gegner",
    ar: "خصم",
  },
  roles: {
    en: "Roles",
    ru: "Роли",
    es: "Roles",
    zh: "角色",
    ja: "役割",
    hi: "भूमिकाएँ",
    pt: "Papéis",
    de: "Rollen",
    ar: "الأدوار",
  },
  influence: {
    en: "Influence",
    ru: "Влияние",
    es: "Influencia",
    zh: "影响力",
    ja: "影響力",
    hi: "प्रभाव",
    pt: "Influência",
    de: "Einfluss",
    ar: "التأثير",
  },
  action: {
    en: "Need for Action",
    ru: "Нужность действия",
    es: "Necesidad de acción",
    zh: "行动需求",
    ja: "行動の必要性",
    hi: "कार्रवाई की जरूरत",
    pt: "Necessidade de ação",
    de: "Handlungsbedarf",
    ar: "الحاجة إلى إجراء",
  },
  attitude: {
    en: "Attitude vs. Company",
    ru: "Отношение к компании",
    es: "Actitud hacia la empresa",
    zh: "对公司的态度",
    ja: "会社への態度",
    hi: "कंपनी के प्रति रवैया",
    pt: "Atitude face à empresa",
    de: "Haltung zum Unternehmen",
    ar: "الموقف تجاه الشركة",
  },
  counterpart: {
    en: "External counterpart",
    ru: "Внешний контрагент",
    es: "Contraparte externa",
    zh: "外部对接人",
    ja: "外部の相手",
    hi: "बाहरी प्रतिपक्ष",
    pt: "Contraparte externa",
    de: "Externer Counterpart",
    ar: "الطرف الخارجي",
  },
  otherCompany: {
    en: "Other company",
    ru: "Другая компания",
    es: "Otra empresa",
    zh: "另一家公司",
    ja: "別の会社",
    hi: "दूसरी कंपनी",
    pt: "Outra empresa",
    de: "Anderes Unternehmen",
    ar: "شركة أخرى",
  },
  "role:E": {
    en: "Endorser",
    ru: "Покровитель",
    es: "Patrocinador",
    zh: "支持者",
    ja: "後援者",
    hi: "समर्थक",
    pt: "Patrocinador",
    de: "Förderer",
    ar: "الراعي",
  },
  "role:D": {
    en: "Decider",
    ru: "Решающий",
    es: "Decisor",
    zh: "决策者",
    ja: "決定者",
    hi: "निर्णायक",
    pt: "Decisor",
    de: "Entscheider",
    ar: "صاحب القرار",
  },
  "role:A": {
    en: "Assessor",
    ru: "Оценщик",
    es: "Evaluador",
    zh: "评估者",
    ja: "評価者",
    hi: "आकलनकर्ता",
    pt: "Avaliador",
    de: "Bewerter",
    ar: "المقيّم",
  },
  "role:U": {
    en: "User",
    ru: "Пользователь",
    es: "Usuario",
    zh: "使用者",
    ja: "利用者",
    hi: "उपयोगकर्ता",
    pt: "Utilizador",
    de: "Nutzer",
    ar: "المستخدم",
  },
  "role:C": {
    en: "Coach",
    ru: "Наставник",
    es: "Coach",
    zh: "教练",
    ja: "コーチ",
    hi: "कोच",
    pt: "Coach",
    de: "Coach",
    ar: "المرشد",
  },
  "influence:L": {
    en: "Large",
    ru: "Высокое",
    es: "Alta",
    zh: "高",
    ja: "大",
    hi: "अधिक",
    pt: "Alta",
    de: "Groß",
    ar: "كبير",
  },
  "influence:M": {
    en: "Medium",
    ru: "Среднее",
    es: "Media",
    zh: "中",
    ja: "中",
    hi: "मध्यम",
    pt: "Média",
    de: "Mittel",
    ar: "متوسط",
  },
  "influence:S": {
    en: "Small",
    ru: "Низкое",
    es: "Baja",
    zh: "低",
    ja: "小",
    hi: "कम",
    pt: "Baixa",
    de: "Klein",
    ar: "صغير",
  },
  "action:U": {
    en: "Urgent",
    ru: "Срочно",
    es: "Urgente",
    zh: "紧急",
    ja: "緊急",
    hi: "अत्यावश्यक",
    pt: "Urgente",
    de: "Dringend",
    ar: "عاجل",
  },
  "action:S": {
    en: "Significant",
    ru: "Существенно",
    es: "Importante",
    zh: "重要",
    ja: "重要",
    hi: "महत्वपूर्ण",
    pt: "Relevante",
    de: "Erheblich",
    ar: "مهم",
  },
  "action:M": {
    en: "Modest",
    ru: "Умеренно",
    es: "Moderada",
    zh: "有限",
    ja: "控えめ",
    hi: "सीमित",
    pt: "Moderada",
    de: "Gering",
    ar: "محدود",
  },
  "attitude:++": {
    en: "Enthusiastic",
    ru: "Энтузиазм",
    es: "Entusiasta",
    zh: "热情",
    ja: "熱心",
    hi: "उत्साही",
    pt: "Entusiasta",
    de: "Begeistert",
    ar: "متحمس",
  },
  "attitude:+": {
    en: "Positive",
    ru: "Позитивное",
    es: "Positiva",
    zh: "积极",
    ja: "前向き",
    hi: "सकारात्मक",
    pt: "Positiva",
    de: "Positiv",
    ar: "إيجابي",
  },
  "attitude:0": {
    en: "Neutral",
    ru: "Нейтральное",
    es: "Neutral",
    zh: "中立",
    ja: "中立",
    hi: "तटस्थ",
    pt: "Neutra",
    de: "Neutral",
    ar: "محايد",
  },
  "attitude:-": {
    en: "Negative",
    ru: "Негативное",
    es: "Negativa",
    zh: "消极",
    ja: "否定的",
    hi: "नकारात्मक",
    pt: "Negativa",
    de: "Negativ",
    ar: "سلبي",
  },
  "attitude:--": {
    en: "Hostile",
    ru: "Враждебное",
    es: "Hostil",
    zh: "敌对",
    ja: "敵対的",
    hi: "शत्रुतापूर्ण",
    pt: "Hostil",
    de: "Feindlich",
    ar: "عدائي",
  },
  person: {
    en: "Person",
    ru: "Человек",
    es: "Persona",
    zh: "人员",
    ja: "人物",
    hi: "व्यक्ति",
    pt: "Pessoa",
    de: "Person",
    ar: "الشخص",
  },
  companyWord: {
    en: "Company",
    ru: "Компания",
    es: "Empresa",
    zh: "公司",
    ja: "会社",
    hi: "कंपनी",
    pt: "Empresa",
    de: "Firma",
    ar: "الشركة",
  },
  contacts: {
    en: "Contacts",
    ru: "Контакты",
    es: "Contactos",
    zh: "联系人",
    ja: "連絡先",
    hi: "संपर्क",
    pt: "Contactos",
    de: "Kontakte",
    ar: "جهات الاتصال",
  },
  employee: {
    en: "Employee",
    ru: "Сотрудник",
    es: "Empleado",
    zh: "员工",
    ja: "社員",
    hi: "कर्मचारी",
    pt: "Funcionário",
    de: "Mitarbeiter",
    ar: "موظف",
  },
  manager: {
    en: "Manager",
    ru: "Менеджер",
    es: "Gerente",
    zh: "经理",
    ja: "上司",
    hi: "प्रबंधक",
    pt: "Gerente",
    de: "Vorgesetzter",
    ar: "المدير",
  },
  teamless: {
    en: "No team",
    ru: "Без команды",
    es: "Sin equipo",
    zh: "无团队",
    ja: "チームなし",
    hi: "टीम नहीं",
    pt: "Sem equipe",
    de: "Kein Team",
    ar: "بدون فريق",
  },
};

function legendLocale(model: PowerModel, options: ExtRenderOptions): AppLocale {
  const chosen = (model.legendLang || options.locale || "").trim().toLowerCase();
  return isAppLocale(chosen) ? chosen : "en";
}

function translateLinkLabel(text: string, locale: AppLocale): string {
  const key = text.trim().toLowerCase();
  if (key !== "supporter" && key !== "enemy") return text;
  return LEGEND_PHRASES[key][locale];
}

interface LegendRow {
  label: string;
  color: string;
  style: LinkStroke;
  width: number;
}

interface LegendColumn {
  title: string;
  rows: { code: string; name: string; color: string }[];
}

interface LegendBox {
  width: number;
  height: number;
  columns: LegendColumn[];
  linksTitle: string;
  /** Строки типов связей: в ряд, со переносом, если ряд не влезает. */
  linkLines: LegendRow[][];
  scalesHeight: number;
}

function legendText(key: string, locale: AppLocale): string {
  return LEGEND_PHRASES[key]?.[locale] ?? key;
}

function scoreRows(
  items: readonly ScoreSwatch[],
  axis: string,
  locale: AppLocale,
): LegendColumn["rows"] {
  return items.map((item) => ({
    code: item.code,
    name: legendText(`${axis}:${item.code}`, locale),
    color: item.color,
  }));
}

/** Шкалы как раньше. Типы линий — только объявленные `link`, без подчинения. */
function measureLegend(model: PowerModel, locale: AppLocale): LegendBox | null {
  if (!model.legend) return null;
  const columns: LegendColumn[] = [
    { title: legendText("roles", locale), rows: scoreRows(ROLES, "role", locale) },
    { title: legendText("influence", locale), rows: scoreRows(INFLUENCE, "influence", locale) },
    { title: legendText("action", locale), rows: scoreRows(ACTIONS, "action", locale) },
    { title: legendText("attitude", locale), rows: scoreRows(ATTITUDES, "attitude", locale) },
    {
      title: legendText("counterpart", locale),
      rows: [{ code: "", name: legendText("otherCompany", locale), color: COUNTERPART_COLOR }],
    },
  ];
  let columnsWidth = LEGEND_PAD;
  let rowCount = 1;
  for (const column of columns) {
    columnsWidth += legendColumnWidth(column) + LEGEND_GAP;
    rowCount = Math.max(rowCount, column.rows.length);
  }
  const rows = model.links.map((link) => ({
    label: translateLinkLabel(link.label, locale),
    color: link.color,
    style: link.style,
    width: link.width,
  }));
  const linksTitle = legendText("links", locale);
  const inner = Math.max(columnsWidth - LEGEND_PAD * 2, legendTitleWidth(linksTitle));
  let linkLines = wrapLegendLinks(rows, inner);
  let linkSpan = legendLinkSpan(linkLines);
  const width = Math.max(columnsWidth, linkSpan + LEGEND_PAD * 2);
  if (width > columnsWidth + 0.5) {
    linkLines = wrapLegendLinks(rows, width - LEGEND_PAD * 2);
    linkSpan = legendLinkSpan(linkLines);
  }
  const scalesH = LEGEND_PAD + 16 + rowCount * LEGEND_ROW + 4;
  const linksH = linkLines.length > 0 ? 16 + linkLines.length * LEGEND_ROW : 0;
  return {
    width: Math.max(width, linkSpan + LEGEND_PAD * 2),
    height: scalesH + linksH + LEGEND_PAD,
    columns,
    linksTitle,
    linkLines,
    scalesHeight: scalesH,
  };
}

const LEGEND_LINK_SAMPLE = 22;
const LEGEND_LINK_GAP = 6;

function legendLinkItemWidth(label: string): number {
  return LEGEND_LINK_SAMPLE + LEGEND_LINK_GAP + measureText(label, LEGEND_FONT);
}

function legendLinkSpan(lines: readonly LegendRow[][]): number {
  let span = 0;
  for (const line of lines) {
    let used = 0;
    line.forEach((item, index) => {
      used += (index > 0 ? LEGEND_GAP : 0) + legendLinkItemWidth(item.label);
    });
    span = Math.max(span, used);
  }
  return span;
}

/** Типы связей в строку. Следующий образец, который не влезает, начинает новую строку. */
function wrapLegendLinks(rows: readonly LegendRow[], inner: number): LegendRow[][] {
  const lines: LegendRow[][] = [];
  let line: LegendRow[] = [];
  let used = 0;
  for (const row of rows) {
    const item = legendLinkItemWidth(row.label);
    const gap = line.length > 0 ? LEGEND_GAP : 0;
    if (line.length > 0 && used + gap + item > inner) {
      lines.push(line);
      line = [row];
      used = item;
      continue;
    }
    line.push(row);
    used += gap + item;
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

const INFLUENCE_X_SHIFT = 14;

interface InfluenceDraft {
  from: PlacedTreeNode<PowerPerson>;
  to: PlacedTreeNode<PowerPerson>;
  link: PowerLinkStyle;
  label?: string;
  both?: boolean;
  mode: "down" | "up" | "same";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  gapTop: number;
  gapBottom: number;
  corridor: string;
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  const overlap =
    Math.min(Math.max(a0, a1), Math.max(b0, b1)) - Math.max(Math.min(a0, a1), Math.min(b0, b1));
  return overlap > 0.5;
}

function routesWouldMerge(left: InfluenceDraft, right: InfluenceDraft): boolean {
  if (
    Math.abs(left.x1 - right.x1) < 0.75 ||
    Math.abs(left.x1 - right.x2) < 0.75 ||
    Math.abs(left.x2 - right.x1) < 0.75 ||
    Math.abs(left.x2 - right.x2) < 0.75
  ) {
    return true;
  }
  return rangesOverlap(left.x1, left.x2, right.x1, right.x2);
}

function contactX(
  card: PlacedTreeNode<PowerPerson>,
  offsetX: number,
  slot: number,
  count: number,
): number {
  const inset = Math.min(12, Math.max(4, card.width * 0.16));
  const left = offsetX + card.x + inset;
  const right = offsetX + card.x + card.width - inset;
  const span = Math.max(0, right - left);
  const center = offsetX + card.x + card.width / 2;
  if (span < 1) return center;
  if (count <= 1) {
    const shift = Math.min(INFLUENCE_X_SHIFT, span / 3);
    return Math.min(right, Math.max(left, center + shift));
  }
  return left + (span * (slot + 0.5)) / count;
}

/** Минимальный зазор между параллельными стрелками влияния, чтобы они не читались как одна. */
const INFLUENCE_LANE_GAP = 14;

function influenceLaneY(gapTop: number, gapBottom: number, lane: number, count: number, mode: InfluenceDraft["mode"]): number {
  const lo = Math.min(gapTop, gapBottom);
  const hi = Math.max(gapTop, gapBottom);
  const room = hi - lo;
  const inset = Math.min(10, room / 4);
  const innerLo = lo + inset;
  const innerHi = hi - inset;
  if (count <= 1) {
    if (mode === "same") return Math.min(innerHi, innerLo);
    if (innerHi <= innerLo) return (lo + hi) / 2;
    return (innerLo + innerHi) / 2;
  }
  const span = INFLUENCE_LANE_GAP * (count - 1);
  if (innerHi - innerLo >= span) {
    const mid = (innerLo + innerHi) / 2;
    return mid - span / 2 + lane * INFLUENCE_LANE_GAP;
  }
  return innerLo + lane * INFLUENCE_LANE_GAP;
}

interface RoutePoint {
  x: number;
  y: number;
}

interface CardBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface RoutedInfluence {
  points: RoutePoint[];
  color: string;
  dash?: string;
  width: number;
  label?: string;
  labelX: number;
  labelY: number;
  both?: boolean;
  minX: number;
  maxX: number;
  /** Концы ребра: нужны, чтобы подпись обходила чужие команды. */
  fromId?: string;
  toId?: string;
}

/** Кегль подписи на стрелке и полоса над линией, которую нельзя пересекать. */
const EDGE_LABEL_FONT = 10;
const EDGE_LABEL_BAND = 14;
/** Минимальный зазор между параллельными штрихами, иначе они читаются как одна линия. */
const TRACK_CLEAR = 12;

function personDepths(model: PowerModel): Map<string, number> {
  const children = new Map<string, string[]>();
  for (const edge of model.reports) {
    const list = children.get(edge.from) ?? [];
    list.push(edge.to);
    children.set(edge.from, list);
  }
  const depth = new Map<string, number>();
  const queue: string[] = [];
  if (model.virtualRoot) {
    for (const person of model.people) {
      if (!model.reports.some((edge) => edge.to === person.id)) {
        depth.set(person.id, 1);
        queue.push(person.id);
      }
    }
  } else if (model.root) {
    depth.set(model.root, 0);
    queue.push(model.root);
  }
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const rank = depth.get(id) ?? 0;
    for (const child of children.get(id) ?? []) {
      if (depth.has(child)) continue;
      depth.set(child, rank + 1);
      queue.push(child);
    }
  }
  let maxDepth = 0;
  for (const value of depth.values()) maxDepth = Math.max(maxDepth, value);
  for (const person of model.people) {
    if (!depth.has(person.id)) {
      depth.set(person.id, maxDepth + 1);
      maxDepth += 1;
    }
  }
  return depth;
}

/** Вертикальный зазор под уровнем: шины подчинения, стрелки влияния и их подписи. */
function rankGapBelow(model: PowerModel): (upperDepth: number) => number {
  const depth = personDepths(model);
  const cache = new Map<number, number>();
  return (upper) => {
    const known = cache.get(upper);
    if (known !== undefined) return known;
    const lower = upper + 1;
    const reportGroups = new Set<string>();
    for (const edge of model.reports) {
      if (depth.get(edge.from) === upper && depth.get(edge.to) === lower) {
        reportGroups.add(`${edge.from}|${edge.style}`);
      }
    }
    let influences = 0;
    let labels = 0;
    let stubs = 0;
    for (const edge of model.influences) {
      const from = depth.get(edge.from);
      const to = depth.get(edge.to);
      if (from === undefined || to === undefined) continue;
      const inGap =
        (from === upper && to === lower) ||
        (to === upper && from === lower) ||
        (from === upper && to === upper);
      const stub = (from === upper && to > lower) || (to === lower && from < upper);
      if (inGap) influences += 1;
      else if (stub) stubs += 1;
      else continue;
      if (edge.label) {
        const extraLines = Math.max(0, labelLineCount(edge.label) - 1);
        labels += 1 + extraLines;
      }
    }
    const need = 12 + reportGroups.size * 14 + influences * 14 + stubs * 14 + labels * 20;
    const gap = Math.max(52, need);
    cache.set(upper, gap);
    return gap;
  };
}

function contactLimitsOf(card: PlacedTreeNode<PowerPerson>, offsetX: number): { left: number; right: number } {
  const inset = Math.min(12, Math.max(4, card.width * 0.16));
  const left = offsetX + card.x + inset;
  const right = offsetX + card.x + card.width - inset;
  if (right <= left) {
    const center = offsetX + card.x + card.width / 2;
    return { left: center, right: center };
  }
  return { left, right };
}

function endSide(draft: InfluenceDraft, end: "x1" | "x2"): "top" | "bottom" {
  if (end === "x1") return draft.mode === "up" ? "top" : "bottom";
  return draft.mode === "down" ? "top" : "bottom";
}

/** Разводит концы подписанной стрелки, чтобы полка была длиннее текста. */
function spreadLabeledSpans(drafts: readonly InfluenceDraft[], offsetX: number): void {
  const taken = (cardId: string, side: "top" | "bottom", except: InfluenceDraft): number[] => {
    const xs: number[] = [];
    for (const other of drafts) {
      if (other === except) continue;
      if (other.from.node.id === cardId && endSide(other, "x1") === side) xs.push(other.x1);
      if (other.to.node.id === cardId && endSide(other, "x2") === side) xs.push(other.x2);
    }
    return xs;
  };
  const push = (
    draft: InfluenceDraft,
    key: "x1" | "x2",
    dir: number,
    limits: { left: number; right: number },
    blocked: readonly number[],
  ): boolean => {
    const current = draft[key];
    for (const step of [8, 16, 24, 40]) {
      const next = Math.min(limits.right, Math.max(limits.left, current + dir * step));
      if (Math.abs(next - current) < 1) continue;
      if (blocked.some((x) => Math.abs(x - next) < 10)) continue;
      draft[key] = next;
      return true;
    }
    return false;
  };
  for (const draft of drafts) {
    if (!draft.label) continue;
    const need = measureLabelWidth(draft.label, EDGE_LABEL_FONT) + 100;
    for (let step = 0; step < 48 && Math.abs(draft.x2 - draft.x1) < need; step += 1) {
      const sign = draft.x2 >= draft.x1 ? 1 : -1;
      const movedTo = push(
        draft,
        "x2",
        sign,
        contactLimitsOf(draft.to, offsetX),
        taken(draft.to.node.id, endSide(draft, "x2"), draft),
      );
      const movedFrom = push(
        draft,
        "x1",
        -sign,
        contactLimitsOf(draft.from, offsetX),
        taken(draft.from.node.id, endSide(draft, "x1"), draft),
      );
      if (!movedTo && !movedFrom) break;
    }
  }
}

interface TrackObstacle {
  y: number;
  x0: number;
  x1: number;
  labelTop?: number;
  labelBottom?: number;
}

function hostSegmentIndex(points: readonly RoutePoint[]): number {
  let best = -1;
  let span = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    if (index === 0 || index + 1 === points.length - 1) continue;
    const a = points[index];
    const b = points[index + 1];
    if (Math.abs(a.y - b.y) > 0.4) continue;
    const width = Math.abs(a.x - b.x);
    if (width <= span) continue;
    span = width;
    best = index;
  }
  return best;
}

function labelReserve(y: number, label?: string): { top: number; bottom: number } | null {
  if (!label) return null;
  const bottom = y - 4;
  const lineCount = labelLineCount(label);
  const band = lineCount * labelLineStep(EDGE_LABEL_FONT) + 4;
  return { top: bottom - band, bottom };
}

function trackConflicts(
  y: number,
  x0: number,
  x1: number,
  label: string | undefined,
  obstacle: TrackObstacle,
): boolean {
  if (!rangesOverlap(x0, x1, obstacle.x0, obstacle.x1)) return false;
  if (Math.abs(y - obstacle.y) < TRACK_CLEAR) return true;
  const reserve = labelReserve(y, label);
  if (reserve && obstacle.y > reserve.top - 3 && obstacle.y < y + 3) return true;
  if (
    reserve &&
    obstacle.labelTop !== undefined &&
    obstacle.labelBottom !== undefined &&
    rangesOverlap(reserve.top, reserve.bottom, obstacle.labelTop, obstacle.labelBottom)
  ) {
    return true;
  }
  if (obstacle.labelTop !== undefined && obstacle.labelBottom !== undefined) {
    if (y > obstacle.labelTop - 3 && y < obstacle.labelBottom + 3) return true;
  }
  return false;
}

function gapBand(x0: number, x1: number, y: number, cards: readonly CardBox[]): { top: number; bottom: number } {
  for (const card of cards) {
    if (!rangesOverlap(x0, x1, card.left, card.right)) continue;
    if (card.top < y - 1 && card.bottom > y + 1) return { top: y, bottom: y };
  }
  let top = Number.NEGATIVE_INFINITY;
  let bottom = Number.POSITIVE_INFINITY;
  for (const card of cards) {
    if (!rangesOverlap(x0, x1, card.left, card.right)) continue;
    if (card.bottom <= y + 1) top = Math.max(top, card.bottom);
    if (card.top >= y - 1) bottom = Math.min(bottom, card.top);
  }
  if (!Number.isFinite(top)) top = y - 40;
  if (!Number.isFinite(bottom)) bottom = y + 40;
  return { top, bottom };
}

function writeObstacle(obstacle: TrackObstacle, y: number, label?: string): void {  obstacle.y = y;
  const reserve = labelReserve(y, label);
  obstacle.labelTop = reserve?.top;
  obstacle.labelBottom = reserve?.bottom;
}

/** Сдвигает горизонтали влияния с шины подчинения и с подписей других стрелок. */
function separateInfluenceTracks(
  routes: readonly { points: RoutePoint[]; label?: string; fromId?: string; toId?: string }[],
  reports: readonly { x1: number; y1: number; x2: number; y2: number; midY: number }[],
  cards: readonly CardBox[],
  teams?: { boxes: readonly TeamBox[]; membership: Map<string, string>; offsetX: number; offsetY: number },
): void {
  const fixed: TrackObstacle[] = reports.map((elbow) => ({
    y: elbow.midY,
    x0: Math.min(elbow.x1, elbow.x2),
    x1: Math.max(elbow.x1, elbow.x2),
  }));
  const tracks: {
    points: RoutePoint[];
    index: number;
    label: string | undefined;
    obstacle: TrackObstacle;
    obstacles: readonly CardBox[];
  }[] = [];
  for (const route of routes) {
    const host = hostSegmentIndex(route.points);
    // Свои команды коридор не перекрывают, чужие — да: полка не должна залезать в чужую рамку.
    const obstacles =
      teams && route.fromId && route.toId
        ? cards.concat(
            foreignTeamBoxes(teams.boxes, teams.membership, route.fromId, route.toId, teams.offsetX, teams.offsetY),
          )
        : cards;
    for (let index = 0; index < route.points.length - 1; index += 1) {
      if (index === 0 || index + 1 === route.points.length - 1) continue;
      const a = route.points[index];
      const b = route.points[index + 1];
      if (Math.abs(a.y - b.y) > 0.4 || Math.abs(a.x - b.x) < 8) continue;
      const label = index === host ? route.label : undefined;
      const obstacle: TrackObstacle = {
        y: a.y,
        x0: Math.min(a.x, b.x),
        x1: Math.max(a.x, b.x),
      };
      writeObstacle(obstacle, a.y, label);
      tracks.push({ points: route.points, index, label, obstacle, obstacles });
    }
  }
  const ordered = [...tracks].sort((a, b) => Number(Boolean(b.label)) - Number(Boolean(a.label)));
  for (const track of ordered) {
    const a = track.points[track.index];
    const b = track.points[track.index + 1];
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    const band = gapBand(x0, x1, a.y, track.obstacles);
    const others = [...fixed, ...tracks.map((item) => item.obstacle)];
    let next = a.y;
    const span = Math.max(0, band.bottom - band.top);
    for (let delta = 0; delta <= span + 1; delta += 1) {
      const candidates = delta === 0 ? [a.y] : [a.y + delta, a.y - delta];
      const found = candidates.find(
        (y) =>
          y >= band.top + 4 &&
          y <= band.bottom - 4 &&
          !others.some((obstacle) => obstacle !== track.obstacle && trackConflicts(y, x0, x1, track.label, obstacle)),
      );
      if (found !== undefined) {
        next = found;
        break;
      }
    }
    const clashes = (y: number): boolean =>
      others.some(
        (obstacle) => obstacle !== track.obstacle && trackConflicts(y, x0, x1, track.label, obstacle),
      );
    if (clashes(next)) {
      // В полосе между карточками места не осталось: уводим полку ниже полосы.
      // Высота схемы считается по фактическим y маршрутов, поэтому место появится.
      let below = band.bottom + 8;
      for (let guard = 0; guard < 400 && clashes(below); guard += 1) below += 12;
      next = below;
    }
    a.y = next;
    b.y = next;
    writeObstacle(track.obstacle, next, track.label);
  }
}

interface FlatSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  owner: number;
  host: boolean;
}

/** Точки входа стрелок на одной грани карточки не должны совпадать: иначе две линии сливаются. */
const CONTACT_MIN_GAP = 14;

function spreadContacts(routes: readonly { points: RoutePoint[] }[], cards: readonly CardBox[]): void {
  interface EndRef {
    points: RoutePoint[];
    index: number;
    card: CardBox;
    side: "top" | "bottom";
  }
  const ends: EndRef[] = [];
  const cardAt = (point: RoutePoint): { card: CardBox; side: "top" | "bottom" } | undefined => {
    for (const card of cards) {
      const insideX = point.x >= card.left - 0.6 && point.x <= card.right + 0.6;
      if (!insideX) continue;
      if (Math.abs(point.y - card.top) < 0.8) return { card, side: "top" };
      if (Math.abs(point.y - card.bottom) < 0.8) return { card, side: "bottom" };
    }
    return undefined;
  };
  for (const route of routes) {
    if (route.points.length < 2) continue;
    const first = route.points[0];
    const head = cardAt(first);
    if (head) ends.push({ points: route.points, index: 0, card: head.card, side: head.side });
    const lastIndex = route.points.length - 1;
    const tail = cardAt(route.points[lastIndex]);
    if (tail) ends.push({ points: route.points, index: lastIndex, card: tail.card, side: tail.side });
  }
  const byKey = new Map<string, EndRef[]>();
  for (const end of ends) {
    const key = `${end.card.left}|${end.card.top}|${end.side}`;
    byKey.set(key, [...(byKey.get(key) ?? []), end]);
  }
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    const card = group[0].card;
    const inset = Math.min(12, Math.max(4, (card.right - card.left) * 0.16));
    const left = card.left + inset;
    const right = card.right - inset;
    const sorted = [...group].sort((a, b) => a.points[a.index].x - b.points[b.index].x);
    // Если точек больше, чем влезает с шагом, шаг ужимаем — но не меньше 8 px.
    const step = Math.max(8, Math.min(CONTACT_MIN_GAP, (right - left) / Math.max(1, group.length - 1)));
    const span = step * (sorted.length - 1);
    const average = sorted.reduce((sum, end) => sum + end.points[end.index].x, 0) / sorted.length;
    let cursor = Math.min(right - span, Math.max(left, average - span / 2));
    for (const end of sorted) {
      const point = end.points[end.index];
      const nextX = Math.min(right, Math.max(left, cursor));
      const neighbour = end.index === 0 ? end.points[1] : end.points[end.points.length - 2];
      if (neighbour && Math.abs(neighbour.x - point.x) < 0.6) neighbour.x = nextX;
      point.x = nextX;
      cursor += step;
    }
  }
}

/** Линия не должна идти по самой грани карточки: отступ вниз/вверх на 8 px. */
const CONTACT_JOG = 8;

function clearEdgeJogs(routes: readonly { points: RoutePoint[] }[], cards: readonly CardBox[]): void {
  const edgeAt = (point: RoutePoint): { side: "top" | "bottom"; key: string } | undefined => {
    for (const card of cards) {
      if (point.x < card.left - 0.6 || point.x > card.right + 0.6) continue;
      const key = `${card.left}|${card.top}`;
      if (Math.abs(point.y - card.top) < 0.8) return { side: "top", key };
      if (Math.abs(point.y - card.bottom) < 0.8) return { side: "bottom", key };
    }
    return undefined;
  };
  /** Отступ растёт для каждой следующей стрелки с той же грани: иначе отступы совпадают. */
  const used = new Map<string, number>();
  const pushAway = (points: RoutePoint[], edge: "top" | "bottom", key: string): void => {
    const seen = used.get(key) ?? 0;
    used.set(key, seen + 1);
    const distance = CONTACT_JOG + seen * 6;
    const shift = edge === "bottom" ? distance : -distance;
    const y = points[0].y;
    // Начало: короткий спуск/подъём, затем смещаем все точки, лежавшие на грани.
    const onEdge: number[] = [];
    for (let index = 0; index < points.length; index += 1) {
      if (Math.abs(points[index].y - y) < 0.4) onEdge.push(index);
      else break;
    }
    points.splice(1, 0, { x: points[0].x, y: y + shift });
    for (const index of onEdge) {
      if (index === 0) continue;
      points[index + 1].y = y + shift;
    }
  };
  for (const route of routes) {
    const points = route.points;
    if (points.length < 3) continue;
    const firstEdge = edgeAt(points[0]);
    if (firstEdge && Math.abs(points[1].y - points[0].y) < 0.4) {
      pushAway(points, firstEdge.side, `${firstEdge.key}|head`);
    }
    const lastIndex = points.length - 1;
    const lastEdge = edgeAt(points[lastIndex]);
    if (lastEdge && Math.abs(points[lastIndex - 1].y - points[lastIndex].y) < 0.4) {
      // Хвост разворачиваем зеркально: работаем с копией, затем переворачиваем обратно.
      const reversed = [...points].reverse().map((point) => ({ x: point.x, y: point.y }));
      pushAway(reversed, lastEdge.side, `${lastEdge.key}|tail`);
      reversed.reverse();
      points.length = 0;
      points.push(...reversed);
    }
  }
}

function flatSegments(
  routes: readonly { points: RoutePoint[] }[],
  reports: readonly {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    midY: number;
    midX?: number;
  }[],
): FlatSegment[] {
  const segments: FlatSegment[] = [];
  reports.forEach((elbow, index) => {
    const owner = -1 - index;
    if (elbow.midX === undefined) {
      segments.push({ x0: elbow.x1, y0: elbow.y1, x1: elbow.x1, y1: elbow.midY, owner, host: false });
      segments.push({ x0: elbow.x1, y0: elbow.midY, x1: elbow.x2, y1: elbow.midY, owner, host: false });
      segments.push({ x0: elbow.x2, y0: elbow.midY, x1: elbow.x2, y1: elbow.y2, owner, host: false });
      return;
    }
    segments.push({ x0: elbow.x1, y0: elbow.y1, x1: elbow.midX, y1: elbow.y1, owner, host: false });
    segments.push({ x0: elbow.midX, y0: elbow.y1, x1: elbow.midX, y1: elbow.y2, owner, host: false });
    segments.push({ x0: elbow.midX, y0: elbow.y2, x1: elbow.x2, y1: elbow.y2, owner, host: false });
  });
  routes.forEach((route, owner) => {
    const host = hostSegmentIndex(route.points);
    for (let index = 0; index < route.points.length - 1; index += 1) {
      const a = route.points[index];
      const b = route.points[index + 1];
      segments.push({
        x0: a.x,
        y0: a.y,
        x1: b.x,
        y1: b.y,
        owner,
        host: index === host,
      });
    }
  });
  return segments;
}

/**
 * Прямоугольник плашки подписи ровно таким, каким его рисует render:
 * однострочная — 14 px над базовой линией, многострочная — по центру базовой линии.
 */
function edgeLabelPlate(labelY: number, lineCount: number): { top: number; bottom: number; height: number } {
  const extra = Math.max(0, lineCount - 1) * labelLineStep(EDGE_LABEL_FONT);
  const height = EDGE_LABEL_BAND + extra;
  // Плашка растёт вверх от полки: низ остаётся на прежнем месте при любой длине.
  const top = labelY - (EDGE_LABEL_BAND - 2) - extra / 2;
  return { top, bottom: top + height, height };
}

/** Базовая линия подписи: над полкой (как раньше) или под ней, если сверху карточки. */
function edgeLabelBaseline(lineY: number, lineCount: number, side: "above" | "below"): number {
  const extra = Math.max(0, lineCount - 1) * labelLineStep(EDGE_LABEL_FONT);
  if (side === "above") return lineY - 6 - extra / 2;
  const { height } = edgeLabelPlate(0, lineCount);
  return lineY + 4 + EDGE_LABEL_BAND - 2 + (height - EDGE_LABEL_BAND) / 2;
}

/** Площадь пересечения плашки с карточками: 0 — свободно. */
function plateCardOverlap(
  left: number,
  right: number,
  top: number,
  bottom: number,
  cards: readonly CardBox[],
): number {
  let area = 0;
  for (const card of cards) {
    const overlapX = Math.min(right, card.right) - Math.max(left, card.left);
    const overlapY = Math.min(bottom, card.bottom) - Math.max(top, card.top);
    if (overlapX > 0.5 && overlapY > 0.5) area += overlapX * overlapY;
  }
  return area;
}

/** Свободные по X промежутки внутри полосы подписи: чужие штрихи её не перерезают. */
function labelFreeSpans(
  segments: readonly FlatSegment[],
  owner: number,
  boxTop: number,
  boxBottom: number,
  xMin: number,
  xMax: number,
): { lo: number; hi: number }[] {
  const blocked: { lo: number; hi: number }[] = [];
  for (const segment of segments) {
    // Своя линия под плашкой — нормально: плашка закрывает её фоном. Чужие штрихи мешают.
    if (segment.owner === owner) continue;
    const vertical = Math.abs(segment.x0 - segment.x1) < 0.6;
    const horizontal = Math.abs(segment.y0 - segment.y1) < 0.6;
    if (vertical) {
      const y0 = Math.min(segment.y0, segment.y1);
      const y1 = Math.max(segment.y0, segment.y1);
      if (y1 <= boxTop || y0 >= boxBottom) continue;
      blocked.push({ lo: segment.x0 - 6, hi: segment.x0 + 6 });
      continue;
    }
    if (!horizontal) continue;
    if (segment.y0 <= boxTop - 1 || segment.y0 >= boxBottom + 1) continue;
    if (!rangesOverlap(xMin, xMax, segment.x0, segment.x1)) continue;
    blocked.push({
      lo: Math.min(segment.x0, segment.x1) - 4,
      hi: Math.max(segment.x0, segment.x1) + 4,
    });
  }
  const marks = blocked
    .map((interval) => ({ lo: Math.max(xMin, interval.lo), hi: Math.min(xMax, interval.hi) }))
    .filter((interval) => interval.hi > interval.lo)
    .sort((left, right) => left.lo - right.lo);
  const free: { lo: number; hi: number }[] = [];
  let cursor = xMin;
  for (const mark of marks) {
    if (mark.lo > cursor) free.push({ lo: cursor, hi: mark.lo });
    cursor = Math.max(cursor, mark.hi);
  }
  if (cursor < xMax) free.push({ lo: cursor, hi: xMax });
  return free;
}

/** Кандидаты X в порядке предпочтения: прежний слот, затем середины свободных промежутков. */
/** Середина свободного промежутка плюс сам центр полки: центр — тоже кандидат. */
function labelXCandidates(
  free: readonly { lo: number; hi: number }[],
  width: number,
  center: number,
  xMin: number,
  xMax: number,
): number[] {
  const fits = free.filter((interval) => interval.hi - interval.lo >= width);
  const widest =
    free.length > 0
      ? [...free].sort((left, right) => right.hi - right.lo - (left.hi - left.lo))[0]
      : { lo: xMin, hi: xMax };
  const slot = fits[0] ?? widest;
  // Прежний выбор X: центр, зажатый в первый походящий слот (иначе — его середина).
  const clamped =
    slot.hi - slot.lo >= width
      ? Math.min(slot.hi - width / 2, Math.max(slot.lo + width / 2, center))
      : (slot.lo + slot.hi) / 2;
  // Центр полки — всегда кандидат: пересечение чужих штрихов теперь стоит, но не запрещено.
  const out = [center, clamped];
  // Дополнительные места внутри слотов, куда плашка влезает целиком.
  for (const span of fits) {
    out.push(span.lo + width / 2, span.hi - width / 2, (span.lo + span.hi) / 2);
  }
  const unique: number[] = [];
  for (const x of out) {
    if (x < xMin || x > xMax) continue;
    if (unique.every((known) => Math.abs(known - x) > 0.5)) unique.push(x);
  }
  return unique.slice(0, 8);
}

/** Чужие штрихи, которые перерезает плашка. Пересечение стоит штраф, но не запрещено. */
function crossedStrokes(segments: readonly FlatSegment[], owner: number, box: CardBox): number {
  let count = 0;
  for (const segment of segments) {
    if (segment.owner === owner) continue;
    if (Math.abs(segment.x0 - segment.x1) < 0.6) {
      const y0 = Math.min(segment.y0, segment.y1);
      const y1 = Math.max(segment.y0, segment.y1);
      if (y1 <= box.top || y0 >= box.bottom) continue;
      if (segment.x0 <= box.left + 1 || segment.x0 >= box.right - 1) continue;
      count += 1;
      continue;
    }
    if (Math.abs(segment.y0 - segment.y1) >= 0.6) continue;
    if (segment.y0 <= box.top + 1 || segment.y0 >= box.bottom - 1) continue;
    if (!rangesOverlap(box.left, box.right, Math.min(segment.x0, segment.x1), Math.max(segment.x0, segment.x1))) {
      continue;
    }
    count += 1;
  }
  return count;
}

/** Сколько границ рамок команд плашка перерезает. Стоять внутри рамки — нормально. */
function crossedFrameBorders(box: CardBox, frames: readonly CardBox[]): number {
  let count = 0;
  for (const frame of frames) {
    const overlapsY = box.top < frame.bottom - 1 && box.bottom > frame.top + 1;
    const overlapsX = box.left < frame.right - 1 && box.right > frame.left + 1;
    if (!overlapsY || !overlapsX) continue;
    if (box.left < frame.left || box.right > frame.right || box.top < frame.top || box.bottom > frame.bottom) {
      count += 1;
    }
  }
  return count;
}

/**
 * Подпись рядом со своей связью. Перебирает полки маршрута, сторону (над/под линией)
 * и небольшой сдвиг по вертикали; берёт место, где плашка не наезжает на карточки,
 * на уже поставленные подписи и на чужие штрихи, и лишь в крайнем случае — минимальное перекрытие.
 */
function placeEdgeLabel(
  points: readonly RoutePoint[],
  text: string,
  segments: readonly FlatSegment[],
  owner: number,
  cards: readonly CardBox[] = [],
  taken: readonly CardBox[] = [],
  frames: readonly CardBox[] = [],
): RoutePoint {
  const lineCount = labelLineCount(text);
  const width = measureLabelWidth(text, EDGE_LABEL_FONT) + 10;
  const hosts: { xMin: number; xMax: number; lineY: number }[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    if (Math.abs(a.y - b.y) > 0.4) continue;
    if (Math.abs(a.x - b.x) < 12) continue;
    hosts.push({ xMin: Math.min(a.x, b.x), xMax: Math.max(a.x, b.x), lineY: a.y });
  }
  if (hosts.length === 0) return labelAnchor(points);
  hosts.sort((left, right) => right.xMax - right.xMin - (left.xMax - left.xMin));

  let best: { x: number; y: number; score: number } | null = null;
  let fallback: { x: number; y: number; overlap: number; score: number } | null = null;
  const hostCandidates = hosts.slice(0, 3);
  for (let hostRank = 0; hostRank < hostCandidates.length; hostRank += 1) {
    const host = hostCandidates[hostRank];
    const center = (host.xMin + host.xMax) / 2;
    for (const side of ["above", "below"] as const) {
      // Плашка стоит вплотную к своей полке: вертикальный сдвиг отрывал её от связи.
      const y = edgeLabelBaseline(host.lineY, lineCount, side);
      const plate = edgeLabelPlate(y, lineCount);
      const free = labelFreeSpans(segments, owner, plate.top, plate.bottom, host.xMin, host.xMax);
      const xs = labelXCandidates(free, width, center, host.xMin, host.xMax);
      for (const x of xs) {
        const box: CardBox = {
          left: x - width / 2,
          right: x + width / 2,
          top: plate.top,
          bottom: plate.bottom,
        };
        const hard =
          plateCardOverlap(box.left, box.right, plate.top, plate.bottom, cards) +
          plateCardOverlap(box.left, box.right, plate.top, plate.bottom, taken);
        // Чужие штрихи и границы рамок — цена места, а не запрет: иначе подпись
        // уезжает от своей полки туда, где свободно, и выглядит чужой.
        const score =
          Math.abs(x - center) * 1.2 +
          crossedStrokes(segments, owner, box) * 18 +
          crossedFrameBorders(box, frames) * 10 +
          hostRank * 8 +
          (side === "above" ? 0 : 6);
        if (hard > 0) {
          if (
            !fallback ||
            hard < fallback.overlap - 0.5 ||
            (Math.abs(hard - fallback.overlap) <= 0.5 && score < fallback.score)
          ) {
            fallback = { x, y, overlap: hard, score };
          }
          continue;
        }
        if (!best || score < best.score) best = { x, y, score };
      }
    }
  }
  if (best) return { x: best.x, y: best.y };
  // Свободного места нет — ставим там, где перекрытие минимально.
  return fallback
    ? { x: fallback.x, y: fallback.y }
    : { x: (hosts[0].xMin + hosts[0].xMax) / 2, y: edgeLabelBaseline(hosts[0].lineY, lineCount, "above") };
}

/** Ломаные стрелки влияния, как линии подчинения: без наложения друг на друга. */
function routeInfluences(
  placed: readonly PlacedTreeNode<PowerPerson>[],
  model: PowerModel,
  offsetX: number,
  offsetY: number,
  treeBottom: number,
  mono: boolean,
  invert: boolean,
  teams?: {
    boxes: readonly TeamBox[];
    membership: Map<string, string>;
    localReports: readonly PowerReportEdge[];
    crossReports: readonly PowerReportEdge[];
    axis: string;
  },
): { routes: RoutedInfluence[]; overflow: number } {
  const byId = new Map(placed.map((card) => [card.node.id, card]));
  const drafts: InfluenceDraft[] = [];
  for (const edge of model.influences) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    const fromTop = offsetY + from.y;
    const fromBottom = offsetY + from.y + from.height;
    const toTop = offsetY + to.y;
    const toBottom = offsetY + to.y + to.height;
    let mode: InfluenceDraft["mode"] = "same";
    let y1 = fromBottom;
    let y2 = toBottom;
    let gapTop = Math.max(fromBottom, toBottom);
    let gapBottom = gapTop + 36;
    if (fromBottom <= toTop + 1) {
      mode = "down";
      y1 = fromBottom;
      y2 = toTop;
      gapTop = fromBottom;
      gapBottom = toTop;
    } else if (toBottom <= fromTop + 1) {
      mode = "up";
      y1 = fromTop;
      y2 = toBottom;
      gapTop = toBottom;
      gapBottom = fromTop;
    } else {
      const below = Math.max(fromBottom, toBottom);
      const nextTop = placed
        .map((card) => offsetY + card.y)
        .filter((y) => y > below + 1)
        .sort((a, b) => a - b)[0];
      gapTop = below;
      gapBottom = nextTop !== undefined && nextTop - below > 16 ? nextTop : below + 36;
      y1 = fromBottom;
      y2 = toBottom;
    }
    drafts.push({
      from,
      to,
      link: resolveLink(model, edge.name),
      label: edge.label,
      both: edge.both,
      mode,
      x1: 0,
      y1,
      x2: 0,
      y2,
      gapTop,
      gapBottom,
      corridor: `${fmt(gapTop)}|${fmt(gapBottom)}`,
    });
  }

  const cardCenterX = (card: PlacedTreeNode<PowerPerson>) => offsetX + card.x + card.width / 2;
  const reports = reportingElbowRoutes(placed, teams ? teams.localReports : model.reports, offsetX, offsetY);
  const cards = placed.map((card) => cardBox(card, offsetX, offsetY));
  // Точки входа/выхода связей подчинения: стрелка влияния не должна выходить из той же точки.
  const reportContacts = reports.flatMap((elbow) => [
    { x: elbow.x1, y: elbow.y1 },
    { x: elbow.x2, y: elbow.y2 },
  ]);
  const avoidReportContact = (
    x: number,
    card: PlacedTreeNode<PowerPerson>,
    side: "top" | "bottom",
  ): number => {
    const limits = contactLimitsOf(card, offsetX);
    const edgeY = side === "top" ? offsetY + card.y : offsetY + card.y + card.height;
    const blocked = reportContacts
      .filter((contact) => Math.abs(contact.y - edgeY) < 1.5 && Math.abs(contact.x - x) < 14)
      .map((contact) => contact.x);
    if (blocked.length === 0) return x;
    for (const dir of [1, -1, 2, -2]) {
      const next = Math.min(limits.right, Math.max(limits.left, x + dir * 10));
      if (Math.abs(next - x) < 1) continue;
      if (blocked.every((known) => Math.abs(known - next) >= 12)) return next;
    }
    return x;
  };

  const touches = new Map<string, { draft: InfluenceDraft; end: "x1" | "x2"; otherX: number }[]>();
  for (const draft of drafts) {
    const fromSide = draft.mode === "up" ? "top" : "bottom";
    const toSide = draft.mode === "down" ? "top" : "bottom";
    const fromKey = `${draft.from.node.id}|${fromSide}`;
    const toKey = `${draft.to.node.id}|${toSide}`;
    touches.set(fromKey, [
      ...(touches.get(fromKey) ?? []),
      { draft, end: "x1", otherX: cardCenterX(draft.to) },
    ]);
    touches.set(toKey, [
      ...(touches.get(toKey) ?? []),
      { draft, end: "x2", otherX: cardCenterX(draft.from) },
    ]);
  }
  for (const [key, list] of touches) {
    const card = byId.get(key.slice(0, key.lastIndexOf("|")));
    if (!card) continue;
    const ordered = [...list].sort((a, b) => a.otherX - b.otherX || (a.end === "x1" ? -1 : 1));
    ordered.forEach((item, index) => {
      const side = item.end === "x1" ? endSide(item.draft, "x1") : endSide(item.draft, "x2");
      const x = avoidReportContact(contactX(card, offsetX, index, ordered.length), card, side);
      if (item.end === "x1") item.draft.x1 = x;
      else item.draft.x2 = x;
    });
  }
  spreadLabeledSpans(drafts, offsetX);

  const laneOf = new Map<InfluenceDraft, { lane: number; count: number }>();
  const corridors = new Map<string, InfluenceDraft[]>();
  for (const draft of drafts) {
    corridors.set(draft.corridor, [...(corridors.get(draft.corridor) ?? []), draft]);
  }
  for (const items of corridors.values()) {
    const sorted = [...items].sort((a, b) => a.x1 - b.x1 || a.x2 - b.x2);
    const lanes = new Map<InfluenceDraft, number>();
    for (const item of sorted) {
      let lane = 0;
      while (sorted.some((other) => lanes.get(other) === lane && routesWouldMerge(item, other))) {
        lane += 1;
      }
      lanes.set(item, lane);
    }
    const count = Math.max(1, ...[...lanes.values()].map((lane) => lane + 1));
    for (const [item, lane] of lanes) laneOf.set(item, { lane, count });
  }

  let overflow = 0;
  const influenceRoutes = drafts.map((draft) => {
    const lane = laneOf.get(draft) ?? { lane: 0, count: 1 };
    const midY = influenceLaneY(draft.gapTop, draft.gapBottom, lane.lane, lane.count, draft.mode);
    const fromBox = cardBox(draft.from, offsetX, offsetY);
    const toBox = cardBox(draft.to, offsetX, offsetY);
    const obstacles = [
      ...cardsBetween(placed, draft, offsetX, offsetY),
      ...(teams ? foreignTeamBoxes(teams.boxes, teams.membership, draft.from.node.id, draft.to.node.id, offsetX, offsetY) : []),
    ];
    // Полка ищет свободную горизонталь в коридоре: лучше сдвинуть её, чем обходить сбоку.
    // Коридор считаем по зазору между карточками, а не по концам стрелки:
    // у связей одного уровня y1 и y2 совпадают, и прежняя формула давала
    // инвертированный диапазон — полка могла лечь внутрь карточки.
    const corridorLo = Math.min(draft.gapTop, draft.gapBottom) + 6;
    let corridorHi = Math.max(draft.gapTop, draft.gapBottom) - 6;
    if (corridorHi - corridorLo < 12) corridorHi = corridorLo + 24;
    const shelfLo = Math.min(draft.x1, draft.x2);
    const shelfHi = Math.max(draft.x1, draft.x2);
    const shelves = freeBands(corridorLo, corridorHi, shelfLo, shelfHi, obstacles)
      .map((band) => Math.min(band.bottom - 5, Math.max(band.top + 5, midY)))
      .sort((left, right) => Math.abs(left - midY) - Math.abs(right - midY));
    let points: RoutePoint[] | null = null;
    for (const y of shelves) {
      const candidate = elbowPoints(draft.x1, draft.y1, draft.x2, draft.y2, y);
      if (pathHitsCards(candidate, obstacles)) continue;
      points = candidate;
      break;
    }
    if (!points) {
      const elbow = elbowPoints(draft.x1, draft.y1, draft.x2, draft.y2, midY);
      points = pathHitsCards(elbow, obstacles)
        ? routeOnGrid(
            { x: draft.x1, y: draft.y1 },
            { x: draft.x2, y: draft.y2 },
            obstacles,
            fromBox,
            toBox,
            lane.lane,
          )
        : elbow;
    }
    // Страховка: полка и ножки могли лечь внутрь собственных карточек.
    if (points.length >= 2) {
      points[0] = clipToNearEdge(points[0], points[1], fromBox);
      points[points.length - 1] = clipToNearEdge(points[points.length - 1], points[points.length - 2], toBox);
    }
    if (pathHitsCards(points, [fromBox, toBox])) {
      const routed = routeAvoiding(
        { x: draft.x1, y: draft.y1 },
        { x: draft.x2, y: draft.y2 },
        obstacles,
        { startBox: fromBox, endBox: toBox },
      );
      if (routed) {
        const shaped = dedupePoints(routed);
        if (!pathHitsCards(shaped, [fromBox, toBox])) points = shaped;
      }
    }
    const color = mono ? monoPaint(draft.link.color, invert) : draft.link.color;
    return {
      points,
      color,
      dash: STROKE_DASH[draft.link.style],
      width: draft.link.width,
      label: draft.label,
      labelX: 0,
      labelY: 0,
      both: draft.both,
      minX: 0,
      maxX: 0,
      fromId: draft.from.node.id,
      toId: draft.to.node.id,
    };
  });
  const crossRoutes = teams
    ? routeCrossReports(placed, teams.crossReports, offsetX, offsetY, teams.boxes, teams.membership, teams.axis)
    : [];
  const routes = [...crossRoutes, ...influenceRoutes];
  separateInfluenceTracks(
    routes,
    reports,
    cards,
    teams ? { boxes: teams.boxes, membership: teams.membership, offsetX, offsetY } : undefined,
  );
  spreadContacts(routes, cards);
  clearEdgeJogs(routes, cards);
  repairRoutes(routes, cards, new Map(placed.map((card, index) => [card.node.id, index])));
  const segments = flatSegments(routes, reports);
  // Плашки уже поставленных подписей: следующая не должна на них наезжать.
  const takenPlates: CardBox[] = [];
  routes.forEach((route, index) => {
    const labelCards =
      teams && route.fromId && route.toId
        ? cards.concat(
            foreignTeamBoxes(teams.boxes, teams.membership, route.fromId, route.toId, offsetX, offsetY),
          )
        : cards;
    const frames = teams ? teams.boxes.map((box) => ({
      left: offsetX + box.x,
      right: offsetX + box.x + box.width,
      top: offsetY + box.y,
      bottom: offsetY + box.y + box.height,
    })) : [];
    const labelAt = route.label
      ? placeEdgeLabel(route.points, route.label, segments, index, labelCards, takenPlates, frames)
      : labelAnchor(route.points);
    if (route.label) {
      const lineCount = labelLineCount(route.label);
      const width = measureLabelWidth(route.label, EDGE_LABEL_FONT) + 10;
      const plate = edgeLabelPlate(labelAt.y, lineCount);
      takenPlates.push({
        left: labelAt.x - width / 2,
        right: labelAt.x + width / 2,
        top: plate.top,
        bottom: plate.bottom,
      });
    }
    route.labelX = labelAt.x;
    route.labelY = labelAt.y;
    const xs = route.points.map((point) => point.x);
    const ys = route.points.map((point) => point.y);
    route.minX = Math.min(...xs);
    route.maxX = Math.max(...xs);
    overflow = Math.max(overflow, ...ys.map((y) => y - treeBottom), 0);
  });
  return { routes, overflow: Math.max(0, overflow) };
}

function cardBox(card: PlacedTreeNode<PowerPerson>, offsetX: number, offsetY: number): CardBox {
  return {
    left: offsetX + card.x,
    right: offsetX + card.x + card.width,
    top: offsetY + card.y,
    bottom: offsetY + card.y + card.height,
  };
}

/** Окно вокруг маршрута, в котором карточки считаются препятствиями. */
const ROUTE_WINDOW = 60;

/** Карточки рядом с маршрутом влияния: обходить нужно все, а не только те, что между концами. */
function cardsBetween(
  placed: readonly PlacedTreeNode<PowerPerson>[],
  draft: InfluenceDraft,
  offsetX: number,
  offsetY: number,
): CardBox[] {
  const x0 = Math.min(draft.x1, draft.x2) - ROUTE_WINDOW;
  const x1 = Math.max(draft.x1, draft.x2) + ROUTE_WINDOW;
  const y0 = Math.min(draft.y1, draft.y2) - ROUTE_WINDOW;
  const y1 = Math.max(draft.y1, draft.y2) + ROUTE_WINDOW;
  const boxes: CardBox[] = [];
  for (const card of placed) {
    if (card.node.id === draft.from.node.id || card.node.id === draft.to.node.id) continue;
    const box = cardBox(card, offsetX, offsetY);
    if (box.right > x0 && box.left < x1 && box.bottom > y0 && box.top < y1) boxes.push(box);
  }
  return boxes;
}

/** Свободные по высоте полосы коридора для полки, которая идёт от x0 до x1. */
function freeBands(
  lo: number,
  hi: number,
  x0: number,
  x1: number,
  boxes: readonly CardBox[],
): { top: number; bottom: number }[] {
  if (hi <= lo) return [];
  const blocks = boxes
    .filter((box) => rangesOverlap(x0, x1, box.left, box.right))
    .map((box) => ({ top: Math.max(lo, box.top), bottom: Math.min(hi, box.bottom) }))
    .filter((block) => block.bottom > block.top)
    .sort((left, right) => left.top - right.top);
  const bands: { top: number; bottom: number }[] = [];
  let cursor = lo;
  for (const block of blocks) {
    if (block.top > cursor) bands.push({ top: cursor, bottom: block.top });
    cursor = Math.max(cursor, block.bottom);
  }
  if (cursor < hi) bands.push({ top: cursor, bottom: hi });
  return bands;
}

function dedupePoints(points: readonly RoutePoint[]): RoutePoint[] {
  const kept: RoutePoint[] = [];
  for (const point of points) {
    const prev = kept[kept.length - 1];
    if (prev && Math.abs(prev.x - point.x) < 0.4 && Math.abs(prev.y - point.y) < 0.4) continue;
    kept.push(point);
  }
  return kept;
}

function elbowPoints(x1: number, y1: number, x2: number, y2: number, midY: number): RoutePoint[] {
  return dedupePoints([
    { x: x1, y: y1 },
    { x: x1, y: midY },
    { x: x2, y: midY },
    { x: x2, y: y2 },
  ]);
}

function segmentHitsCard(a: RoutePoint, b: RoutePoint, box: CardBox): boolean {
  const pad = 3;
  const left = box.left + pad;
  const right = box.right - pad;
  const top = box.top + pad;
  const bottom = box.bottom - pad;
  if (right <= left || bottom <= top) return false;
  if (Math.abs(a.x - b.x) < 0.6) {
    if (a.x <= left || a.x >= right) return false;
    const y0 = Math.min(a.y, b.y);
    const y1 = Math.max(a.y, b.y);
    return y1 > top && y0 < bottom;
  }
  if (Math.abs(a.y - b.y) < 0.6) {
    if (a.y <= top || a.y >= bottom) return false;
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    return x1 > left && x0 < right;
  }
  return false;
}

function pathHitsCards(points: readonly RoutePoint[], boxes: readonly CardBox[]): boolean {
  for (let index = 0; index < points.length - 1; index += 1) {
    for (const box of boxes) {
      if (segmentHitsCard(points[index], points[index + 1], box)) return true;
    }
  }
  return false;
}

const AROUND_GUTTER = 16;
const AROUND_STUB = 12;
/** Зазор между линией и рамкой при обходе по сетке. */
const GRID_CLEAR = 5;

/**
 * Обход препятствий по сетке ортогональных коридоров.
 * Кандидаты осей — края препятствий плюс отступ; лишние повороты штрафуются,
 * чтобы путь шёл по ближайшему коридору, а не змейкой.
 */
function routeOnGrid(
  start: RoutePoint,
  end: RoutePoint,
  obstacles: readonly CardBox[],
  fromBox: CardBox,
  toBox: CardBox,
  lane = 0,
): RoutePoint[] {
  // Каждой связи свой коридор: иначе две стрелки сливаются в одну линию.
  const pad = AROUND_STUB + (lane % 3) * 7;
  // Препятствия чуть раздуты: путь не должен идти по самому краю рамки.
  const grown = obstacles.map((box) => ({
    left: box.left - GRID_CLEAR,
    right: box.right + GRID_CLEAR,
    top: box.top - GRID_CLEAR,
    bottom: box.bottom + GRID_CLEAR,
  }));
  const xs = new Set<number>([start.x, end.x]);
  const ys = new Set<number>([start.y, end.y]);
  for (const box of grown) {
    xs.add(box.left - pad);
    xs.add(box.right + pad);
    ys.add(box.top - pad);
    ys.add(box.bottom + pad);
  }
  const xsList = [...xs].sort((left, right) => left - right);
  const ysList = [...ys].sort((left, right) => left - right);
  const cols = xsList.length;
  const rows = ysList.length;
  const indexOf = (x: number, y: number) =>
    ysList.findIndex((value) => Math.abs(value - y) < 0.01) * cols +
    xsList.findIndex((value) => Math.abs(value - x) < 0.01);
  const startI = indexOf(start.x, start.y);
  const endI = indexOf(end.x, end.y);

  const free = (a: number, b: number): boolean =>
    !pathHitsCards(
      [
        { x: xsList[a % cols], y: ysList[Math.floor(a / cols)] },
        { x: xsList[b % cols], y: ysList[Math.floor(b / cols)] },
      ],
      grown,
    );

  const key = (node: number, dir: number) => node * 2 + dir;
  const best = new Map<number, { cost: number; prevNode: number; prevDir: number }>();
  const frontier: { node: number; dir: number; cost: number; prevNode: number; prevDir: number }[] = [
    { node: startI, dir: 0, cost: 0, prevNode: -1, prevDir: -1 },
    { node: startI, dir: 1, cost: 0, prevNode: -1, prevDir: -1 },
  ];
  for (let guard = 0; frontier.length > 0 && guard < 20000; guard += 1) {
    frontier.sort((left, right) => left.cost - right.cost);
    const item = frontier.shift()!;
    const id = key(item.node, item.dir);
    if (best.has(id)) continue;
    best.set(id, { cost: item.cost, prevNode: item.prevNode, prevDir: item.prevDir });
    const col = item.node % cols;
    const row = Math.floor(item.node / cols);
    const neighbours: { node: number; dir: number; len: number }[] = [];
    if (col > 0) neighbours.push({ node: item.node - 1, dir: 0, len: xsList[col] - xsList[col - 1] });
    if (col + 1 < cols) neighbours.push({ node: item.node + 1, dir: 0, len: xsList[col + 1] - xsList[col] });
    if (row > 0) neighbours.push({ node: item.node - cols, dir: 1, len: ysList[row] - ysList[row - 1] });
    if (row + 1 < rows) neighbours.push({ node: item.node + cols, dir: 1, len: ysList[row + 1] - ysList[row] });
    for (const next of neighbours) {
      if (!free(item.node, next.node)) continue;
      const turn = next.dir === item.dir ? 0 : AROUND_GUTTER * 2;
      frontier.push({
        node: next.node,
        dir: next.dir,
        cost: item.cost + next.len + turn,
        prevNode: item.node,
        prevDir: item.dir,
      });
    }
  }

  const finish = [0, 1]
    .map((dir) => ({ dir, entry: best.get(key(endI, dir)) }))
    .filter((item): item is { dir: number; entry: { cost: number; prevNode: number; prevDir: number } } => Boolean(item.entry))
    .sort((left, right) => left.entry.cost - right.entry.cost)[0];
  if (!finish) return straightFallback(start, end, fromBox, toBox);

  const chain: number[] = [];
  let node = endI;
  let dir = finish.dir;
  for (let guard = 0; guard < 400; guard += 1) {
    chain.push(node);
    const entry = best.get(key(node, dir));
    if (!entry || entry.prevNode < 0) break;
    node = entry.prevNode;
    dir = entry.prevDir;
  }
  const raw = chain.reverse().map((index) => ({
    x: xsList[index % cols],
    y: ysList[Math.floor(index / cols)],
  }));
  const points = dedupePoints(raw);
  if (points.length < 2) return straightFallback(start, end, fromBox, toBox);
  // Концы подрезаем по краю своих карточек: линия не должна уходить внутрь.
  points[0] = clipToBoxEdge(points[0], points[1], fromBox);
  points[points.length - 1] = clipToBoxEdge(points[points.length - 1], points[points.length - 2], toBox);
  return dedupePoints(trimInsideBoxes(points, fromBox, toBox));
}

/** Если коридоров не нашлось: простая шина между карточками. */
function straightFallback(start: RoutePoint, end: RoutePoint, fromBox: CardBox, toBox: CardBox): RoutePoint[] {
  const midY = (Math.max(fromBox.bottom, toBox.bottom) + 20);
  return dedupePoints([
    { x: start.x, y: fromBox.bottom },
    { x: start.x, y: midY },
    { x: end.x, y: midY },
    { x: end.x, y: toBox.bottom },
  ]);
}

/** Точка на краю рамки по направлению к соседней точке. */
function clipToBoxEdge(point: RoutePoint, next: RoutePoint, box: CardBox): RoutePoint {
  if (Math.abs(next.x - point.x) < 0.6 && Math.abs(next.y - point.y) > 0.6) {
    return { x: point.x, y: next.y > point.y ? box.bottom : box.top };
  }
  if (Math.abs(next.y - point.y) < 0.6 && Math.abs(next.x - point.x) > 0.6) {
    return { x: next.x > point.x ? box.right : box.left, y: point.y };
  }
  return point;
}

/**
 * Сетка коридоров идёт до центра карточки, поэтому последний участок может
 * заходить внутрь своей рамки. Выбрасываем точки, оказавшиеся внутри концов:
 * путь остаётся ортогональным (подрезка сохраняет ось последнего сегмента).
 */
function trimInsideBoxes(points: readonly RoutePoint[], fromBox: CardBox, toBox: CardBox): RoutePoint[] {
  const inside = (point: RoutePoint, box: CardBox): boolean =>
    point.x > box.left + 0.5 &&
    point.x < box.right - 0.5 &&
    point.y > box.top + 0.5 &&
    point.y < box.bottom - 0.5;
  const last = points.length - 1;
  const kept: RoutePoint[] = [];
  points.forEach((point, index) => {
    if (index > 0 && index < last && (inside(point, fromBox) || inside(point, toBox))) return;
    kept.push(point);
  });
  return kept;
}

/** Отчёты между командами: как стрелки влияния, но цветом оси и без подписи. */
function routeCrossReports(
  placed: readonly PlacedTreeNode<PowerPerson>[],
  edges: readonly PowerReportEdge[],
  offsetX: number,
  offsetY: number,
  boxes: readonly TeamBox[],
  membership: Map<string, string>,
  axis: string,
): RoutedInfluence[] {
  const byId = new Map(placed.map((card) => [card.node.id, card]));
  const out: RoutedInfluence[] = [];
  edges.forEach((edge, index) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return;
    const fromBox = cardBox(from, offsetX, offsetY);
    const toBox = cardBox(to, offsetX, offsetY);
    const down = toBox.top >= fromBox.bottom - 1;
    const up = toBox.bottom <= fromBox.top + 1;
    const x1 = contactX(from, offsetX, 0, 1);
    const x2 = contactX(to, offsetX, 0, 1);
    let y1 = fromBox.bottom;
    let y2 = toBox.top;
    let midY = (y1 + y2) / 2;
    if (up) {
      y1 = fromBox.top;
      y2 = toBox.bottom;
      midY = (y1 + y2) / 2;
    } else if (!down) {
      y1 = fromBox.bottom;
      y2 = toBox.bottom;
      midY = Math.max(y1, y2) + 18;
    }
    const obstacles = [
      ...placed
        .filter((card) => card.node.id !== edge.from && card.node.id !== edge.to)
        .map((card) => cardBox(card, offsetX, offsetY)),
      ...foreignTeamBoxes(boxes, membership, edge.from, edge.to, offsetX, offsetY),
    ];
    const elbow = elbowPoints(x1, y1, x2, y2, midY);
    let points: RoutePoint[] = pathHitsCards(elbow, obstacles)
      ? routeOnGrid(
          { x: (fromBox.left + fromBox.right) / 2, y: (fromBox.top + fromBox.bottom) / 2 },
          { x: (toBox.left + toBox.right) / 2, y: (toBox.top + toBox.bottom) / 2 },
          obstacles,
          fromBox,
          toBox,
          index,
        )
      : elbow;
    if (points.length >= 2) {
      points[0] = clipToNearEdge(points[0], points[1], fromBox);
      points[points.length - 1] = clipToNearEdge(points[points.length - 1], points[points.length - 2], toBox);
    }
    if (pathHitsCards(points, [fromBox, toBox])) {
      const routed = routeAvoiding(
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        obstacles,
        { startBox: fromBox, endBox: toBox },
      );
      if (routed) {
        const shaped = dedupePoints(routed);
        if (!pathHitsCards(shaped, [fromBox, toBox])) points = shaped;
      }
    }
    out.push({
      points,
      color: axis,
      dash: edge.style === "dotted" ? "4 4" : undefined,
      width: 1.2,
      labelX: 0,
      labelY: 0,
      minX: 0,
      maxX: 0,
      fromId: edge.from,
      toId: edge.to,
    });
  });
  return out;
}

/**
 * Финальный ремонт уже разложенных связей. `spreadContacts` и `clearEdgeJogs`
 * двигают концы и полки независимо, поэтому линия может вернуться в карточку
 * (в свою или чужую). Здесь путь проверяется целиком и при пересечении
 * перекладывается страховочным роутером.
 */
function repairRoutes(
  routes: readonly { points: RoutePoint[]; fromId?: string; toId?: string }[],
  cards: readonly CardBox[],
  byId: ReadonlyMap<string, number>,
): number {
  let repaired = 0;
  for (const route of routes) {
    if (route.points.length < 2) continue;
    const fromIndex = route.fromId === undefined ? undefined : byId.get(route.fromId);
    const toIndex = route.toId === undefined ? undefined : byId.get(route.toId);
    const fromBox = fromIndex === undefined ? undefined : cards[fromIndex];
    const toBox = toIndex === undefined ? undefined : cards[toIndex];
    const own = [fromBox, toBox].filter((box): box is CardBox => box !== undefined);
    if (fromBox && toBox) {
      route.points[0] = clipToNearEdge(route.points[0], route.points[1], fromBox);
      const last = route.points.length - 1;
      route.points[last] = clipToNearEdge(route.points[last], route.points[last - 1], toBox);
    }
    const obstacles = cards.filter((_, index) => index !== fromIndex && index !== toIndex);
    const fixed = repairLanePath(route.points, obstacles, own);
    if (!fixed) continue;
    route.points = dedupePoints(fixed);
    repaired += 1;
  }
  return repaired;
}

function labelAnchor(points: readonly RoutePoint[]): RoutePoint {
  let best = 0;
  let x = points[0]?.x ?? 0;
  let y = points[0]?.y ?? 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    if (Math.abs(a.y - b.y) > 0.4) continue;
    const span = Math.abs(a.x - b.x);
    if (span < best) continue;
    best = span;
    x = (a.x + b.x) / 2;
    y = a.y;
  }
  return { x, y: y - 4 };
}

function chipFill(color: string, mono: boolean, invert: boolean, index: number): string {
  if (!mono) return color;
  return monoGray(index, 6, invert);
}

/** Явный перенос в поле counterpart: `<br>` или `\n` из исходника. */
const COUNTER_BREAK = /<br\s*\/?>|\\n|\r?\n/gi;

interface CounterChunk {
  text: string;
  /** Разделитель, стоявший после имени: `,` или `;`. */
  sep: "," | ";" | "";
}

/**
 * Имена counterpart по строкам исходника: явные переносы (`<br>`, `\n`) делят
 * текст на группы, внутри группы имена разделены запятой или точкой с запятой.
 */
function counterpartGroups(raw: string): CounterChunk[][] {
  const src = String(raw ?? "").trim();
  if (!src || src === "-") return [];
  const groups: CounterChunk[][] = [];
  // Повтор того же имени (регистр не важен) и заглушка `-` второй раз не нужны.
  const seen = new Set<string>();
  for (const block of src.split(COUNTER_BREAK)) {
    const chunks: CounterChunk[] = [];
    const parts = block.split(/([,;])/);
    for (let index = 0; index < parts.length; index += 2) {
      const text = (parts[index] ?? "").trim();
      const sep = (parts[index + 1] ?? "").trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (key === "-" || key === "—" || seen.has(key)) continue;
      seen.add(key);
      chunks.push({ text, sep: sep === ";" ? ";" : sep === "," ? "," : "" });
    }
    if (chunks.length > 0) groups.push(chunks);
  }
  return groups;
}

/** Плоский список имён counterpart — для ширины карточки. */
function counterpartNames(raw: string): string[] {
  return counterpartGroups(raw).flatMap((group) => group.map((chunk) => chunk.text));
}

/**
 * Строки поля counterpart. Явный перенос начинает новую строку, внутри группы
 * имена пакуются, пока влезают; иначе имя уезжает на следующую строку.
 */
function counterpartLines(raw: string, maxWidth: number): string[] {
  const groups = counterpartGroups(raw);
  if (groups.length === 0) return ["-"];
  const limit = Math.max(24, maxWidth);
  const lines: string[] = [];
  for (const group of groups) {
    let line = "";
    for (let index = 0; index < group.length; index += 1) {
      const item = group[index];
      const sep = index > 0 ? group[index - 1].sep || "," : "";
      const piece = sep ? `${sep} ${item.text}` : item.text;
      const candidate = line + piece;
      if (!line || measureText(candidate, TITLE_FONT) <= limit) {
        line = candidate;
        continue;
      }
      lines.push(line.replace(/[,;]\s*$/, ""));
      line = item.text;
    }
    if (line) lines.push(line.replace(/[,;]\s*$/, ""));
  }
  return lines.length > 0 ? lines : ["-"];
}

/** Высота поля counterpart: одна строка — как раньше, дальше шаг на строку. */
function counterBandHeight(lineCount: number): number {
  return COUNTER_H + Math.max(0, lineCount - 1) * COUNTER_LINE;
}

interface CardBase {
  width: number;
  /** Высота без поля counterpart и без нижнего отступа. */
  height: number;
  titleLines: string[];
  /** Ширина области поля counterpart под текст. */
  inner: number;
}

/**
 * Габариты карточки без поля counterpart. Ширину задаёт самое длинное имя
 * counterpart, а не весь список: длинный список переносится по строкам.
 */
function cardBase(person: PowerPerson, framePx: number): CardBase {
  const titleLines = person.title ? splitLabelLines(person.title) : [];
  const slot = avatarBoxSize(framePx, person);
  const names = counterpartNames(person.counterpart);
  const counterW =
    (names.length > 0
      ? names.reduce((max, name) => Math.max(max, measureText(name, TITLE_FONT)), 0)
      : measureText("-", TITLE_FONT)) +
    COUNTER_PAD * 2;
  const textW = Math.max(measureText(person.name, NAME_FONT), ...titleLines.map((line) => measureText(line, TITLE_FONT)), counterW, 4 * 22);
  const width = Math.max(CARD_MIN_WIDTH, textW + CARD_PAD_X * 2, slot + CARD_PAD_X * 2);
  let height = CARD_PAD_Y;
  if (slot > 0) height += slot + CARD_GAP;
  height += LINE_HEIGHT;
  height += titleLines.length * LINE_HEIGHT;
  height += CARD_GAP + CHIP_H;
  return { width, titleLines, height, inner: width - CARD_PAD_X * 2 - COUNTER_PAD * 2 };
}

interface CardMeasure {
  width: number;
  height: number;
  titleLines: string[];
  /** Высота поля counterpart у этой карточки. */
  band: number;
}

function measureCard(person: PowerPerson, framePx: number, minBand = 0): CardMeasure {
  const base = cardBase(person, framePx);
  const own = counterBandHeight(counterpartLines(person.counterpart, base.inner).length);
  const band = Math.max(own, minBand);
  return { width: base.width, height: base.height + band + CARD_PAD_Y, titleLines: base.titleLines, band };
}


const COMMS_FONT = 11;
const COMMS_LINE = 16;
const COMMS_PAD_Y = 6;
/** Подпись команды над её таблицей. */
const COMMS_CAPTION_FONT = 11;
const COMMS_CAPTION_LINE = 18;
const COMMS_GROUP_GAP = 14;
/** Заголовок блока таблиц: «Компания …» — над первой таблицей, не колонка. */
const COMMS_TITLE_FONT = 13;
const COMMS_TITLE_LINE = 20;

interface CommsRow {
  name: string;
  /** Прямые руководители из дерева подчинения. */
  manager: string[];
  contacts: string[];
  links: string[];
}

function compareAlpha(a: string, b: string): number {
  return a.localeCompare(b, "ru", { sensitivity: "base" });
}

function uniqueFold(values: string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const value of values) {
    const key = value.toLocaleLowerCase("ru");
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(value);
  }
  return kept.sort(compareAlpha);
}

function contactLines(raw: string): string[] {
  return uniqueFold(
    raw
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && part !== "-"),
  );
}

function linkCaption(model: PowerModel, name: string): string {
  const link = resolveLink(model, name);
  const label = link.label.trim();
  if (label && label.toLocaleLowerCase("ru") !== link.name.toLocaleLowerCase("ru")) {
    return `${link.name} — ${label}`;
  }
  return link.name;
}

function personName(model: PowerModel, id: string): string {
  return model.people.find((person) => person.id === id)?.name ?? id;
}

/** Прямые руководители: стрелка подчинения идёт от руководителя, поэтому to — подчинённый. */
function managerNames(model: PowerModel): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of model.reports) {
    const names = map.get(edge.to) ?? [];
    const name = personName(model, edge.from);
    const key = name.toLocaleLowerCase("ru");
    if (!names.some((known) => known.toLocaleLowerCase("ru") === key)) names.push(name);
    map.set(edge.to, names);
  }
  return map;
}

/** Команды для таблицы: порядок объявления, подписи и принадлежность людей. */
interface CommsTeams {
  order: string[];
  labels: Map<string, string>;
  member: Map<string, string>;
}

function commsTeams(model: PowerModel): CommsTeams | null {
  if (model.teams.length === 0) return null;
  const labels = new Map<string, string>();
  const order: string[] = [];
  for (const team of model.teams) {
    labels.set(team.id, team.title.trim() || team.id);
    order.push(team.id);
  }
  return { order, labels, member: powermapMembership(model) };
}

/** Направление от человека в строке таблицы: исходящая, входящая или в обе стороны. */
function linkLines(
  model: PowerModel,
  personId: string,
  locale: AppLocale,
  teams: CommsTeams | null,
): string[] {
  const ownTeam = teams?.member.get(personId);
  /** Связь из другой команды помечается её названием. */
  const teamSuffix = (otherId: string): string => {
    if (!teams || !ownTeam) return "";
    const otherTeam = teams.member.get(otherId);
    if (!otherTeam || otherTeam === ownTeam) return "";
    const label =
      otherTeam === TEAM_UNGROUPED
        ? legendText("teamless", locale)
        : teams.labels.get(otherTeam) ?? otherTeam;
    return ` (${label})`;
  };
  const captions: string[] = [];
  for (const edge of model.influences) {
    if (edge.from !== personId && edge.to !== personId) continue;
    const otherId = edge.from === personId ? edge.to : edge.from;
    const arrow = edge.both ? "↔" : edge.from === personId ? "→" : "←";
    const caption = linkCaption(model, edge.name);
    const other = `${personName(model, otherId)}${teamSuffix(otherId)}`;
    if (edge.label?.trim() && hasLabelBreak(edge.label)) {
      // Многострочная подпись: только первая строка с многоточием.
      const first = splitLabelLines(edge.label)[0] ?? "";
      captions.push(`${arrow} ${other}: ${caption} — ${first}…`);
    } else {
      const detail = edge.label?.trim() ? `${caption} — ${edge.label.trim()}` : caption;
      captions.push(`${arrow} ${other}: ${detail}`);
    }
  }
  return uniqueFold(captions);
}

interface CommsTable {
  width: number;
  height: number;
  headers: readonly [string, string, string, string];
  columns: number[];
  pads: readonly [number, number, number, number];
  rows: CommsRow[];
  headerHeight: number;
  rowHeights: number[];
}

/** Таблица одной команды: своя подпись, свои ширины колонок. */
interface CommsGroup {
  caption: string;
  table: CommsTable;
}

interface CommsBlock {
  width: number;
  height: number;
  /** Заголовок таблицы: «Компания …» — не колонка. */
  title: string;
  groups: CommsGroup[];
}

/** Заголовок жирный, measureText этого не видит. Колонка связей ещё и с запасом, чтобы текст не обрезался. */
const COMMS_HEADER_BOLD = 1.12;
const COMMS_LINK_SLACK = 1.15;
const COMMS_PADS = [16, 12, 8, 8] as const;

function measureCommsTable(
  rows: CommsRow[],
  headers: readonly [string, string, string, string],
): CommsTable {
  const cells = (row: CommsRow): string[][] => [
    [row.name],
    row.manager,
    row.contacts,
    row.links,
  ];
  const columns = headers.map((header, index) => {
    const slack = index === 3 ? COMMS_LINK_SLACK : 1;
    const widest = rows.reduce((max, row) => {
      const lines = cells(row)[index];
      return Math.max(max, ...lines.map((line) => measureText(line, COMMS_FONT) * slack), 0);
    }, measureText(header, COMMS_FONT) * COMMS_HEADER_BOLD);
    return widest + COMMS_PADS[index] * 2;
  });
  const headerHeight = COMMS_LINE + COMMS_PAD_Y * 2;
  const rowHeights = rows.map((row) => {
    const lines = Math.max(1, row.manager.length, row.contacts.length, row.links.length);
    return lines * COMMS_LINE + COMMS_PAD_Y * 2;
  });
  return {
    width: columns.reduce((sum, width) => sum + width, 0),
    height: headerHeight + rowHeights.reduce((sum, height) => sum + height, 0),
    headers,
    columns,
    pads: COMMS_PADS,
    rows,
    headerHeight,
    rowHeights,
  };
}

function measureComms(model: PowerModel, locale: AppLocale): CommsBlock {
  const companyWord = legendText("companyWord", locale);
  const companyName = model.company?.trim();
  const title = companyName ? `${companyWord} ${companyName}` : companyWord;
  const headers = [
    legendText("employee", locale),
    legendText("manager", locale),
    legendText("contacts", locale),
    legendText("links", locale),
  ] as const;
  const teams = commsTeams(model);
  const managers = managerNames(model);
  const entries = model.people.map((person) => ({
    id: person.id,
    row: {
      name: person.name,
      manager: managers.get(person.id) ?? ["-"],
      contacts: contactLines(person.counterpart),
      links: linkLines(model, person.id, locale, teams),
    },
  }));
  const byName = (a: { row: CommsRow }, b: { row: CommsRow }) => compareAlpha(a.row.name, b.row.name);

  const groups: { caption: string; rows: CommsRow[] }[] = [];
  if (!teams) {
    groups.push({ caption: "", rows: [...entries].sort(byName).map((entry) => entry.row) });
  } else {
    for (const teamId of teams.order) {
      const rows = entries
        .filter((entry) => teams.member.get(entry.id) === teamId)
        .sort(byName)
        .map((entry) => entry.row);
      if (rows.length > 0) groups.push({ caption: teams.labels.get(teamId) ?? teamId, rows });
    }
    const ungrouped = entries
      .filter((entry) => teams.member.get(entry.id) === TEAM_UNGROUPED)
      .sort(byName)
      .map((entry) => entry.row);
    if (ungrouped.length > 0) groups.push({ caption: legendText("teamless", locale), rows: ungrouped });
  }

  const measured: CommsGroup[] = groups.map((group) => ({
    caption: group.caption,
    table: measureCommsTable(group.rows, headers),
  }));
  let height = COMMS_TITLE_LINE;
  const titleWidth = measureText(title, COMMS_TITLE_FONT) * COMMS_HEADER_BOLD;
  let width = titleWidth;
  measured.forEach((group, index) => {
    if (index > 0) height += COMMS_GROUP_GAP;
    if (group.caption) height += COMMS_CAPTION_LINE;
    height += group.table.height;
    const captionWidth = group.caption
      ? measureText(group.caption, COMMS_CAPTION_FONT) * COMMS_HEADER_BOLD
      : 0;
    width = Math.max(width, group.table.width, captionWidth);
  });
  return { width, height, title, groups: measured };
}

function commsHeaderFill(dark: boolean): string {
  return dark ? "#2a3036" : "#f6f8fa";
}

function drawCommsTable(
  svg: ReturnType<typeof createSvg>,
  x: number,
  y: number,
  table: CommsTable,
  fg: string,
  bg: string,
  dark: boolean,
): void {
  svg.rect(x, y, table.width, table.height, {
    fill: bg,
    stroke: CHIP_STROKE,
    "stroke-width": 1,
    rx: 4,
    "data-comms": "powermap",
  });
  svg.rect(x + 1, y + 1, Math.max(0, table.width - 2), Math.max(0, table.headerHeight - 1), {
    fill: commsHeaderFill(dark),
    rx: 3,
    "data-comms-header": "powermap",
  });
  let cursor = x;
  table.headers.forEach((header, index) => {
    svg.text(cursor + table.pads[index], y + COMMS_PAD_Y + 12, header, {
      "font-size": COMMS_FONT,
      "font-weight": 700,
      fill: fg,
      "text-anchor": "start",
    });
    cursor += table.columns[index];
  });
  let ruleX = x;
  for (let index = 0; index < table.columns.length - 1; index += 1) {
    ruleX += table.columns[index];
    svg.line(ruleX, y, ruleX, y + table.height, { stroke: CHIP_STROKE, "stroke-width": 1 });
  }
  let rowY = y + table.headerHeight;
  svg.line(x, rowY, x + table.width, rowY, { stroke: CHIP_STROKE, "stroke-width": 1 });
  table.rows.forEach((row, rowIndex) => {
    const groups = [[row.name], row.manager, row.contacts, row.links];
    let cellX = x;
    groups.forEach((lines, index) => {
      lines.forEach((line, lineIndex) => {
        svg.text(cellX + table.pads[index], rowY + COMMS_PAD_Y + 12 + lineIndex * COMMS_LINE, line, {
          "font-size": COMMS_FONT,
          fill: fg,
          "text-anchor": "start",
        });
      });
      cellX += table.columns[index];
    });
    rowY += table.rowHeights[rowIndex];
    if (rowIndex < table.rows.length - 1) {
      svg.line(x, rowY, x + table.width, rowY, { stroke: CHIP_STROKE, "stroke-width": 1 });
    }
  });
}

/** Таблица коммуникаций: при наличии команд — отдельная таблица на каждую. */
function drawComms(
  svg: ReturnType<typeof createSvg>,
  x: number,
  y: number,
  block: CommsBlock,
  fg: string,
  bg: string,
  dark: boolean,
): void {
  let cursorY = y;
  if (block.title) {
    svg.text(x, cursorY + 14, block.title, {
      "font-size": COMMS_TITLE_FONT,
      "font-weight": 700,
      fill: fg,
      "text-anchor": "start",
      "data-comms-title": "powermap",
    });
    cursorY += COMMS_TITLE_LINE;
  }
  block.groups.forEach((group, index) => {
    if (index > 0) cursorY += COMMS_GROUP_GAP;
    if (group.caption) {
      svg.text(x, cursorY + 12, group.caption, {
        "font-size": COMMS_CAPTION_FONT,
        "font-weight": 700,
        fill: fg,
        "text-anchor": "start",
        "data-comms-team": "powermap",
      });
      cursorY += COMMS_CAPTION_LINE;
    }
    drawCommsTable(svg, x, cursorY, group.table, fg, bg, dark);
    cursorY += group.table.height;
  });
}

export function renderPowermap(model: PowerModel, options: ExtRenderOptions): string {
  const themeDark = Boolean(options.dark) || usesInvertedMono(model.mono, model.monoInvert, false);
  const invertedMono = usesInvertedMono(model.mono, model.monoInvert, options.dark);
  const palette = getPalette(themeDark);
  const mono = Boolean(model.mono);
  const gapBelow = rankGapBelow(model);

  const measureAll = (bandOf?: ReadonlyMap<string, number>): Map<string, CardMeasure> => {
    const boxes = new Map<string, CardMeasure>();
    for (const person of model.people) {
      boxes.set(person.id, measureCard(person, model.avatarSize, bandOf?.get(person.id) ?? 0));
    }
    return boxes;
  };
  const buildLayout = (boxes: Map<string, CardMeasure>) => {
    const team = model.teams.length > 0 ? layoutTeams(model, boxes, gapBelow) : null;
    const tree = team
      ? { placed: team.placed, width: team.width, height: team.height }
      : layoutOrgTree(
          model.people,
          model.reports,
          model.virtualRoot,
          model.root,
          (person) => {
            const box = boxes.get(person.id)!;
            return { lines: [person.name], width: box.width, height: box.height };
          },
          gapBelow,
        );
    return { team, laid: tree };
  };

  // Первый проход — своя высота поля counterpart; второй — выравниваем поле
  // по самому высокому в ряду, чтобы ряд карточек выглядел симметрично.
  let measured = measureAll();
  let built = buildLayout(measured);
  const rowBand = new Map<string, number>();
  for (const card of built.laid.placed) {
    const key = `${card.y}`;
    rowBand.set(key, Math.max(rowBand.get(key) ?? 0, measured.get(card.node.id)?.band ?? 0));
  }
  const rowTarget = new Map<string, number>();
  for (const card of built.laid.placed) {
    const own = measured.get(card.node.id);
    const target = rowBand.get(`${card.y}`) ?? 0;
    if (own && target > own.band) rowTarget.set(card.node.id, target);
  }
  if (rowTarget.size > 0) {
    measured = measureAll(rowTarget);
    built = buildLayout(measured);
  }
  const teamLayout = built.team;
  const laid = built.laid;
  const teamBoxes = teamLayout?.boxes ?? [];
  const membership = teamLayout ? powermapMembership(model) : undefined;
  const intraReports = teamLayout ? teamLayout.localReports : model.reports;
  const locale = legendLocale(model, options);
  const legend = measureLegend(model, locale);
  const comms = model.comms ? measureComms(model, locale) : null;
  const titleLines = model.title ? (hasLabelBreak(model.title) ? splitLabelLines(model.title) : [model.title]) : [];
  const companyLines = model.company ? [model.company] : [];
  const titleBlock =
    (titleLines.length > 0 ? 22 + (titleLines.length - 1) * labelLineStep(15) : 0) +
    (companyLines.length > 0 ? 18 : 0);
  const headerH = Math.max(titleBlock + HEADER_PAD, titleLines.length || companyLines.length ? 36 : 16);

  let width = 24 + laid.width + 24;
  let height = headerH + laid.height + 28;
  if (legend) width = Math.max(width, 24 + legend.width + 24);
  if (comms) width = Math.max(width, 24 + comms.width + 24);
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

  let offsetX = 24 + padX / 2;
  const offsetY = headerH + padY / 2;
  const treeBottom = offsetY + laid.height;
  let routed = routeInfluences(
    laid.placed,
    model,
    offsetX,
    offsetY,
    treeBottom,
    mono,
    invertedMono,
    teamLayout && membership
      ? {
          boxes: teamBoxes,
          membership,
          localReports: intraReports,
          crossReports: teamLayout.crossReports,
          axis: palette.axis,
        }
      : undefined,
  );
  const routeXs = routed.routes.flatMap((route) => route.points.map((point) => point.x));
  if (routeXs.length > 0) {
    const extraLeft = Math.max(0, 8 - Math.min(...routeXs));
    const extraRight = Math.max(0, Math.max(...routeXs) - (width - 8));
    if (extraLeft > 0 || extraRight > 0) {
      offsetX += extraLeft;
      width += extraLeft + extraRight;
      routed = routeInfluences(
        laid.placed,
        model,
        offsetX,
        offsetY,
        treeBottom,
        mono,
        invertedMono,
        teamLayout && membership
          ? {
              boxes: teamBoxes,
              membership,
              localReports: intraReports,
              crossReports: teamLayout.crossReports,
              axis: palette.axis,
            }
          : undefined,
      );
    }
  }
  const legendBlock = legend ? 12 + legend.height + 8 : 0;
  const commsBlock = comms ? 12 + comms.height + 8 : 0;
  height = treeBottom + Math.max(20, 12 + routed.overflow + legendBlock + commsBlock);
  const legendY = treeBottom + routed.overflow + 12;
  const commsY = legend ? legendY + legend.height + 12 : legendY;

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
    background: model.monoInvert ? true : false,
    xlink: model.people.some((person) => Boolean(person.photo)),
  });
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

  if (comms) {
    drawComms(svg, 24, commsY, comms, palette.fg, palette.bg, themeDark);
  }

  const marker = arrowMarker(palette, "ext-pm-report");
  svg.raw(marker.markup);
  const placed: PlacedTreeNode<PowerPerson>[] = laid.placed;
  if (teamBoxes.length > 0) drawTeamBoxes(svg, teamBoxes, offsetX, offsetY, palette, mono, invertedMono);
  drawReportingElbows(svg, placed, intraReports, offsetX, offsetY, palette.axis, marker.ref);

  placed.forEach((card, cardIndex) => {
    drawCard(svg, card, offsetX, offsetY, model, palette.bg, palette.fg, palette.axis, mono, invertedMono, cardIndex);
  });

  routed.routes.forEach((route, index) => {
    const arrow = arrowMarker(palette, `ext-pm-link-${index}`, route.color);
    svg.raw(arrow.markup);
    const d = route.points
      .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${fmt(point.x)} ${fmt(point.y)}`)
      .join(" ");
    svg.path(d, {
      fill: "none",
      stroke: route.color,
      "stroke-width": route.width,
      "marker-end": arrow.ref,
      ...(route.both ? { "marker-start": arrow.ref } : {}),
      ...(route.dash ? { "stroke-dasharray": route.dash } : {}),
    });
  });
  routed.routes.forEach((route) => {
    if (!route.label) return;
    const lineCount = labelLineCount(route.label);
    const step = labelLineStep(EDGE_LABEL_FONT);
    const plateWidth = measureLabelWidth(route.label, EDGE_LABEL_FONT) + 10;
    // Однострочная плашка — ровно прежняя высота (14), golden не меняется.
    // Многострочная растёт на шаг строки за каждую дополнительную строку.
    const plateHeight = EDGE_LABEL_BAND + Math.max(0, lineCount - 1) * step;
    const plateY = route.labelY - (EDGE_LABEL_BAND - 2) - ((lineCount - 1) * step) / 2;
    const textY = route.labelY;
    const plateX = route.labelX - plateWidth / 2;
    svg.rect(plateX, plateY, plateWidth, plateHeight, {
      fill: labelPlateFill(
        route.labelX,
        route.labelY,
        palette.bg,
        teamBoxes,
        offsetX,
        offsetY,
        mono,
        invertedMono,
      ),
      stroke: "none",
      "data-label-plate": "1",
    });
    drawLabelLines(
      svg,
      route.labelX,
      textY,
      route.label,
      EDGE_LABEL_FONT,
      { fill: route.color, "data-edge-label": "1" },
      "center",
    );
  });

  if (legend) {
    drawLegend(svg, 24, legendY, legend, palette.fg, palette.bg, mono, invertedMono);
  }

  return svg.toString();
}

/** Заливка плашки подписи: тот же цвет, что уже нарисован под ней. */
function labelPlateFill(
  x: number,
  y: number,
  canvas: string,
  boxes: readonly TeamBox[],
  offsetX: number,
  offsetY: number,
  mono: boolean,
  invert: boolean,
): string {
  let paint: string | undefined;
  let opacity = 0;
  for (const box of boxes) {
    if (box.ghost || box.frame === false || box.fill === "none") continue;
    const left = offsetX + box.x;
    const top = offsetY + box.y;
    if (x < left || x > left + box.width || y < top || y > top + box.height) continue;
    const raw = box.fill ?? canvas;
    paint = mono ? monoPaint(raw, invert) : raw;
    opacity = box.fill ? 0.55 : 0.35;
  }
  if (!paint || opacity <= 0) return canvas;
  return blendOver(canvas, paint, opacity);
}

function blendOver(base: string, paint: string, opacity: number): string {
  const bg = parseHexColor(base);
  const fg = parseHexColor(paint);
  if (!bg || !fg) return base;
  const mix = (from: number, to: number) => Math.round(from * (1 - opacity) + to * opacity);
  const channel = (value: number) => value.toString(16).padStart(2, "0");
  return `#${channel(mix(bg.r, fg.r))}${channel(mix(bg.g, fg.g))}${channel(mix(bg.b, fg.b))}`;
}

function drawLegend(
  svg: ReturnType<typeof createSvg>,
  x: number,
  y: number,
  legend: LegendBox,
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
    "data-legend": "powermap",
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
      const rowY = y + 22 + index * LEGEND_ROW;
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
        svg.text(cursor + SWATCH + 4, rowY + 10, row.name, {
          "font-size": LEGEND_FONT,
          fill: fg,
          "text-anchor": "start",
        });
      }
    });
    cursor += legendColumnWidth(column) + LEGEND_GAP;
  }
  if (legend.linkLines.length === 0) return;
  const linksTop = y + legend.scalesHeight;
  svg.text(x + LEGEND_PAD, linksTop + 12, legend.linksTitle, {
    "font-size": LEGEND_TITLE,
    "font-weight": 700,
    fill: fg,
    "text-anchor": "start",
  });
  const linkCount = legend.linkLines.reduce((sum, line) => sum + line.length, 0);
  let drawn = 0;
  legend.linkLines.forEach((line, lineIndex) => {
    const rowY = linksTop + 18 + lineIndex * LEGEND_ROW;
    let cursor = x + LEGEND_PAD;
    line.forEach((link, index) => {
      const color = mono ? monoGray(drawn, Math.max(linkCount, 2), invert) : link.color;
      drawn += 1;
      const dash = STROKE_DASH[link.style];
      svg.line(cursor, rowY, cursor + LEGEND_LINK_SAMPLE, rowY, {
        stroke: color,
        "stroke-width": Math.max(1.4, link.width),
        ...(dash ? { "stroke-dasharray": dash } : {}),
      });
      svg.text(cursor + LEGEND_LINK_SAMPLE + LEGEND_LINK_GAP, rowY + 3, link.label, {
        "font-size": LEGEND_FONT,
        fill: fg,
        "text-anchor": "start",
      });
      cursor += legendLinkItemWidth(link.label);
      if (index < line.length - 1) cursor += LEGEND_GAP;
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
  const base = cardBase(person, model.avatarSize);
  const band = Math.max(COUNTER_H, card.height - base.height - CARD_PAD_Y);
  const bandTop = y + card.height - CARD_PAD_Y - band;
  const counterFill = mono ? monoGray(4, 6, invert) : COUNTERPART_COLOR;
  svg.rect(x + CARD_PAD_X, bandTop, inner, band, { fill: counterFill });
  const lines = counterpartLines(person.counterpart, base.inner);
  const step = COUNTER_LINE;
  const first = bandTop + (band - (lines.length - 1) * step) / 2 + 4;
  lines.forEach((line, index) => {
    svg.text(x + card.width / 2, first + index * step, line, {
      "font-size": TITLE_FONT,
      fill: contrastTextColor(counterFill) ?? fg,
    });
  });
}

export const powermapEngine: ExtEngine<PowerModel> = {
  type: "powermap",
  aliases: ["powermap", "power-map", "power"],
  parse: parsePowermap,
  render: renderPowermap,
};
