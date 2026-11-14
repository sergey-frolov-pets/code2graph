import { describe, expect, it } from "vitest";
import { dashboardCacheFresh } from "@/services/dashboard/cache";
import { placeDashboardZone } from "@/services/dashboard/layout";
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

  it("разбор refresh 5m равен пяти минутам", () => {
    const parsed = parseDashboard("dashboard\nrefresh 5m\nzone 0 0 1 1 diagram a");
    expect(parsed.ok).toBe(true);
    expect(parsed.value?.refreshMs).toBe(300_000);
  });
});
