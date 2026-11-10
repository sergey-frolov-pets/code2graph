import type { LlmGateHandlers } from "@/composables/useLlmGate";
import type { LayoutEngine } from "@/constants";
import { AI_CHAT_RECENT_MESSAGES, AI_CHAT_VALIDATION_RETRIES } from "@/constants/ai-chat";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { RenderMode } from "@/constants/render-settings";
import { getFormatHandler } from "@/formats";
import { parseAiChatEnvelope, type AiChatEnvelope } from "@/schemas/ai-chat-output";
import {
  AI_CHAT_SYSTEM_PROMPT,
  buildAiChatContextBlock,
} from "@/services/llm/ai-chat-prompts";
import { llmChat } from "@/services/llm/llm-client";
import {
  LLM_MAX_TOKENS_GENERATION,
  LLM_TEMPERATURE_GENERATION,
  LLM_TEMPERATURE_PRECISE,
  LLM_MAX_TOKENS_PRECISE,
} from "@/services/llm/llm-prompts";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import type { AiChatMessage } from "@/types/ai-chat-session";

export interface AiChatTurnResult extends AiChatEnvelope {
  providerId: string;
  model: string;
}

export interface SendAiChatMessageInput {
  history: AiChatMessage[];
  userContent: string;
  format: DiagramFormat;
  source: string;
  selection?: string;
  renderError?: string;
  summary?: string;
  layout: LayoutEngine;
  diagramDarkMode: boolean;
  renderMode: RenderMode;
  handlers?: LlmGateHandlers;
}

function toHistoryMessages(history: AiChatMessage[]): LlmChatMessage[] {
  return history.slice(-AI_CHAT_RECENT_MESSAGES).map((message) => ({
    role: message.role,
    content: message.proposal
      ? `${message.content}\n[Предложение (${message.proposal.status}): ${message.proposal.explanation}]`
      : message.content,
  }));
}

async function validateProposal(
  format: DiagramFormat,
  source: string,
  input: SendAiChatMessageInput,
): Promise<string[]> {
  const handler = getFormatHandler(format);
  const result = await handler.validateSyntax(source, {
    layout: input.layout,
    diagramDarkMode: input.diagramDarkMode,
    renderMode: input.renderMode,
  });
  return result.issues
    .filter((issue) => issue.severity !== "warning")
    .map((issue) => issue.message ?? issue.messageKey ?? "Syntax error");
}

export async function sendAiChatMessage(
  input: SendAiChatMessageInput,
): Promise<AiChatTurnResult> {
  const appliedCount = input.history.filter(
    (message) => message.proposal?.status === "applied",
  ).length;
  const rejectedTitles = input.history
    .filter((message) => message.proposal?.status === "rejected")
    .map((message) => message.proposal?.explanation ?? "")
    .filter(Boolean);

  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: [
        AI_CHAT_SYSTEM_PROMPT,
        buildAiChatContextBlock({
          format: input.format,
          source: input.source,
          selection: input.selection,
          renderError: input.renderError,
          summary: input.summary,
          appliedCount,
          rejectedTitles,
        }),
      ].join("\n\n"),
    },
    ...toHistoryMessages(input.history),
    { role: "user", content: input.userContent },
  ];

  for (let attempt = 0; attempt <= AI_CHAT_VALIDATION_RETRIES; attempt += 1) {
    const chatResult = await llmChat(
      messages,
      {
        jsonMode: true,
        temperature: LLM_TEMPERATURE_GENERATION,
        maxTokens: LLM_MAX_TOKENS_GENERATION,
      },
      input.handlers,
    );

    const parsed = parseAiChatEnvelope(chatResult.content);
    if (!parsed.ok) {
      if (attempt >= AI_CHAT_VALIDATION_RETRIES) {
        throw new LlmClientError("validation_failed", parsed.message);
      }
      messages.push({ role: "assistant", content: chatResult.content });
      messages.push({
        role: "user",
        content: `Return corrected JSON only matching the required envelope: ${parsed.message}`,
      });
      continue;
    }

    const envelope = parsed.data;
    if (envelope.proposal?.source) {
      const issues = await validateProposal(input.format, envelope.proposal.source, input);
      if (issues.length > 0) {
        if (attempt >= AI_CHAT_VALIDATION_RETRIES) {
          throw new LlmClientError(
            "validation_failed",
            `Proposed diagram is invalid: ${issues.join("; ")}`,
          );
        }
        messages.push({ role: "assistant", content: chatResult.content });
        messages.push({
          role: "user",
          content: `The proposed source has syntax errors. Fix them and return the full JSON envelope again:\n${issues.join("\n")}`,
        });
        continue;
      }
    }

    return {
      ...envelope,
      providerId: chatResult.providerId,
      model: chatResult.model,
    };
  }

  throw new LlmClientError("validation_failed", "AI chat validation failed");
}

/** Служебный короткий вызов: заголовок сессии или свёртка истории. */
export async function runAiChatUtilityPrompt(
  prompt: string,
  handlers?: LlmGateHandlers,
): Promise<string> {
  const result = await llmChat(
    [
      { role: "system", content: "You are a precise assistant. Follow the output format exactly." },
      { role: "user", content: prompt },
    ],
    {
      jsonMode: true,
      temperature: LLM_TEMPERATURE_PRECISE,
      maxTokens: LLM_MAX_TOKENS_PRECISE,
    },
    handlers,
  );
  return result.content;
}
