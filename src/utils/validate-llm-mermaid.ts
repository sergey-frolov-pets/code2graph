import type { RenderMode } from "@/constants/render-settings";
import { DEFAULT_RENDER_MODE } from "@/constants/render-settings";
import { renderMermaidToSvg } from "@/services/mermaid/mermaid-engine";
import {
  parseAndValidateLlmOutput,
  type LlmPlantUmlValidationResult,
} from "@/utils/validate-llm-plantuml";

export async function validateLlmMermaidSource(
  mermaidSource: string,
  darkMode = false,
  renderMode: RenderMode = DEFAULT_RENDER_MODE,
): Promise<LlmPlantUmlValidationResult> {
  const trimmed = mermaidSource.trim();

  if (trimmed.length < 3) {
    return {
      valid: false,
      issues: [{ layer: "static", message: "Mermaid source is too short" }],
      plantuml: mermaidSource,
    };
  }

  try {
    await renderMermaidToSvg(trimmed, { dark: darkMode }, renderMode);
    return {
      valid: true,
      issues: [],
      plantuml: trimmed,
    };
  } catch (error) {
    return {
      valid: false,
      issues: [
        {
          layer: "engine",
          message:
            error instanceof Error ? error.message : "Mermaid render failed",
        },
      ],
      plantuml: mermaidSource,
    };
  }
}

export async function validateLlmMermaidResponse(
  raw: string,
  darkMode = false,
  renderMode: RenderMode = DEFAULT_RENDER_MODE,
): Promise<LlmPlantUmlValidationResult> {
  const parsed = parseAndValidateLlmOutput(raw);
  if (!parsed.valid || !parsed.plantuml) {
    return parsed;
  }

  const sourceValidation = await validateLlmMermaidSource(
    parsed.plantuml,
    darkMode,
    renderMode,
  );

  if (!sourceValidation.valid) {
    return {
      valid: false,
      issues: sourceValidation.issues,
      output: parsed.output,
      plantuml: parsed.plantuml,
    };
  }

  return {
    valid: true,
    issues: [],
    output: parsed.output,
    plantuml: parsed.plantuml,
  };
}
