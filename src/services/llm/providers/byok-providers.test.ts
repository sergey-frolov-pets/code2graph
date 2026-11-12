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

import {
  applySavedChatParameters,
  callOpenAiCompatibleChat,
  omitFixedChatParameters,
} from "@/services/llm/providers/byok-providers";

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

  it("sends an attached image as an OpenAI content part", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"message":"ok"}' } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callOpenAiCompatibleChat({
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: "gsk-user-secret-key",
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: "describe",
          images: [{ mimeType: "image/png", dataBase64: "abcd" }],
        },
      ],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      messages: Array<{ content: Array<{ type: string; image_url?: { url: string } }> }>;
    };
    expect(body.messages[0]?.content[1]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,abcd" },
    });
  });

  it("omits parameters that the provider config marks as fixed", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const chatRequest = {
      fixedParameters: {
        temperature: { value: 1 },
        top_p: { value: 0.95 },
        n: { value: 1 },
        presence_penalty: { value: 0 },
        frequency_penalty: { value: 0 },
      },
    };
    const draft = {
      temperature: 0.2,
      top_p: 0.5,
      n: 2,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    };
    omitFixedChatParameters(draft, chatRequest);
    expect(draft).toEqual({});

    await callOpenAiCompatibleChat({
      endpoint: "https://api.moonshot.ai/v1/chat/completions",
      apiKey: "kimi-key",
      model: "kimi-k3.1-pro",
      messages: [{ role: "user", content: "ping" }],
      temperature: 0.2,
      chatRequest,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.model).toBe("kimi-k3.1-pro");
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("top_p");
    expect(body).not.toHaveProperty("n");
    expect(body).not.toHaveProperty("presence_penalty");
    expect(body).not.toHaveProperty("frequency_penalty");
  });

  it("sends parameters saved on the key unless the provider fixes them", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const saved = {
      temperature: 0.4,
      topP: 0.8,
      maxTokens: 256,
    };
    const openBody: Record<string, unknown> = { temperature: 0.2 };
    applySavedChatParameters(openBody, saved);
    expect(openBody).toMatchObject({ temperature: 0.4, top_p: 0.8, max_tokens: 256 });

    await callOpenAiCompatibleChat({
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: "gsk-user-secret-key",
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "ping" }],
      temperature: 0.2,
      parameters: saved,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.temperature).toBe(0.4);
    expect(body.top_p).toBe(0.8);
    expect(body.max_tokens).toBe(256);
  });

  it("omits Authorization when a local server has no API key", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callOpenAiCompatibleChat({
      endpoint: "http://127.0.0.1:11434/v1/chat/completions",
      model: "llama3.2",
      messages: [{ role: "user", content: "ping" }],
      jsonMode: false,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty("Authorization");
  });
});
