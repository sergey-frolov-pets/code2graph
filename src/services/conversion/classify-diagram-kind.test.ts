import { describe, expect, it } from "vitest";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";

describe("classifyDiagramKind", () => {
  it("classifies mermaid pie diagram", () => {
    expect(
      classifyDiagramKind('pie showData\n    "A" : 40', "mermaid"),
    ).toBe("pie");
  });

  it("classifies mermaid journey diagram", () => {
    expect(
      classifyDiagramKind("journey\n    title User path", "mermaid"),
    ).toBe("journey");
  });

  it("classifies mermaid C4Context diagram", () => {
    expect(
      classifyDiagramKind('C4Context\n    Person(user, "User", "")', "mermaid"),
    ).toBe("c4_context");
  });

  it("classifies mermaid requirement diagram", () => {
    expect(
      classifyDiagramKind("requirementDiagram\n    requirement req1 {}", "mermaid"),
    ).toBe("requirement");
  });

  it("classifies plantuml usecase diagram", () => {
    expect(
      classifyDiagramKind(
        '@startuml\nactor User\nrectangle "System" {\n  usecase "Login"\n}\n@enduml',
        "plantuml",
      ),
    ).toBe("usecase");
  });

  it("classifies plantuml wbs diagram", () => {
    expect(
      classifyDiagramKind("@startwbs\n* Project\n** Task\n@endwbs", "plantuml"),
    ).toBe("wbs");
  });

  it("classifies plantuml nwdiag diagram", () => {
    expect(
      classifyDiagramKind("@startnwdiag\nnetwork {}\n@endnwdiag", "plantuml"),
    ).toBe("nwdiag");
  });

  it("classifies plantuml er diagram", () => {
    expect(
      classifyDiagramKind(
        "@startuml\nentity User\nentity Order\nUser ||--o{ Order\n@enduml",
        "plantuml",
      ),
    ).toBe("er");
  });

  it("classifies plantuml mindmap", () => {
    expect(
      classifyDiagramKind("@startmindmap\n* Root\n@endmindmap", "plantuml"),
    ).toBe("mindmap");
  });
});
