export const LLM_PROVIDER_KIND = {
  BYOK: "byok",
  FREE_BUILTIN: "free_builtin",
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
  apiEndpoint?: string;
  apiExtraHeaders?: Record<string, string>;
  recommended?: boolean;
}

export const DEFAULT_LLM_PROVIDER_ID = "google-gemini";
export const DEFAULT_FREE_LLM_PROVIDER_ID = "google-gemini-free";

const FREE_BUILTIN_LLM_PROVIDERS: readonly LlmProviderDefinition[] = [
  {
    id: "google-gemini-free",
    kind: LLM_PROVIDER_KIND.FREE_BUILTIN,
    requiresUserKey: false,
    nameKey: "llm.provider.googleGeminiFree",
    descriptionKey: "llm.provider.googleGeminiFreeDesc",
    defaultModel: "gemini-2.0-flash",
    recommended: true,
  },
  {
    id: "groq-free",
    kind: LLM_PROVIDER_KIND.FREE_BUILTIN,
    requiresUserKey: false,
    nameKey: "llm.provider.groqFree",
    descriptionKey: "llm.provider.groqFreeDesc",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    id: "openrouter-free",
    kind: LLM_PROVIDER_KIND.FREE_BUILTIN,
    requiresUserKey: false,
    nameKey: "llm.provider.openrouterFree",
    descriptionKey: "llm.provider.openrouterFreeDesc",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
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
    apiEndpoint: "https://api.groq.com/openai/v1/chat/completions",
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
    apiEndpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiExtraHeaders: {
      "HTTP-Referer": "https://github.com/sergey-frolov-pets/vuePUML",
      "X-Title": "vuePlantUML",
    },
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
    apiEndpoint: "https://api.mistral.ai/v1/chat/completions",
  },
  {
    id: "deepseek",
    kind: LLM_PROVIDER_KIND.BYOK,
    requiresUserKey: true,
    nameKey: "llm.provider.deepseek",
    descriptionKey: "llm.provider.deepseekDesc",
    defaultModel: "deepseek-chat",
    keyUrl: "https://platform.deepseek.com/api_keys",
    docsUrl: "https://api-docs.deepseek.com/",
    apiEndpoint: "https://api.deepseek.com/v1/chat/completions",
  },
  {
    id: "qwen",
    kind: LLM_PROVIDER_KIND.BYOK,
    requiresUserKey: true,
    nameKey: "llm.provider.qwen",
    descriptionKey: "llm.provider.qwenDesc",
    defaultModel: "qwen-plus",
    keyUrl: "https://dashscope.console.aliyun.com/apiKey",
    docsUrl: "https://help.aliyun.com/zh/model-studio/getting-started/",
    apiEndpoint:
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  },
  {
    id: "zhipu",
    kind: LLM_PROVIDER_KIND.BYOK,
    requiresUserKey: true,
    nameKey: "llm.provider.zhipu",
    descriptionKey: "llm.provider.zhipuDesc",
    defaultModel: "glm-4-flash",
    keyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    docsUrl: "https://open.bigmodel.cn/dev/api",
    apiEndpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  },
  {
    id: "moonshot",
    kind: LLM_PROVIDER_KIND.BYOK,
    requiresUserKey: true,
    nameKey: "llm.provider.moonshot",
    descriptionKey: "llm.provider.moonshotDesc",
    defaultModel: "moonshot-v1-8k",
    keyUrl: "https://platform.moonshot.cn/console/api-keys",
    docsUrl: "https://platform.moonshot.cn/docs",
    apiEndpoint: "https://api.moonshot.cn/v1/chat/completions",
  },
];

export const ALL_LLM_PROVIDERS: readonly LlmProviderDefinition[] = [
  ...FREE_BUILTIN_LLM_PROVIDERS,
  ...BYOK_LLM_PROVIDERS,
];

const PROVIDER_BY_ID = new Map(
  ALL_LLM_PROVIDERS.map((provider) => [provider.id, provider]),
);

export function resolveLlmProviderId(providerId: string): string {
  return providerId;
}

export function isLlmProviderId(value: string): boolean {
  return PROVIDER_BY_ID.has(resolveLlmProviderId(value));
}

export function getLlmProvider(providerId: string): LlmProviderDefinition | undefined {
  return PROVIDER_BY_ID.get(resolveLlmProviderId(providerId));
}

export function getDefaultLlmProviderId(): string {
  return DEFAULT_LLM_PROVIDER_ID;
}

export function getByokLlmProviders(): readonly LlmProviderDefinition[] {
  return BYOK_LLM_PROVIDERS;
}

export function getFreeBuiltinLlmProviders(): readonly LlmProviderDefinition[] {
  return FREE_BUILTIN_LLM_PROVIDERS;
}

export function isByokLlmProvider(providerId: string): boolean {
  const provider = getLlmProvider(providerId);
  return provider?.kind === LLM_PROVIDER_KIND.BYOK;
}

export function isFreeBuiltinLlmProvider(providerId: string): boolean {
  const provider = getLlmProvider(providerId);
  return provider?.kind === LLM_PROVIDER_KIND.FREE_BUILTIN;
}

export function getRecommendedLlmProvider(): LlmProviderDefinition {
  const recommended =
    ALL_LLM_PROVIDERS.find((provider) => provider.recommended) ??
    getLlmProvider(DEFAULT_LLM_PROVIDER_ID)!;
  return recommended;
}
