# Mermaid user journey: instructions for LLM agents

You are writing a Mermaid user-journey diagram. Emit the diagram source only.

```mermaid
journey
    title Checkout
    section Browse
      Open catalog: 5: Customer
      Search: 4: Customer
    section Pay
      Enter card: 2: Customer
      Confirm: 5: Customer, Bank
```

Rules:

- The first line is `journey`.
- `title` describes the journey.
- Group steps with `section Name`.
- A step is `Action: score: Actor`. Score is an integer from 1 to 5.
- Several actors are comma-separated: `Customer, Clerk`.
- Indent sections four spaces and steps six spaces.
- Do not use `flowchart` nodes.
- Match the user's language in the title, sections, actions, and actors.
