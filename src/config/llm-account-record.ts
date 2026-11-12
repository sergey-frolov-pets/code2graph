import { z } from "zod";
import {
  FREE_LLM_SELECTION_PREFIX,
  LEGACY_LLM_ACCOUNT_ID_PREFIX,
  LLM_ACCOUNT_ID_MAX_LENGTH,
  LLM_ACCOUNT_LABEL_MAX_LENGTH,
  LLM_API_KEY_MASK_EDGE,
  LLM_API_KEY_MAX_LENGTH,
  LLM_LOCAL_URL_MAX_LENGTH,
  LLM_MAX_TOKENS_MAX,
  LLM_MAX_TOKENS_MIN,
  LLM_MODEL_NAME_MAX_LENGTH,
  LLM_N_MAX,
  LLM_N_MIN,
  LLM_PENALTY_MAX,
  LLM_PENALTY_MIN,
  LLM_SEALED_SECRET_MAX_LENGTH,
  LLM_TEMPERATURE_MAX,
  LLM_TEMPERATURE_MIN,
  LLM_TOP_P_MAX,
  LLM_TOP_P_MIN,
  LOCAL_LLM_PROVIDER_ID,
  isValidLlmModelName,
} from "@/constants/llm-account";
import {
  isByokLlmProvider,
  isFreeBuiltinLlmProvider,
  isLlmProviderId,
} from "@/constants/llm-providers";
import { isValidLlmApiKeyValue } from "@/utils/llm-key-storage";
import { resolveOpenAiChatEndpoint } from "@/utils/llm-endpoint";

export interface LlmAccount {
  id: string;
  providerId: string;
  label: string;
  apiKey: string;
  /** Показывать в селекторе чата и использовать как рабочий ключ провайдера. */
  active: boolean;
  baseUrl?: string;
  model?: string;
  parameters?: LlmAccountParameters;
}

/** Параметры chat completions, сохранённые на конкретном ключе. */
export interface LlmAccountParameters {
  temperature?: number;
  topP?: number;
  n?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
}

export type LlmAccountParameterKey = keyof LlmAccountParameters;

export interface LlmAccountDraft {
  providerId: string;
  label: string;
  apiKey: string;
  active: boolean;
  baseUrl?: string;
  model?: string;
}

/** Явный выбор провайдера для одного запроса, например из селектора чата. */
export interface LlmAccessTarget {
  accountId?: string;
  providerId?: string;
}

export type LlmAccountDraftError =
  | "invalid_provider"
  | "invalid_label"
  | "invalid_key"
  | "invalid_url"
  | "invalid_model"
  | "cipher_unavailable";

export type LlmAccountDraftResult =
  | { ok: true; account: Omit<LlmAccount, "id"> }
  | { ok: false; reason: LlmAccountDraftError };

const LlmAccountSchema = z.object({
  id: z.string().trim().min(1).max(LLM_ACCOUNT_ID_MAX_LENGTH),
  providerId: z.string().trim().min(1),
  label: z.string().trim().min(1).max(LLM_ACCOUNT_LABEL_MAX_LENGTH),
  apiKey: z.string().max(LLM_API_KEY_MAX_LENGTH),
  active: z.boolean(),
  baseUrl: z.string().max(LLM_LOCAL_URL_MAX_LENGTH).optional(),
  model: z.string().max(LLM_MODEL_NAME_MAX_LENGTH).optional(),
  parameters: z.unknown().optional(),
});

function readBoundedNumber(
  value: unknown,
  min: number,
  max: number,
  integer = false,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  if (integer && !Number.isInteger(value)) {
    return undefined;
  }

  if (value < min || value > max) {
    return undefined;
  }

  return value;
}

