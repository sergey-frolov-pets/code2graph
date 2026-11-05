import {
  LLM_PROVIDER_KIND,
  type LlmProviderKind,
} from "@/constants/llm-providers";

export function isSelectedLlmActive(input: {
  consent: boolean;
  providerKind: LlmProviderKind | null;
  hasApiKey: boolean;
  proxyConfigured: boolean;
  freeProviderAvailable: boolean;
}): boolean {
  if (!input.consent || !input.providerKind) {
    return false;
  }

  if (input.providerKind === LLM_PROVIDER_KIND.FREE_BUILTIN) {
    return input.proxyConfigured && input.freeProviderAvailable;
  }

  return input.hasApiKey;
}
