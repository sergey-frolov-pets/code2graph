import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchLlmProxyStatus,
  isFreeProviderConfiguredOnServer,
} from "@/services/llm/proxy-status";

vi.mock("@/utils/llm-proxy", () => ({
  resolveLlmProxyBaseUrl: vi.fn(() => "http://localhost:3001/api"),
}));

describe("fetchLlmProxyStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns provider status from the library server", async () => {
    const payload = {
      ok: true,
      rateLimitPerMinute: 10,
      providers: [
        { id: "google-gemini-free", model: "gemini-2.0-flash", configured: true },
        { id: "groq-free", model: "llama-3.3-70b-versatile", configured: false },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    await expect(fetchLlmProxyStatus()).resolves.toEqual(payload);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/llm/status",
    );
  });

  it("returns null when the server responds with an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false }),
    } as Response);

    await expect(fetchLlmProxyStatus()).resolves.toBeNull();
  });
});

describe("isFreeProviderConfiguredOnServer", () => {
  const status = {
    ok: true,
    rateLimitPerMinute: 10,
    providers: [
      { id: "google-gemini-free", model: "gemini-2.0-flash", configured: true },
      { id: "groq-free", model: "llama-3.3-70b-versatile", configured: false },
    ],
  };

  it("returns null when status is not loaded", () => {
    expect(isFreeProviderConfiguredOnServer(null, "google-gemini-free")).toBeNull();
  });

  it("returns configured flag for a known provider", () => {
    expect(isFreeProviderConfiguredOnServer(status, "google-gemini-free")).toBe(
      true,
    );
    expect(isFreeProviderConfiguredOnServer(status, "groq-free")).toBe(false);
  });
});
