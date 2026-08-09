import { validateGraphmlSyntax } from "@/services/graphml/syntax-validation";
import { renderGraphmlToSvg } from "@/services/graphml/graphml-engine";
import { renderGraphmlHighlightedLine } from "@/utils/graphml-highlight";
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

export const graphmlFormatHandler: FormatHandler = {
  id: "graphml",
  supportsSyntaxValidation: true,
  supportsOnlineRender: false,
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
  isEngineReady() {
    return true;
  },
  async bootEngine() {
    // GraphML renders synchronously without a boot step.
  },
  async render(source, context) {
    return renderGraphmlToSvg(source, { dark: context.diagramDarkMode });
  },
};
