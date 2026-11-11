import { ref } from "vue";
import {
  STORAGE_KEY_LLM_ACCOUNTS,
  STORAGE_KEY_LLM_API_KEYS,
  STORAGE_KEY_LLM_CHAT_SELECTION,
} from "@/constants/llm-settings";
import {
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
  writeStorageJson,
} from "@/core/safe-storage";
import { parseLlmApiKeysMap } from "@/utils/llm-key-storage";
import {
  type LlmAccessTarget,
  type LlmAccount,
  type LlmAccountDraft,
  type LlmAccountDraftError,
  type LlmAccountDraftResult,
  isUsableLlmAccount,
  migrateLegacyLlmAccounts,
  parseFreeLlmSelectionId,
  parseLlmAccount,
  parseStoredLlmAccountRecords,
  validateLlmAccountDraft,
} from "@/config/llm-account-record";
import {
  hasLlmKeySeed,
  isSealedLlmApiKey,
  LlmKeyCipherError,
  openLlmApiKey,
  sealLlmApiKey,
} from "@/services/llm/llm-key-cipher";

export type { LlmAccessTarget, LlmAccount, LlmAccountDraft, LlmAccountDraftResult };

export type AddLlmAccountResult =
  | { ok: true; account: LlmAccount }
  | { ok: false; reason: LlmAccountDraftError };

export type LlmKeyStoreError = "missing_seed" | "decrypt_failed";

const llmAccounts = ref<LlmAccount[]>([]);
const llmAccountsHydrated = ref(false);
const llmKeyStoreError = ref<LlmKeyStoreError | null>(null);
const chatLlmSelectionId = ref(readStorageItem(STORAGE_KEY_LLM_CHAT_SELECTION) ?? "");

let sealBlocked = false;
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): void {
  queue = queue.then(task).catch(() => undefined);
}

function applyAfterHydrate(apply: () => void): void {
  enqueue(async () => {
    apply();
    await persistEncrypted();
  });
}

function createLlmAccountId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `llm-${Date.now().toString(36)}`;
}

function accountsNeedSeed(accounts: readonly LlmAccount[]): boolean {
  return accounts.some((account) => account.apiKey.length > 0);
}

async function persistEncrypted(): Promise<void> {
  if (sealBlocked) {
    return;
  }

  if (accountsNeedSeed(llmAccounts.value) && !hasLlmKeySeed()) {
    llmKeyStoreError.value = "missing_seed";
    sealBlocked = true;
    return;
  }

  const sealed = await Promise.all(
    llmAccounts.value.map(async (account) => ({
      ...account,
      apiKey: await sealLlmApiKey(account.apiKey, account.providerId),
    })),
  );
  writeStorageJson(STORAGE_KEY_LLM_ACCOUNTS, sealed);
  removeStorageItem(STORAGE_KEY_LLM_API_KEYS);
}

async function openStoredAccounts(records: readonly LlmAccount[]): Promise<{
  accounts: LlmAccount[];
  failed: boolean;
  missingSeed: boolean;
  reseal: boolean;
}> {
  const accounts: LlmAccount[] = [];
  let failed = false;
  let missingSeed = false;
  let reseal = false;

  for (const record of records) {
    if (!record.apiKey) {
      const account = parseLlmAccount(record);
      if (account) {
        accounts.push(account);
      }
      continue;
    }

    if (!isSealedLlmApiKey(record.apiKey)) {
      reseal = true;
      const account = parseLlmAccount(record);
      if (account) {
        accounts.push(account);
      }
      continue;
    }

    try {
      const apiKey = await openLlmApiKey(record.apiKey, record.providerId);
      const account = parseLlmAccount({ ...record, apiKey });
      if (account) {
        accounts.push(account);
      }
    } catch (error) {
      failed = true;
      if (error instanceof LlmKeyCipherError && error.code === "missing_seed") {
        missingSeed = true;
      }
    }
  }

  return { accounts, failed, missingSeed, reseal };
}

async function hydrate(): Promise<void> {
  try {
    const raw = readStorageItem(STORAGE_KEY_LLM_ACCOUNTS);
    if (raw === null) {
      const migrated = migrateLegacyLlmAccounts(
        parseLlmApiKeysMap(readStorageItem(STORAGE_KEY_LLM_API_KEYS)),
      );
      llmAccounts.value = migrated;
      if (!accountsNeedSeed(migrated)) {
        return;
      }
      if (!hasLlmKeySeed()) {
        llmKeyStoreError.value = "missing_seed";
        sealBlocked = true;
        return;
      }
      await persistEncrypted();
      return;
    }

    let parsed: unknown = [];
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      parsed = [];
    }

    const opened = await openStoredAccounts(parseStoredLlmAccountRecords(parsed));
    llmAccounts.value = opened.accounts;
    if (opened.failed) {
      sealBlocked = true;
      llmKeyStoreError.value = opened.missingSeed ? "missing_seed" : "decrypt_failed";
      return;
    }

    if (!opened.reseal) {
      return;
    }

    if (!hasLlmKeySeed()) {
      llmKeyStoreError.value = "missing_seed";
      sealBlocked = true;
      return;
    }

    await persistEncrypted();
  } finally {
    llmAccountsHydrated.value = true;
  }
}

