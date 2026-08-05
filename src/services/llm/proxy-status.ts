import { resolveLlmProxyBaseUrl } from "@/utils/llm-proxy";

export type LlmProxyProviderStatus = {
  id: string;
  model: string;
  configured: boolean;
};

export type LlmProxyStatus = {
  ok: boolean;
  rateLimitPerMinute: number;
  providers: LlmProxyProviderStatus[];
};

export async function fetchLlmProxyStatus(): Promise<LlmProxyStatus | null> {
  const baseUrl = resolveLlmProxyBaseUrl();
  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/llm/status`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as LlmProxyStatus;
    if (!payload?.ok || !Array.isArray(payload.providers)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isFreeProviderConfiguredOnServer(
  status: LlmProxyStatus | null,
  providerId: string,
): boolean | null {
  if (!status) {
    return null;
  }

  const provider = status.providers.find((entry) => entry.id === providerId);
  return provider?.configured ?? false;
}
