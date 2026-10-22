// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  GRAPHML_SAMPLE_IDS,
  getGraphmlSampleSource,
} from "@/constants/graphml-sample-diagrams";
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

describe("graphml samples", () => {
  it("keeps the node label when a shape key is also present", () => {
    const graph = parseGraphml(`<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="check">
      <data key="shape">diamond</data>
      <data key="label">Check</data>
    </node>
  </graph>
</graphml>`);

    expect(graph.nodes[0]).toMatchObject({
      label: "Check",
      shape: "diamond",
      isGroup: false,
    });
  });

  it("reads nested nodes, undirected edges, and dashed style", () => {
    const graph = parseGraphml(getGraphmlSampleSource("network", "en"));
    const office = graph.nodes.find((node) => node.id === "office");
    const laptop = graph.nodes.find((node) => node.id === "laptop");
    const vpn = graph.edges.find((edge) => edge.source === "cloud");
    const lan = graph.edges.find((edge) => edge.source === "switch");

    expect(office).toMatchObject({ isGroup: true, label: "Office" });
    expect(laptop).toMatchObject({ parentId: "office", label: "Laptop" });
    expect(vpn).toMatchObject({ directed: false, dashed: true, label: "VPN" });
    expect(lan?.directed).toBe(false);
  });

  it("renders every sample with blocks and arrows", async () => {
    expect(GRAPHML_SAMPLE_IDS.length).toBeGreaterThanOrEqual(3);
    expect(GRAPHML_SAMPLE_IDS.length).toBeLessThanOrEqual(5);

    for (const id of GRAPHML_SAMPLE_IDS) {
      const source = getGraphmlSampleSource(id, "ru");
      const graph = parseGraphml(source);
      const svg = await renderGraphmlToSvg(source, { dark: false });

      expect(graph.nodes.length).toBeGreaterThanOrEqual(3);
      expect(graph.edges.length).toBeGreaterThanOrEqual(2);
      expect(svg).toContain("<svg");
      expect(svg).toContain(graph.nodes[0]?.label);
    }

    const decision = await renderGraphmlToSvg(
      getGraphmlSampleSource("decision", "en"),
    );
    expect(decision).toContain("<polygon");
    expect(decision).toContain("marker-end");

    const architecture = await renderGraphmlToSvg(
      getGraphmlSampleSource("architecture", "en"),
    );
    expect(architecture).toContain("stroke-dasharray");

    const network = await renderGraphmlToSvg(
      getGraphmlSampleSource("network", "en"),
    );
    expect(network).toContain("Office");
    expect(network).toContain("graphml-group");
  });
});
