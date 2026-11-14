[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# powermap

People on a reporting tree, with four score chips, a bar for counterparts from another company, a photo or a bust silhouette, and named influence arrows. Aliases: power-map, power.

```
powermap
company Northwind
legend on
comms on
avatar 48
link supporter color=#1a7f37 style=solid label=ally
CEO [Alex Morgan|Chief executive] role=D influence=L action=U attitude=++ counterpart="Sam Reed" gender=m
CFO [Elena Chen|Finance lead] role=A influence=M action=S attitude=+ counterpart="Lea Ortiz, Sam Reed; Sam Reed" gender=f
CEO -> CFO
CFO -supporter-> CEO label=budget
CEO <-coach-> CFO
```

`company` is the company of the people on the cards. `legend on|off` draws the full key under the chart: role, influence, need for action, attitude, and the external-counterpart color. Line samples are only styles declared with `link`. Reporting lines stay out of the key. `lang ru` (also `language` or `locale`) sets that key's language; otherwise the interface language is used. `comms on` draws a communications table under that key, even when the legend is off. It is off by default. People are sorted by name. Headers are `Company` plus the company name, `Contacts`, and `Links` (translated with the legend language). The Contacts column lists `counterpart`, split on commas and semicolons, one name per line, with empty values, `-`, and repeated names removed. The Links column lists each influence touching that person: `→` outgoing, `←` incoming, `↔` both ways, then the other person, the link type, its legend label, and the arrow label when one is set. `avatar 48` sets the photo box (24–128); `avatar off` hides it. A person is `id [Name|Title]`.

Scores: `role` E/D/A/U/C, `influence` L/M/S, `action` U/S/M, `attitude` ++ / + / 0 / - / --. `counterpart` is people from another company, not colleagues who appear on the cards. `gender=m|f|?` picks a bust silhouette when `photo` is absent. `photo` is an http(s) URL or a png/jpeg/gif/webp data URI.

`->` is a solid report and `-.->` is a dotted report. They build the tree. `A -name-> B` is an influence arrow with no caption and does not change the manager. `A <-name-> B` is the same arrow in both directions. `A -name-> B label="budget"` captions that one arrow. `label` on a `link` line is legend text only. `supporter` (green solid) and `enemy` (red dash) exist without a `link` line, and they stay out of the legend until declared. Any other name needs `link name color=#hex style=solid|dash|dot|dashdot label=…`.
