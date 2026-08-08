import type { DiagramFormat } from "@/constants/diagram-formats";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  errorLines?: number[];
}

export interface HighlightToken {
  text: string;
  className?: string;
}

export interface CompletionItem {
  label: string;
  insertText: string;
  detail?: string;
}

export interface RenderOptions {
  layout: string;
  renderMode: string;
  diagramDarkMode: boolean;
}

export interface FormatHandler {
  id: DiagramFormat;
  validate(source: string): Promise<ValidationResult> | ValidationResult;
  highlight(source: string): string;
}
