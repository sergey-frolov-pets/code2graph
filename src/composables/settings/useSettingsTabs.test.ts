import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { useSettingsTabs } from "@/composables/settings/useSettingsTabs";

describe("useSettingsTabs", () => {
  it("shows LLM key banner only on llm tab for BYOK without key", () => {
    const open = ref(true);
    const isActiveProviderByok = computed(() => true);
    const hasActiveApiKey = computed(() => false);

    const { activeTab, showLlmKeyBanner } = useSettingsTabs({
      open,
      refreshLlmProxyAvailability: () => {},
      isActiveProviderByok,
      hasActiveApiKey,
      t: (key) => key,
    });

    activeTab.value = "llm";
    expect(showLlmKeyBanner.value).toBe(true);

    activeTab.value = "general";
    expect(showLlmKeyBanner.value).toBe(false);
  });

  it("exposes three consolidated tabs", () => {
    const { tabs } = useSettingsTabs({
      open: ref(false),
      refreshLlmProxyAvailability: () => {},
      isActiveProviderByok: computed(() => false),
      hasActiveApiKey: computed(() => false),
      t: (key) => key,
    });

    expect(tabs.value.map((tab) => tab.id)).toEqual(["general", "llm", "library"]);
  });
});
