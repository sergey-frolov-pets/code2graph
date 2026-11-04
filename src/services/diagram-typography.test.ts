// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  applyDiagramTypography,
  resolveDiagramFontStack,
} from "@/services/diagram-typography";

const SERIF = {
  fontFamily: "serif",
  fontWeight: "700",
  fontStyle: "italic",
} as const;

describe("applyDiagramTypography", () => {
  it("overrides PlantUML font attributes and keeps the existing style", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text style="white-space: pre" font-family="sans-serif" font-weight="bold">Hi</text></svg>`;
    const result = applyDiagramTypography(svg, SERIF);
    const text = new DOMParser()
      .parseFromString(result, "image/svg+xml")
      .querySelector("text");

    expect(text?.getAttribute("style")).toContain("white-space: pre");
    expect(text?.getAttribute("style")).toContain("font-family:Georgia");
    expect(text?.getAttribute("style")).toContain("font-weight:700 !important");
    expect(text?.getAttribute("style")).toContain("font-style:italic !important");
    expect(text?.getAttribute("font-family")).toContain("Georgia");
    expect(result).toContain("data-c2g-typography");
  });

  it("paints Mermaid HTML labels inside foreignObject", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><style>#id .label{font-family:"trebuchet ms",verdana;}#id :root{--mermaid-font-family:"trebuchet ms",verdana;}</style><g class="label"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel"><p>Editor</p></span></div></foreignObject></g></svg>`;
    const result = applyDiagramTypography(svg, { fontFamily: "mono" });
    const doc = new DOMParser().parseFromString(result, "image/svg+xml");
    const stack = resolveDiagramFontStack("mono");

    expect(doc.querySelector("p")?.getAttribute("style")).toContain(stack);
    expect(doc.querySelector("style")?.textContent).toContain(
      `--mermaid-font-family:${stack}`,
    );
  });

  it("overrides a D2 embedded font class without rewriting its font-face name", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><style>.text-bold{font-family:"d2-font-bold";}</style><text class="text-bold" style="font-size:16px">User</text></svg>`;
    const result = applyDiagramTypography(svg, { fontFamily: "serif" });
    const doc = new DOMParser().parseFromString(result, "image/svg+xml");

    expect(doc.querySelector("text")?.getAttribute("style")).toContain("font-size:16px");
    expect(doc.querySelector("text")?.getAttribute("style")).toContain("Georgia");
    expect(doc.querySelector("style:not([data-c2g-typography])")?.textContent).toContain(
      "d2-font-bold",
    );
  });

  it("leaves icon glyphs on their own font", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><span class="fa fa-search" xmlns="http://www.w3.org/1999/xhtml">x</span></foreignObject></svg>`;
    const result = applyDiagramTypography(svg, SERIF);
    const icon = new DOMParser()
      .parseFromString(result, "image/svg+xml")
      .querySelector("span");

    expect(icon?.getAttribute("style") ?? "").not.toContain("Georgia");
  });

  it("is idempotent and ignores an unknown family", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text>Hi</text></svg>`;
    const once = applyDiagramTypography(svg, SERIF);
    const twice = applyDiagramTypography(once, SERIF);

    expect(twice.match(/data-c2g-typography/g)).toHaveLength(1);
    expect(applyDiagramTypography(svg, { fontFamily: "papyrus" })).toBe(svg);
  });

  it("repairs a duplicated xmlns before painting PlantUML text", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg"><text font-family="sans-serif">Hi</text></svg>`;
    const result = applyDiagramTypography(svg, { fontFamily: "serif" });
    const text = new DOMParser().parseFromString(result, "image/svg+xml").querySelector("text");

    expect(text?.getAttribute("style")).toContain("Georgia");
    expect(result.match(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g)).toHaveLength(1);
  });

  it("keeps the xml declaration", () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg"><text>Hi</text></svg>`;
    expect(applyDiagramTypography(svg, { fontFamily: "sans" })).toMatch(/^<\?xml/);
  });
});