enqueue(hydrate);

export function getLlmAccounts(): readonly LlmAccount[] {
  return llmAccounts.value;
}

export function getLlmAccount(id: string): LlmAccount | undefined {
  return llmAccounts.value.find((account) => account.id === id);
}

export function getPreferredLlmAccount(providerId: string): LlmAccount | undefined {
  return llmAccounts.value.find(
    (account) => account.providerId === providerId && isUsableLlmAccount(account),
  );
}

function rejectWithoutSeed(apiKey: string): boolean {
  if (!apiKey || hasLlmKeySeed()) {
    return false;
  }

  llmKeyStoreError.value = "missing_seed";
  return true;
}

export function addLlmAccount(draft: LlmAccountDraft): AddLlmAccountResult {
  const validated = validateLlmAccountDraft(draft);
  if (!validated.ok) {
    return validated;
  }

  if (rejectWithoutSeed(validated.account.apiKey)) {
    return { ok: false, reason: "cipher_unavailable" };
  }

  const account: LlmAccount = {
    ...validated.account,
    id: createLlmAccountId(),
  };
  applyAfterHydrate(() => {
    llmAccounts.value = [...llmAccounts.value, account];
  });
  return { ok: true, account };
}

export function setLlmAccountActive(id: string, active: boolean): void {
  applyAfterHydrate(() => {
    const index = llmAccounts.value.findIndex((account) => account.id === id);
    if (index < 0 || llmAccounts.value[index].active === active) {
      return;
    }

    const next = llmAccounts.value.slice();
    next[index] = { ...next[index], active };
    llmAccounts.value = next;
  });
}

export function removeLlmAccount(id: string): void {
  applyAfterHydrate(() => {
    const next = llmAccounts.value.filter((account) => account.id !== id);
    if (next.length === llmAccounts.value.length) {
      return;
    }

    llmAccounts.value = next;
    if (chatLlmSelectionId.value === id) {
      setChatLlmSelectionId("");
    }
  });
}

export function replaceProviderApiKey(providerId: string, apiKey: string): boolean {
  const trimmed = apiKey.trim();
  if (rejectWithoutSeed(trimmed)) {
    return false;
  }

  if (trimmed) {
    const probe = validateLlmAccountDraft({
      providerId,
      label: providerId,
      apiKey: trimmed,
      active: true,
    });
    if (!probe.ok) {
      return false;
    }
  }

  applyAfterHydrate(() => {
    const existing = llmAccounts.value.filter((account) => account.providerId === providerId);
    if (!trimmed) {
      if (existing.length === 0) {
        return;
      }
      llmAccounts.value = llmAccounts.value.filter(
        (account) => account.providerId !== providerId,
      );
      return;
    }

    if (existing.length === 0) {
      llmAccounts.value = [
        ...llmAccounts.value,
        {
          id: createLlmAccountId(),
          providerId,
          label: providerId,
          apiKey: trimmed,
          active: true,
        },
      ];
      return;
    }

    const target = existing.find((account) => account.active) ?? existing[0];
    llmAccounts.value = llmAccounts.value.map((account) =>
      account.id === target.id ? { ...account, apiKey: trimmed } : account,
    );
  });
  return true;
}

export function clearProviderApiKeys(providerId: string): void {
  replaceProviderApiKey(providerId, "");
}

export function setChatLlmSelectionId(id: string): void {
  chatLlmSelectionId.value = id;
  if (id) {
    writeStorageItem(STORAGE_KEY_LLM_CHAT_SELECTION, id);
    return;
  }

  removeStorageItem(STORAGE_KEY_LLM_CHAT_SELECTION);
}

export function getChatLlmSelectionId(): string {
  return chatLlmSelectionId.value;
}

export function readChatLlmAccess(): LlmAccessTarget | undefined {
  const selectionId = chatLlmSelectionId.value.trim();
  if (!selectionId) {
    return undefined;
  }

  const freeProviderId = parseFreeLlmSelectionId(selectionId);
  if (freeProviderId) {
    return { providerId: freeProviderId };
  }

  const account = getLlmAccount(selectionId);
  if (!account || !isUsableLlmAccount(account)) {
    return undefined;
  }

  return { accountId: account.id };
}

export function useLlmAccountStore() {
  return {
    llmAccounts,
    llmAccountsHydrated,
    llmKeyStoreError,
    chatLlmSelectionId,
  };
}
