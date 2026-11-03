import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TEST_API_BASE,
  createFetchMock,
  expectFetchMethod,
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
import {
  checkApiHealth,
  fetchLibraryAuthStatus,
  loginLibrary,
  registerLibraryAccount,
} from "./auth";

describe("library api auth", () => {
  beforeEach(() => {
    vi.mocked(getLibraryApiBaseUrl).mockReturnValue(TEST_API_BASE);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches auth status from public endpoint", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ needsSetup: true }));

    const status = await fetchLibraryAuthStatus(TEST_API_BASE);
    expect(status.needsSetup).toBe(true);
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/auth/status`);
  });

  it("registers account via POST", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ token: "tok", user: { id: "1", username: "alice" } }),
    );

    const result = await registerLibraryAccount("alice", "secret", TEST_API_BASE);
    expect(result.token).toBe("tok");
    expectFetchMethod(fetchMock, 0, "POST");
  });

  it("logs in via authenticated requestJson", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ token: "tok", user: { id: "1", username: "alice" } }),
    );

    const result = await loginLibrary("alice", "secret", TEST_API_BASE);
    expect(result.user.username).toBe("alice");
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/auth/login`);
  });

  it("returns true when auth status succeeds", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ needsSetup: false }));

    await expect(checkApiHealth(TEST_API_BASE)).resolves.toBe(true);
  });

  it("falls back to /health when auth status fails", async () => {
    const fetchMock = createFetchMock();
    fetchMock
      .mockRejectedValueOnce(new Error("auth down"))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(checkApiHealth(TEST_API_BASE)).resolves.toBe(true);
    expectFetchUrl(fetchMock, 1, `${TEST_API_BASE}/health`);
  });

  it("returns false when API URL is not configured", async () => {
    await expect(checkApiHealth("")).resolves.toBe(false);
  });
});
