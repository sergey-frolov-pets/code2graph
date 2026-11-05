import { describe, expect, it } from "vitest";
import {
  namespaceSvgIds,
  svgAtNaturalSize,
  svgNaturalSize,
} from "@/constants/wizard-thumbnails";

describe("wizard thumbnail svg", () => {
  it("reads the natural size from the viewBox", () => {
    expect(
      svgNaturalSize('<svg viewBox="-8 -8 850 1128" width="100%"></svg>'),
    ).toEqual({ width: 850, height: 1128 });
  });

  it("pins a percentage-sized svg to its viewBox size", () => {
    const sized = svgAtNaturalSize(
      '<svg id="mermaid-render-1" width="100%" style="max-width: 553px;" viewBox="0 0 553 824.5"></svg>',
    );

    expect(sized).toContain('width="553"');
    expect(sized).toContain('height="824.5"');
    expect(sized).not.toContain("max-width");
    expect(sized).not.toContain('width="100%"');
  });

  it("gives each copy unique ids, including style selectors", () => {
    const source =
      '<svg id="mermaid-render-1"><style>#mermaid-render-1{fill:#333} #mermaid-render-1 .node{color:#fff}</style><g clip-path="url(#clip)" id="clip"></g></svg>';

    const first = namespaceSvgIds(source, "v:1");
    const second = namespaceSvgIds(source, "v:2");

    expect(first).toContain('id="v1-mermaid-render-1"');
    expect(first).toContain("#v1-mermaid-render-1{fill:#333}");
    expect(first).toContain("#v1-mermaid-render-1 .node{color:#fff}");
    expect(first).toContain('id="v1-clip"');
    expect(first).toContain("url(#v1-clip)");
    expect(first).not.toContain('id="mermaid-render-1"');
    expect(second).toContain('id="v2-mermaid-render-1"');
    expect(second).not.toContain("v1-mermaid-render-1");
  });
});
