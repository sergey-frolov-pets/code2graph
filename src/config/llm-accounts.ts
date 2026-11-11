import { ref } from "vue";
import {
  STORAGE_KEY_LLM_ACCOUNTS,
  STORAGE_KEY_LLM_API_KEYS,
  STORAGE_KEY_LLM_CHAT_SELECTION,
} from "@/constants/llm-settings";
import {
  readStorageItem,
  readStorageJson,
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
  migrateLegacyLlmAccounts,
  parseFreeLlmSelectionId,
  parseLlmAccountList,
  validateLlmAccountDraft,
  isUsableLlmAccount,
} from "@/config/llm-account-record";

export type { LlmAccessTarget, LlmAccount, LlmAccountDraft, LlmAccountDraftResult };

export type AddLlmAccountResult =
  | { ok: true; account: LlmAccount }
  | { ok: false; reason: LlmAccountDraftError };

const llmAccounts = ref<LlmAccount[]>(readInitialAccounts());
const chatLlmSelectionId = ref(readStorageItem(STORAGE_KEY_LLM_CHAT_SELECTION) ?? "");

function persistAccounts(): void {
  writeStorageJson(STORAGE_KEY_LLM_ACCOUNTS, llmAccounts.value);
}

function readInitialAccounts(): LlmAccount[] {
  if (readStorageItem(STORAGE_KEY_LLM_ACCOUNTS) !== null) {
    return (
      readStorageJson(STORAGE_KEY_LLM_ACCOUNTS, (value) => parseLlmAccountList(value)) ?? []
    );
  }

  const migrated = migrateLegacyLlmAccounts(
    parseLlmApiKeysMap(readStorageItem(STORAGE_KEY_LLM_API_KEYS)),
  );
  if (migrated.length > 0) {
    writeStorageJson(STORAGE_KEY_LLM_ACCOUNTS, migrated);
  }

  return migrated;
}

function createLlmAccountId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `llm-${Date.now().toString(36)}`;
}

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

export function addLlmAccount(draft: LlmAccountDraft): AddLlmAccountResult {
  const validated = validateLlmAccountDraft(draft);
  if (!validated.ok) {
    return validated;
  }

  const account: LlmAccount = {
    ...validated.account,
    id: createLlmAccountId(),
  };
  llmAccounts.value = [...llmAccounts.value, account];
  persistAccounts();
  return { ok: true, account };
}

export function setLlmAccountActive(id: string, active: boolean): void {
  const index = llmAccounts.value.findIndex((account) => account.id === id);
  if (index < 0 || llmAccounts.value[index].active === active) {
    return;
  }

  const next = llmAccounts.value.slice();
  next[index] = { ...next[index], active };
  llmAccounts.value = next;
  persistAccounts();
}

export function removeLlmAccount(id: string): void {
  const next = llmAccounts.value.filter((account) => account.id !== id);
  if (next.length === llmAccounts.value.length) {
    return;
  }

  llmAccounts.value = next;
  if (chatLlmSelectionId.value === id) {
    setChatLlmSelectionId("");
  }
  persistAccounts();
}

export function replaceProviderApiKey(providerId: string, apiKey: string): boolean {
  const trimmed = apiKey.trim();
  const existing = llmAccounts.value.filter((account) => account.providerId === providerId);

  if (!trimmed) {
    if (existing.length === 0) {
      return true;
    }
    llmAccounts.value = llmAccounts.value.filter((account) => account.providerId !== providerId);
    persistAccounts();
    return true;
  }

  if (existing.length === 0) {
    return addLlmAccount({
      providerId,
      label: providerId,
      apiKey: trimmed,
      active: true,
    }).ok;
  }

  const target = existing.find((account) => account.active) ?? existing[0];
  const validated = validateLlmAccountDraft({
    providerId,
    label: target.label,
    apiKey: trimmed,
    active: target.active,
    baseUrl: target.baseUrl,
    model: target.model,
  });
  if (!validated.ok) {
    return false;
  }

  llmAccounts.value = llmAccounts.value.map((account) =>
    account.id === target.id ? { ...account, apiKey: validated.account.apiKey } : account,
  );
  persistAccounts();
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
    chatLlmSelectionId,
  };
}
