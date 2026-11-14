import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchPublicLibraryLink = vi.fn();
const renderDiagram = vi.fn();

vi.mock("@/config/library-api", () => ({
  getLibraryApiBaseUrl: () => "https://library.example",
}));

vi.mock("@/services/library/api/library-links", () => ({
  fetchPublicLibraryLink: (...args: unknown[]) => fetchPublicLibraryLink(...args),
}));

vi.mock("@/formats", () => ({
  renderDiagram: (...args: unknown[]) => renderDiagram(...args),
}));

vi.mock("@/storage/diagram-store", () => ({
  loadDiagramDetailFromCache: vi.fn(async () => null),
}));

const CONTEXT = {
  layout: "elk" as const,
  diagramDarkMode: true,
  renderMode: "offline" as const,
};

describe("dashboard link cells", () => {
  beforeEach(() => {
    fetchPublicLibraryLink.mockReset();
    renderDiagram.mockReset();
  });

  it("кладёт снимок публичной ссылки в ячейку", async () => {
    fetchPublicLibraryLink.mockResolvedValue({
      delivery: "view",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" data-shot="1"/></svg>`,
    });
    const { composeDashboardSvg } = await import("@/services/dashboard/compose");
    const svg = await composeDashboardSvg(
      `dashboard\ncell 0 0 link "alice/weekly"\n`,
      CONTEXT,
    );
    expect(fetchPublicLibraryLink).toHaveBeenCalledWith("alice", "weekly", "https://library.example");
    expect(svg).toContain('data-cell="link"');
    expect(svg).toContain('data-shot="1"');
    expect(renderDiagram).not.toHaveBeenCalled();
  });
});
