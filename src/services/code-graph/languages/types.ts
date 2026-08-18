import type {
  CodeCallEdge,
  CodeFileEntry,
  CodeFlowEdge,
  CodeFlowGraph,
  CodeFlowNode,
  CodeImportEdge,
  CodeNote,
  CodeSymbol,
} from "@/services/code-graph/ir/code-project-ir";

export interface ParsedFileResult {
  symbols: CodeSymbol[];
  imports: CodeImportEdge[];
  calls: CodeCallEdge[];
  notes: CodeNote[];
  flows: CodeFlowGraph[];
}

export interface LanguagePlugin {
  id: string;
  extensions: string[];
  parseFile(file: CodeFileEntry): ParsedFileResult;
}

let symbolCounter = 0;
let edgeCounter = 0;
let noteCounter = 0;
let flowNodeCounter = 0;

export function resetLanguageParseCounters(): void {
  symbolCounter = 0;
  edgeCounter = 0;
  noteCounter = 0;
  flowNodeCounter = 0;
}

export function createSymbolId(): string {
  symbolCounter += 1;
  return `sym-${symbolCounter}`;
}

export function createEdgeId(prefix: string): string {
  edgeCounter += 1;
  return `${prefix}-${edgeCounter}`;
}

export function createNoteId(): string {
  noteCounter += 1;
  return `note-${noteCounter}`;
}

export function createFlowNodeId(): string {
  flowNodeCounter += 1;
  return `flow-${flowNodeCounter}`;
}

export function extractDocstring(lines: string[], startIndex: number): string | null {
  const line = lines[startIndex]?.trim();
  if (!line) {
    return null;
  }

  if (line.startsWith('"""') || line.startsWith("'''")) {
    const quote = line.slice(0, 3);
    if (line.length > 6 && line.endsWith(quote)) {
      return line.slice(3, -3).trim();
    }

    const collected: string[] = [line.slice(3)];
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const current = lines[index];
      collected.push(current);
      if (current.includes(quote)) {
        const joined = collected.join("\n");
        return joined.slice(0, joined.lastIndexOf(quote)).trim();
      }
    }
  }

  return null;
}

export function extractLineComments(content: string, fileId: string): CodeNote[] {
  const notes: CodeNote[] = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
      notes.push({
        id: createNoteId(),
        fileId,
        text: trimmed.replace(/^(\/\/|#)\s?/, ""),
        kind: trimmed.toLowerCase().includes("todo") ? "todo" : "line",
        line: index + 1,
      });
    }
  });

  return notes;
}

export function buildSimpleFlowGraph(
  symbol: CodeSymbol,
  bodyLines: string[],
): CodeFlowGraph {
  const nodes: CodeFlowNode[] = [];
  const edges: CodeFlowEdge[] = [];

  const startId = createFlowNodeId();
  nodes.push({
    id: startId,
    symbolId: symbol.id,
    label: "start",
    kind: "start",
    line: symbol.lineStart,
  });

  let previousId = startId;

  bodyLines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
      return;
    }

    if (/^(if|elif|while|for)\b/.test(trimmed) || trimmed.startsWith("switch")) {
      const decisionId = createFlowNodeId();
      nodes.push({
        id: decisionId,
        symbolId: symbol.id,
        label: trimmed.slice(0, 48),
        kind: "decision",
        line: symbol.lineStart + index,
      });
      edges.push({
        id: createEdgeId("flow"),
        sourceId: previousId,
        targetId: decisionId,
      });
      previousId = decisionId;
      return;
    }

    if (/^(return|raise|throw|break|continue)\b/.test(trimmed)) {
      const actionId = createFlowNodeId();
      nodes.push({
        id: actionId,
        symbolId: symbol.id,
        label: trimmed.slice(0, 48),
        kind: "action",
        line: symbol.lineStart + index,
      });
      edges.push({
        id: createEdgeId("flow"),
        sourceId: previousId,
        targetId: actionId,
      });
      previousId = actionId;
      return;
    }

    const actionId = createFlowNodeId();
    nodes.push({
      id: actionId,
      symbolId: symbol.id,
      label: trimmed.slice(0, 48),
      kind: "action",
      line: symbol.lineStart + index,
    });
    edges.push({
      id: createEdgeId("flow"),
      sourceId: previousId,
      targetId: actionId,
    });
    previousId = actionId;
  });

  const endId = createFlowNodeId();
  nodes.push({
    id: endId,
    symbolId: symbol.id,
    label: "end",
    kind: "end",
    line: symbol.lineEnd,
  });
  edges.push({
    id: createEdgeId("flow"),
    sourceId: previousId,
    targetId: endId,
  });

  return { symbolId: symbol.id, nodes, edges };
}
