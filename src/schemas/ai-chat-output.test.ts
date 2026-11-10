import { describe, expect, it } from "vitest";
import { parseAiChatEnvelope } from "@/schemas/ai-chat-output";

describe("parseAiChatEnvelope", () => {
  it("parses an answer envelope", () => {
    const result = parseAiChatEnvelope(
      JSON.stringify({ kind: "answer", message: "Привет", nextSteps: ["Добавь участника"] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.nextSteps).toEqual(["Добавь участника"]);
    }
  });

  it("parses a proposal envelope inside a code fence", () => {
    const result = parseAiChatEnvelope(
      "```json\n" +
        JSON.stringify({
          kind: "proposal",
          message: "Добавил оплату",
          proposal: { source: "@startuml\n@enduml", explanation: "Оплата" },
        }) +
        "\n```",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.proposal?.source).toContain("@startuml");
    }
  });

  it("rejects invalid payloads", () => {
    expect(parseAiChatEnvelope("not json").ok).toBe(false);
    expect(parseAiChatEnvelope(JSON.stringify({ kind: "nope", message: "x" })).ok).toBe(false);
    expect(parseAiChatEnvelope(JSON.stringify({ kind: "answer" })).ok).toBe(false);
  });
});
