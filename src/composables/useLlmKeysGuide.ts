import { ref } from "vue";
import {
  getLlmApiKeysGuideFile,
} from "@/constants/llm-settings";
import { getByokLlmProviders } from "@/constants/llm-providers";
import { readInitialLocale } from "@/composables/useLocale";
import type { AppLocale } from "@/constants/i18n";

const guideModalOpen = ref(false);
const guideProviderId = ref<string | undefined>(undefined);

export function getLlmApiKeysGuideUrl(
  providerId?: string,
  locale: AppLocale = readInitialLocale(),
): string {
  const hash = providerId ? `#${providerId}` : "";
  const file = getLlmApiKeysGuideFile(locale);
  return new URL(`${file}${hash}`, window.location.href).href;
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
