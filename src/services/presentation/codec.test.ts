import { describe, expect, it } from "vitest";
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

  it("returns null for a broken payload and still strips the line", () => {
    const source = "%% @c2g-presentation v1 AAAA\nflowchart TD\n  A --> B\n";
    expect(readPresentation(source)).toBeNull();
    expect(stripPresentationBlock(source)).not.toContain("@c2g-presentation");
  });
});
