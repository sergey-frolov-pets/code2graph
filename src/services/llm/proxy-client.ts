import type { LlmChatMessage, LlmChatOptions, LlmTokenUsage } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import { buildLibraryAuthHeader } from "@/config/library-credentials";
import { iterateSseData } from "@shared/llm-chat-stream";
import { resolveLlmChatUrl } from "@/utils/llm-proxy";

export interface ProxyChatResult {
  content: string;
  usage?: LlmTokenUsage;
  reasoningContent?: string;
}

const CONNECTION_DROPPED_MESSAGE = "The connection dropped before the model responded.";

function buildProxyChatBody(
  providerId: string,
  messages: LlmChatMessage[],
  options: LlmChatOptions,
): Record<string, unknown> {
  return {
    providerId,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
      ...(message.images?.length ? { images: message.images } : {}),
      ...(message.reasoningContent ? { reasoningContent: message.reasoningContent } : {}),
    })),
    jsonMode: options.jsonMode ?? true,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function readClientUsage(raw: unknown): LlmTokenUsage | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.promptTokens !== "number" || typeof record.totalTokens !== "number") {
    return undefined;
  }
  return {
    promptTokens: record.promptTokens,
    completionTokens: typeof record.completionTokens === "number" ? record.completionTokens : 0,
    totalTokens: record.totalTokens,
  };
}

async function readProxyStream(
  body: ReadableStream<Uint8Array>,
  onOutputStart?: () => void,
): Promise<ProxyChatResult> {
  let content = "";
  let usage: LlmTokenUsage | undefined;
  let reasoningContent: string | undefined;
  let announced = false;

  for await (const data of iterateSseData(body)) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(data) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (event.type === "error") {
      const message = typeof event.message === "string" ? event.message : "Proxy request failed";
      throw new LlmClientError("proxy_error", message);
    }
    if (event.type === "delta" && typeof event.content === "string") {
      content += event.content;
      if (!announced && content.trim()) {
        announced = true;
        onOutputStart?.();
      }
    }
    if (event.type === "done") {
      if (typeof event.content === "string") {
        content = event.content;
      }
      usage = readClientUsage(event.usage);
      if (typeof event.reasoningContent === "string" && event.reasoningContent) {
        reasoningContent = event.reasoningContent;
      }
      if (!announced && content.trim()) {
        announced = true;
        onOutputStart?.();
      }
    }
  }

  if (!content.trim()) {
    throw new LlmClientError("empty_response", "Proxy returned empty content");
  }

  return {
    content,
    ...(usage ? { usage } : {}),
    ...(reasoningContent ? { reasoningContent } : {}),
  };
}

export async function proxyLlmChat(
  providerId: string,
  messages: LlmChatMessage[],
  options: LlmChatOptions = {},
): Promise<ProxyChatResult> {
  const chatUrl = resolveLlmChatUrl();
  if (!chatUrl) {
    throw new LlmClientError(
      "no_proxy",
      "LLM proxy URL is not configured",
    );
  }

  let response: Response;
  try {
    response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildLibraryAuthHeader(),
      },
      body: JSON.stringify(buildProxyChatBody(providerId, messages, options)),
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

  const contentType = response.headers?.get?.("content-type") ?? "";
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    const message =
      payload?.message ??
      payload?.error ??
      (response.status === 405
        ? "LLM proxy is not available on this host (HTTP 405). Set the library server URL in Settings."
        : `Proxy request failed with status ${response.status}`);
    throw new LlmClientError("proxy_error", message);
  }

  if (contentType.includes("text/event-stream") && response.body) {
    return readProxyStream(response.body, options.onOutputStart);
  }

  const payload = (await response.json().catch(() => null)) as
    | { content?: string; usage?: unknown; reasoningContent?: string }
    | null;
  if (!payload?.content) {
    throw new LlmClientError("empty_response", "Proxy returned empty content");
  }
  options.onOutputStart?.();
  const usage = readClientUsage(payload.usage);
  return {
    content: payload.content,
    ...(usage ? { usage } : {}),
    ...(payload.reasoningContent ? { reasoningContent: payload.reasoningContent } : {}),
  };
}
