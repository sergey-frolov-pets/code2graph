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
import { createAdminUser, fetchAdminUsers, setUserBlocked } from "./admin";

describe("library api admin", () => {
  beforeEach(() => {
    vi.mocked(getLibraryApiBaseUrl).mockReturnValue(TEST_API_BASE);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches admin users", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ users: [] }));

    const result = await fetchAdminUsers(TEST_API_BASE);
    expect(result.users).toEqual([]);
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/admin/users`);
  });

  it("blocks user", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: { id: "u1", blocked: true } }),
    );

    await setUserBlocked("u1", true, TEST_API_BASE);
    expectFetchMethod(fetchMock, 0, "PUT");
    const body = String((fetchMock.mock.calls[0]?.[1] as RequestInit).body);
    expect(body).toContain('"blocked":true');
  });

  it("creates admin user", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ user: { id: "u2", username: "ops" } }),
    );

    const result = await createAdminUser(
      { username: "ops", password: "secret", role: "admin" },
      TEST_API_BASE,
    );
    expect(result.user.username).toBe("ops");
    expectFetchMethod(fetchMock, 0, "POST");
  });
});
