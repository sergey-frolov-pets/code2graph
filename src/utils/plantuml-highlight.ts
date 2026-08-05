export type HighlightTokenType =
  | "comment"
  | "directive"
  | "preprocessor"
  | "keyword"
  | "string"
  | "arrow"
  | "color"
  | "stereotype"
  | "number"
  | "plain";

export interface HighlightToken {
  type: HighlightTokenType;
  text: string;
}

const KEYWORDS = new Set([
  "abstract",
  "activate",
  "actor",
  "alt",
  "annotation",
  "as",
  "autonumber",
  "boundary",
  "box",
  "break",
  "class",
  "collections",
  "component",
  "control",
  "create",
  "critical",
  "database",
  "deactivate",
  "destroy",
  "detach",
  "else",
  "elseif",
  "end",
  "endbox",
  "endif",
  "endfork",
  "endgroup",
  "endif",
  "endsplit",
  "endwhile",
  "entity",
  "enum",
  "fork",
  "frame",
  "group",
  "hide",
  "if",
  "implements",
  "interface",
  "kill",
  "legend",
  "loop",
  "namespace",
  "node",
  "note",
  "of",
  "opt",
  "over",
  "package",
  "par",
  "participant",
  "queue",
  "rectangle",
  "ref",
  "show",
  "skinparam",
  "split",
  "start",
  "state",
  "static",
  "stop",
  "then",
  "title",
  "together",
  "usecase",
  "while",
]);

const ARROW_PATTERN =
  /(?:<?[-][-.]*(?:>|\|>?|o)?|<?[=][-.]*(?:>|\|>?|o)?|<?[.][-.]*(?:>|\|>?|o)?|<\|?[-=.]*\|?>?|\|\|--|\.\.>|\.\.\||o[-=.]+o)/g;

const STEREOTYPE_PATTERN = /<<[^>]+>>/g;
const COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const DIRECTIVE_PATTERN = /@[A-Za-z][\w-]*/g;
const PREPROCESSOR_PATTERN = /![A-Za-z][\w-]*/g;
const NUMBER_PATTERN = /\b\d+(?:\.\d+)?\b/g;
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
  if (KEYWORDS.has(lower)) {
    return "keyword";
  }

  if (lower.startsWith("@")) {
    return "directive";
  }

  if (lower.startsWith("!")) {
    return "preprocessor";
  }

  return "plain";
}

function highlightSegment(
  tokens: HighlightToken[],
  segment: string,
): void {
  if (!segment) {
    return;
  }

  const matches: Array<{
    index: number;
    length: number;
    type: HighlightTokenType;
    text: string;
  }> = [];

  const collect = (
    pattern: RegExp,
    type: HighlightTokenType,
    transform?: (value: string) => string,
  ): void => {
    pattern.lastIndex = 0;
    let match = pattern.exec(segment);
    while (match) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type,
        text: transform ? transform(match[0]) : match[0],
      });
      match = pattern.exec(segment);
    }
  };

  collect(STEREOTYPE_PATTERN, "stereotype");
  collect(COLOR_PATTERN, "color");
  collect(ARROW_PATTERN, "arrow");
  collect(DIRECTIVE_PATTERN, "directive");
  collect(PREPROCESSOR_PATTERN, "preprocessor");
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

export function highlightPlantUmlLine(line: string): HighlightToken[] {
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

    if (char === "/" && line[index + 1] === "'") {
      const closeIndex = line.indexOf("'/", index + 2);
      const end = closeIndex === -1 ? line.length : closeIndex + 2;
      pushToken(tokens, "comment", line.slice(index, end));
      index = end;
      continue;
    }

    if (char === "'") {
      pushToken(tokens, "comment", line.slice(index));
      break;
    }

    let nextSpecial = line.length;
    for (let probe = index + 1; probe < line.length; probe += 1) {
      const probeChar = line[probe];
      if (probeChar === '"' || probeChar === "'" || probeChar === "/") {
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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHighlightedLine(line: string): string {
  return highlightPlantUmlLine(line)
    .map(
      (token) =>
        `<span class="tok-${token.type}">${escapeHtml(token.text)}</span>`,
    )
    .join("");
}
