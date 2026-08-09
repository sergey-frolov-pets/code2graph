// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { convertDiagram } from "@/services/conversion/pipeline/convert-diagram";
import { safeParseSourceToIr } from "@/services/conversion/parse/parse-source-to-ir";
import {
  MERMAID_GRAPH,
  MERMAID_SUBGRAPH,
  PLANTUML_GRAPH,
} from "@/services/conversion/__fixtures__/graph-samples";

describe("convertDiagram", () => {
  it("converts plantuml graph to mermaid", async () => {
    const result = await convertDiagram({
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

  it("converts mermaid graph to plantuml", async () => {
    const result = await convertDiagram({
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

  it("blocks gantt to graphml", async () => {
    const result = await convertDiagram({
      source: "@startgantt\n[Task] lasts 1 day\n@endgantt",
      sourceFormat: "plantuml",
      targetFormat: "graphml",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
  });

  it("converts mermaid flowchart with stadium nodes to plantuml", async () => {
    const result = await convertDiagram({
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

  it("converts graphml with multiline node labels to valid plantuml", async () => {
    const result = await convertDiagram({
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

  it("converts mermaid activity diagram to plantuml", async () => {
    const result = await convertDiagram({
      source: `|Lane|
A[Start]
B[Process]
A --> B`,
      sourceFormat: "mermaid",
      targetFormat: "plantuml",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain(":Start;");
    expect(result.targetSource).toContain(":Process;");
  });

  it("converts mermaid pie to plantuml with loss", async () => {
    const result = await convertDiagram({
      source: `pie showData
    title Distribution
    "Slice A" : 40
    "Slice B" : 30
    "Slice C" : 30`,
      sourceFormat: "mermaid",
      targetFormat: "plantuml",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain("@startuml");
    expect(result.targetSource).toContain("Slice A");
  });

  it("converts plantuml mindmap to mermaid mindmap", async () => {
    const result = await convertDiagram({
      source: `@startmindmap
* Root topic
** Branch 1
*** Sub 1
@endmindmap`,
      sourceFormat: "plantuml",
      targetFormat: "mermaid",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain("mindmap");
    expect(result.targetSource).toContain("Root topic");
    expect(result.targetSource).toContain("Branch 1");
  });

  it("converts plantuml er to mermaid er", async () => {
    const result = await convertDiagram({
      source: `@startuml
entity Customer {
  * id : int
}
entity Order
Customer ||--o{ Order
@enduml`,
      sourceFormat: "plantuml",
      targetFormat: "mermaid",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain("erDiagram");
    expect(result.targetSource).toContain("Customer");
    expect(result.targetSource).toContain("Order");
  });

  it("blocks same-format conversion for sankey", async () => {
    const result = await convertDiagram({
      source: `sankey-beta
    Source,Target,10
    Target,End,5`,
      sourceFormat: "mermaid",
      targetFormat: "mermaid",
      mode: "source",
      locale: "en",
    });

    expect(result.blocked).toBe(true);
  });

  it("blocks invalid graphml input safely", async () => {
    const result = await convertDiagram({
      source: "<graphml><broken>",
      sourceFormat: "graphml",
      targetFormat: "plantuml",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
  });

  it("blocks visual-only conversion for sequence diagrams", async () => {
    const result = await convertDiagram({
      source: "@startuml\nactor A\nA -> B: hi\n@enduml",
      sourceFormat: "plantuml",
      targetFormat: "mermaid",
      mode: "visual",
      previewSvg: "<svg></svg>",
      locale: "en",
    });

    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
  });
});

describe("graph triangle round-trip", () => {
  const routes = [
    { source: PLANTUML_GRAPH, sourceFormat: "plantuml" as const, targetFormat: "mermaid" as const },
    { source: PLANTUML_GRAPH, sourceFormat: "plantuml" as const, targetFormat: "graphml" as const },
    { source: MERMAID_GRAPH, sourceFormat: "mermaid" as const, targetFormat: "plantuml" as const },
    { source: MERMAID_GRAPH, sourceFormat: "mermaid" as const, targetFormat: "graphml" as const },
  ];

  for (const route of routes) {
    it(`converts ${route.sourceFormat} → ${route.targetFormat} and back to nodes`, async () => {
      const forward = await convertDiagram({
        source: route.source,
        sourceFormat: route.sourceFormat,
        targetFormat: route.targetFormat,
        mode: "source",
        locale: "en",
      });

      expect(forward.ok).toBe(true);
      expect(forward.targetSource).toBeTruthy();

      const parsed = safeParseSourceToIr(
        forward.targetSource!,
        route.targetFormat,
      );
      expect(parsed.ir?.nodes.some((node) => node.label.includes("Alice"))).toBe(
        true,
      );
      expect(parsed.ir?.nodes.some((node) => node.label.includes("Bob"))).toBe(
        true,
      );
      expect(parsed.ir?.edges.length).toBeGreaterThanOrEqual(1);
    });
  }

  it("preserves subgraph groups when converting mermaid to plantuml", async () => {
    const result = await convertDiagram({
      source: MERMAID_SUBGRAPH,
      sourceFormat: "mermaid",
      targetFormat: "plantuml",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain('package "Backend"');
    expect(result.targetSource).toContain("API");
    expect(result.targetSource).toContain("Database");
  });
});
