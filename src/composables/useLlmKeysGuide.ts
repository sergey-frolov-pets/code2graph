import { ref } from "vue";
import { LLM_API_KEYS_GUIDE_FILE } from "@/constants/llm-settings";
import { getByokLlmProviders } from "@/constants/llm-providers";

const guideModalOpen = ref(false);
const guideProviderId = ref<string | undefined>(undefined);

export function getLlmApiKeysGuideUrl(providerId?: string): string {
  const hash = providerId ? `#${providerId}` : "";
  return new URL(`${LLM_API_KEYS_GUIDE_FILE}${hash}`, window.location.href).href;
}

export function openLlmKeysGuide(providerId?: string): void {
  const url = getLlmApiKeysGuideUrl(providerId);
  const popup = window.open(url, "_blank", "noopener,noreferrer");

  if (!popup) {
    guideProviderId.value = providerId;
    guideModalOpen.value = true;
  }
}

export function closeLlmKeysGuide(): void {
  guideModalOpen.value = false;
  guideProviderId.value = undefined;
}

export function useLlmKeysGuide() {
  return {
    guideModalOpen,
    guideProviderId,
    openLlmKeysGuide,
    closeLlmKeysGuide,
    getLlmApiKeysGuideUrl,
    byokProviders: getByokLlmProviders(),
  };
}
