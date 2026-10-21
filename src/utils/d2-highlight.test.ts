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
});
