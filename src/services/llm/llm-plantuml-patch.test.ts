import { describe, expect, it, vi } from "vitest";
import { LAYOUT_ENGINES } from "@/constants";
import { DEFAULT_RENDER_MODE } from "@/constants/render-settings";

vi.mock("@/services/llm/llm-client", () => ({
  llmChat: vi.fn(),
}));

vi.mock("@/services/llm/llm-plantuml-full-edit", () => ({
  generateValidPlantUmlFullEdit: vi.fn(),
}));

vi.mock("@/utils/validate-llm-plantuml", () => ({
  validateLlmPlantUmlSource: vi.fn(),
  formatLlmValidationIssuesForRetry: (issues: Array<{ message: string }>) =>
    issues.map((issue) => issue.message).join("\n"),
  getMaxLlmValidationRetries: () => 0,
}));

import { llmChat } from "@/services/llm/llm-client";
import { generateValidPlantUmlFullEdit } from "@/services/llm/llm-plantuml-full-edit";
import { generateValidPlantUmlPatch } from "@/services/llm/llm-plantuml-patch";
import { validateLlmPlantUmlSource } from "@/utils/validate-llm-plantuml";

describe("llm-plantuml-patch", () => {
  it("delegates structural edits to full edit flow", async () => {
    vi.mocked(generateValidPlantUmlFullEdit).mockResolvedValueOnce({
      plantuml: "@startuml\nclass X\n@enduml",
      hasChanges: true,
    });

    const result = await generateValidPlantUmlPatch(
      "@startuml\n@enduml",
      0,
      10,
      "@startuml",
      "add a swimlane for customer",
      LAYOUT_ENGINES.smetana,
      false,
      DEFAULT_RENDER_MODE,
    );

    expect(generateValidPlantUmlFullEdit).toHaveBeenCalledOnce();
    expect(result.plantuml).toContain("class X");
  });

  it("applies patch replacement when validation succeeds", async () => {
    vi.mocked(llmChat).mockResolvedValueOnce({
      content: '{"replacement":"Alice -> Bob","explanation":"updated"}',
      providerId: "test",
      model: "test-model",
    });
    vi.mocked(validateLlmPlantUmlSource).mockResolvedValueOnce({
      valid: true,
      issues: [],
    });

    const source = "@startuml\nAlice -> Charlie\n@enduml";
    const fragment = "Alice -> Charlie";
    const start = source.indexOf(fragment);

    const result = await generateValidPlantUmlPatch(
      source,
      start,
      start + fragment.length,
      fragment,
      "rename target to Bob",
      LAYOUT_ENGINES.smetana,
      false,
      DEFAULT_RENDER_MODE,
    );

    expect(result.hasChanges).toBe(true);
    expect(result.plantuml).toContain("Alice -> Bob");
  });
});
