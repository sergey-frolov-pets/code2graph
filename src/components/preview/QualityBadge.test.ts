// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import QualityBadge from "@/components/preview/QualityBadge.vue";
import type { QualityReport } from "@/services/export/quality/types";

function report(overrides: Partial<QualityReport> = {}): QualityReport {
  return {
    passed: true,
    score: "6/6",
    warnings: 0,
    checks: [
      { id: "duplicate-ids", status: "pass", count: 0, message: "", messageKey: "export.quality.duplicateIds" },
      { id: "contrast", status: "pass", count: 0, message: "", messageKey: "export.quality.contrast" },
      { id: "clipping", status: "pass", count: 0, message: "", messageKey: "export.quality.clipping" },
      { id: "overlap", status: "pass", count: 0, message: "", messageKey: "export.quality.overlap" },
      { id: "edge-crossing", status: "pass", count: 0, message: "", messageKey: "export.quality.edgeCrossing" },
      { id: "label-distance", status: "pass", count: 0, message: "", messageKey: "export.quality.labelDistance" },
    ],
    ...overrides,
  };
}

function mount(value: QualityReport | null) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp({
    setup() {
      return () => h(QualityBadge, { report: value });
    },
  });
  app.mount(host);
  return {
    host,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("QualityBadge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("рисует счёт и открывает список проверок по клику", async () => {
    const view = mount(report());
    await nextTick();

    const button = view.host.querySelector<HTMLButtonElement>('[data-testid="preview-quality-badge"]');
    expect(button?.textContent).toContain("6/6");
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    button?.click();
    await nextTick();

    const panel = view.host.querySelector('[role="dialog"]');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain("All checks passed");
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    view.unmount();
  });

  it("показывает предупреждение с числом нарушений", async () => {
    const value = report({
      passed: false,
      score: "5/6",
      warnings: 1,
      checks: report().checks.map((check) =>
        check.id === "contrast" ? { ...check, status: "warn" as const, count: 2 } : check,
      ),
    });
    const view = mount(value);
    await nextTick();

    expect(view.host.querySelector(".quality-badge--warn")).not.toBeNull();

    view.host.querySelector<HTMLButtonElement>('[data-testid="preview-quality-badge"]')?.click();
    await nextTick();

    const panel = view.host.querySelector('[role="dialog"]');
    expect(panel?.textContent).toContain("Warnings: 1");
    expect(panel?.textContent).toContain("Low contrast labels: 2");
    view.unmount();
  });

  it("битый SVG — сообщение об ошибке вместо счёта", async () => {
    const view = mount(report({ passed: false, score: "0/6", checks: [], error: "invalid-svg" }));
    await nextTick();

    expect(view.host.querySelector(".quality-badge--fail")).not.toBeNull();

    view.host.querySelector<HTMLButtonElement>('[data-testid="preview-quality-badge"]')?.click();
    await nextTick();

    expect(view.host.querySelector('[role="dialog"]')?.textContent).toContain(
      "SVG could not be parsed",
    );
    view.unmount();
  });

  it("Esc закрывает панель", async () => {
    const view = mount(report());
    await nextTick();

    const button = view.host.querySelector<HTMLButtonElement>('[data-testid="preview-quality-badge"]');
    button?.click();
    await nextTick();
    expect(view.host.querySelector('[role="dialog"]')).not.toBeNull();

    const root = view.host.querySelector<HTMLElement>(".quality-badge");
    root?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();

    expect(view.host.querySelector('[role="dialog"]')).toBeNull();
    view.unmount();
  });
});
