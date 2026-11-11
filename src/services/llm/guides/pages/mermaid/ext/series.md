[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# series

Grouped or stacked bars by category.

[Scale break and second axis](./series-scale.md) · [Level line and CAGR](./series-analytics.md)

```
series
title Состав
categories Q1, Q2
series Продукт : 80, 90
series Услуги : 50, 60
```

The first line is only `series`. `categories` and at least one `series Name : values` are required. Do not emit xychart.
