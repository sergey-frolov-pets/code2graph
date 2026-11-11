import { ref } from "vue";
import { z } from "zod";
import {
  LLM_MODEL_CATALOG_MAX,
  LLM_MODEL_NAME_MAX_LENGTH,
  isValidLlmModelName,
} from "@/constants/llm-account";
import { getLlmProvider, LLM_PROVIDER_KIND } from "@/constants/llm-providers";
import {
  STORAGE_KEY_LLM_MODEL_CATALOGS,
  STORAGE_KEY_LLM_SELECTED_MODELS,
} from "@/constants/llm-settings";
import { readStorageJson, writeStorageJson } from "@/core/safe-storage";
import type { TranslateFn } from "@/locales/types";
import {
  compareLlmQuotedModels,
  formatUsdPerMillion,
  llmModelCatalogStorageId,
  type LlmQuotedModel,
} from "@/services/llm/llm-model-catalog";

const QuotedModelSchema = z.object({
  id: z.string().min(1).max(LLM_MODEL_NAME_MAX_LENGTH),
  promptUsdPerMillion: z.number().finite().nonnegative().nullable(),
  completionUsdPerMillion: z.number().finite().nonnegative().nullable(),
});

const CatalogEntrySchema = z.object({
  fetchedAtMs: z.number().int().nonnegative(),
  models: z.array(QuotedModelSchema).max(LLM_MODEL_CATALOG_MAX),
});

export interface LlmModelCatalogEntry {
  fetchedAtMs: number;
  models: LlmQuotedModel[];
}

const selectedLlmModels = ref<Record<string, string>>({});
const llmModelCatalogs = ref<Record<string, LlmModelCatalogEntry>>({});

function readSelections(value: unknown): Record<string, string> {
  const parsed = z.record(z.string(), z.string()).safeParse(value);
  if (!parsed.success) {
    return {};
  }

  const selections: Record<string, string> = {};
  for (const [providerId, modelId] of Object.entries(parsed.data)) {
    if (!getLlmProvider(providerId) || !isValidLlmModelName(modelId)) {
      continue;
    }

    selections[providerId] = modelId.trim();
  }

  return selections;
}

function readCatalogs(value: unknown): Record<string, LlmModelCatalogEntry> {
  const parsed = z.record(z.string(), CatalogEntrySchema).safeParse(value);
  if (!parsed.success) {
    return {};
  }

  const catalogs: Record<string, LlmModelCatalogEntry> = {};
  for (const [providerId, entry] of Object.entries(parsed.data)) {
    if (!getLlmProvider(providerId)) {
      continue;
    }

    const models = entry.models.filter((model) => isValidLlmModelName(model.id));
    if (models.length === 0) {
      continue;
    }

    catalogs[providerId] = {
      fetchedAtMs: entry.fetchedAtMs,
      models,
    };
  }

  return catalogs;
}

export function hydrateLlmModelSelection(): void {
  selectedLlmModels.value =
    readStorageJson(STORAGE_KEY_LLM_SELECTED_MODELS, readSelections) ?? {};
  llmModelCatalogs.value =
    readStorageJson(STORAGE_KEY_LLM_MODEL_CATALOGS, readCatalogs) ?? {};
}

hydrateLlmModelSelection();

export function resolveSelectedLlmModel(providerId: string): string {
  const provider = getLlmProvider(providerId);
  const fallback = provider?.defaultModel ?? "";
  const saved = selectedLlmModels.value[providerId];
  if (saved && isValidLlmModelName(saved)) {
    return saved;
  }

  return fallback;
}

export function setSelectedLlmModel(providerId: string, modelId: string): void {
  if (!getLlmProvider(providerId) || !isValidLlmModelName(modelId)) {
    return;
  }

  selectedLlmModels.value = {
    ...selectedLlmModels.value,
    [providerId]: modelId.trim(),
  };
  writeStorageJson(STORAGE_KEY_LLM_SELECTED_MODELS, selectedLlmModels.value);
}

export function saveLlmModelCatalog(providerId: string, models: readonly LlmQuotedModel[]): void {
  const storageId = llmModelCatalogStorageId(providerId);
  if (!getLlmProvider(storageId) || models.length === 0) {
    return;
  }

  const entry: LlmModelCatalogEntry = {
    fetchedAtMs: Date.now(),
    models: models.slice(0, LLM_MODEL_CATALOG_MAX).map((model) => ({ ...model })),
  };
  llmModelCatalogs.value = {
    ...llmModelCatalogs.value,
    [storageId]: entry,
  };
  writeStorageJson(STORAGE_KEY_LLM_MODEL_CATALOGS, llmModelCatalogs.value);
}

function unknownQuote(id: string): LlmQuotedModel {
  return {
    id,
    promptUsdPerMillion: null,
    completionUsdPerMillion: null,
  };
}

export function listLlmModelChoices(providerId: string): LlmQuotedModel[] {
  const provider = getLlmProvider(providerId);
  if (!provider || provider.kind === LLM_PROVIDER_KIND.LOCAL) {
    return [];
  }

  const stored = llmModelCatalogs.value[llmModelCatalogStorageId(providerId)]?.models ?? [];
  const byId = new Map(stored.map((model) => [model.id, model]));
  const selected = resolveSelectedLlmModel(providerId);
  if (isValidLlmModelName(provider.defaultModel) && !byId.has(provider.defaultModel)) {
    byId.set(provider.defaultModel, unknownQuote(provider.defaultModel));
  }
  if (isValidLlmModelName(selected) && !byId.has(selected)) {
    byId.set(selected, unknownQuote(selected));
  }

  return [...byId.values()].sort(compareLlmQuotedModels);
}

export function formatLlmModelPrice(model: LlmQuotedModel, t: TranslateFn): string {
  const prompt = model.promptUsdPerMillion;
  const completion = model.completionUsdPerMillion;
  if (prompt === 0 && completion === 0) {
    return t("settings.llmModelPriceFree");
  }

  if (prompt === null || completion === null) {
    return t("settings.llmModelPriceUnknown");
  }

  return t("settings.llmModelPrice", {
    prompt: formatUsdPerMillion(prompt),
    completion: formatUsdPerMillion(completion),
  });
}
