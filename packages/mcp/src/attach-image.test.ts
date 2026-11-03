import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachDiagramImage } from "./attach-image.js";
import { PNG_MIME_TYPE } from "./render-limits.js";

const SAMPLE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");

describe("attachDiagramImage", () => {
  it("returns source text and an image block", async () => {
    const result = await attachDiagramImage(
      {
        format: "plantuml",
        source: "@startuml\n@enduml",
        fileName: "diagram.puml",
      },
      async () => ({ mimeType: PNG_MIME_TYPE, base64: SAMPLE_PNG }),
    );

    assert.equal(result.content.length, 2);
    const text = result.content[0];
    const image = result.content[1];
    assert.equal(text?.type, "text");
    if (text?.type === "text") {
      const payload = JSON.parse(text.text) as { source: string; imageMimeType: string };
      assert.match(payload.source, /@startuml/);
      assert.equal(payload.imageMimeType, PNG_MIME_TYPE);
    }
    assert.equal(image?.type, "image");
    if (image?.type === "image") {
      assert.equal(image.mimeType, PNG_MIME_TYPE);
      assert.equal(image.data, SAMPLE_PNG);
    }
  });

  it("keeps the source when rendering fails", async () => {
    const result = await attachDiagramImage(
      { format: "d2", source: "x -> y" },
      async () => {
        throw new Error("kroki down");
      },
    );

    assert.equal(result.content.length, 1);
    const text = result.content[0];
    assert.equal(text?.type, "text");
    if (text?.type === "text") {
      const payload = JSON.parse(text.text) as { source: string; imageError: string };
      assert.equal(payload.source, "x -> y");
      assert.match(payload.imageError, /kroki down/);
    }
  });
});
