import { describe, expect, it } from "vitest";
import { resolveOpenAiChatEndpoint } from "@/utils/llm-endpoint";

describe("resolveOpenAiChatEndpoint", () => {
  it("appends the chat completions path to an Ollama /v1 base", () => {
    expect(resolveOpenAiChatEndpoint("http://127.0.0.1:11434/v1")).toBe(
      "http://127.0.0.1:11434/v1/chat/completions",
    );
    expect(resolveOpenAiChatEndpoint("http://127.0.0.1:11434/v1/")).toBe(
      "http://127.0.0.1:11434/v1/chat/completions",
    );
  });

  it("keeps a full chat completions URL", () => {
    expect(
      resolveOpenAiChatEndpoint("http://127.0.0.1:1234/v1/chat/completions"),
    ).toBe("http://127.0.0.1:1234/v1/chat/completions");
  });

  it("adds /v1/chat/completions when only the host is given", () => {
    expect(resolveOpenAiChatEndpoint("http://127.0.0.1:11434")).toBe(
      "http://127.0.0.1:11434/v1/chat/completions",
    );
  });

  it("rejects non-http addresses", () => {
    expect(resolveOpenAiChatEndpoint("file:///tmp/model")).toBeNull();
    expect(resolveOpenAiChatEndpoint("javascript:alert(1)")).toBeNull();
    expect(resolveOpenAiChatEndpoint("not a url")).toBeNull();
    expect(resolveOpenAiChatEndpoint("")).toBeNull();
  });
});
