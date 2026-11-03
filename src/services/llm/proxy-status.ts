import { buildLibraryAuthHeader } from "@/config/library-credentials";
import { resolveLlmProxyBaseUrl } from "@/utils/llm-proxy";

export interface LlmProxyProviderStatus {
  id: string;
  model: string;
  configured: boolean;
}

export interface LlmProxyStatusResponse {
  ok: boolean;
  rateLimitPerMinute: number;
  providers: LlmProxyProviderStatus[];
}

export async function fetchLlmProxyStatus(): Promise<LlmProxyStatusResponse | null> {
  const baseUrl = resolveLlmProxyBaseUrl();
  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/llm/status`, {
      headers: buildLibraryAuthHeader(),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as LlmProxyStatusResponse;
  } catch {
    return null;
  }
}
