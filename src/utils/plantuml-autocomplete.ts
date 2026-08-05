export const MIN_COMPLETION_PREFIX_LENGTH = 2;
export const MAX_COMPLETION_ITEMS = 12;

export type CompletionKind = "keyword" | "context" | "directive" | "preprocessor";

export interface CompletionItem {
  label: string;
  insertText: string;
  kind: CompletionKind;
  detailKey?: string;
}

export interface CompletionQuery {
  lines: string[];
  lineNumber: number;
  column: number;
  prefix: string;
}

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
  { label: "Container", insertText: "Container(", kind: "keyword" },
  { label: "ContainerDb", insertText: "ContainerDb(", kind: "keyword" },
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
  { label: "Person", insertText: "Person(", kind: "keyword" },
  { label: "queue", insertText: "queue ", kind: "keyword" },
  { label: "rectangle", insertText: "rectangle ", kind: "keyword" },
  { label: "ref", insertText: "ref ", kind: "keyword" },
  { label: "Rel", insertText: "Rel(", kind: "keyword" },
  { label: "skinparam", insertText: "skinparam ", kind: "keyword" },
  { label: "split", insertText: "split", kind: "keyword", detailKey: "editor.completion.split" },
  { label: "split again", insertText: "split again", kind: "keyword", detailKey: "editor.completion.splitAgain" },
  { label: "start", insertText: "start", kind: "keyword" },
  { label: "state", insertText: "state ", kind: "keyword" },
  { label: "stop", insertText: "stop", kind: "keyword" },
  { label: "System_Boundary", insertText: "System_Boundary(", kind: "keyword" },
  { label: "then", insertText: "then ()", kind: "keyword" },
  { label: "title", insertText: "title ", kind: "keyword" },
  { label: "usecase", insertText: "usecase ", kind: "keyword" },
  { label: "while", insertText: "while ()", kind: "keyword", detailKey: "editor.completion.while" },
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

export function extractWordPrefix(line: string, column: number): string {
  const before = line.slice(0, column);
  const match = before.match(/[@!]?[A-Za-z_][\w-]*$/);
  return match?.[0] ?? "";
}

export function isNewLineContext(line: string, column: number, prefix: string): boolean {
  const beforePrefix = line.slice(0, Math.max(0, column - prefix.length));
  return beforePrefix.trim().length === 0;
}

export function getCompletions(query: CompletionQuery): CompletionItem[] {
  const results: CompletionItem[] = [];
  const seen = new Set<string>();
  const normalizedPrefix = query.prefix.toLowerCase();
  const onNewLine = isNewLineContext(
    query.lines[query.lineNumber - 1] ?? "",
    query.column,
    query.prefix,
  );

  if (onNewLine) {
    const openBlocks = analyzeOpenBlocks(
      query.lines,
      query.lineNumber,
      query.column - query.prefix.length,
    );

    for (let index = openBlocks.length - 1; index >= 0; index -= 1) {
      for (const item of CONTEXT_CLOSERS[openBlocks[index].kind]) {
        if (seen.has(item.label)) {
          continue;
        }

        if (
          normalizedPrefix.length === 0 ||
          item.label.toLowerCase().startsWith(normalizedPrefix)
        ) {
          seen.add(item.label);
          results.push(item);
        }
      }
    }
  }

  if (normalizedPrefix.length >= MIN_COMPLETION_PREFIX_LENGTH) {
    for (const item of VOCABULARY) {
      if (seen.has(item.label)) {
        continue;
      }

      if (item.label.toLowerCase().startsWith(normalizedPrefix)) {
        seen.add(item.label);
        results.push(item);
      }
    }
  }

  return results.slice(0, MAX_COMPLETION_ITEMS);
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
