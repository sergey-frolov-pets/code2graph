import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import {
  buildPatchFollowUpPrompt,
  buildPatchNoChangeRetryPrompt,
  buildPatchPrompt,
  requestsStructuralDiagramEdit,
} from "@/constants/llm-wizard";
import { llmChat } from "@/services/llm/llm-client";
import {
  buildLlmPatchSystemPrompt,
  LLM_MAX_TOKENS_PRECISE,
  LLM_TEMPERATURE_PRECISE,
} from "@/services/llm/llm-prompts";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import type { LlmGateHandlers } from "@/composables/useLlmGate";
import { generateValidPlantUmlFullEdit } from "@/services/llm/llm-plantuml-full-edit";
import type { GenerateValidPlantUmlResult } from "@/services/llm/llm-plantuml-generate";
import {
  isPatchContentChanged,
  parsePlantUmlLlmPatchOutput,
  resolvePatchMergedSource,
} from "@/utils/plantuml-patch";
import {
  formatLlmValidationIssuesForRetry,
  getMaxLlmValidationRetries,
  validateLlmPlantUmlSource,
} from "@/utils/validate-llm-plantuml";

export interface GenerateValidPlantUmlPatchResult extends GenerateValidPlantUmlResult {
  replacement?: string;
  hasChanges: boolean;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

export async function generateValidPlantUmlPatch(
  fullSource: string,
  selectionStart: number,
  selectionEnd: number,
  selectedFragment: string,
  userPrompt: string,
  layout: LayoutEngine,
  darkMode: boolean,
  renderMode: RenderMode,
  handlers?: LlmGateHandlers,
  priorMessages?: LlmChatMessage[],
): Promise<GenerateValidPlantUmlPatchResult> {
  if (requestsStructuralDiagramEdit(userPrompt)) {
    return generateValidPlantUmlFullEdit(
      fullSource,
      userPrompt,
      layout,
      darkMode,
      renderMode,
      handlers,
      priorMessages,
    );
  }

  const patchUserPrompt =
    (priorMessages?.length ?? 0) > 0
      ? buildPatchFollowUpPrompt(userPrompt)
      : buildPatchPrompt(
          fullSource,
          selectedFragment,
          selectionStart,
          selectionEnd,
          userPrompt,
        );

  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: buildLlmPatchSystemPrompt(
        "You edit existing PlantUML by replacing only the user-selected fragment with a complete, request-satisfying replacement.",
      ),
    },
    ...(priorMessages ?? []),
    { role: "user", content: patchUserPrompt },
  ];

  const maxRetries = getMaxLlmValidationRetries();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const chatResult = await llmChat(
      messages,
      {
        jsonMode: true,
        temperature: LLM_TEMPERATURE_PRECISE,
        maxTokens: LLM_MAX_TOKENS_PRECISE,
      },
      handlers,
    );
    const parsed = parsePlantUmlLlmPatchOutput(chatResult.content);

    if (parsed.ok && parsed.mode === "clarification") {
      return {
        plantuml: fullSource,
        explanation: parsed.explanation,
        hasChanges: false,
        needsClarification: true,
        clarificationQuestion: parsed.clarificationQuestion,
      };
    }

    if (!parsed.ok) {
      if (attempt >= maxRetries) {
        throw new LlmClientError(
          "validation_failed",
          parsed.issues.map((issue) => issue.message).join("\n"),
        );
      }

      messages.push({ role: "assistant", content: chatResult.content });
      messages.push({
        role: "user",
        content: `Invalid JSON. Return {"replacement":"...","explanation":"..."} only.`,
      });
      continue;
    }

    const mergedSource = resolvePatchMergedSource(
      fullSource,
      selectionStart,
      selectionEnd,
      parsed,
    );

    const hasChanges = isPatchContentChanged(
      fullSource,
      selectionStart,
      selectionEnd,
      mergedSource,
      parsed,
    );

    const validation = await validateLlmPlantUmlSource(
      mergedSource,
      layout,
      darkMode,
      renderMode,
    );

    if (validation.valid) {
      if (!hasChanges) {
        if (attempt >= maxRetries) {
          return {
            plantuml: mergedSource,
            explanation: parsed.explanation,
            replacement:
              parsed.mode === "replacement" ? parsed.replacement : undefined,
            hasChanges: false,
          };
        }

        messages.push({ role: "assistant", content: chatResult.content });
        messages.push({
          role: "user",
          content: buildPatchNoChangeRetryPrompt(
            userPrompt,
            selectedFragment,
            parsed.mode,
          ),
        });
        continue;
      }

      return {
        plantuml: mergedSource,
        explanation: parsed.explanation,
        replacement: parsed.mode === "replacement" ? parsed.replacement : undefined,
        hasChanges,
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
      content: `Fix validation errors after merge. Return corrected JSON with replacement field:\n${formatLlmValidationIssuesForRetry(validation.issues)}`,
    });
  }

  throw new LlmClientError("validation_failed", "LLM patch validation failed");
}
