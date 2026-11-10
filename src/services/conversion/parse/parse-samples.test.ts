import { describe, expect, it } from "vitest";
import {
  parseActivityMermaid,
  parseFlowchartMermaid,
} from "@/services/conversion/parse/parse-mermaid";
import {
  parseActivityPlantUml,
  parseComponentPlantUml,
} from "@/services/conversion/parse/parse-plantuml";
import { stripSourceComments } from "@/services/conversion/parse/parse-utils";
import {
  MERMAID_ACTIVITY,
  MERMAID_SUBGRAPH,
  PLANTUML_RECTANGLE,
} from "@/services/conversion/__fixtures__/graph-samples";

describe("parse-mermaid", () => {
  it("parses mermaid activity diagrams separately from plantuml syntax", () => {
    const ir = parseActivityMermaid(MERMAID_ACTIVITY, "mermaid");

    expect(ir.kind).toBe("activity");
    expect(ir.nodes.length).toBeGreaterThanOrEqual(3);
    expect(ir.edges.length).toBeGreaterThanOrEqual(2);
  });

  it("parses subgraph declarations into groups", () => {
    const ir = parseFlowchartMermaid(MERMAID_SUBGRAPH, "mermaid");

    expect(ir.groups?.length).toBe(1);
    expect(ir.nodes.some((node) => node.id === "API")).toBe(true);
  });

  it("parses ampersand chains, classDef/class/style colors, and linkStyle", () => {
    const ir = parseFlowchartMermaid(
      `flowchart LR
        A([Start]) --> B[Step 1] & C[(Database)]
        B & C -.->|done| D{{Check}}
        classDef green fill:#dcfce7,stroke:#15803d
        class B green
        style D fill:#fef3c7,stroke:#d97706
        linkStyle 0 stroke:#2563eb`,
      "mermaid",
    );

    expect(ir.nodes.map((n) => n.id).sort()).toEqual(["A", "B", "C", "D"]);
    expect(ir.edges).toHaveLength(4);
    expect(ir.nodes.find((n) => n.id === "B")?.visual).toMatchObject({
      fill: "#dcfce7",
      stroke: "#15803d",
    });
    expect(ir.nodes.find((n) => n.id === "C")?.visual?.shape).toBe("cylinder");
    expect(ir.nodes.find((n) => n.id === "D")?.visual).toMatchObject({
      shape: "hexagon",
      fill: "#fef3c7",
      stroke: "#d97706",
    });
    expect(ir.edges[0]?.color).toBe("#2563eb");
  });
});

describe("parse-plantuml", () => {
  it("parses rectangle and node aliases", () => {
    const ir = parseComponentPlantUml(PLANTUML_RECTANGLE, "plantuml");

    expect(ir.nodes.some((node) => node.label === "Service")).toBe(true);
    expect(ir.nodes.some((node) => node.label === "Worker")).toBe(true);
    expect(ir.edges.length).toBeGreaterThanOrEqual(1);
  });

  it("preserves swimlane #hex lines in stripSourceComments and parses activity fork/if branches", () => {
    const raw = `@startuml
|#E3F2FD|Client|
|#E8F5E9|Server|
|Client|
start
:Open page;
|Server|
if (Cached?) then (yes)
  :Return cache;
else (no)
  :Query DB;
endif
fork
  :Log metric;
fork again
  :Send response;
end fork
stop
@enduml`;
    const cleaned = stripSourceComments(raw);
    expect(cleaned).toContain("|#E3F2FD|Client|");

    const ir = parseActivityPlantUml(cleaned, "plantuml");
    expect(ir.groups?.map((g) => g.label)).toEqual(["Client", "Server"]);
    expect(ir.groups?.[0]?.fill).toBe("#E3F2FD");
    expect(ir.nodes.length).toBe(6);
    expect(ir.edges.length).toBeGreaterThanOrEqual(6);
  });
});
