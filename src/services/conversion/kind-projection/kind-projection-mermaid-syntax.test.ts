// @vitest-environment jsdom

import mermaid from "mermaid";
import { describe, expect, it } from "vitest";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramKind } from "@/services/conversion/diagram-ir";
import { convertDiagram } from "@/services/conversion/pipeline/convert-diagram";

interface ProjectionSyntaxCase {
  title: string;
  source: string;
  sourceFormat: DiagramFormat;
  targetKind: DiagramKind;
}

const PROJECTION_SYNTAX_CASES: ProjectionSyntaxCase[] = [
  {
    title: "class with inheritance → ER",
    source: `@startuml
class Customer {
  +id: int
  +email: string
}
class Order {
  +customerId: int
}
Customer "1" -- "*" Order : places
Customer <|-- Vip
@enduml`,
    sourceFormat: "plantuml",
    targetKind: "er",
  },
  {
    title: "flowchart with a retry loop → state",
    source: `flowchart TD
  A([Start]) --> B[Fill form]
  B --> C{Valid?}
  C -->|yes| D[Save]
  C -->|no| E[Show error]
  E --> B
  D --> G([Done])`,
    sourceFormat: "mermaid",
    targetKind: "state",
  },
  {
    title: "tree flowchart → mindmap",
    source: "flowchart TD\n  A[Product] --> B[Frontend]\n  A --> C[Backend]\n  C --> D[DB]",
    sourceFormat: "mermaid",
    targetKind: "mindmap",
  },
  {
    title: "flowchart → sequence",
    source: "flowchart TD\n  A[Product] --> B[Frontend]\n  A --> C[Backend]",
    sourceFormat: "mermaid",
    targetKind: "sequence",
  },
  {
    title: "flowchart → C4 containers",
    source: "flowchart LR\n  U[User] --> W[Web app]\n  W --> DB[(Orders DB)]",
    sourceFormat: "mermaid",
    targetKind: "c4_container",
  },
  {
    title: "sequence → flowchart",
    source: "@startuml\nactor User\nparticipant Api\nUser -> Api : login\nApi --> User : token\n@enduml",
    sourceFormat: "plantuml",
    targetKind: "graph",
  },
  {
    title: "state machine with final state → flowchart",
    source: "@startuml\n[*] --> Idle\nIdle --> Running : start\nRunning --> [*]\n@enduml",
    sourceFormat: "plantuml",
    targetKind: "graph",
  },
  {
    title: "pie → xy chart",
    source: 'pie showData\n    title Budget\n    "Dev team" : 60\n    "Ops" : 40',
    sourceFormat: "mermaid",
    targetKind: "xychart",
  },
  {
    title: "xy chart → pie",
    source: "xychart-beta\n    x-axis [a, b]\n    bar [3, 5]",
    sourceFormat: "mermaid",
    targetKind: "pie",
  },
  {
    title: "gantt → timeline",
    source: "gantt\ntitle Plan\ndateFormat YYYY-MM-DD\nsection Build\nDesign :a1, 2026-01-05, 3d\nCode :a2, after a1, 5d",
    sourceFormat: "mermaid",
    targetKind: "timeline",
  },
  {
    title: "timeline → gantt",
    source: "timeline\n    title History\n    2021 : Launch\n    2022 : Growth",
    sourceFormat: "mermaid",
    targetKind: "gantt",
  },
  {
    title: "journey → timeline",
    source: "journey\n  title Day\n  section Morning\n    Coffee: 5: Me\n    Commute: 2: Me",
    sourceFormat: "mermaid",
    targetKind: "timeline",
  },
  {
    title: "ER → class",
    source: "erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  CUSTOMER {\n    int id PK\n    string name\n  }",
    sourceFormat: "mermaid",
    targetKind: "class",
  },
  {
    title: "PlantUML mindmap → flowchart",
    source: "@startmindmap\n* Root\n** A\n*** A1\n** B\n@endmindmap",
    sourceFormat: "plantuml",
    targetKind: "graph",
  },
];

describe("projected Mermaid output is accepted by the Mermaid parser", () => {
  mermaid.initialize({ startOnLoad: false });

  for (const projectionCase of PROJECTION_SYNTAX_CASES) {
    it(projectionCase.title, async () => {
      const result = await convertDiagram({
        source: projectionCase.source,
        sourceFormat: projectionCase.sourceFormat,
        targetFormat: "mermaid",
        targetKind: projectionCase.targetKind,
        mode: "source",
        locale: "en",
      });

      expect(result.ok).toBe(true);
      await expect(mermaid.parse(result.targetSource!)).resolves.toBeTruthy();
    });
  }
});
