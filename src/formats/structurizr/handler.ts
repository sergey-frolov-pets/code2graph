import {
  bootStructurizr,
  isStructurizrReady,
  renderStructurizrToSvg,
} from "@/services/structurizr/structurizr-engine";
import { validateStructurizrSyntax } from "@/services/structurizr/syntax-validation";
import { renderStructurizrHighlightedLine } from "@/utils/structurizr-highlight";
import type {
  CompletionItem,
  CompletionPrefixInfo,
} from "@/utils/completion-types";
import type { FormatHandler } from "../types";

const emptyCompletionPrefix = (column: number): CompletionPrefixInfo => ({
  prefix: "",
  replaceStart: column,
  mode: "word",
});

export const structurizrFormatHandler: FormatHandler = {
  id: "structurizr",
  supportsSyntaxValidation: true,
  supportsOnlineRender: false,
  validate(source: string) {
    const trimmed = source.trim();
    if (!trimmed) {
      return { valid: false, errors: [], errorLines: [] };
    }

    return { valid: true, errors: [] };
  },
  async validateSyntax(source) {
    return validateStructurizrSyntax(source);
  },
  highlightLine(line: string) {
    return renderStructurizrHighlightedLine(line);
  },
  extractCompletionPrefix(_line, column) {
    return emptyCompletionPrefix(column);
  },
  getCompletions(): CompletionItem[] {
    return [];
  },
  isEngineReady() {
    return isStructurizrReady();
  },
  async bootEngine() {
    await bootStructurizr();
  },
  async render(source, context) {
    return renderStructurizrToSvg(source, {
      dark: context.diagramDarkMode,
      layout: context.layout,
    });
  },
};
