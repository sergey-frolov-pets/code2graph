export const FREE_BUILTIN_LLM_PROVIDER_IDS = [
  "google-gemini-free",
  "groq-free",
  "openrouter-free",
] as const;

export type FreeBuiltinLlmProviderId =
  (typeof FREE_BUILTIN_LLM_PROVIDER_IDS)[number];

export interface FreeBuiltinLlmProviderConfig {
  id: FreeBuiltinLlmProviderId;
  model: string;
  envKey: "GEMINI_API_KEY" | "GROQ_API_KEY" | "OPENROUTER_API_KEY";
}

export const FREE_BUILTIN_LLM_PROVIDERS: Record<
  FreeBuiltinLlmProviderId,
  FreeBuiltinLlmProviderConfig
> = {
  "google-gemini-free": {
    id: "google-gemini-free",
    model: "gemini-2.0-flash",
    envKey: "GEMINI_API_KEY",
  },
  "groq-free": {
    id: "groq-free",
    model: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
  },
  "openrouter-free": {
    id: "openrouter-free",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    envKey: "OPENROUTER_API_KEY",
  },
};

export function isFreeBuiltinLlmProviderId(
  value: string,
): value is FreeBuiltinLlmProviderId {
  return (FREE_BUILTIN_LLM_PROVIDER_IDS as readonly string[]).includes(value);
}
