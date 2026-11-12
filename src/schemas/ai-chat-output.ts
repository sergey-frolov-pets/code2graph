import { z } from "zod";
import { AI_CHAT_READ_PAGE_PATH_MAX_CHARS, AI_CHAT_READ_PAGES_MAX } from "@/constants/ai-chat";
import { DIAGRAM_FORMATS } from "@/constants/diagram-format-ids";
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
      format: z.enum(DIAGRAM_FORMATS).optional(),
      diagramType: z.string().min(1).max(40).optional(),
    })
    .optional(),
  nextSteps: z.array(z.string().min(1).max(200)).max(4).optional(),
});

export type AiChatEnvelope = z.infer<typeof AiChatEnvelopeSchema>;

/** Скрытый запрос страниц. В ленту чата не попадает. Лишние пути обрезаются до лимита. */
export function parseAiChatReadPages(raw: string): string[] | null {
  try {
    const parsed = JSON.parse(stripJsonCodeFence(raw)) as unknown;
    if (!parsed || typeof parsed !== "object" || !("kind" in parsed) || parsed.kind !== "read_pages") {
      return null;
    }
    if (!("paths" in parsed) || !Array.isArray(parsed.paths)) {
      return null;
    }
    const paths = parsed.paths
      .filter((path): path is string => typeof path === "string")
      .map((path) => path.trim())
      .filter((path) => path.length > 0 && path.length <= AI_CHAT_READ_PAGE_PATH_MAX_CHARS);
    return paths.length > 0 ? paths.slice(0, AI_CHAT_READ_PAGES_MAX) : null;
  } catch {
    return null;
  }
}

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
