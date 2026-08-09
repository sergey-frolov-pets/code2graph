import { describe, expect, it } from "vitest";
import { detectAutoFoldRegions } from "@/utils/auto-fold-regions";

function findRegion(
  source: string,
  format: "plantuml" | "mermaid" | "graphml",
  label: string,
) {
  return detectAutoFoldRegions(source, format).find((region) => region.label === label);
}

describe("detectAutoFoldRegions", () => {
  describe("plantuml", () => {
    it("detects if/endif blocks", () => {
      const source = [
        "@startuml",
        "if (ready?) then (yes)",
        "  :Do work;",
        "else (no)",
        "  :Wait;",
        "endif",
        "@enduml",
      ].join("\n");

      expect(findRegion(source, "plantuml", "if")).toMatchObject({
        startLine: 2,
        endLine: 6,
        auto: true,
      });
    });

    it("detects sequence alt/end blocks", () => {
      const source = [
        "@startuml",
        "alt case A",
        "  Alice -> Bob: hi",
        "else case B",
        "  Bob -> Alice: hi",
        "end",
        "@enduml",
      ].join("\n");

      expect(findRegion(source, "plantuml", "alt")).toMatchObject({
        startLine: 2,
        endLine: 6,
      });
    });

    it("detects fork/end fork blocks", () => {
      const source = [
        "@startuml",
        "fork",
        "  :A;",
        "fork again",
        "  :B;",
        "end fork",
        "@enduml",
      ].join("\n");

      expect(findRegion(source, "plantuml", "fork")).toMatchObject({
        startLine: 2,
        endLine: 6,
      });
    });

    it("detects switch/endswitch blocks", () => {
      const source = [
        "@startuml",
        "switch (mode)",
        "case (a)",
        "  :A;",
        "case (b)",
        "  :B;",
        "endswitch",
        "@enduml",
      ].join("\n");

      expect(findRegion(source, "plantuml", "switch")).toMatchObject({
        startLine: 2,
        endLine: 7,
      });
    });

    it("detects brace blocks", () => {
      const source = [
        "@startuml",
        "package \"Core\" {",
        "  class User",
        "}",
        "@enduml",
      ].join("\n");

      expect(findRegion(source, "plantuml", "brace")).toMatchObject({
        startLine: 2,
        endLine: 4,
      });
    });

    it("detects @startmindmap/@endmindmap blocks", () => {
      const source = [
        "@startmindmap",
        "* Root",
        "** Branch",
        "@endmindmap",
      ].join("\n");

      expect(findRegion(source, "plantuml", "@startmindmap")).toMatchObject({
        startLine: 1,
        endLine: 4,
      });
    });
  });

  describe("mermaid", () => {
    it("detects subgraph/end blocks", () => {
      const source = [
        "flowchart TD",
        "  subgraph Backend",
        "    A --> B",
        "  end",
      ].join("\n");

      expect(findRegion(source, "mermaid", "subgraph")).toMatchObject({
        startLine: 2,
        endLine: 4,
      });
    });

    it("detects sequence alt/end blocks", () => {
      const source = [
        "sequenceDiagram",
        "  alt success",
        "    A->>B: ok",
        "  else failure",
        "    A->>B: fail",
        "  end",
      ].join("\n");

      expect(findRegion(source, "mermaid", "alt")).toMatchObject({
        startLine: 2,
        endLine: 6,
      });
    });

    it("detects namespace brace blocks", () => {
      const source = [
        "classDiagram",
        "namespace Domain {",
        "  class User",
        "}",
      ].join("\n");

      expect(findRegion(source, "mermaid", "brace")).toMatchObject({
        startLine: 2,
        endLine: 4,
      });
    });

    it("detects if/endif blocks", () => {
      const source = [
        "flowchart TD",
        "  if cond then",
        "    A --> B",
        "  endif",
      ].join("\n");

      expect(findRegion(source, "mermaid", "if")).toMatchObject({
        startLine: 2,
        endLine: 4,
      });
    });

    it("detects brace blocks", () => {
      const source = [
        "class Animal {",
        "  +name",
        "}",
      ].join("\n");

      expect(findRegion(source, "mermaid", "brace")).toMatchObject({
        startLine: 1,
        endLine: 3,
      });
    });
  });

  describe("graphml", () => {
    it("detects node tags", () => {
      const source = [
        "<graphml>",
        "  <graph>",
        "    <node id=\"n1\">",
        "      <data key=\"d0\">value</data>",
        "    </node>",
        "  </graph>",
        "</graphml>",
      ].join("\n");

      expect(findRegion(source, "graphml", "node")).toMatchObject({
        startLine: 3,
        endLine: 5,
      });
    });

    it("detects graph and graphml root tags", () => {
      const source = [
        "<graphml>",
        "  <graph>",
        "    <node id=\"n1\"/>",
        "  </graph>",
        "</graphml>",
      ].join("\n");

      const regions = detectAutoFoldRegions(source, "graphml");
      expect(regions.some((region) => region.label === "graph")).toBe(true);
      expect(regions.some((region) => region.label === "graphml")).toBe(true);
    });

    it("detects nested data and desc tags", () => {
      const source = [
        "<graphml>",
        "  <graph>",
        "    <node id=\"n1\">",
        "      <data key=\"d0\">",
        "        <desc>",
        "          Node description",
        "        </desc>",
        "      </data>",
        "    </node>",
        "  </graph>",
        "</graphml>",
      ].join("\n");

      const regions = detectAutoFoldRegions(source, "graphml");
      expect(regions.some((region) => region.label === "desc")).toBe(true);
      expect(regions.some((region) => region.label === "data")).toBe(true);
    });
  });
});
