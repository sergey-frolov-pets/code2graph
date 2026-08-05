import { z } from "zod";
import { MAX_PUML_FILE_BYTES } from "@/constants/diagram-library";
import {
  PlantUmlLlmOutputSchema,
  stripJsonCodeFence,
  type PlantUmlLlmParseIssue,
} from "@/schemas/plantuml-llm-output";
import { plantUmlSourcesEqual } from "@/utils/plantuml-llm-compare";

export const PlantUmlLlmPatchOutputSchema = z.object({
  replacement: z
    .string()
    .min(1, "replacement is empty")
    .max(MAX_PUML_FILE_BYTES, "replacement exceeds max size"),
  explanation: z.string().max(2000).optional(),
});

export type PlantUmlLlmPatchOutput = z.infer<typeof PlantUmlLlmPatchOutputSchema>;

export type PlantUmlLlmPatchParseResult =
  | {
      ok: true;
      mode: "replacement";
      replacement: string;
      explanation?: string;
    }
  | {
      ok: true;
      mode: "full";
      plantuml: string;
      explanation?: string;
    }
  | {
      ok: false;
      issues: PlantUmlLlmParseIssue[];
    };

export function parsePlantUmlLlmPatchOutput(raw: string): PlantUmlLlmPatchParseResult {
  const normalized = stripJsonCodeFence(raw);

  try {
    const parsed = JSON.parse(normalized) as unknown;
    const patchResult = PlantUmlLlmPatchOutputSchema.safeParse(parsed);

    if (patchResult.success) {
      return {
        ok: true,
        mode: "replacement",
        replacement: patchResult.data.replacement,
        explanation: patchResult.data.explanation,
      };
    }

    const fullResult = PlantUmlLlmOutputSchema.safeParse(parsed);
    if (fullResult.success) {
      return {
        ok: true,
        mode: "full",
        plantuml: fullResult.data.plantuml,
        explanation: fullResult.data.explanation,
      };
    }

    return {
      ok: false,
      issues: patchResult.error.issues.map((issue) => ({
        layer: "json" as const,
        message: issue.message,
      })),
    };
  } catch {
    return {
      ok: false,
      issues: [{ layer: "json", message: "Invalid JSON in LLM response" }],
    };
  }
}

export function mergePatchIntoSource(
  source: string,
  selectionStart: number,
  selectionEnd: number,
  replacement: string,
): string {
  return source.slice(0, selectionStart) + replacement + source.slice(selectionEnd);
}

export function resolvePatchMergedSource(
  source: string,
  selectionStart: number,
  selectionEnd: number,
  parsed: PlantUmlLlmPatchParseResult & { ok: true },
): string {
  if (parsed.mode === "full") {
    return parsed.plantuml;
  }

  return mergePatchIntoSource(
    source,
    selectionStart,
    selectionEnd,
    parsed.replacement,
  );
}

export function isPatchContentChanged(
  source: string,
  selectionStart: number,
  selectionEnd: number,
  mergedSource: string,
  parsed: PlantUmlLlmPatchParseResult & { ok: true },
): boolean {
  if (plantUmlSourcesEqual(mergedSource, source)) {
    return false;
  }

  if (parsed.mode === "full") {
    return true;
  }

  const before = source.slice(selectionStart, selectionEnd);
  return !plantUmlSourcesEqual(before, parsed.replacement);
}
