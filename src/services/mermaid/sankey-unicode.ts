import {
  formatMermaidSankeyCsvField,
  parseMermaidSankeyCsvLine,
  splitMermaidSankeyCsvFields,
} from "@/services/conversion/emit/mermaid-emit-utils";

/**
 * Лексер sankey в Mermaid принимает в имени узла только ASCII
 * (класс TEXTDATA, без запятой и кавычки). Нелатинские подписи
 * подменяются на время разбора и возвращаются в текст SVG.
 */
const SANKEY_FRONTMATTER = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/;
const SANKEY_ALIAS_PREFIX = "sknu";
const SANKEY_ALIAS_INDEX_WIDTH = 4;
const SANKEY_ALIAS_PAD_CHAR = "m";
const SANKEY_ALIAS_MAX_PAD = 96;
const SANKEY_LABEL_WIDTH_SAFETY = 1.12;
const SANKEY_VIEWBOX_PAD_PX = 4;
const SANKEY_VIEWBOX_MAX_GROWTH = 4;
const ASCII_UPPER_EM = 0.7;
const ASCII_LOWER_EM = 0.55;
const ASCII_DIGIT_EM = 0.56;
const ASCII_OTHER_EM = 0.45;
const CYRILLIC_EM = 0.72;
const WIDE_SCRIPT_EM = 1.05;
const SUPPLEMENTARY_EM = 1.2;
const OTHER_NON_ASCII_EM = 0.8;

const VIEW_BOX_ATTR =
  /\bviewBox="(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)"/i;

export interface MermaidSankeyUnicodePrep {
  source: string;
  restore: (svg: string) => string;
}

export function prepareMermaidSankeyUnicode(source: string): MermaidSankeyUnicodePrep {
  if (!isSankeyDiagram(source)) {
    return { source, restore: keepSvg };
  }

  const labels = collectLabels(source).filter((label) => !mermaidSankeyLexerAccepts(label));
  if (labels.length === 0) {
    return { source, restore: keepSvg };
  }

  const aliasByLabel = assignAliases(labels, source);
  let rewritten = mapLines(source, (line) => rewriteSankeyLine(line, aliasByLabel));
  rewritten = rewriteFrontmatterNodeColors(rewritten, aliasByLabel);
  rewritten = rewriteBraceNodeColors(rewritten, aliasByLabel);

  const labelByAlias = new Map<string, string>();
  for (const [label, alias] of aliasByLabel) {
    labelByAlias.set(alias, label);
  }

  return {
    source: rewritten,
    restore: (svg) => restoreMermaidSankeyLabels(svg, labelByAlias),
  };
}

function keepSvg(svg: string): string {
  return svg;
}

function isSankeyDiagram(source: string): boolean {
  const body = source.replace(SANKEY_FRONTMATTER, "");
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) {
      continue;
    }
    return /^sankey(?:-beta)?\b/i.test(trimmed);
  }
  return false;
}

function mermaidSankeyLexerAccepts(label: string): boolean {
  for (const char of label) {
    const code = char.charCodeAt(0);
    if (code === 0x22 || code === 0x2c || code === 0x0a || code === 0x0d) {
      continue;
    }
    if (code >= 0x20 && code <= 0x21) {
      continue;
    }
    if (code >= 0x23 && code <= 0x2b) {
      continue;
    }
    if (code >= 0x2d && code <= 0x7e) {
      continue;
    }
    return false;
  }
  return true;
}

function collectLabels(source: string): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const line of source.split(/\r?\n/)) {
    const flow = parseMermaidSankeyCsvLine(line);
    if (!flow) {
      continue;
    }
    for (const label of [flow.source, flow.target]) {
      if (seen.has(label)) {
        continue;
      }
      seen.add(label);
      labels.push(label);
    }
  }
  return labels;
}

function assignAliases(labels: readonly string[], source: string): Map<string, string> {
  const aliasByLabel = new Map<string, string>();
  const taken = new Set<string>();
  labels.forEach((label, index) => {
    const alias = makeAlias(label, index + 1, source, taken);
    aliasByLabel.set(label, alias);
    taken.add(alias);
  });
  return aliasByLabel;
}

function makeAlias(
  label: string,
  index: number,
  source: string,
  taken: ReadonlySet<string>,
): string {
  const base = `${SANKEY_ALIAS_PREFIX}${String(index).padStart(SANKEY_ALIAS_INDEX_WIDTH, "0")}`;
  const target = labelEmWidth(label) * SANKEY_LABEL_WIDTH_SAFETY;
  let alias = base;
  let extra = 0;
  while (labelEmWidth(alias) < target && extra < SANKEY_ALIAS_MAX_PAD) {
    alias += SANKEY_ALIAS_PAD_CHAR;
    extra += 1;
  }
  while (aliasConflicts(alias, source, taken)) {
    alias += SANKEY_ALIAS_PAD_CHAR;
    extra += 1;
    if (extra > SANKEY_ALIAS_MAX_PAD + taken.size + 8) {
      return `${base}x${index}${extra}`;
    }
  }
  return alias;
}

