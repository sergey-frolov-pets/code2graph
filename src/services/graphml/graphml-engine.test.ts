// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { parseGraphml, renderGraphmlToSvg } from "@/services/graphml/graphml-engine";

const SAMPLE_GRAPHML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="d0" for="node" attr.name="label" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="n1">
      <data key="d0">Start</data>
    </node>
    <node id="n2">
      <data key="d0">End</data>
    </node>
    <edge source="n1" target="n2"/>
  </graph>
</graphml>`;

describe("parseGraphml", () => {
  it("extracts nodes and edges", () => {
    const graph = parseGraphml(SAMPLE_GRAPHML);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.nodes[0]?.label).toBe("Start");
    expect(graph.direction).toBe("TB");
  });

  it("reads rankdir from graph element", () => {
    const graph = parseGraphml(
      SAMPLE_GRAPHML.replace(
        '<graph edgedefault="directed">',
        '<graph edgedefault="directed" rankdir="LR">',
      ),
    );
    expect(graph.direction).toBe("LR");
  });
});

describe("renderGraphmlToSvg", () => {
  it("returns svg markup", async () => {
    const svg = await renderGraphmlToSvg(SAMPLE_GRAPHML, { dark: false });
    expect(svg).toContain("<svg");
    expect(svg).toContain("Start");
    expect(svg).toContain("End");
  });

  it("lays out horizontally when rankdir is LR", async () => {
    const tbSvg = await renderGraphmlToSvg(SAMPLE_GRAPHML, { dark: false });
    const lrSource = SAMPLE_GRAPHML.replace(
      '<graph edgedefault="directed">',
      '<graph edgedefault="directed" rankdir="LR">',
    );
    const lrSvg = await renderGraphmlToSvg(lrSource, { dark: false });

    const readSize = (svg: string) => {
      const match = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
      return {
        width: Number(match?.[1]),
        height: Number(match?.[2]),
      };
    };

    const tb = readSize(tbSvg);
    const lr = readSize(lrSvg);

    expect(lr.width).toBeGreaterThan(lr.height);
    expect(lr.width).toBeGreaterThan(tb.width);
  });
});