export function parseLlmAccountParameters(value: unknown): LlmAccountParameters | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const parameters: LlmAccountParameters = {};
  const temperature = readBoundedNumber(record.temperature, LLM_TEMPERATURE_MIN, LLM_TEMPERATURE_MAX);
  const topP = readBoundedNumber(record.topP, LLM_TOP_P_MIN, LLM_TOP_P_MAX);
  const choices = readBoundedNumber(record.n, LLM_N_MIN, LLM_N_MAX, true);
  const presencePenalty = readBoundedNumber(
    record.presencePenalty,
    LLM_PENALTY_MIN,
    LLM_PENALTY_MAX,
  );
  const frequencyPenalty = readBoundedNumber(
    record.frequencyPenalty,
    LLM_PENALTY_MIN,
    LLM_PENALTY_MAX,
  );
  const maxTokens = readBoundedNumber(record.maxTokens, LLM_MAX_TOKENS_MIN, LLM_MAX_TOKENS_MAX, true);

  if (temperature !== undefined) parameters.temperature = temperature;
  if (topP !== undefined) parameters.topP = topP;
  if (choices !== undefined) parameters.n = choices;
  if (presencePenalty !== undefined) parameters.presencePenalty = presencePenalty;
  if (frequencyPenalty !== undefined) parameters.frequencyPenalty = frequencyPenalty;
  if (maxTokens !== undefined) parameters.maxTokens = maxTokens;

  return Object.keys(parameters).length > 0 ? parameters : undefined;
}

export function parseLlmAccountParameterValue(
  key: LlmAccountParameterKey,
  raw: string,
): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const value = Number(trimmed);
  const parsed = parseLlmAccountParameters({ [key]: value });
  return parsed?.[key];
}

export function isLocalLlmAccount(account: Pick<LlmAccount, "providerId">): boolean {
  return account.providerId === LOCAL_LLM_PROVIDER_ID;
}

export function isUsableLlmAccount(account: LlmAccount): boolean {
  if (!account.active) {
    return false;
  }

  if (isLocalLlmAccount(account)) {
    return (
      resolveOpenAiChatEndpoint(account.baseUrl ?? "") !== null &&
      isValidLlmModelName(account.model ?? "")
    );
  }

  return isByokLlmProvider(account.providerId) && isValidLlmApiKeyValue(account.apiKey);
}

export function maskLlmApiKey(apiKey: string): string {
  if (apiKey.length <= LLM_API_KEY_MASK_EDGE * 2) {
    return "••••";
  }

  return `${apiKey.slice(0, LLM_API_KEY_MASK_EDGE)}…${apiKey.slice(-LLM_API_KEY_MASK_EDGE)}`;
}

export function llmAccountDisplayLabel(account: LlmAccount, providerName: string): string {
  if (!account.label || account.label === account.providerId) {
    return providerName;
  }

  return account.label;
}

export function llmAccountChatLabel(account: LlmAccount, providerName: string): string {
  const title = llmAccountDisplayLabel(account, providerName);
  if (isLocalLlmAccount(account)) {
    return account.model ? `${title} · ${account.model}` : title;
  }

  if (title !== providerName) {
    return `${title} · ${providerName}`;
  }

  return providerName;
}

export function freeLlmSelectionId(providerId: string): string {
  return `${FREE_LLM_SELECTION_PREFIX}${providerId}`;
}

export function parseFreeLlmSelectionId(selectionId: string): string | undefined {
  if (!selectionId.startsWith(FREE_LLM_SELECTION_PREFIX)) {
    return undefined;
  }

  const providerId = selectionId.slice(FREE_LLM_SELECTION_PREFIX.length);
  return isFreeBuiltinLlmProvider(providerId) ? providerId : undefined;
}

