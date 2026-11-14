import { beforeEach, describe, expect, it, vi } from "vitest";

const readPermittedFile = vi.fn();

vi.mock("@/services/local-data-link/file-access", () => ({
  readPermittedFile: (...args: unknown[]) => readPermittedFile(...args),
}));

vi.mock("@/services/local-data-link/read-spreadsheet", () => ({
  readSpreadsheetFileToTsv: vi.fn(async () => "a\tb"),
}));

vi.mock("@/services/table-paste", () => ({
  applyTableFromClipboardText: vi.fn(
    ({ source }: { source: string }) => ({ ok: true, fullSource: `${source}\n%% refreshed` }),
  ),
}));

vi.mock("@/storage/local-data-links", () => ({
  getLocalDataLink: vi.fn(async (id: string) => ({
    diagramId: id,
    fileName: "shared.csv",
    fileHandle: { name: "shared.csv" },
    sheetRange: "",
    untilEmptyRow: false,
  })),
  isActiveLocalDataLink: () => true,
}));

vi.mock("@/storage/diagram-store", () => ({
  loadDiagramDetailFromCache: vi.fn(async (id: string) => ({
    id,
    title: "nested",
    source: DASHBOARD,
    fileName: "dashboard.mmd",
    language: "mermaid",
    description: "",
    tags: [],
    sectionId: null,
    visibility: "private",
    createdAt: "",
    updatedAt: "",
  })),
}));

const DASHBOARD = `dashboard
size 1280x720
zone 0 0 1 1 diagram "self"
`;

const CONTEXT = {
  layout: "elk" as const,
  diagramDarkMode: false,
  renderMode: "offline" as const,
};

describe("dashboard refresh", () => {
  beforeEach(() => {
    readPermittedFile.mockReset();
    readPermittedFile.mockResolvedValue(new File(["a"], "shared.csv"));
  });

  it("читает один файл один раз на несколько зон", async () => {
    const { refreshDashboardZoneSources } = await import("@/services/dashboard/refresh");
    const result = await refreshDashboardZoneSources([
      { id: "a", source: "infographic\nvalue 1", fileName: "a.mmd", language: "mermaid" },
      { id: "b", source: "infographic\nvalue 2", fileName: "b.mmd", language: "mermaid" },
    ]);
    expect(readPermittedFile).toHaveBeenCalledTimes(1);
    expect(result.sources.get("a")).toContain("%% refreshed");
    expect(result.sources.get("b")).toContain("%% refreshed");
    expect(result.missingDiagramIds).toEqual([]);
  });
});

describe("dashboard cycle", () => {
  it("обрывает вложенный дашборд с тем же исходником", async () => {
    const { renderDiagram } = await import("@/formats");
    const { composeDashboardSvg } = await import("@/services/dashboard/compose");
    const svg = await composeDashboardSvg(DASHBOARD, CONTEXT);
    expect(svg).toContain('data-diagram="self"');
    expect(svg?.startsWith("<svg")).toBe(true);
    expect(renderDiagram).toBeTypeOf("function");
  });
});
