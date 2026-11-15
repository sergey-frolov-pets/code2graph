import { describe, expect, it } from "vitest";
import { parseAiChatSpeechRate } from "@/constants/ai-chat";
import { stripReplySpeechMarkup } from "@/utils/reply-speech";

describe("reply speech", () => {
  it("drops markdown markers and keeps the words", () => {
    expect(
      stripReplySpeechMarkup("## Title\nSee [docs](https://example.com) and `code`.\n```ts\nconst n = 1\n```\n- item"),
    ).toBe("Title See docs and code. const n = 1 item");
  });

  it("keeps only known speech rates", () => {
    expect(parseAiChatSpeechRate("1.25")).toBe(1.25);
    expect(parseAiChatSpeechRate("3")).toBe(1);
    expect(parseAiChatSpeechRate(null)).toBe(1);
  });
});
