import { describe, expect, it } from "vitest";
import { convertDiagram } from "@/services/conversion/pipeline/convert-diagram";

const PLANTUML_GRAPH = `@startuml
[Alice] --> [Bob]
@enduml`;

const MERMAID_GRAPH = `flowchart LR
  Alice --> Bob`;

describe("convertDiagram", () => {
  it("converts plantuml graph to mermaid", () => {
    const result = convertDiagram({
      source: PLANTUML_GRAPH,
      sourceFormat: "plantuml",
      targetFormat: "mermaid",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.targetSource).toContain("flowchart");
    expect(result.targetSource).toContain("Alice");
    expect(result.targetSource).toContain("Bob");
  });

  it("converts mermaid graph to plantuml", () => {
    const result = convertDiagram({
      source: MERMAID_GRAPH,
      sourceFormat: "mermaid",
      targetFormat: "plantuml",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain("@startuml");
    expect(result.targetSource).toContain("Alice");
    expect(result.targetSource).toContain("Bob");
  });

  it("blocks gantt to graphml", () => {
    const result = convertDiagram({
      source: "@startgantt\n[Task] lasts 1 day\n@endgantt",
      sourceFormat: "plantuml",
      targetFormat: "graphml",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
  });
});
