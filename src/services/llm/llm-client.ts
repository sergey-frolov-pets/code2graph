import { resolveSelectedLlmModel } from "@/config/llm-model-selection";
import { getLlmProvider } from "@/constants/llm-providers";
import type { LlmGateSuccess } from "@/composables/useLlmGate";
import {
  buildLlmSystemPrompt,
  LLM_TEST_USER_PROMPT,
  LLM_MAX_TOKENS_PRECISE,
  LLM_TEMPERATURE_PRECISE,
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

const LOCAL_JSON_MODE_ERROR = /response_format|json_object/i;

async function callLocalChat(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: LlmChatMessage[],
  options: LlmChatOptions,
): Promise<string> {
  const request = {
    endpoint,
    apiKey,
    model,
    messages,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  };

  const jsonMode = options.jsonMode ?? true;
  try {
    return await callOpenAiCompatibleChat({
      ...request,
      jsonMode,
    });
  } catch (error) {
    if (
      !jsonMode ||
      !(error instanceof LlmClientError) ||
      error.code !== "upstream_error" ||
      !LOCAL_JSON_MODE_ERROR.test(error.message)
    ) {
      throw error;
    }

    return callOpenAiCompatibleChat({
      ...request,
      jsonMode: false,
    });
  }
}

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

  const model = resolveSelectedLlmModel(providerId);
  const jsonMode = options.jsonMode ?? true;

  if (providerId === "google-gemini") {
    return callGeminiChat(
      apiKey,
      model,
      messages,
      jsonMode,
      options.temperature,
      options.maxTokens,
    );
  }

  if (!provider.apiEndpoint) {
    throw new LlmClientError(
      "provider_invalid",
      `Chat endpoint is not configured for ${providerId}`,
    );
  }

  return callOpenAiCompatibleChat({
    endpoint: provider.apiEndpoint,
    apiKey,
    model,
    messages,
    jsonMode,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    extraHeaders: provider.apiExtraHeaders,
    chatRequest: provider.chatRequest,
  });
}

async function dispatchGateChat(
  gate: LlmGateSuccess,
  messages: LlmChatMessage[],
  options: LlmChatOptions,
): Promise<LlmChatResult> {
  const provider = getLlmProvider(gate.providerId);
  const model =
    gate.mode === "local"
      ? gate.model
      : gate.mode === "byok"
        ? resolveSelectedLlmModel(gate.providerId)
        : (provider?.defaultModel ?? "unknown");

  if (gate.mode === "proxy") {
    const content = await proxyLlmChat(gate.providerId, messages, options);
    return {
      content,
      providerId: gate.providerId,
      model,
    };
  }

  if (gate.mode === "local") {
    const content = await callLocalChat(
      gate.endpoint,
      gate.apiKey,
      gate.model,
      messages,
      options,
    );
    return {
      content,
      providerId: gate.providerId,
      model: gate.model,
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
  const gate = await requireLlmAccess(handlers, options.access);

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
      { jsonMode: true, temperature: LLM_TEMPERATURE_PRECISE, maxTokens: LLM_MAX_TOKENS_PRECISE },
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
