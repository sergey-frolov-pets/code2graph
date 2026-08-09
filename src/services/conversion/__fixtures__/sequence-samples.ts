export const PLANTUML_SEQUENCE_MINIMAL = `@startuml
actor A
A -> B: hi
@enduml`;

export const MERMAID_SEQUENCE_MINIMAL = `sequenceDiagram
  participant A
  participant B
  A ->> B: hi`;

export const PLANTUML_SEQUENCE_MEDIUM = `@startuml
actor User
participant API as "Backend"
User ->> API: request
API --> User: response
@enduml`;

export const MERMAID_SEQUENCE_MEDIUM = `sequenceDiagram
  actor User
  participant API as "Backend"
  User ->> API: request
  API -->> User: response`;
