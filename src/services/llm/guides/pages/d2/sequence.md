[Types](./index.md) · [Shared rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# d2 sequence

A sequence is a shape with `shape: sequence_diagram`.

```
direction: right
checkout: {
  shape: sequence_diagram
  buyer: User
  shop: Shop
  buyer -> shop: order
}
```
