import { describe, expect, it } from "vitest";
import { LOCAL_LLM_PROVIDER_ID } from "@/constants/llm-account";
import {
  freeLlmSelectionId,
  llmAccountChatLabel,
  maskLlmApiKey,
  migrateLegacyLlmAccounts,
  parseFreeLlmSelectionId,
  parseLlmAccountList,
  parseLlmAccountParameterValue,
  validateLlmAccountDraft,
} from "@/config/llm-account-record";

const GROQ_KEY = "gsk-user-secret-key";
const SECOND_GROQ_KEY = "gsk-second-secret";

describe("llm account records", () => {
  it("migrates one legacy key per provider into an active account", () => {
    const accounts = migrateLegacyLlmAccounts({
      groq: GROQ_KEY,
      "google-gemini": "AIza-user-gemini-key",
    });

    expect(accounts).toEqual([
      {
        id: "legacy-groq",
        providerId: "groq",
        label: "groq",
        apiKey: GROQ_KEY,
        active: true,
      },
      {
        id: "legacy-google-gemini",
        providerId: "google-gemini",
        label: "google-gemini",
        apiKey: "AIza-user-gemini-key",
        active: true,
      },
    ]);
  });

  it("keeps several keys for one provider and drops an unknown provider", () => {
    const accounts = parseLlmAccountList([
      {
        id: "groq-work",
        providerId: "groq",
        label: "Work",
        apiKey: GROQ_KEY,
        active: true,
      },
      {
        id: "groq-home",
        providerId: "groq",
        label: "Home",
        apiKey: SECOND_GROQ_KEY,
        active: false,
      },
      {
        id: "bad",
        providerId: "not-a-provider",
        label: "Bad",
        apiKey: GROQ_KEY,
        active: true,
      },
    ]);

    expect(accounts.map((account) => account.id)).toEqual(["groq-work", "groq-home"]);
  });

  it("keeps a key's model and drops parameters outside the allowed range", () => {
    const accounts = parseLlmAccountList([
      {
        id: "groq-work",
        providerId: "groq",
        label: "Work",
        apiKey: GROQ_KEY,
        active: true,
        model: "llama-3.3-70b-versatile",
        parameters: {
          temperature: 0.4,
          topP: 0.9,
          n: 1,
          maxTokens: 2048,
          presencePenalty: 9,
        },
      },
    ]);

    expect(accounts[0]?.model).toBe("llama-3.3-70b-versatile");
    expect(accounts[0]?.parameters).toEqual({
      temperature: 0.4,
      topP: 0.9,
      n: 1,
      maxTokens: 2048,
    });
    expect(parseLlmAccountParameterValue("temperature", "")).toBeUndefined();
    expect(parseLlmAccountParameterValue("temperature", "0.2")).toBe(0.2);
    expect(parseLlmAccountParameterValue("n", "1.5")).toBeUndefined();
  });

  it("accepts a local endpoint without an API key", () => {
    const result = validateLlmAccountDraft({
      providerId: LOCAL_LLM_PROVIDER_ID,
      label: "Ollama",
      apiKey: "",
      active: true,
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "llama3.2",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.account.baseUrl).toBe("http://127.0.0.1:11434/v1");
      expect(result.account.model).toBe("llama3.2");
      expect(result.account.apiKey).toBe("");
    }
  });

  it("rejects a local endpoint with a bad URL or an empty model", () => {
    expect(
      validateLlmAccountDraft({
        providerId: LOCAL_LLM_PROVIDER_ID,
        label: "Ollama",
        apiKey: "",
        active: true,
        baseUrl: "ftp://127.0.0.1/model",
        model: "llama3.2",
      }),
    ).toEqual({ ok: false, reason: "invalid_url" });

    expect(
      validateLlmAccountDraft({
        providerId: LOCAL_LLM_PROVIDER_ID,
        label: "Ollama",
        apiKey: "",
        active: true,
        baseUrl: "http://127.0.0.1:11434/v1",
        model: "",
      }),
    ).toEqual({ ok: false, reason: "invalid_model" });
  });

  it("builds chat labels and masks keys", () => {
    expect(maskLlmApiKey(GROQ_KEY)).toBe("gsk-…-key");
    expect(maskLlmApiKey("short")).toBe("••••");
    expect(
      llmAccountChatLabel(
        {
          id: "1",
          providerId: "groq",
          label: "Work",
          apiKey: GROQ_KEY,
          active: true,
        },
        "Groq",
      ),
    ).toBe("Work · Groq");
    expect(
      llmAccountChatLabel(
        {
          id: "2",
          providerId: LOCAL_LLM_PROVIDER_ID,
          label: "Ollama",
          apiKey: "",
          active: true,
          model: "llama3.2",
          baseUrl: "http://127.0.0.1:11434/v1",
        },
        "Local LLM",
      ),
    ).toBe("Ollama · llama3.2");
    expect(freeLlmSelectionId("groq-free")).toBe("free:groq-free");
    expect(parseFreeLlmSelectionId("free:groq-free")).toBe("groq-free");
    expect(parseFreeLlmSelectionId("free:groq")).toBeUndefined();
  });
});
