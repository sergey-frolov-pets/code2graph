import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import { llmChat } from "@/services/llm/llm-client";
import {
  buildLlmSyntaxAskSystemPrompt,
  buildLlmSystemPrompt,
  buildSyntaxAskUserPrompt,
  buildWizardLlmSystemPrompt,
} from "@/services/llm/llm-prompts";
import { parsePlantUmlSyntaxAskOutput } from "@/schemas/plantuml-llm-syntax-ask";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import type { LlmGateHandlers } from "@/composables/useLlmGate";
import type { WizardDiagramType, WizardLanguage } from "@/constants/llm-wizard";
import { getWizardDiagramFormatRules } from "@/constants/llm-wizard";
import { runLlmJsonValidationLoop } from "@/services/llm/llm-validation-loop";
import { validateLlmResponse } from "@/utils/validate-llm-plantuml";
import { validateLlmMermaidResponse } from "@/utils/validate-llm-mermaid";

export interface GenerateValidPlantUmlResult {
  plantuml: string;
  explanation?: string;
}

export interface AskPlantUmlSyntaxResult {
  answer: string;
}

export async function generateValidPlantUml(
  userPrompt: string,
  layout: LayoutEngine,
  darkMode: boolean,
  renderMode: RenderMode,
  handlers?: LlmGateHandlers,
  systemContext = "You generate PlantUML diagram source code.",
): Promise<GenerateValidPlantUmlResult> {
  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: buildLlmSystemPrompt(systemContext),
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
  systemContext = "You generate diagram source code from structured wizard requirements.",
): Promise<GenerateValidPlantUmlResult> {
  if (language === "graphml") {
    throw new LlmClientError(
      "validation_failed",
      "GraphML is not supported for AI wizard generation",
    );
  }

  const formatRules = getWizardDiagramFormatRules(language, diagramType);
  const systemPrompt = buildWizardLlmSystemPrompt(
    systemContext,
    formatRules,
    language,
  );

  const messages: LlmChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  return runLlmJsonValidationLoop(
    messages,
    async (content) => {
      const validation =
        language === "mermaid"
          ? await validateLlmMermaidResponse(content, darkMode, renderMode)
          : await validateLlmResponse(content, layout, darkMode, renderMode);

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
  );
}

export async function askPlantUmlSyntaxQuestion(
  source: string,
  question: string,
  handlers?: LlmGateHandlers,
): Promise<AskPlantUmlSyntaxResult> {
  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: buildLlmSyntaxAskSystemPrompt(
        "You are a PlantUML syntax expert. Answer the user's question about how to express something in PlantUML, using their current diagram as context. Match the user's language in your answer.",
      ),
    },
    { role: "user", content: buildSyntaxAskUserPrompt(source, question) },
  ];

  const chatResult = await llmChat(messages, { jsonMode: true }, handlers);
  const parsed = parsePlantUmlSyntaxAskOutput(chatResult.content);

  if (!parsed.ok) {
    throw new LlmClientError(
      "validation_failed",
      parsed.issues.map((issue) => issue.message).join("\n"),
    );
  }

  return { answer: parsed.data.answer };
}
