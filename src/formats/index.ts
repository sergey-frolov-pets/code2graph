import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { d2FormatHandler } from "./d2/handler";
import { graphmlFormatHandler } from "./graphml/handler";
import { mermaidFormatHandler } from "./mermaid/handler";
import { plantUmlFormatHandler } from "./plantuml/handler";
import { structurizrFormatHandler } from "./structurizr/handler";
import { wiremarkFormatHandler } from "./wiremark/handler";
import { getLanguageModule } from "@/languages/registry";
import { applyDiagramAppearance } from "@/services/diagram-appearance";
import { applyDiagramTypography } from "@/services/diagram-typography";
import { fitPlantUmlSvgText } from "@/services/plantuml/plantuml-text-fit";
import { normalizeSvgPaintColors } from "@/services/export/svg-paint";
import { stripPresentationBlock } from "@/services/presentation/codec";
import { stripOffDeviceSvgResources } from "@/utils/offline-render-network";
import type { FormatContext, FormatHandler } from "./types";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

export function getFormatHandler(format: DiagramFormat): FormatHandler {
  return getLanguageModule(format).handler;
}

export async function validateDiagramSyntax(
  format: DiagramFormat,
  source: string,
  context: FormatContext,
): Promise<SyntaxCheckResult> {
  const handler = getFormatHandler(format);
  if (!handler.supportsSyntaxValidation) {
    return { valid: true, issues: [] };
  }

  return handler.validateSyntax(stripPresentationBlock(source), context);
}

export function extractDiagramCompletionPrefix(
  format: DiagramFormat,
  line: string,
  column: number,
) {
  return getFormatHandler(format).extractCompletionPrefix(line, column);
}

export function getDiagramCompletions(
  format: DiagramFormat,
  query: Parameters<FormatHandler["getCompletions"]>[0],
) {
  return getFormatHandler(format).getCompletions(query);
}

export async function renderDiagram(
  format: DiagramFormat,
  source: string,
  context: FormatContext,
): Promise<string> {
  const svg = normalizeSvgPaintColors(
    await getFormatHandler(format).render(stripPresentationBlock(source), context),
  );
  const painted = applyDiagramTypography(svg, {
    fontFamily: context.diagramFontFamily,
    fontWeight: context.diagramFontWeight,
    fontStyle: context.diagramFontStyle,
  });
  const fitted =
    format === "plantuml" || format === "structurizr"
      ? fitPlantUmlSvgText(painted)
      : painted;
  const stripped = stripOffDeviceSvgResources(fitted);
  // Mermaid уже красит подписи в своём движке. Повторный проход задел бы
  // серии расширений, у которых текст специально лежит на цветной фигуре.
  if (format === "mermaid") return stripped;
  return applyDiagramAppearance(stripped, {
    background: context.diagramBackground,
    textColor: context.diagramTextColor,
  });
}

export async function bootFormatEngine(
  format: DiagramFormat,
  context: FormatContext,
): Promise<void> {
  await getFormatHandler(format).bootEngine(context);
}

export function isFormatEngineReady(
  format: DiagramFormat,
  context: FormatContext,
): boolean {
  return getFormatHandler(format).isEngineReady(context);
}

export {
  plantUmlFormatHandler,
  mermaidFormatHandler,
  graphmlFormatHandler,
  wiremarkFormatHandler,
  d2FormatHandler,
  structurizrFormatHandler,
};
export type {
  FormatHandler,
  FormatContext,
  SyntaxValidationContext,
  ValidationResult,
} from "./types";
