[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# dashboard

A canvas of library diagrams. Vertical and horizontal lines cut the area under the title and header and above the footer into a grid. Each filled cell holds one diagram or one public library link.

```
dashboard
size 1280x720
refresh 5m
title "Сводка" font "sans-serif" fontsize 22 color none background #ffffff shadow
header "Сегодня" font "sans-serif" fontsize 16 color none background #f1f5f9 shadow align center middle
footer "Источник" font "sans-serif" fontsize 13 color none background #f8fafc noshadow align end bottom
cols 0.35 0.65
rows 0.5 0.5
cell 0 0 diagram "revenue"
cell 1 0 link "alice/weekly"
```

`size` is the canvas in pixels. `refresh` is `30s`, `5m`, `1h`, or any `Ns` / `Nm` / `Nh`. `title`, `header` and `footer` are optional bands. A band with text is `fontSize + 20` pixels tall and is subtracted before the grid. `cols` and `rows` are fractions of that remaining rectangle and sum to 1. `header` and `footer` may set `align <start|center|end> <top|middle|bottom>`. `cell` is `column row diagram "id"` or `link "username/slug"`. Empty cells are omitted. An older `zone x y w h diagram "id"` still reads: its edges become the grid and the diagram fills every cell whose center lies inside the zone.
