import { afterEach, describe, expect, it, vi } from "vitest";
import { getLlmProvider } from "@/constants/llm-providers";
import {
  STORAGE_KEY_LLM_MODEL_CATALOGS,
  STORAGE_KEY_LLM_SELECTED_MODELS,
} from "@/constants/llm-settings";
import {
  formatLlmModelPrice,
  hydrateLlmModelSelection,
  listLlmModelChoices,
  resolveSelectedLlmModel,
  saveLlmModelCatalog,
  setSelectedLlmModel,
} from "@/config/llm-model-selection";
import {
  fetchLlmModelCatalog,
  formatUsdPerMillion,
  LlmModelCatalogError,
  parseLlmModelCatalog,
  usdPerTokenToPerMillion,
} from "@/services/llm/llm-model-catalog";
import type { TranslateFn } from "@/locales/types";

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

const t = ((key: string, params?: Record<string, string | number>) => {
  if (key === "settings.llmModelPriceFree") {
    return "free";
  }
  if (key === "settings.llmModelPriceUnknown") {
    return "unknown";
  }
  return `${params?.prompt} / ${params?.completion}`;
}) as TranslateFn;

afterEach(() => {
  storage.clear();
  hydrateLlmModelSelection();
  vi.unstubAllGlobals();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  });
});

describe("llm model catalog", () => {
  it("converts OpenRouter per-token prices to USD per million", () => {
    expect(usdPerTokenToPerMillion("0")).toBe(0);
    expect(usdPerTokenToPerMillion("0.00000015")).toBe(0.15);
    expect(usdPerTokenToPerMillion(-1)).toBeNull();
    expect(usdPerTokenToPerMillion("")).toBeNull();
    expect(formatUsdPerMillion(0)).toBe("$0");
    expect(formatUsdPerMillion(0.15)).toBe("$0.15");
    expect(formatUsdPerMillion(15)).toBe("$15.00");
    expect(formatUsdPerMillion(0.00015)).toBe("$0.00015");
  });

  it("parses OpenRouter models and keeps a model without a price", () => {
    const models = parseLlmModelCatalog({
      data: [
        {
          id: "meta-llama/llama-3.3-70b-instruct",
          pricing: { prompt: "0.0000001", completion: "0.0000004" },
        },
        {
          id: "google/gemma-4-31b-it:free",
          pricing: { prompt: "0", completion: "0" },
        },
        { id: "vendor/no-price" },
        { id: "" },
      ],
    });

    expect(models.map((model) => model.id)).toEqual([
      "google/gemma-4-31b-it:free",
      "meta-llama/llama-3.3-70b-instruct",
      "vendor/no-price",
    ]);
    expect(models[1]).toMatchObject({
      promptUsdPerMillion: 0.1,
      completionUsdPerMillion: 0.4,
    });
    expect(models[2]).toMatchObject({
      promptUsdPerMillion: null,
      completionUsdPerMillion: null,
    });
    expect(formatLlmModelPrice(models[0], t)).toBe("free");
    expect(formatLlmModelPrice(models[2], t)).toBe("unknown");
    expect(formatLlmModelPrice(models[1], t)).toBe("$0.10 / $0.40");
  });

  it("reads Gemini model ids and skips models that cannot generate content", () => {
    const models = parseLlmModelCatalog({
      models: [
        {
          name: "models/gemini-2.0-flash",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/text-embedding-004",
          supportedGenerationMethods: ["embedContent"],
        },
      ],
    });

    expect(models).toEqual([
      {
        id: "gemini-2.0-flash",
        promptUsdPerMillion: null,
        completionUsdPerMillion: null,
      },
    ]);
  });

  it("uses the provider default until a model is chosen", () => {
    expect(resolveSelectedLlmModel("openrouter")).toBe("google/gemma-4-31b-it:free");
    expect(listLlmModelChoices("openrouter").map((model) => model.id)).toEqual([
      "google/gemma-4-31b-it:free",
    ]);

    setSelectedLlmModel("openrouter", "meta-llama/llama-3.3-70b-instruct");
    expect(resolveSelectedLlmModel("openrouter")).toBe("meta-llama/llama-3.3-70b-instruct");
    expect(storage.get(STORAGE_KEY_LLM_SELECTED_MODELS)).toContain(
      "meta-llama/llama-3.3-70b-instruct",
    );

    setSelectedLlmModel("openrouter", "not a model");
    expect(resolveSelectedLlmModel("openrouter")).toBe("meta-llama/llama-3.3-70b-instruct");
  });

  it("shares the OpenRouter price catalog with the free provider id", () => {
    saveLlmModelCatalog("openrouter", [
      {
        id: "google/gemma-4-31b-it:free",
        promptUsdPerMillion: 0,
        completionUsdPerMillion: 0,
      },
    ]);

    expect(listLlmModelChoices("openrouter-free")[0]?.promptUsdPerMillion).toBe(0);
    expect(storage.get(STORAGE_KEY_LLM_MODEL_CATALOGS)).toContain("openrouter");
    expect(listLlmModelChoices("local")).toEqual([]);
  });

  it("loads the public OpenRouter catalog without sending a key", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.headers).toEqual({ Accept: "application/json" });
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: "google/gemma-4-31b-it:free",
              pricing: { prompt: "0", completion: "0" },
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = getLlmProvider("openrouter");
    expect(provider).toBeTruthy();
    const models = await fetchLlmModelCatalog(provider!, "sk-or-v1-secret");
    expect(models[0]?.id).toBe("google/gemma-4-31b-it:free");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://openrouter.ai/api/v1/models");
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("secret");
  });

  it("asks for a key before calling a provider catalog", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const provider = getLlmProvider("deepseek");
    expect(provider).toBeTruthy();

    await expect(fetchLlmModelCatalog(provider!, undefined)).rejects.toMatchObject({
      code: "needs_key",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("puts the Gemini key in the query and does not echo it on failure", async () => {
    const fetchMock = vi.fn(async (_url: string) => ({ ok: false, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = getLlmProvider("google-gemini");
    expect(provider).toBeTruthy();

    await expect(fetchLlmModelCatalog(provider!, "gemini-secret")).rejects.toBeInstanceOf(
      LlmModelCatalogError,
    );
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("key=gemini-secret");
    await expect(fetchLlmModelCatalog(provider!, "gemini-secret")).rejects.toThrow("failed");
  });

  it("does not offer a public catalog for a free provider without one", async () => {
    const provider = getLlmProvider("groq-free");
    expect(provider).toBeTruthy();
    await expect(fetchLlmModelCatalog(provider!, undefined)).rejects.toMatchObject({
      code: "unavailable",
    });
  });
});
