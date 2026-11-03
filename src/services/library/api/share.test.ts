import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { LibraryApiError, resolveShareApiBaseUrl } from "./client";
import {
  createDiagramShareLink,
  fetchShareResource,
} from "./share";

describe("library api share", () => {
  beforeEach(() => {
    vi.mocked(getLibraryApiBaseUrl).mockReturnValue(TEST_API_BASE);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates diagram share link", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ link: { token: "abc" } }));

    const result = await createDiagramShareLink("d1", { permanent: true }, TEST_API_BASE);
    expect(result.link.token).toBe("abc");
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/diagrams/d1/share`);
  });

  it("fetches share resource from share base URL", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ resourceType: "diagram", readOnly: true }),
    );

    const result = await fetchShareResource("tok", TEST_API_BASE);
    expect(result.resourceType).toBe("diagram");
    expectFetchUrl(
      fetchMock,
      0,
      `${resolveShareApiBaseUrl(TEST_API_BASE)}/tok`,
    );
  });

  it("throws LibraryApiError when share fetch fails", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Expired" }, 410));

    await expect(fetchShareResource("bad", TEST_API_BASE)).rejects.toBeInstanceOf(
      LibraryApiError,
    );
  });
});
