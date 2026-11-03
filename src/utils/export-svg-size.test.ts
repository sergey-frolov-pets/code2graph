// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getWiremarkSampleSource } from "@/constants/wiremark-sample-diagrams";
import { renderWiremarkToSvg } from "@/services/wiremark/wiremark-engine";
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
    expect(result).toMatch(/<rect[^>]*\bfill="none"/);
  });

  it("keeps the white rect that makes a D2 connection mask visible", () => {
    const result = sanitizeSvgForPreview(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><svg width="100" height="40" viewBox="-10 -10 100 40"><rect x="-10" y="-10" width="100" height="40" fill="#FFFFFF"/><path d="M0 0 L10 10" mask="url(#edge-mask)"/><mask id="edge-mask"><rect x="-10" y="-10" width="100" height="40" fill="white"/></mask></svg></svg>`,
    );

    expect(result).toMatch(/<mask[^>]*>\s*<rect[^>]*\bfill="white"/);
    expect(result).not.toMatch(/<mask[^>]*>\s*<rect[^>]*\bfill="none"/);
  });

  it("keeps the paper chip so a WireMark field outline does not cross its label", () => {
    const result = sanitizeSvgForPreview(
      renderWiremarkToSvg(getWiremarkSampleSource("form", "ru"), { dark: false }),
    );
    const doc = new DOMParser().parseFromString(result, "image/svg+xml");
    const label = [...doc.querySelectorAll("text")].find((node) =>
      node.textContent?.includes("Почта"),
    );
    const chip = label?.previousElementSibling;

    expect(chip?.tagName.toLowerCase()).toBe("rect");
    expect(chip?.getAttribute("fill")?.toLowerCase()).toBe("#ffffff");

    const frameFill = [...doc.querySelectorAll("rect")].find(
      (node) => Number.parseFloat(node.getAttribute("width") ?? "0") >= 300,
    );
    expect(frameFill?.getAttribute("fill")).toBe("none");
  });
});
