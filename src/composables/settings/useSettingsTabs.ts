import { computed, ref, watch, type ComputedRef, type Ref } from "vue";

export type SettingsTabId = "general" | "llm" | "library";

export function useSettingsTabs(options: {
  open: Ref<boolean>;
  refreshLlmProxyAvailability: () => void;
  isActiveProviderByok: ComputedRef<boolean>;
  hasActiveApiKey: ComputedRef<boolean>;
  t: (key: string) => string;
}) {
  const {
    open,
    refreshLlmProxyAvailability,
    isActiveProviderByok,
    hasActiveApiKey,
    t,
  } = options;

  const activeTab = ref<SettingsTabId>("general");

  const tabs = computed(() => [
    { id: "general" as const, label: t("settings.tabGeneral") },
    { id: "llm" as const, label: t("settings.tabLlm") },
    { id: "library" as const, label: t("settings.tabLibrary") },
  ]);

  const showLlmKeyBanner = computed(
    () =>
      activeTab.value === "llm" &&
      isActiveProviderByok.value &&
      !hasActiveApiKey.value,
  );

  watch(open, (isOpen) => {
    if (isOpen) {
      refreshLlmProxyAvailability();
    }
  });

  return {
    activeTab,
    tabs,
    showLlmKeyBanner,
  };
}
