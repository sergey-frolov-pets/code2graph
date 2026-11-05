// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  diagramAnalyticsKind,
  resolveDiagramTypeSlug,
  trackClipboardPaste,
  trackDiagramExport,
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

  it("classifies plantuml sequence diagrams", () => {
    const source = `@startuml
actor User
User -> API : call
@enduml`;
    expect(resolveDiagramTypeSlug(source, "plantuml")).toBe("sequence");
  });

  it("returns null when the source does not declare a type", () => {
    expect(resolveDiagramTypeSlug("   ", "mermaid")).toBeNull();
    expect(resolveDiagramTypeSlug("just a note", "plantuml")).toBeNull();
  });
});

describe("diagramAnalyticsKind", () => {
  it("joins language and type", () => {
    expect(diagramAnalyticsKind("mermaid", "xychart")).toBe("mermaid-xychart");
  });

  it("drops an empty type", () => {
    expect(diagramAnalyticsKind("Mermaid", null)).toBe("mermaid");
  });
});

describe("typed diagram events", () => {
  const count = vi.fn();

  beforeEach(() => {
    count.mockReset();
    window.goatcounter = { count };
  });

  afterEach(() => {
    delete window.goatcounter;
  });

  it("reports an opened mermaid XY chart as its own event", () => {
    trackDiagramOpen("mermaid", XY_CHART, "Open file");
    expect(count).toHaveBeenCalledWith({
      path: "open-diagram-mermaid-xychart",
      title: "Open file: mermaid / xychart",
      event: true,
    });
  });

  it("reports svg and png export with the diagram type", () => {
    trackDiagramExport("svg", "mermaid", XY_CHART);
    trackDiagramExport("png", "mermaid", XY_CHART);
    expect(count).toHaveBeenNthCalledWith(1, {
      path: "save-image-svg-mermaid-xychart",
      title: "Export SVG: mermaid / xychart",
      event: true,
    });
    expect(count).toHaveBeenNthCalledWith(2, {
      path: "save-image-png-mermaid-xychart",
      title: "Export PNG: mermaid / xychart",
      event: true,
    });
  });

  it("reports a source save with the diagram type", () => {
    trackDiagramExport("source", "mermaid", XY_CHART);
    expect(count).toHaveBeenCalledWith({
      path: "save-diagram-mermaid-xychart",
      title: "Save diagram: mermaid / xychart",
      event: true,
    });
  });

  it("reports table paste and source paste separately", () => {
    trackClipboardPaste("table", "mermaid", "xychart");
    trackClipboardPaste("source", "plantuml", "sequence");
    expect(count).toHaveBeenNthCalledWith(1, {
      path: "paste-table-mermaid-xychart",
      title: "Paste table: mermaid / xychart",
      event: true,
    });
    expect(count).toHaveBeenNthCalledWith(2, {
      path: "paste-source-plantuml-sequence",
      title: "Paste from clipboard: plantuml / sequence",
      event: true,
    });
  });
});
