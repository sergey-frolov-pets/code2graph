import type { LayoutEngine } from "@/constants";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { RenderMode } from "@/constants/render-settings";
import { getFormatHandler } from "@/formats";
import {
  parseAndValidateLlmOutput,
  type LlmPlantUmlValidationResult,
} from "@/utils/validate-llm-plantuml";

export async function validateLlmRegisteredFormat(
  format: DiagramFormat,
  raw: string,
  layout: LayoutEngine,
  darkMode: boolean,
  renderMode: RenderMode,
): Promise<LlmPlantUmlValidationResult> {
  const parsed = parseAndValidateLlmOutput(raw);
  if (!parsed.valid || !parsed.plantuml) {
    return parsed;
  }

  const context = {
    layout,
    diagramDarkMode: darkMode,
    renderMode,
  };
  const handler = getFormatHandler(format);
  const syntax = await handler.validateSyntax(parsed.plantuml, context);
  const errors = syntax.issues.filter((issue) => issue.severity !== "warning");

  if (!syntax.valid || errors.length > 0) {
    return {
      valid: false,
      issues:
        errors.length > 0
          ? errors.map((issue) => ({
              layer: "engine" as const,
              message: issue.message ?? issue.messageKey ?? "Syntax error",
              line: issue.line,
            }))
          : [{ layer: "engine" as const, message: "Syntax error" }],
      output: parsed.output,
      plantuml: parsed.plantuml,
    };
  }

  try {
    if (!handler.isEngineReady(context)) {
      await handler.bootEngine(context);
    }
    await handler.render(parsed.plantuml, context);
  } catch (error) {
    return {
      valid: false,
      issues: [
        {
          layer: "engine",
          message: error instanceof Error ? error.message : "Render failed",
        },
      ],
      output: parsed.output,
      plantuml: parsed.plantuml,
    };
  }

  return parsed;
}
