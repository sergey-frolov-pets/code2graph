import type { LayoutEngine } from "@/constants";
import { llmChat } from "@/services/llm/llm-client";
import { buildLlmSystemPrompt } from "@/services/llm/llm-prompts";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import type { LlmGateHandlers } from "@/composables/useLlmGate";
import {
  formatLlmValidationIssuesForRetry,
  getMaxLlmValidationRetries,
  validateLlmResponse,
} from "@/utils/validate-llm-plantuml";

export interface GenerateValidPlantUmlResult {
  plantuml: string;
  explanation?: string;
}

export async function generateValidPlantUml(
  userPrompt: string,
  layout: LayoutEngine,
  darkMode: boolean,
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

  const maxRetries = getMaxLlmValidationRetries();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const chatResult = await llmChat(messages, { jsonMode: true }, handlers);
    const validation = await validateLlmResponse(
      chatResult.content,
      layout,
      darkMode,
    );

    if (validation.valid && validation.plantuml) {
      return {
        plantuml: validation.plantuml,
        explanation: validation.output?.explanation,
      };
    }

    if (attempt >= maxRetries) {
      throw new LlmClientError(
        "validation_failed",
        formatLlmValidationIssuesForRetry(validation.issues),
      );
    }

    messages.push({ role: "assistant", content: chatResult.content });
    messages.push({
      role: "user",
      content: `Fix validation errors and return corrected JSON only:\n${formatLlmValidationIssuesForRetry(validation.issues)}`,
    });
  }

  throw new LlmClientError("validation_failed", "LLM validation failed");
}
