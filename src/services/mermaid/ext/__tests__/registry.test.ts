import { describe, expect, it } from "vitest";
import { detectType, firstMeaningfulLine, listTypes } from "../registry";

describe("detectType", () => {
  it("распознаёт все 11 канонических типов", () => {
    expect(detectType("waterfall\n=10 : A")).toBe("waterfall");
    expect(detectType('bubble\nx "X" 0 --> 1')).toBe("bubble");
    expect(detectType("heatmap\nx A, B")).toBe("heatmap");
    expect(detectType("orgchart\nA -> B")).toBe("orgchart");
    expect(detectType("powermap\nA -> B")).toBe("powermap");
    expect(detectType("ev\ndays 1, 2")).toBe("ev");
    expect(detectType("boxplot\nA : 10, 20, 30, 40, 50")).toBe("boxplot");
    expect(detectType("treemap\nA : 40")).toBe("treemap");
    expect(detectType("radar\naxes A, B, C\nS : 1, 2, 3")).toBe("radar");
    expect(detectType("voronoi\nA : x=10, y=20")).toBe("voronoi");
    expect(detectType("series\ncategories A, B\nS : 10, 20")).toBe("series");
  });

  it("понимает алиасы", () => {
    expect(detectType("waterfall-variance")).toBe("waterfall");
    expect(detectType("waterfall-multi")).toBe("waterfall");
    expect(detectType("waterfall-scenario")).toBe("waterfall");
    expect(detectType("bubblechart")).toBe("bubble");
    expect(detectType("heat-map")).toBe("heatmap");
    expect(detectType("org")).toBe("orgchart");
    expect(detectType("power-map")).toBe("powermap");
    expect(detectType("power")).toBe("powermap");
    expect(detectType("evchart")).toBe("ev");
    expect(detectType("box-plot")).toBe("boxplot");
    expect(detectType("box")).toBe("boxplot");
    expect(detectType("tree-map")).toBe("treemap");
    expect(detectType("radarchart")).toBe("radar");
    expect(detectType("spider")).toBe("radar");
    expect(detectType("voronoi-diagram")).toBe("voronoi");
    expect(detectType("series:")).toBe("series");
    expect(detectType("clustered\ncategories A, B")).toBeNull();
    expect(detectType("clustered-bar")).toBeNull();
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
    expect(detectType("powerpoint")).toBeNull();
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
  it("перечисляет ровно 11 типов", () => {
    const types = listTypes();
    expect(types).toHaveLength(11);
    expect(new Set(types)).toEqual(
      new Set([
        "waterfall",
        "bubble",
        "heatmap",
        "orgchart",
        "powermap",
        "ev",
        "boxplot",
        "treemap",
        "radar",
        "voronoi",
        "series",
      ]),
    );
  });
});
