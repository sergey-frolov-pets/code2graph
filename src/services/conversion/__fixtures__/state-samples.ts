export const PLANTUML_STATE_MINIMAL = `@startuml
[*] --> Idle
Idle --> Done
@enduml`;

export const MERMAID_STATE_MINIMAL = `stateDiagram-v2
  [*] --> Idle
  Idle --> Done`;

export const PLANTUML_STATE_MEDIUM = `@startuml
[*] --> Closed
Closed --> Open : open
Open --> Closed : close
@enduml`;

export const MERMAID_STATE_MEDIUM = `stateDiagram-v2
  [*] --> Closed
  Closed --> Open : open
  Open --> Closed : close`;
