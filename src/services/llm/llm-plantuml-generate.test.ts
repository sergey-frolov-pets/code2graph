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

vi.mock("@/utils/validate-llm-mermaid", () => ({
  validateLlmMermaidResponse: vi.fn(),
}));

import { llmChat } from "@/services/llm/llm-client";
import {
  askPlantUmlSyntaxQuestion,
  generateValidPlantUml,
  generateValidWizardDiagram,
} from "@/services/llm/llm-plantuml-generate";
import { validateLlmMermaidResponse } from "@/utils/validate-llm-mermaid";
import { validateLlmResponse } from "@/utils/validate-llm-plantuml";
import { LlmClientError } from "@/services/llm/llm-types";

describe("llm-plantuml-generate", () => {
  it("returns validated plantuml on first attempt", async () => {
    vi.mocked(llmChat).mockResolvedValueOnce({
      content: '{"plantuml":"@startuml\\nA -> B\\n@enduml"}',
      providerId: "test",
      model: "test-model",
    });
    vi.mocked(validateLlmResponse).mockResolvedValueOnce({
      valid: true,
      plantuml: "@startuml\nA -> B\n@enduml",
      output: { plantuml: "@startuml\nA -> B\n@enduml", explanation: "ok" },
      issues: [],
    });

    const result = await generateValidPlantUml(
      "draw flow",
      LAYOUT_ENGINES.smetana,
      false,
      DEFAULT_RENDER_MODE,
    );

    expect(result.plantuml).toContain("A -> B");
    expect(result.explanation).toBe("ok");
  });

  it("rejects graphml wizard generation", async () => {
    await expect(
      generateValidWizardDiagram(
        "prompt",
        "graphml",
        "graph",
        LAYOUT_ENGINES.smetana,
        false,
        DEFAULT_RENDER_MODE,
      ),
    ).rejects.toBeInstanceOf(LlmClientError);
  });

  it("validates wizard mermaid responses", async () => {
    vi.mocked(llmChat).mockResolvedValueOnce({
      content: '{"plantuml":"flowchart TD\\nA-->B"}',
      providerId: "test",
      model: "test-model",
    });
    vi.mocked(validateLlmMermaidResponse).mockResolvedValueOnce({
      valid: true,
      plantuml: "flowchart TD\nA-->B",
      output: { plantuml: "flowchart TD\nA-->B", explanation: "mermaid" },
      issues: [],
    });

    const result = await generateValidWizardDiagram(
      "draw flow",
      "mermaid",
      "graph",
      LAYOUT_ENGINES.smetana,
      false,
      DEFAULT_RENDER_MODE,
    );

    expect(result.plantuml).toContain("flowchart");
  });

  it("parses syntax ask answers", async () => {
    vi.mocked(llmChat).mockResolvedValueOnce({
      content: '{"answer":"Use `note right of A`"}',
      providerId: "test",
      model: "test-model",
    });

    const result = await askPlantUmlSyntaxQuestion(
      "@startuml\n@enduml",
      "How to add a note?",
    );

    expect(result.answer).toContain("note right");
  });
});
