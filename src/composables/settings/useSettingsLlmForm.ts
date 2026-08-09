import { computed, ref, watch } from "vue";
import type { TranslateFn } from "@/locales/types";
import { ALL_LLM_PROVIDERS, LLM_PROVIDER_KIND } from "@/constants/llm-providers";
import { useLlmApiKeys } from "@/composables/useLlmApiKeys";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { useLlmProxyAvailability } from "@/composables/useLlmProxyAvailability";
import { testLlmConnection } from "@/services/llm/llm-client";

export function useSettingsLlmForm(t: TranslateFn) {
  const { openLlmKeysGuide } = useLlmKeysGuide();
  const {
    llmProviderId,
    llmConsent,
    activeProvider,
    setLlmProviderId,
    setLlmConsent,
  } = useLlmSettings();
  const { hasLlmApiKey, setLlmApiKey, clearLlmApiKey } = useLlmApiKeys();
  const {
    proxyConfigured,
    proxyReachable,
    availableFreeProviderIds,
    refreshLlmProxyAvailability,
  } = useLlmProxyAvailability();

  const apiKeyInput = ref("");
  const showApiKey = ref(false);
  const apiKeyError = ref("");
  const isTestingLlm = ref(false);
  const llmTestOk = ref(false);
  const llmTestMessage = ref("");

  const isActiveProviderByok = computed(
    () => activeProvider.value?.kind === LLM_PROVIDER_KIND.BYOK,
  );

  const llmProviderOptions = computed(() =>
    ALL_LLM_PROVIDERS.filter((provider) => {
      if (provider.kind === LLM_PROVIDER_KIND.BYOK) {
        return true;
      }

      return availableFreeProviderIds.value.includes(provider.id);
    }).map((provider) => {
      const recommendedBadge = provider.recommended
        ? ` — ${t("settings.llmRecommendedBadge")}`
        : "";
      const freeBadge =
        provider.kind === LLM_PROVIDER_KIND.FREE_BUILTIN
          ? ` — ${t("settings.llmFreeBuiltinBadge")}`
          : "";

      return {
        id: provider.id,
        label: `${t(provider.nameKey)}${freeBadge}${recommendedBadge}`,
      };
    }),
  );

  const hasActiveApiKey = computed(() => hasLlmApiKey(llmProviderId.value));

  watch(llmProviderId, () => {
    apiKeyInput.value = "";
    apiKeyError.value = "";
    showApiKey.value = false;
  });

  function onProviderChange(event: Event): void {
    setLlmProviderId((event.target as HTMLSelectElement).value);
  }

  function onConsentChange(event: Event): void {
    setLlmConsent((event.target as HTMLInputElement).checked);
  }

  function saveApiKey(): void {
    apiKeyError.value = "";

    if (!apiKeyInput.value.trim()) {
      return;
    }

    const saved = setLlmApiKey(llmProviderId.value, apiKeyInput.value);
    if (!saved) {
      apiKeyError.value = t("settings.llmApiKeyInvalid");
      return;
    }

    apiKeyInput.value = "";
    showApiKey.value = false;
  }

  function clearApiKey(): void {
    clearLlmApiKey(llmProviderId.value);
    apiKeyInput.value = "";
    apiKeyError.value = "";
    showApiKey.value = false;
  }

  function openKeysGuideForActiveProvider(): void {
    openLlmKeysGuide(llmProviderId.value);
  }

  async function onTestLlmConnection(): Promise<void> {
    isTestingLlm.value = true;
    llmTestMessage.value = "";
    llmTestOk.value = false;

    const result = await testLlmConnection();
    llmTestOk.value = result.ok;
    llmTestMessage.value = result.message;
    isTestingLlm.value = false;
  }

  return {
    llmProviderId,
    llmConsent,
    activeProvider,
    proxyConfigured,
    proxyReachable,
    apiKeyInput,
    showApiKey,
    apiKeyError,
    isTestingLlm,
    llmTestOk,
    llmTestMessage,
    isActiveProviderByok,
    llmProviderOptions,
    hasActiveApiKey,
    refreshLlmProxyAvailability,
    onProviderChange,
    onConsentChange,
    saveApiKey,
    clearApiKey,
    openKeysGuideForActiveProvider,
    onTestLlmConnection,
  };
}
