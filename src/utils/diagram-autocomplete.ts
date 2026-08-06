import type { DiagramFormat } from "@/constants/diagram-formats";
import type { CompletionItem, CompletionQuery } from "@/utils/completion-types";
import {
  extractMermaidCompletionPrefix,
  getMermaidCompletions,
} from "@/utils/mermaid-autocomplete";
import {
  extractCompletionPrefix,
  getCompletions as getPlantUmlCompletions,
} from "@/utils/plantuml-autocomplete";

export type {
  CompletionItem,
  CompletionKind,
  CompletionPrefixInfo,
  CompletionQuery,
} from "@/utils/completion-types";

export function extractDiagramCompletionPrefix(
  format: DiagramFormat,
  line: string,
  column: number,
) {
  if (format === "mermaid") {
    return extractMermaidCompletionPrefix(line, column);
  }

  return extractCompletionPrefix(line, column);
}

export function getDiagramCompletions(
  format: DiagramFormat,
  query: CompletionQuery,
): CompletionItem[] {
  if (format === "mermaid") {
    return getMermaidCompletions(query);
  }

  if (format === "plantuml") {
    return getPlantUmlCompletions(query);
  }

  return [];
}
