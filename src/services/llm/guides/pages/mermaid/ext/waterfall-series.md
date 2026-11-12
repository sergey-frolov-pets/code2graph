[Waterfall](./waterfall.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# waterfall scenarios

Several scenarios side by side, connectors, and bar colors.

```
waterfall
title Два сценария
y "млн" 0 --> 150
series Базовый
=50 : Старт
+30 : Рост
=80 : Итог
series Оптимистичный
=50 : Старт
+45 : Рост
=95 : Итог
```

```
waterfall
%% gap 16% — доля пустого места между барами сценариев. gap 8 — то же в пикселях.
title Два сценария
gap 16%
y "млн" 0 --> 150
series Базовый
=50 : Старт
+30 : Рост
series Оптимистичный
=50 : Старт
+45 : Рост
```

`series <name>` starts a group. `colors total=#hex increase=#hex decrease=#hex` recolors bars. `connectors off` hides the links between bars. `gap` sets the space between bars of one column and between columns.
