/**
 * BYOK LLM API keys — только localStorage браузера.
 * Никогда отправляются на сервер Code2Graph (см. proxy-client, server/llm-proxy-request).
 */
import { computed, ref } from "vue";
import { STORAGE_KEY_LLM_API_KEYS } from "@/constants/llm-settings";
import {
  isValidLlmApiKeyValue,
  parseLlmApiKeysMap,
  serializeLlmApiKeysMap,
} from "@/utils/llm-key-storage";

function readStoredApiKeys(): Record<string, string> {
  try {
    return parseLlmApiKeysMap(localStorage.getItem(STORAGE_KEY_LLM_API_KEYS));
  } catch {
    return {};
  }
}

const apiKeys = ref<Record<string, string>>(readStoredApiKeys());

function persistApiKeys(): void {
  try {
    localStorage.setItem(STORAGE_KEY_LLM_API_KEYS, serializeLlmApiKeysMap(apiKeys.value));
  } catch {
    // file:// может блокировать localStorage
  }
}

export function getLlmApiKey(providerId: string): string | undefined {
  const key = apiKeys.value[providerId];
  return key ? key : undefined;
}

export function hasLlmApiKey(providerId: string): boolean {
  return Boolean(getLlmApiKey(providerId));
}

export function useLlmApiKeys() {
  function setLlmApiKey(providerId: string, value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      clearLlmApiKey(providerId);
      return true;
    }

    if (!isValidLlmApiKeyValue(trimmed)) {
      return false;
    }

    apiKeys.value = {
      ...apiKeys.value,
      [providerId]: trimmed,
    };
    persistApiKeys();
    return true;
  }

  function clearLlmApiKey(providerId: string): void {
    if (!apiKeys.value[providerId]) {
      return;
    }

    const next = { ...apiKeys.value };
    delete next[providerId];
    apiKeys.value = next;
    persistApiKeys();
  }

  const hasAnyKey = computed(() => Object.keys(apiKeys.value).length > 0);

  return {
    apiKeys: computed(() => apiKeys.value),
    getLlmApiKey,
    hasLlmApiKey,
    setLlmApiKey,
    clearLlmApiKey,
    hasAnyKey,
  };
}
