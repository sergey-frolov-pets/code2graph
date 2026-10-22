import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateDiagramScaffold } from "../../../packages/shared/src/agent-diagram.js";
import { renderGraphmlSvg } from "./graphml-svg.js";

describe("graphml svg", () => {
  it("draws a labeled chain from a GraphML scaffold", () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<graphml>
  <graph edgedefault="directed" rankdir="LR">
    <node id="n1"><data key="label">Старт</data></node>
    <node id="n2"/>
    <edge source="n1" target="n2"><data key="label">далее</data></edge>
  </graph>
</graphml>`;
    const svg = renderGraphmlSvg(source);
    expectSvg(svg);
    assert.match(svg, /Старт/);
    assert.match(svg, /далее/);
    assert.match(svg, /<path /);
  });

  it("renders the agent scaffold", () => {
    const source = generateDiagramScaffold({
      request: "graphml",
      format: "graphml",
      count: 3,
    }).scaffold.source;
    const svg = renderGraphmlSvg(source);
    expectSvg(svg);
    assert.match(svg, />n1</);
    assert.match(svg, />n3</);
  });
});

function expectSvg(svg: string): void {
  assert.match(svg, /<svg /);
  assert.match(svg, /graphml-node/);
}
