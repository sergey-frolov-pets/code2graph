import type { LlmAccountParameters } from "@/config/llm-account-record";
import type { LlmChatRequestConfig } from "@/constants/llm-providers";
import {
  REASONING_COMPLETION_TOKEN_FLOOR,
  applyReasoningControls,
  completionFromState,
  modelUsesReasoningBudget,
  consumeChatCompletionPayload,
  consumeSseChatStream,
  createChatStreamState,
  readTokenUsage,
  type ChatCompletionResult,
  type LlmCompletionTokenField,
} from "@shared/llm-chat-stream";
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
  signal?: AbortSignal;
  onOutputStart?: () => void;
};

const CONNECTION_DROPPED_MESSAGE =
  "The connection dropped before the model responded.";
const REASONING_BUDGET_MESSAGE =
  "The model used the output limit on reasoning and returned no answer.";

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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function outgoingMessages(options: OpenAiCompatibleOptions): LlmChatMessage[] {
  const keepReasoning =
    options.chatRequest?.preserveReasoning === true ||
    (options.chatRequest?.reasoningStyle === "openrouter" &&
      modelUsesReasoningBudget(options.model));
  if (keepReasoning) {
    return options.messages;
  }
  return options.messages.map((message) =>
    message.reasoningContent ? { ...message, reasoningContent: undefined } : message,
  );
}

function buildOpenAiChatBody(
  options: OpenAiCompatibleOptions,
  forceLowEffort: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: outgoingMessages(options).map(toOpenAiChatMessage),
    temperature: options.temperature ?? DEFAULT_CHAT_TEMPERATURE,
    response_format: options.jsonMode ? { type: "json_object" } : undefined,
  };
  if (options.maxTokens !== undefined) {
    body.max_tokens = options.maxTokens;
  }
  applySavedChatParameters(body, options.parameters);
  omitFixedChatParameters(body, options.chatRequest);

  const chatRequest = options.chatRequest;
  const tokenField: LlmCompletionTokenField = chatRequest?.completionTokenField ?? "max_tokens";
  applyReasoningControls(body, {
    style: chatRequest?.reasoningStyle,
    model: options.model,
    forceLowEffort,
    floor: Math.max(chatRequest?.completionTokenFloor ?? 0, REASONING_COMPLETION_TOKEN_FLOOR),
    tokenField,
  });
  if (chatRequest?.stream) {
    body.stream = true;
    body.stream_options = { include_usage: true };
  }
  return body;
}

async function readOpenAiChatResponse(
  response: Response,
  onOutputStart?: () => void,
): Promise<ChatCompletionResult> {
  const headerGet = response.headers?.get?.bind(response.headers);
  const contentType = headerGet?.("content-type") ?? "";
  if (response.ok && contentType.includes("text/event-stream") && response.body) {
    let announced = false;
    const state = await consumeSseChatStream(response.body, (next) => {
      if (!announced && next.content.trim()) {
        announced = true;
        onOutputStart?.();
      }
    });
    return completionFromState(state);
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  if (!response.ok) {
    const message = payload?.error?.message ?? `LLM API error ${response.status}`;
    throw new LlmClientError("upstream_error", message);
  }

  const state = createChatStreamState();
  consumeChatCompletionPayload(state, payload);
  const result = completionFromState(state);
  if (result.content.trim()) {
    onOutputStart?.();
  }
  return result;
}

export async function callOpenAiCompatibleChat(
  options: OpenAiCompatibleOptions,
): Promise<ChatCompletionResult> {
  return requestOpenAiCompatibleChat(options, false);
}

async function requestOpenAiCompatibleChat(
  options: OpenAiCompatibleOptions,
  forceLowEffort: boolean,
): Promise<ChatCompletionResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.extraHeaders,
  };
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(options.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(buildOpenAiChatBody(options, forceLowEffort)),
      signal: options.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (error instanceof TypeError) {
      throw new LlmClientError("connection_dropped", CONNECTION_DROPPED_MESSAGE);
    }
    throw error;
  }

  const result = await readOpenAiChatResponse(response, options.onOutputStart);
  if (result.content.trim()) {
    return result;
  }

  if (result.finishReason === "length" && !forceLowEffort) {
    return requestOpenAiCompatibleChat(options, true);
  }
  if (result.finishReason === "length") {
    throw new LlmClientError("reasoning_budget", REASONING_BUDGET_MESSAGE);
  }
  throw new LlmClientError("empty_response", "LLM API returned empty content");
}

export async function callGeminiChat(
  apiKey: string,
  model: string,
  messages: LlmChatMessage[],
  jsonMode = true,
  temperature = 0.2,
  maxTokens?: number,
  signal?: AbortSignal,
  onOutputStart?: () => void,
): Promise<ChatCompletionResult> {
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

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemMessage
          ? { parts: [{ text: systemMessage.content }] }
          : undefined,
        contents,
        generationConfig,
      }),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (error instanceof TypeError) {
      throw new LlmClientError("connection_dropped", CONNECTION_DROPPED_MESSAGE);
    }
    throw error;
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
        usageMetadata?: unknown;
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

  onOutputStart?.();
  return {
    content: text,
    usage: readTokenUsage(payload?.usageMetadata),
  };
}
