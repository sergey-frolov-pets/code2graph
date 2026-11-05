import { describe, expect, it } from "vitest";
import { renderD2HighlightedLine } from "@/utils/d2-highlight";

describe("d2 highlight", () => {
  it("marks keywords, arrows, strings, and comments", () => {
    const html = renderD2HighlightedLine(
      'direction: right  # layout',
    );
    expect(html).toContain("tok-keyword");
    expect(html).toContain("tok-comment");

    const connection = renderD2HighlightedLine('user -> api: "Запрос"');
    expect(connection).toContain("tok-arrow");
    expect(connection).toContain("tok-string");
  });

  it("highlights shape names and style values", () => {
    const html = renderD2HighlightedLine("style.fill-pattern: dots");
    expect(html).toContain("tok-keyword");
    expect(html).toContain("fill-pattern");
    expect(html).toContain("dots");

    const shape = renderD2HighlightedLine("shape: code");
    expect(shape).toContain(">code</span>");
  });
});
