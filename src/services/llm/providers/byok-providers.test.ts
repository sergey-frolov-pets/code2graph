import { afterEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.mock("@/constants/llm-providers", () => ({
  getLlmProvider: (id: string) => {
    if (id === "groq") {
      return {
        id: "groq",
        defaultModel: "llama-3.3-70b-versatile",
        apiEndpoint: "https://api.groq.com/openai/v1/chat/completions",
      };
    }
    return null;
  },
}));

import { callOpenAiCompatibleChat } from "@/services/llm/providers/byok-providers";

describe("BYOK LLM providers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("calls provider API directly, not the Code2Graph server", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"diagram":"ok"}' } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const content = await callOpenAiCompatibleChat({
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: "gsk-user-secret-key",
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "test" }],
      jsonMode: true,
    });

    expect(content).toBe('{"diagram":"ok"}');
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(url).not.toContain("code2graph");
    expect(url).not.toContain("/api/llm");

    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty("apiKey");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer gsk-user-secret-key",
    });
  });
});
