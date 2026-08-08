import type { DiagramFormat } from "@/constants/diagram-formats";
import { validateGraphmlSyntax } from "@/services/graphml/syntax-validation";
import { renderGraphmlHighlightedLine } from "@/utils/graphml-highlight";
import { mermaidFormatHandler } from "./mermaid/handler";
import { plantUmlFormatHandler } from "./plantuml/handler";
import type { FormatHandler } from "./types";

const graphmlFormatHandler: FormatHandler = {
  id: "graphml",
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
  highlight(source: string) {
    return source
      .split("\n")
      .map((line) => renderGraphmlHighlightedLine(line))
      .join("\n");
  },
};

const handlers: Record<DiagramFormat, FormatHandler> = {
  plantuml: plantUmlFormatHandler,
  mermaid: mermaidFormatHandler,
  graphml: graphmlFormatHandler,
};

export function getFormatHandler(format: DiagramFormat): FormatHandler {
  return handlers[format];
}

export { plantUmlFormatHandler, mermaidFormatHandler, graphmlFormatHandler };
