import type { BuiltinSnippet } from "@/types/snippets";

export const MERMAID_BUILTIN_SNIPPETS: BuiltinSnippet[] = [
  // flowchart
  {
    id: "mermaid-flowchart-basic",
    language: "mermaid",
    categoryId: "flowchart",
    titleKey: "snippets.builtin.mermaidFlowchartBasic",
    descriptionKey: "snippets.builtin.mermaidFlowchartBasicDesc",
    content: `flowchart TD
  Start([Start]) --> Check{Valid?}
  Check -->|Yes| Run[Process]
  Check -->|No| Reject[Reject]`,
  },
  {
    id: "mermaid-flowchart-subgraph",
    language: "mermaid",
    categoryId: "flowchart",
    titleKey: "snippets.builtin.mermaidFlowchartSubgraph",
    descriptionKey: "snippets.builtin.mermaidFlowchartSubgraphDesc",
    content: `subgraph Backend ["Backend"]
  API[API] --> DB[(Database)]
end`,
  },
  {
    id: "mermaid-flowchart-shapes",
    language: "mermaid",
    categoryId: "flowchart",
    titleKey: "snippets.builtin.mermaidFlowchartShapes",
    descriptionKey: "snippets.builtin.mermaidFlowchartShapesDesc",
    content: `A[Rectangle] --> B(Rounded)
B --> C([Stadium])
C --> D[(Cylinder)]
D --> E{Diamond}`,
  },

  // sequence
  {
    id: "mermaid-sequence-basic",
    language: "mermaid",
    categoryId: "sequence",
    titleKey: "snippets.builtin.mermaidSequenceBasic",
    descriptionKey: "snippets.builtin.mermaidSequenceBasicDesc",
    content: `sequenceDiagram
  actor User
  participant API
  participant DB
  User->>API: Request
  API->>DB: Query
  DB-->>API: Result
  API-->>User: Response`,
  },
  {
    id: "mermaid-sequence-alt-loop",
    language: "mermaid",
    categoryId: "conditional",
    titleKey: "snippets.builtin.mermaidSequenceAltLoop",
    descriptionKey: "snippets.builtin.mermaidSequenceAltLoopDesc",
    content: `alt Cached
  API-->>User: 200 OK
else Miss
  loop Retry
    API->>DB: Fetch
  end
end`,
  },
  {
    id: "mermaid-sequence-note",
    language: "mermaid",
    categoryId: "notes",
    titleKey: "snippets.builtin.mermaidSequenceNote",
    descriptionKey: "snippets.builtin.mermaidSequenceNoteDesc",
    content: `Note over User,API: Authenticated session
Note right of API: Validate payload`,
  },

  // classes
  {
    id: "mermaid-class-diagram",
    language: "mermaid",
    categoryId: "classes",
    titleKey: "snippets.builtin.mermaidClassDiagram",
    descriptionKey: "snippets.builtin.mermaidClassDiagramDesc",
    content: `classDiagram
  class User {
    +int id
    +string email
    +login() bool
  }
  class Order {
    +int id
    +decimal total
  }
  User "1" --> "*" Order : places`,
  },

  // state
  {
    id: "mermaid-state-diagram",
    language: "mermaid",
    categoryId: "state",
    titleKey: "snippets.builtin.mermaidStateDiagram",
    descriptionKey: "snippets.builtin.mermaidStateDiagramDesc",
    content: `stateDiagram-v2
  [*] --> Idle
  Idle --> Active : start
  Active --> Done : finish
  Done --> [*]`,
  },

  // er
  {
    id: "mermaid-er-diagram",
    language: "mermaid",
    categoryId: "er",
    titleKey: "snippets.builtin.mermaidErDiagram",
    descriptionKey: "snippets.builtin.mermaidErDiagramDesc",
    content: `erDiagram
  USER ||--o{ ORDER : places
  USER {
    int id PK
    string email UK
  }
  ORDER {
    int id PK
    int user_id FK
  }`,
  },

  // gantt
  {
    id: "mermaid-gantt",
    language: "mermaid",
    categoryId: "gantt",
    titleKey: "snippets.builtin.mermaidGantt",
    descriptionKey: "snippets.builtin.mermaidGanttDesc",
    content: `gantt
  title Release Plan
  dateFormat YYYY-MM-DD
  section Core
    Design :a1, 2026-01-01, 5d
    Build  :after a1, 10d
    Launch :milestone, 2026-01-20, 0d`,
  },

  // mindmap
  {
    id: "mermaid-mindmap",
    language: "mermaid",
    categoryId: "mindmap",
    titleKey: "snippets.builtin.mermaidMindmap",
    descriptionKey: "snippets.builtin.mermaidMindmapDesc",
    content: `mindmap
  root((Roadmap))
    Research
      Interviews
      Metrics
    Delivery
      MVP
      GA`,
  },

  // c4 & architecture
  {
    id: "mermaid-c4-context",
    language: "mermaid",
    categoryId: "c4",
    titleKey: "snippets.builtin.mermaidC4Context",
    descriptionKey: "snippets.builtin.mermaidC4ContextDesc",
    content: `C4Context
  title System Context
  Person(user, "User", "Customer")
  System(app, "Platform", "Core service")
  Rel(user, app, "Uses", "HTTPS")`,
  },
  {
    id: "mermaid-architecture",
    language: "mermaid",
    categoryId: "architecture",
    titleKey: "snippets.builtin.mermaidArchitecture",
    descriptionKey: "snippets.builtin.mermaidArchitectureDesc",
    content: `architecture-beta
  group cloud(cloud)[Cloud]
  service api(server)[API] in cloud
  service db(database)[DB] in cloud
  api:R --> L:db`,
  },

  // charts
  {
    id: "mermaid-pie-chart",
    language: "mermaid",
    categoryId: "charts",
    titleKey: "snippets.builtin.mermaidPieChart",
    descriptionKey: "snippets.builtin.mermaidPieChartDesc",
    content: `pie showData
  title Traffic Share
  "Direct" : 45
  "Search" : 35
  "Referral" : 20`,
  },
  {
    id: "mermaid-xychart",
    language: "mermaid",
    categoryId: "charts",
    titleKey: "snippets.builtin.mermaidXyChart",
    descriptionKey: "snippets.builtin.mermaidXyChartDesc",
    content: `xychart-beta
  title "Monthly Revenue"
  x-axis [Q1, Q2, Q3, Q4]
  y-axis "USD (k)" 0 --> 120
  bar [40, 65, 85, 110]
  line [35, 60, 80, 105]`,
  },
  {
    id: "mermaid-gitgraph",
    language: "mermaid",
    categoryId: "charts",
    titleKey: "snippets.builtin.mermaidGitGraph",
    descriptionKey: "snippets.builtin.mermaidGitGraphDesc",
    content: `gitGraph
  commit id: "init"
  branch feature
  checkout feature
  commit id: "feat"
  checkout main
  merge feature`,
  },
  {
    id: "mermaid-timeline",
    language: "mermaid",
    categoryId: "charts",
    titleKey: "snippets.builtin.mermaidTimeline",
    descriptionKey: "snippets.builtin.mermaidTimelineDesc",
    content: `timeline
  title Product Milestones
  2025 : Alpha : Beta
  2026 : Public Launch : Enterprise`,
  },

  // styles
  {
    id: "mermaid-classdef-style",
    language: "mermaid",
    categoryId: "styles",
    titleKey: "snippets.builtin.mermaidClassDefStyle",
    descriptionKey: "snippets.builtin.mermaidClassDefStyleDesc",
    content: `classDef accent fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#0f172a;
class API,Worker accent;`,
  },
];
