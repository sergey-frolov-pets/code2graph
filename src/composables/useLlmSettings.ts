import { computed, ref } from "vue";
import {
  getDefaultLlmProviderId,
  getLlmProvider,
  isLlmProviderId,
  resolveLlmProviderId,
} from "@/constants/llm-providers";
import {
  readStoredLlmProviderId,
  STORAGE_KEY_LLM_CONSENT,
  STORAGE_KEY_LLM_PROVIDER,
} from "@/constants/llm-settings";

function readStoredConsent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_LLM_CONSENT) === "true";
  } catch {
    return false;
  }
}

const llmProviderId = ref(readStoredLlmProviderId());
const llmConsent = ref(readStoredConsent());

function persistProviderId(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_LLM_PROVIDER, value);
  } catch {
    // file:// может блокировать localStorage
  }
}

function persistConsent(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_LLM_CONSENT, value ? "true" : "false");
  } catch {
    // file:// может блокировать localStorage
  }
}

export function getActiveLlmProviderId(): string {
  return llmProviderId.value;
}

export function useLlmSettings() {
  const activeProvider = computed(() => getLlmProvider(llmProviderId.value));

  function setLlmProviderId(value: string): void {
    const resolved = resolveLlmProviderId(value);
    if (!isLlmProviderId(resolved)) {
      return;
    }

    llmProviderId.value = resolved;
    persistProviderId(resolved);
  }

  function setLlmConsent(value: boolean): void {
    llmConsent.value = value;
    persistConsent(value);
  }

  function resetLlmProviderToDefault(): void {
    setLlmProviderId(getDefaultLlmProviderId());
  }

  return {
    llmProviderId,
    llmConsent,
    activeProvider,
    setLlmProviderId,
    setLlmConsent,
    resetLlmProviderToDefault,
  };
}
