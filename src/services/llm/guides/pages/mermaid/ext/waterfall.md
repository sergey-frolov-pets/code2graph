[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# waterfall

How a starting number becomes a total through plus and minus steps.

[Scale, labels, font](./waterfall-scale.md) · [Several scenarios and colors](./waterfall-series.md)

```
waterfall
%% axis y off прячет ось значений и сетку. axis x off прячет подписи колонок.
%% grid off прячет только сетку. gap задаёт просвет: 12 пикселей или 20%.
%% labels fontcolor auto красит подпись контрастом: внутри бара по заливке, снаружи по холсту. labels fontcolor #1f2328 задаёт свой цвет.
title Выручка 2026
y "млн" 0 --> 120
=40 : Q1
+15 : Q2
+20 : Q3
=75 : Итог
```

The first data row must be `=N : label`. `+` and `-` are steps. Do not emit a flowchart. There is no second axis and no separate stack total.
