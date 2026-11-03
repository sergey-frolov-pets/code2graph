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
  createSection,
  deleteSection,
  fetchSections,
  grantSectionAccess,
  revokeSectionAccess,
} from "./sections";

describe("library api sections", () => {
  beforeEach(() => {
    vi.mocked(getLibraryApiBaseUrl).mockReturnValue(TEST_API_BASE);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches sections", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ sections: [], flat: [] }));

    const result = await fetchSections(TEST_API_BASE);
    expect(result.sections).toEqual([]);
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/sections`);
  });

  it("creates section", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "s1", title: "API" }));

    await createSection({ title: "API", parentId: null }, TEST_API_BASE);
    expectFetchMethod(fetchMock, 0, "POST");
  });

  it("deletes section", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await deleteSection("s1", TEST_API_BASE);
    expectFetchMethod(fetchMock, 0, "DELETE");
  });

  it("grants section access", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await grantSectionAccess(
      "s1",
      { username: "bob", permission: "view" },
      TEST_API_BASE,
    );

    const body = String((fetchMock.mock.calls[0]?.[1] as RequestInit).body);
    expect(body).toContain('"username":"bob"');
    expect(body).toContain('"permission":"view"');
  });

  it("revokes section access", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await revokeSectionAccess("s1", "user-2", TEST_API_BASE);
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/sections/s1/access/user-2`);
    expectFetchMethod(fetchMock, 0, "DELETE");
  });
});
