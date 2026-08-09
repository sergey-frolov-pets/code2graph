import type { LlmGateHandlers } from "@/composables/useLlmGate";
import { llmChat } from "@/services/llm/llm-client";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import {
  formatLlmValidationIssuesForRetry,
  getMaxLlmValidationRetries,
  type LlmPlantUmlValidationIssue,
} from "@/utils/validate-llm-plantuml";

export function appendJsonValidationRetry(
  messages: LlmChatMessage[],
  assistantContent: string,
  issues: LlmPlantUmlValidationIssue[],
): void {
  messages.push({ role: "assistant", content: assistantContent });
  messages.push({
    role: "user",
    content: `Fix validation errors and return corrected JSON only:\n${formatLlmValidationIssuesForRetry(issues)}`,
  });
}

export async function runLlmJsonValidationLoop<T>(
  messages: LlmChatMessage[],
  validate: (content: string) => Promise<{
    valid: boolean;
    result?: T;
    issues: LlmPlantUmlValidationIssue[];
  }>,
  handlers?: LlmGateHandlers,
  failureMessage = "LLM validation failed",
): Promise<T> {
  const maxRetries = getMaxLlmValidationRetries();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const chatResult = await llmChat(messages, { jsonMode: true }, handlers);
    const validation = await validate(chatResult.content);

    if (validation.valid && validation.result !== undefined) {
      return validation.result;
    }

    if (attempt >= maxRetries) {
      throw new LlmClientError(
        "validation_failed",
        formatLlmValidationIssuesForRetry(validation.issues),
      );
    }

    appendJsonValidationRetry(messages, chatResult.content, validation.issues);
  }

  throw new LlmClientError("validation_failed", failureMessage);
}
