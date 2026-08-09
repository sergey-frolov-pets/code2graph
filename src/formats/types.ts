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

export interface SyntaxValidationContext {
  layout: LayoutEngine;
  diagramDarkMode: boolean;
  renderMode: RenderMode;
}

export interface FormatHandler {
  id: DiagramFormat;
  supportsSyntaxValidation: boolean;
  validate(source: string): ValidationResult;
  validateSyntax(
    source: string,
    context: SyntaxValidationContext,
  ): Promise<SyntaxCheckResult>;
  highlightLine(line: string): string;
  extractCompletionPrefix(line: string, column: number): CompletionPrefixInfo;
  getCompletions(query: CompletionQuery): CompletionItem[];
}
