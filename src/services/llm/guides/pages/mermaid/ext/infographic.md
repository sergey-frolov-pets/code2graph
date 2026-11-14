[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# infographic

A number or a text with its own font, color, and size. Alias: kpi. Text that does not fit is scaled down so it stays inside the frame.

```
infographic
%% value is required. text replaces the number on the canvas; when still reads value.
%% prefix and postfix are shown unless a when rule hides them.
%% font, fontsize, color — the value. size — canvas widthxheight, default 480x240.
%% label <left|right|top|bottom> "text" [font] [fontsize] [color] — one caption per side.
%% when <op> <number> [color #hex] [fontsize n] [show|hide prefix|postfix]
%% op is > >= < <= == !=. Rules run top to bottom.
value 1280
prefix "$ "
postfix " / mo"
font Inter
fontsize 48
color #0f766e
size 480x240
label top "Revenue" font Inter fontsize 18 color #334155
label bottom "this year" fontsize 14 color #64748b
when >= 1000 color #15803d show prefix show postfix
when < 0 color #b91c1c hide prefix
```
