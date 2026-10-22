import { describe, expect, it } from "vitest";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramKind } from "@/services/conversion/diagram-ir";
import { getTargetKindOptions } from "@/services/conversion/conversion-route";
import { convertDiagram } from "@/services/conversion/pipeline/convert-diagram";
import { safeParseSourceToIr } from "@/services/conversion/parse/parse-source-to-ir";

const PLANTUML_CLASS_WITH_FIELDS = `@startuml
class Customer {
  +id: int
  +email: string
  +notify(): void
}
class Order {
  +id: int
  +customerId: int
}
Customer "1" -- "*" Order : places
@enduml`;

const MERMAID_DECISION_FLOW = `flowchart TD
  A([Start]) --> B[Fill form]
  B --> C{Valid?}
  C -->|yes| D[Save]
  C -->|no| E[Show error]
  D --> F[Notify]
  E --> F
  F --> G([Done])`;

const MERMAID_TREE_GRAPH = `flowchart TD
  P[Product] --> F[Frontend]
  P --> B[Backend]
  B --> DB[Database]
  F --> UI[UI kit]`;

const PLANTUML_LOGIN_SEQUENCE = `@startuml
actor User
participant Api
database Store
User -> Api : login
Api -> Store : query
Store --> Api : row
Api --> User : token
@enduml`;

const PLANTUML_STATE_MACHINE = `@startuml
[*] --> Idle
Idle --> Running : start
Running --> Idle : stop
Running --> [*]
@enduml`;

async function convertToKind(
  source: string,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
  targetKind: DiagramKind,
) {
  return convertDiagram({ source, sourceFormat, targetFormat, targetKind, mode: "source", locale: "en" });
}

describe("target diagram kind options", () => {
  it("offers the source kind first, then relevant projections native to the format", () => {
    const kinds = getTargetKindOptions(PLANTUML_CLASS_WITH_FIELDS, "plantuml", "mermaid").map(
      (option) => option.kind,
    );
    expect(kinds[0]).toBe("class");
    expect(kinds).toContain("er");
    expect(kinds).toContain("graph");
    expect(kinds).not.toContain("sequence");
  });

  it("offers same-format kind changes", () => {
    const kinds = getTargetKindOptions(MERMAID_DECISION_FLOW, "mermaid", "mermaid").map(
      (option) => option.kind,
    );
    expect(kinds).toEqual(expect.arrayContaining(["activity", "state", "sequence", "mindmap"]));
    expect(kinds).not.toContain("graph");
  });

  it("limits graphml targets to graph", () => {
    const kinds = getTargetKindOptions(PLANTUML_STATE_MACHINE, "plantuml", "graphml").map(
      (option) => option.kind,
    );
    expect(kinds.every((kind) => kind === "state" || kind === "graph")).toBe(true);
  });

  it("blocks irrelevant kind changes", async () => {
    const result = await convertToKind(PLANTUML_CLASS_WITH_FIELDS, "plantuml", "mermaid", "sequence");
    expect(result.ok).toBe(false);
    expect(result.blocked).toBe(true);
  });
});

