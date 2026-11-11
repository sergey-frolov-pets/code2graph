import {
  DEFAULT_LLM_PROVIDER_ID,
  isLlmProviderId,
  resolveLlmProviderId,
} from "@/constants/llm-providers";
import { DEFAULT_LOCALE, type AppLocale } from "@/constants/i18n";

export const STORAGE_KEY_LLM_PROVIDER = "code2graph-llm-provider";
export const STORAGE_KEY_LLM_API_KEYS = "code2graph-llm-api-keys";
export const STORAGE_KEY_LLM_ACCOUNTS = "code2graph-llm-accounts";
export const STORAGE_KEY_LLM_CHAT_SELECTION = "code2graph-llm-chat-selection";
export const STORAGE_KEY_LLM_CONSENT = "code2graph-llm-consent";
export const STORAGE_KEY_LLM_SELECTED_MODELS = "code2graph-llm-selected-models";
export const STORAGE_KEY_LLM_MODEL_CATALOGS = "code2graph-llm-model-catalogs";

export const LLM_API_KEYS_GUIDE_FILE = "llm-api-keys.html";
export const LLM_API_KEYS_GUIDE_FILE_EN = "llm-api-keys.en.html";

export function getLlmApiKeysGuideFile(locale: AppLocale = DEFAULT_LOCALE): string {
  return locale === "ru" ? LLM_API_KEYS_GUIDE_FILE : LLM_API_KEYS_GUIDE_FILE_EN;
}

export function getLlmApiKeysGuideHref(locale: AppLocale = DEFAULT_LOCALE): string {
  return `./${getLlmApiKeysGuideFile(locale)}`;
}

export function readStoredLlmProviderId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LLM_PROVIDER);
    if (saved) {
      const resolved = resolveLlmProviderId(saved);
      if (isLlmProviderId(resolved)) {
        return resolved;
      }
    }
  } catch {
    // file:// может блокировать localStorage
  }

  return DEFAULT_LLM_PROVIDER_ID;
}
