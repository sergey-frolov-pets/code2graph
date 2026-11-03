# PlantUML C4 context: instructions for LLM agents

You are writing a C4 system-context diagram with the bundled C4-PlantUML library. Emit the diagram source only.

```plantuml
@startuml
!include ./plantuml-lib/C4/C4_Context.puml
!pragma layout smetana
top to bottom direction

Person(customer, "Customer", "Places an order")
System(shop, "Shop", "Checkout")
System_Ext(bank, "Bank", "Card payments")

Rel(customer, shop, "Uses")
Rel(shop, bank, "Charges", "HTTPS")
@enduml
```

Rules:

- Wrap the diagram in `@startuml` / `@enduml`.
- The first include must be exactly `!include ./plantuml-lib/C4/C4_Context.puml`.
- Do not use `!includeurl`, `https://` includes, or `!include <C4/C4_Context>`.
- Elements: `Person(alias, "Label", "Description")`, `System(alias, "Label", "Description")`, `System_Ext(alias, "Label", "Description")`.
- Links: `Rel(from, to, "Label")` or `Rel(from, to, "Label", "Technology")`.
- Optional boundary: `System_Boundary(alias, "Label") { ... }`.
- Aliases are identifiers (letters, digits, underscore). Visible text goes in the quoted arguments.
- One central system. Every actor and external system needs at least one `Rel`.
- Direction, when requested: `top to bottom direction` or `left to right direction`.
- Match the user's language in labels and descriptions.
