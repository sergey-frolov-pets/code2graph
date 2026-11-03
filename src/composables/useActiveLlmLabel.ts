import { computed } from "vue";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { useLocale } from "@/composables/useLocale";

export function useActiveLlmLabel() {
  const { t } = useLocale();
  const { activeProvider } = useLlmSettings();

  const activeLlmDetail = computed(() => {
    const provider = activeProvider.value;
    if (!provider) {
      return t("llm.activeModelUnknown");
    }

    return t("llm.activeModelDetail", {
      provider: t(provider.nameKey),
      model: provider.defaultModel,
    });
  });

  const generatingLabel = computed(() => {
    const provider = activeProvider.value;
    if (!provider) {
      return t("llm.wizard.generating");
    }

    return t("llm.generatingWith", {
      provider: t(provider.nameKey),
      model: provider.defaultModel,
    });
  });

  return {
    activeLlmDetail,
    generatingLabel,
  };
}
