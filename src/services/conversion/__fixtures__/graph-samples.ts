export const PLANTUML_GRAPH = `@startuml
[Alice] --> [Bob]
@enduml`;

export const MERMAID_GRAPH = `flowchart LR
  Alice --> Bob`;

export const MERMAID_ACTIVITY = `flowchart TD
  A[Start]
  B[Process]
  C[End]
  A --> B
  B --> C`;

export const PLANTUML_RECTANGLE = `@startuml
rectangle "Service" as S1
node "Worker" as W1
[S1] --> [W1]
@enduml`;

export const MERMAID_SUBGRAPH = `flowchart TB
  subgraph backend [Backend]
    API[API]
    DB[(Database)]
  end
  API --> DB`;
