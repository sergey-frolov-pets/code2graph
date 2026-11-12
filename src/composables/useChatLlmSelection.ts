import { computed, watch } from "vue";
import { getFreeBuiltinLlmProviders, getLlmProvider } from "@/constants/llm-providers";
import {
  getChatLlmSelectionId,
  setChatLlmSelectionId,
  useLlmAccountStore,
} from "@/config/llm-accounts";
import {
  formatChatLlmOptionLabel,
  freeLlmSelectionId,
  isUsableLlmAccount,
  llmAccountChatLabel,
} from "@/config/llm-account-record";
import { resolveAccountLlmModel } from "@/config/llm-model-selection";
import { useLlmProxyAvailability } from "@/composables/useLlmProxyAvailability";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { useLocale } from "@/composables/useLocale";

export interface ChatLlmOption {
  id: string;
  providerId: string;
  label: string;
}

export function useChatLlmSelection() {
  const { t } = useLocale();
  const { llmProviderId } = useLlmSettings();
  const { llmAccounts, llmAccountsHydrated } = useLlmAccountStore();
  const { availableFreeProviderIds } = useLlmProxyAvailability();

  const options = computed<ChatLlmOption[]>(() => {
    const accountOptions = llmAccounts.value
      .filter((account) => isUsableLlmAccount(account))
      .map((account) => {
        const provider = getLlmProvider(account.providerId);
        const providerName = provider ? t(provider.nameKey) : account.providerId;
        return {
          id: account.id,
          providerId: account.providerId,
          label: llmAccountChatLabel(
            account,
            providerName,
            resolveAccountLlmModel(account),
          ),
        };
      });

    const freeOptions = getFreeBuiltinLlmProviders()
      .filter((provider) => availableFreeProviderIds.value.includes(provider.id))
      .map((provider) => ({
        id: freeLlmSelectionId(provider.id),
        providerId: provider.id,
        label: formatChatLlmOptionLabel(t(provider.nameKey), provider.defaultModel),
      }));

    return [...accountOptions, ...freeOptions];
  });

  const selectedId = computed(() => {
    const current = getChatLlmSelectionId();
    if (options.value.some((option) => option.id === current)) {
      return current;
    }

    return (
      options.value.find((option) => option.providerId === llmProviderId.value)?.id ??
      options.value[0]?.id ??
      ""
    );
  });

  watch(
    [selectedId, llmAccountsHydrated],
    () => {
      if (!llmAccountsHydrated.value) {
        return;
      }

      const id = selectedId.value;
      if (id !== getChatLlmSelectionId()) {
        setChatLlmSelectionId(id);
      }
    },
    { immediate: true },
  );

  function onChange(event: Event): void {
    setChatLlmSelectionId((event.target as HTMLSelectElement).value);
  }

  return {
    options,
    selectedId,
    onChange,
  };
}