export function parseLlmAccount(value: unknown): LlmAccount | null {
  const parsed = LlmAccountSchema.safeParse(value);
  if (!parsed.success || !isLlmProviderId(parsed.data.providerId)) {
    return null;
  }

  const parameters = parseLlmAccountParameters(parsed.data.parameters);
  const account: LlmAccount = {
    id: parsed.data.id,
    providerId: parsed.data.providerId,
    label: parsed.data.label,
    apiKey: parsed.data.apiKey.trim(),
    active: parsed.data.active,
    baseUrl: parsed.data.baseUrl?.trim() || undefined,
    model: parsed.data.model?.trim() || undefined,
    ...(parameters ? { parameters } : {}),
  };

  if (isLocalLlmAccount(account)) {
    return isValidLlmModelName(account.model ?? "") &&
      resolveOpenAiChatEndpoint(account.baseUrl ?? "")
      ? account
      : null;
  }

  if (!isByokLlmProvider(account.providerId) || !isValidLlmApiKeyValue(account.apiKey)) {
    return null;
  }

  return account;
}

const StoredLlmAccountSchema = LlmAccountSchema.extend({
  apiKey: z.string().max(LLM_SEALED_SECRET_MAX_LENGTH),
});

/** Одна запись с диска: apiKey может быть запечатанным конвертом, ещё не открытым текстом. */
export function parseStoredLlmAccountRecord(value: unknown): LlmAccount | null {
  const parsed = StoredLlmAccountSchema.safeParse(value);
  if (!parsed.success || !isLlmProviderId(parsed.data.providerId)) {
    return null;
  }

  const parameters = parseLlmAccountParameters(parsed.data.parameters);
  return {
    id: parsed.data.id,
    providerId: parsed.data.providerId,
    label: parsed.data.label,
    apiKey: parsed.data.apiKey,
    active: parsed.data.active,
    baseUrl: parsed.data.baseUrl?.trim() || undefined,
    model: parsed.data.model?.trim() || undefined,
    ...(parameters ? { parameters } : {}),
  };
}

/** Запись с диска: apiKey может быть запечатанным конвертом, ещё не открытым текстом. */
export function parseStoredLlmAccountRecords(value: unknown): LlmAccount[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const account = parseStoredLlmAccountRecord(item);
    return account ? [account] : [];
  });
}

export function parseLlmAccountList(value: unknown): LlmAccount[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const account = parseLlmAccount(item);
    return account ? [account] : [];
  });
}

export function migrateLegacyLlmAccounts(
  legacyKeys: Record<string, string>,
): LlmAccount[] {
  return Object.entries(legacyKeys).flatMap(([providerId, apiKey]) => {
    const account = parseLlmAccount({
      id: `${LEGACY_LLM_ACCOUNT_ID_PREFIX}${providerId}`,
      providerId,
      label: providerId,
      apiKey,
      active: true,
    });
    return account ? [account] : [];
  });
}

export function validateLlmAccountDraft(draft: LlmAccountDraft): LlmAccountDraftResult {
  const providerId = draft.providerId.trim();
  if (!isByokLlmProvider(providerId) && providerId !== LOCAL_LLM_PROVIDER_ID) {
    return { ok: false, reason: "invalid_provider" };
  }

  const label = draft.label.trim();
  if (!label || label.length > LLM_ACCOUNT_LABEL_MAX_LENGTH) {
    return { ok: false, reason: "invalid_label" };
  }

  const apiKey = draft.apiKey.trim();
  if (providerId === LOCAL_LLM_PROVIDER_ID) {
    if (apiKey.length > LLM_API_KEY_MAX_LENGTH) {
      return { ok: false, reason: "invalid_key" };
    }

    const baseUrl = draft.baseUrl?.trim() ?? "";
    if (!resolveOpenAiChatEndpoint(baseUrl)) {
      return { ok: false, reason: "invalid_url" };
    }

    const model = draft.model?.trim() ?? "";
    if (!isValidLlmModelName(model)) {
      return { ok: false, reason: "invalid_model" };
    }

    return {
      ok: true,
      account: {
        providerId,
        label,
        apiKey,
        active: draft.active,
        baseUrl,
        model,
      },
    };
  }

  if (!isValidLlmApiKeyValue(apiKey)) {
    return { ok: false, reason: "invalid_key" };
  }

  return {
    ok: true,
    account: {
      providerId,
      label,
      apiKey,
      active: draft.active,
    },
  };
}
