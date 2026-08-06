export const MIN_COMPLETION_PREFIX_LENGTH = 2;
export const MAX_COMPLETION_ITEMS = 15;

export type CompletionKind =
  | "keyword"
  | "context"
  | "directive"
  | "preprocessor"
  | "color"
  | "swimlane"
  | "c4"
  | "mermaid";

export interface CompletionItem {
  label: string;
  insertText: string;
  kind: CompletionKind;
  detailKey?: string;
}

export type CompletionPrefixMode =
  | "word"
  | "named-color"
  | "hex"
  | "swimlane"
  | "swimlane-hex";

export interface CompletionPrefixInfo {
  prefix: string;
  replaceStart: number;
  mode: CompletionPrefixMode;
}

export interface CompletionQuery {
  lines: string[];
  lineNumber: number;
  column: number;
  prefix: string;
  prefixInfo: CompletionPrefixInfo;
}
