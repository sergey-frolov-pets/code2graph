import { createSvg, fmt, resolvePalette } from "../common";
import type { ExtEngine, ExtParseError, ExtParseResult, ExtRenderOptions } from "../types";

export type InfographicSide = "left" | "right" | "top" | "bottom";

export interface InfographicLabel {
  side: InfographicSide;
  text: string;
  font?: string;
  fontSize?: number;
  color?: string;
}

export interface InfographicRule {
  op: ">" | ">=" | "<" | "<=" | "==" | "!=";
  threshold: number;
  color?: string;
  fontSize?: number;
  showPrefix?: boolean;
  hidePrefix?: boolean;
  showPostfix?: boolean;
  hidePostfix?: boolean;
}

export interface InfographicModel {
  value: number;
  text?: string;
  prefix: string;
  postfix: string;
  font: string;
  fontSize: number;
  color: string;
  width: number;
  height: number;
  labels: InfographicLabel[];
  rules: InfographicRule[];
}

const SIDES = new Set<InfographicSide>(["left", "right", "top", "bottom"]);
const OPS = [">=", "<=", "==", "!=", ">", "<"] as const;

function unquote(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

function parseNumber(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function error(line: number, message: string): ExtParseError {
  return { message, line, col: 0 };
}

function parseWhen(rest: string, lineNo: number): { rule?: InfographicRule; error?: ExtParseError } {
  const op = OPS.find((item) => rest.startsWith(item));
  if (!op) {
    return { error: error(lineNo, "when: нужно сравнение >, >=, <, <=, == или !=") };
  }
  const afterOp = rest.slice(op.length).trim();
  const match = /^(-?\d+(?:[.,]\d+)?)(.*)$/.exec(afterOp);
  if (!match) {
    return { error: error(lineNo, "when: после сравнения нужно число") };
  }
  const threshold = parseNumber(match[1]);
  if (threshold === null) {
    return { error: error(lineNo, "when: порог не число") };
  }
  const rule: InfographicRule = { op, threshold };
  const tail = match[2].trim();
  const tokens = tail.length > 0 ? tail.split(/\s+/) : [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i].toLowerCase();
    if (token === "color") {
      const color = tokens[i + 1];
      if (!color || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) {
        return { error: error(lineNo, "when: color ждёт #hex") };
      }
      rule.color = color;
      i += 1;
    } else if (token === "fontsize") {
      const size = parseNumber(tokens[i + 1] ?? "");
      if (size === null || size <= 0) {
        return { error: error(lineNo, "when: fontsize ждёт положительное число") };
      }
      rule.fontSize = size;
      i += 1;
    } else if (token === "show" || token === "hide") {
      const target = (tokens[i + 1] ?? "").toLowerCase();
      if (target !== "prefix" && target !== "postfix") {
        return { error: error(lineNo, "when: show и hide относятся к prefix или postfix") };
      }
      const show = token === "show";
      if (target === "prefix") {
        rule.showPrefix = show;
        rule.hidePrefix = !show;
      } else {
        rule.showPostfix = show;
        rule.hidePostfix = !show;
      }
      i += 1;
    } else {
      return { error: error(lineNo, `when: не понято «${tokens[i]}»`) };
    }
  }
  return { rule };
}

function parseLabel(rest: string, lineNo: number): { label?: InfographicLabel; error?: ExtParseError } {
  const side = rest.split(/\s+/)[0]?.toLowerCase() as InfographicSide;
  if (!SIDES.has(side)) {
    return { error: error(lineNo, "label: сторона left, right, top или bottom") };
  }
  let body = rest.slice(side.length).trim();
  let text = "";
  if (body.startsWith('"')) {
    const end = body.indexOf('"', 1);
    if (end < 0) {
      return { error: error(lineNo, "label: кавычка не закрыта") };
    }
    text = body.slice(1, end).replace(/\\"/g, '"');
    body = body.slice(end + 1).trim();
  } else {
    const cut = body.search(/\s(?:font|fontsize|color)\b/i);
    text = unquote(cut < 0 ? body : body.slice(0, cut));
    body = cut < 0 ? "" : body.slice(cut).trim();
  }
  if (!text) {
    return { error: error(lineNo, "label: пустой текст") };
  }
  const label: InfographicLabel = { side, text };
  const tokens = body.length > 0 ? body.split(/\s+/) : [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i].toLowerCase();
    const next = tokens[i + 1];
    if (token === "font" && next) {
      label.font = unquote(next);
      i += 1;
    } else if (token === "fontsize" && next) {
      const size = parseNumber(next);
      if (size === null || size <= 0) {
        return { error: error(lineNo, "label: fontsize ждёт положительное число") };
      }
      label.fontSize = size;
      i += 1;
    } else if (token === "color" && next) {
      if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(next)) {
        return { error: error(lineNo, "label: color ждёт #hex") };
      }
      label.color = next;
      i += 1;
    } else if (token) {
      return { error: error(lineNo, `label: не понято «${tokens[i]}»`) };
    }
  }
  return { label };
}

