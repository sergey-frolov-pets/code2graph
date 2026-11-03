import { z } from "zod";
import { parseLlmClarificationQuestion } from "@/schemas/llm-clarification";
import { stripJsonCodeFence } from "@/schemas/plantuml-llm-output";

export const PlantUmlSyntaxAskAnswerSchema = z.object({
  answer: z.string().min(1, "answer is required").max(8000),
});

export type PlantUmlSyntaxAskOutput = z.infer<typeof PlantUmlSyntaxAskAnswerSchema>;

export type PlantUmlSyntaxAskParseIssue = {
  layer: "json";
  message: string;
};

export type PlantUmlSyntaxAskParseResult =
  | {
      ok: true;
      kind: "answer";
      data: PlantUmlSyntaxAskOutput;
    }
  | {
      ok: true;
      kind: "clarification";
      clarificationQuestion: string;
      explanation?: string;
    }
  | {
      ok: false;
      issues: PlantUmlSyntaxAskParseIssue[];
    };

export function parsePlantUmlSyntaxAskOutput(raw: string): PlantUmlSyntaxAskParseResult {
  const clarification = parseLlmClarificationQuestion(raw);
  if (clarification.ok) {
    return {
      ok: true,
      kind: "clarification",
      clarificationQuestion: clarification.data.clarificationQuestion,
      explanation: clarification.data.explanation,
    };
  }

  const normalized = stripJsonCodeFence(raw);

  try {
    const parsed = JSON.parse(normalized) as unknown;
    const result = PlantUmlSyntaxAskAnswerSchema.safeParse(parsed);

    if (!result.success) {
      return {
        ok: false,
        issues: result.error.issues.map((issue) => ({
          layer: "json" as const,
          message: issue.message,
        })),
      };
    }

    return { ok: true, kind: "answer", data: result.data };
  } catch {
    return {
      ok: false,
      issues: [{ layer: "json", message: "Invalid JSON in LLM response" }],
    };
  }
}
