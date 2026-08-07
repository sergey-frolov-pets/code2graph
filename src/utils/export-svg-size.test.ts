// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { normalizeSvgRootSize, parseSvgSize, sanitizeSvgForPreview } from "@/utils/export";

describe("parseSvgSize", () => {
  it("prefers viewBox over percentage width", () => {
    const size = parseSvgSize(
      '<svg width="100%" viewBox="0 0 1200 268" xmlns="http://www.w3.org/2000/svg"></svg>',
    );

    expect(size).toEqual({ width: 1200, height: 268 });
  });
});

describe("normalizeSvgRootSize", () => {
  it("materializes percentage width and missing height from viewBox", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      '<svg width="100%" viewBox="0 0 1200 268" style="max-width: 1200px;" xmlns="http://www.w3.org/2000/svg"></svg>',
      "image/svg+xml",
    );

    normalizeSvgRootSize(doc.documentElement);

    expect(doc.documentElement.getAttribute("width")).toBe("1200");
    expect(doc.documentElement.getAttribute("height")).toBe("268");
    expect(doc.documentElement.getAttribute("style") ?? "").not.toMatch(/max-width/i);
  });
});

describe("sanitizeSvgForPreview", () => {
  it("normalizes mermaid gantt-like percentage svg for preview layout", () => {
    const result = sanitizeSvgForPreview(
      '<svg id="mermaid-render-1" width="100%" viewBox="0 0 1200 268" style="max-width: 1200px;" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/></svg>',
    );

    expect(result).toMatch(/<svg[^>]*\bwidth="1200"/);
    expect(result).toMatch(/<svg[^>]*\bheight="268"/);
    expect(result).not.toMatch(/<svg[^>]*\bwidth="100%"/);
  });
});
