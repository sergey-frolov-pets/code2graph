[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# powermap

People on a reporting tree, with four score chips, a company-counterpart bar, a photo or a silhouette, and named influence arrows. Aliases: power-map, power.

```
powermap
company Northwind
legend on
avatar 48
link supporter color=#1a7f37 style=solid label=supporter
CEO [Alex Morgan|Chief executive] role=D influence=L action=U attitude=++ counterpart=yes gender=m
CFO [Elena Chen|Finance lead] role=A influence=M action=S attitude=+ counterpart=- gender=f
CEO -> CFO
CFO -supporter-> CEO
```

`company` is the company name. `legend on|off` shows the scale legend. `avatar 48` sets the photo box (24–128); `avatar off` hides it. A person is `id [Name|Title]`.

Scores: `role` E/D/A/U/C, `influence` L/M/S, `action` U/S/M, `attitude` ++ / + / 0 / - / --. `counterpart` is the bar text. `gender=m|f|?` picks a silhouette when `photo` is absent. `photo` is an http(s) URL or a png/jpeg/gif/webp data URI.

`->` is a solid report and `-.->` is a dotted report. They build the tree. `A -name-> B` is an influence arrow and does not change the manager. `supporter` (green solid) and `enemy` (red dash) exist without a `link` line. Any other name needs `link name color=#hex style=solid|dash|dot|dashdot label=…`.
