import { z } from "zod";
import { getByokLlmProviders } from "@/constants/llm-providers";

const BYOK_PROVIDER_IDS = getByokLlmProviders().map((provider) => provider.id);

const LlmApiKeyValueSchema = z.string().min(8).max(512);

const LlmApiKeysMapSchema = z.record(LlmApiKeyValueSchema).superRefine((value, ctx) => {
  for (const key of Object.keys(value)) {
    if (!BYOK_PROVIDER_IDS.includes(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown BYOK provider id: ${key}`,
        path: [key],
      });
    }
  }
});

export function parseLlmApiKeysMap(raw: string | null): Record<string, string> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const result = LlmApiKeysMapSchema.safeParse(parsed);
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

export function serializeLlmApiKeysMap(map: Record<string, string>): string {
  const validated = LlmApiKeysMapSchema.safeParse(map);
  if (!validated.success) {
    return "{}";
  }

  return JSON.stringify(validated.data);
}

export function isValidLlmApiKeyValue(value: string): boolean {
  return LlmApiKeyValueSchema.safeParse(value.trim()).success;
}
