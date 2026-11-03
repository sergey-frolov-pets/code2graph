import { z } from "zod";
import { stripJsonCodeFence } from "@/schemas/plantuml-llm-output";

export const LlmClarificationQuestionSchema = z.object({
  clarificationQuestion: z.string().min(1).max(2000),
  explanation: z.string().max(2000).optional(),
});

export type LlmClarificationQuestion = z.infer<typeof LlmClarificationQuestionSchema>;

export function parseLlmClarificationQuestion(raw: string): {
  ok: true;
  data: LlmClarificationQuestion;
} | {
  ok: false;
} {
  const normalized = stripJsonCodeFence(raw);

  try {
    const parsed = JSON.parse(normalized) as unknown;
    const result = LlmClarificationQuestionSchema.safeParse(parsed);

    if (!result.success) {
      return { ok: false };
    }

    return { ok: true, data: result.data };
  } catch {
    return { ok: false };
  }
}
