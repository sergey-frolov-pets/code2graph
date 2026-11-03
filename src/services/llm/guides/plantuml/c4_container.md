# PlantUML C4 container: instructions for LLM agents

You are writing a C4 container diagram with the bundled C4-PlantUML library. Emit the diagram source only.

```plantuml
@startuml
!include ./plantuml-lib/C4/C4_Container.puml
!pragma layout smetana
top to bottom direction

Person(customer, "Customer", "Places an order")

System_Boundary(shop, "Shop") {
  Container(web, "Web app", "Vue", "Checkout UI")
  Container(api, "API", "Node", "Orders")
  ContainerDb(db, "Database", "SQL", "Orders")
  ContainerQueue(bus, "Queue", "Orders events")
}

Rel(customer, web, "Uses")
Rel(web, api, "Calls", "JSON/HTTPS")
Rel(api, db, "Reads/writes")
Rel(api, bus, "Publishes")
@enduml
```

Rules:

- Wrap the diagram in `@startuml` / `@enduml`.
- The first include must be exactly `!include ./plantuml-lib/C4/C4_Container.puml`.
- Do not use `!includeurl` or any external URL.
- Put containers inside `System_Boundary(alias, "Label") { ... }`.
- `Container(alias, "Label", "Technology", "Description")`, `ContainerDb(...)`, `ContainerQueue(alias, "Label", "Technology")`.
- Links: `Rel(from, to, "Label")`. Aliases must match the first argument of each element.
- Direction, when requested: `top to bottom direction` or `left to right direction`.
- Match the user's language in labels. Keep technology names as the user wrote them.
