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

`y2 "<label>" <min> --> <max>` adds the second axis. `axis=y2` on a series or line binds that row to it.
