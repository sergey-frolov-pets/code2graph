[Series](./series.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# series scale

A missing band on the axis, or a second axis for another unit.

```
series
title Разрыв
categories Q1, Q2, Q3, Q4
y "млн" 0 --> 1000
break 200 --> 700
series Онлайн : 120, 180, 860, 240
```

```
series
%% grid y2 5 рисует сетку второй шкалы своим шагом.
%% axis y2 off прячет эту ось и её линии. grid y2 off прячет только сетку.
title Две шкалы
categories Q1, Q2
y "млн" 0 --> 200
y2 "доля, %" 0 --> 40
grid y2 5
series Выручка : 80, 120
line Доля : 12, 18 axis=y2
```

`y2 "<label>" <min> --> <max>` adds the second axis. `axis=y2` on a series or line binds that row to it. `grid y2 <step>` draws that scale's grid. `axis y2 off` hides the axis and those lines.
