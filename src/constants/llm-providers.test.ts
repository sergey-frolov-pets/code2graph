import { describe, expect, it } from "vitest";
import {
  DEFAULT_LLM_PROVIDER_ID,
  getLlmProvider,
  isLlmProviderId,
  resolveLlmProviderId,
} from "@/constants/llm-providers";

describe("llm-providers", () => {
  it("migrates legacy free provider ids to byok ids", () => {
    expect(resolveLlmProviderId("google-gemini-free")).toBe("google-gemini");
    expect(resolveLlmProviderId("groq-free")).toBe("groq");
    expect(isLlmProviderId("google-gemini-free")).toBe(true);
  });

  it("includes Chinese LLM providers", () => {
    for (const providerId of ["deepseek", "qwen", "zhipu", "moonshot"]) {
      expect(getLlmProvider(providerId)?.apiEndpoint).toBeTruthy();
      expect(getLlmProvider(providerId)?.keyUrl).toMatch(/^https:\/\//);
    }
  });

  it("uses google-gemini as default provider", () => {
    expect(DEFAULT_LLM_PROVIDER_ID).toBe("google-gemini");
    expect(getLlmProvider(DEFAULT_LLM_PROVIDER_ID)?.recommended).toBe(true);
  });
});
