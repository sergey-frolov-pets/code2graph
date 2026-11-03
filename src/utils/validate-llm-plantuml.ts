import type { LayoutEngine } from "@/constants";
import {
  DEFAULT_RENDER_MODE,
  type RenderMode,
} from "@/constants/render-settings";
import { validatePlantUmlSyntax } from "@/composables/usePlantUml";
import {
  parsePlantUmlLlmOutput,
  type PlantUmlLlmOutput,
} from "@/schemas/plantuml-llm-output";
import { checkPlantUmlIncludePolicy } from "@/utils/plantuml-include-policy";
import { checkPlantUmlSyntax, type SyntaxIssue } from "@/utils/plantuml-syntax";

export type LlmPlantUmlValidationLayer =
  | "json"
  | "include_policy"
  | "static"
  | "engine";

export interface LlmPlantUmlValidationIssue {
  layer: LlmPlantUmlValidationLayer;
  message: string;
  line?: number;
}

export interface LlmPlantUmlValidationResult {
  valid: boolean;
  issues: LlmPlantUmlValidationIssue[];
  output?: PlantUmlLlmOutput;
  plantuml?: string;
}

const MAX_LLM_VALIDATION_RETRIES = 3;

export function getMaxLlmValidationRetries(): number {
  return MAX_LLM_VALIDATION_RETRIES;
}

function mapSyntaxIssues(
  issues: SyntaxIssue[],
  layer: "static" | "engine",
): LlmPlantUmlValidationIssue[] {
  return issues.map((issue) => ({
    layer,
    message: issue.message ?? issue.messageKey ?? "Syntax error",
    line: issue.line,
  }));
}

export function parseAndValidateLlmOutput(raw: string): LlmPlantUmlValidationResult {
  const parsed = parsePlantUmlLlmOutput(raw);
  if (!parsed.ok) {
    return {
      valid: false,
      issues: parsed.issues.map((issue) => ({
        layer: issue.layer,
        message: issue.message,
      })),
    };
  }

  return {
    valid: true,
    issues: [],
    output: parsed.data,
    plantuml: parsed.data.plantuml,
  };
}

export async function validateLlmPlantUmlSource(
  plantuml: string,
  layout: LayoutEngine,
  darkMode = false,
  renderMode: RenderMode = DEFAULT_RENDER_MODE,
): Promise<LlmPlantUmlValidationResult> {
  const includeIssues = checkPlantUmlIncludePolicy(plantuml);
  if (includeIssues.length > 0) {
    return {
      valid: false,
      issues: includeIssues.map((issue) => ({
        layer: "include_policy",
        message: issue.message,
        line: issue.line,
      })),
      plantuml,
    };
  }

  const staticCheck = checkPlantUmlSyntax(plantuml);
  if (!staticCheck.valid) {
    return {
      valid: false,
      issues: mapSyntaxIssues(staticCheck.issues, "static"),
      plantuml,
    };
  }

  const engineCheck = await validatePlantUmlSyntax(
    plantuml,
    layout,
    darkMode,
    renderMode,
  );
  if (!engineCheck.valid) {
    return {
      valid: false,
      issues: mapSyntaxIssues(engineCheck.issues, "engine"),
      plantuml,
    };
  }

  return {
    valid: true,
    issues: [],
    plantuml,
  };
}

export async function validateLlmResponse(
  raw: string,
  layout: LayoutEngine,
  darkMode = false,
  renderMode: RenderMode = DEFAULT_RENDER_MODE,
): Promise<LlmPlantUmlValidationResult> {
  const parsed = parseAndValidateLlmOutput(raw);
  if (!parsed.valid || !parsed.plantuml) {
    return parsed;
  }

  const sourceValidation = await validateLlmPlantUmlSource(
    parsed.plantuml,
    layout,
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

export function formatLlmValidationIssuesForRetry(
  issues: LlmPlantUmlValidationIssue[],
): string {
  return issues
    .map((issue) => {
      const lineSuffix = issue.line ? ` (line ${issue.line})` : "";
      return `[${issue.layer}]${lineSuffix}: ${issue.message}`;
    })
    .join("\n");
}
