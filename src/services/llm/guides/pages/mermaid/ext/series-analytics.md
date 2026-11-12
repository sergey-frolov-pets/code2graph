[Series](./series.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# series analytics

A constant level line, or a CAGR arrow between bars.

```
series
title Рост
categories 2021, 2022, 2023, 2024
y "млн" 0 --> 220
series Выручка : 80, 110, 150, 190
line 160 "план"
cagr
```

`line <number> "label"` is a level line and has no colon. `cagr` draws the growth from the first bar to the last. A level line, a break, and `cagr` stay on a `stacked` column chart and on `stacked area`.
