import { describe, expect, it } from "vitest";
import { dashboardCacheFresh } from "@/services/dashboard/cache";
import { dashboardEmbedDocument } from "@/services/dashboard/embed-url";
import {
  bindDashboardCell,
  insertDashboardLine,
  moveDashboardDivider,
  removeDashboardLine,
} from "@/services/dashboard/layout";
import {
  createDashboardBand,
  createDashboardCaption,
  emitDashboard,
  parseDashboard,
  type DashboardModel,
} from "@/services/mermaid/ext/engines/dashboard";

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

function board(): DashboardModel {
  return {
    width: 1280,
    height: 720,
    refreshMs: null,
    title: createDashboardCaption(22, "#ffffff"),
    header: createDashboardBand(16, "#f1f5f9"),
    footer: createDashboardBand(13, "#f8fafc"),
    cols: [1],
    rows: [1],
    cells: [],
  };
}

describe("dashboard layout", () => {
  it("режет холст пополам и сдвигает границу", () => {
    const split = insertDashboardLine(board(), "col", null);
    expect(split?.cols).toEqual([0.5, 0.5]);
    const moved = moveDashboardDivider(split!.cols, 0, 0.25);
    expect(moved[0]).toBeCloseTo(0.25);
    expect(moved[1]).toBeCloseTo(0.75);
    expect(moveDashboardDivider(split!.cols, 0, 0.01)[0]).toBeCloseTo(0.08);
  });

  it("при удалении линии оставляет левую связь", () => {
    const split = insertDashboardLine(board(), "col", null)!;
    const bound = bindDashboardCell(
      bindDashboardCell(split, 0, 0, "diagram", "left"),
      1,
      0,
      "diagram",
      "right",
    );
    const removed = removeDashboardLine(bound, { axis: "col", index: 0 });
    expect(removed?.model.cols).toEqual([1]);
    expect(removed?.model.cells).toEqual([{ col: 0, row: 0, kind: "diagram", ref: "left" }]);
    expect(removed?.dropped).toEqual([{ col: 1, row: 0, kind: "diagram", ref: "right" }]);
  });

  it("разбор refresh 5m равен пяти минутам", () => {
    const parsed = parseDashboard("dashboard\nrefresh 5m\ncell 0 0 diagram a");
    expect(parsed.ok).toBe(true);
    expect(parsed.value?.refreshMs).toBe(300_000);
    const again = parseDashboard(emitDashboard(parsed.value!));
    expect(again.value?.cells[0]).toMatchObject({ kind: "diagram", ref: "a" });
  });
});

describe("dashboard embed html", () => {
  it("сохранённая страница сразу открывает дашборд", () => {
    const html = dashboardEmbedDocument("https://app.example/#/embed/local/1", "Выручка");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('href="https://app.example/#/embed/local/1"');
    expect(html).toContain('http-equiv="refresh"');
    expect(html).toContain('location.replace("https://app.example/#/embed/local/1")');
    expect(html).not.toContain("<iframe");
    expect(html).toContain("Выручка");
  });
});
