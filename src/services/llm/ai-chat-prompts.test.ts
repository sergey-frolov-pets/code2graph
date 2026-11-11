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

  it("puts one syntax page into the prompt and does not expand its links", () => {
    const block = buildAiChatContextBlock({
      format: "mermaid",
      source: "waterfall\n=10 : Start",
      userRequest: "добавь разрыв шкалы",
      appliedCount: 0,
      rejectedTitles: [],
    });
    expect(block).toContain("break 200 --> 700");
    expect(block).not.toContain("selects the Mermaid Ext type");
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
