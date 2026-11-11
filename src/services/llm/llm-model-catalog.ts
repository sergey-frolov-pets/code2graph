import {
  GEMINI_GENERATE_CONTENT_METHOD,
  GEMINI_MODEL_NAME_PREFIX,
  GEMINI_MODELS_URL,
  LLM_CHAT_COMPLETIONS_PATH,
  LLM_MODEL_CATALOG_MAX,
  LLM_MODELS_FETCH_TIMEOUT_MS,
  LLM_MODELS_PATH,
  LLM_PRICE_PER_MILLION_DECIMALS,
  LLM_USD_PER_MILLION_TOKENS,
  OPENROUTER_CATALOG_ID,
  isValidLlmModelName,
} from "@/constants/llm-account";
import {
  getLlmProvider,
  type LlmProviderDefinition,
} from "@/constants/llm-providers";

export interface LlmQuotedModel {
  id: string;
  promptUsdPerMillion: number | null;
  completionUsdPerMillion: number | null;
}

export type LlmModelCatalogFailure = "needs_key" | "unavailable" | "failed";

export class LlmModelCatalogError extends Error {
  readonly code: LlmModelCatalogFailure;

  constructor(code: LlmModelCatalogFailure) {
    super(code);
    this.name = "LlmModelCatalogError";
    this.code = code;
  }
}

const PRICE_ROUND_FACTOR = 10 ** LLM_PRICE_PER_MILLION_DECIMALS;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readNonNegativeNumber(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }

  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Переводит цену «USD за токен» в «USD за 1M токенов». */
export function usdPerTokenToPerMillion(raw: unknown): number | null {
  const perToken = readNonNegativeNumber(raw);
  if (perToken === null) {
    return null;
  }

  const perMillion = perToken * LLM_USD_PER_MILLION_TOKENS;
  return Math.round(perMillion * PRICE_ROUND_FACTOR) / PRICE_ROUND_FACTOR;
}

export function formatUsdPerMillion(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    return "";
  }

  if (amount === 0) {
    return "$0";
  }

  if (amount >= 0.01) {
    return `$${amount.toFixed(2)}`;
  }

  const precise = amount
    .toFixed(LLM_PRICE_PER_MILLION_DECIMALS)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
  return `$${precise}`;
}

function modelsUrlFromChatEndpoint(endpoint: string | undefined): string | null {
  if (!endpoint?.endsWith(LLM_CHAT_COMPLETIONS_PATH)) {
    return null;
  }

  return `${endpoint.slice(0, -LLM_CHAT_COMPLETIONS_PATH.length)}${LLM_MODELS_PATH}`;
}

export function resolveLlmModelsUrl(provider: LlmProviderDefinition): string | null {
  if (provider.id === "google-gemini" || provider.id === "google-gemini-free") {
    return GEMINI_MODELS_URL;
  }

  if (provider.id === "openrouter-free") {
    return modelsUrlFromChatEndpoint(getLlmProvider(OPENROUTER_CATALOG_ID)?.apiEndpoint);
  }

  return modelsUrlFromChatEndpoint(provider.apiEndpoint);
}

export function llmModelCatalogStorageId(providerId: string): string {
  if (providerId === OPENROUTER_CATALOG_ID || providerId === "openrouter-free") {
    return OPENROUTER_CATALOG_ID;
  }

  return providerId;
}

export function llmModelsCatalogIsPublic(provider: LlmProviderDefinition): boolean {
  const url = resolveLlmModelsUrl(provider);
  if (!url) {
    return false;
  }

  try {
    return new URL(url).hostname === "openrouter.ai";
  } catch {
    return false;
  }
}

function readModelId(row: Record<string, unknown>): string {
  const raw = typeof row.id === "string" ? row.id : typeof row.name === "string" ? row.name : "";
  const trimmed = raw.trim();
  if (trimmed.startsWith(GEMINI_MODEL_NAME_PREFIX)) {
    return trimmed.slice(GEMINI_MODEL_NAME_PREFIX.length);
  }

  return trimmed;
}

function supportsChat(row: Record<string, unknown>): boolean {
  const methods = row.supportedGenerationMethods;
  if (!Array.isArray(methods)) {
    return true;
  }

  return methods.some((method) => method === GEMINI_GENERATE_CONTENT_METHOD);
}

function readQuote(row: Record<string, unknown>): Pick<
  LlmQuotedModel,
  "promptUsdPerMillion" | "completionUsdPerMillion"
> {
  const pricing = isRecord(row.pricing) ? row.pricing : null;
  if (!pricing) {
    return { promptUsdPerMillion: null, completionUsdPerMillion: null };
  }

  return {
    promptUsdPerMillion: usdPerTokenToPerMillion(pricing.prompt ?? pricing.input),
    completionUsdPerMillion: usdPerTokenToPerMillion(pricing.completion ?? pricing.output),
  };
}

function priceRank(model: LlmQuotedModel): number {
  if (model.promptUsdPerMillion === 0 && model.completionUsdPerMillion === 0) {
    return 0;
  }

  if (model.promptUsdPerMillion === null || model.completionUsdPerMillion === null) {
    return 2;
  }

  return 1;
}

export function compareLlmQuotedModels(left: LlmQuotedModel, right: LlmQuotedModel): number {
  const rank = priceRank(left) - priceRank(right);
  if (rank !== 0) {
    return rank;
  }

  return left.id.localeCompare(right.id);
}

export function parseLlmModelCatalog(payload: unknown): LlmQuotedModel[] {
  if (!isRecord(payload)) {
    return [];
  }

  const rows = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.models)
      ? payload.models
      : [];

  const models: LlmQuotedModel[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!isRecord(row) || !supportsChat(row)) {
      continue;
    }

    const id = readModelId(row);
    if (!isValidLlmModelName(id) || seen.has(id)) {
      continue;
    }

    seen.add(id);
    models.push({ id, ...readQuote(row) });
  }

  models.sort(compareLlmQuotedModels);
  return models.slice(0, LLM_MODEL_CATALOG_MAX);
}

function geminiModelsRequestUrl(apiKey: string): string {
  const url = new URL(GEMINI_MODELS_URL);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

export async function fetchLlmModelCatalog(
  provider: LlmProviderDefinition,
  apiKey: string | undefined,
): Promise<LlmQuotedModel[]> {
  const url = resolveLlmModelsUrl(provider);
  if (!url) {
    throw new LlmModelCatalogError(provider.requiresUserKey ? "failed" : "unavailable");
  }

  const isPublic = llmModelsCatalogIsPublic(provider);
  const isGemini = provider.id === "google-gemini" || provider.id === "google-gemini-free";
  if (!isPublic && !apiKey) {
    throw new LlmModelCatalogError(provider.requiresUserKey ? "needs_key" : "unavailable");
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  let requestUrl = url;
  if (isGemini) {
    requestUrl = geminiModelsRequestUrl(apiKey ?? "");
  } else if (!isPublic && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(LLM_MODELS_FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new LlmModelCatalogError("failed");
  }

  if (!response.ok) {
    throw new LlmModelCatalogError("failed");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LlmModelCatalogError("failed");
  }

  const models = parseLlmModelCatalog(payload);
  if (models.length === 0) {
    throw new LlmModelCatalogError("failed");
  }

  return models;
}
