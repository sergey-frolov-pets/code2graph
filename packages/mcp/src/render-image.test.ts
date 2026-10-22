import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DiagramImageError } from "./diagram-image-error.js";
import {
  renderDiagramImage,
  type RenderDependencies,
} from "./render-image.js";
import { JPEG_MIME_TYPE, PNG_MIME_TYPE } from "./render-limits.js";

const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);

function jsonResponse(body: string, status = 400): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });
}

function bytesResponse(bytes: Uint8Array, contentType: string): Response {
  return new Response(bytes, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}

function createDeps(
  fetchImpl: RenderDependencies["fetch"],
  extras: Partial<RenderDependencies> = {},
): RenderDependencies {
  return {
    fetch: fetchImpl,
    krokiUrl: "https://kroki.test",
    mermaidInkUrl: "https://ink.test",
    renderGraphmlSvg: () => "<svg></svg>",
    renderWiremarkSvg: () => "<svg></svg>",
    rasterizeSvg: () => PNG_BYTES,
    ...extras,
  };
}

describe("renderDiagramImage", () => {
  it("posts PlantUML source to Kroki and returns PNG", async () => {
    const calls: string[] = [];
    const deps = createDeps(async (input, init) => {
      calls.push(String(input));
      assert.equal(init?.method, "POST");
      assert.equal(init?.body, "@startuml\nAlice -> Bob\n@enduml");
      return bytesResponse(PNG_BYTES, PNG_MIME_TYPE);
    });

    const image = await renderDiagramImage(
      "plantuml",
      "@startuml\nAlice -> Bob\n@enduml",
      deps,
    );
    assert.equal(image.mimeType, PNG_MIME_TYPE);
    assert.equal(
      Buffer.from(image.base64, "base64").subarray(0, 4).toString("hex"),
      "89504e47",
    );
    assert.deepEqual(calls, ["https://kroki.test/plantuml/png"]);
  });

  it("asks Kroki for D2 SVG and rasterizes it", async () => {
    let rasterized = "";
    const deps = createDeps(
      async (input) => {
        assert.equal(String(input), "https://kroki.test/d2/svg");
        return bytesResponse(
          new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"),
          "image/svg+xml",
        );
      },
      {
        rasterizeSvg: (svg) => {
          rasterized = svg;
          return PNG_BYTES;
        },
      },
    );

    const image = await renderDiagramImage("d2", "x -> y", deps);
    assert.match(rasterized, /<svg/);
    assert.equal(image.mimeType, PNG_MIME_TYPE);
  });

  it("returns the JPEG mermaid.ink already rendered", async () => {
    const deps = createDeps(async (input) => {
      const url = String(input);
      assert.match(url, /^https:\/\/ink\.test\/img\/pako:/);
      return bytesResponse(JPEG_BYTES, JPEG_MIME_TYPE);
    });

    const image = await renderDiagramImage("mermaid", "flowchart LR\n  A-->B", deps);
    assert.equal(image.mimeType, JPEG_MIME_TYPE);
  });

  it("renders GraphML locally without a network call", async () => {
    let fetched = false;
    const deps = createDeps(async () => {
      fetched = true;
      return jsonResponse("nope");
    });

    const image = await renderDiagramImage(
      "graphml",
      "<graphml><graph><node id=\"n1\"/></graph></graphml>",
      deps,
    );
    assert.equal(fetched, false);
    assert.equal(image.mimeType, PNG_MIME_TYPE);
  });

  it("reports a Kroki error without hiding the status", async () => {
    const deps = createDeps(async () => jsonResponse("Error 400: bad diagram"));
    await assert.rejects(
      () => renderDiagramImage("structurizr", "workspace {}", deps),
      (error: unknown) => {
        assert.ok(error instanceof DiagramImageError);
        assert.match(error.message, /400/);
        assert.match(error.message, /bad diagram/);
        return true;
      },
    );
  });
});
