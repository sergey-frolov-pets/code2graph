import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  llmConsent: { value: true },
  llmProviderId: { value: "google-gemini-free" },
  hasLlmApiKey: vi.fn(() => false),
  getLlmApiKey: vi.fn(() => ""),
  availableFreeProviderIds: { value: ["google-gemini-free"] as string[] },
  refreshLlmProxyAvailability: vi.fn(async () => {}),
  isLlmProxyConfigured: vi.fn(() => true),
  alert: vi.fn(async () => {}),
  confirm: vi.fn(async () => false),
  openLlmKeysGuide: vi.fn(),
}));

vi.mock("@/composables/useLlmSettings", () => ({
  useLlmSettings: () => ({
    llmProviderId: mocks.llmProviderId,
    llmConsent: mocks.llmConsent,
  }),
}));

vi.mock("@/composables/useLlmApiKeys", () => ({
  useLlmApiKeys: () => ({
    hasLlmApiKey: mocks.hasLlmApiKey,
    getLlmApiKey: mocks.getLlmApiKey,
  }),
}));

vi.mock("@/composables/useLlmProxyAvailability", () => ({
  useLlmProxyAvailability: () => ({
    availableFreeProviderIds: mocks.availableFreeProviderIds,
    refreshLlmProxyAvailability: mocks.refreshLlmProxyAvailability,
  }),
}));

vi.mock("@/utils/llm-proxy", () => ({
  isLlmProxyConfigured: mocks.isLlmProxyConfigured,
}));

vi.mock("@/composables/useAppDialog", () => ({
  useAppDialog: () => ({
    alert: mocks.alert,
    confirm: mocks.confirm,
  }),
}));

vi.mock("@/composables/useLlmKeysGuide", () => ({
  useLlmKeysGuide: () => ({
    openLlmKeysGuide: mocks.openLlmKeysGuide,
  }),
}));

vi.mock("@/composables/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

import { useLlmGate } from "@/composables/useLlmGate";

describe("useLlmGate", () => {
  beforeEach(() => {
    mocks.llmConsent.value = true;
    mocks.llmProviderId.value = "google-gemini-free";
    mocks.hasLlmApiKey.mockReturnValue(false);
    mocks.getLlmApiKey.mockReturnValue("");
    mocks.availableFreeProviderIds.value = ["google-gemini-free"];
    mocks.isLlmProxyConfigured.mockReturnValue(true);
    vi.clearAllMocks();
  });

  it("returns proxy mode for free builtin provider with consent", async () => {
    const { requireLlmAccess } = useLlmGate();
    const result = await requireLlmAccess({ silent: true });

    expect(result).toEqual({
      ok: true,
      mode: "proxy",
      providerId: "google-gemini-free",
    });
    expect(mocks.refreshLlmProxyAvailability).toHaveBeenCalled();
  });

  it("returns no_consent when consent is disabled", async () => {
    mocks.llmConsent.value = false;
    const { requireLlmAccess } = useLlmGate();
    const result = await requireLlmAccess({ silent: true });

    expect(result).toEqual({ ok: false, reason: "no_consent" });
    expect(mocks.alert).not.toHaveBeenCalled();
  });

  it("returns no_proxy when proxy is not configured", async () => {
    mocks.isLlmProxyConfigured.mockReturnValue(false);
    const { requireLlmAccess } = useLlmGate();
    const result = await requireLlmAccess({ silent: true });

    expect(result).toEqual({ ok: false, reason: "no_proxy" });
  });

  it("returns provider_unavailable when free provider is not reachable", async () => {
    mocks.availableFreeProviderIds.value = [];
    const { requireLlmAccess } = useLlmGate();
    const result = await requireLlmAccess({ silent: true });

    expect(result).toEqual({ ok: false, reason: "provider_unavailable" });
  });

  it("returns byok mode when API key is present", async () => {
    mocks.llmProviderId.value = "groq";
    mocks.hasLlmApiKey.mockReturnValue(true);
    mocks.getLlmApiKey.mockReturnValue("secret-key");

    const { requireLlmAccess } = useLlmGate();
    const result = await requireLlmAccess({ silent: true });

    expect(result).toEqual({
      ok: true,
      mode: "byok",
      providerId: "groq",
      apiKey: "secret-key",
    });
  });

  it("returns no_key for BYOK provider without API key", async () => {
    mocks.llmProviderId.value = "groq";
    mocks.hasLlmApiKey.mockReturnValue(false);

    const { requireLlmAccess } = useLlmGate();
    const result = await requireLlmAccess({ silent: true });

    expect(result).toEqual({ ok: false, reason: "no_key" });
    expect(mocks.openLlmKeysGuide).not.toHaveBeenCalled();
  });

  it("returns provider_invalid for unknown provider id", async () => {
    mocks.llmProviderId.value = "unknown-provider";
    const { requireLlmAccess } = useLlmGate();
    const result = await requireLlmAccess({ silent: true });

    expect(result).toEqual({ ok: false, reason: "provider_invalid" });
  });
});
