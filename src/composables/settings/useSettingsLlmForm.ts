import { computed, type InjectionKey, inject, ref, watch, type UnwrapNestedRefs } from "vue";
import type { LocaleKey, TranslateFn } from "@/locales/types";
import {
  LOCAL_LLM_DEFAULT_BASE_URL,
  LOCAL_LLM_DEFAULT_MODEL,
  LOCAL_LLM_PROVIDER_ID,
} from "@/constants/llm-account";
import { ALL_LLM_PROVIDERS, getLlmProvider, LLM_PROVIDER_KIND } from "@/constants/llm-providers";
import {
  addLlmAccount,
  removeLlmAccount,
  setLlmAccountActive,
  useLlmAccountStore,
} from "@/config/llm-accounts";
import {
  llmAccountDisplayLabel,
  maskLlmApiKey,
  type LlmAccountDraftError,
} from "@/config/llm-account-record";
import {
  formatLlmModelPrice,
  listLlmModelChoices,
  resolveSelectedLlmModel,
  saveLlmModelCatalog,
  setSelectedLlmModel,
} from "@/config/llm-model-selection";
import { getLlmApiKey } from "@/composables/useLlmApiKeys";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { useLlmProxyAvailability } from "@/composables/useLlmProxyAvailability";
import { testLlmConnection } from "@/services/llm/llm-client";
import {
  fetchLlmModelCatalog,
  LlmModelCatalogError,
  type LlmModelCatalogFailure,
} from "@/services/llm/llm-model-catalog";

const PRICE_ERROR_KEY: Record<LlmModelCatalogFailure, LocaleKey> = {
  needs_key: "settings.llmModelPriceNeedsKey",
  unavailable: "settings.llmModelPriceUnavailable",
  failed: "settings.llmModelPriceFailed",
};

const ACCOUNT_SAVE_ERROR_KEY: Record<LlmAccountDraftError, LocaleKey> = {
  invalid_url: "settings.llmLocalInvalidUrl",
  invalid_model: "settings.llmLocalInvalidModel",
  invalid_key: "settings.llmApiKeyInvalid",
  invalid_label: "settings.llmApiKeyInvalid",
  invalid_provider: "settings.llmApiKeyInvalid",
  cipher_unavailable: "settings.llmKeySeedMissing",
};

export const SETTINGS_LLM_FORM_KEY: InjectionKey<
  UnwrapNestedRefs<ReturnType<typeof useSettingsLlmForm>>
> = Symbol("settings-llm-form");

export function useSettingsLlmFormContext(): UnwrapNestedRefs<
  ReturnType<typeof useSettingsLlmForm>
> {
  const llm = inject(SETTINGS_LLM_FORM_KEY);
  if (!llm) {
    throw new Error("useSettingsLlmFormContext must be used within SettingsModal");
  }

  return llm;
}

