export const LLM_PROVIDER_KIND = {
  FREE_BUILTIN: "free_builtin",
  BYOK: "byok",
} as const;

export type LlmProviderKind =
  (typeof LLM_PROVIDER_KIND)[keyof typeof LLM_PROVIDER_KIND];

export interface LlmProviderDefinition {
  id: string;
  kind: LlmProviderKind;
  requiresUserKey: boolean;
  nameKey: string;
  descriptionKey: string;
  defaultModel: string;
  keyUrl?: string;
  docsUrl?: string;
  recommended?: boolean;
}

export const DEFAULT_LLM_PROVIDER_ID = "google-gemini-free";

const FREE_BUILTIN_LLM_PROVIDERS: readonly LlmProviderDefinition[] = [
  {
    id: "google-gemini-free",
    kind: LLM_PROVIDER_KIND.FREE_BUILTIN,
    requiresUserKey: false,
    nameKey: "llm.provider.googleGeminiFree",
    descriptionKey: "llm.provider.googleGeminiFreeDesc",
    defaultModel: "gemini-2.0-flash",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
    recommended: true,
  },
  {
    id: "groq-free",
    kind: LLM_PROVIDER_KIND.FREE_BUILTIN,
    requiresUserKey: false,
    nameKey: "llm.provider.groqFree",
    descriptionKey: "llm.provider.groqFreeDesc",
    defaultModel: "llama-3.3-70b-versatile",
    docsUrl: "https://console.groq.com/docs/quickstart",
  },
  {
    id: "openrouter-free",
    kind: LLM_PROVIDER_KIND.FREE_BUILTIN,
    requiresUserKey: false,
    nameKey: "llm.provider.openrouterFree",
    descriptionKey: "llm.provider.openrouterFreeDesc",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    docsUrl: "https://openrouter.ai/docs",
  },
];

const BYOK_LLM_PROVIDERS: readonly LlmProviderDefinition[] = [
  {
    id: "google-gemini",
    kind: LLM_PROVIDER_KIND.BYOK,
    requiresUserKey: true,
    nameKey: "llm.provider.googleGemini",
    descriptionKey: "llm.provider.googleGeminiDesc",
    defaultModel: "gemini-2.0-flash",
    keyUrl: "https://aistudio.google.com/apikey",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
    recommended: true,
  },
  {
    id: "groq",
    kind: LLM_PROVIDER_KIND.BYOK,
    requiresUserKey: true,
    nameKey: "llm.provider.groq",
    descriptionKey: "llm.provider.groqDesc",
    defaultModel: "llama-3.3-70b-versatile",
    keyUrl: "https://console.groq.com/keys",
    docsUrl: "https://console.groq.com/docs/quickstart",
  },
  {
    id: "openrouter",
    kind: LLM_PROVIDER_KIND.BYOK,
    requiresUserKey: true,
    nameKey: "llm.provider.openrouter",
    descriptionKey: "llm.provider.openrouterDesc",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    keyUrl: "https://openrouter.ai/keys",
    docsUrl: "https://openrouter.ai/docs",
  },
  {
    id: "mistral",
    kind: LLM_PROVIDER_KIND.BYOK,
    requiresUserKey: true,
    nameKey: "llm.provider.mistral",
    descriptionKey: "llm.provider.mistralDesc",
    defaultModel: "mistral-small-latest",
    keyUrl: "https://console.mistral.ai/api-keys",
    docsUrl: "https://docs.mistral.ai/",
  },
];

export const ALL_LLM_PROVIDERS: readonly LlmProviderDefinition[] = [
  ...FREE_BUILTIN_LLM_PROVIDERS,
  ...BYOK_LLM_PROVIDERS,
];

const PROVIDER_BY_ID = new Map(
  ALL_LLM_PROVIDERS.map((provider) => [provider.id, provider]),
);

export function isLlmProviderId(value: string): boolean {
  return PROVIDER_BY_ID.has(value);
}

export function getLlmProvider(providerId: string): LlmProviderDefinition | undefined {
  return PROVIDER_BY_ID.get(providerId);
}

export function getDefaultLlmProviderId(): string {
  return DEFAULT_LLM_PROVIDER_ID;
}

export function getFreeBuiltinLlmProviders(): readonly LlmProviderDefinition[] {
  return FREE_BUILTIN_LLM_PROVIDERS;
}

export function getByokLlmProviders(): readonly LlmProviderDefinition[] {
  return BYOK_LLM_PROVIDERS;
}

export function isFreeBuiltinLlmProvider(providerId: string): boolean {
  const provider = getLlmProvider(providerId);
  return provider?.kind === LLM_PROVIDER_KIND.FREE_BUILTIN;
}

export function isByokLlmProvider(providerId: string): boolean {
  const provider = getLlmProvider(providerId);
  return provider?.kind === LLM_PROVIDER_KIND.BYOK;
}

export function getRecommendedLlmProvider(): LlmProviderDefinition {
  const recommended =
    ALL_LLM_PROVIDERS.find((provider) => provider.recommended) ??
    getLlmProvider(DEFAULT_LLM_PROVIDER_ID)!;
  return recommended;
}
