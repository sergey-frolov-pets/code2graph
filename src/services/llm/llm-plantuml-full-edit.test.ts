import { describe, expect, it, vi } from "vitest";
import { LAYOUT_ENGINES } from "@/constants";
import { DEFAULT_RENDER_MODE } from "@/constants/render-settings";

vi.mock("@/services/llm/llm-client", () => ({
  llmChat: vi.fn(),
}));

vi.mock("@/utils/validate-llm-plantuml", () => ({
  validateLlmResponse: vi.fn(),
  formatLlmValidationIssuesForRetry: (issues: Array<{ message: string }>) =>
    issues.map((issue) => issue.message).join("\n"),
  getMaxLlmValidationRetries: () => 0,
}));

vi.mock("@/utils/plantuml-llm-compare", () => ({
  plantUmlSourcesEqual: (left: string, right: string) => left === right,
}));

import { llmChat } from "@/services/llm/llm-client";
import { generateValidPlantUmlFullEdit } from "@/services/llm/llm-plantuml-full-edit";
import { validateLlmResponse } from "@/utils/validate-llm-plantuml";

describe("llm-plantuml-full-edit", () => {
  it("returns edited diagram when validation succeeds with changes", async () => {
    vi.mocked(llmChat).mockResolvedValueOnce({
      content: '{"plantuml":"@startuml\\nA -> B\\n@enduml"}',
      providerId: "test",
      model: "test-model",
    });
    vi.mocked(validateLlmResponse).mockResolvedValueOnce({
      valid: true,
      plantuml: "@startuml\nA -> B\n@enduml",
      output: {
        plantuml: "@startuml\nA -> B\n@enduml",
        explanation: "added edge",
      },
      issues: [],
    });

    const result = await generateValidPlantUmlFullEdit(
      "@startuml\n@enduml",
      "connect A to B",
      LAYOUT_ENGINES.smetana,
      false,
      DEFAULT_RENDER_MODE,
    );

    expect(result.hasChanges).toBe(true);
    expect(result.plantuml).toContain("A -> B");
  });

  it("returns unchanged diagram when model produces identical source", async () => {
    const source = "@startuml\n@enduml";
    vi.mocked(llmChat).mockResolvedValueOnce({
      content: `{"plantuml":"${source}"}`,
      providerId: "test",
      model: "test-model",
    });
    vi.mocked(validateLlmResponse).mockResolvedValueOnce({
      valid: true,
      plantuml: source,
      output: { plantuml: source, explanation: "noop" },
      issues: [],
    });

    const result = await generateValidPlantUmlFullEdit(
      source,
      "no real change",
      LAYOUT_ENGINES.smetana,
      false,
      DEFAULT_RENDER_MODE,
    );

    expect(result.hasChanges).toBe(false);
    expect(result.plantuml).toBe(source);
  });
});
