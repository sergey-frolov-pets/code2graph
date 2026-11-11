import { describe, expect, it } from "vitest";
import { buildAiChatContextBlock } from "@/services/llm/ai-chat-prompts";

const OPEN_SOURCE = "flowchart LR\n  SecretCurrent --> Keep";

describe("buildAiChatContextBlock", () => {
  it("omits the open diagram when the user asked for a new one", () => {
    const block = buildAiChatContextBlock({
      format: "mermaid",
      source: OPEN_SOURCE,
      contextMode: "new",
      appliedCount: 0,
      rejectedTitles: [],
    });
    expect(block).toContain("Context mode: new diagram");
    expect(block).not.toContain("SecretCurrent");
  });

  it("still includes the open diagram in the current-diagram mode", () => {
    const block = buildAiChatContextBlock({
      format: "mermaid",
      source: OPEN_SOURCE,
      contextMode: "current",
      appliedCount: 1,
      rejectedTitles: [],
    });
    expect(block).toContain("SecretCurrent");
  });
});
