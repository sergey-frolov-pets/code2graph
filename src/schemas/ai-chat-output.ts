import { z } from "zod";
import { stripJsonCodeFence } from "@/schemas/plantuml-llm-output";

export const AiChatEnvelopeSchema = z.object({
  kind: z.enum(["answer", "clarification", "proposal", "answer_with_proposal"]),
  message: z.string().min(1).max(8000),
  questions: z.array(z.string().min(1).max(500)).max(3).optional(),
  options: z.array(z.array(z.string().min(1).max(200)).max(6)).max(3).optional(),
  proposal: z
    .object({
      source: z.string().min(1).max(200000),
      explanation: z.string().max(2000).optional(),
    })
    .optional(),
  nextSteps: z.array(z.string().min(1).max(200)).max(4).optional(),
});

export type AiChatEnvelope = z.infer<typeof AiChatEnvelopeSchema>;

export function parseAiChatEnvelope(raw: string):
  | { ok: true; data: AiChatEnvelope }
  | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(stripJsonCodeFence(raw)) as unknown;
    const result = AiChatEnvelopeSchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, message: result.error.issues[0]?.message ?? "Invalid AI chat response" };
    }
    return { ok: true, data: result.data };
  } catch {
    return { ok: false, message: "Invalid JSON in AI chat response" };
  }
}
