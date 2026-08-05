import {
  DEFAULT_LLM_PROVIDER_ID,
  isLlmProviderId,
} from "@/constants/llm-providers";

export const STORAGE_KEY_LLM_PROVIDER = "plantuml-smetana-llm-provider";
export const STORAGE_KEY_LLM_API_KEYS = "plantuml-smetana-llm-api-keys";
export const STORAGE_KEY_LLM_CONSENT = "plantuml-smetana-llm-consent";

export const LLM_API_KEYS_GUIDE_FILE = "llm-api-keys.html";

export function readStoredLlmProviderId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LLM_PROVIDER);
    if (saved && isLlmProviderId(saved)) {
      return saved;
    }
  } catch {
    // file:// может блокировать localStorage
  }

  return DEFAULT_LLM_PROVIDER_ID;
}
