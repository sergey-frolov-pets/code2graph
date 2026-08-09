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
  createSubscription,
  deleteSubscription,
  fetchSubscriptionAccessDiagramPreview,
  fetchSubscriptions,
  grantSubscription,
} from "./subscriptions";

describe("library api subscriptions", () => {
  beforeEach(() => {
    vi.mocked(getLibraryApiBaseUrl).mockReturnValue(TEST_API_BASE);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches subscriptions", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ subscriptions: [] }));

    const result = await fetchSubscriptions(TEST_API_BASE);
    expect(result.subscriptions).toEqual([]);
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/subscriptions`);
  });

  it("creates subscription", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ subscription: { id: "sub-1", title: "Pro" } }),
    );

    await createSubscription(
      {
        title: "Pro",
        description: "",
        permission: "view",
        sections: [],
      },
      TEST_API_BASE,
    );
    expectFetchMethod(fetchMock, 0, "POST");
  });

  it("deletes subscription", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await deleteSubscription("sub-1", TEST_API_BASE);
    expectFetchMethod(fetchMock, 0, "DELETE");
  });

  it("grants subscription to user", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await grantSubscription("sub-1", { username: "bob" }, TEST_API_BASE);
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/subscriptions/sub-1/grants`);
    expectFetchMethod(fetchMock, 0, "POST");
  });

  it("fetches subscription diagram preview via access token", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        subscription: { id: "sub-1", title: "Pro" },
        diagram: { id: "diag-1", title: "Flow", source: "@startuml\nA\n@enduml" },
        watermarkedPreview: true,
        canDownload: false,
        readOnly: true,
      }),
    );

    const result = await fetchSubscriptionAccessDiagramPreview(
      "share-token",
      "diag-1",
      TEST_API_BASE,
    );
    expect(result.diagram.source).toContain("@startuml");
    expectFetchUrl(
      fetchMock,
      0,
      `${TEST_API_BASE}/subscriptions/access/share-token/diagrams/diag-1/preview`,
    );
  });
});
