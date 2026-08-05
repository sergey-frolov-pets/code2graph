import { z } from "zod";
import { MAX_PUML_FILE_BYTES } from "@/constants/diagram-library";

export const PlantUmlLlmOutputSchema = z.object({
  plantuml: z
    .string()
    .min(10, "plantuml text is too short")
    .max(MAX_PUML_FILE_BYTES, "plantuml text exceeds max size"),
  explanation: z.string().max(2000).optional(),
});

export type PlantUmlLlmOutput = z.infer<typeof PlantUmlLlmOutputSchema>;

export type PlantUmlLlmParseIssue = {
  layer: "json";
  message: string;
};

export function stripJsonCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)```\s*$/i.exec(trimmed);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  return trimmed;
}

export function parsePlantUmlLlmOutput(raw: string): {
  ok: true;
  data: PlantUmlLlmOutput;
} | {
  ok: false;
  issues: PlantUmlLlmParseIssue[];
} {
  const normalized = stripJsonCodeFence(raw);

  try {
    const parsed = JSON.parse(normalized) as unknown;
    const result = PlantUmlLlmOutputSchema.safeParse(parsed);

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
