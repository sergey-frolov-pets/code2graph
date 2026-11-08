import { describe, expect, it } from "vitest";
import { recognizeDiagramSource } from "@/services/clipboard-diagram/recognize-diagram-source";

describe("recognizeDiagramSource", () => {
  it("accepts a PlantUML sequence", () => {
    expect(
      recognizeDiagramSource("@startuml\nAlice -> Bob: hi\n@enduml"),
    ).toEqual({ format: "plantuml", kind: "sequence" });
  });

  it("accepts a Mermaid flowchart", () => {
    expect(recognizeDiagramSource("flowchart LR\n  A --> B")).toEqual({
      format: "mermaid",
      kind: "graph",
    });
  });

  it("rejects plain text", () => {
    expect(recognizeDiagramSource("hello from the clipboard")).toBeNull();
    expect(recognizeDiagramSource("   ")).toBeNull();
  });
});
