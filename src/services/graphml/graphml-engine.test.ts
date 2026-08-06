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
  });
});

describe("renderGraphmlToSvg", () => {
  it("returns svg markup", async () => {
    const svg = await renderGraphmlToSvg(SAMPLE_GRAPHML, { dark: false });
    expect(svg).toContain("<svg");
    expect(svg).toContain("Start");
    expect(svg).toContain("End");
  });
});