describe("kind projections", () => {
  it("converts a class diagram into an ER diagram with attributes and crow's foot cardinality", async () => {
    const result = await convertToKind(PLANTUML_CLASS_WITH_FIELDS, "plantuml", "mermaid", "er");

    expect(result.ok).toBe(true);
    expect(result.report.kind).toBe("class");
    expect(result.report.targetKind).toBe("er");
    expect(result.targetSource).toContain("erDiagram");
    expect(result.targetSource).toContain("int id PK");
    expect(result.targetSource).toContain("int customerId FK");
    expect(result.targetSource).not.toContain("notify");
    expect(result.targetSource).toMatch(/Customer \|\|--o\{ Order : "places"/);
    expect(safeParseSourceToIr(result.targetSource!, "mermaid").ir?.kind).toBe("er");
  });

  it("rebuilds if/else branches when a flowchart becomes a PlantUML activity diagram", async () => {
    const result = await convertToKind(MERMAID_DECISION_FLOW, "mermaid", "plantuml", "activity");

    expect(result.ok).toBe(true);
    const source = result.targetSource!;
    expect(source).toContain("if (Valid?) then (yes)");
    expect(source).toContain("else (no)");
    expect(source).toContain("endif");
    expect(source.indexOf("endif")).toBeLessThan(source.indexOf(":Notify;"));
    expect(source.match(/:Notify;/g)).toHaveLength(1);
    expect(source).toMatch(/start[\s\S]*stop/);
  });

  it("recognizes a retry loop as repeat/backward instead of dropping the branch", async () => {
    const result = await convertToKind(
      `flowchart TD
  A[Fill form] --> B{Valid?}
  B -->|yes| C[Save]
  B -->|no| D[Show error]
  D --> A`,
      "mermaid",
      "plantuml",
      "activity",
    );

    expect(result.ok).toBe(true);
    const source = result.targetSource!;
    expect(source).toMatch(/repeat\n:Fill form;\nbackward:Show error;\nrepeat while \(Valid\?\) is \(no\) not \(yes\)\n:Save;/);
  });

  it("recognizes a loop back to the decision as while/endwhile", async () => {
    const result = await convertToKind(
      `flowchart TD
  A[Open queue] --> B{More items?}
  B -->|yes| C[Process item]
  C --> B
  B -->|no| D[Close queue]`,
      "mermaid",
      "plantuml",
      "activity",
    );

    expect(result.ok).toBe(true);
    const source = result.targetSource!;
    expect(source).toMatch(/while \(More items\?\) is \(yes\)\n {2}:Process item;\nendwhile \(no\)\n:Close queue;/);
  });

  it("turns a flowchart into a state machine with initial and final markers", async () => {
    const result = await convertToKind(MERMAID_DECISION_FLOW, "mermaid", "mermaid", "state");

    expect(result.ok).toBe(true);
    const source = result.targetSource!;
    expect(source).toContain("stateDiagram-v2");
    expect(source).toContain("[*] --> B");
    expect(source).toContain("F --> [*]");
    expect(source).toContain("state C <<choice>>");
    expect(source).not.toMatch(/\bA\b --> /);
  });

  it("builds a nested mindmap hierarchy from a tree-shaped graph", async () => {
    const result = await convertToKind(MERMAID_TREE_GRAPH, "mermaid", "plantuml", "mindmap");

    expect(result.ok).toBe(true);
    const source = result.targetSource!;
    expect(source).toContain("@startmindmap");
    expect(source).toContain("* Product");
    expect(source).toContain("** Frontend");
    expect(source).toContain("*** UI kit");
    expect(source).toContain("*** Database");
    expect(source.indexOf("** Frontend")).toBeLessThan(source.indexOf("*** UI kit"));
    expect(source.indexOf("*** UI kit")).toBeLessThan(source.indexOf("** Backend"));
  });

  it("numbers sequence messages when projecting to a graph", async () => {
    const result = await convertToKind(PLANTUML_LOGIN_SEQUENCE, "plantuml", "mermaid", "graph");

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain("flowchart");
    expect(result.targetSource).toContain("|1. login|");
    expect(result.targetSource).toContain("|4. token|");
  });

  it("maps sequence messages to activity steps in sender swimlanes", async () => {
    const result = await convertToKind(PLANTUML_LOGIN_SEQUENCE, "plantuml", "plantuml", "activity");

    expect(result.ok).toBe(true);
    const source = result.targetSource!;
    expect(source).toContain("|User|");
    expect(source).toContain("|Api|");
    expect(source).toContain(":login → Api;");
    expect(source).toContain(":token → User;");
  });

  it("materializes state markers as start/end nodes in a flowchart", async () => {
    const result = await convertToKind(PLANTUML_STATE_MACHINE, "plantuml", "mermaid", "graph");

    expect(result.ok).toBe(true);
    const source = result.targetSource!;
    expect(source).toContain('start(["Start"])');
    expect(source).toContain('end_node(["End"])');
    expect(source).toContain("start --> Idle");
    expect(source).toContain("Running --> end_node");
  });

  it("orders graph participants by flow when projecting to a sequence diagram", async () => {
    const result = await convertToKind(MERMAID_TREE_GRAPH, "mermaid", "plantuml", "sequence");

    expect(result.ok).toBe(true);
    const source = result.targetSource!;
    expect(source).toContain('participant "Product" as P');
    expect(source.indexOf("as P")).toBeLessThan(source.indexOf("as F"));
    expect(source.indexOf("P -> F")).toBeLessThan(source.indexOf("B -> DB"));
  });

  it("converts pie slices into an xy bar chart", async () => {
    const result = await convertToKind(
      'pie showData\n    title Budget\n    "Dev team" : 60\n    "Ops" : 40',
      "mermaid",
      "mermaid",
      "xychart",
    );

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain('x-axis ["Dev team", Ops]');
    expect(result.targetSource).toContain("bar [60, 40]");
    expect(result.targetSource).toContain("0 --> 66");
  });

  it("converts gantt tasks into a timeline", async () => {
    const result = await convertToKind(
      "gantt\ntitle Plan\ndateFormat YYYY-MM-DD\nsection Build\nDesign :a1, 2026-01-05, 3d\nCode :a2, after a1, 5d",
      "mermaid",
      "mermaid",
      "timeline",
    );

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain("timeline");
    expect(result.targetSource).toContain("Design");
    expect(result.targetSource).toContain("Code");
  });

  it("keeps the source kind when no target kind is requested", async () => {
    const result = await convertDiagram({
      source: PLANTUML_CLASS_WITH_FIELDS,
      sourceFormat: "plantuml",
      targetFormat: "mermaid",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain("classDiagram");
    expect(result.report.targetKind).toBe("class");
  });
});
