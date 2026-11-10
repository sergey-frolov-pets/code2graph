import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import { fetchPublicLibraryLink } from "@/services/library/api/library-links";
import { loadWizardServerFavorite } from "@/services/wizard/load-wizard-server-favorite";

vi.mock("@/config/library-api", () => ({
  getLibraryApiBaseUrl: vi.fn(),
}));

vi.mock("@/services/library/api/library-links", () => ({
  fetchPublicLibraryLink: vi.fn(),
}));

const apiUrl = vi.mocked(getLibraryApiBaseUrl);
const fetchLink = vi.mocked(fetchPublicLibraryLink);

describe("loadWizardServerFavorite", () => {
  beforeEach(() => {
    apiUrl.mockReset();
    fetchLink.mockReset();
    apiUrl.mockReturnValue("https://library.example");
  });

  it("returns the editor source for a public link", async () => {
    fetchLink.mockResolvedValue({
      delivery: "editor",
      dataAccess: "online",
      diagram: {
        id: "diagram-1",
        title: " Roadmap ",
        language: "plantuml",
        fileName: "roadmap.puml",
        source: "@startuml\nAlice -> Bob\n@enduml",
      },
    });

    await expect(loadWizardServerFavorite("ivan", "roadmap")).resolves.toEqual({
      ok: true,
      title: "Roadmap",
      source: "@startuml\nAlice -> Bob\n@enduml",
      format: "plantuml",
    });
  });

  it("refuses a view-only link", async () => {
    fetchLink.mockResolvedValue({
      delivery: "view",
      svg: "<svg></svg>",
    });

    await expect(loadWizardServerFavorite("ivan", "roadmap")).resolves.toEqual({
      ok: false,
      reason: "viewOnly",
    });
  });

  it("reports a missing server and a failed request", async () => {
    apiUrl.mockReturnValue("");
    await expect(loadWizardServerFavorite("ivan", "roadmap")).resolves.toEqual({
      ok: false,
      reason: "noApi",
    });
    expect(fetchLink).not.toHaveBeenCalled();

    apiUrl.mockReturnValue("https://library.example");
    fetchLink.mockRejectedValue(new Error("offline"));
    await expect(loadWizardServerFavorite("ivan", "roadmap")).resolves.toEqual({
      ok: false,
      reason: "fetch",
    });
  });
});
