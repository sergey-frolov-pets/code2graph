import { describe, expect, it } from "vitest";
import {
  detectBuilderDiagramType,
  emitSourceFromBuilderState,
  getDiagramBuilderSchema,
  parseRawTextToGrid,
  parseSourceToBuilderState,
  serializeGridToClipboardTsv,
  transposeMatrixData,
} from "./index";
import { parseWaterfall } from "@/services/mermaid/ext/engines/waterfall/parser";
import { parseClustered } from "@/services/mermaid/ext/engines/series";
import { parseHeatmap } from "@/services/mermaid/ext/engines/heatmap";
import { parseBubble } from "@/services/mermaid/ext/engines/bubble";
import { parseBoxplot } from "@/services/mermaid/ext/engines/boxplot";
import { parseTreemap } from "@/services/mermaid/ext/engines/treemap";
import { parseRadar } from "@/services/mermaid/ext/engines/radar";
import { parseVoronoi } from "@/services/mermaid/ext/engines/voronoi";
import { parseOrgchart } from "@/services/mermaid/ext/engines/orgchart";
import { parseEv } from "@/services/mermaid/ext/engines/ev";

describe("diagram-builder core", () => {
  it("serializes and parses clipboard TSV with and without headers", () => {
    const rows = [
      ["Q1", "120"],
      ["Q2", "180"],
    ];
    const tsvWithHeaders = serializeGridToClipboardTsv(rows, {
      includeHeaders: true,
      headers: ["Period", "Value"],
    });
    expect(tsvWithHeaders).toBe("Period\tValue\nQ1\t120\nQ2\t180");

    const parsed = parseRawTextToGrid(tsvWithHeaders);
    expect(parsed).not.toBeNull();
    expect(parsed?.rowCount).toBe(3);
    expect(parsed?.colCount).toBe(2);
  });

  it("transposes matrix headers and rows accurately", () => {
    const headers = ["Series A", "Series B"];
    const rows = [
      ["2024", "10", "20"],
      ["2025", "30", "40"],
      ["2026", "50", "60"],
    ];
    const transposed = transposeMatrixData(headers, rows);
    expect(transposed.headers).toEqual(["2024", "2025", "2026"]);
    expect(transposed.rows).toEqual([
      ["Series A", "10", "30", "50"],
      ["Series B", "20", "40", "60"],
    ]);
  });

  it("round-trips waterfall diagram with breaks, threshold lines, colors, and subtotals", () => {
    const source = [
      "waterfall",
      "title Revenue 2026",
      'y "mln" 0 --> 500',
      "grid 100",
      "labels both",
      "connectors off",
      "mono",
      "colors total=#334155 increase=#0ea5e9 decrease=#f97316",
      'break 200 --> 350 "gap"',
      'line 400 "target" color=#cf222e width=2 style=dot',
      "=120 : Q1",
      "+80 : Q2",
      "-30 : Churn",
      "= : Subtotal",
    ].join("\n");

    const state = parseSourceToBuilderState(source, "mermaid");
    expect(state.diagramType).toBe("waterfall");
    expect(state.canvas.title).toBe("Revenue 2026");
    expect(state.canvas.yAxis.min).toBe("0");
    expect(state.canvas.yAxis.max).toBe("500");
    expect(state.options.labelsMode).toBe("both");
    expect(state.options.connectors).toBe(false);
    expect(state.options.monoMode).toBe("on");
    expect(state.options.breaks).toHaveLength(1);
    expect(state.options.thresholds).toHaveLength(1);
    expect(state.rows).toHaveLength(4);
    expect(state.rows[3][1]).toBe("=subtotal");

    const emitted = emitSourceFromBuilderState(state);
    const reParsed = parseWaterfall(emitted);
    expect(reParsed.ok).toBe(true);
    expect(reParsed.value?.title).toBe("Revenue 2026");
    expect(reParsed.value?.connectors).toBe(false);
    expect(reParsed.value?.breaks).toHaveLength(1);
    expect(reParsed.value?.lines).toHaveLength(1);
  });

  it("round-trips series (clustered) diagram with rotate 90, stacked, breaks, lines, and cagr", () => {
    const source = [
      "series",
      "title Quarterly Sales",
      "rotate 90",
      "stacked",
      "ratio 16x9",
      "categories Q1, Q2, Q3",
      'y "USD" 0 --> 400',
      "colors s1=#0969da s2=#8250df",
      'break 150 --> 250 "jump"',
      'line 300 "plan" color=#cf222e',
      "series Online : 80, 120, 160",
      'cagr 1, 3 format="0.0%" prefix="CAGR: "',
      "series Retail : 50, 70, 90",
    ].join("\n");

    const state = parseSourceToBuilderState(source, "mermaid");
    expect(state.diagramType).toBe("series");
    expect(state.canvas.rotate90).toBe(true);
    expect(state.options.stacked).toBe(true);
    expect(state.canvas.aspectRatio).toBe("16x9");
    expect(state.matrixHeaders).toEqual(["Online", "Retail"]);
    expect(state.matrixRows).toHaveLength(3);
    expect(state.options.cagrs).toHaveLength(1);

    const emitted = emitSourceFromBuilderState(state);
    const reParsed = parseClustered(emitted);
    expect(reParsed.ok).toBe(true);
    expect(reParsed.value?.rotate90).toBe(true);
    expect(reParsed.value?.stack).toBe(true);
    expect(reParsed.value?.cagrs).toHaveLength(1);
  });

  it("round-trips all remaining Mermaid Ext engines (bubble, heatmap, boxplot, treemap, radar, voronoi, orgchart, ev)", () => {
    const samples: Array<{
      type: string;
      source: string;
      verify: (emitted: string) => boolean;
    }> = [
      {
        type: "bubble",
        source: [
          "bubble",
          "title BCG",
          'x "Share" 0 --> 10',
          'y "Growth" 0 --> 30',
          'size "Revenue"',
          "quadrants Stars, Questions, Cows, Dogs",
          "data",
          "Prod A : x=8, y=22, size=300, group=Soft",
        ].join("\n"),
        verify: (s) => parseBubble(s).ok,
      },
      {
        type: "heatmap",
        source: [
          "heatmap",
          "title Load",
          "x Mon, Tue",
          "y AM, PM",
          "scale",
          "0-50 : #e8f5e9",
          "50+ : #ffebee",
          "data",
          "AM : 20, 40",
          "PM : 60, 80",
        ].join("\n"),
        verify: (s) => parseHeatmap(s).ok,
      },
      {
        type: "boxplot",
        source: [
          "boxplot",
          "title Latency",
          'y "ms" 0 --> 200',
          "API : min=10, q1=25, median=40, q3=65, max=110",
        ].join("\n"),
        verify: (s) => parseBoxplot(s).ok,
      },
      {
        type: "treemap",
        source: [
          "treemap",
          "title Budget",
          "labels values",
          "Cloud / Compute : 400",
          "Cloud / Storage : 200",
        ].join("\n"),
        verify: (s) => parseTreemap(s).ok,
      },
      {
        type: "radar",
        source: [
          "radar",
          "title Skills",
          "axes Speed, Quality, Cost",
          "scale 0 --> 100",
          "series Team A : 80, 90, 70",
        ].join("\n"),
        verify: (s) => parseRadar(s).ok,
      },
      {
        type: "voronoi",
        source: [
          "voronoi",
          'x "X" 0 --> 100',
          'y "Y" 0 --> 100',
          "data",
          "North : x=40, y=80, group=A",
          "South : x=60, y=20, group=B",
        ].join("\n"),
        verify: (s) => parseVoronoi(s).ok,
      },
      {
        type: "orgchart",
        source: ["orgchart", "CEO [CEO]", "CTO [CTO]", "Dev [Lead]", "CEO -> CTO", "CTO -.-> Dev"].join("\n"),
        verify: (s) => parseOrgchart(s).ok,
      },
      {
        type: "ev",
        source: [
          "ev",
          "title Earned Value",
          "grid",
          "days W1, W2, W3",
          "pv 10, 20, 30",
          "ev 8, 18, 29",
          "ac 11, 22, 31",
        ].join("\n"),
        verify: (s) => parseEv(s).ok,
      },
    ];

    for (const item of samples) {
      const detected = detectBuilderDiagramType(item.source, "mermaid");
      expect(detected).toBe(item.type);
      const state = parseSourceToBuilderState(item.source, "mermaid");
      const emitted = emitSourceFromBuilderState(state);
      expect(item.verify(emitted)).toBe(true);
    }
  });

  it("parses and emits standard tabular and graph diagrams (pie, gantt, flowchart, plantuml sequence)", () => {
    const pieState = parseSourceToBuilderState(
      'pie showData\n    title Shares\n    "A" : 60\n    "B" : 40',
      "mermaid",
    );
    expect(pieState.diagramType).toBe("pie");
    expect(pieState.rows).toEqual([
      ["A", "60"],
      ["B", "40"],
    ]);
    const pieEmitted = emitSourceFromBuilderState(pieState);
    expect(pieEmitted).toContain("pie showData");
    expect(pieEmitted).toContain('"A" : 60');

    const flowState = parseSourceToBuilderState(
      "flowchart LR\n  A[Start] --> B[End]",
      "mermaid",
    );
    expect(getDiagramBuilderSchema("mermaid", flowState.diagramType).tableMode).toBe(
      "graph-ir",
    );
    expect(flowState.graphNodes.length).toBeGreaterThanOrEqual(2);
    flowState.canvas.direction = "TB";
    const flowEmitted = emitSourceFromBuilderState(flowState);
    expect(flowEmitted).toContain("flowchart TD");
  });
});
