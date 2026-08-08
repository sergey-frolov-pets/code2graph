// @vitest-environment jsdom

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

  it("converts mermaid flowchart with stadium nodes to plantuml", () => {
    const result = convertDiagram({
      source: `flowchart TD
  A([Старт])
  N1[Узел 1]
  N2[Узел 2]
  N3[Узел 3]
  N4[Узел 4]
  Z([Готово])
  A --> N1
  N1 --> N2
  N2 --> N3
  N3 --> N4
  N4 --> Z`,
      sourceFormat: "mermaid",
      targetFormat: "plantuml",
      mode: "source",
      locale: "ru",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain("[Старт] as A");
    expect(result.targetSource).toContain("[Готово] as Z");
    expect(result.targetSource).not.toContain("[[Старт]]");
    expect(result.targetSource).not.toContain("[[Готово]]");
  });

  it("converts graphml with multiline node labels to valid plantuml", () => {
    const result = convertDiagram({
      source: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="d0" for="node" attr.name="label" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="n0">
      <data key="d0">Support
required outside
of RCA</data>
    </node>
    <node id="n1">
      <data key="d0">Unconventional
/ SDN</data>
    </node>
    <node id="n4">
      <data key="d0">GO</data>
    </node>
    <edge source="n0" target="n4">
      <data key="d0">Yes</data>
    </edge>
  </graph>
</graphml>`,
      sourceFormat: "graphml",
      targetFormat: "plantuml",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain(
      'rectangle "Support required outside of RCA" as n0',
    );
    expect(result.targetSource).toContain(
      'rectangle "Unconventional / SDN" as n1',
    );
    expect(result.targetSource).toContain("[GO] as n4");
    expect(result.targetSource).not.toMatch(
      /\[(?:[^\]]*\n)+[^\]]*\] as /,
    );
  });
});