export function parseInfographic(source: string): ExtParseResult<InfographicModel> {
  const errors: ExtParseError[] = [];
  const model: InfographicModel = {
    value: Number.NaN,
    prefix: "",
    postfix: "",
    font: "sans-serif",
    fontSize: 64,
    color: "#111827",
    width: 480,
    height: 240,
    labels: [],
    rules: [],
  };
  let seenType = false;
  let hasValue = false;
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;
    if (!seenType) {
      if (!/^infographic\b/i.test(raw)) {
        errors.push(error(lineNo, "первая строка должна быть infographic"));
      }
      seenType = true;
      continue;
    }
    const [head, ...tail] = raw.split(/\s+/);
    const keyword = head.toLowerCase();
    const rest = tail.join(" ");
    if (keyword === "value") {
      const value = parseNumber(rest);
      if (value === null) errors.push(error(lineNo, "value: нужно число"));
      else {
        model.value = value;
        hasValue = true;
      }
    } else if (keyword === "text") {
      model.text = unquote(rest);
    } else if (keyword === "prefix") {
      model.prefix = unquote(rest);
    } else if (keyword === "postfix") {
      model.postfix = unquote(rest);
    } else if (keyword === "font") {
      model.font = unquote(rest) || model.font;
    } else if (keyword === "fontsize") {
      const size = parseNumber(rest);
      if (size === null || size <= 0) errors.push(error(lineNo, "fontsize: нужно положительное число"));
      else model.fontSize = size;
    } else if (keyword === "color") {
      if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(rest.trim())) {
        errors.push(error(lineNo, "color: нужен #hex"));
      } else model.color = rest.trim();
    } else if (keyword === "size") {
      const match = /^(\d+)\s*x\s*(\d+)$/i.exec(rest.trim());
      if (!match) errors.push(error(lineNo, "size: нужно ширинаxвысота, например 480x240"));
      else {
        model.width = Number(match[1]);
        model.height = Number(match[2]);
      }
    } else if (keyword === "label") {
      const parsed = parseLabel(rest, lineNo);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.label) {
        model.labels = model.labels.filter((item) => item.side !== parsed.label?.side);
        model.labels.push(parsed.label);
      }
    } else if (keyword === "when") {
      const parsed = parseWhen(rest, lineNo);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.rule) model.rules.push(parsed.rule);
    } else {
      errors.push(error(lineNo, `неизвестная директива «${head}»`));
    }
  }

  if (!hasValue) errors.push(error(1, "нужна директива value"));
  if (model.width <= 0 || model.height <= 0) errors.push(error(1, "size: стороны должны быть больше нуля"));
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: model, errors: [] };
}

function matches(rule: InfographicRule, value: number): boolean {
  switch (rule.op) {
    case ">":
      return value > rule.threshold;
    case ">=":
      return value >= rule.threshold;
    case "<":
      return value < rule.threshold;
    case "<=":
      return value <= rule.threshold;
    case "==":
      return value === rule.threshold;
    case "!=":
      return value !== rule.threshold;
  }
}

