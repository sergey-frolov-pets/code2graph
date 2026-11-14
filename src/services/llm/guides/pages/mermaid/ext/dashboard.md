[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# dashboard

A canvas of library diagrams. Title, header and footer bands are measured first (`fontSize + 20` when they have text) and subtracted from the canvas. Vertical and horizontal lines then cut the remaining rectangle into a grid. Each filled cell holds one diagram or one public library link. Cells have no outline unless `border` is set.

```
dashboard
size 1280x720
refresh 5m
title "Сводка" font "sans-serif" fontsize 22 color none background #ffffff shadow
header "Сегодня" font "sans-serif" fontsize 16 color none background #f1f5f9 shadow align center middle
footer "Источник" font "sans-serif" fontsize 13 color none background #f8fafc noshadow align end bottom
cols 0.35 0.65
rows 0.5 0.5
cell 0 0 diagram "revenue" border #0f172a 2
cell 1 0 link "alice/weekly"
cell 0 1 diagram "load"
```

`size` is the canvas in pixels. `refresh` is `30s`, `5m`, `1h`, or any `Ns` / `Nm` / `Nh`. `title`, `header` and `footer` are optional bands. `cols` and `rows` are fractions of the remaining rectangle and sum to 1. `header` and `footer` may set `align <start|center|end> <top|middle|bottom>`. `cell` is `column row diagram "id"` or `link "username/slug"`. Optional `border <color> <width>` draws a stroke on that cell only. Empty cells are omitted. An older `zone x y w h diagram "id"` still reads: its edges become the grid and the diagram fills every cell whose center lies inside the zone.
