import type { LayoutEngine } from "@/constants";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { RenderMode } from "@/constants/render-settings";
import type {
  CompletionItem,
  CompletionPrefixInfo,
  CompletionQuery,
} from "@/utils/completion-types";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  errorLines?: number[];
}

export interface FormatContext {
  layout: LayoutEngine;
  diagramDarkMode: boolean;
  renderMode: RenderMode;
}

/** @deprecated Use FormatContext */
export type SyntaxValidationContext = FormatContext;

export interface FormatHandler {
  id: DiagramFormat;
  supportsSyntaxValidation: boolean;
  supportsOnlineRender: boolean;
  validate(source: string): ValidationResult;
  validateSyntax(
    source: string,
    context: FormatContext,
  ): Promise<SyntaxCheckResult>;
  highlightLine(line: string): string;
  extractCompletionPrefix(line: string, column: number): CompletionPrefixInfo;
  getCompletions(query: CompletionQuery): CompletionItem[];
  isEngineReady(context: FormatContext): boolean;
  bootEngine(context: FormatContext): Promise<void>;
  render(source: string, context: FormatContext): Promise<string>;
}
