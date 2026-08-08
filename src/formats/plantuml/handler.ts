import { checkPlantUmlSyntax } from "@/utils/plantuml-syntax";
import { renderHighlightedLine } from "@/utils/plantuml-highlight";
import type { FormatHandler } from "../types";

export const plantUmlFormatHandler: FormatHandler = {
  id: "plantuml",
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
  highlight(source: string) {
    return source
      .split("\n")
      .map((line) => renderHighlightedLine(line))
      .join("\n");
  },
};
