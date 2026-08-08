import {
  escapeHtml,
  type HighlightToken,
  type HighlightTokenType,
} from "@/utils/plantuml-highlight";

export type MermaidHighlightTokenType = HighlightTokenType;

const DIAGRAM_KEYWORDS = new Set([
  "flowchart",
  "graph",
  "sequencediagram",
  "classdiagram",
  "statediagram",
  "statediagram-v2",
  "erdiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitgraph",
  "sankey-beta",
  "xychart-beta",
  "block-beta",
]);

const KEYWORDS = new Set([
  "activate",
  "actor",
  "alt",
  "as",
  "autonumber",
  "axisformat",
  "class",
  "classdef",
  "click",
  "dateformat",
  "deactivate",
  "direction",
  "else",
  "end",
  "excludes",
  "interface",
  "link",
  "linkstyle",
  "loop",
  "namespace",
  "note",
  "opt",
  "par",
  "participant",
  "section",
  "showdata",
  "state",
  "style",
  "subgraph",
  "title",
]);

const DIRECTIONS = new Set(["tb", "td", "bt", "lr", "rl"]);

const ARROW_PATTERNS: Array<{ pattern: RegExp; type: HighlightTokenType }> = [
  { pattern: /\|\|[-=ox.]*\|\|/g, type: "arrow" },
  { pattern: /[xo]--[xo]/g, type: "arrow" },
  {
    pattern:
      /-\.->|--x|--o|==>|-->>|->>|-->|---|-\.-|\.->|\.\.>|<\|--|\*--|<\.\.|<\|/g,
    type: "arrow",
  },
  { pattern: /\|\|[-=ox.]*\{|\}[-=ox.]*\|\|/g, type: "arrow" },
];

const COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const NUMBER_PATTERN = /\b\d+(?:\.\d+)?(?:%|d|w|m|y)?\b/g;
const WORD_PATTERN = /[A-Za-z_][\w-]*/g;

function pushToken(
  tokens: HighlightToken[],
  type: HighlightTokenType,
  text: string,
): void {
  if (!text) {
    return;
  }

  const last = tokens[tokens.length - 1];
  if (last && last.type === type) {
    last.text += text;
    return;
  }

  tokens.push({ type, text });
}

function pushPlain(tokens: HighlightToken[], text: string): void {
  pushToken(tokens, "plain", text);
}

function classifyWord(word: string): HighlightTokenType {
  const lower = word.toLowerCase();

  if (DIAGRAM_KEYWORDS.has(lower)) {
    return "directive";
  }

  if (KEYWORDS.has(lower)) {
    return "keyword";
  }

  if (DIRECTIONS.has(lower)) {
    return "keyword";
  }

  return "plain";
}

function highlightSegment(tokens: HighlightToken[], segment: string): void {
  if (!segment) {
    return;
  }

  const matches: Array<{
    index: number;
    length: number;
    type: HighlightTokenType;
    text: string;
  }> = [];

  const collect = (pattern: RegExp, type: HighlightTokenType): void => {
    pattern.lastIndex = 0;
    let match = pattern.exec(segment);
    while (match) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type,
        text: match[0],
      });
      match = pattern.exec(segment);
    }
  };

  for (const entry of ARROW_PATTERNS) {
    collect(entry.pattern, entry.type);
  }

  collect(COLOR_PATTERN, "color");
  collect(NUMBER_PATTERN, "number");

  WORD_PATTERN.lastIndex = 0;
  let wordMatch = WORD_PATTERN.exec(segment);
  while (wordMatch) {
    const word = wordMatch[0];
    const type = classifyWord(word);
    if (type !== "plain") {
      matches.push({
        index: wordMatch.index,
        length: word.length,
        type,
        text: word,
      });
    }
    wordMatch = WORD_PATTERN.exec(segment);
  }

  matches.sort((left, right) => left.index - right.index);

  const occupied = new Array<boolean>(segment.length).fill(false);
  let cursor = 0;

  for (const match of matches) {
    if (match.index < cursor) {
      continue;
    }

    let overlaps = false;
    for (let index = match.index; index < match.index + match.length; index += 1) {
      if (occupied[index]) {
        overlaps = true;
        break;
      }
    }

    if (overlaps) {
      continue;
    }

    pushPlain(tokens, segment.slice(cursor, match.index));
    pushToken(tokens, match.type, match.text);

    for (let index = match.index; index < match.index + match.length; index += 1) {
      occupied[index] = true;
    }

    cursor = match.index + match.length;
  }

  pushPlain(tokens, segment.slice(cursor));
}

export function highlightMermaidLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let index = 0;

  while (index < line.length) {
    const char = line[index];

    if (char === '"') {
      let end = index + 1;
      while (end < line.length && line[end] !== '"') {
        end += 1;
      }
      if (end < line.length) {
        end += 1;
      }
      pushToken(tokens, "string", line.slice(index, end));
      index = end;
      continue;
    }

    if (char === "%" && line[index + 1] === "%") {
      pushToken(tokens, "comment", line.slice(index));
      break;
    }

    let nextSpecial = line.length;
    for (let probe = index + 1; probe < line.length; probe += 1) {
      const probeChar = line[probe];
      if (probeChar === '"' || probeChar === "%") {
        nextSpecial = probe;
        break;
      }
    }

    highlightSegment(tokens, line.slice(index, nextSpecial));
    index = nextSpecial;
  }

  if (tokens.length === 0) {
    tokens.push({ type: "plain", text: line || " " });
  }

  return tokens;
}

export function renderMermaidHighlightedLine(line: string): string {
  return highlightMermaidLine(line)
    .map(
      (token) =>
        `<span class="tok-${token.type}">${escapeHtml(token.text)}</span>`,
    )
    .join("");
}
