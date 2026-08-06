import type { LlmChatMessage, LlmChatOptions } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import { buildLibraryAuthHeader } from "@/config/library-credentials";
import { resolveLlmChatUrl } from "@/utils/llm-proxy";

export async function proxyLlmChat(
  providerId: string,
  messages: LlmChatMessage[],
  options: LlmChatOptions = {},
): Promise<string> {
  const chatUrl = resolveLlmChatUrl();
  if (!chatUrl) {
    throw new LlmClientError(
      "no_proxy",
      "LLM proxy URL is not configured",
    );
  }

  const response = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildLibraryAuthHeader(),
    },
    body: JSON.stringify({
      providerId,
      messages,
      jsonMode: options.jsonMode ?? true,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { content?: string; message?: string; error?: string }
    | null;

  if (!response.ok) {
    const message =
      payload?.message ??
      payload?.error ??
      (response.status === 405
        ? "LLM proxy is not available on this host (HTTP 405). Set the library server URL in Settings."
        : `Proxy request failed with status ${response.status}`);
    throw new LlmClientError("proxy_error", message);
  }

  if (!payload?.content) {
    throw new LlmClientError("empty_response", "Proxy returned empty content");
  }

  return payload.content;
}
