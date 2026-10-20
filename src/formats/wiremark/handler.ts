import { validateWiremarkSyntax } from "@/services/wiremark/syntax-validation";
import { renderWiremarkToSvg } from "@/services/wiremark/wiremark-engine";
import { renderWiremarkHighlightedLine } from "@/utils/wiremark-highlight";
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

export const wiremarkFormatHandler: FormatHandler = {
  id: "wiremark",
  supportsSyntaxValidation: true,
  supportsOnlineRender: false,
  validate(source: string) {
    const result = validateWiremarkSyntax(source);
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
    return validateWiremarkSyntax(source);
  },
  highlightLine(line: string) {
    return renderWiremarkHighlightedLine(line);
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
    // WireMark renders synchronously in @wiremark/core.
  },
  async render(source, context) {
    return renderWiremarkToSvg(source, { dark: context.diagramDarkMode });
  },
};
