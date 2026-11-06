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
  "classdiagram-v2",
  "statediagram",
  "statediagram-v2",
  "erdiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitgraph",
  "sankey",
  "sankey-beta",
  "xychart",
  "xychart-beta",
  "block",
  "block-beta",
  "c4context",
  "c4container",
  "c4component",
  "c4dynamic",
  "c4deployment",
  "requirementdiagram",
  "quadrantchart",
  "architecture",
  "architecture-beta",
  "packet",
  "packet-beta",
  "kanban",
  "zenuml",
  "info",
  "radar-beta",
  "treemap-beta",
  "waterfall",
  "waterfall-variance",
  "waterfall-multi",
  "waterfall-scenario",
  "bubble",
  "bubblechart",
  "heatmap",
  "heat-map",
  "orgchart",
  "org",
  "ev",
  "evchart",
  "boxplot",
  "box-plot",
  "box",
  "treemap",
  "tree-map",
  "radar",
  "radarchart",
  "spider",
  "voronoi",
  "voronoi-diagram",
  "series",
]);

const KEYWORDS = new Set([
  "activate",
  "actor",
  "alt",
  "as",
  "aspect",
  "autonumber",
  "axisformat",
  "bar",
  "branch",
  "checkout",
  "cagr",
  "class",
  "classdef",
  "click",
  "columns",
  "commit",
  "concise",
  "dateformat",
  "deactivate",
  "direction",
  "else",
  "element",
  "end",
  "excludes",
  "group",
  "interface",
  "line",
  "link",
  "linkstyle",
  "loop",
  "merge",
  "namespace",
  "note",
  "opt",
  "par",
  "participant",
  "quadrant-1",
  "quadrant-2",
  "quadrant-3",
  "quadrant-4",
  "requirement",
  "robust",
  "section",
  "service",
  "showdata",
  "state",
  "style",
  "subgraph",
  "satisfies",
  "title",
  "x-axis",
  "y-axis",
  "axes",
  "categories",
  "colors",
  "connectors",
  "data",
  "dots",
  "fontsize",
  "grid",
  "invert",
  "labels",
  "mono",
  "orientation",
  "ratio",
  "rings",
  "rotate",
  "scale",
  "series",
  "sites",

  // Flowchart / sequence / class / state / ER
  "accdescr",
  "acctitle",
  "after",
  "and",
  "axisformat",
  "box",
  "break",
  "callback",
  "choice",
  "concurrency",
  "contains",
  "copies",
  "create",
  "critical",
  "cssclass",
  "dateformat",
  "default",
  "derives",
  "designconstraint",
  "destroy",
  "done",
  "fill",
  "docref",
  "fk",
  "id",
  "risk",
  "text",
  "type",
  "fork",
  "functionalrequirement",
  "in",
  "inclusiveenddates",
  "interfacerequirement",
  "interpolate",
  "join",
  "left",
  "links",
  "milestone",
  "of",
  "over",
  "performancerequirement",
  "physicalrequirement",
  "pk",
  "rect",
  "refines",
  "right",
  "stroke",
  "stroke-dasharray",
  "stroke-width",
  "tickinterval",
  "todaymarker",
  "traces",
  "uk",
  "verifies",
  "verifymethod",
  "weekday",
  "weekend",
  "weekends",
  "active",
  "crit",
  "cherry-pick",
  "tag",

  // XY / block / architecture / C4
  "horizontal",
  "vertical",
  "space",
  "junction",
  "addelementtag",
  "addreltag",
  "birel",
  "boundary",
  "component",
  "component_ext",
  "componentdb",
  "componentdb_ext",
  "componentqueue",
  "componentqueue_ext",
  "container",
  "container_boundary",
  "container_ext",
  "containerdb",
  "containerdb_ext",
  "containerqueue",
  "containerqueue_ext",
  "deployment_node",
  "enterprise_boundary",
  "node",
  "node_l",
  "node_r",
  "person",
  "person_ext",
  "rel",
  "rel_back",
  "rel_d",
  "rel_down",
  "rel_l",
  "rel_left",
  "rel_neighbor",
  "rel_r",
  "rel_right",
  "rel_u",
  "rel_up",
  "system",
  "system_boundary",
  "system_ext",
  "systemdb",
  "systemdb_ext",
  "systemqueue",
  "systemqueue_ext",
  "updatelayoutconfig",
  "updateelementstyle",
  "updaterelstyle",

  // Mermaid Ext: waterfall, bubble, heatmap, org, ev, boxplot, treemap, radar, voronoi, series
  "above",
  "auto",
  "axis",
  "background",
  "bars",
  "border",
  "both",
  "color",
  "colour",
  "colours",
  "connector",
  "dash",
  "dashdot",
  "days",
  "decrease",
  "dot",
  "false",
  "fgcolor",
  "fgcolour",
  "fontcolor",
  "fontcolour",
  "grouped",
  "hidden",
  "increase",
  "inside",
  "invert",
  "label",
  "layout",
  "max",
  "mean",
  "median",
  "mid",
  "min",
  "no",
  "no-label",
  "none",
  "off",
  "on",
  "prefix",
  "format",
  "outlier",
  "outliers",
  "whisker",
  "pv",
  "ac",
  "q1",
  "q3",
  "quadrants",
  "size",
  "solid",
  "stack",
  "stacked",
  "textcolor",
  "textcolour",
  "total",
  "true",
  "values",
  "width",
  "x",
  "y",
  "yes",
]);

const DIRECTIONS = new Set(["tb", "td", "bt", "lr", "rl"]);

export const MERMAID_DIAGRAM_KEYWORDS = DIAGRAM_KEYWORDS;
export const MERMAID_KEYWORDS = KEYWORDS;
export const MERMAID_DIRECTIONS = DIRECTIONS;

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
