import { isOnlineRenderMode } from "@/constants/render-settings";
import {
  isMermaidReady,
  renderMermaidToSvg,
  waitForMermaidReady,
} from "@/services/mermaid/mermaid-engine";
import { validateMermaidSyntax } from "@/services/mermaid/syntax-validation";
import { checkMermaidSyntax } from "@/utils/mermaid-syntax";
import { renderMermaidHighlightedLine } from "@/utils/mermaid-highlight";
import {
  extractMermaidCompletionPrefix,
  getMermaidCompletions,
} from "@/utils/mermaid-autocomplete";
import type { FormatHandler } from "../types";

export const mermaidFormatHandler: FormatHandler = {
  id: "mermaid",
  supportsSyntaxValidation: true,
  supportsOnlineRender: true,
  validate(source: string) {
    const result = checkMermaidSyntax(source);
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
  validateSyntax(source, context) {
    return validateMermaidSyntax(
      source,
      context.diagramDarkMode,
      context.renderMode,
    );
  },
  highlightLine(line: string) {
    return renderMermaidHighlightedLine(line);
  },
  extractCompletionPrefix(line, column) {
    return extractMermaidCompletionPrefix(line, column);
  },
  getCompletions(query) {
    return getMermaidCompletions(query);
  },
  isEngineReady(context) {
    if (isOnlineRenderMode(context.renderMode)) {
      return true;
    }

    return isMermaidReady();
  },
  async bootEngine(context) {
    if (isOnlineRenderMode(context.renderMode)) {
      void waitForMermaidReady(context.diagramDarkMode);
      return;
    }

    await waitForMermaidReady(context.diagramDarkMode);
  },
  async render(source, context) {
    return renderMermaidToSvg(
      source,
      { dark: context.diagramDarkMode },
      context.renderMode,
    );
  },
};
