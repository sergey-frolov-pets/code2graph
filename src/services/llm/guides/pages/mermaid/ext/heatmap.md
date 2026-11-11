[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# heatmap

A matrix colored by a scale. Alias: heat-map.

```
heatmap
title Нагрузка
x Пн, Вт, Ср
y Утро, День
data
Утро : 20, 35, 50
День : 60, 75, 85
```

`x` and `y` label lists and a `data` block are required. Each data row has one number per x label.
