import {
  REASONING_COMPLETION_TOKEN_FLOOR,
  applyReasoningControls,
  completionFromState,
  consumeChatCompletionPayload,
  consumeSseChatStream,
  createChatStreamState,
  modelUsesReasoningBudget,
  readTokenUsage,
  type ChatCompletionResult,
  type LlmTokenUsage,
} from "../../packages/shared/src/llm-chat-stream.js";
import { toGeminiContentParts, toOpenAiChatMessage } from "./llm-message-parts.js";
import type { LlmChatMessage } from "./llm-proxy-request.js";
import {
  FREE_BUILTIN_LLM_PROVIDERS,
  type FreeBuiltinLlmProviderId,
} from "./llm-providers.js";

const CONNECTION_DROPPED_MESSAGE = "The connection dropped before the model responded.";
const REASONING_BUDGET_MESSAGE =
  "The model used the output limit on reasoning and returned no answer.";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface UpstreamChatResult {
  content: string;
  providerId: string;
  model: string;
  usage?: LlmTokenUsage;
  reasoningContent?: string;
}

export interface UpstreamProgress {
  onDelta?: (contentDelta: string) => void;
  onWaiting?: () => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function messagesForModel(model: string, messages: LlmChatMessage[]): LlmChatMessage[] {
  if (modelUsesReasoningBudget(model)) {
    return messages;
  }
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    ...(message.images ? { images: message.images } : {}),
  }));
}

export function buildOpenAiProxyBody(input: {
  providerId: FreeBuiltinLlmProviderId;
  model: string;
  messages: LlmChatMessage[];
  jsonMode: boolean;
  maxOutputTokens: number;
  forceLowEffort: boolean;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: input.model,
    messages: messagesForModel(input.model, input.messages).map(toOpenAiChatMessage),
    max_tokens: input.maxOutputTokens,
    response_format: input.jsonMode ? { type: "json_object" } : undefined,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (input.providerId === "openrouter-free") {
    applyReasoningControls(body, {
      style: "openrouter",
      model: input.model,
      forceLowEffort: input.forceLowEffort,
      floor: REASONING_COMPLETION_TOKEN_FLOOR,
      tokenField: "max_tokens",
    });
  }
  return body;
}

async function readUpstreamCompletion(
  response: Response,
  progress?: UpstreamProgress,
): Promise<ChatCompletionResult> {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.ok && contentType.includes("text/event-stream") && response.body) {
    let sent = "";
    const state = await consumeSseChatStream(response.body, (next) => {
      if (next.content.length > sent.length && next.content.startsWith(sent)) {
        const delta = next.content.slice(sent.length);
        sent = next.content;
        if (delta) {
          progress?.onDelta?.(delta);
        }
      } else {
        progress?.onWaiting?.();
      }
    });
    return completionFromState(state);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json()) as unknown;
  const state = createChatStreamState();
  consumeChatCompletionPayload(state, payload);
  const result = completionFromState(state);
  if (result.content) {
    progress?.onDelta?.(result.content);
  }
  return result;
}

async function fetchUpstream(
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (error instanceof TypeError) {
      throw new Error(CONNECTION_DROPPED_MESSAGE);
    }
    throw error;
  }
}

function assertAnswer(result: ChatCompletionResult, forceLowEffort: boolean): ChatCompletionResult {
  if (result.content.trim()) {
    return result;
  }
  if (result.finishReason === "length" && !forceLowEffort) {
    throw new EmptyLengthError();
  }
  if (result.finishReason === "length") {
    throw new Error(REASONING_BUDGET_MESSAGE);
  }
  throw new Error("LLM API returned empty response");
}

class EmptyLengthError extends Error {
  constructor() {
    super("empty-length");
    this.name = "EmptyLengthError";
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  messages: LlmChatMessage[],
  jsonMode: boolean,
  maxOutputTokens: number,
  progress?: UpstreamProgress,
): Promise<ChatCompletionResult> {
  const systemMessage = messages.find((message) => message.role === "system");
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: toGeminiContentParts(message),
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  progress?.onWaiting?.();
  const response = await fetchUpstream(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: systemMessage
        ? { parts: [{ text: systemMessage.content }] }
        : undefined,
      contents,
      generationConfig: {
        maxOutputTokens,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: unknown;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API returned empty response");
  }
  progress?.onDelta?.(text);
  return {
    content: text,
    usage: readTokenUsage(data.usageMetadata),
  };
}

async function callOpenAiCompatible(
  providerId: FreeBuiltinLlmProviderId,
  endpoint: string,
  apiKey: string,
  model: string,
  messages: LlmChatMessage[],
  jsonMode: boolean,
  maxOutputTokens: number,
  extraHeaders: Record<string, string> | undefined,
  progress?: UpstreamProgress,
): Promise<ChatCompletionResult> {
  const request = async (forceLowEffort: boolean): Promise<ChatCompletionResult> => {
    const response = await fetchUpstream(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(
        buildOpenAiProxyBody({
          providerId,
          model,
          messages,
          jsonMode,
          maxOutputTokens,
          forceLowEffort,
        }),
      ),
    });
    const result = await readUpstreamCompletion(response, progress);
    return assertAnswer(result, forceLowEffort);
  };

  try {
    return await request(false);
  } catch (error) {
    if (!(error instanceof EmptyLengthError)) {
      throw error;
    }
    return request(true);
  }
}

export async function dispatchLlmChat(
  providerId: FreeBuiltinLlmProviderId,
  messages: LlmChatMessage[],
  jsonMode: boolean,
  apiKey: string,
  maxOutputTokens: number,
  progress?: UpstreamProgress,
): Promise<UpstreamChatResult> {
  const config = FREE_BUILTIN_LLM_PROVIDERS[providerId];
  let completion: ChatCompletionResult;

  switch (providerId) {
    case "google-gemini-free":
      completion = await callGemini(
        apiKey,
        config.model,
        messages,
        jsonMode,
        maxOutputTokens,
        progress,
      );
      break;
    case "groq-free":
      completion = await callOpenAiCompatible(
        providerId,
        GROQ_CHAT_URL,
        apiKey,
        config.model,
        messages,
        jsonMode,
        maxOutputTokens,
        undefined,
        progress,
      );
      break;
    case "openrouter-free":
      completion = await callOpenAiCompatible(
        providerId,
        OPENROUTER_CHAT_URL,
        apiKey,
        config.model,
        messages,
        jsonMode,
        maxOutputTokens,
        {
          "HTTP-Referer": "https://github.com/sergey-frolov-pets/code2graph",
          "X-Title": "Code2Graph",
        },
        progress,
      );
      break;
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }

  return {
    content: completion.content,
    providerId,
    model: config.model,
    usage: completion.usage,
    reasoningContent: completion.reasoningContent,
  };
}
