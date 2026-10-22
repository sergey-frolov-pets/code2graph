import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateDiagramScaffold } from "../../../packages/shared/src/agent-diagram.js";
import { rasterizeSvg } from "./rasterize-svg.js";
import { PNG_MIME_TYPE } from "./render-limits.js";
import { renderDiagramImage } from "./render-image.js";
import { renderWiremarkSvg } from "./wiremark-svg.js";

const LIVE = process.env.CODE2GRAPH_RENDER_LIVE === "1";

describe("local diagram images", () => {
  it("rasterizes a WireMark scaffold to PNG", () => {
    const source = generateDiagramScaffold({
      request: "wireframe",
      format: "wiremark",
      locale: "ru",
    }).scaffold.source;
    const png = rasterizeSvg(renderWiremarkSvg(source));
    assert.equal(png[0], 0x89);
    assert.equal(png[1], 0x50);
    assert.ok(png.byteLength > 500);
  });

  it("rasterizes a GraphML scaffold to PNG", async () => {
    const source = generateDiagramScaffold({
      request: "graph",
      format: "graphml",
      count: 3,
    }).scaffold.source;
    const image = await renderDiagramImage("graphml", source);
    assert.equal(image.mimeType, PNG_MIME_TYPE);
    assert.ok(Buffer.from(image.base64, "base64").byteLength > 500);
  });
});

describe("online diagram images", { skip: !LIVE }, () => {
  it("renders PlantUML, Mermaid, D2, and Structurizr", async () => {
    const cases = [
      { format: "plantuml", request: "sequence checkout" },
      { format: "mermaid", request: "mermaid flowchart" },
      { format: "d2", request: "d2 sequence" },
      { format: "structurizr", request: "structurizr context" },
    ] as const;

    for (const item of cases) {
      const source = generateDiagramScaffold({
        request: item.request,
        format: item.format,
        locale: "ru",
      }).scaffold.source;
      const image = await renderDiagramImage(item.format, source);
      const bytes = Buffer.from(image.base64, "base64");
      assert.ok(bytes.byteLength > 500, `${item.format} image is too small`);
      const signature = bytes.subarray(0, 3).toString("hex");
      assert.ok(
        signature === "89504e" || signature === "ffd8ff",
        `${item.format} signature ${signature}`,
      );
    }
  });
});
