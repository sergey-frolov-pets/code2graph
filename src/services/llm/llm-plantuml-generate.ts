import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import {
  buildLlmSystemPrompt,
  buildWizardLlmSystemPrompt,
  LLM_MAX_TOKENS_GENERATION,
  LLM_TEMPERATURE_GENERATION,
} from "@/services/llm/llm-prompts";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import type { LlmGateHandlers } from "@/composables/useLlmGate";
import type {
  WizardDiagramType,
  WizardLanguage,
  WizardParamId,
} from "@/constants/llm-wizard";
import {
  getWizardDiagramFormatRules,
  type DiagramFormatPromptContext,
} from "@/services/llm/diagram-format-rules";
import { guideForPlantUmlText } from "@/services/llm/guides/llm-diagram-guides";
import { runLlmJsonValidationLoop } from "@/services/llm/llm-validation-loop";
import { validateLlmRegisteredFormat } from "@/services/llm/validate-llm-format";
import { validateLlmResponse } from "@/utils/validate-llm-plantuml";
import { validateLlmMermaidResponse } from "@/utils/validate-llm-mermaid";

export interface GenerateValidPlantUmlResult {
  plantuml: string;
  explanation?: string;
}

const GENERATION_CHAT_OPTIONS = {
  temperature: LLM_TEMPERATURE_GENERATION,
  maxTokens: LLM_MAX_TOKENS_GENERATION,
};

export async function generateValidPlantUml(
  userPrompt: string,
  layout: LayoutEngine,
  darkMode: boolean,
  renderMode: RenderMode,
  handlers?: LlmGateHandlers,
  systemContext = "Generate a complete PlantUML diagram that fully implements the user request.",
): Promise<GenerateValidPlantUmlResult> {
  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: buildLlmSystemPrompt(systemContext, guideForPlantUmlText(userPrompt)),
    },
    { role: "user", content: userPrompt },
  ];

  return runLlmJsonValidationLoop(
    messages,
    async (content) => {
      const validation = await validateLlmResponse(
        content,
        layout,
        darkMode,
        renderMode,
      );

      if (validation.valid && validation.plantuml) {
        return {
          valid: true,
          result: {
            plantuml: validation.plantuml,
            explanation: validation.output?.explanation,
          },
          issues: [],
        };
      }

      return {
        valid: false,
        issues: validation.issues,
      };
    },
    handlers,
    undefined,
    GENERATION_CHAT_OPTIONS,
  );
}

export async function generateValidWizardDiagram(
  userPrompt: string,
  language: WizardLanguage,
  diagramType: WizardDiagramType,
  layout: LayoutEngine,
  darkMode: boolean,
  renderMode: RenderMode,
  handlers?: LlmGateHandlers,
  systemContext = "Generate a complete diagram from structured wizard requirements.",
  typeParams?: Partial<Record<WizardParamId, number>>,
  priorMessages?: LlmChatMessage[],
  formatPromptContext?: DiagramFormatPromptContext,
): Promise<GenerateValidPlantUmlResult> {
  const formatRules = getWizardDiagramFormatRules(
    language,
    diagramType,
    typeParams,
    formatPromptContext ?? { description: userPrompt },
  );
  const systemPrompt = buildWizardLlmSystemPrompt(
    systemContext,
    formatRules,
    language,
    diagramType,
  );

  const messages: LlmChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(priorMessages ?? []),
    { role: "user", content: userPrompt },
  ];

  return runLlmJsonValidationLoop(
    messages,
    async (content) => {
      const validation =
        language === "mermaid"
          ? await validateLlmMermaidResponse(content, darkMode, renderMode)
          : language === "plantuml"
            ? await validateLlmResponse(content, layout, darkMode, renderMode)
            : await validateLlmRegisteredFormat(
                language,
                content,
                layout,
                darkMode,
                renderMode,
              );

      if (validation.valid && validation.plantuml) {
        return {
          valid: true,
          result: {
            plantuml: validation.plantuml,
            explanation: validation.output?.explanation,
          },
          issues: [],
        };
      }

      return {
        valid: false,
        issues: validation.issues,
      };
    },
    handlers,
    "LLM wizard validation failed",
    GENERATION_CHAT_OPTIONS,
  );
}
