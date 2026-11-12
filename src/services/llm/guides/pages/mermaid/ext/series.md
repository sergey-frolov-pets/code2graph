[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# series

Grouped or stacked bars by category.

[Scale break and second axis](./series-scale.md) · [Level line and CAGR](./series-analytics.md)

```
series
%% Столбцы рядом. gap 4 — просвет в пикселях, gap 20% — доля толщины бара.
%% axis y off прячет ось значений и её сетку, axis x off — подписи категорий.
title Состав
categories Q1, Q2
gap 4
series Продукт : 80, 90
series Услуги : 50, 60
```

```
series
%% Стопка столбцов. labels sum пишет сумму частей над столбцом. Ноль не подписывается.
title Состав
stacked
labels sum
categories Q1, Q2
series Продукт : 80, 90
series Услуги : 50, 60
```

```
series
%% Площади между центрами категорий. Пропуск обрывает ленту.
%% Работает вместе с rotate 90, line, break и cagr.
title Состав площадями
stacked area
labels sum
gap 12%
categories Q1, Q2, Q3
series Продукт : 80, 90, 70
series Услуги : 50, 60, 55
```

The first line is only `series`. `categories` and at least one `series Name : values` are required. Do not emit xychart. `stacked` is columns. `stacked area` is a separate filled-band chart. `labels sum` may sit with `above` or `inside`.
