import { afterEach, describe, expect, it, vi } from "vitest";
import { LLM_KEY_CIPHER_PREFIX, LLM_KEY_DEVICE_CIPHER_PREFIX } from "@/constants/llm-account";
import { STORAGE_KEY_LLM_DEVICE_SEED } from "@/constants/llm-settings";
import {
  hasLlmKeySeed,
  isSealedLlmApiKey,
  LlmKeyCipherError,
  openLlmApiKey,
  rememberLlmKeySeed,
  resetLlmKeyCipherCache,
  sealLegacyLlmApiKey,
  sealLlmApiKey,
} from "@/services/llm/llm-key-cipher";

const storage = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
});

const SEED = "test-seed-value-32chars-minimum";
const OTHER_SEED = "another-seed-value-32chars-ok";
const SECRET = "gsk-user-secret-key";

describe("llm key cipher", () => {
  afterEach(() => {
    storage.clear();
    resetLlmKeyCipherCache();
    vi.unstubAllEnvs();
  });

  it("refuses a missing or short build seed", () => {
    vi.stubEnv("VITE_LLM_KEY_SEED", "");
    expect(hasLlmKeySeed()).toBe(false);
    vi.stubEnv("VITE_LLM_KEY_SEED", "short");
    expect(hasLlmKeySeed()).toBe(false);
  });

  it("seals a key with the browser seed so a new build seed still opens it", async () => {
    vi.stubEnv("VITE_LLM_KEY_SEED", SEED);

    const sealed = await sealLlmApiKey(SECRET, "groq");
    const again = await sealLlmApiKey(SECRET, "groq");

    expect(isSealedLlmApiKey(sealed)).toBe(true);
    expect(sealed.startsWith(LLM_KEY_DEVICE_CIPHER_PREFIX)).toBe(true);
    expect(sealed).not.toContain(SECRET);
    expect(sealed).not.toBe(again);
    expect(await openLlmApiKey(sealed, "groq")).toBe(SECRET);

    vi.stubEnv("VITE_LLM_KEY_SEED", OTHER_SEED);
    resetLlmKeyCipherCache();
    expect(await openLlmApiKey(sealed, "groq")).toBe(SECRET);
    expect(storage.get(STORAGE_KEY_LLM_DEVICE_SEED)?.length).toBeGreaterThanOrEqual(16);
  });

  it("keeps an empty local key empty", async () => {
    vi.stubEnv("VITE_LLM_KEY_SEED", SEED);
    expect(await sealLlmApiKey("", "local")).toBe("");
    expect(await openLlmApiKey("", "local")).toBe("");
  });

  it("does not open a browser key with another provider", async () => {
    vi.stubEnv("VITE_LLM_KEY_SEED", SEED);
    const sealed = await sealLlmApiKey(SECRET, "groq");

    await expect(openLlmApiKey(sealed, "openrouter")).rejects.toBeInstanceOf(LlmKeyCipherError);
  });

  it("opens a legacy envelope with a remembered build seed after the seed changes", async () => {
    const sealed = await sealLegacyLlmApiKey(SECRET, "groq", SEED);
    expect(sealed.startsWith(LLM_KEY_CIPHER_PREFIX)).toBe(true);

    rememberLlmKeySeed(SEED);
    vi.stubEnv("VITE_LLM_KEY_SEED", OTHER_SEED);
    resetLlmKeyCipherCache();

    expect(await openLlmApiKey(sealed, "groq")).toBe(SECRET);
  });

  it("does not open a legacy envelope with a different build seed", async () => {
    const sealed = await sealLegacyLlmApiKey(SECRET, "groq", SEED);
    vi.stubEnv("VITE_LLM_KEY_SEED", OTHER_SEED);

    await expect(openLlmApiKey(sealed, "groq")).rejects.toMatchObject({
      code: "decrypt_failed",
    });
  });

  it("reports a missing seed when a legacy envelope has no known seed", async () => {
    const sealed = await sealLegacyLlmApiKey(SECRET, "groq", SEED);
    vi.stubEnv("VITE_LLM_KEY_SEED", "");

    await expect(openLlmApiKey(sealed, "groq")).rejects.toMatchObject({
      code: "missing_seed",
    });
  });
});
