import type { LayoutEngine } from "@/constants";
import {
  buildPatchNoChangeRetryPrompt,
  buildPatchPrompt,
} from "@/constants/llm-wizard";
import { llmChat } from "@/services/llm/llm-client";
import { buildLlmPatchSystemPrompt, buildLlmSystemPrompt } from "@/services/llm/llm-prompts";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import type { LlmGateHandlers } from "@/composables/useLlmGate";
import {
  isPatchContentChanged,
  parsePlantUmlLlmPatchOutput,
  resolvePatchMergedSource,
} from "@/utils/plantuml-patch";
import {
  formatLlmValidationIssuesForRetry,
  getMaxLlmValidationRetries,
  validateLlmPlantUmlSource,
  validateLlmResponse,
} from "@/utils/validate-llm-plantuml";

export interface GenerateValidPlantUmlResult {
  plantuml: string;
  explanation?: string;
}

export interface GenerateValidPlantUmlPatchResult extends GenerateValidPlantUmlResult {
  replacement?: string;
  hasChanges: boolean;
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

export async function generateValidPlantUmlPatch(
  fullSource: string,
  selectionStart: number,
  selectionEnd: number,
  selectedFragment: string,
  userPrompt: string,
  layout: LayoutEngine,
  darkMode: boolean,
  handlers?: LlmGateHandlers,
): Promise<GenerateValidPlantUmlPatchResult> {
  const patchUserPrompt = buildPatchPrompt(
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
        "You edit existing PlantUML by replacing only the user-selected fragment.",
      ),
    },
    { role: "user", content: patchUserPrompt },
  ];

  const maxRetries = getMaxLlmValidationRetries();

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const chatResult = await llmChat(messages, { jsonMode: true }, handlers);
    const parsed = parsePlantUmlLlmPatchOutput(chatResult.content);

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

    const validation = await validateLlmPlantUmlSource(mergedSource, layout, darkMode);

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
