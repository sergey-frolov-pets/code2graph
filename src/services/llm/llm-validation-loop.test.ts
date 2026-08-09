import { describe, expect, it, vi } from "vitest";
import {
  appendJsonValidationRetry,
  runLlmJsonValidationLoop,
} from "@/services/llm/llm-validation-loop";
import type { LlmChatMessage } from "@/services/llm/llm-types";

vi.mock("@/services/llm/llm-client", () => ({
  llmChat: vi.fn(),
}));

vi.mock("@/utils/validate-llm-plantuml", () => ({
  formatLlmValidationIssuesForRetry: (issues: Array<{ message: string }>) =>
    issues.map((issue) => issue.message).join("\n"),
  getMaxLlmValidationRetries: () => 1,
}));

import { llmChat } from "@/services/llm/llm-client";

describe("llm-validation-loop", () => {
  it("returns validated result on first attempt", async () => {
    vi.mocked(llmChat).mockResolvedValueOnce({
      content: '{"plantuml":"@startuml\\n@enduml"}',
      providerId: "test",
      model: "test-model",
    });

    const messages: LlmChatMessage[] = [{ role: "user", content: "test" }];
    const result = await runLlmJsonValidationLoop(
      messages,
      async () => ({
        valid: true,
        result: { plantuml: "@startuml\n@enduml" },
        issues: [],
      }),
    );

    expect(result.plantuml).toContain("@startuml");
  });

  it("appends retry messages for invalid responses", () => {
    const messages: LlmChatMessage[] = [{ role: "user", content: "test" }];

    appendJsonValidationRetry(messages, "bad json", [
      { layer: "json", message: "missing field" },
    ]);

    expect(messages).toHaveLength(3);
    expect(messages[1]?.role).toBe("assistant");
    expect(messages[2]?.content).toContain("missing field");
  });
});
