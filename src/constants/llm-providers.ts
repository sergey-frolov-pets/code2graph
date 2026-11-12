import type { LocaleKey } from "@/locales/types";
import {
  LOCAL_LLM_DEFAULT_MODEL,
  LOCAL_LLM_PROVIDER_ID,
} from "@/constants/llm-account";

/** Бесплатная модель OpenRouter с response_format. Слаг Llama 3.3 :free снят. */
const OPENROUTER_DEFAULT_MODEL = "google/gemma-4-31b-it:free";

export const LLM_PROVIDER_KIND = {
  BYOK: "byok",
  FREE_BUILTIN: "free_builtin",
  LOCAL: "local",
} as const;

export type LlmProviderKind =
  (typeof LLM_PROVIDER_KIND)[keyof typeof LLM_PROVIDER_KIND];

/** Поля chat completions, которые провайдер может зафиксировать. */
export const LLM_CHAT_REQUEST_PARAMETERS = [
  "temperature",
  "top_p",
  "n",
  "presence_penalty",
  "frequency_penalty",
] as const;

export type LlmChatRequestParameter = (typeof LLM_CHAT_REQUEST_PARAMETERS)[number];

/** Значение зафиксировано моделью. В запрос его не отправляем. */
export interface LlmFixedChatParameter {
  value: number;
}

/** Дописать текущий ход, пока ответа нет, или всегда ставить следующее сообщение в очередь. */
export const LLM_INFLIGHT_INPUT = {
  AMEND: "amend",
  QUEUE: "queue",
} as const;

export type LlmInflightInput = (typeof LLM_INFLIGHT_INPUT)[keyof typeof LLM_INFLIGHT_INPUT];

export type LlmReasoningStyle = "moonshot" | "openrouter";

export type LlmCompletionTokenField = "max_tokens" | "max_completion_tokens";

export interface LlmChatRequestConfig {
  fixedParameters: Partial<Record<LlmChatRequestParameter, LlmFixedChatParameter>>;
  /** Пока нет токенов ответа, отменяем ход и дописываем текст. После первого токена — очередь. */
  inflightInput?: LlmInflightInput;
  reasoningStyle?: LlmReasoningStyle;
  completionTokenField?: LlmCompletionTokenField;
  completionTokenFloor?: number;
  stream?: boolean;
  preserveReasoning?: boolean;
}

export interface LlmProviderDefinition {
  id: string;
  kind: LlmProviderKind;
  requiresUserKey: boolean;
  nameKey: LocaleKey;
  descriptionKey: LocaleKey;
  defaultModel: string;
  keyUrl?: string;
  docsUrl?: string;
  apiEndpoint?: string;
  apiExtraHeaders?: Record<string, string>;
  chatRequest?: LlmChatRequestConfig;
  recommended?: boolean;
}

/** K3, включая kimi-k3.1-pro: temperature, top_p, n и штрафы менять нельзя. */
const KIMI_FIXED_TEMPERATURE = 1;
const KIMI_FIXED_TOP_P = 0.95;
const KIMI_FIXED_N = 1;
const KIMI_FIXED_PENALTY = 0;

/** K3 думает всегда. Ниже этого пола рассуждение часто забирает весь ответ. */
export const KIMI_MIN_COMPLETION_TOKENS = 16_000;

const KIMI_CHAT_REQUEST: LlmChatRequestConfig = {
  fixedParameters: {
    temperature: { value: KIMI_FIXED_TEMPERATURE },
    top_p: { value: KIMI_FIXED_TOP_P },
    n: { value: KIMI_FIXED_N },
    presence_penalty: { value: KIMI_FIXED_PENALTY },
    frequency_penalty: { value: KIMI_FIXED_PENALTY },
  },
  inflightInput: LLM_INFLIGHT_INPUT.AMEND,
  reasoningStyle: "moonshot",
  completionTokenField: "max_completion_tokens",
  completionTokenFloor: KIMI_MIN_COMPLETION_TOKENS,
  stream: true,
  preserveReasoning: true,
};

const OPENROUTER_CHAT_REQUEST: LlmChatRequestConfig = {
  fixedParameters: {},
  inflightInput: LLM_INFLIGHT_INPUT.AMEND,
  reasoningStyle: "openrouter",
  completionTokenField: "max_tokens",
  stream: true,
};

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
    defaultModel: OPENROUTER_DEFAULT_MODEL,
    chatRequest: OPENROUTER_CHAT_REQUEST,
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
    defaultModel: OPENROUTER_DEFAULT_MODEL,
    keyUrl: "https://openrouter.ai/keys",
    docsUrl: "https://openrouter.ai/docs",
    apiEndpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiExtraHeaders: {
      "HTTP-Referer": "https://github.com/sergey-frolov-pets/code2graph",
      "X-Title": "Code2Graph",
    },
    chatRequest: OPENROUTER_CHAT_REQUEST,
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
    defaultModel: "kimi-k3.1-pro",
    keyUrl: "https://platform.kimi.ai/console/api-keys",
    docsUrl: "https://platform.kimi.ai/docs/api/quickstart",
    apiEndpoint: "https://api.moonshot.ai/v1/chat/completions",
    chatRequest: KIMI_CHAT_REQUEST,
  },
];

const LOCAL_LLM_PROVIDERS: readonly LlmProviderDefinition[] = [
  {
    id: LOCAL_LLM_PROVIDER_ID,
    kind: LLM_PROVIDER_KIND.LOCAL,
    requiresUserKey: false,
    nameKey: "llm.provider.local",
    descriptionKey: "llm.provider.localDesc",
    defaultModel: LOCAL_LLM_DEFAULT_MODEL,
  },
];

export const ALL_LLM_PROVIDERS: readonly LlmProviderDefinition[] = [
  ...FREE_BUILTIN_LLM_PROVIDERS,
  ...BYOK_LLM_PROVIDERS,
  ...LOCAL_LLM_PROVIDERS,
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

export function isLocalLlmProvider(providerId: string): boolean {
  const provider = getLlmProvider(providerId);
  return provider?.kind === LLM_PROVIDER_KIND.LOCAL;
}

export function getRecommendedLlmProvider(): LlmProviderDefinition {
  const recommended =
    ALL_LLM_PROVIDERS.find((provider) => provider.recommended) ??
    getLlmProvider(DEFAULT_LLM_PROVIDER_ID)!;
  return recommended;
}

/** Нет явной настройки — ход можно дописать, пока модель не начала ответ. */
export function resolveInflightInput(providerId: string | undefined): LlmInflightInput {
  if (!providerId) {
    return LLM_INFLIGHT_INPUT.AMEND;
  }
  return getLlmProvider(providerId)?.chatRequest?.inflightInput ?? LLM_INFLIGHT_INPUT.AMEND;
}
