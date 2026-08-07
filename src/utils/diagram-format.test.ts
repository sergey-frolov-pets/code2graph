import { describe, expect, it } from "vitest";
import {
  detectDiagramFormat,
  resolveLibraryDiagramFormat,
} from "@/utils/diagram-format";

describe("detectDiagramFormat", () => {
  it("detects format from file extension when source is empty", () => {
    expect(detectDiagramFormat("", "flow.mmd")).toBe("mermaid");
    expect(detectDiagramFormat("", "graph.graphml")).toBe("graphml");
    expect(detectDiagramFormat("", "diagram.puml")).toBe("plantuml");
  });

  it("prefers source markers over file extension", () => {
    expect(
      detectDiagramFormat("gantt\ntitle Test", "diagram.puml"),
    ).toBe("mermaid");
  });

  it("detects mermaid from source markers", () => {
    expect(
      detectDiagramFormat("```mermaid\nflowchart LR\nA --> B\n```"),
    ).toBe("mermaid");
    expect(detectDiagramFormat("flowchart TD\nA --> B")).toBe("mermaid");
  });

  it("detects graphml from xml source", () => {
    expect(
      detectDiagramFormat(
        '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph/></graphml>',
      ),
    ).toBe("graphml");
  });

  it("defaults to plantuml for classic source", () => {
    expect(detectDiagramFormat("@startuml\nA -> B\n@enduml")).toBe("plantuml");
  });
});

describe("resolveLibraryDiagramFormat", () => {
  it("prefers source markers over stored language", () => {
    expect(
      resolveLibraryDiagramFormat("@startuml\n@enduml", "x.puml", "mermaid"),
    ).toBe("plantuml");
    expect(
      resolveLibraryDiagramFormat("gantt\ntitle Test", "diagram.puml", "plantuml"),
    ).toBe("mermaid");
  });

  it("uses explicit language for empty source", () => {
    expect(resolveLibraryDiagramFormat("", "x.graphml", "graphml")).toBe(
      "graphml",
    );
  });

  it("falls back to detection when language is generic", () => {
    expect(
      resolveLibraryDiagramFormat(
        "flowchart TD\nA --> B",
        "diagram.mmd",
        "other",
      ),
    ).toBe("mermaid");
  });
});
