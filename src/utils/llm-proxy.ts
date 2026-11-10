import { getLibraryApiBaseUrl } from "@/config/library-api";

/** LLM proxy uses the same resolved API as the library. Static mode returns "". */
export function resolveLlmProxyBaseUrl(): string {
  return getLibraryApiBaseUrl();
}

export function resolveLlmChatUrl(): string {
  const base = resolveLlmProxyBaseUrl();
  if (!base) {
    return "";
  }

  return `${base}/llm/chat`;
}

export function isLlmProxyConfigured(): boolean {
  return Boolean(resolveLlmProxyBaseUrl());
}
