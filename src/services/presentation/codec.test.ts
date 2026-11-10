import { describe, expect, it } from "vitest";
import { sanitizePresentationDocument } from "@/services/presentation/model";
import { presentationFormats, readPresentation, stripPresentationBlock, writePresentation } from "@/services/presentation/codec";
import { captureViewpoint, createPresentation } from "@/services/presentation/model";
import type { PresentationDocument } from "@/services/presentation/types";

function sampleDocument(): PresentationDocument {
  const created = createPresentation("Walkthrough");
  const withFrame = captureViewpoint(created, created.activeTrackId, {
    anchorX: 0.25,
    anchorY: 0.5,
    scale: 1.5,
  });
  return captureViewpoint(withFrame, withFrame.activeTrackId, {
    anchorX: 0.8,
    anchorY: 0.2,
    scale: 2,
  });
}

describe("presentation codec", () => {
  it.each(presentationFormats())("round-trips a track inside a %s comment", (format) => {
    const source = format === "graphml"
      ? "<graphml><graph></graph></graphml>"
      : "@startuml\nA -> B\n@enduml";
    const document = sampleDocument();
    const written = writePresentation(source, format, document);
    expect(written).toContain("@c2g-presentation v1");
    expect(readPresentation(written)).toEqual(document);
    expect(stripPresentationBlock(written).trim()).toBe(source.trim());
  });

  it("drops the block when the document has no tracks", () => {
    const source = "flowchart TD\n  A --> B";
    const written = writePresentation(source, "mermaid", sampleDocument());
    expect(writePresentation(written, "mermaid", null).trim()).toBe(source);
  });

  it("keeps older overlays and fills in style defaults", () => {
    const document = sanitizePresentationDocument({
      version: 1,
      activeTrackId: "track",
      tracks: [
        {
          id: "track",
          name: "Tour",
          viewpoints: [{ id: "view", anchor: { x: 0, y: 0 }, scale: 1, dwellMs: 1000 }],
          transitions: [],
          overlays: [
            {
              id: "note",
              owner: { kind: "viewpoint", id: "view" },
              shape: "text",
              x: 0.1,
              y: 0.2,
              width: 0.3,
              height: 0.1,
              stroke: "not-a-color",
            },
          ],
        },
      ],
    });
    expect(document?.tracks[0]?.overlays[0]).toMatchObject({
      stroke: "",
      fill: "",
      textColor: "",
      font: "sans",
      line: "solid",
      bubbleShape: "rectangle",
      cornerRadius: 0,
      arrowForm: "line",
      arrowDirection: "right",
    });
  });

  it("returns null for a broken payload and still strips the line", () => {
    const source = "%% @c2g-presentation v1 AAAA\nflowchart TD\n  A --> B\n";
    expect(readPresentation(source)).toBeNull();
    expect(stripPresentationBlock(source)).not.toContain("@c2g-presentation");
  });
});
