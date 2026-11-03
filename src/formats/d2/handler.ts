import { isD2Ready, bootD2, renderD2ToSvg } from "@/services/d2/d2-engine";
import { validateD2Syntax } from "@/services/d2/syntax-validation";
import { renderD2HighlightedLine } from "@/utils/d2-highlight";
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

export const d2FormatHandler: FormatHandler = {
  id: "d2",
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
    return validateD2Syntax(source);
  },
  highlightLine(line: string) {
    return renderD2HighlightedLine(line);
  },
  extractCompletionPrefix(_line, column) {
    return emptyCompletionPrefix(column);
  },
  getCompletions(): CompletionItem[] {
    return [];
  },
  isEngineReady() {
    return isD2Ready();
  },
  async bootEngine() {
    await bootD2();
  },
  async render(source, context) {
    return renderD2ToSvg(source, { dark: context.diagramDarkMode });
  },
};
