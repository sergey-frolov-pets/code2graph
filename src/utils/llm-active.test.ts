import { describe, expect, it } from "vitest";
import { LLM_PROVIDER_KIND } from "@/constants/llm-providers";
import { isSelectedLlmActive } from "@/utils/llm-active";

describe("isSelectedLlmActive", () => {
  it("hides the model action when consent or a provider is missing", () => {
    expect(
      isSelectedLlmActive({
        consent: false,
        providerKind: LLM_PROVIDER_KIND.BYOK,
        hasApiKey: true,
        proxyConfigured: true,
        freeProviderAvailable: true,
      }),
    ).toBe(false);
    expect(
      isSelectedLlmActive({
        consent: true,
        providerKind: null,
        hasApiKey: true,
        proxyConfigured: true,
        freeProviderAvailable: true,
      }),
    ).toBe(false);
  });

  it("treats a bring-your-own-key provider as active only with a saved key", () => {
    expect(
      isSelectedLlmActive({
        consent: true,
        providerKind: LLM_PROVIDER_KIND.BYOK,
        hasApiKey: false,
        proxyConfigured: false,
        freeProviderAvailable: false,
      }),
    ).toBe(false);
    expect(
      isSelectedLlmActive({
        consent: true,
        providerKind: LLM_PROVIDER_KIND.BYOK,
        hasApiKey: true,
        proxyConfigured: false,
        freeProviderAvailable: false,
      }),
    ).toBe(true);
  });

  it("treats a free provider as active only when the proxy can serve it", () => {
    expect(
      isSelectedLlmActive({
        consent: true,
        providerKind: LLM_PROVIDER_KIND.FREE_BUILTIN,
        hasApiKey: false,
        proxyConfigured: true,
        freeProviderAvailable: false,
      }),
    ).toBe(false);
    expect(
      isSelectedLlmActive({
        consent: true,
        providerKind: LLM_PROVIDER_KIND.FREE_BUILTIN,
        hasApiKey: false,
        proxyConfigured: true,
        freeProviderAvailable: true,
      }),
    ).toBe(true);
  });
});
