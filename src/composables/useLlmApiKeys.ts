/**
 * BYOK LLM API keys — только localStorage браузера, зашифрованы сидом из .env.
 * Никогда отправляются на сервер Code2Graph (см. proxy-client, server/llm-proxy-request).
 * Несколько ключей одного провайдера хранятся отдельными аккаунтами.
 */
import { computed } from "vue";
import {
  clearProviderApiKeys,
  getPreferredLlmAccount,
  replaceProviderApiKey,
  useLlmAccountStore,
} from "@/config/llm-accounts";

export function getLlmApiKey(providerId: string): string | undefined {
  const key = getPreferredLlmAccount(providerId)?.apiKey;
  return key ? key : undefined;
}

export function hasLlmApiKey(providerId: string): boolean {
  return Boolean(getLlmApiKey(providerId));
}

export function useLlmApiKeys() {
  const { llmAccounts } = useLlmAccountStore();

  function setLlmApiKey(providerId: string, value: string): boolean {
    return replaceProviderApiKey(providerId, value);
  }

  function clearLlmApiKey(providerId: string): void {
    clearProviderApiKeys(providerId);
  }

  const apiKeys = computed(() => {
    const map: Record<string, string> = {};
    for (const account of llmAccounts.value) {
      if (!account.active || !account.apiKey || map[account.providerId]) {
        continue;
      }
      map[account.providerId] = account.apiKey;
    }
    return map;
  });

  const hasAnyKey = computed(() =>
    llmAccounts.value.some((account) => account.active && account.apiKey.length > 0),
  );

  return {
    apiKeys,
    getLlmApiKey,
    hasLlmApiKey,
    setLlmApiKey,
    clearLlmApiKey,
    hasAnyKey,
  };
}
