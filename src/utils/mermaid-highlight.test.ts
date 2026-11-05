import { describe, expect, it } from "vitest";
import { highlightMermaidLine } from "@/utils/mermaid-highlight";

describe("highlightMermaidLine", () => {
  it("highlights diagram declaration and arrows", () => {
    const tokens = highlightMermaidLine("flowchart TD");
    expect(tokens.some((token) => token.type === "directive" && token.text === "flowchart")).toBe(true);
    expect(tokens.some((token) => token.type === "keyword" && token.text === "TD")).toBe(true);
  });

  it("highlights comments", () => {
    const tokens = highlightMermaidLine("%% comment");
    expect(tokens).toEqual([{ type: "comment", text: "%% comment" }]);
  });

  it("highlights arrows and colors", () => {
    const tokens = highlightMermaidLine('A --> B : link');
    expect(tokens.some((token) => token.type === "arrow" && token.text === "-->")).toBe(true);
  });

  it("highlights strings", () => {
    const tokens = highlightMermaidLine('participant App as "Web App"');
    expect(tokens.some((token) => token.type === "string" && token.text === '"Web App"')).toBe(true);
  });

  it("highlights directives of every diagram family", () => {
    const lines = [
      "flowchart TD",
      "sequenceDiagram",
      "classDiagram-v2",
      "stateDiagram-v2",
      "erDiagram",
      "gantt",
      "pie showData",
      "journey",
      "gitGraph",
      "mindmap",
      "timeline",
      "sankey-beta",
      "xychart-beta horizontal",
      "block-beta",
      "C4Component",
      "requirementDiagram",
      "quadrantChart",
      "architecture-beta",
      "packet-beta",
      "waterfall",
      "bubble",
      "heatmap",
      "orgchart",
      "ev",
      "boxplot",
      "treemap",
      "radar",
      "voronoi",
      "clustered",
      "spider",
      "kanban",
    ];

    for (const line of lines) {
      const head = line.split(/\s+/)[0] ?? "";
      const tokens = highlightMermaidLine(line);
      expect(
        tokens.some((token) => token.type === "directive" && token.text === head),
        line,
      ).toBe(true);
    }
  });

  it("highlights chart keywords that used to stay plain", () => {
    const cases: Array<[string, string]> = [
      ["stacked", "stacked"],
      ["bars stacked", "bars"],
      ["layout stacked", "layout"],
      ["dateFormat YYYY-MM-DD", "dateFormat"],
      ["axisFormat %d.%m", "axisFormat"],
      ["accTitle: Shares", "accTitle"],
      ["functionalRequirement orderReq {", "functionalRequirement"],
      ["break 300 --> 800", "break"],
      ["connectors off", "connectors"],
      ["mono invert", "invert"],
      ["days Пн, Вт", "days"],
      ["pv 10, 20", "pv"],
      ["x \"цена\" 0 --> 100", "x"],
      ["y \"объём\" 0 --> 100", "y"],
      ["quadrants on", "quadrants"],
      ["Person(user, \"User\")", "Person"],
      ["Container_Boundary(api, \"API\") {", "Container_Boundary"],
      ["service api(server)[\"API\"] in core", "in"],
      ["labels inside", "inside"],
      ["colors total=#0969da increase=#2da44e", "increase"],
      ["id: 1", "id"],
      ["text: requirement", "text"],
      ["risk: high", "risk"],
      ["outlier=#cf222e", "outlier"],
    ];

    for (const [line, word] of cases) {
      const tokens = highlightMermaidLine(line);
      expect(
        tokens.some(
          (token) =>
            token.text === word &&
            (token.type === "keyword" || token.type === "directive"),
        ),
        `${word} in ${line}`,
      ).toBe(true);
    }
  });
});
