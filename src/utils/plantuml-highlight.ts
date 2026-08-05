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
  | "variable"
  | "plain";

export interface HighlightToken {
  type: HighlightTokenType;
  text: string;
}

const KEYWORDS = new Set([
  // General / structure
  "abstract",
  "agent",
  "artifact",
  "as",
  "backward",
  "bottom",
  "caption",
  "card",
  "circle",
  "cloud",
  "collections",
  "connector",
  "control",
  "database",
  "detach",
  "entity",
  "file",
  "floating",
  "folder",
  "footer",
  "frame",
  "header",
  "hexagon",
  "hide",
  "label",
  "legend",
  "left",
  "link",
  "map",
  "namespace",
  "node",
  "package",
  "partition",
  "queue",
  "rectangle",
  "repeat",
  "return",
  "right",
  "scale",
  "show",
  "sprite",
  "stack",
  "storage",
  "title",
  "together",
  "top",
  "usecase",
  "virtual",

  // Class / object
  "annotation",
  "class",
  "enum",
  "extends",
  "implements",
  "interface",
  "private",
  "protected",
  "public",
  "readonly",
  "static",

  // Sequence
  "activate",
  "actor",
  "alt",
  "autonumber",
  "boundary",
  "box",
  "break",
  "create",
  "critical",
  "deactivate",
  "delay",
  "destroy",
  "else",
  "endbox",
  "footbox",
  "group",
  "hnote",
  "loop",
  "new",
  "note",
  "of",
  "opt",
  "order",
  "over",
  "par",
  "participant",
  "ref",
  "reverse",
  "rnote",

  // State
  "choice",
  "composite",
  "deephistory",
  "entry",
  "exit",
  "history",
  "state",

  // Activity
  "elseif",
  "endif",
  "endwhile",
  "fork",
  "forward",
  "goto",
  "if",
  "kill",
  "split",
  "start",
  "stop",
  "then",
  "while",

  // Block closers (single-word)
  "end",

  // Component
  "component",

  // skinparam / styling
  "skinparam",
  "arrowcolor",
  "backgroundcolor",
  "bordercolor",
  "componentstyle",
  "defaultfontname",
  "defaulttextalignment",
  "diamondbackgroundcolor",
  "fontcolor",
  "handwritten",
  "legendbackgroundcolor",
  "legendbordercolor",
  "legendfontcolor",
  "lifelinebordercolor",
  "maxmessagesize",
  "packagestyle",
  "roundcorner",
  "shadowing",
  "wrapwidth",

  // C4 model
  "addelementtag",
  "addreltag",
  "component_db",
  "component_queue",
  "container",
  "container_boundary",
  "containerdb",
  "containerqueue",
  "enterprise_boundary",
  "lay_d",
  "lay_l",
  "lay_r",
  "lay_u",
  "person",
  "person_ext",
  "rel",
  "rel_back",
  "rel_down",
  "rel_left",
  "rel_neighbor",
  "rel_right",
  "rel_up",
  "show_legend",
  "show_person_outline",
  "system",
  "system_boundary",
  "system_ext",
  "systemqueue",
  "updateelementstyle",
  "updaterelstyle",
]);

const MULTI_WORD_KEYWORDS: Array<{ pattern: RegExp; text: string }> = [
  { pattern: /\bfork again\b/gi, text: "fork again" },
  { pattern: /\bend fork\b/gi, text: "end fork" },
  { pattern: /\bend split\b/gi, text: "end split" },
  { pattern: /\bend note\b/gi, text: "end note" },
  { pattern: /\bend header\b/gi, text: "end header" },
  { pattern: /\bend footer\b/gi, text: "end footer" },
  { pattern: /\bend legend\b/gi, text: "end legend" },
  { pattern: /\bend title\b/gi, text: "end title" },
  { pattern: /\bend ref\b/gi, text: "end ref" },
  { pattern: /\bend group\b/gi, text: "end group" },
];

const NAMED_COLORS = new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
]);

const ARROW_PATTERN =
  /(?:-\w+->|<?[-][-.]*(?:>|\|>?|[ox*])?|<?[=][-.]*(?:>|\|>?|[ox*])?|<?[.][-.]*(?:>|\|>?|[ox*])?|<\|?[-=.]*\|?>?|\|\|--|\.\.[>||ox*]|[ox*][-.]+[ox*])/gi;

const STEREOTYPE_PATTERN = /<<[^>]+>>/g;
const COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const DIRECTIVE_PATTERN = /@[A-Za-z][\w-]*/g;
const PREPROCESSOR_PATTERN = /![A-Za-z][\w-]*/g;
const VARIABLE_PATTERN = /\$[A-Za-z_][\w]*/g;
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

  if (NAMED_COLORS.has(lower)) {
    return "color";
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
  collect(VARIABLE_PATTERN, "variable");
  collect(NUMBER_PATTERN, "number");

  for (const entry of MULTI_WORD_KEYWORDS) {
    entry.pattern.lastIndex = 0;
    let match = entry.pattern.exec(segment);
    while (match) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "keyword",
        text: match[0],
      });
      match = entry.pattern.exec(segment);
    }
  }

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
