# PlantUML use case: instructions for LLM agents

You are writing a PlantUML use-case diagram. Emit the diagram source only.

```plantuml
@startuml
left to right direction
actor Customer as customer
actor Admin as admin

rectangle "Shop" {
  usecase "Place order" as UC1
  usecase "Pay" as UC2
  usecase "Refund" as UC3
}

customer --> UC1
customer --> UC2
UC1 ..> UC2 : <<include>>
admin --> UC3
@enduml
```

Rules:

- Wrap the diagram in `@startuml` / `@enduml`.
- Actors: `actor "Label" as Alias` or `actor Alias`.
- Use cases: `usecase "Label" as Alias`. Put the system's use cases inside `rectangle "System" { ... }`.
- Associations from actors to use cases are `-->`.
- `<<include>>` and `<<extend>>` are dotted: `UC1 ..> UC2 : <<include>>`.
- Direction, when requested: `left to right direction` or `top to bottom direction`.
- Notes: `note right of UC1: text`.
- Match the user's language in actor and use-case labels.
