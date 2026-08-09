import type { DiagramFormat } from "@/constants/diagram-formats";
import { validateGraphmlSyntax } from "@/services/graphml/syntax-validation";
import { renderGraphmlHighlightedLine } from "@/utils/graphml-highlight";
import type {
  CompletionItem,
  CompletionPrefixInfo,
  CompletionQuery,
} from "@/utils/completion-types";
import { mermaidFormatHandler } from "./mermaid/handler";
import { plantUmlFormatHandler } from "./plantuml/handler";
import type { FormatHandler, SyntaxValidationContext } from "./types";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

const emptyCompletionPrefix = (column: number): CompletionPrefixInfo => ({
  prefix: "",
  replaceStart: column,
  mode: "word",
});

const graphmlFormatHandler: FormatHandler = {
  id: "graphml",
  supportsSyntaxValidation: true,
  validate(source: string) {
    const result = validateGraphmlSyntax(source);
    return {
      valid: result.valid,
      errors: result.issues
        .map((issue) => issue.message)
        .filter((message): message is string => Boolean(message)),
      errorLines: result.issues
        .map((issue) => issue.line)
        .filter((line): line is number => line !== undefined),
    };
  },
  async validateSyntax(source) {
    return validateGraphmlSyntax(source);
  },
  highlightLine(line: string) {
    return renderGraphmlHighlightedLine(line);
  },
  extractCompletionPrefix(_line, column) {
    return emptyCompletionPrefix(column);
  },
  getCompletions(): CompletionItem[] {
    return [];
  },
};

const handlers: Record<DiagramFormat, FormatHandler> = {
  plantuml: plantUmlFormatHandler,
  mermaid: mermaidFormatHandler,
  graphml: graphmlFormatHandler,
};

export function getFormatHandler(format: DiagramFormat): FormatHandler {
  return handlers[format];
}

export async function validateDiagramSyntax(
  format: DiagramFormat,
  source: string,
  context: SyntaxValidationContext,
): Promise<SyntaxCheckResult> {
  const handler = getFormatHandler(format);
  if (!handler.supportsSyntaxValidation) {
    return { valid: true, issues: [] };
  }

  return handler.validateSyntax(source, context);
}

export function extractDiagramCompletionPrefix(
  format: DiagramFormat,
  line: string,
  column: number,
): CompletionPrefixInfo {
  return getFormatHandler(format).extractCompletionPrefix(line, column);
}

export function getDiagramCompletions(
  format: DiagramFormat,
  query: CompletionQuery,
): CompletionItem[] {
  return getFormatHandler(format).getCompletions(query);
}

export { plantUmlFormatHandler, mermaidFormatHandler, graphmlFormatHandler };
export type {
  FormatHandler,
  SyntaxValidationContext,
  ValidationResult,
} from "./types";
