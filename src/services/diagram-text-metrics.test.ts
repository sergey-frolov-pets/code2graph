import { describe, expect, it } from "vitest";
import {
  canvasTextMetrics,
  estimateElementTextBox,
  estimateTextWidthPx,
  parseCanvasFont,
} from "@/services/diagram-text-metrics";

describe("diagram text metrics", () => {
  it("reads size and weight from a canvas font", () => {
    expect(parseCanvasFont("bold 14px sans-serif")).toEqual({
      sizePx: 14,
      bold: true,
    });
    expect(parseCanvasFont("12px Verdana").bold).toBe(false);
  });

  it("makes a real label much wider than a constant 12px stub", () => {
    const width = estimateTextWidthPx("Ввести PlantUML код", 12, false);
    expect(width).toBeGreaterThan(80);
    expect(estimateTextWidthPx("привет", 12)).toBeGreaterThan(
      estimateTextWidthPx("privet", 12),
    );
  });

  it("returns canvas metrics with a height for the current font", () => {
    const metrics = canvasTextMetrics("Animal", "bold 16px sans-serif");
    expect(metrics.width).toBeGreaterThan(estimateTextWidthPx("Animal", 16, false));
    expect(metrics.actualBoundingBoxAscent).toBeGreaterThan(0);
    expect(metrics.width).not.toBe(12);
  });

  it("sizes an svg text node from its font-size", () => {
    const text = {
      textContent: "Ввести PlantUML код",
      style: {},
      parentElement: null,
      getAttribute: (name: string) => (name === "font-size" ? "12" : null),
    } as unknown as Element;
    const box = estimateElementTextBox(text);
    expect(box.width).toBeGreaterThan(80);
    expect(box.height).toBeCloseTo(14.4, 5);
  });
});