function aliasConflicts(alias: string, source: string, taken: ReadonlySet<string>): boolean {
  if (source.includes(alias)) {
    return true;
  }
  for (const used of taken) {
    if (used.includes(alias) || alias.includes(used)) {
      return true;
    }
  }
  return false;
}

function labelEmWidth(text: string): number {
  let em = 0;
  for (const char of text) {
    em += charEm(char);
  }
  return em;
}

function charEm(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code > 0xffff) {
    return SUPPLEMENTARY_EM;
  }
  if (code >= 0x30 && code <= 0x39) {
    return ASCII_DIGIT_EM;
  }
  if (code >= 0x41 && code <= 0x5a) {
    return ASCII_UPPER_EM;
  }
  if (code >= 0x61 && code <= 0x7a) {
    return ASCII_LOWER_EM;
  }
  if (code <= 0x7e) {
    return ASCII_OTHER_EM;
  }
  if (code >= 0x0400 && code <= 0x052f) {
    return CYRILLIC_EM;
  }
  if (isWideScript(code)) {
    return WIDE_SCRIPT_EM;
  }
  return OTHER_NON_ASCII_EM;
}

function isWideScript(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef)
  );
}

function rewriteSankeyLine(line: string, aliasByLabel: ReadonlyMap<string, string>): string {
  const flow = parseMermaidSankeyCsvLine(line);
  if (!flow) {
    return line;
  }
  const sourceAlias = aliasByLabel.get(flow.source);
  const targetAlias = aliasByLabel.get(flow.target);
  if (!sourceAlias && !targetAlias) {
    return line;
  }
  const fields = splitMermaidSankeyCsvFields(line);
  if (!fields) {
    return line;
  }
  const source = sourceAlias ?? formatMermaidSankeyCsvField(flow.source);
  const target = targetAlias ?? formatMermaidSankeyCsvField(flow.target);
  const value = fields[2].trim();
  const leading = /^[ \t]*/.exec(line)?.[0] ?? "";
  return `${leading}${source},${target},${value}`;
}

function rewriteFrontmatterNodeColors(
  source: string,
  aliasByLabel: ReadonlyMap<string, string>,
): string {
  const match = SANKEY_FRONTMATTER.exec(source);
  if (!match) {
    return source;
  }
  return rewriteNodeColorLines(match[0], aliasByLabel) + source.slice(match[0].length);
}

function rewriteNodeColorLines(text: string, aliasByLabel: ReadonlyMap<string, string>): string {
  const parts = text.split(/(\r?\n)/);
  let inBlock = false;
  let blockIndent = 0;

  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index] ?? "";
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    if (inBlock) {
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      if (indent <= blockIndent) {
        inBlock = false;
      } else {
        parts[index] = rewriteColorEntry(line, aliasByLabel);
        continue;
      }
    }
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("%%")) {
      continue;
    }
    if (!/^nodeColors\s*:/.test(trimmed)) {
      continue;
    }
    const colon = trimmed.indexOf(":");
    const rest = trimmed.slice(colon + 1).trim();
    if (!rest) {
      inBlock = true;
      blockIndent = indent;
      continue;
    }
    parts[index] =
      `${line.slice(0, indent)}nodeColors: ${rewriteInlineColorMap(rest, aliasByLabel)}`;
  }

  return parts.join("");
}

function rewriteColorEntry(line: string, aliasByLabel: ReadonlyMap<string, string>): string {
  const indent = line.length - line.trimStart().length;
  const trimmed = line.trim();
  const colon = findKeyColon(trimmed);
  if (colon <= 0) {
    return line;
  }
  const key = unquoteKey(trimmed.slice(0, colon).trim());
  const alias = aliasByLabel.get(key);
  if (!alias) {
    return line;
  }
  return `${line.slice(0, indent)}${alias}${trimmed.slice(colon)}`;
}

function findKeyColon(trimmed: string): number {
  const quote = trimmed[0];
  if (quote !== '"' && quote !== "'") {
    return trimmed.indexOf(":");
  }
  for (let index = 1; index < trimmed.length; index += 1) {
    if (trimmed[index] === "\\") {
      index += 1;
      continue;
    }
    if (trimmed[index] === quote) {
      return trimmed.indexOf(":", index + 1);
    }
  }
  return trimmed.indexOf(":");
}

