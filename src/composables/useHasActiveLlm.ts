import { computed } from "vue";
import {
  getLlmProvider,
  isFreeBuiltinLlmProvider,
} from "@/constants/llm-providers";
import { useLlmApiKeys } from "@/composables/useLlmApiKeys";
import { useLlmProxyAvailability } from "@/composables/useLlmProxyAvailability";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { isLlmProxyConfigured } from "@/utils/llm-proxy";
import { isSelectedLlmActive } from "@/utils/llm-active";

export function useHasActiveLlm() {
  const { llmConsent, llmProviderId } = useLlmSettings();
  const { hasLlmApiKey } = useLlmApiKeys();
  const { availableFreeProviderIds, refreshLlmProxyAvailability } =
    useLlmProxyAvailability();

  const hasActiveLlm = computed(() => {
    const providerId = llmProviderId.value;
    const provider = getLlmProvider(providerId);

    return isSelectedLlmActive({
      consent: llmConsent.value,
      providerKind: provider?.kind ?? null,
      hasApiKey: hasLlmApiKey(providerId),
      proxyConfigured: isLlmProxyConfigured(),
      freeProviderAvailable:
        isFreeBuiltinLlmProvider(providerId) &&
        availableFreeProviderIds.value.includes(providerId),
    });
  });

  return {
    hasActiveLlm,
    refreshActiveLlmAvailability: refreshLlmProxyAvailability,
  };
}
