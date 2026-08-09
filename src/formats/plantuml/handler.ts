import { validatePlantUmlSyntax } from "@/services/plantuml/syntax-validation";
import { checkPlantUmlSyntax } from "@/utils/plantuml-syntax";
import { renderHighlightedLine } from "@/utils/plantuml-highlight";
import {
  extractCompletionPrefix,
  getCompletions as getPlantUmlCompletions,
} from "@/utils/plantuml-autocomplete";
import type { FormatHandler } from "../types";

export const plantUmlFormatHandler: FormatHandler = {
  id: "plantuml",
  supportsSyntaxValidation: true,
  validate(source: string) {
    const result = checkPlantUmlSyntax(source);
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
    return validatePlantUmlSyntax(
      source,
      context.layout,
      context.diagramDarkMode,
      context.renderMode,
    );
  },
  highlightLine(line: string) {
    return renderHighlightedLine(line);
  },
  extractCompletionPrefix(line, column) {
    return extractCompletionPrefix(line, column);
  },
  getCompletions(query) {
    return getPlantUmlCompletions(query);
  },
};