export function useSettingsLlmForm(t: TranslateFn) {
  const { openLlmKeysGuide } = useLlmKeysGuide();
  const {
    llmProviderId,
    llmConsent,
    activeProvider,
    setLlmProviderId,
    setLlmConsent,
  } = useLlmSettings();
  const { llmAccounts, llmKeyStoreError } = useLlmAccountStore();
  const {
    proxyConfigured,
    proxyReachable,
    availableFreeProviderIds,
    refreshLlmProxyAvailability,
  } = useLlmProxyAvailability();

  const apiKeyInput = ref("");
  const accountLabelInput = ref("");
  const accountActiveInput = ref(true);
  const showApiKey = ref(false);
  const apiKeyError = ref("");
  const localBaseUrlInput = ref(LOCAL_LLM_DEFAULT_BASE_URL);
  const localModelInput = ref(LOCAL_LLM_DEFAULT_MODEL);
  const localLabelInput = ref("");
  const localApiKeyInput = ref("");
  const localActiveInput = ref(true);
  const showLocalApiKey = ref(false);
  const localError = ref("");
  const isTestingLlm = ref(false);
  const llmTestOk = ref(false);
  const llmTestMessage = ref("");
  const isRefreshingPrices = ref(false);
  const modelPriceError = ref("");
  let priceRefreshGeneration = 0;

  const isActiveProviderByok = computed(
    () => activeProvider.value?.kind === LLM_PROVIDER_KIND.BYOK,
  );
  const isActiveProviderLocal = computed(
    () => activeProvider.value?.kind === LLM_PROVIDER_KIND.LOCAL,
  );

  function nextDefaultLabel(providerId: string): string {
    const provider = getLlmProvider(providerId);
    const base = provider ? t(provider.nameKey) : providerId;
    const count = llmAccounts.value.filter((account) => account.providerId === providerId).length;
    return count === 0 ? base : `${base} ${count + 1}`;
  }

  const providerAccounts = computed(() =>
    llmAccounts.value
      .filter((account) => account.providerId === llmProviderId.value)
      .map((account) => {
        const provider = getLlmProvider(account.providerId);
        const providerName = provider ? t(provider.nameKey) : account.providerId;
        const meta =
          account.providerId === LOCAL_LLM_PROVIDER_ID
            ? [account.model, account.baseUrl].filter(Boolean).join(" · ")
            : maskLlmApiKey(account.apiKey);

        return {
          id: account.id,
          active: account.active,
          label: llmAccountDisplayLabel(account, providerName),
          meta,
        };
      }),
  );

  const llmProviderOptions = computed(() =>
    ALL_LLM_PROVIDERS.filter((provider) => {
      if (
        provider.kind === LLM_PROVIDER_KIND.BYOK ||
        provider.kind === LLM_PROVIDER_KIND.LOCAL
      ) {
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

  const hasActiveApiKey = computed(() =>
    llmAccounts.value.some(
      (account) => account.providerId === llmProviderId.value && account.apiKey.length > 0,
    ),
  );

  const modelOptions = computed(() =>
    listLlmModelChoices(llmProviderId.value).map((model) => ({
      id: model.id,
      label: `${model.id} — ${formatLlmModelPrice(model, t)}`,
      price: formatLlmModelPrice(model, t),
    })),
  );

  const selectedModelId = computed(() => resolveSelectedLlmModel(llmProviderId.value));

  const selectedModelPrice = computed(
    () => modelOptions.value.find((model) => model.id === selectedModelId.value)?.price ?? "",
  );

  watch(llmProviderId, () => {
    apiKeyInput.value = "";
    apiKeyError.value = "";
    showApiKey.value = false;
    localError.value = "";
    priceRefreshGeneration += 1;
    isRefreshingPrices.value = false;
    modelPriceError.value = "";
  });

  function onProviderChange(event: Event): void {
    setLlmProviderId((event.target as HTMLSelectElement).value);
  }

  function onModelChange(event: Event): void {
    setSelectedLlmModel(llmProviderId.value, (event.target as HTMLSelectElement).value);
  }

  async function refreshModelPrices(): Promise<void> {
    const provider = activeProvider.value;
    if (!provider || provider.kind === LLM_PROVIDER_KIND.LOCAL) {
      return;
    }

    const generation = ++priceRefreshGeneration;
    const providerId = provider.id;
    isRefreshingPrices.value = true;
    modelPriceError.value = "";

    try {
      const models = await fetchLlmModelCatalog(provider, getLlmApiKey(providerId));
      if (generation !== priceRefreshGeneration) {
        return;
      }

      saveLlmModelCatalog(providerId, models);
    } catch (error) {
      if (generation !== priceRefreshGeneration) {
        return;
      }

      const code = error instanceof LlmModelCatalogError ? error.code : "failed";
      modelPriceError.value = t(PRICE_ERROR_KEY[code]);
    } finally {
      if (generation === priceRefreshGeneration) {
        isRefreshingPrices.value = false;
      }
    }
  }

  function onConsentChange(event: Event): void {
    setLlmConsent((event.target as HTMLInputElement).checked);
  }

  function addProviderKey(): void {
    apiKeyError.value = "";

    if (!apiKeyInput.value.trim()) {
      return;
    }

    const providerId = llmProviderId.value;
    const result = addLlmAccount({
      providerId,
      label: accountLabelInput.value.trim() || nextDefaultLabel(providerId),
      apiKey: apiKeyInput.value,
      active: accountActiveInput.value,
    });
    if (!result.ok) {
      apiKeyError.value = t(ACCOUNT_SAVE_ERROR_KEY[result.reason]);
      return;
    }

    apiKeyInput.value = "";
    accountLabelInput.value = "";
    showApiKey.value = false;
  }

  function addLocalProvider(): void {
    localError.value = "";
    const result = addLlmAccount({
      providerId: LOCAL_LLM_PROVIDER_ID,
      label: localLabelInput.value.trim() || nextDefaultLabel(LOCAL_LLM_PROVIDER_ID),
      apiKey: localApiKeyInput.value,
      active: localActiveInput.value,
      baseUrl: localBaseUrlInput.value,
      model: localModelInput.value,
    });
    if (!result.ok) {
      localError.value = t(ACCOUNT_SAVE_ERROR_KEY[result.reason]);
      return;
    }

    localLabelInput.value = "";
    localApiKeyInput.value = "";
    showLocalApiKey.value = false;
  }

  function onAccountActiveChange(accountId: string, event: Event): void {
    setLlmAccountActive(accountId, (event.target as HTMLInputElement).checked);
  }

  function removeAccount(accountId: string): void {
    removeLlmAccount(accountId);
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
    accountLabelInput,
    accountActiveInput,
    showApiKey,
    apiKeyError,
    localBaseUrlInput,
    localModelInput,
    localLabelInput,
    localApiKeyInput,
    localActiveInput,
    showLocalApiKey,
    localError,
    isTestingLlm,
    llmTestOk,
    llmTestMessage,
    isRefreshingPrices,
    modelPriceError,
    modelOptions,
    selectedModelId,
    selectedModelPrice,
    isActiveProviderByok,
    isActiveProviderLocal,
    llmProviderOptions,
    providerAccounts,
    llmKeyStoreError,
    hasActiveApiKey,
    refreshLlmProxyAvailability,
    onProviderChange,
    onModelChange,
    refreshModelPrices,
    onConsentChange,
    addProviderKey,
    addLocalProvider,
    onAccountActiveChange,
    removeAccount,
    openKeysGuideForActiveProvider,
    onTestLlmConnection,
  };
}
