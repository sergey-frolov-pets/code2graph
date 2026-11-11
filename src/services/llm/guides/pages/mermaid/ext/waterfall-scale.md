[Waterfall](./waterfall.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# waterfall scale

Scale breaks, where values are drawn, and font size.

```
waterfall
title Выручка
y "млн" 0 --> 1000
fontsize 16
labels above
break 200 --> 700 "разрыв"
=120 : Q1
+180 : Q2
= : Итог
```

`break <after> --> <before>` cuts a range out of the axis. `fontsize` is 6–28. `labels` is above, inside, both, or none.
