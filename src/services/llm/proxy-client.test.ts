import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/library-credentials", () => ({
  buildLibraryAuthHeader: () => ({ Authorization: "Bearer test-token" }),
}));

vi.mock("@/utils/llm-proxy", () => ({
  resolveLlmChatUrl: () => "https://api.example.com/api/llm/chat",
}));

import { proxyLlmChat } from "@/services/llm/proxy-client";

describe("proxyLlmChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never sends user BYOK apiKey in proxy request body", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(body).not.toHaveProperty("apiKey");
      expect(body).not.toHaveProperty("api_key");
      expect(body).not.toHaveProperty("llmApiKey");
      expect(body.providerId).toBe("google-gemini-free");
      expect(body.messages).toEqual([{ role: "user", content: "hi" }]);

      return {
        ok: true,
        json: async () => ({ content: '{"ok":true}' }),
      } as Response;
    });

    vi.stubGlobal("fetch", fetchMock);

    const content = await proxyLlmChat("google-gemini-free", [
      { role: "user", content: "hi" },
    ]);

    expect(content).toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
