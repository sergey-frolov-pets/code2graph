[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# gauge

A needle from a minimum to a maximum. The minimum defaults to 0.

```
gauge
title Загрузка
min 0
max 100
value 72
```

`max` and `value` are required. The needle position is `(value - min) / (max - min)`.
