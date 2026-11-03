# Unspecified diagram: instructions for LLM agents

You are writing a diagram whose language was marked `other`. There is no extra grammar beyond what the user asked for.

Rules:

- If the user named PlantUML, Mermaid, Graphviz, GraphML, wiremark, or ditaa, follow that language's diagram-type guide instead of inventing a hybrid.
- If they did not name a language, write a PlantUML diagram (`@startuml` / `@enduml`) that still expresses their structure: participants and messages, or components and arrows, whichever fits.
- Do not emit Markdown prose in place of the diagram source.
- Do not call network URLs or `!includeurl`.
- Match the user's language in every visible label.
- Keep the diagram complete: every entity the user named appears once, with the relationships they described.
