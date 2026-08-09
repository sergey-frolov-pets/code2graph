import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import {
  buildFullDiagramEditPrompt,
  buildFullDiagramNoChangeRetryPrompt,
  buildFullDiagramRevertRetryPrompt,
} from "@/constants/llm-wizard";
import { llmChat } from "@/services/llm/llm-client";
import { buildLlmSystemPrompt } from "@/services/llm/llm-prompts";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import type { LlmGateHandlers } from "@/composables/useLlmGate";
import { plantUmlSourcesEqual } from "@/utils/plantuml-llm-compare";
import {
  formatLlmValidationIssuesForRetry,
  getMaxLlmValidationRetries,
  validateLlmResponse,
} from "@/utils/validate-llm-plantuml";
import type { GenerateValidPlantUmlPatchResult } from "@/services/llm/llm-plantuml-patch";

export async function generateValidPlantUmlFullEdit(
  fullSource: string,
  userPrompt: string,
  layout: LayoutEngine,
  darkMode: boolean,
  renderMode: RenderMode,
  handlers?: LlmGateHandlers,
): Promise<GenerateValidPlantUmlPatchResult> {
  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: buildLlmSystemPrompt(
        "You edit an existing PlantUML diagram according to the user request.",
      ),
    },
    {
      role: "user",
      content: buildFullDiagramEditPrompt(fullSource, userPrompt),
    },
  ];

  const maxRetries = getMaxLlmValidationRetries();
  let sawDifferentInvalidPlantuml = false;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const chatResult = await llmChat(messages, { jsonMode: true }, handlers);
    const validation = await validateLlmResponse(
      chatResult.content,
      layout,
      darkMode,
      renderMode,
    );

    if (
      validation.plantuml &&
      !plantUmlSourcesEqual(validation.plantuml, fullSource) &&
      !validation.valid
    ) {
      sawDifferentInvalidPlantuml = true;
    }

    if (validation.valid && validation.plantuml) {
      const hasChanges = !plantUmlSourcesEqual(validation.plantuml, fullSource);

      if (!hasChanges) {
        if (sawDifferentInvalidPlantuml && attempt < maxRetries) {
          messages.push({ role: "assistant", content: chatResult.content });
          messages.push({
            role: "user",
            content: buildFullDiagramRevertRetryPrompt(
              userPrompt,
              "Previous edits were rejected; do not revert to the original diagram.",
            ),
          });
          continue;
        }

        if (attempt >= maxRetries) {
          return {
            plantuml: validation.plantuml,
            explanation: validation.output?.explanation,
            hasChanges: false,
          };
        }

        messages.push({ role: "assistant", content: chatResult.content });
        messages.push({
          role: "user",
          content: buildFullDiagramNoChangeRetryPrompt(userPrompt, fullSource),
        });
        continue;
      }

      return {
        plantuml: validation.plantuml,
        explanation: validation.output?.explanation,
        hasChanges: true,
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
      content: sawDifferentInvalidPlantuml
        ? buildFullDiagramRevertRetryPrompt(
            userPrompt,
            formatLlmValidationIssuesForRetry(validation.issues),
          )
        : `Fix validation errors and return corrected JSON only:\n${formatLlmValidationIssuesForRetry(validation.issues)}`,
    });
  }

  throw new LlmClientError("validation_failed", "LLM full edit validation failed");
}
