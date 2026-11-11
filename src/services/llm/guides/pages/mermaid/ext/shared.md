# Mermaid Ext shared rules

[Mermaid types](../index.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

The first meaningful line, ignoring blank lines and %% comments, selects the Mermaid Ext type. The keyword may be followed by a space or a colon. Aliases such as bubblechart or spider are the same type.

Lines that start with %% are comments. Leading indentation is ignored.

`title <text>` sets the title. `mono`, `mono invert`, and `mono off` switch the gray scale. Do not replace an Ext type with flowchart or xychart.
