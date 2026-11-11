[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# voronoi

Regions around sites. Alias: voronoi-diagram.

```
voronoi
title Склады
x "Запад — Восток" 0 --> 100
y "Юг — Север" 0 --> 100
data
Север : x=48, y=82, group=Магистраль
Запад : x=20, y=54, group=Регион
```

`x`, `y`, and a `data` block are required. Each site has `x` and `y`.
