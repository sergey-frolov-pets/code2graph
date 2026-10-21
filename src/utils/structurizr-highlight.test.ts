import { describe, expect, it } from "vitest";
import { renderStructurizrHighlightedLine } from "@/utils/structurizr-highlight";

describe("structurizr highlight", () => {
  it("marks keywords, arrows, strings, and comments", () => {
    const html = renderStructurizrHighlightedLine(
      'customer -> shop "Uses" // checkout',
    );
    expect(html).toContain("tok-arrow");
    expect(html).toContain("tok-string");
    expect(html).toContain("tok-comment");

    const keyword = renderStructurizrHighlightedLine("workspace {");
    expect(keyword).toContain("tok-keyword");
  });
});
