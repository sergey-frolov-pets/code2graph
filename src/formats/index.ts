import type { DiagramFormat } from "@/constants/diagram-formats";
import { graphmlFormatHandler } from "./graphml/handler";
import { mermaidFormatHandler } from "./mermaid/handler";
import { plantUmlFormatHandler } from "./plantuml/handler";
import type { FormatContext, FormatHandler } from "./types";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

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
  context: FormatContext,
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
) {
  return getFormatHandler(format).extractCompletionPrefix(line, column);
}

export function getDiagramCompletions(
  format: DiagramFormat,
  query: Parameters<FormatHandler["getCompletions"]>[0],
) {
  return getFormatHandler(format).getCompletions(query);
}

export async function renderDiagram(
  format: DiagramFormat,
  source: string,
  context: FormatContext,
): Promise<string> {
  return getFormatHandler(format).render(source, context);
}

export async function bootFormatEngine(
  format: DiagramFormat,
  context: FormatContext,
): Promise<void> {
  await getFormatHandler(format).bootEngine(context);
}

export function isFormatEngineReady(
  format: DiagramFormat,
  context: FormatContext,
): boolean {
  return getFormatHandler(format).isEngineReady(context);
}

export {
  plantUmlFormatHandler,
  mermaidFormatHandler,
  graphmlFormatHandler,
};
export type {
  FormatHandler,
  FormatContext,
  SyntaxValidationContext,
  ValidationResult,
} from "./types";
