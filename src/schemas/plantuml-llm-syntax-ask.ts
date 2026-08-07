import { z } from "zod";
import { stripJsonCodeFence } from "@/schemas/plantuml-llm-output";

export const PlantUmlSyntaxAskSchema = z.object({
  answer: z.string().min(1, "answer is required").max(8000),
});

export type PlantUmlSyntaxAskOutput = z.infer<typeof PlantUmlSyntaxAskSchema>;

export type PlantUmlSyntaxAskParseIssue = {
  layer: "json";
  message: string;
};

export function parsePlantUmlSyntaxAskOutput(raw: string): {
  ok: true;
  data: PlantUmlSyntaxAskOutput;
} | {
  ok: false;
  issues: PlantUmlSyntaxAskParseIssue[];
} {
  const normalized = stripJsonCodeFence(raw);

  try {
    const parsed = JSON.parse(normalized) as unknown;
    const result = PlantUmlSyntaxAskSchema.safeParse(parsed);

    if (!result.success) {
      return {
        ok: false,
        issues: result.error.issues.map((issue) => ({
          layer: "json" as const,
          message: issue.message,
        })),
      };
    }

    return { ok: true, data: result.data };
  } catch {
    return {
      ok: false,
      issues: [{ layer: "json", message: "Invalid JSON in LLM response" }],
    };
  }
}
