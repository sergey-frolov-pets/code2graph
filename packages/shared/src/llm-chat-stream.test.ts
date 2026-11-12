import { describe, expect, it } from "vitest";
import {
  REASONING_COMPLETION_TOKEN_FLOOR,
  REASONING_EFFORT_LOW,
  applyCompletionTokenLimit,
  applyReasoningControls,
  consumeChatCompletionPayload,
  consumeSseChatStream,
  createChatStreamState,
  modelUsesReasoningBudget,
  readMessageText,
  readTokenUsage,
} from "./llm-chat-stream.js";

function streamFrom(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe("llm chat stream", () => {
  it("treats kimi, thinking, o-series and gpt-5 ids as reasoning models", () => {
    expect(modelUsesReasoningBudget("kimi-k3.1-pro")).toBe(true);
    expect(modelUsesReasoningBudget("moonshotai/kimi-k2-thinking")).toBe(true);
    expect(modelUsesReasoningBudget("deepseek/deepseek-r1-reasoner")).toBe(true);
    expect(modelUsesReasoningBudget("openai/o3-mini")).toBe(true);
    expect(modelUsesReasoningBudget("openai/gpt-5")).toBe(true);
    expect(modelUsesReasoningBudget("google/gemma-4-31b-it:free")).toBe(false);
  });

  it("joins text parts and ignores non-text parts", () => {
    expect(
      readMessageText([
        { type: "text", text: "{\"ok\":" },
        { type: "image_url" },
        { type: "text", text: "true}" },
      ]),
    ).toBe('{"ok":true}');
  });

  it("reads OpenAI and Gemini usage fields", () => {
    expect(readTokenUsage({ prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 })).toEqual({
      promptTokens: 3,
      completionTokens: 4,
      totalTokens: 7,
    });
    expect(
      readTokenUsage({ promptTokenCount: 1, candidatesTokenCount: 2, totalTokenCount: 3 }),
    ).toEqual({
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
    });
  });

  it("keeps reasoning out of the visible answer and records usage from the final chunk", async () => {
    const sse = [
      'data: {"choices":[{"delta":{"reasoning_content":"think"},"finish_reason":null}]}',
      "",
      'data: {"choices":[{"delta":{"content":"{\\"ok\\":true}"},"finish_reason":"stop"}]}',
      "",
      'data: {"choices":[],"usage":{"prompt_tokens":11,"completion_tokens":22,"total_tokens":33}}',
      "",
      "data: [DONE]",
      "",
    ].join("\n");

    const state = await consumeSseChatStream(streamFrom(sse));
    expect(state.content).toBe('{"ok":true}');
    expect(state.reasoningContent).toBe("think");
    expect(state.finishReason).toBe("stop");
    expect(state.usage).toEqual({
      promptTokens: 11,
      completionTokens: 22,
      totalTokens: 33,
    });
  });

  it("reads a non-streaming completion without substituting reasoning", () => {
    const state = createChatStreamState();
    consumeChatCompletionPayload(state, {
      choices: [
        {
          finish_reason: "length",
          message: { content: "", reasoning: "hidden" },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });
    expect(state.content).toBe("");
    expect(state.reasoningContent).toBe("hidden");
    expect(state.finishReason).toBe("length");
  });

  it("raises a saved token cap to the reasoning floor and uses Kimi's field", () => {
    const body: Record<string, unknown> = { max_tokens: 256, temperature: 0.2 };
    applyCompletionTokenLimit(body, {
      field: "max_completion_tokens",
      floor: REASONING_COMPLETION_TOKEN_FLOOR,
    });
    expect(body.max_tokens).toBeUndefined();
    expect(body.max_completion_tokens).toBe(REASONING_COMPLETION_TOKEN_FLOOR);
    expect(body.temperature).toBe(0.2);
  });

  it("sets OpenRouter reasoning only for thinking models unless a retry forces it", () => {
    const plain: Record<string, unknown> = { max_tokens: 512 };
    applyReasoningControls(plain, {
      style: "openrouter",
      model: "google/gemma-4-31b-it:free",
      forceLowEffort: false,
      floor: REASONING_COMPLETION_TOKEN_FLOOR,
      tokenField: "max_tokens",
    });
    expect(plain).toEqual({ max_tokens: 512 });

    const kimi: Record<string, unknown> = { max_tokens: 512 };
    applyReasoningControls(kimi, {
      style: "openrouter",
      model: "moonshotai/kimi-k2",
      forceLowEffort: false,
      floor: REASONING_COMPLETION_TOKEN_FLOOR,
      tokenField: "max_tokens",
    });
    expect(kimi.reasoning).toEqual({ effort: REASONING_EFFORT_LOW });
    expect(kimi.max_tokens).toBe(REASONING_COMPLETION_TOKEN_FLOOR);

    const retry: Record<string, unknown> = { max_tokens: 512 };
    applyReasoningControls(retry, {
      style: "openrouter",
      model: "google/gemma-4-31b-it:free",
      forceLowEffort: true,
      floor: REASONING_COMPLETION_TOKEN_FLOOR,
      tokenField: "max_tokens",
    });
    expect(retry.reasoning).toEqual({ effort: REASONING_EFFORT_LOW });
  });
});
