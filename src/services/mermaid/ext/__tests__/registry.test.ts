import { describe, expect, it } from "vitest";
import { detectType, firstMeaningfulLine, listTypes } from "../registry";

describe("detectType", () => {
  it("распознаёт все 5 канонических типов", () => {
    expect(detectType("waterfall\n=10 : A")).toBe("waterfall");
    expect(detectType('bubble\nx "X" 0 --> 1')).toBe("bubble");
    expect(detectType("heatmap\nx A, B")).toBe("heatmap");
    expect(detectType("orgchart\nA -> B")).toBe("orgchart");
    expect(detectType("ev\ndays 1, 2")).toBe("ev");
  });

  it("понимает алиасы", () => {
    expect(detectType("waterfall-variance")).toBe("waterfall");
    expect(detectType("waterfall-multi")).toBe("waterfall");
    expect(detectType("waterfall-scenario")).toBe("waterfall");
    expect(detectType("bubblechart")).toBe("bubble");
    expect(detectType("heat-map")).toBe("heatmap");
    expect(detectType("org")).toBe("orgchart");
    expect(detectType("evchart")).toBe("ev");
  });

  it("регистр не важен", () => {
    expect(detectType("WaterFall")).toBe("waterfall");
    expect(detectType("HEATMAP")).toBe("heatmap");
  });

  it("пропускает пустые строки и комментарии", () => {
    expect(detectType("\n\n%% комментарий\n  waterfall  \n=1 : A")).toBe("waterfall");
  });

  it("понимает ключевое слово через двоеточие", () => {
    expect(detectType("waterfall:")).toBe("waterfall");
    expect(detectType("heatmap:")).toBe("heatmap");
  });

  it("возвращает null для штатного Mermaid", () => {
    expect(detectType("graph TD\nA-->B")).toBeNull();
    expect(detectType("sequenceDiagram\nA->>B: hi")).toBeNull();
    expect(detectType("flowchart LR\nA-->B")).toBeNull();
    expect(detectType("")).toBeNull();
    expect(detectType("%% только комментарий")).toBeNull();
  });

  it("не путает похожие слова", () => {
    expect(detectType("waterfallish")).toBeNull();
    expect(detectType("evolve")).toBeNull();
    expect(detectType("organization")).toBeNull();
  });
});

describe("firstMeaningfulLine", () => {
  it("возвращает первую значимую строку", () => {
    expect(firstMeaningfulLine("\n%% x\n  bubble  \n")).toBe("bubble");
  });
  it("возвращает пустую строку, если значимых нет", () => {
    expect(firstMeaningfulLine("\n\n%% a\n%% b")).toBe("");
  });
});

describe("listTypes", () => {
  it("перечисляет ровно 5 типов", () => {
    const types = listTypes();
    expect(types).toHaveLength(5);
    expect(new Set(types)).toEqual(
      new Set(["waterfall", "bubble", "heatmap", "orgchart", "ev"]),
    );
  });
});
