[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# infographic

A number or a text with its own font, color, and size. Alias: kpi.

```
infographic
value 1280
prefix "₽ "
postfix " за месяц"
font Inter
fontsize 64
color #0f766e
size 480x240
label top "Выручка" font Inter fontsize 18 color #334155
when >= 1000 color #15803d show prefix
when < 0 hide prefix
```

`text` replaces the number. `label` sits on `left`, `right`, `top`, or `bottom`. `when` can change color and font size and show or hide `prefix` and `postfix`.
