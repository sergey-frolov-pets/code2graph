[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# gauge

A needle on a semicircle. The minimum defaults to 0. The needle position is `(value - min) / (max - min)`, clamped to 0..1.

```
gauge
%% max and value are required. min defaults to 0.
%% title — heading. label — caption under the hub; without it the number is shown.
%% color — needle and hub. track — empty arc. arc — fill from the minimum to the needle.
%% thickness — arc width in px. needle — needle width in px.
%% font, fontsize — value caption. size — canvas widthxheight, default 360x220.
%% zone <from> <to> <#hex> ["caption"] — a colored band; captions sit under the arc.
title Server load
min 0
max 100
value 72
label "72 %"
color #1d4ed8
track #e2e8f0
thickness 16
needle 5
font Inter
fontsize 26
size 420x250
zone 0 60 #16a34a "ok"
zone 60 85 #ca8a04 "watch"
zone 85 100 #dc2626 "hot"
```
