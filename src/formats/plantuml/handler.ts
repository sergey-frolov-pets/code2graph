import {
  isEngineReady,
  renderPlantUmlToSvg,
  waitForEngineReady,
} from "@/services/plantuml/plantuml-engine";
import { validatePlantUmlSyntax } from "@/services/plantuml/syntax-validation";
import { isOnlineRenderMode } from "@/constants/render-settings";
import { checkPlantUmlSyntax } from "@/utils/plantuml-syntax";
import { renderHighlightedLine } from "@/utils/plantuml-highlight";
import {
  extractCompletionPrefix,
  getCompletions as getPlantUmlCompletions,
} from "@/utils/plantuml-autocomplete";
import {
  preparePlantUmlSource,
  splitSourceLines,
} from "@/utils/plantuml-source";
import type { FormatHandler } from "../types";

export const plantUmlFormatHandler: FormatHandler = {
  id: "plantuml",
  supportsSyntaxValidation: true,
  supportsOnlineRender: true,
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
  isEngineReady(context) {
    if (isOnlineRenderMode(context.renderMode)) {
      return navigator.onLine;
    }

    return isEngineReady();
  },
  async bootEngine(context) {
    if (isOnlineRenderMode(context.renderMode)) {
      return;
    }

    await waitForEngineReady();
  },
  async render(source, context) {
    const prepared = await preparePlantUmlSource(source, context.layout);
    const lines = splitSourceLines(prepared);
    return renderPlantUmlToSvg(
      lines,
      { dark: context.diagramDarkMode },
      context.renderMode,
    );
  },
};
