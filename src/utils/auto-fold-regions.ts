import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  canAddFold,
  sortRegions,
  type CodeFoldRegion,
} from "@/utils/code-folds";

export interface AutoFoldRegion extends CodeFoldRegion {
  auto: true;
}

interface BlockFrame {
  kind: string;
  startLine: number;
}

const PLANTUML_SEQUENCE_BLOCK_KINDS = new Set([
  "alt",
  "loop",
  "opt",
  "par",
  "group",
  "critical",
  "break",
]);

const MERMAID_BLOCK_STARTS: Array<{ kind: string; test: (line: string) => boolean }> = [
  { kind: "subgraph", test: (line) => /^\s*subgraph\b/i.test(line) },
  { kind: "alt", test: (line) => /^\s*alt\b/i.test(line) },
  { kind: "opt", test: (line) => /^\s*opt\b/i.test(line) },
  { kind: "loop", test: (line) => /^\s*loop\b/i.test(line) },
  { kind: "par", test: (line) => /^\s*par\b/i.test(line) },
  { kind: "critical", test: (line) => /^\s*critical\b/i.test(line) },
  { kind: "break", test: (line) => /^\s*break\b/i.test(line) },
  { kind: "if", test: (line) => /^\s*if\b/i.test(line) },
];

const GRAPHML_FOLD_TAGS = new Set([
  "graphml",
  "graph",
  "node",
  "edge",
  "hyperedge",
  "key",
  "data",
  "desc",
  "loc",
  "port",
  "endpoint",
  "default",
  "schema",
  "annotation",
  "extension",
]);

const GRAPHML_TAG_PATTERN = /<\s*\/?\s*([A-Za-z][\w:.-]*)\b[^>]*\/?>/g;

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

function startsBlock(trimmedLine: string, keyword: string): boolean {
  return (
    trimmedLine === keyword ||
    trimmedLine.startsWith(`${keyword} `) ||
    trimmedLine.startsWith(`${keyword}(`)
  );
}

function pushBlock(
  stack: BlockFrame[],
  kind: string,
  startLine: number,
): void {
  stack.push({ kind, startLine });
}

function popBlock(
  stack: BlockFrame[],
  kind: string,
  endLine: number,
  regions: AutoFoldRegion[],
): void {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].kind !== kind) {
      continue;
    }

    const frame = stack.splice(index, 1)[0];
    if (endLine > frame.startLine) {
      regions.push(createAutoFoldRegion(frame.startLine, endLine, kind));
    }
    return;
  }
}

function popSequenceBlock(
  stack: BlockFrame[],
  endLine: number,
  regions: AutoFoldRegion[],
): void {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (!PLANTUML_SEQUENCE_BLOCK_KINDS.has(stack[index].kind)) {
      continue;
    }

    const frame = stack.splice(index, 1)[0];
    if (endLine > frame.startLine) {
      regions.push(createAutoFoldRegion(frame.startLine, endLine, frame.kind));
    }
    return;
  }
}

function applyPlantUmlBraceDelta(
  line: string,
  lineNumber: number,
  stack: BlockFrame[],
  regions: AutoFoldRegion[],
): void {
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
      pushBlock(stack, "brace", lineNumber);
    } else if (char === "}") {
      popBlock(stack, "brace", lineNumber, regions);
    }
  }
}

