import { afterEach, describe, expect, it, vi } from "vitest";
import { LLM_KEY_CIPHER_PREFIX } from "@/constants/llm-account";
import {
  hasLlmKeySeed,
  isSealedLlmApiKey,
  LlmKeyCipherError,
  openLlmApiKey,
  sealLlmApiKey,
} from "@/services/llm/llm-key-cipher";

const SEED = "test-seed-value-32chars-minimum";
const OTHER_SEED = "another-seed-value-32chars-ok";
const SECRET = "gsk-user-secret-key";

describe("llm key cipher", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses a missing or short seed", () => {
    vi.stubEnv("VITE_LLM_KEY_SEED", "");
    expect(hasLlmKeySeed()).toBe(false);
    vi.stubEnv("VITE_LLM_KEY_SEED", "short");
    expect(hasLlmKeySeed()).toBe(false);
  });

  it("seals a key so the plaintext is not stored and opens it back", async () => {
    vi.stubEnv("VITE_LLM_KEY_SEED", SEED);

    const sealed = await sealLlmApiKey(SECRET, "groq");
    const again = await sealLlmApiKey(SECRET, "groq");

    expect(isSealedLlmApiKey(sealed)).toBe(true);
    expect(sealed.startsWith(LLM_KEY_CIPHER_PREFIX)).toBe(true);
    expect(sealed).not.toContain(SECRET);
    expect(sealed).not.toBe(again);
    expect(await openLlmApiKey(sealed, "groq")).toBe(SECRET);
  });

  it("keeps an empty local key empty", async () => {
    vi.stubEnv("VITE_LLM_KEY_SEED", SEED);
    expect(await sealLlmApiKey("", "local")).toBe("");
    expect(await openLlmApiKey("", "local")).toBe("");
  });

  it("does not open a key with another seed or another provider", async () => {
    vi.stubEnv("VITE_LLM_KEY_SEED", SEED);
    const sealed = await sealLlmApiKey(SECRET, "groq");

    await expect(openLlmApiKey(sealed, "openrouter")).rejects.toBeInstanceOf(LlmKeyCipherError);

    vi.stubEnv("VITE_LLM_KEY_SEED", OTHER_SEED);
    await expect(openLlmApiKey(sealed, "groq")).rejects.toMatchObject({
      code: "decrypt_failed",
    });
  });

  it("reports a missing seed when the stored value is already sealed", async () => {
    vi.stubEnv("VITE_LLM_KEY_SEED", SEED);
    const sealed = await sealLlmApiKey(SECRET, "groq");

    vi.stubEnv("VITE_LLM_KEY_SEED", "");
    await expect(openLlmApiKey(sealed, "groq")).rejects.toMatchObject({
      code: "missing_seed",
    });
  });
});
