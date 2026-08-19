import type { CodeGraphSourceKind } from "@/constants/code-graph";

export const CODE_PROJECT_IR_VERSION = 1 as const;

export type CodeSymbolKind =
  | "module"
  | "class"
  | "interface"
  | "function"
  | "method"
  | "variable"
  | "htmlElement";

export type CodeNoteKind =
  | "docstring"
  | "jsdoc"
  | "line"
  | "region"
  | "todo";

export interface CodeFileEntry {
  id: string;
  path: string;
  relativePath: string;
  language: string;
  content: string;
}

export interface CodeSymbol {
  id: string;
  fileId: string;
  name: string;
  kind: CodeSymbolKind;
  parentId?: string;
  lineStart: number;
  lineEnd: number;
  extends?: string[];
  implements?: string[];
  members?: string[];
  metadata?: Record<string, unknown>;
}

export interface CodeImportEdge {
  id: string;
  sourceFileId: string;
  target: string;
  resolvedFileId?: string;
  line: number;
}

export interface CodeCallEdge {
  id: string;
  sourceSymbolId: string;
  targetName: string;
  targetSymbolId?: string;
  line: number;
}

export interface CodeNote {
  id: string;
  fileId: string;
  symbolId?: string;
  text: string;
  kind: CodeNoteKind;
  line: number;
}

export interface CodeFlowNode {
  id: string;
  symbolId: string;
  label: string;
  kind: "start" | "end" | "action" | "decision" | "merge";
  line: number;
}

export interface CodeFlowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface CodeFlowGraph {
  symbolId: string;
  nodes: CodeFlowNode[];
  edges: CodeFlowEdge[];
}

export interface CodeProjectIR {
  version: typeof CODE_PROJECT_IR_VERSION;
  rootName: string;
  sourceKind: CodeGraphSourceKind;
  files: CodeFileEntry[];
  symbols: CodeSymbol[];
  imports: CodeImportEdge[];
  calls: CodeCallEdge[];
  notes: CodeNote[];
  flows: CodeFlowGraph[];
  metadata: {
    parsedAt: string;
    languages: string[];
  };
}

export interface ProjectTreeNode {
  id: string;
  label: string;
  kind: "project" | "folder" | "file" | "module" | "symbol";
  path?: string;
  fileId?: string;
  symbolId?: string;
  children: ProjectTreeNode[];
  checked: boolean;
  indeterminate: boolean;
  depth: number;
}

export function createEmptyCodeProjectIR(
  rootName: string,
  sourceKind: CodeGraphSourceKind,
): CodeProjectIR {
  return {
    version: CODE_PROJECT_IR_VERSION,
    rootName,
    sourceKind,
    files: [],
    symbols: [],
    imports: [],
    calls: [],
    notes: [],
    flows: [],
    metadata: {
      parsedAt: new Date().toISOString(),
      languages: [],
    },
  };
}
