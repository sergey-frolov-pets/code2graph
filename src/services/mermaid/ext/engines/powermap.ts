import { isAppLocale, SUPPORTED_LOCALES, type AppLocale } from "@/constants/i18n";
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
  /** Подпись этой стрелки. Подпись типа `link` на стрелку не попадает. */
  label?: string;
}

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

/** `B label="текст"` в хвосте конкретной стрелки, не в объявлении `link`. */
function splitTrailingLabel(raw: string): { body: string; label?: string } {
  const match = /\slabel=("[^"]*"|'[^']*'|\S+)\s*$/i.exec(raw.trim());
  if (!match || match.index === undefined) return { body: raw.trim() };
  const label = unquote(match[1]).trim();
  return {
    body: raw.trim().slice(0, match.index).trim(),
    label: label || undefined,
  };
}

function parseRelation(
  raw: string,
): { kind: "report"; style: ReportStyle; from: string; to: string } | { kind: "influence"; name: string; from: string; to: string; label?: string } | null {
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
}

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
      });
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

const LEGEND_FONT = 10;
const LEGEND_TITLE = 11;
const LEGEND_ROW = 18;
const LEGEND_PAD = 8;

/** Подписи легенды. Свой текст `label=` не переводится, известные слова типа — да. */
const LEGEND_PHRASES: Record<"links" | "supporter" | "enemy", Record<AppLocale, string>> = {
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

interface LegendBox {
  title: string;
  width: number;
  height: number;
  rows: LegendRow[];
}

/** В легенде только стили, объявленные строкой `link`, без шкал и линий подчинения. */
function measureLegend(model: PowerModel, locale: AppLocale): LegendBox | null {
  if (!model.legend || model.links.length === 0) return null;
  const rows = model.links.map((link) => ({
    label: translateLinkLabel(link.label, locale),
    color: link.color,
    style: link.style,
    width: link.width,
  }));
  const title = LEGEND_PHRASES.links[locale];
  const body = Math.max(28, ...rows.map((row) => 28 + measureText(row.label, LEGEND_FONT)));
  return {
    title,
    width: LEGEND_PAD * 2 + Math.max(measureText(title, LEGEND_TITLE), body),
    height: LEGEND_PAD + 16 + rows.length * LEGEND_ROW + 4,
    rows,
  };
}

const INFLUENCE_X_SHIFT = 14;

interface InfluenceDraft {
  from: PlacedTreeNode<PowerPerson>;
  to: PlacedTreeNode<PowerPerson>;
  link: PowerLinkStyle;
  label?: string;
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

function influenceLaneY(gapTop: number, gapBottom: number, lane: number, count: number, mode: InfluenceDraft["mode"]): number {
  const lo = Math.min(gapTop, gapBottom);
  const hi = Math.max(gapTop, gapBottom);
  const room = hi - lo;
  const inset = Math.min(6, room / 4);
  const innerLo = lo + inset;
  const innerHi = hi - inset;
  if (innerHi <= innerLo) return (lo + hi) / 2;
  if (count <= 1) {
    if (mode === "same") return innerLo;
    const shift = Math.min(8, (innerHi - innerLo) / 4);
    return (innerLo + innerHi) / 2 + shift;
  }
  return innerLo + ((innerHi - innerLo) * (lane + 0.5)) / count;
}

interface RoutedInfluence {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midY: number;
  color: string;
  dash?: string;
  width: number;
  label?: string;
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

  const fromGroups = new Map<string, InfluenceDraft[]>();
  const toGroups = new Map<string, InfluenceDraft[]>();
  for (const draft of drafts) {
    const fromSide = draft.mode === "up" ? "top" : "bottom";
    const toSide = draft.mode === "down" ? "top" : "bottom";
    const fromKey = `${draft.from.node.id}|${fromSide}`;
    const toKey = `${draft.to.node.id}|${toSide}`;
    fromGroups.set(fromKey, [...(fromGroups.get(fromKey) ?? []), draft]);
    toGroups.set(toKey, [...(toGroups.get(toKey) ?? []), draft]);
  }
  for (const list of fromGroups.values()) {
    list.forEach((draft, index) => {
      draft.x1 = contactX(draft.from, offsetX, index, list.length);
    });
  }
  for (const list of toGroups.values()) {
    list.forEach((draft, index) => {
      draft.x2 = contactX(draft.to, offsetX, index, list.length);
    });
  }

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
  const routes = drafts.map((draft) => {
    const lane = laneOf.get(draft) ?? { lane: 0, count: 1 };
    const midY = influenceLaneY(draft.gapTop, draft.gapBottom, lane.lane, lane.count, draft.mode);
    overflow = Math.max(overflow, midY - treeBottom, draft.y1 - treeBottom, draft.y2 - treeBottom);
    const color = mono ? monoPaint(draft.link.color, invert) : draft.link.color;
    return {
      x1: draft.x1,
      y1: draft.y1,
      x2: draft.x2,
      y2: draft.y2,
      midY,
      color,
      dash: STROKE_DASH[draft.link.style],
      width: draft.link.width,
      label: draft.label,
    };
  });
  return { routes, overflow: Math.max(0, overflow) };
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

const COMMS_FONT = 11;
const COMMS_LINE = 16;
const COMMS_PAD_X = 8;
const COMMS_PAD_Y = 6;
const COMMS_HEADERS = ["Person", "Contacts", "Links"] as const;

interface CommsRow {
  name: string;
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

function linkLines(model: PowerModel, personId: string): string[] {
  const captions: string[] = [];
  for (const edge of model.influences) {
    if (edge.from !== personId && edge.to !== personId) continue;
    captions.push(linkCaption(model, edge.name));
  }
  return uniqueFold(captions);
}

interface CommsTable {
  width: number;
  height: number;
  columns: number[];
  rows: CommsRow[];
  headerHeight: number;
  rowHeights: number[];
}

function measureComms(model: PowerModel): CommsTable {
  const rows = model.people
    .map((person) => ({
      name: person.name,
      contacts: contactLines(person.counterpart),
      links: linkLines(model, person.id),
    }))
    .sort((a, b) => compareAlpha(a.name, b.name));
  const cells = (row: CommsRow): string[][] => [[row.name], row.contacts, row.links];
  const columns = COMMS_HEADERS.map((header, index) => {
    const widest = rows.reduce((max, row) => {
      const lines = cells(row)[index];
      return Math.max(max, ...lines.map((line) => measureText(line, COMMS_FONT)), 0);
    }, measureText(header, COMMS_FONT));
    return widest + COMMS_PAD_X * 2;
  });
  const headerHeight = COMMS_LINE + COMMS_PAD_Y * 2;
  const rowHeights = rows.map((row) => {
    const lines = Math.max(1, row.contacts.length, row.links.length);
    return lines * COMMS_LINE + COMMS_PAD_Y * 2;
  });
  return {
    width: columns.reduce((sum, width) => sum + width, 0),
    height: headerHeight + rowHeights.reduce((sum, height) => sum + height, 0),
    columns,
    rows,
    headerHeight,
    rowHeights,
  };
}

function drawComms(
  svg: ReturnType<typeof createSvg>,
  x: number,
  y: number,
  table: CommsTable,
  fg: string,
  bg: string,
): void {
  svg.rect(x, y, table.width, table.height, {
    fill: bg,
    stroke: CHIP_STROKE,
    "stroke-width": 1,
    rx: 4,
  });
  let cursor = x;
  COMMS_HEADERS.forEach((header, index) => {
    svg.text(cursor + COMMS_PAD_X, y + COMMS_PAD_Y + 12, header, {
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
    const groups = [[row.name], row.contacts, row.links];
    let cellX = x;
    groups.forEach((lines, index) => {
      lines.forEach((line, lineIndex) => {
        svg.text(cellX + COMMS_PAD_X, rowY + COMMS_PAD_Y + 12 + lineIndex * COMMS_LINE, line, {
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
  const locale = legendLocale(model, options);
  const legend = measureLegend(model, locale);
  const comms = model.comms ? measureComms(model) : null;
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

  const offsetX = 24 + padX / 2;
  const offsetY = headerH + padY / 2;
  const treeBottom = offsetY + laid.height;
  const routed = routeInfluences(laid.placed, model, offsetX, offsetY, treeBottom, mono, invertedMono);
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
    drawComms(svg, 24, commsY, comms, palette.fg, palette.bg);
  }

  const marker = arrowMarker(palette, "ext-pm-report");
  svg.raw(marker.markup);
  const placed: PlacedTreeNode<PowerPerson>[] = laid.placed;
  drawReportingElbows(svg, placed, model.reports, offsetX, offsetY, palette.axis, marker.ref);

  placed.forEach((card, cardIndex) => {
    drawCard(svg, card, offsetX, offsetY, model, palette.bg, palette.fg, palette.axis, mono, invertedMono, cardIndex);
  });

  routed.routes.forEach((route, index) => {
    const arrow = arrowMarker(palette, `ext-pm-link-${index}`, route.color);
    svg.raw(arrow.markup);
    const d = `M ${fmt(route.x1)} ${fmt(route.y1)} L ${fmt(route.x1)} ${fmt(route.midY)} L ${fmt(route.x2)} ${fmt(route.midY)} L ${fmt(route.x2)} ${fmt(route.y2)}`;
    svg.path(d, {
      fill: "none",
      stroke: route.color,
      "stroke-width": route.width,
      "marker-end": arrow.ref,
      ...(route.dash ? { "stroke-dasharray": route.dash } : {}),
    });
    if (route.label) {
      svg.text((route.x1 + route.x2) / 2, route.midY - 4, route.label, {
        "font-size": 10,
        fill: route.color,
        "data-edge-label": "1",
      });
    }
  });

  if (legend) {
    drawLegend(svg, 24, legendY, legend, palette.fg, palette.bg, mono, invertedMono);
  }

  return svg.toString();
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
  svg.text(x + LEGEND_PAD, y + 16, legend.title, {
    "font-size": LEGEND_TITLE,
    "font-weight": 700,
    fill: fg,
    "text-anchor": "start",
  });
  legend.rows.forEach((link, index) => {
    const rowY = y + 22 + index * LEGEND_ROW + 8;
    const color = mono ? monoGray(index, Math.max(legend.rows.length, 2), invert) : link.color;
    const dash = STROKE_DASH[link.style];
    svg.line(x + LEGEND_PAD, rowY, x + LEGEND_PAD + 22, rowY, {
      stroke: color,
      "stroke-width": Math.max(1.4, link.width),
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
