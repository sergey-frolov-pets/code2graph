import { describe, expect, it } from "vitest";
import { parsePlantUmlSyntaxAskOutput } from "@/schemas/plantuml-llm-syntax-ask";

describe("parsePlantUmlSyntaxAskOutput", () => {
  it("parses valid JSON with answer", () => {
    const result = parsePlantUmlSyntaxAskOutput(
      JSON.stringify({
        answer: "Use `if` / `elseif` / `else` / `endif` for nested conditions.",
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.answer).toContain("if");
    }
  });

  it("strips markdown code fences", () => {
    const result = parsePlantUmlSyntaxAskOutput(
      '```json\n{"answer":"Use fork again."}\n```',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.answer).toBe("Use fork again.");
    }
  });

  it("rejects missing answer", () => {
    const result = parsePlantUmlSyntaxAskOutput(JSON.stringify({}));

    expect(result.ok).toBe(false);
  });
});
