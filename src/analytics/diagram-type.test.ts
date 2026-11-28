// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  diagramAnalyticsKind,
  resolveDiagramTypeSlug,
  trackDiagramOpen,
} from "@/analytics/diagram-type";

const XY_CHART = `xychart-beta
    x-axis [jan, feb]
    bar [3, 5]`;

describe("resolveDiagramTypeSlug", () => {
  it("reads a mermaid XY chart from its header", () => {
    expect(resolveDiagramTypeSlug(XY_CHART, "mermaid")).toBe("xychart");
  });

  it("keeps flowchart distinct from graph", () => {
    expect(resolveDiagramTypeSlug("flowchart LR\n  A --> B", "mermaid")).toBe(
      "flowchart",
    );
    expect(resolveDiagramTypeSlug("graph TD\n  A --> B", "mermaid")).toBe(
      "graph",
    );
  });

  it("prefers a mermaid extension type over a generic chart", () => {
    expect(
      resolveDiagramTypeSlug("waterfall\n  a: 10\n  b: -3", "mermaid"),
    ).toBe("waterfall");
  });

  it("unwraps a fenced mermaid block", () => {
    expect(
      resolveDiagramTypeSlug("```mermaid\nxychart-beta\n```", "mermaid"),
    ).toBe("xychart");
  });

  it("classifies plantuml class diagrams", () => {
    expect(
      resolveDiagramTypeSlug("@startuml\nclass A\nclass B\nA --> B\n@enduml", "plantuml"),
    ).toBe("class");
  });

  it("returns null when the source does not declare a type", () => {
    expect(resolveDiagramTypeSlug("   ", "mermaid")).toBeNull();
  });
});

describe("diagramAnalyticsKind", () => {
  it("joins language and type", () => {
    expect(diagramAnalyticsKind("mermaid", "xychart")).toBe("mermaid-xychart");
  });

  it("drops an empty type", () => {
    expect(diagramAnalyticsKind("mermaid", null)).toBe("mermaid");
  });
});

describe("trackDiagramOpen", () => {
  const count = vi.fn();

  beforeEach(() => {
    count.mockReset();
    window.goatcounter = { count };
  });

  afterEach(() => {
    delete window.goatcounter;
  });

  it("reports only the language, without the diagram type", () => {
    trackDiagramOpen("mermaid", XY_CHART);
    expect(count).toHaveBeenCalledWith({
      path: "open/mermaid",
      title: "open/mermaid",
      event: true,
    });
  });
});
