[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# orgchart

A tree of nodes and edges. Alias: org.

```
orgchart
Lead [Lead]
Eng [Engineering]
Lead -> Eng
```

Declare `id [label]`, then edges `A -> B` or dotted `A -.-> B`.

`team id [Label]` draws a frame. `label="…"` is the same as `title="…"`. `team id row` or `team id column` packs that team's cards and nested teams in a row or in a column. A line may cross a team border, but it does not run along that border.
