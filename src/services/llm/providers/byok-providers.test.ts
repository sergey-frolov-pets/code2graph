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

    const result = await callOpenAiCompatibleChat({
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: "gsk-user-secret-key",
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "test" }],
      jsonMode: true,
    });

    expect(result.content).toBe('{"diagram":"ok"}');
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
      reasoningStyle: "moonshot" as const,
      completionTokenField: "max_completion_tokens" as const,
      completionTokenFloor: 16_000,
      stream: true,
      preserveReasoning: true,
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
    expect(body).not.toHaveProperty("max_tokens");
    expect(body.reasoning_effort).toBe("low");
    expect(body.max_completion_tokens).toBe(16_000);
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
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

  it("keeps a saved Kimi token cap from falling below the reasoning floor", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callOpenAiCompatibleChat({
      endpoint: "https://api.moonshot.ai/v1/chat/completions",
      apiKey: "kimi-key",
      model: "kimi-k3.1-pro",
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 256,
      parameters: { maxTokens: 512 },
      chatRequest: {
        fixedParameters: {},
        reasoningStyle: "moonshot",
        completionTokenField: "max_completion_tokens",
        completionTokenFloor: 16_000,
        stream: true,
      },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.max_completion_tokens).toBe(16_000);
    expect(body.reasoning_effort).toBe("low");
  });

  it("assembles a streamed answer and its usage without using reasoning as the reply", async () => {
    const sse = [
      'data: {"choices":[{"delta":{"reasoning_content":"think"}}]}',
      "",
      'data: {"choices":[{"delta":{"content":"{\\"ok\\":true}"},"finish_reason":"stop"}]}',
      "",
      'data: {"choices":[],"usage":{"prompt_tokens":5,"completion_tokens":6,"total_tokens":11}}',
      "",
      "data: [DONE]",
      "",
    ].join("\n");
    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === "content-type" ? "text/event-stream" : null),
      },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sse));
          controller.close();
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const onOutputStart = vi.fn();

    const result = await callOpenAiCompatibleChat({
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "or-key",
      model: "google/gemma-4-31b-it:free",
      messages: [{ role: "user", content: "ping" }],
      chatRequest: { fixedParameters: {}, reasoningStyle: "openrouter", stream: true },
      onOutputStart,
    });

    expect(result.content).toBe('{"ok":true}');
    expect(result.reasoningContent).toBe("think");
    expect(result.usage).toEqual({ promptTokens: 5, completionTokens: 6, totalTokens: 11 });
    expect(onOutputStart).toHaveBeenCalledOnce();
  });

  it("retries once when reasoning consumes the output limit", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "", reasoning: "only thinking" }, finish_reason: "length" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callOpenAiCompatibleChat({
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: "or-key",
      model: "google/gemma-4-31b-it:free",
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 512,
      chatRequest: {
        fixedParameters: {},
        reasoningStyle: "openrouter",
        completionTokenField: "max_tokens",
        stream: true,
      },
    });

    expect(result.content).toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as Record<string, unknown>;
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body)) as Record<string, unknown>;
    expect(firstBody).not.toHaveProperty("reasoning");
    expect(firstBody.max_tokens).toBe(512);
    expect(secondBody.reasoning).toEqual({ effort: "low" });
    expect(secondBody.max_tokens).toBe(16_000);
  });

  it("does not surface a raw failed-to-fetch error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      callOpenAiCompatibleChat({
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: "or-key",
        model: "google/gemma-4-31b-it:free",
        messages: [{ role: "user", content: "ping" }],
      }),
    ).rejects.toMatchObject({
      code: "connection_dropped",
      message: "The connection dropped before the model responded.",
    });
  });

  it("sends Kimi reasoning back and leaves it off for other providers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await callOpenAiCompatibleChat({
      endpoint: "https://api.moonshot.ai/v1/chat/completions",
      apiKey: "kimi-key",
      model: "kimi-k3.1-pro",
      messages: [
        { role: "user", content: "ping" },
        { role: "assistant", content: "pong", reasoningContent: "kept" },
      ],
      chatRequest: {
        fixedParameters: {},
        reasoningStyle: "moonshot",
        preserveReasoning: true,
        completionTokenField: "max_completion_tokens",
        completionTokenFloor: 16_000,
      },
    });

    const kimiBody = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as {
      messages: Array<{ reasoning_content?: string }>;
    };
    expect(kimiBody.messages[1]?.reasoning_content).toBe("kept");

    await callOpenAiCompatibleChat({
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: "gsk-user-secret-key",
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "assistant", content: "pong", reasoningContent: "drop-me" },
      ],
    });
    const groqBody = JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body)) as {
      messages: Array<Record<string, unknown>>;
    };
    expect(groqBody.messages[0]).not.toHaveProperty("reasoning_content");
  });
});
