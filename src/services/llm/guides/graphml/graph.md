# GraphML graph: instructions for LLM agents

You are writing a GraphML graph. Emit the XML document only.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="d0" for="node" attr.name="label" attr.type="string"/>
  <key id="d1" for="edge" attr.name="label" attr.type="string"/>
  <graph edgedefault="directed">
    <node id="n1">
      <data key="d0">User</data>
    </node>
    <node id="n2">
      <data key="d0">API</data>
    </node>
    <edge source="n1" target="n2">
      <data key="d1">calls</data>
    </edge>
  </graph>
</graphml>
```

Rules:

- The root is `graphml` with `xmlns="http://graphml.graphdrawing.org/xmlns"`.
- Declare keys before the graph. Node labels use a `for="node"` key. Edge labels use a `for="edge"` key.
- `edgedefault` is `directed` or `undirected`.
- Every `node` has a unique `id`. Every `edge` `source` and `target` refers to an existing node id.
- The visible label is the text of `<data key="...">`, not the id.
- A cluster is a node that contains a nested `<graph edgedefault="directed">`.
- Escape XML: `&amp;`, `&lt;`, `&gt;`.
- Do not wrap the document in Markdown fences or PlantUML tags.
- Match the user's language in label text. Keep ids ASCII (`n1`, `e1`).