function unquoteKey(raw: string): string {
  if (raw.length < 2) {
    return raw;
  }
  const quote = raw[0];
  if ((quote !== '"' && quote !== "'") || raw[raw.length - 1] !== quote) {
    return raw;
  }
  if (quote === '"') {
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw.slice(1, -1);
}

function rewriteBraceNodeColors(source: string, aliasByLabel: ReadonlyMap<string, string>): string {
  let cursor = 0;
  let result = "";
  while (cursor < source.length) {
    const at = source.indexOf("nodeColors", cursor);
    if (at < 0) {
      result += source.slice(cursor);
      break;
    }
    const between = source.slice(at + "nodeColors".length);
    const braceLead = /^(?:['"])?\s*:\s*\{/.exec(between);
    if (!braceLead) {
      result += source.slice(cursor, at + "nodeColors".length);
      cursor = at + "nodeColors".length;
      continue;
    }
    const braceAt = at + "nodeColors".length + braceLead[0].length - 1;
    const end = findMatchingBrace(source, braceAt);
    if (end < 0) {
      result += source.slice(cursor);
      break;
    }
    result += source.slice(cursor, braceAt + 1);
    result += rewriteInlineColorMap(source.slice(braceAt + 1, end), aliasByLabel);
    result += "}";
    cursor = end + 1;
  }
  return result;
}

function findMatchingBrace(text: string, openAt: number): number {
  let depth = 0;
  for (let index = openAt; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function rewriteInlineColorMap(raw: string, aliasByLabel: ReadonlyMap<string, string>): string {
  const labels = [...aliasByLabel.keys()].sort((left, right) => right.length - left.length);
  let result = raw;
  for (const label of labels) {
    const alias = aliasByLabel.get(label);
    if (!alias) {
      continue;
    }
    result = result.replaceAll(JSON.stringify(label), JSON.stringify(alias));
    if (!label.includes("'")) {
      result = result.replaceAll(`'${label}'`, `'${alias}'`);
    }
    const pattern = new RegExp(`(^|[{,]\\s*)${escapeRegExp(label)}(?=\\s*:)`, "g");
    result = result.replace(pattern, `$1${alias}`);
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapLines(text: string, mapLine: (line: string) => string): string {
  const parts = text.split(/(\r?\n)/);
  for (let index = 0; index < parts.length; index += 2) {
    parts[index] = mapLine(parts[index] ?? "");
  }
  return parts.join("");
}

function restoreMermaidSankeyLabels(svg: string, labelByAlias: ReadonlyMap<string, string>): string {
  if (!svg || labelByAlias.size === 0) {
    return svg;
  }
  const aliases = [...labelByAlias.entries()].sort((left, right) => right[0].length - left[0].length);
  const replaced = svg.replace(/<text\b[^>]*>[\s\S]*?<\/text>/gi, (block) => {
    let next = block;
    for (const [alias, label] of aliases) {
      if (!next.includes(alias)) {
        continue;
      }
      next = next.replaceAll(alias, escapeXmlText(label));
    }
    return next;
  });
  return expandSankeyViewBox(replaced);
}

function escapeXmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function expandSankeyViewBox(svg: string): string {
  if (typeof document === "undefined" || typeof DOMParser === "undefined" || !document.body) {
    return svg;
  }
  const attr = VIEW_BOX_ATTR.exec(svg);
  if (!attr) {
    return svg;
  }
  try {
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = parsed.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg") {
      return svg;
    }
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.position = "absolute";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.visibility = "hidden";
    const live = document.importNode(root, true) as unknown as SVGSVGElement;
    host.appendChild(live);
    document.body.appendChild(host);
    let box: DOMRect;
    try {
      box = live.getBBox();
    } finally {
      host.remove();
    }
    if (!box || !(box.width > 0) || !(box.height > 0)) {
      return svg;
    }
    const minX = Number(attr[1]);
    const minY = Number(attr[2]);
    const width = Number(attr[3]);
    const height = Number(attr[4]);
    const viewRight = minX + width;
    const viewBottom = minY + height;
    const contentLeft = box.x;
    const contentTop = box.y;
    const contentRight = box.x + box.width;
    const contentBottom = box.y + box.height;
    const nextMinX = contentLeft < minX ? contentLeft - SANKEY_VIEWBOX_PAD_PX : minX;
    const nextMinY = contentTop < minY ? contentTop - SANKEY_VIEWBOX_PAD_PX : minY;
    const nextRight = contentRight > viewRight ? contentRight + SANKEY_VIEWBOX_PAD_PX : viewRight;
    const nextBottom = contentBottom > viewBottom ? contentBottom + SANKEY_VIEWBOX_PAD_PX : viewBottom;
    if (
      nextMinX === minX &&
      nextMinY === minY &&
      nextRight === viewRight &&
      nextBottom === viewBottom
    ) {
      return svg;
    }
    const nextWidth = nextRight - nextMinX;
    const nextHeight = nextBottom - nextMinY;
    if (
      nextWidth > width * SANKEY_VIEWBOX_MAX_GROWTH ||
      nextHeight > height * SANKEY_VIEWBOX_MAX_GROWTH
    ) {
      return svg;
    }
    const next = `viewBox="${formatViewBox(nextMinX)} ${formatViewBox(nextMinY)} ${formatViewBox(nextWidth)} ${formatViewBox(nextHeight)}"`;
    return svg.replace(VIEW_BOX_ATTR, next);
  } catch {
    return svg;
  }
}

function formatViewBox(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}
