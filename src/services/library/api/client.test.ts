import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LibraryApiError,
  buildRequestHeaders,
  parseError,
  requestJson,
  requestJsonPublic,
  resolveApiBaseUrl,
  resolveShareApiBaseUrl,
} from "./client";
import {
  TEST_API_BASE,
  createFetchMock,
  expectFetchUrl,
  jsonResponse,
} from "./__tests__/test-helpers";

vi.mock("@/config/library-api", () => ({
  getLibraryApiBaseUrl: vi.fn(() => ""),
}));

vi.mock("@/config/library-credentials", () => ({
  buildLibraryAuthHeader: vi.fn(() => ({ Authorization: "Bearer test-token" })),
}));

import { getLibraryApiBaseUrl } from "@/config/library-api";
import { buildLibraryAuthHeader } from "@/config/library-credentials";

describe("library api client", () => {
  beforeEach(() => {
    vi.mocked(getLibraryApiBaseUrl).mockReturnValue(TEST_API_BASE);
    vi.mocked(buildLibraryAuthHeader).mockReturnValue({
      Authorization: "Bearer test-token",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates LibraryApiError with status", () => {
    const error = new LibraryApiError("Not found", 404);
    expect(error.name).toBe("LibraryApiError");
    expect(error.status).toBe(404);
    expect(error.message).toBe("Not found");
  });

  it("throws when API base URL is not configured", () => {
    vi.mocked(getLibraryApiBaseUrl).mockReturnValue("");
    expect(() => resolveApiBaseUrl()).toThrow(LibraryApiError);
    try {
      resolveApiBaseUrl();
    } catch (error) {
      expect(error).toBeInstanceOf(LibraryApiError);
      expect((error as LibraryApiError).status).toBe(0);
    }
  });

  it("resolves share API base URL", () => {
    expect(resolveShareApiBaseUrl(TEST_API_BASE)).toBe("https://api.test/api/share");
  });

  it("merges auth headers into request headers", () => {
    const headers = buildRequestHeaders({
      headers: { "X-Custom": "1" },
    });
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.get("X-Custom")).toBe("1");
  });

  it("parses JSON error body", async () => {
    const message = await parseError(
      jsonResponse({ error: "Диаграмма не найдена" }, 404),
    );
    expect(message).toBe("Диаграмма не найдена");
  });

  it("falls back to HTTP status when error body is missing", async () => {
    const message = await parseError(jsonResponse({}, 500));
    expect(message).toBe("HTTP 500");
  });

  it("requestJson sends auth headers and parses JSON", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await requestJson<{ ok: boolean }>("/diagrams");
    expect(result.ok).toBe(true);
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/diagrams`);
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("requestJsonPublic does not require auth merge beyond caller headers", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ needsSetup: false }));

    const result = await requestJsonPublic<{ needsSetup: boolean }>("/auth/status");
    expect(result.needsSetup).toBe(false);
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/auth/status`);
  });

  it("returns undefined for 204 responses", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await requestJson("/diagrams/1", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("throws LibraryApiError on non-ok response", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Forbidden" }, 403));

    await expect(requestJson("/diagrams")).rejects.toMatchObject({
      name: "LibraryApiError",
      status: 403,
      message: "Forbidden",
    });
  });
});
