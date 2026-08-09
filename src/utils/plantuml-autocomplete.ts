import {
  COLOR_WORD_PREFIXES,
  PLANTUML_HEX_COLORS,
  PLANTUML_NAMED_COLORS,
} from "@/constants/plantuml-colors";
import { C4_INCLUDE_PATHS } from "@/utils/plantuml-include";
import type {
  CompletionItem,
  CompletionPrefixInfo,
  CompletionQuery,
} from "@/utils/completion-types";
import {
  MAX_COMPLETION_ITEMS,
  MIN_COMPLETION_PREFIX_LENGTH,
} from "@/utils/completion-types";

export type {
  CompletionItem,
  CompletionKind,
  CompletionPrefixInfo,
  CompletionPrefixMode,
  CompletionQuery,
} from "@/utils/completion-types";

type BlockKind =
  | "brace"
  | "if"
  | "alt"
  | "loop"
  | "opt"
  | "par"
  | "group"
  | "critical"
  | "break"
  | "fork"
  | "split"
  | "while"
  | "note"
  | "box"
  | "ref";

interface BlockFrame {
  kind: BlockKind;
}

const SWIMLANE_COLOR_TEMPLATES = [
  { label: "|#E3F2FD|Lane|", insertText: "|#E3F2FD|Lane|", detailKey: "editor.completion.swimlaneDeclare" },
  { label: "|#E8F5E9|Lane|", insertText: "|#E8F5E9|Lane|", detailKey: "editor.completion.swimlaneDeclare" },
  { label: "|#FFF3E0|Lane|", insertText: "|#FFF3E0|Lane|", detailKey: "editor.completion.swimlaneDeclare" },
  { label: "|#FCE4EC|Lane|", insertText: "|#FCE4EC|Lane|", detailKey: "editor.completion.swimlaneDeclare" },
  { label: "|Lane|", insertText: "|Lane|", detailKey: "editor.completion.swimlaneSwitch" },
] as const;

