import type { LocaleMessages } from "../types";

export const tablePasteMessages = {
  "editor.pasteTable": "Paste table from clipboard",
  "editor.pasteTableHistory": "Paste table",
  "tablePaste.modalTitle": "Cannot paste table from clipboard",
  "tablePaste.reasonLabel": "What went wrong",
  "tablePaste.expectedLabel": "Expected table format ({type})",
  "tablePaste.columnsLabel": "Columns:",
  "tablePaste.rulesLabel": "Conversion rules:",
  "tablePaste.sampleLabel": "Sample table to copy (Excel / Google Sheets / TSV):",
  "tablePaste.error.emptyClipboard":
    "The clipboard is empty. Copy a range of cells from Excel or Google Sheets, or a tab/semicolon-separated table.",
  "tablePaste.error.clipboardReadFailed":
    "Could not read from the clipboard. Please grant clipboard permission in your browser and try again.",
  "tablePaste.error.notATable":
    "Clipboard content is not a table (expected at least 2 columns separated by tabs, ';' or '|').",
  "tablePaste.error.tooManyColumns":
    "Too many columns: found {actual} in clipboard, but this diagram expects {expected}.",
  "tablePaste.error.tooFewColumns":
    "Too few columns: found {actual} in clipboard, but this diagram expects {expected}.",
  "tablePaste.error.tooFewColumnsMin":
    "Too few columns: found {actual} in clipboard, but at least {min} are required.",
  "tablePaste.error.tooFewRowsMin":
    "Too few rows: found {actual} in clipboard, but at least {min} rows are required.",
  "tablePaste.error.expectedColumnRange":
    "Invalid column count: found {actual} in clipboard, expected between {min} and {max} columns.",
  "tablePaste.error.waterfallColumns":
    "Expected 2 columns: one with text labels and one with numbers (or empty cells for '=' totals).",
  "tablePaste.error.waterfallFirstMustBeNumber":
    "The first data row (row {row}) must have a starting numeric value ('=number'), not an empty cell.",
  "tablePaste.error.noNumericColumn":
    "Neither column contains numeric values.",
  "tablePaste.error.invalidNumberAtRow":
    "Row {row}: value \"{value}\" is not a valid number.",
  "tablePaste.error.negativeNotAllowedAtRow":
    "Row {row}: negative value \"{value}\" is not allowed in a pie chart.",
  "tablePaste.error.noDataRows":
    "The copied table contains no data rows.",
  "tablePaste.type.waterfall": "Waterfall",
  "tablePaste.type.pie": "Pie chart",
  "tablePaste.type.heatmap": "Heatmap",
  "tablePaste.type.bubble": "Bubble chart",
  "tablePaste.type.ev": "Earned Value (EV)",
  "tablePaste.type.boxplot": "Box plot",
  "tablePaste.type.treemap": "Tree map",
  "tablePaste.type.radar": "Radar chart",
  "tablePaste.type.voronoi": "Voronoi diagram",
  "tablePaste.type.clustered": "Series chart",
  "tablePaste.type.xychart": "XY Chart (Bar / Line)",
  "tablePaste.type.quadrant": "Quadrant Chart",
  "tablePaste.type.sankey": "Sankey diagram",
  "tablePaste.type.orgchart": "Org chart",
  "tablePaste.type.powermap": "Power map",
  "tablePaste.type.gantt": "Gantt chart",
  "tablePaste.type.timeline": "Timeline",
  "tablePaste.type.journey": "User Journey",
  "tablePaste.type.packet": "Packet header",
  "tablePaste.type.wbs": "Work Breakdown (WBS)",
  "tablePaste.type.mindmap": "Mindmap",
  "tablePaste.type.nwdiag": "Network diagram (Nwdiag)",
  "tablePaste.type.wireframe": "WireMark Table",
  "tablePaste.expected.waterfall.columns":
    "2 columns in either order: 'Label' and 'Value' (or 'Value' and 'Label').",
  "tablePaste.expected.waterfall.rules":
    "The first number becomes the starting bar (=N), positive numbers become increases (+N), negative numbers become decreases (-N), and an empty cell (or '=') becomes a running total (= : Label).",
  "tablePaste.expected.waterfall.headers": "Label|Value",
  "tablePaste.expected.pie.columns":
    "2 columns in either order: 'Category' and 'Non-negative number'.",
  "tablePaste.expected.pie.rules":
    "Each row becomes a slice: \"Category\" : Value.",
  "tablePaste.expected.pie.headers": "Category|Share",
  "tablePaste.expected.heatmap.columns":
    "Matrix at least 2×2: first row has X column headers, first column has Y row labels, inner cells hold numbers (or empty cells).",
  "tablePaste.expected.heatmap.rules":
    "The x and y lines are inserted before the scale block. If scale is missing, a scale from the minimum to the maximum value is added, blue to red. Empty cells become null slots.",
  "tablePaste.expected.heatmap.headers": "Period|Mon|Tue|Wed",
  "tablePaste.expected.bubble.columns":
    "4 or 5 columns: 'Label', 'X (number)', 'Y (number)', 'Size (number)', ['Group (optional)'].",
  "tablePaste.expected.bubble.rules":
    "Each row becomes a bubble point: Label : x=..., y=..., size=..., group=...",
  "tablePaste.expected.bubble.headers": "Product|X|Y|Size|Group",
  "tablePaste.expected.ev.columns":
    "4 columns: 'Period (days)', 'PV (planned)', 'EV (earned)', 'AC (actual)' (or 4 rows: days, pv, ev, ac).",
  "tablePaste.expected.ev.rules":
    "Generates days, pv, ev, and ac series for the Earned Value chart.",
  "tablePaste.expected.ev.headers": "Period|PV|EV|AC",
  "tablePaste.expected.boxplot.columns":
    "6 columns ('Category', 'Min', 'Q1', 'Median', 'Q3', 'Max') or 4+ columns of raw observations ('Category', 'Sample 1', 'Sample 2', 'Sample 3'...).",
  "tablePaste.expected.boxplot.rules":
    "Generates min=..., q1=..., median=..., q3=..., max=... for 5-number summaries, or values=... for raw sample observations.",
  "tablePaste.expected.boxplot.headers": "Category|Min|Q1|Median|Q3|Max",
  "tablePaste.expected.treemap.columns":
    "2 to 4 columns: 'Item | Weight' or 'Group | Item | Weight [| Color]'.",
  "tablePaste.expected.treemap.rules":
    "Generates hierarchical blocks 'Group / Item : Weight' (weight must be > 0).",
  "tablePaste.expected.treemap.headers": "Group|Item|Weight",
  "tablePaste.expected.radar.columns":
    "Matrix with at least 4 columns: first row holds axis names (at least 3 axes), first column holds series names, inner cells hold numbers.",
  "tablePaste.expected.radar.rules":
    "Generates the axes directive from the header row and 'series Name : v1, v2, ...' rows.",
  "tablePaste.expected.radar.headers": "Series|Speed|Reliability|Usability|Security",
  "tablePaste.expected.voronoi.columns":
    "3 to 5 columns: 'Site', 'X (number)', 'Y (number)', ['Group'], ['Color'].",
  "tablePaste.expected.voronoi.rules":
    "Each row becomes a Voronoi site: Site : x=..., y=..., group=...",
  "tablePaste.expected.voronoi.headers": "Site|X|Y|Group",
  "tablePaste.expected.clustered.columns":
    "Matrix at least 2×2: first column has categories, first row has series names (or transposed when header starts with 'Series').",
  "tablePaste.expected.clustered.rules":
    "Generates categories and series lines while keeping rotate 90, invert y, and color directives.",
  "tablePaste.expected.clustered.headers": "Category|North|South|Export",
  "tablePaste.expected.xychart.columns":
    "1 or more columns. One column is numbers for bar [Val 1, ..., Val n]. Two columns are 'X category' and 'Bar value'. Three or more are 'X category' plus one bar series per extra column.",
  "tablePaste.expected.xychart.rules":
    "One column replaces existing bar [values] lines. Two or more columns replace x-axis and every bar line, with one bar [...] series per value column. If the chart has no y-axis yet, y-axis \"\" min --> max is added.",
  "tablePaste.expected.xychart.headers": "Month|Plan|Actual|Forecast",
  "tablePaste.expected.quadrant.columns":
    "3 columns: 'Point label', 'X (0..1 or 0..100%)', 'Y (0..1 or 0..100%)'.",
  "tablePaste.expected.quadrant.rules":
    "Coordinates greater than 1 are automatically normalized from percentages (0..100) to [0..1].",
  "tablePaste.expected.quadrant.headers": "Item|X|Y",
  "tablePaste.expected.sankey.columns":
    "3 columns: 'Source', 'Target', 'Flow value (number)'.",
  "tablePaste.expected.sankey.rules":
    "Each row becomes a flow line: Source,Target,Value.",
  "tablePaste.expected.sankey.headers": "Source|Target|Flow",
  "tablePaste.expected.orgchart.columns":
    "2 or 3 columns: 'Manager', 'Direct report', ['Edge style (dotted) or Title'].",
  "tablePaste.expected.orgchart.rules":
    "Generates orgchart nodes and solid (->) or dotted (-.->) reporting lines.",
  "tablePaste.expected.orgchart.headers": "Manager|Report|Link",
  "tablePaste.expected.powermap.columns":
    "Name, title, manager, role, influence, action, attitude, counterpart, and link (solid, dotted, or a link name).",
  "tablePaste.expected.powermap.rules":
    "Each row is a person. solid and dotted are reporting lines. Any other link name is an influence arrow.",
  "tablePaste.expected.powermap.headers":
    "Name|Title|Manager|Role|Influence|Action|Attitude|Counterpart|Link",
  "tablePaste.expected.gantt.columns":
    "2 to 4 columns: 'Task', 'Start date or duration', ['Duration (5d)'], ['Section'].",
  "tablePaste.expected.gantt.rules":
    "Generates Gantt task rows (grouped by section in Mermaid).",
  "tablePaste.expected.gantt.headers": "Task|Start|Duration|Section",
  "tablePaste.expected.timeline.columns":
    "2 or 3 columns: 'Period / Date', 'Event', ['Section (optional)'].",
  "tablePaste.expected.timeline.rules":
    "Each row becomes a timeline entry 'Period : Event'.",
  "tablePaste.expected.timeline.headers": "Period|Event|Section",
  "tablePaste.expected.journey.columns":
    "2 to 4 columns: 'Step', 'Score (1–5)', ['Actors'], ['Section'].",
  "tablePaste.expected.journey.rules":
    "Generates user journey steps 'Step: Score: Actors'.",
  "tablePaste.expected.journey.headers": "Step|Score|Actors|Section",
  "tablePaste.expected.packet.columns":
    "2 columns in either order: 'Bit range (0-15) or bit length (16)' and 'Field name'.",
  "tablePaste.expected.packet.rules":
    "Generates packet fields '0-15: \"Field\"' (bit lengths are automatically accumulated into ranges).",
  "tablePaste.expected.packet.headers": "Bits|Field",
  "tablePaste.expected.wbs.columns":
    "2 or more columns representing hierarchy levels: 'Level 1 (Root)', 'Level 2', 'Level 3', etc.",
  "tablePaste.expected.wbs.rules":
    "Builds a WBS tree (*, **, ***), automatically grouping identical parent cells.",
  "tablePaste.expected.wbs.headers": "Level 1|Level 2|Level 3",
  "tablePaste.expected.mindmap.columns":
    "2 or more columns representing tree depth: 'Root', 'Branch', 'Sub-branch', etc.",
  "tablePaste.expected.mindmap.rules":
    "Builds a mindmap tree, merging identical parents. Pasted nodes replace every map node. Legend, title, header, footer, caption, style, and comments are kept.",
  "tablePaste.expected.mindmap.headers": "Root|Branch|Leaf",
  "tablePaste.expected.nwdiag.columns":
    "2 or 3 columns: 'Node', 'IP address', ['Network (optional)'].",
  "tablePaste.expected.nwdiag.rules":
    "Groups nodes by network into network { node [address = \"...\"] } blocks.",
  "tablePaste.expected.nwdiag.headers": "Node|IP Address|Network",
  "tablePaste.expected.wireframe.columns":
    "Any table with at least 2 columns (first row is header, remaining rows are body rows).",
  "tablePaste.expected.wireframe.rules":
    "Generates a WireMark Table component with TableHead and TableBody (numeric columns are right-aligned).",
  "tablePaste.expected.wireframe.headers": "Name|Author|Status|Views",
} as const satisfies LocaleMessages;
