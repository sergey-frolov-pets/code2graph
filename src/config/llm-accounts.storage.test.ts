import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LLM_KEY_CIPHER_PREFIX, LLM_KEY_DEVICE_CIPHER_PREFIX } from "@/constants/llm-account";
import { STORAGE_KEY_LLM_ACCOUNTS } from "@/constants/llm-settings";
import {
  addLlmAccount,
  getLlmAccounts,
  reloadStoredLlmAccounts,
  useLlmAccountStore,
} from "@/config/llm-accounts";
import { resetLlmKeyCipherCache, sealLegacyLlmApiKey } from "@/services/llm/llm-key-cipher";

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

const BUILD_SEED = "build-seed-value-32chars-minimum";
const NEXT_BUILD_SEED = "next-build-seed-value-32chars-ok";
const SECRET = "gsk-user-secret-key";
const ADDED_SECRET = "gsk-added-after-update";

function storedAccount(apiKey: string) {
  return {
    id: "groq-work",
    providerId: "groq",
    label: "Work",
    apiKey,
    active: true,
  };
}

describe("llm accounts survive an app version update", () => {
  beforeEach(async () => {
    await reloadStoredLlmAccounts();
    storage.clear();
    resetLlmKeyCipherCache();
    vi.stubEnv("VITE_LLM_KEY_SEED", BUILD_SEED);
    await reloadStoredLlmAccounts();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("moves a legacy key onto the browser seed and keeps it when the build seed changes", async () => {
    const legacy = await sealLegacyLlmApiKey(SECRET, "groq", BUILD_SEED);
    storage.set(STORAGE_KEY_LLM_ACCOUNTS, JSON.stringify([storedAccount(legacy)]));

    await reloadStoredLlmAccounts();

    expect(getLlmAccounts().map((account) => account.apiKey)).toEqual([SECRET]);
    const migrated = storage.get(STORAGE_KEY_LLM_ACCOUNTS) ?? "";
    expect(migrated).toContain(LLM_KEY_DEVICE_CIPHER_PREFIX);
    expect(migrated).not.toContain(SECRET);
    expect(migrated).not.toContain(legacy);

    vi.stubEnv("VITE_LLM_KEY_SEED", NEXT_BUILD_SEED);
    resetLlmKeyCipherCache();
    await reloadStoredLlmAccounts();

    expect(getLlmAccounts().map((account) => account.apiKey)).toEqual([SECRET]);

    vi.stubEnv("VITE_LLM_KEY_SEED", "");
    resetLlmKeyCipherCache();
    await reloadStoredLlmAccounts();

    expect(getLlmAccounts().map((account) => account.apiKey)).toEqual([SECRET]);
    expect(useLlmAccountStore().llmKeyStoreError.value).toBeNull();
  });

  it("does not delete a legacy key the new build cannot open", async () => {
    const legacy = await sealLegacyLlmApiKey(SECRET, "groq", NEXT_BUILD_SEED);
    const raw = JSON.stringify([storedAccount(legacy)]);
    storage.set(STORAGE_KEY_LLM_ACCOUNTS, raw);
    vi.stubEnv("VITE_LLM_KEY_SEED", BUILD_SEED);
    resetLlmKeyCipherCache();

    await reloadStoredLlmAccounts();

    expect(getLlmAccounts()).toEqual([]);
    expect(storage.get(STORAGE_KEY_LLM_ACCOUNTS)).toBe(raw);
    expect(raw).toContain(LLM_KEY_CIPHER_PREFIX);
    expect(useLlmAccountStore().llmKeyStoreError.value).toBe("decrypt_failed");

    const added = addLlmAccount({
      providerId: "groq",
      label: "Added",
      apiKey: ADDED_SECRET,
      active: true,
    });
    expect(added.ok).toBe(true);
    await reloadStoredLlmAccounts();

    const kept = storage.get(STORAGE_KEY_LLM_ACCOUNTS) ?? "";
    expect(kept).toContain(legacy);
    expect(getLlmAccounts().map((account) => account.apiKey)).toEqual([ADDED_SECRET]);
  });
});