function applyPlantUmlLine(
  rawLine: string,
  lineNumber: number,
  stack: BlockFrame[],
  regions: AutoFoldRegion[],
): void {
  const code = stripLineComment(rawLine);
  const trimmed = code.trim().toLowerCase();

  const startMatch = trimmed.match(/^@start([a-z0-9]+)\b/i);
  if (startMatch) {
    pushBlock(stack, `@start${startMatch[1].toLowerCase()}`, lineNumber);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  const endMatch = trimmed.match(/^@end([a-z0-9]+)\b/i);
  if (endMatch) {
    popBlock(stack, `@start${endMatch[1].toLowerCase()}`, lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (!trimmed) {
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed.startsWith("end fork")) {
    popBlock(stack, "fork", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed.startsWith("end split")) {
    popBlock(stack, "split", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed.startsWith("end note")) {
    popBlock(stack, "note", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed.startsWith("end ref")) {
    popBlock(stack, "ref", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed.startsWith("end legend")) {
    popBlock(stack, "legend", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed.startsWith("end map")) {
    popBlock(stack, "map", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed.startsWith("end box") || trimmed === "endbox") {
    popBlock(stack, "box", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed.startsWith("end repeat")) {
    popBlock(stack, "repeat", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed === "endswitch" || trimmed.startsWith("endswitch ")) {
    popBlock(stack, "switch", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed === "endif" || trimmed.startsWith("endif ")) {
    popBlock(stack, "if", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed === "endwhile" || trimmed.startsWith("endwhile ")) {
    popBlock(stack, "while", lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed === "end" || trimmed.startsWith("end ")) {
    popSequenceBlock(stack, lineNumber, regions);
    applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (startsBlock(trimmed, "if")) {
    pushBlock(stack, "if", lineNumber);
  } else if (startsBlock(trimmed, "alt")) {
    pushBlock(stack, "alt", lineNumber);
  } else if (startsBlock(trimmed, "loop")) {
    pushBlock(stack, "loop", lineNumber);
  } else if (startsBlock(trimmed, "opt")) {
    pushBlock(stack, "opt", lineNumber);
  } else if (startsBlock(trimmed, "par")) {
    pushBlock(stack, "par", lineNumber);
  } else if (startsBlock(trimmed, "group")) {
    pushBlock(stack, "group", lineNumber);
  } else if (startsBlock(trimmed, "critical")) {
    pushBlock(stack, "critical", lineNumber);
  } else if (startsBlock(trimmed, "break")) {
    pushBlock(stack, "break", lineNumber);
  } else if (trimmed === "fork" || trimmed.startsWith("fork ")) {
    if (!trimmed.startsWith("fork again")) {
      pushBlock(stack, "fork", lineNumber);
    }
  } else if (trimmed === "split" || trimmed.startsWith("split ")) {
    if (!trimmed.startsWith("split again")) {
      pushBlock(stack, "split", lineNumber);
    }
  } else if (startsBlock(trimmed, "while")) {
    pushBlock(stack, "while", lineNumber);
  } else if (startsBlock(trimmed, "repeat")) {
    pushBlock(stack, "repeat", lineNumber);
  } else if (startsBlock(trimmed, "switch")) {
    pushBlock(stack, "switch", lineNumber);
  } else if (startsBlock(trimmed, "legend") && !code.includes("{")) {
    pushBlock(stack, "legend", lineNumber);
  } else if (startsBlock(trimmed, "note") && !trimmed.startsWith("note on link")) {
    const isSingleLineNote = /:\s*\S/.test(trimmed);
    if (!isSingleLineNote) {
      pushBlock(stack, "note", lineNumber);
    }
  } else if (startsBlock(trimmed, "box")) {
    pushBlock(stack, "box", lineNumber);
  } else if (startsBlock(trimmed, "ref")) {
    pushBlock(stack, "ref", lineNumber);
  }

  applyPlantUmlBraceDelta(code, lineNumber, stack, regions);
}

function detectPlantUmlFoldRegions(lines: string[]): AutoFoldRegion[] {
  const stack: BlockFrame[] = [];
  const regions: AutoFoldRegion[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    applyPlantUmlLine(lines[index] ?? "", index + 1, stack, regions);
  }

  return regions;
}

function applyMermaidBraceDelta(
  line: string,
  lineNumber: number,
  stack: BlockFrame[],
  regions: AutoFoldRegion[],
): void {
  let inString = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      pushBlock(stack, "brace", lineNumber);
    } else if (char === "}") {
      popBlock(stack, "brace", lineNumber, regions);
    }
  }
}

function applyMermaidLine(
  rawLine: string,
  lineNumber: number,
  stack: BlockFrame[],
  regions: AutoFoldRegion[],
): void {
  const code = stripLineComment(rawLine);
  const trimmed = code.trim().toLowerCase();

  if (!trimmed || trimmed.startsWith("%%")) {
    applyMermaidBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed === "endif" || trimmed.startsWith("endif ")) {
    popBlock(stack, "if", lineNumber, regions);
    applyMermaidBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  if (trimmed === "end" || trimmed.startsWith("end ")) {
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      const kind = stack[index].kind;
      if (kind === "if" || kind === "brace") {
        continue;
      }

      const frame = stack.splice(index, 1)[0];
      if (lineNumber > frame.startLine) {
        regions.push(createAutoFoldRegion(frame.startLine, lineNumber, frame.kind));
      }
      applyMermaidBraceDelta(code, lineNumber, stack, regions);
      return;
    }

    applyMermaidBraceDelta(code, lineNumber, stack, regions);
    return;
  }

  for (const blockStart of MERMAID_BLOCK_STARTS) {
    if (blockStart.test(code)) {
      pushBlock(stack, blockStart.kind, lineNumber);
      applyMermaidBraceDelta(code, lineNumber, stack, regions);
      return;
    }
  }

  applyMermaidBraceDelta(code, lineNumber, stack, regions);
}

function detectMermaidFoldRegions(lines: string[]): AutoFoldRegion[] {
  const stack: BlockFrame[] = [];
  const regions: AutoFoldRegion[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    applyMermaidLine(lines[index] ?? "", index + 1, stack, regions);
  }

  return regions;
}

function isSelfClosingTag(tagText: string): boolean {
  return /\/>\s*$/.test(tagText);
}

function getGraphmlLocalTagName(tagName: string): string {
  const lower = tagName.toLowerCase();
  return lower.includes(":") ? lower.split(":").pop() ?? lower : lower;
}

function detectGraphmlFoldRegions(lines: string[]): AutoFoldRegion[] {
  const stack: Array<{ tag: string; startLine: number }> = [];
  const regions: AutoFoldRegion[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? "";
    const matches = [...line.matchAll(GRAPHML_TAG_PATTERN)];

    for (const match of matches) {
      const rawTag = match[0];
      const localName = getGraphmlLocalTagName(match[1] ?? "");

      if (!GRAPHML_FOLD_TAGS.has(localName)) {
        continue;
      }

      if (rawTag.startsWith("</")) {
        for (let stackIndex = stack.length - 1; stackIndex >= 0; stackIndex -= 1) {
          const frame = stack[stackIndex];
          if (frame.tag !== localName) {
            continue;
          }

          stack.splice(stackIndex);
          if (lineNumber > frame.startLine) {
            regions.push(createAutoFoldRegion(frame.startLine, lineNumber, localName));
          }
          break;
        }
        continue;
      }

      if (isSelfClosingTag(rawTag)) {
        continue;
      }

      stack.push({ tag: localName, startLine: lineNumber });
    }
  }

  return regions;
}

function createAutoFoldRegion(
  startLine: number,
  endLine: number,
  label: string,
): AutoFoldRegion {
  return {
    id: `auto-${label}-${startLine}-${endLine}`,
    startLine,
    endLine,
    collapsed: false,
    label,
    auto: true,
  };
}

function mergeAutoFoldRegions(regions: AutoFoldRegion[]): AutoFoldRegion[] {
  const merged: CodeFoldRegion[] = [];

  for (const region of sortRegions(regions)) {
    if (canAddFold(merged, region.startLine, region.endLine)) {
      merged.push(region);
    }
  }

  return merged as AutoFoldRegion[];
}

export function detectAutoFoldRegions(
  source: string,
  format: DiagramFormat,
): AutoFoldRegion[] {
  const lines = source.split(/\r?\n/);
  if (lines.length <= 1) {
    return [];
  }

  let regions: AutoFoldRegion[] = [];

  switch (format) {
    case "plantuml":
      regions = detectPlantUmlFoldRegions(lines);
      break;
    case "mermaid":
      regions = detectMermaidFoldRegions(lines);
      break;
    case "graphml":
      regions = detectGraphmlFoldRegions(lines);
      break;
    default:
      return [];
  }

  return mergeAutoFoldRegions(regions);
}

export function applyAutoFoldCollapsedState(
  regions: AutoFoldRegion[],
  collapsedState: Map<string, boolean>,
): AutoFoldRegion[] {
  return regions.map((region) => {
    const key = `${region.startLine}-${region.endLine}-${region.label ?? ""}`;
    const collapsed = collapsedState.get(key);
    if (collapsed === undefined) {
      return region;
    }

    return {
      ...region,
      collapsed,
    };
  });
}

export function getAutoFoldStateKey(region: Pick<CodeFoldRegion, "startLine" | "endLine" | "label">): string {
  return `${region.startLine}-${region.endLine}-${region.label ?? ""}`;
}
