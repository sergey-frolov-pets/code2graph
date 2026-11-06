// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  createDefaultBuilderState,
  detectBuilderDiagramType,
  emitSourceFromBuilderState,
  getDiagramBuilderSchema,
  hasBuilderOptionsCapabilities,
  parseRawTextToGrid,
  parseSourceToBuilderState,
  serializeGridToClipboardTsv,
  supportsDiagramBuilder,
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
    expect(state.options.cagrs[0]?.seriesIndex).toBe(0);

    state.options.cagrs[0]!.seriesIndex = 1;
    const emitted = emitSourceFromBuilderState(state);
    const onlineAt = emitted.indexOf("series Online");
    const retailAt = emitted.indexOf("series Retail");
    const cagrAt = emitted.indexOf("cagr");
    expect(onlineAt).toBeGreaterThanOrEqual(0);
    expect(retailAt).toBeGreaterThan(onlineAt);
    expect(cagrAt).toBeGreaterThan(retailAt);
    const reParsed = parseClustered(emitted);
    expect(reParsed.ok).toBe(true);
    expect(reParsed.value?.rotate90).toBe(true);
    expect(reParsed.value?.stack).toBe(true);
    expect(reParsed.value?.cagrs).toHaveLength(1);
    expect(reParsed.value?.cagrs[0]?.seriesIndex).toBe(1);
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

  it("supports all 4 graph directions (TB, LR, BT, RL) across Mermaid, PlantUML, D2, Structurizr, and GraphML", () => {
    // 1. Mermaid flowchart: TB, LR, BT, RL
    const mermaidFlow = parseSourceToBuilderState(
      "flowchart RL\n  A[Start] --> B[End]",
      "mermaid",
    );
    expect(mermaidFlow.canvas.direction).toBe("RL");
    expect(emitSourceFromBuilderState(mermaidFlow)).toContain("flowchart RL");
    mermaidFlow.canvas.direction = "BT";
    expect(emitSourceFromBuilderState(mermaidFlow)).toContain("flowchart BT");

    // 2. Mermaid class / state / er / architecture
    const mermaidState = parseSourceToBuilderState(
      "stateDiagram-v2\n  direction BT\n  [*] --> Idle\n  Idle --> Active",
      "mermaid",
    );
    expect(mermaidState.canvas.direction).toBe("BT");
    expect(emitSourceFromBuilderState(mermaidState)).toContain("direction BT");

    const mermaidEr = parseSourceToBuilderState(
      "erDiagram\n  CUSTOMER ||--o{ ORDER : places",
      "mermaid",
    );
    mermaidEr.canvas.direction = "LR";
    expect(emitSourceFromBuilderState(mermaidEr)).toContain("direction LR");

    const mermaidArch = parseSourceToBuilderState(
      "architecture-beta\n  group api(cloud)[API]\n  service web(server)[Web] in api\n  service db(database)[DB] in api\n  web:B --> T:db",
      "mermaid",
    );
    expect(mermaidArch.canvas.direction).toBe("TB");
    mermaidArch.canvas.direction = "RL";
    expect(emitSourceFromBuilderState(mermaidArch)).toContain(":L --> R:");

    // 3. D2: down (TB), right (LR), up (BT), left (RL)
    const d2Arch = parseSourceToBuilderState(
      'direction: left\nweb: "Web"\napi: "API"\nweb -> api',
      "d2",
    );
    expect(d2Arch.canvas.direction).toBe("RL");
    expect(emitSourceFromBuilderState(d2Arch)).toContain("direction: left");
    d2Arch.canvas.direction = "BT";
    expect(emitSourceFromBuilderState(d2Arch)).toContain("direction: up");
    d2Arch.canvas.direction = "LR";
    expect(emitSourceFromBuilderState(d2Arch)).toContain("direction: right");
    d2Arch.canvas.direction = "TB";
    expect(emitSourceFromBuilderState(d2Arch)).toContain("direction: down");

    // 4. Structurizr: autolayout tb, lr, bt, rl
    const dslSource = [
      'workspace "Shop" "Context" {',
      "  model {",
      '    user = person "User"',
      '    shop = softwareSystem "Shop"',
      '    user -> shop "Uses"',
      "  }",
      "  views {",
      '    systemContext shop "Context" {',
      "      include *",
      "      autolayout rl",
      "    }",
      "  }",
      "}",
    ].join("\n");
    const dslState = parseSourceToBuilderState(dslSource, "structurizr");
    expect(dslState.canvas.direction).toBe("RL");
    expect(emitSourceFromBuilderState(dslState)).toContain("autolayout rl");
    dslState.canvas.direction = "BT";
    expect(emitSourceFromBuilderState(dslState)).toContain("autolayout bt");

    // 5. GraphML: rankdir="TB" | "LR" | "BT" | "RL"
    const graphmlSource = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
      '  <graph edgedefault="directed" rankdir="RL">',
      '    <node id="A"/>',
      '    <node id="B"/>',
      '    <edge source="A" target="B"/>',
      "  </graph>",
      "</graphml>",
    ].join("\n");
    const gmlState = parseSourceToBuilderState(graphmlSource, "graphml");
    expect(gmlState.canvas.direction).toBe("RL");
    expect(emitSourceFromBuilderState(gmlState)).toContain('rankdir="RL"');
    gmlState.canvas.direction = "BT";
    expect(emitSourceFromBuilderState(gmlState)).toContain('rankdir="BT"');

    // 6. PlantUML C4, Class, Component, Mindmap
    const pumlC4 = parseSourceToBuilderState(
      '@startuml\n!include ./plantuml-lib/C4/C4_Context.puml\nPerson(u, "User")\nSystem(s, "Sys")\nRel(u, s, "Uses")\n@enduml',
      "plantuml",
    );
    pumlC4.canvas.direction = "LR";
    expect(emitSourceFromBuilderState(pumlC4)).toContain("LAYOUT_LEFT_RIGHT()");
    pumlC4.canvas.direction = "BT";
    expect(emitSourceFromBuilderState(pumlC4)).toContain("Rel_Up(");

    const pumlClass = parseSourceToBuilderState(
      "@startuml\nclass User\nclass Order\nUser --> Order\n@enduml",
      "plantuml",
    );
    pumlClass.canvas.direction = "BT";
    expect(emitSourceFromBuilderState(pumlClass)).toContain("-up->");
    pumlClass.canvas.direction = "RL";
    const emittedRlClass = emitSourceFromBuilderState(pumlClass);
    expect(emittedRlClass).toContain("left to right direction");
    expect(emittedRlClass).toContain("-left->");

    const pumlMindmapSource = "@startmindmap\ntop to bottom direction\n* Root\n** Branch\n@endmindmap";
    const pumlMindmap = parseSourceToBuilderState(pumlMindmapSource, "plantuml");
    expect(getDiagramBuilderSchema("plantuml", "mindmap").capabilities.supportsDirection).toBe(true);
    pumlMindmap.canvas.direction = "LR";
    expect(emitSourceFromBuilderState(pumlMindmap, pumlMindmapSource)).toContain(
      "left to right direction",
    );

    // 7. Sequence diagrams in PlantUML/Mermaid do not expose unsupported direction toggle
    expect(getDiagramBuilderSchema("plantuml", "sequence").capabilities.supportsDirection).toBe(false);
    expect(getDiagramBuilderSchema("mermaid", "sequence").capabilities.supportsDirection).toBe(false);
    expect(getDiagramBuilderSchema("d2", "sequence").capabilities.supportsDirection).toBe(true);
  });

  it("disables step-by-step builder for graphml while supporting all other formats", () => {
    expect(supportsDiagramBuilder("graphml")).toBe(false);
    expect(supportsDiagramBuilder("plantuml")).toBe(true);
    expect(supportsDiagramBuilder("mermaid")).toBe(true);
    expect(supportsDiagramBuilder("d2")).toBe(true);
    expect(supportsDiagramBuilder("structurizr")).toBe(true);
    expect(supportsDiagramBuilder("wiremark")).toBe(true);
  });

  it("creates blank manual builder state from diagram type only without sample values", () => {
    const wfState = createDefaultBuilderState("mermaid", "waterfall");
    expect(wfState.canvas.title).toBe("");
    expect(wfState.rows).toHaveLength(1);
    expect(wfState.rows[0][0]).toBe("");
    expect(wfState.rows[0][1]).toBe("=");
    expect(wfState.rows[0][2]).toBe("");
    expect(wfState.options.breaks).toHaveLength(0);
    expect(wfState.options.thresholds).toHaveLength(0);

    const seriesState = createDefaultBuilderState("mermaid", "series");
    expect(seriesState.matrixHeaders).toEqual(["", ""]);
    expect(seriesState.matrixRows).toEqual([["", "", ""]]);

    const graphState = createDefaultBuilderState("plantuml", "sequence");
    expect(graphState.graphNodes).toHaveLength(0);
    expect(graphState.graphEdges).toEqual([
      { source: "", target: "", kind: "arrow", label: "" },
    ]);

    graphState.graphEdges = [
      { source: "Client", target: "API Gateway", kind: "arrow", label: "POST /orders" },
      { source: "API Gateway", target: "Database", kind: "dashed", label: "INSERT" },
    ];
    const emittedSeq = emitSourceFromBuilderState(graphState);
    expect(emittedSeq).toContain("Client");
    expect(emittedSeq).toContain("API Gateway");
    expect(emittedSeq).toContain("Database");
    expect(emittedSeq).toContain("POST /orders");

    const flowSchema = getDiagramBuilderSchema("mermaid", "flowchart");
    expect(hasBuilderOptionsCapabilities(flowSchema.capabilities)).toBe(false);

    const waterfallSchema = getDiagramBuilderSchema("mermaid", "waterfall");
    expect(hasBuilderOptionsCapabilities(waterfallSchema.capabilities)).toBe(true);
  });

  it("gives Sankey real appearance controls and writes them into the diagram", () => {
    const cap = getDiagramBuilderSchema("mermaid", "sankey").capabilities;
    expect(cap.supportsTitle).toBe(true);
    expect(cap.supportsSankeyStyle).toBe(true);
    expect(cap.supportsDirection).toBe(false);

    const parsed = parseSourceToBuilderState(
      `sankey-beta
Ads,Site,90
Site,"Bounce, no click",40`,
      "mermaid",
    );
    expect(parsed.rows).toEqual([
      ["Ads", "Site", "90"],
      ["Site", "Bounce, no click", "40"],
    ]);

    const plain = emitSourceFromBuilderState(parsed);
    expect(plain.startsWith("sankey-beta")).toBe(true);
    expect(plain).toContain('"Bounce, no click"');
    expect(plain).not.toContain("config:");

    parsed.appearance.sankey.showValues = false;
    parsed.appearance.sankey.nodeAlignment = "left";
    parsed.appearance.sankey.prefix = "$";
    parsed.appearance.sankey.nodeColors = [{ node: "Site", color: "#2e7d32" }];
    const styled = emitSourceFromBuilderState(parsed);
    expect(styled).toContain("showValues: false");
    expect(styled).toContain("nodeAlignment: left");
    expect(styled).toContain('prefix: "$"');
    expect(styled).toContain('Site: "#2e7d32"');
    expect(styled.indexOf("sankey-beta")).toBeGreaterThan(styled.indexOf("config:"));

    const roundTrip = parseSourceToBuilderState(styled, "mermaid");
    expect(roundTrip.appearance.sankey.showValues).toBe(false);
    expect(roundTrip.appearance.sankey.nodeAlignment).toBe("left");
    expect(roundTrip.appearance.sankey.prefix).toBe("$");
    expect(roundTrip.appearance.sankey.nodeColors).toEqual([{ node: "Site", color: "#2e7d32" }]);
    expect(roundTrip.rows[1]).toEqual(["Site", "Bounce, no click", "40"]);
  });

  it("exposes appearance for the other thin diagram types and emits it", () => {
    expect(getDiagramBuilderSchema("mermaid", "packet").capabilities.supportsPacketStyle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "packet").capabilities.supportsTitle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "pie").capabilities.supportsPieStyle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "xychart").capabilities.supportsXyStyle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "mindmap").capabilities.supportsMindmapStyle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "mindmap").capabilities.supportsTitle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "timeline").capabilities.supportsTimelineStyle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "journey").capabilities.supportsJourneyStyle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "gantt").capabilities.supportsGanttStyle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "block").capabilities.supportsBlockStyle).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "block").capabilities.supportsDirection).toBe(false);
    expect(getDiagramBuilderSchema("mermaid", "sequence").capabilities.supportsSequenceAutonumber).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "sequence").capabilities.supportsDirection).toBe(false);
    expect(getDiagramBuilderSchema("mermaid", "flowchart").capabilities.supportsDirection).toBe(true);
    expect(getDiagramBuilderSchema("mermaid", "flowchart").capabilities.supportsTitle).toBe(true);

    const packet = createDefaultBuilderState("mermaid", "packet");
    packet.appearance.packet.showBits = false;
    packet.appearance.packet.bitsPerRow = "16";
    expect(emitSourceFromBuilderState(packet)).toContain("showBits: false");
    expect(emitSourceFromBuilderState(packet)).toContain("bitsPerRow: 16");

    const pie = createDefaultBuilderState("mermaid", "pie");
    pie.appearance.pie.donutHole = "0.4";
    pie.appearance.pie.legendPosition = "bottom";
    const pieSource = emitSourceFromBuilderState(pie);
    expect(pieSource).toContain("donutHole: 0.4");
    expect(pieSource).toContain("legendPosition: bottom");

    const xy = createDefaultBuilderState("mermaid", "xychart");
    xy.appearance.xyChart.orientation = "horizontal";
    xy.appearance.xyChart.showDataLabel = true;
    expect(emitSourceFromBuilderState(xy)).toContain("chartOrientation: horizontal");
    expect(emitSourceFromBuilderState(xy)).toContain("showDataLabel: true");

    const mindmap = createDefaultBuilderState("mermaid", "mindmap");
    mindmap.appearance.mindmap.colorBy = "depth";
    mindmap.appearance.mindmap.maxNodeWidth = "180";
    expect(emitSourceFromBuilderState(mindmap)).toContain("colorBy: depth");
    expect(emitSourceFromBuilderState(mindmap)).toContain("maxNodeWidth: 180");

    const timeline = createDefaultBuilderState("mermaid", "timeline");
    timeline.appearance.timeline.disableMulticolor = true;
    expect(emitSourceFromBuilderState(timeline)).toContain("disableMulticolor: true");

    const journey = createDefaultBuilderState("mermaid", "journey");
    journey.appearance.journey.taskMargin = "40";
    expect(emitSourceFromBuilderState(journey)).toContain("taskMargin: 40");

    const gantt = createDefaultBuilderState("mermaid", "gantt");
    gantt.appearance.gantt.weekday = "monday";
    gantt.appearance.gantt.topAxis = true;
    gantt.canvas.ganttAxisFormat = "%d %b";
    const ganttSource = emitSourceFromBuilderState(gantt);
    expect(ganttSource).toContain("weekday: monday");
    expect(ganttSource).toContain("topAxis: true");
    expect(ganttSource).toContain("axisFormat %d %b");

    const block = createDefaultBuilderState("mermaid", "block");
    block.canvas.blockColumns = 4;
    block.appearance.block.padding = "12";
    const blockSource = emitSourceFromBuilderState(block);
    expect(blockSource).toContain("columns 4");
    expect(blockSource).toContain("padding: 12");

    const sequence = parseSourceToBuilderState(
      "sequenceDiagram\n  autonumber\n  Alice->>Bob: Hi",
      "mermaid",
    );
    expect(sequence.appearance.sequenceAutonumber).toBe(true);
    expect(emitSourceFromBuilderState(sequence)).toContain("autonumber");

    const flow = parseSourceToBuilderState("flowchart TD\n  A --> B", "mermaid");
    flow.canvas.direction = "BT";
    expect(emitSourceFromBuilderState(flow)).toContain("flowchart BT");
  });

  it("shows a diagram title in appearance for every step-by-step diagram", () => {
    const mermaidTypes = [
      "flowchart",
      "sequence",
      "sankey",
      "mindmap",
      "waterfall",
      "pie",
      "block",
    ] as const;
    for (const diagramType of mermaidTypes) {
      expect(getDiagramBuilderSchema("mermaid", diagramType).capabilities.supportsTitle).toBe(true);
    }
    expect(getDiagramBuilderSchema("plantuml", "sequence").capabilities.supportsTitle).toBe(true);
    expect(getDiagramBuilderSchema("d2", "flowchart").capabilities.supportsTitle).toBe(true);
    expect(getDiagramBuilderSchema("wiremark", "wireframe").capabilities.supportsTitle).toBe(true);
    expect(getDiagramBuilderSchema("structurizr", "c4_container").capabilities.supportsTitle).toBe(true);

    const flow = createDefaultBuilderState("mermaid", "flowchart");
    flow.canvas.title = "Checkout flow";
    flow.graphNodes = [
      { id: "A", label: "Start", kind: "default", group: "", color: "" },
      { id: "B", label: "End", kind: "default", group: "", color: "" },
    ];
    flow.graphEdges = [{ source: "A", target: "B", kind: "arrow", label: "" }];
    const flowSource = emitSourceFromBuilderState(flow);
    expect(flowSource.startsWith('---\ntitle: "Checkout flow"\n---\n')).toBe(true);
    expect(parseSourceToBuilderState(flowSource, "mermaid").canvas.title).toBe("Checkout flow");

    const pie = createDefaultBuilderState("mermaid", "pie");
    pie.canvas.title = "Shares";
    const pieSource = emitSourceFromBuilderState(pie);
    expect(pieSource).toContain("title Shares");
    expect(pieSource.startsWith("---")).toBe(false);

    const sankey = createDefaultBuilderState("mermaid", "sankey");
    sankey.canvas.title = "Traffic";
    sankey.appearance.sankey.showValues = false;
    const sankeySource = emitSourceFromBuilderState(sankey);
    expect(sankeySource).toContain('title: Traffic');
    expect(sankeySource).toContain("showValues: false");
    expect(sankeySource.indexOf("sankey-beta")).toBeGreaterThan(sankeySource.indexOf("title:"));
    expect(parseSourceToBuilderState(sankeySource, "mermaid").canvas.title).toBe("Traffic");

    const plant = createDefaultBuilderState("plantuml", "sequence");
    plant.canvas.title = "Order";
    plant.graphEdges = [{ source: "Alice", target: "Bob", kind: "arrow", label: "Hi" }];
    const plantSource = emitSourceFromBuilderState(plant);
    expect(plantSource).toContain("title Order");
    expect(parseSourceToBuilderState(plantSource, "plantuml").canvas.title).toBe("Order");

    const d2 = createDefaultBuilderState("d2", "flowchart");
    d2.canvas.title = "Services";
    d2.graphEdges = [{ source: "web", target: "api", kind: "arrow", label: "" }];
    const d2Source = emitSourceFromBuilderState(d2);
    expect(d2Source.startsWith("# title: Services\n")).toBe(true);
    expect(parseSourceToBuilderState(d2Source, "d2").canvas.title).toBe("Services");
  });

  it("keeps an orgchart line break in the step table", () => {
    const source = [
      "orgchart",
      "CEO [Chief\\nExecutive]",
      "CTO [Tech\\nLead]",
      "CEO -> CTO",
    ].join("\n");
    const state = parseSourceToBuilderState(source, "mermaid");
    expect(state.rows[0]).toEqual(["Chief\\nExecutive", "Tech\\nLead", "solid", ""]);

    const emitted = emitSourceFromBuilderState(state);
    expect(emitted).toContain("[Chief\\nExecutive]");
    expect(emitted).toContain("[Tech\\nLead]");
    const again = parseSourceToBuilderState(emitted, "mermaid");
    expect(again.rows[0]?.[0]).toBe("Chief\\nExecutive");
    expect(again.rows[0]?.[1]).toBe("Tech\\nLead");

    const model = parseOrgchart(emitted);
    expect(model.ok).toBe(true);
    expect(model.value?.nodes.map((node) => node.label)).toEqual([
      "Chief\nExecutive",
      "Tech\nLead",
    ]);
  });

  it("offers an aspect ratio on every diagram and writes it into the source", () => {
    const types = ["flowchart", "sankey", "pie", "sequence", "mindmap", "gantt", "radar", "orgchart"] as const;
    for (const diagramType of types) {
      expect(getDiagramBuilderSchema("mermaid", diagramType).capabilities.supportsAspectRatio).toBe(true);
    }
    expect(getDiagramBuilderSchema("plantuml", "sequence").capabilities.supportsAspectRatio).toBe(true);
    expect(getDiagramBuilderSchema("d2", "flowchart").capabilities.supportsAspectRatio).toBe(true);
    expect(getDiagramBuilderSchema("wiremark", "wireframe").capabilities.supportsAspectRatio).toBe(true);

    const flow = parseSourceToBuilderState("flowchart LR\n  A[Start] --> B[End]", "mermaid");
    flow.canvas.aspectRatio = "16x9";
    const emitted = emitSourceFromBuilderState(flow);
    expect(emitted.startsWith("%% ratio 16x9\n")).toBe(true);
    const again = parseSourceToBuilderState(emitted, "mermaid");
    expect(again.canvas.aspectRatio).toBe("16x9");
    expect(again.graphNodes.length).toBe(flow.graphNodes.length);

    const plant = parseSourceToBuilderState("@startuml\nAlice -> Bob\n@enduml", "plantuml");
    plant.canvas.aspectRatio = "4x3";
    const plantSource = emitSourceFromBuilderState(plant);
    expect(plantSource).toContain("' ratio 4x3");
    expect(parseSourceToBuilderState(plantSource, "plantuml").canvas.aspectRatio).toBe("4x3");

    const radar = parseSourceToBuilderState(
      "radar\naxes A, B, C\nseries One : 10, 20, 30",
      "mermaid",
    );
    radar.canvas.aspectRatio = "16x9";
    const radarSource = emitSourceFromBuilderState(radar);
    expect(radarSource).toContain("ratio 16x9");
    expect(radarSource).not.toContain("%% ratio");
    expect(parseSourceToBuilderState(radarSource, "mermaid").canvas.aspectRatio).toBe("16x9");
  });
});
