import type { LlmAccountParameters } from "@/config/llm-account-record";
import type { LlmChatRequestConfig } from "@/constants/llm-providers";
import { toGeminiContentParts, toOpenAiChatMessage } from "@/services/llm/llm-message-parts";
import type { LlmChatMessage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";

type OpenAiCompatibleOptions = {
  endpoint: string;
  apiKey?: string;
  model: string;
  messages: LlmChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  extraHeaders?: Record<string, string>;
  chatRequest?: LlmChatRequestConfig;
  parameters?: LlmAccountParameters;
};

const DEFAULT_CHAT_TEMPERATURE = 0.2;

export function applySavedChatParameters(
  body: Record<string, unknown>,
  parameters: LlmAccountParameters | undefined,
): void {
  if (!parameters) {
    return;
  }

  if (parameters.temperature !== undefined) {
    body.temperature = parameters.temperature;
  }
  if (parameters.topP !== undefined) {
    body.top_p = parameters.topP;
  }
  if (parameters.n !== undefined) {
    body.n = parameters.n;
  }
  if (parameters.presencePenalty !== undefined) {
    body.presence_penalty = parameters.presencePenalty;
  }
  if (parameters.frequencyPenalty !== undefined) {
    body.frequency_penalty = parameters.frequencyPenalty;
  }
  if (parameters.maxTokens !== undefined) {
    body.max_tokens = parameters.maxTokens;
  }
}

export function omitFixedChatParameters(
  body: Record<string, unknown>,
  chatRequest: LlmChatRequestConfig | undefined,
): void {
  const fixedParameters = chatRequest?.fixedParameters;
  if (!fixedParameters) {
    return;
  }

  for (const parameter of Object.keys(fixedParameters)) {
    delete body[parameter];
  }
}

export async function callOpenAiCompatibleChat(
  options: OpenAiCompatibleOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages.map(toOpenAiChatMessage),
    temperature: options.temperature ?? DEFAULT_CHAT_TEMPERATURE,
    response_format: options.jsonMode ? { type: "json_object" } : undefined,
  };
  if (options.maxTokens !== undefined) {
    body.max_tokens = options.maxTokens;
  }
  applySavedChatParameters(body, options.parameters);
  omitFixedChatParameters(body, options.chatRequest);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.extraHeaders,
  };
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  const response = await fetch(options.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      `LLM API error ${response.status}`;
    throw new LlmClientError("upstream_error", message);
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new LlmClientError("empty_response", "LLM API returned empty content");
  }

  return content;
}

export async function callGeminiChat(
  apiKey: string,
  model: string,
  messages: LlmChatMessage[],
  jsonMode = true,
  temperature = 0.2,
  maxTokens?: number,
): Promise<string> {
  const systemMessage = messages.find((message) => message.role === "system");
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: toGeminiContentParts(message),
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const generationConfig: Record<string, unknown> = jsonMode
    ? { responseMimeType: "application/json", temperature }
    : { temperature };

  if (maxTokens !== undefined) {
    generationConfig.maxOutputTokens = maxTokens;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: systemMessage
        ? { parts: [{ text: systemMessage.content }] }
        : undefined,
      contents,
      generationConfig,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ?? `Gemini API error ${response.status}`;
    throw new LlmClientError("upstream_error", message);
  }

  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new LlmClientError("empty_response", "Gemini API returned empty content");
  }

  return text;
}
