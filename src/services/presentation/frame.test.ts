import { describe, expect, it } from "vitest";
import {
  buildFrameDiagramSource,
  frameLabel,
  frameMime,
  readFrameHref,
  stripFrameBlock,
} from "@/services/presentation/frame";
import { stripPresentationBlock } from "@/services/presentation/codec";

describe("diagram frame", () => {
  it("builds a mermaid diagram whose comment points at the picture", () => {
    const source = buildFrameDiagramSource("image/png", "QQ==");
    expect(source).toContain("%% @c2g-frame image/png;base64,QQ==");
    expect(source).toContain("flowchart TB");
    expect(readFrameHref(source)).toBe("data:image/png;base64,QQ==");
    expect(stripFrameBlock(source)).not.toContain("@c2g-frame");
    expect(stripFrameBlock(source)).toContain("flowchart TB");
  });

  it("leaves a presentation comment in place", () => {
    const source = "%% @c2g-presentation v1 QQ==\nflowchart TD\n  A --> B\n";
    expect(stripFrameBlock(source)).toBe(source);
    expect(stripPresentationBlock(buildFrameDiagramSource("image/svg+xml", "QQ=="))).toContain(
      "@c2g-frame",
    );
  });

  it("recognizes png and svg files and names the tab from the file", () => {
    expect(frameMime(new File([], "shot.PNG", { type: "" }))).toBe("image/png");
    expect(frameMime(new File([], "icon.svg", { type: "image/svg+xml" }))).toBe("image/svg+xml");
    expect(frameMime(new File([], "notes.txt", { type: "text/plain" }))).toBeNull();
    expect(frameLabel("board.png")).toBe("board");
    expect(frameLabel(".png")).toBe("frame");
  });
});
