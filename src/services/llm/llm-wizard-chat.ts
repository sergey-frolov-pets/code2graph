import type { AppLocale } from "@/constants/i18n";
import type { WizardState } from "@/constants/llm-wizard";
import { getWizardTypePromptHint } from "@/constants/wizard-prompt-hints";
import { llmChat } from "@/services/llm/llm-client";
import {
  LLM_MAX_TOKENS_PRECISE,
  LLM_TEMPERATURE_PRECISE,
  LLM_WIZARD_PLANNING_APPENDIX,
} from "@/services/llm/llm-prompts";
import { parseLlmClarificationQuestion } from "@/schemas/llm-clarification";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import type { LlmGateHandlers } from "@/composables/useLlmGate";
import { stripJsonCodeFence } from "@/schemas/plantuml-llm-output";
import { z } from "zod";

const WizardPlanningMessageSchema = z.object({
  message: z.string().min(1).max(4000),
});

export type WizardPlanningChatResult =
  | {
      kind: "clarification";
      clarificationQuestion: string;
      explanation?: string;
    }
  | {
      kind: "message";
      message: string;
    };

function buildWizardPlanningContext(
  state: WizardState,
  locale: AppLocale = "en",
): string {
  const typeHint = getWizardTypePromptHint(state.diagramType, locale);
  const typeLabel = state.diagramType.replace(/_/g, " ");
  return [
    `Planned diagram: ${state.language} ${typeLabel}.`,
    `Theme: ${state.theme}.`,
    state.contextText.trim()
      ? `Initial description: ${state.contextText.trim()}`
      : "Initial description: (not provided yet)",
    state.typeSpecificText.trim()
      ? `Additional requirements: ${state.typeSpecificText.trim()}`
      : "",
    typeHint.trim() ? `Type structure guide: ${typeHint.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendWizardPlanningChat(
  userMessage: string,
  wizardState: WizardState,
  priorMessages: LlmChatMessage[] = [],
  handlers?: LlmGateHandlers,
  locale: AppLocale = "en",
): Promise<WizardPlanningChatResult> {
  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: [
        "You are a diagram planning assistant before AI generation.",
        buildWizardPlanningContext(wizardState, locale),
        LLM_WIZARD_PLANNING_APPENDIX,
      ].join("\n\n"),
    },
    ...priorMessages,
    { role: "user", content: userMessage.trim() },
  ];

  const chatResult = await llmChat(
    messages,
    {
      jsonMode: true,
      temperature: LLM_TEMPERATURE_PRECISE,
      maxTokens: LLM_MAX_TOKENS_PRECISE,
    },
    handlers,
  );

  const clarification = parseLlmClarificationQuestion(chatResult.content);
  if (clarification.ok) {
    return {
      kind: "clarification",
      clarificationQuestion: clarification.data.clarificationQuestion,
      explanation: clarification.data.explanation,
    };
  }

  try {
    const parsed = JSON.parse(stripJsonCodeFence(chatResult.content)) as unknown;
    const result = WizardPlanningMessageSchema.safeParse(parsed);
    if (result.success) {
      return { kind: "message", message: result.data.message };
    }
  } catch {
    // fall through
  }

  throw new LlmClientError(
    "validation_failed",
    "Invalid planning chat response. Expected clarificationQuestion or message.",
  );
}

export function buildWizardPromptWithChatContext(
  basePrompt: string,
  chatMessages: LlmChatMessage[],
): string {
  if (chatMessages.length === 0) {
    return basePrompt;
  }

  const dialogue = chatMessages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  return [
    basePrompt,
    "",
    "Planning chat (use all details when generating):",
    dialogue,
  ].join("\n");
}
