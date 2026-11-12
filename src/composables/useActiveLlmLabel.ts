import { computed } from "vue";
import { isValidLlmModelName } from "@/constants/llm-account";
import {
  getLlmAccount,
  getPreferredLlmAccount,
  useLlmAccountStore,
} from "@/config/llm-accounts";
import { resolveSelectedLlmModel } from "@/config/llm-model-selection";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { useLocale } from "@/composables/useLocale";

export function useActiveLlmLabel() {
  const { t } = useLocale();
  const { activeProvider } = useLlmSettings();
  const { chatLlmSelectionId } = useLlmAccountStore();

  function modelForProvider(providerId: string): string {
    const selectedId = chatLlmSelectionId.value.trim();
    const selectedAccount = selectedId ? getLlmAccount(selectedId) : undefined;
    if (
      selectedAccount?.providerId === providerId &&
      selectedAccount.model &&
      isValidLlmModelName(selectedAccount.model)
    ) {
      return selectedAccount.model;
    }

    const preferred = getPreferredLlmAccount(providerId);
    if (preferred?.model && isValidLlmModelName(preferred.model)) {
      return preferred.model;
    }

    return resolveSelectedLlmModel(providerId);
  }

  const activeLlmDetail = computed(() => {
    const provider = activeProvider.value;
    if (!provider) {
      return t("llm.activeModelUnknown");
    }

    return t("llm.activeModelDetail", {
      provider: t(provider.nameKey),
      model: modelForProvider(provider.id),
    });
  });

  const generatingLabel = computed(() => {
    const provider = activeProvider.value;
    if (!provider) {
      return t("llm.wizard.generating");
    }

    return t("llm.generatingWith", {
      provider: t(provider.nameKey),
      model: modelForProvider(provider.id),
    });
  });

  return {
    activeLlmDetail,
    generatingLabel,
  };
}
