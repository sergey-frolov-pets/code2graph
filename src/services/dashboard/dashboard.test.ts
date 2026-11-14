import { describe, expect, it } from "vitest";
import { dashboardCacheFresh } from "@/services/dashboard/cache";
import { dashboardEmbedDocument } from "@/services/dashboard/embed-url";
import { arrangeDashboardZones, placeDashboardZone } from "@/services/dashboard/layout";
import { parseDashboard } from "@/services/mermaid/ext/engines/dashboard";

describe("dashboard cache", () => {
  it("показывает сохранённый SVG, пока период не прошёл", () => {
    const now = 1_000_000;
    const entry = { svg: "<svg></svg>", at: now - 60_000 };
    expect(dashboardCacheFresh(entry, 5 * 60_000, now)).toBe(true);
    expect(dashboardCacheFresh(entry, 30_000, now)).toBe(false);
    expect(dashboardCacheFresh(entry, null, now)).toBe(false);
    expect(dashboardCacheFresh(null, 60_000, now)).toBe(false);
  });
});

describe("dashboard layout", () => {
  it("кладёт новую зону в свободное место", () => {
    const first = placeDashboardZone([], "a");
    const second = placeDashboardZone([first], "b");
    expect(first).toEqual({ x: 0, y: 0, w: 0.5, h: 0.5, diagramId: "a" });
    expect(second.x).toBeGreaterThanOrEqual(0.5);
    expect(second.diagramId).toBe("b");
  });

  it("раскладывает зоны колонками и сеткой на весь холст", () => {
    const columns = arrangeDashboardZones(["a", "b"], "columns");
    expect(columns[0]).toMatchObject({ x: 0, y: 0, h: 1, diagramId: "a" });
    expect(columns[1].x + columns[1].w).toBeCloseTo(1);
    const grid = arrangeDashboardZones(["a", "b", "c", "d"], "grid");
    expect(grid).toHaveLength(4);
    expect(grid[3].x + grid[3].w).toBeCloseTo(1);
    expect(grid[3].y + grid[3].h).toBeCloseTo(1);
  });

  it("разбор refresh 5m равен пяти минутам", () => {
    const parsed = parseDashboard("dashboard\nrefresh 5m\nzone 0 0 1 1 diagram a");
    expect(parsed.ok).toBe(true);
    expect(parsed.value?.refreshMs).toBe(300_000);
  });
});

describe("dashboard embed html", () => {
  it("сохраняет страницу с iframe для проверки", () => {
    const html = dashboardEmbedDocument("https://app.example/#/embed/local/1", "Выручка");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('href="https://app.example/#/embed/local/1"');
    expect(html).toContain('<iframe src="https://app.example/#/embed/local/1"');
    expect(html).toContain("100dvh");
    expect(html).toContain("Выручка");
    expect(html).toContain("height:100%");
  });
});
