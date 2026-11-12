import { describe, expect, it } from "vitest";
import { REASONING_COMPLETION_TOKEN_FLOOR } from "../../packages/shared/src/llm-chat-stream.js";
import { buildOpenAiProxyBody } from "./llm-upstream.js";

describe("buildOpenAiProxyBody", () => {
  it("streams OpenRouter without a reasoning budget for a normal model", () => {
    const body = buildOpenAiProxyBody({
      providerId: "openrouter-free",
      model: "google/gemma-4-31b-it:free",
      messages: [{ role: "user", content: "ping" }],
      jsonMode: true,
      maxOutputTokens: 512,
      forceLowEffort: false,
    });

    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
    expect(body.max_tokens).toBe(512);
    expect(body).not.toHaveProperty("reasoning");
  });

  it("raises the token floor for a Kimi model on OpenRouter", () => {
    const body = buildOpenAiProxyBody({
      providerId: "openrouter-free",
      model: "moonshotai/kimi-k2",
      messages: [
        { role: "assistant", content: "pong", reasoningContent: "kept" },
        { role: "user", content: "next" },
      ],
      jsonMode: false,
      maxOutputTokens: 512,
      forceLowEffort: false,
    });

    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.max_tokens).toBe(REASONING_COMPLETION_TOKEN_FLOOR);
    const messages = body.messages as Array<{ reasoning_content?: string }>;
    expect(messages[0]?.reasoning_content).toBe("kept");
  });

  it("leaves Groq on its own token cap", () => {
    const body = buildOpenAiProxyBody({
      providerId: "groq-free",
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "assistant", content: "pong", reasoningContent: "drop" }],
      jsonMode: false,
      maxOutputTokens: 256,
      forceLowEffort: false,
    });

    expect(body.max_tokens).toBe(256);
    expect(body).not.toHaveProperty("reasoning");
    const messages = body.messages as Array<Record<string, unknown>>;
    expect(messages[0]).not.toHaveProperty("reasoning_content");
  });
});
