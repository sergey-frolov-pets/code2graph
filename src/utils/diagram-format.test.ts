import { describe, expect, it } from "vitest";
import { detectDiagramFormat } from "@/utils/diagram-format";

describe("detectDiagramFormat", () => {
  it("detects format from file extension", () => {
    expect(detectDiagramFormat("", "flow.mmd")).toBe("mermaid");
    expect(detectDiagramFormat("", "graph.graphml")).toBe("graphml");
    expect(detectDiagramFormat("", "diagram.puml")).toBe("plantuml");
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
