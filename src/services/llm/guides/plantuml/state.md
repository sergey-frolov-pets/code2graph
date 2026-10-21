# PlantUML state: instructions for LLM agents

You are writing a PlantUML state diagram. Emit the diagram source only.

```plantuml
@startuml
!pragma layout smetana
top to bottom direction

state "Draft" as Draft
state "Paid" as Paid
state "Shipped" as Shipped

[*] --> Draft
Draft --> Paid : pay
Paid --> Shipped : ship
Shipped --> [*]

state choice1 <<choice>>
Paid --> choice1
choice1 --> Shipped : in stock
choice1 --> Draft : cancel
@enduml
```

Rules:

- Wrap the diagram in `@startuml` / `@enduml`.
- Declare named states before transitions when the label has spaces or punctuation: `state "Label" as Alias`.
- The start and end pseudostates are `[*]`.
- A transition is `From --> To` or `From --> To : event`.
- Composite states: `state Name { ... }`.
- Choice: `state alias <<choice>>`. Fork / join: `<<fork>>` and `<<join>>`.
- History: `<<history>>` or `<<deepHistory>>`.
- Notes: `note right of Alias: text`.
- Direction, when requested: `top to bottom direction` or `left to right direction`.
- Do not use Mermaid `stateDiagram-v2` keywords.
- Match the user's language in every visible label. Keep aliases ASCII.
