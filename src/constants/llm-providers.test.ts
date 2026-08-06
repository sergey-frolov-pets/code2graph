import { describe, expect, it } from "vitest";
import {
  DEFAULT_LLM_PROVIDER_ID,
  DEFAULT_FREE_LLM_PROVIDER_ID,
  getFreeBuiltinLlmProviders,
  getLlmProvider,
  isFreeBuiltinLlmProvider,
  isLlmProviderId,
  resolveLlmProviderId,
} from "@/constants/llm-providers";

describe("llm-providers", () => {
  it("keeps free builtin provider ids separate from byok ids", () => {
    expect(resolveLlmProviderId("google-gemini-free")).toBe("google-gemini-free");
    expect(resolveLlmProviderId("groq-free")).toBe("groq-free");
    expect(isLlmProviderId("google-gemini-free")).toBe(true);
    expect(isFreeBuiltinLlmProvider("google-gemini-free")).toBe(true);
    expect(isFreeBuiltinLlmProvider("google-gemini")).toBe(false);
  });

  it("includes free builtin providers with distinct ids", () => {
    const freeIds = getFreeBuiltinLlmProviders().map((provider) => provider.id);
    expect(freeIds).toContain(DEFAULT_FREE_LLM_PROVIDER_ID);
    expect(freeIds).not.toContain(DEFAULT_LLM_PROVIDER_ID);
  });

  it("includes Chinese LLM providers", () => {
    for (const providerId of ["deepseek", "qwen", "zhipu", "moonshot"]) {
      expect(getLlmProvider(providerId)?.apiEndpoint).toBeTruthy();
      expect(getLlmProvider(providerId)?.keyUrl).toMatch(/^https:\/\//);
    }
  });

  it("uses google-gemini as default byok provider", () => {
    expect(DEFAULT_LLM_PROVIDER_ID).toBe("google-gemini");
    expect(getLlmProvider(DEFAULT_LLM_PROVIDER_ID)?.recommended).toBe(true);
  });
});
