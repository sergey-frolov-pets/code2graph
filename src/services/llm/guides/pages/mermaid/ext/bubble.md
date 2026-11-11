[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# bubble

Points placed by x, y, and size. Alias: bubblechart.

```
bubble
title BCG
x "Доля" 0 --> 10
y "Рост" 0 --> 30
size "Выручка"
data
A : x=8, y=22, size=40, group=Software
B : x=2, y=4, size=10, group=Hardware
```

`x` and `y` axes and a `data` block are required. Keys stay in the order x, y, size, then optional group.