export function resolveInfographicStyle(model: InfographicModel): {
  color: string;
  fontSize: number;
  showPrefix: boolean;
  showPostfix: boolean;
} {
  let color = model.color;
  let fontSize = model.fontSize;
  let showPrefix = true;
  let showPostfix = true;
  for (const rule of model.rules) {
    if (!matches(rule, model.value)) continue;
    if (rule.color) color = rule.color;
    if (rule.fontSize) fontSize = rule.fontSize;
    if (rule.showPrefix) showPrefix = true;
    if (rule.hidePrefix) showPrefix = false;
    if (rule.showPostfix) showPostfix = true;
    if (rule.hidePostfix) showPostfix = false;
  }
  return { color, fontSize, showPrefix, showPostfix };
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function emitInfographic(model: InfographicModel): string {
  const lines = ["infographic", `value ${fmt(model.value)}`];
  if (model.text) lines.push(`text ${quote(model.text)}`);
  if (model.prefix) lines.push(`prefix ${quote(model.prefix)}`);
  if (model.postfix) lines.push(`postfix ${quote(model.postfix)}`);
  if (model.font && model.font !== "sans-serif") lines.push(`font ${quote(model.font)}`);
  lines.push(`fontsize ${fmt(model.fontSize)}`);
  lines.push(`color ${model.color}`);
  lines.push(`size ${model.width}x${model.height}`);
  for (const label of model.labels) {
    const parts = [`label ${label.side} ${quote(label.text)}`];
    if (label.font) parts.push(`font ${quote(label.font)}`);
    if (label.fontSize) parts.push(`fontsize ${fmt(label.fontSize)}`);
    if (label.color) parts.push(`color ${label.color}`);
    lines.push(parts.join(" "));
  }
  for (const rule of model.rules) {
    const parts = [`when ${rule.op} ${fmt(rule.threshold)}`];
    if (rule.color) parts.push(`color ${rule.color}`);
    if (rule.fontSize) parts.push(`fontsize ${fmt(rule.fontSize)}`);
    if (rule.showPrefix) parts.push("show prefix");
    if (rule.hidePrefix) parts.push("hide prefix");
    if (rule.showPostfix) parts.push("show postfix");
    if (rule.hidePostfix) parts.push("hide postfix");
    lines.push(parts.join(" "));
  }
  return lines.join("\n");
}

export function renderInfographic(model: InfographicModel, options: ExtRenderOptions = {}): string {
  const palette = resolvePalette(options.dark, options.background, options.textColor);
  const style = resolveInfographicStyle(model);
  const svg = createSvg({
    width: model.width,
    height: model.height,
    palette,
    title: model.text || String(model.value),
  });
  const labelSize = (label: InfographicLabel) => label.fontSize ?? Math.max(12, Math.round(style.fontSize * 0.35));
  const top = model.labels.find((label) => label.side === "top");
  const bottom = model.labels.find((label) => label.side === "bottom");
  const left = model.labels.find((label) => label.side === "left");
  const right = model.labels.find((label) => label.side === "right");
  const pad = 12;
  const topH = top ? labelSize(top) + pad : pad;
  const bottomH = bottom ? labelSize(bottom) + pad : pad;
  const leftW = left ? Math.max(48, labelSize(left) * left.text.length * 0.6) : pad;
  const rightW = right ? Math.max(48, labelSize(right) * right.text.length * 0.6) : pad;

  function paintLabel(label: InfographicLabel, x: number, y: number, anchor: string): void {
    svg.text(x, y, label.text, {
      fill: label.color ?? palette.fg,
      "font-family": label.font ?? model.font,
      "font-size": labelSize(label),
      "text-anchor": anchor,
      "data-side": label.side,
    });
  }

  if (top) paintLabel(top, model.width / 2, topH - 4, "middle");
  if (bottom) paintLabel(bottom, model.width / 2, model.height - 8, "middle");
  if (left) paintLabel(left, 8, topH + (model.height - topH - bottomH) / 2, "start");
  if (right) paintLabel(right, model.width - 8, topH + (model.height - topH - bottomH) / 2, "end");

  const shown = model.text && model.text.length > 0 ? model.text : fmt(model.value);
  const prefix = style.showPrefix ? model.prefix : "";
  const postfix = style.showPostfix ? model.postfix : "";
  svg.text(leftW + (model.width - leftW - rightW) / 2, topH + (model.height - topH - bottomH) / 2, `${prefix}${shown}${postfix}`, {
    fill: style.color,
    "font-family": model.font,
    "font-size": style.fontSize,
    "text-anchor": "middle",
    "dominant-baseline": "middle",
    "data-role": "value",
    "data-color": style.color,
  });
  return svg.toString();
}

export const infographicEngine: ExtEngine<InfographicModel> = {
  type: "infographic",
  aliases: ["infographic", "kpi"],
  parse: parseInfographic,
  render: renderInfographic,
};
