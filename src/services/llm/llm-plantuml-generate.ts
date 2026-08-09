import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import { llmChat } from "@/services/llm/llm-client";
import {
  buildLlmSyntaxAskSystemPrompt,
  buildLlmSystemPrompt,
  buildSyntaxAskUserPrompt,
  buildWizardLlmSystemPrompt,
  LLM_MAX_TOKENS_GENERATION,
  LLM_MAX_TOKENS_PRECISE,
  LLM_TEMPERATURE_GENERATION,
  LLM_TEMPERATURE_PRECISE,
} from "@/services/llm/llm-prompts";
import { parsePlantUmlSyntaxAskOutput } from "@/schemas/plantuml-llm-syntax-ask";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import type { LlmGateHandlers } from "@/composables/useLlmGate";
import type {
  WizardDiagramType,
  WizardLanguage,
  WizardParamId,
} from "@/constants/llm-wizard";
import { getWizardDiagramFormatRules } from "@/constants/llm-wizard";
import { runLlmJsonValidationLoop } from "@/services/llm/llm-validation-loop";
import { validateLlmResponse } from "@/utils/validate-llm-plantuml";
import { validateLlmMermaidResponse } from "@/utils/validate-llm-mermaid";

export interface GenerateValidPlantUmlResult {
  plantuml: string;
  explanation?: string;
}

export interface AskPlantUmlSyntaxResult {
  answer?: string;
  clarificationQuestion?: string;
}

const GENERATION_CHAT_OPTIONS = {
  temperature: LLM_TEMPERATURE_GENERATION,
  maxTokens: LLM_MAX_TOKENS_GENERATION,
};

const PRECISE_CHAT_OPTIONS = {
  temperature: LLM_TEMPERATURE_PRECISE,
  maxTokens: LLM_MAX_TOKENS_PRECISE,
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
): Promise<GenerateValidPlantUmlResult> {
  if (language === "graphml") {
    throw new LlmClientError(
      "validation_failed",
      "GraphML is not supported for AI wizard generation",
    );
  }

  const formatRules = getWizardDiagramFormatRules(
    language,
    diagramType,
    typeParams,
  );
  const systemPrompt = buildWizardLlmSystemPrompt(
    systemContext,
    formatRules,
    language,
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
    GENERATION_CHAT_OPTIONS,
  );
}

export async function askPlantUmlSyntaxQuestion(
  source: string,
  question: string,
  handlers?: LlmGateHandlers,
  priorMessages?: LlmChatMessage[],
): Promise<AskPlantUmlSyntaxResult> {
  const isFollowUp = (priorMessages?.length ?? 0) > 0;
  const userContent = isFollowUp
    ? question.trim()
    : buildSyntaxAskUserPrompt(source, question);

  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: buildLlmSyntaxAskSystemPrompt(
        "You are a PlantUML syntax expert. Answer the user's question about how to express something in PlantUML, using their current diagram as context. Match the user's language in your answer.",
      ),
    },
    ...(priorMessages ?? []),
    { role: "user", content: userContent },
  ];

  const chatResult = await llmChat(
    messages,
    { jsonMode: true, ...PRECISE_CHAT_OPTIONS },
    handlers,
  );
  const parsed = parsePlantUmlSyntaxAskOutput(chatResult.content);

  if (!parsed.ok) {
    throw new LlmClientError(
      "validation_failed",
      parsed.issues.map((issue) => issue.message).join("\n"),
    );
  }

  if (parsed.kind === "clarification") {
    return {
      clarificationQuestion: parsed.clarificationQuestion,
    };
  }

  return { answer: parsed.data.answer };
}
