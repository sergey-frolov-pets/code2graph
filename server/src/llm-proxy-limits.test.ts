import { describe, expect, it } from "vitest";
import { parseLlmProxyChatBody } from "./llm-proxy-request.js";
import {
  LLM_MAX_MESSAGES,
  LLM_MAX_MESSAGE_CHARS,
  LLM_MAX_TOTAL_CHARS,
} from "./config.js";

const providerId = "google-gemini-free";

function message(content: string, role = "user") {
  return { role, content };
}

describe("LLM proxy body limits", () => {
  it("accepts a normal request", () => {
    const parsed = parseLlmProxyChatBody({
      providerId,
      messages: [message("hello")],
    });

    expect(parsed?.messages).toHaveLength(1);
  });

  it("rejects too many messages", () => {
    const messages = Array.from({ length: LLM_MAX_MESSAGES + 1 }, () =>
      message("hi"),
    );

    expect(parseLlmProxyChatBody({ providerId, messages })).toBeNull();
  });

  it("rejects an oversized single message", () => {
    const messages = [message("x".repeat(LLM_MAX_MESSAGE_CHARS + 1))];

    expect(parseLlmProxyChatBody({ providerId, messages })).toBeNull();
  });

  it("rejects an oversized total payload", () => {
    const chunk = "x".repeat(Math.min(LLM_MAX_MESSAGE_CHARS, 4_000));
    const count = Math.ceil(LLM_MAX_TOTAL_CHARS / chunk.length) + 1;
    const messages = Array.from({ length: Math.min(count, LLM_MAX_MESSAGES) }, () =>
      message(chunk),
    );

    expect(parseLlmProxyChatBody({ providerId, messages })).toBeNull();
  });

  it("still rejects client-supplied API keys", () => {
    expect(
      parseLlmProxyChatBody({
        providerId,
        messages: [message("hi")],
        apiKey: "sk-test",
      }),
    ).toBeNull();
  });
});
