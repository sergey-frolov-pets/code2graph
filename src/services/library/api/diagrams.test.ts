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
  createDiagram,
  deleteDiagram,
  fetchDiagram,
  fetchDiagrams,
  uploadDiagramFile,
} from "./diagrams";

describe("library api diagrams", () => {
  beforeEach(() => {
    vi.mocked(getLibraryApiBaseUrl).mockReturnValue(TEST_API_BASE);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds diagram list query string", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ diagrams: [], total: 0 }));

    await fetchDiagrams(
      { q: "api", sectionId: "sec-1", sortBy: "rating", minRating: 3 },
      TEST_API_BASE,
    );

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/diagrams?");
    expect(url).toContain("q=api");
    expect(url).toContain("sectionId=sec-1");
    expect(url).toContain("sortBy=rating");
    expect(url).toContain("minRating=3");
  });

  it("fetches single diagram", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d1", title: "Flow" }));

    const diagram = await fetchDiagram("d1", TEST_API_BASE);
    expect(diagram.id).toBe("d1");
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/diagrams/d1`);
  });

  it("creates diagram via POST JSON", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d2" }));

    await createDiagram(
      {
        title: "New",
        description: "",
        tags: [],
        language: "plantuml",
        sectionId: null,
        source: "@startuml\n@enduml",
        fileName: "diagram.puml",
      },
      TEST_API_BASE,
    );
    expectFetchMethod(fetchMock, 0, "POST");
    const body = (fetchMock.mock.calls[0]?.[1] as RequestInit).body;
    expect(String(body)).toContain('"title":"New"');
  });

  it("uploads diagram file as multipart form data", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "d3" }));

    const file = new File(["@startuml\n@enduml"], "flow.puml", {
      type: "text/plain",
    });
    await uploadDiagramFile(file, { title: "Upload" }, TEST_API_BASE);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBe(file);
    expect((init.body as FormData).get("title")).toBe("Upload");
  });

  it("deletes diagram", async () => {
    const fetchMock = createFetchMock();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await deleteDiagram("d1", TEST_API_BASE);
    expectFetchMethod(fetchMock, 0, "DELETE");
    expectFetchUrl(fetchMock, 0, `${TEST_API_BASE}/diagrams/d1`);
  });
});
