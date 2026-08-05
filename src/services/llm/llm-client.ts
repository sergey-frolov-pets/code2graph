import { getLlmProvider } from "@/constants/llm-providers";
import type { LlmGateSuccess } from "@/composables/useLlmGate";
import {
  buildLlmSystemPrompt,
  LLM_TEST_USER_PROMPT,
} from "@/services/llm/llm-prompts";
import { proxyLlmChat } from "@/services/llm/proxy-client";
import {
  callGeminiChat,
  callOpenAiCompatibleChat,
} from "@/services/llm/providers/byok-providers";
import type {
  LlmChatMessage,
  LlmChatOptions,
  LlmChatResult,
} from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import { useLlmGate, type LlmGateHandlers } from "@/composables/useLlmGate";

async function dispatchByokChat(
  providerId: string,
  apiKey: string,
  messages: LlmChatMessage[],
  options: LlmChatOptions,
): Promise<string> {
  const provider = getLlmProvider(providerId);
  if (!provider) {
    throw new LlmClientError("provider_invalid", `Unknown provider: ${providerId}`);
  }

  const model = provider.defaultModel;
  const jsonMode = options.jsonMode ?? true;

  switch (providerId) {
    case "google-gemini":
      return callGeminiChat(apiKey, model, messages, jsonMode);
    case "groq":
      return callOpenAiCompatibleChat({
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
        apiKey,
        model,
        messages,
        jsonMode,
      });
    case "openrouter":
      return callOpenAiCompatibleChat({
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey,
        model,
        messages,
        jsonMode,
        extraHeaders: {
          "HTTP-Referer": "https://github.com/sergey-frolov-pets/vuePUML",
          "X-Title": "vuePlantUML",
        },
      });
    case "mistral":
      return callOpenAiCompatibleChat({
        endpoint: "https://api.mistral.ai/v1/chat/completions",
        apiKey,
        model,
        messages,
        jsonMode,
      });
    default:
      throw new LlmClientError(
        "provider_invalid",
        `BYOK chat is not implemented for ${providerId}`,
      );
  }
}

async function dispatchGateChat(
  gate: LlmGateSuccess,
  messages: LlmChatMessage[],
  options: LlmChatOptions,
): Promise<LlmChatResult> {
  const provider = getLlmProvider(gate.providerId);
  const model = provider?.defaultModel ?? "unknown";

  if (gate.mode === "free") {
    const content = await proxyLlmChat(gate.providerId, messages, options);
    return {
      content,
      providerId: gate.providerId,
      model,
    };
  }

  const content = await dispatchByokChat(
    gate.providerId,
    gate.apiKey,
    messages,
    options,
  );

  return {
    content,
    providerId: gate.providerId,
    model,
  };
}

export async function llmChat(
  messages: LlmChatMessage[],
  options: LlmChatOptions = {},
  handlers?: LlmGateHandlers,
): Promise<LlmChatResult> {
  const { requireLlmAccess } = useLlmGate();
  const gate = await requireLlmAccess(handlers);

  if (!gate.ok) {
    throw new LlmClientError("access_denied", `LLM access denied: ${gate.reason}`);
  }

  return dispatchGateChat(gate, messages, options);
}

export async function testLlmConnection(
  handlers?: LlmGateHandlers,
): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await llmChat(
      [
        {
          role: "system",
          content: buildLlmSystemPrompt("Connection test only."),
        },
        { role: "user", content: LLM_TEST_USER_PROMPT },
      ],
      { jsonMode: true },
      handlers,
    );

    return {
      ok: true,
      message: result.content.slice(0, 240),
    };
  } catch (error) {
    const message =
      error instanceof LlmClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown LLM error";

    return { ok: false, message };
  }
}
