import { computed } from "vue";
import {
  getLlmProvider,
  isFreeBuiltinLlmProvider,
  isLocalLlmProvider,
} from "@/constants/llm-providers";
import { useLlmAccountStore } from "@/config/llm-accounts";
import { isUsableLlmAccount } from "@/config/llm-account-record";
import { useLlmApiKeys } from "@/composables/useLlmApiKeys";
import { useLlmProxyAvailability } from "@/composables/useLlmProxyAvailability";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { isLlmProxyConfigured } from "@/utils/llm-proxy";
import { isSelectedLlmActive } from "@/utils/llm-active";

export function useHasActiveLlm() {
  const { llmConsent, llmProviderId } = useLlmSettings();
  const { hasLlmApiKey } = useLlmApiKeys();
  const { llmAccounts } = useLlmAccountStore();
  const { availableFreeProviderIds, refreshLlmProxyAvailability } =
    useLlmProxyAvailability();

  const hasActiveLlm = computed(() => {
    const providerId = llmProviderId.value;
    const provider = getLlmProvider(providerId);
    const selectedReady = isSelectedLlmActive({
      consent: llmConsent.value,
      providerKind: provider?.kind ?? null,
      hasApiKey: hasLlmApiKey(providerId),
      proxyConfigured: isLlmProxyConfigured(),
      freeProviderAvailable:
        isFreeBuiltinLlmProvider(providerId) &&
        availableFreeProviderIds.value.includes(providerId),
      localReady:
        isLocalLlmProvider(providerId) &&
        llmAccounts.value.some(
          (account) => account.providerId === providerId && isUsableLlmAccount(account),
        ),
    });

    if (selectedReady || !llmConsent.value) {
      return selectedReady;
    }

    return llmAccounts.value.some((account) => isUsableLlmAccount(account));
  });

  return {
    hasActiveLlm,
    refreshActiveLlmAvailability: refreshLlmProxyAvailability,
  };
}
