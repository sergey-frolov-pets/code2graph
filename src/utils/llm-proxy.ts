import {
  getLibraryApiBaseUrl,
  normalizeLibraryApiUrl,
} from "@/composables/useLibraryApiUrl";

export function resolveLlmProxyBaseUrl(): string {
  const libraryApiUrl = getLibraryApiBaseUrl();
  if (libraryApiUrl) {
    return libraryApiUrl;
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return normalizeLibraryApiUrl(envUrl);
  }

  // Same-origin /api works only in dev (Vite proxies to the local API server).
  if (import.meta.env.DEV && window.location.protocol !== "file:") {
    return normalizeLibraryApiUrl(new URL("./api", window.location.href).href);
  }

  return "";
}

export function resolveLlmStatusUrl(): string {
  const base = resolveLlmProxyBaseUrl();
  if (!base) {
    return "";
  }

  return `${base}/llm/status`;
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
