import { checkMermaidSyntax } from "@/utils/mermaid-syntax";
import { renderMermaidHighlightedLine } from "@/utils/mermaid-highlight";
import type { FormatHandler } from "../types";

export const mermaidFormatHandler: FormatHandler = {
  id: "mermaid",
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
  highlight(source: string) {
    return source
      .split("\n")
      .map((line) => renderMermaidHighlightedLine(line))
      .join("\n");
  },
};
