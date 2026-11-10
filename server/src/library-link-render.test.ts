import { describe, expect, it } from "vitest";
import {
  libraryLinkSupportsLiveRender,
  renderLibraryLinkSvg,
} from "./library-link-render.js";

const GRAPHML = `<?xml version="1.0"?>
<graphml>
  <graph edgedefault="directed">
    <node id="a"><data key="d0">Start</data></node>
    <node id="b"><data key="d0">End</data></node>
    <edge source="a" target="b"/>
  </graph>
</graphml>`;

describe("library link live svg", () => {
  it("draws graphml nodes without the source text", () => {
    const svg = renderLibraryLinkSvg("graphml", GRAPHML);
    expect(svg).toContain("<svg ");
    expect(svg).toContain("Start");
    expect(svg).toContain("End");
    expect(svg).not.toContain("<graphml");
    expect(libraryLinkSupportsLiveRender("plantuml")).toBe(false);
    expect(renderLibraryLinkSvg("plantuml", GRAPHML)).toBeNull();
  });

  it("escapes labels", () => {
    const svg = renderLibraryLinkSvg(
      "graphml",
      `<graphml><graph><node id="a"><data key="d0">&lt;hi&gt;</data></node></graph></graphml>`,
    );
    expect(svg).toContain("&amp;lt;hi&amp;gt;");
    expect(svg).not.toContain("<hi>");
  });
});
