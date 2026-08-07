import { describe, expect, it } from "vitest";
import { getMermaidSampleSource } from "@/constants/mermaid-sample-diagrams";
import {
  extractLeadingMermaidDiagram,
  isCompleteMermaidDiagram,
  prepareMermaidSource,
} from "@/utils/mermaid-source";

describe("prepareMermaidSource", () => {
  it("unwraps fenced mermaid blocks", () => {
    expect(
      prepareMermaidSource("```mermaid\nflowchart LR\nA --> B\n```"),
    ).toBe("flowchart LR\nA --> B");
  });

  it("returns trimmed plain source", () => {
    expect(prepareMermaidSource("  graph TD\nA-->B  ")).toBe("graph TD\nA-->B");
  });

  it("extracts leading gantt before plantuml tail", () => {
    const gantt = getMermaidSampleSource("gantt", "ru");
    const mixed = `${gantt}\n@startuml\nAlice -> Bob\n@enduml`;
    const prepared = prepareMermaidSource(mixed);

    expect(prepared).toBe(gantt);
    expect(prepared).not.toContain("@startuml");
  });
});

describe("extractLeadingMermaidDiagram", () => {
  it("keeps pure mermaid source unchanged", () => {
    const gantt = "gantt\ntitle Test\nsection A\nTask :a1, 2024-01-01, 3d";
    expect(extractLeadingMermaidDiagram(gantt)).toBe(gantt);
  });

  it("detects complete mermaid gantt", () => {
    expect(
      isCompleteMermaidDiagram(
        "gantt\ntitle Test\nsection A\nTask :a1, 2024-01-01, 3d",
      ),
    ).toBe(true);
  });
});
