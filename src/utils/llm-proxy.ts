import {
  getLibraryApiBaseUrl,
  normalizeLibraryApiUrl,
} from "@/composables/useLibraryApiUrl";

export function resolveLlmProxyBaseUrl(): string {
  const libraryApiUrl = getLibraryApiBaseUrl();
  if (libraryApiUrl) {
    return libraryApiUrl;
  }

  if (window.location.protocol !== "file:") {
    return normalizeLibraryApiUrl(new URL("./api", window.location.href).href);
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return normalizeLibraryApiUrl(envUrl);
  }

  return "";
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
