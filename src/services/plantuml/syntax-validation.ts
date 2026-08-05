import type { LayoutEngine } from "@/constants";
import { renderPlantUmlToSvg } from "@/services/plantuml/plantuml-engine";
import {
  checkPlantUmlSyntax,
  isPlantUmlErrorSvg,
  parsePlantUmlErrorFromSvg,
  parsePlantUmlErrorLine,
  type SyntaxCheckResult,
} from "@/utils/plantuml-syntax";
import { preparePlantUmlSource, splitSourceLines } from "@/utils/plantuml-source";

export async function validatePlantUmlSyntax(
  source: string,
  layout: LayoutEngine,
  darkMode = false,
): Promise<SyntaxCheckResult> {
  const staticCheck = checkPlantUmlSyntax(source);
  if (!staticCheck.valid) {
    return staticCheck;
  }

  try {
    const prepared = await preparePlantUmlSource(source, layout);
    const lines = splitSourceLines(prepared);
    const rendered = await renderPlantUmlToSvg(lines, { dark: darkMode });
    if (isPlantUmlErrorSvg(rendered)) {
      return {
        valid: false,
        issues: parsePlantUmlErrorFromSvg(rendered),
      };
    }
    return { valid: true, issues: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const line = parsePlantUmlErrorLine(message);
    return {
      valid: false,
      issues: [{ severity: "error", message, line }],
    };
  }
}