const C4_VOCABULARY: CompletionItem[] = [
  { label: "!include C4_Context", insertText: `!include ${C4_INCLUDE_PATHS.context}`, kind: "c4", detailKey: "editor.completion.c4Include" },
  { label: "!include C4_Container", insertText: `!include ${C4_INCLUDE_PATHS.container}`, kind: "c4", detailKey: "editor.completion.c4Include" },
  { label: "!include C4_Component", insertText: `!include ${C4_INCLUDE_PATHS.component}`, kind: "c4", detailKey: "editor.completion.c4Include" },
  { label: "!include C4_Deployment", insertText: `!include ${C4_INCLUDE_PATHS.deployment}`, kind: "c4", detailKey: "editor.completion.c4Include" },
  { label: "Person", insertText: 'Person(alias, "Label", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "Person_Ext", insertText: 'Person_Ext(alias, "Label", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "System", insertText: 'System(alias, "Label", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "System_Ext", insertText: 'System_Ext(alias, "Label", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "System_Boundary", insertText: 'System_Boundary(alias, "Label") {', kind: "c4", detailKey: "editor.completion.c4Boundary" },
  { label: "Enterprise_Boundary", insertText: 'Enterprise_Boundary(alias, "Label") {', kind: "c4", detailKey: "editor.completion.c4Boundary" },
  { label: "Container", insertText: 'Container(alias, "Label", "Technology", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "ContainerDb", insertText: 'ContainerDb(alias, "Label", "Technology", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "ContainerQueue", insertText: 'ContainerQueue(alias, "Label", "Technology", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "Container_Ext", insertText: 'Container_Ext(alias, "Label", "Technology", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "ContainerDb_Ext", insertText: 'ContainerDb_Ext(alias, "Label", "Technology", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "ContainerQueue_Ext", insertText: 'ContainerQueue_Ext(alias, "Label", "Technology", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "Container_Boundary", insertText: 'Container_Boundary(alias, "Label") {', kind: "c4", detailKey: "editor.completion.c4Boundary" },
  { label: "Component", insertText: 'Component(alias, "Label", "Technology", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "ComponentDb", insertText: 'ComponentDb(alias, "Label", "Technology", "Description")', kind: "c4", detailKey: "editor.completion.c4Element" },
  { label: "Rel", insertText: 'Rel(from, to, "Label", "Technology")', kind: "c4", detailKey: "editor.completion.c4Rel" },
  { label: "Rel_Back", insertText: 'Rel_Back(from, to, "Label", "Technology")', kind: "c4", detailKey: "editor.completion.c4Rel" },
  { label: "Rel_Down", insertText: 'Rel_Down(from, to, "Label", "Technology")', kind: "c4", detailKey: "editor.completion.c4Rel" },
  { label: "Rel_Up", insertText: 'Rel_Up(from, to, "Label", "Technology")', kind: "c4", detailKey: "editor.completion.c4Rel" },
  { label: "Rel_Left", insertText: 'Rel_Left(from, to, "Label", "Technology")', kind: "c4", detailKey: "editor.completion.c4Rel" },
  { label: "Rel_Right", insertText: 'Rel_Right(from, to, "Label", "Technology")', kind: "c4", detailKey: "editor.completion.c4Rel" },
  { label: "Rel_Neighbor", insertText: 'Rel_Neighbor(from, to, "Label", "Technology")', kind: "c4", detailKey: "editor.completion.c4Rel" },
  { label: "AddElementTag", insertText: 'AddElementTag("tag", $bgColor="#335DA5")', kind: "c4", detailKey: "editor.completion.c4Tag" },
  { label: "AddRelTag", insertText: 'AddRelTag("tag", $lineStyle=DashedLine())', kind: "c4", detailKey: "editor.completion.c4Tag" },
  { label: "AddContainerTag", insertText: 'AddContainerTag("tag", $bgColor="#335DA5")', kind: "c4", detailKey: "editor.completion.c4Tag" },
  { label: "UpdateElementStyle", insertText: "UpdateElementStyle(", kind: "c4", detailKey: "editor.completion.c4Style" },
  { label: "UpdateRelStyle", insertText: "UpdateRelStyle(", kind: "c4", detailKey: "editor.completion.c4Style" },
  { label: "SHOW_LEGEND", insertText: "SHOW_LEGEND()", kind: "c4", detailKey: "editor.completion.c4Legend" },
  { label: "SHOW_PERSON_OUTLINE", insertText: "SHOW_PERSON_OUTLINE()", kind: "c4", detailKey: "editor.completion.c4Legend" },
  { label: "HIDE_PERSON_OUTLINE", insertText: "HIDE_PERSON_OUTLINE()", kind: "c4", detailKey: "editor.completion.c4Legend" },
  { label: "LAYOUT_LANDSCAPE", insertText: "LAYOUT_LANDSCAPE()", kind: "c4", detailKey: "editor.completion.c4Layout" },
  { label: "LAYOUT_WITH_LEGEND", insertText: "LAYOUT_WITH_LEGEND()", kind: "c4", detailKey: "editor.completion.c4Layout" },
];

const VOCABULARY: CompletionItem[] = [
  { label: "@startuml", insertText: "@startuml", kind: "directive" },
  { label: "@enduml", insertText: "@enduml", kind: "directive" },
  { label: "@startmindmap", insertText: "@startmindmap", kind: "directive" },
  { label: "@endmindmap", insertText: "@endmindmap", kind: "directive" },
  { label: "@startgantt", insertText: "@startgantt", kind: "directive" },
  { label: "@endgantt", insertText: "@endgantt", kind: "directive" },
  { label: "@startwbs", insertText: "@startwbs", kind: "directive" },
  { label: "@endwbs", insertText: "@endwbs", kind: "directive" },
  { label: "!include", insertText: "!include ", kind: "preprocessor" },
  { label: "!pragma", insertText: "!pragma ", kind: "preprocessor" },
  { label: "!theme", insertText: "!theme ", kind: "preprocessor" },
  { label: "!define", insertText: "!define ", kind: "preprocessor" },
  { label: "!ifdef", insertText: "!ifdef ", kind: "preprocessor" },
  { label: "!ifndef", insertText: "!ifndef ", kind: "preprocessor" },
  { label: "!endif", insertText: "!endif", kind: "preprocessor" },
  { label: "abstract", insertText: "abstract ", kind: "keyword" },
  { label: "activate", insertText: "activate ", kind: "keyword" },
  { label: "actor", insertText: "actor ", kind: "keyword" },
  { label: "alt", insertText: "alt ", kind: "keyword", detailKey: "editor.completion.alt" },
  { label: "as", insertText: "as ", kind: "keyword" },
  { label: "autonumber", insertText: "autonumber", kind: "keyword" },
  { label: "boundary", insertText: "boundary ", kind: "keyword" },
  { label: "box", insertText: "box ", kind: "keyword" },
  { label: "break", insertText: "break ", kind: "keyword" },
  { label: "card", insertText: "card ", kind: "keyword" },
  { label: "class", insertText: "class ", kind: "keyword" },
  { label: "cloud", insertText: "cloud ", kind: "keyword" },
  { label: "collections", insertText: "collections ", kind: "keyword" },
  { label: "component", insertText: "component ", kind: "keyword" },
  { label: "control", insertText: "control ", kind: "keyword" },
  { label: "create", insertText: "create ", kind: "keyword" },
  { label: "critical", insertText: "critical ", kind: "keyword" },
  { label: "database", insertText: "database ", kind: "keyword" },
  { label: "deactivate", insertText: "deactivate ", kind: "keyword" },
  { label: "destroy", insertText: "destroy ", kind: "keyword" },
  { label: "else", insertText: "else ", kind: "keyword", detailKey: "editor.completion.else" },
  { label: "elseif", insertText: "elseif () then ()", kind: "keyword", detailKey: "editor.completion.elseif" },
  { label: "end", insertText: "end", kind: "keyword", detailKey: "editor.completion.end" },
  { label: "end fork", insertText: "end fork", kind: "keyword", detailKey: "editor.completion.endFork" },
  { label: "end note", insertText: "end note", kind: "keyword", detailKey: "editor.completion.endNote" },
  { label: "end split", insertText: "end split", kind: "keyword", detailKey: "editor.completion.endSplit" },
  { label: "endbox", insertText: "endbox", kind: "keyword" },
  { label: "endif", insertText: "endif", kind: "keyword", detailKey: "editor.completion.endif" },
  { label: "endwhile", insertText: "endwhile", kind: "keyword", detailKey: "editor.completion.endwhile" },
  { label: "entity", insertText: "entity ", kind: "keyword" },
  { label: "enum", insertText: "enum ", kind: "keyword" },
  { label: "extends", insertText: "extends ", kind: "keyword" },
  { label: "fork", insertText: "fork", kind: "keyword", detailKey: "editor.completion.fork" },
  { label: "fork again", insertText: "fork again", kind: "keyword", detailKey: "editor.completion.forkAgain" },
  { label: "frame", insertText: "frame ", kind: "keyword" },
  { label: "group", insertText: "group ", kind: "keyword" },
  { label: "if", insertText: "if () then ()", kind: "keyword", detailKey: "editor.completion.if" },
  { label: "implements", insertText: "implements ", kind: "keyword" },
  { label: "interface", insertText: "interface ", kind: "keyword" },
  { label: "legend", insertText: "legend", kind: "keyword" },
  { label: "loop", insertText: "loop ", kind: "keyword", detailKey: "editor.completion.loop" },
  { label: "namespace", insertText: "namespace ", kind: "keyword" },
  { label: "node", insertText: "node ", kind: "keyword" },
  { label: "note", insertText: "note ", kind: "keyword", detailKey: "editor.completion.note" },
  { label: "opt", insertText: "opt ", kind: "keyword", detailKey: "editor.completion.opt" },
  { label: "package", insertText: "package ", kind: "keyword" },
  { label: "par", insertText: "par ", kind: "keyword", detailKey: "editor.completion.par" },
  { label: "participant", insertText: "participant ", kind: "keyword" },
  { label: "partition", insertText: "partition ", kind: "keyword", detailKey: "editor.completion.swimlanePartition" },
  { label: "queue", insertText: "queue ", kind: "keyword" },
  { label: "rectangle", insertText: "rectangle ", kind: "keyword" },
  { label: "ref", insertText: "ref ", kind: "keyword" },
  { label: "skinparam", insertText: "skinparam ", kind: "keyword" },
  { label: "split", insertText: "split", kind: "keyword", detailKey: "editor.completion.split" },
  { label: "split again", insertText: "split again", kind: "keyword", detailKey: "editor.completion.splitAgain" },
  { label: "start", insertText: "start", kind: "keyword", detailKey: "editor.completion.activityStart" },
  { label: "state", insertText: "state ", kind: "keyword" },
  { label: "stop", insertText: "stop", kind: "keyword", detailKey: "editor.completion.activityStop" },
  { label: "then", insertText: "then ()", kind: "keyword" },
  { label: "title", insertText: "title ", kind: "keyword" },
  { label: "usecase", insertText: "usecase ", kind: "keyword" },
  { label: "while", insertText: "while ()", kind: "keyword", detailKey: "editor.completion.while" },
  ...C4_VOCABULARY,
];

const CONTEXT_CLOSERS: Record<BlockKind, CompletionItem[]> = {
  brace: [{ label: "}", insertText: "}", kind: "context", detailKey: "editor.completion.closeBrace" }],
  if: [
    { label: "else", insertText: "else ()", kind: "context", detailKey: "editor.completion.else" },
    { label: "elseif", insertText: "elseif () then ()", kind: "context", detailKey: "editor.completion.elseif" },
    { label: "endif", insertText: "endif", kind: "context", detailKey: "editor.completion.endif" },
  ],
  alt: [
    { label: "else", insertText: "else ", kind: "context", detailKey: "editor.completion.else" },
    { label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" },
  ],
  loop: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  opt: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  par: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  group: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  critical: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  break: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  fork: [
    { label: "fork again", insertText: "fork again", kind: "context", detailKey: "editor.completion.forkAgain" },
    { label: "end fork", insertText: "end fork", kind: "context", detailKey: "editor.completion.endFork" },
  ],
  split: [
    { label: "split again", insertText: "split again", kind: "context", detailKey: "editor.completion.splitAgain" },
    { label: "end split", insertText: "end split", kind: "context", detailKey: "editor.completion.endSplit" },
  ],
  while: [{ label: "endwhile", insertText: "endwhile", kind: "context", detailKey: "editor.completion.endwhile" }],
  note: [{ label: "end note", insertText: "end note", kind: "context", detailKey: "editor.completion.endNote" }],
  box: [
    { label: "endbox", insertText: "endbox", kind: "context", detailKey: "editor.completion.end" },
    { label: "end box", insertText: "end box", kind: "context", detailKey: "editor.completion.end" },
  ],
  ref: [{ label: "end ref", insertText: "end ref", kind: "context", detailKey: "editor.completion.end" }],
};

export function extractCompletionPrefix(
  line: string,
  column: number,
): CompletionPrefixInfo {
  const before = line.slice(0, column);

  const swimlaneHex = before.match(/\|#([0-9a-fA-F]*)$/i);
  if (swimlaneHex) {
    return {
      prefix: swimlaneHex[1] ?? "",
      replaceStart: column - (swimlaneHex[1]?.length ?? 0),
      mode: "swimlane-hex",
    };
  }

  const namedColor = before.match(/#([A-Za-z][\w]*)$/);
  if (namedColor) {
    return {
      prefix: namedColor[1] ?? "",
      replaceStart: column - (namedColor[1]?.length ?? 0),
      mode: "named-color",
    };
  }

  const hexColor = before.match(/#([0-9a-fA-F]*)$/i);
  if (hexColor) {
    return {
      prefix: hexColor[1] ?? "",
      replaceStart: column - (hexColor[1]?.length ?? 0),
      mode: "hex",
    };
  }

  const swimlane = before.match(/\|([^|]*)$/);
  if (swimlane && /^\s*\|/.test(line)) {
    return {
      prefix: swimlane[1] ?? "",
      replaceStart: column - (swimlane[1]?.length ?? 0),
      mode: "swimlane",
    };
  }

  const word = before.match(/[@!]?[A-Za-z_][\w-]*$/);
  return {
    prefix: word?.[0] ?? "",
    replaceStart: column - (word?.[0]?.length ?? 0),
    mode: "word",
  };
}

export function isNewLineContext(line: string, prefixInfo: CompletionPrefixInfo): boolean {
  const beforePrefix = line.slice(0, prefixInfo.replaceStart);
  return beforePrefix.trim().length === 0;
}

export function getCompletions(query: CompletionQuery): CompletionItem[] {
  const results: CompletionItem[] = [];
  const seen = new Set<string>();
  const normalizedPrefix = query.prefixInfo.prefix.toLowerCase();
  const currentLine = query.lines[query.lineNumber - 1] ?? "";
  const onNewLine = isNewLineContext(currentLine, query.prefixInfo);
  const isActivity = detectActivityDiagram(query.lines);
  const isC4 = detectC4Diagram(query.lines);

  const addItems = (items: CompletionItem[]): void => {
    for (const item of items) {
      if (seen.has(item.label)) {
        continue;
      }
      seen.add(item.label);
      results.push(item);
    }
  };

  if (onNewLine) {
    const openBlocks = analyzeOpenBlocks(
      query.lines,
      query.lineNumber,
      query.prefixInfo.replaceStart,
    );

    for (let index = openBlocks.length - 1; index >= 0; index -= 1) {
      const closers = CONTEXT_CLOSERS[openBlocks[index].kind].filter(
        (item) =>
          normalizedPrefix.length === 0 ||
          item.label.toLowerCase().startsWith(normalizedPrefix),
      );
      addItems(closers);
    }

    if (isActivity) {
      addItems(getSwimlaneContextCompletions(query.lines, normalizedPrefix));
    }

    if (isC4) {
      addItems(getC4ContextCompletions(normalizedPrefix));
    }
  }

  if (
    query.prefixInfo.mode === "swimlane" ||
    query.prefixInfo.mode === "swimlane-hex" ||
    (onNewLine && isActivity && normalizedPrefix.length === 0)
  ) {
    addItems(getSwimlaneCompletions(query.lines, query.prefixInfo, normalizedPrefix));
  }

  if (
    query.prefixInfo.mode === "named-color" ||
    query.prefixInfo.mode === "hex" ||
    query.prefixInfo.mode === "swimlane-hex" ||
    isColorWordPrefix(normalizedPrefix)
  ) {
    addItems(getColorCompletions(query.prefixInfo, normalizedPrefix));
  }

  if (
    normalizedPrefix.length >= MIN_COMPLETION_PREFIX_LENGTH ||
    (isC4 && normalizedPrefix.length >= 1 && /^[A-Z]/.test(query.prefixInfo.prefix))
  ) {
    const vocabulary = isC4
      ? [...C4_VOCABULARY, ...VOCABULARY.filter((item) => item.kind !== "c4")]
      : VOCABULARY;

    const matched = vocabulary.filter((item) =>
      item.label.toLowerCase().startsWith(normalizedPrefix),
    );
    addItems(matched);
  }

  return results.slice(0, MAX_COMPLETION_ITEMS);
}

function isColorWordPrefix(prefix: string): boolean {
  return COLOR_WORD_PREFIXES.some(
    (entry) => entry.startsWith(prefix) || prefix.startsWith(entry),
  );
}

function getColorCompletions(
  prefixInfo: CompletionPrefixInfo,
  normalizedPrefix: string,
): CompletionItem[] {
  const results: CompletionItem[] = [];

  if (
    prefixInfo.mode === "named-color" ||
    prefixInfo.mode === "word" ||
    isColorWordPrefix(normalizedPrefix)
  ) {
    for (const color of PLANTUML_NAMED_COLORS) {
      if (
        normalizedPrefix.length === 0 ||
        color.label.toLowerCase().startsWith(normalizedPrefix) ||
        isColorWordPrefix(normalizedPrefix)
      ) {
        results.push({
          label: color.label,
          insertText:
            prefixInfo.mode === "named-color" ? color.value : `#${color.value}`,
          kind: "color",
          detailKey: color.detailKey,
        });
      }
    }
  }

  if (
    prefixInfo.mode === "hex" ||
    prefixInfo.mode === "swimlane-hex" ||
    isColorWordPrefix(normalizedPrefix)
  ) {
    for (const color of PLANTUML_HEX_COLORS) {
      if (
        normalizedPrefix.length === 0 ||
        color.value.toLowerCase().startsWith(normalizedPrefix) ||
        color.label.toLowerCase().includes(normalizedPrefix) ||
        isColorWordPrefix(normalizedPrefix)
      ) {
        const swimlaneSuffix =
          prefixInfo.mode === "swimlane-hex" ? "|Lane|" : "";
        results.push({
          label: color.label,
          insertText: `${color.value}${swimlaneSuffix}`,
          kind: "color",
          detailKey: color.detailKey,
        });
      }
    }
  }

  return results;
}

function getSwimlaneCompletions(
  lines: string[],
  prefixInfo: CompletionPrefixInfo,
  normalizedPrefix: string,
): CompletionItem[] {
  const results: CompletionItem[] = [];
  const laneNames = collectSwimlaneNames(lines);

  if (prefixInfo.mode === "swimlane" || prefixInfo.mode === "swimlane-hex") {
    if (prefixInfo.mode === "swimlane") {
      for (const template of SWIMLANE_COLOR_TEMPLATES) {
        if (
          normalizedPrefix.length === 0 ||
          template.label.toLowerCase().includes(normalizedPrefix)
        ) {
          results.push({
            label: template.label,
            insertText: template.insertText,
            kind: "swimlane",
            detailKey: template.detailKey,
          });
        }
      }
    }

    for (const lane of laneNames) {
      if (
        normalizedPrefix.length === 0 ||
        lane.toLowerCase().startsWith(normalizedPrefix)
      ) {
        results.push({
          label: `|${lane}|`,
          insertText: `${lane}|`,
          kind: "swimlane",
          detailKey: "editor.completion.swimlaneSwitch",
        });
      }
    }
  }

  return results;
}

function getSwimlaneContextCompletions(
  lines: string[],
  normalizedPrefix: string,
): CompletionItem[] {
  const laneNames = collectSwimlaneNames(lines);
  const results: CompletionItem[] = [];

  for (const template of SWIMLANE_COLOR_TEMPLATES) {
    if (
      normalizedPrefix.length === 0 ||
      template.label.toLowerCase().includes(normalizedPrefix)
    ) {
      results.push({
        label: template.label,
        insertText: template.insertText,
        kind: "swimlane",
        detailKey: template.detailKey,
      });
    }
  }

  for (const lane of laneNames) {
    if (
      normalizedPrefix.length === 0 ||
      lane.toLowerCase().startsWith(normalizedPrefix)
    ) {
      results.push({
        label: `|${lane}|`,
        insertText: `|${lane}|`,
        kind: "swimlane",
        detailKey: "editor.completion.swimlaneSwitch",
      });
    }
  }

  return results;
}

function getC4ContextCompletions(normalizedPrefix: string): CompletionItem[] {
  const preferred = [
    "Person",
    "Person_Ext",
    "System_Boundary",
    "Container",
    "ContainerDb",
    "ContainerQueue",
    "Rel",
    "Rel_Back",
    "SHOW_LEGEND",
  ];

  return C4_VOCABULARY.filter(
    (item) =>
      preferred.includes(item.label) &&
      (normalizedPrefix.length === 0 ||
        item.label.toLowerCase().startsWith(normalizedPrefix)),
  );
}

function collectSwimlaneNames(lines: string[]): string[] {
  const names = new Set<string>();

  for (const line of lines) {
    const declareMatch = line.match(/^\s*\|(?:#[0-9A-Fa-f]{3,8})?\|([^|]+)\|\s*$/);
    if (declareMatch?.[1]) {
      names.add(declareMatch[1].trim());
      continue;
    }

    const switchMatch = line.match(/^\s*\|([^|#][^|]*)\|\s*$/);
    if (switchMatch?.[1]) {
      names.add(switchMatch[1].trim());
    }
  }

  return [...names];
}

function detectActivityDiagram(lines: string[]): boolean {
  return lines.some((line) => {
    const trimmed = line.trim().toLowerCase();
    return (
      trimmed === "start" ||
      trimmed === "stop" ||
      /^\|[^|]+\|$/.test(trimmed) ||
      /^\|#[0-9a-f]{3,8}\|[^|]+\|$/i.test(trimmed) ||
      /^:.+;$/i.test(trimmed) ||
      /^#[a-z].+:.+;$/i.test(trimmed)
    );
  });
}

function detectC4Diagram(lines: string[]): boolean {
  return lines.some((line) => {
    const trimmed = line.trim();
    return (
      /C4[_/]/i.test(trimmed) ||
      /^Person(?:_Ext)?\s*\(/.test(trimmed) ||
      /^System(?:_Ext|_Boundary)?\s*["(]/.test(trimmed) ||
      /^Container(?:Db|Queue|_Ext|_Boundary)?\s*\(/.test(trimmed) ||
      /^Rel(?:_[A-Za-z]+)?\s*\(/.test(trimmed) ||
      /^Add(?:Element|Rel|Container)Tag\s*\(/.test(trimmed)
    );
  });
}

export function analyzeOpenBlocks(
  lines: string[],
  lineNumber: number,
  column: number,
): BlockFrame[] {
  const stack: BlockFrame[] = [];

  for (let lineIndex = 0; lineIndex < lineNumber; lineIndex += 1) {
    const isCurrentLine = lineIndex === lineNumber - 1;
    const rawLine = lines[lineIndex] ?? "";
    const line = isCurrentLine ? rawLine.slice(0, column) : rawLine;
    applyLineToStack(line, stack);
  }

  return stack;
}

function applyLineToStack(line: string, stack: BlockFrame[]): void {
  const code = stripLineComment(line);
  const trimmed = code.trim().toLowerCase();
  if (!trimmed) {
    applyBraceDelta(code, stack);
    return;
  }

  if (trimmed.startsWith("end fork")) {
    popBlock(stack, "fork");
    applyBraceDelta(code, stack);
    return;
  }

  if (trimmed.startsWith("end split")) {
    popBlock(stack, "split");
    applyBraceDelta(code, stack);
    return;
  }

  if (trimmed.startsWith("end note")) {
    popBlock(stack, "note");
    applyBraceDelta(code, stack);
    return;
  }

  if (trimmed.startsWith("end ref")) {
    popBlock(stack, "ref");
    applyBraceDelta(code, stack);
    return;
  }

  if (trimmed.startsWith("end box") || trimmed === "endbox") {
    popBlock(stack, "box");
    applyBraceDelta(code, stack);
    return;
  }

  if (trimmed === "endif" || trimmed.startsWith("endif ")) {
    popBlock(stack, "if");
    applyBraceDelta(code, stack);
    return;
  }

  if (trimmed === "endwhile" || trimmed.startsWith("endwhile ")) {
    popBlock(stack, "while");
    applyBraceDelta(code, stack);
    return;
  }

  if (trimmed === "end" || trimmed.startsWith("end ")) {
    popSequenceBlock(stack);
    applyBraceDelta(code, stack);
    return;
  }

  if (startsBlock(trimmed, "if")) {
    stack.push({ kind: "if" });
  } else if (startsBlock(trimmed, "alt")) {
    stack.push({ kind: "alt" });
  } else if (startsBlock(trimmed, "loop")) {
    stack.push({ kind: "loop" });
  } else if (startsBlock(trimmed, "opt")) {
    stack.push({ kind: "opt" });
  } else if (startsBlock(trimmed, "par")) {
    stack.push({ kind: "par" });
  } else if (startsBlock(trimmed, "group")) {
    stack.push({ kind: "group" });
  } else if (startsBlock(trimmed, "critical")) {
    stack.push({ kind: "critical" });
  } else if (startsBlock(trimmed, "break")) {
    stack.push({ kind: "break" });
  } else if (trimmed === "fork" || trimmed.startsWith("fork ")) {
    if (!trimmed.startsWith("fork again")) {
      stack.push({ kind: "fork" });
    }
  } else if (trimmed === "split" || trimmed.startsWith("split ")) {
    if (!trimmed.startsWith("split again")) {
      stack.push({ kind: "split" });
    }
  } else if (startsBlock(trimmed, "while")) {
    stack.push({ kind: "while" });
  } else if (startsBlock(trimmed, "note") && !trimmed.startsWith("note on link")) {
    const isSingleLineNote = /:\s*\S/.test(trimmed);
    if (!isSingleLineNote) {
      stack.push({ kind: "note" });
    }
  } else if (startsBlock(trimmed, "box")) {
    stack.push({ kind: "box" });
  } else if (startsBlock(trimmed, "ref")) {
    stack.push({ kind: "ref" });
  }

  applyBraceDelta(code, stack);
}

function startsBlock(trimmedLine: string, keyword: string): boolean {
  return (
    trimmedLine === keyword ||
    trimmedLine.startsWith(`${keyword} `) ||
    trimmedLine.startsWith(`${keyword}(`)
  );
}

function popBlock(stack: BlockFrame[], kind: BlockKind): void {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].kind === kind) {
      stack.splice(index, 1);
      return;
    }
  }
}

function popSequenceBlock(stack: BlockFrame[]): void {
  const sequenceKinds: BlockKind[] = [
    "alt",
    "loop",
    "opt",
    "par",
    "group",
    "critical",
    "break",
  ];

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (sequenceKinds.includes(stack[index].kind)) {
      stack.splice(index, 1);
      return;
    }
  }
}

function applyBraceDelta(line: string, stack: BlockFrame[]): void {
  let inString = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (char === "'" && !inString) {
      break;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      stack.push({ kind: "brace" });
    } else if (char === "}") {
      popBlock(stack, "brace");
    }
  }
}

function stripLineComment(line: string): string {
  let inString = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (char === "'" && !inString) {
      return line.slice(0, index);
    }
  }

  return line;
}
