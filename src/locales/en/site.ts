import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "Diagrams-as-Code Studio",
  "site.nav.features": "Features",
  "site.nav.converter": "Converter & AI",
  "site.nav.pwa": "PWA / Offline",
  "site.nav.formats": "Formats",
  "site.nav.faq": "FAQ",
  "site.nav.mcp": "MCP",
  "site.nav.github": "GitHub",
  "site.nav.discussions": "Discussions",
  "site.hero.askQuestion": "💬 Ask a question",
  "site.github.star": "Star",
  "site.github.starLabel": "Star code2graph on GitHub",
  "site.hero.viewOnGithub": "View on GitHub",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "PWA studio for PlantUML, Mermaid, GraphML, WireMark, D2, and Structurizr. MCP for agents returns diagram source and an image.",
  "site.landingCtaApp": "Open editor",
  "site.landingCtaInstallPwa": "📲 Install PWA",
  "site.landingCtaRegister": "Sign up",
  "site.landingCtaLogin": "Sign in",
  "site.landingCtaTryFree": "Try for free",
  "site.landingCtaDemo": "Demo",

  "site.hero.title": "Text diagrams in the browser",
  "site.hero.subtitle":
    "Write a diagram and see it right away. PlantUML, Mermaid, GraphML, WireMark, D2, and Structurizr — including offline. MCP gives an agent the source and an image.",
  "site.offlineNote": "Editing and preview work without a network.",
  "site.languages.title": "Languages",
  "site.language.sites": "Sites",
  "site.language.libraries": "Libraries used in the app",
  "site.language.types": "Main diagram types",
  "site.language.diagramTypes": "Diagram types",
  "site.language.keywords": "Keywords",
  "site.language.example": "Example",
  "site.language.syntax": "Syntax",
  "site.language.preview": "How it looks: {title}",
  "site.language.previewFailed": "The sample could not be drawn",
  "site.primer.graphml.type.directed.title": "Directed graph",
  "site.primer.graphml.type.directed.summary":
    "Edges run from a source to a target. This is how Code2Graph draws GraphML by default.",
  "site.primer.graphml.type.undirected.title": "Undirected graph",
  "site.primer.graphml.type.undirected.summary":
    "Edges only connect nodes, with no direction.",
  "site.primer.wiremark.type.flow.title": "Linked screens",
  "site.primer.wiremark.type.flow.summary":
    "Several wireframes in one file, with to=#anchor jumps between them.",
  "site.primer.plantuml.kw.startuml":
    "@startuml and @enduml open and close the diagram.",
  "site.primer.plantuml.kw.participant":
    "A named lifeline. as gives it a short alias.",
  "site.primer.plantuml.kw.arrow": "A message: -> toward a participant, --> for the reply.",
  "site.primer.plantuml.kw.alt":
    "Mutually exclusive branches. else is the other branch, end closes the block.",
  "site.primer.plantuml.kw.note": "A note to the left, right, or over participants.",
  "site.primer.plantuml.kw.if":
    "An activity decision: then and else, closed with endif.",
  "site.primer.plantuml.kw.skinparam":
    "A shared style setting, such as the background color.",
  "site.primer.plantuml.syntax.sequence":
    "actor and participant name a lifeline, as is the short alias. A message is ->, a reply is -->, and the label follows the colon.",
  "site.primer.plantuml.syntax.class":
    "class opens a class; fields and methods sit inside the braces. A link is --> with multiplicity in quotes.",
  "site.primer.plantuml.syntax.activity":
    "start and stop are the ends. A step is :text;. A decision is if () then (), else, and endif.",
  "site.primer.plantuml.syntax.state":
    "[*] is the start and the end. A transition is -->, and the event label follows the colon.",
  "site.primer.plantuml.syntax.usecase":
    "actor and usecase declare the actor and the case. The link is -->, the direction is left to right direction.",
  "site.primer.plantuml.syntax.c4_context":
    "Person(), System(), and Rel() describe people, the system, and a link. The library is pulled in with !include.",
  "site.primer.mermaid.kw.participant":
    "A sequence participant. as replaces the visible label.",
  "site.primer.mermaid.kw.arrow":
    "A message: ->> is a solid arrow, -->> is a dotted reply.",
  "site.primer.mermaid.kw.alt":
    "Sequence branches. else is the other branch, end closes the block.",
  "site.primer.mermaid.kw.note": "A note to the right of a participant, or over several.",
  "site.primer.mermaid.kw.subgraph": "A group of flowchart nodes. Close it with end.",
  "site.primer.mermaid.kw.class": "A class with fields and methods inside classDiagram.",
  "site.primer.mermaid.kw.section": "A group of tasks on a Gantt chart.",
  "site.primer.mermaid.syntax.flowchart":
    "flowchart TD sets the direction. A step is [text], a decision is {text}, a start is ([text]). An arrow is -->, a branch label is |yes|.",
  "site.primer.mermaid.syntax.sequence":
    "sequenceDiagram opens the diagram. actor and participant with as name a lifeline. A request is ->>, a reply is -->>.",
  "site.primer.mermaid.syntax.class":
    "classDiagram opens the diagram. class Name { } holds +name type fields and methods. A link is -->.",
  "site.primer.mermaid.syntax.state":
    "stateDiagram-v2 opens the diagram. [*] is the start. A transition is -->, and the label follows the colon.",
  "site.primer.mermaid.syntax.er":
    "erDiagram opens the diagram. ||--o{ reads as one-to-many, and the role follows the colon.",
  "site.primer.mermaid.syntax.gantt":
    "gantt opens the chart. title is the heading, dateFormat is the date pattern, section is a group. A task is name :id, date, duration.",
  "site.primer.mermaid.syntax.mindmap":
    "mindmap opens the map. The root is root((topic)). Indentation sets the nesting.",
  "site.primer.mermaid.syntax.pie":
    "pie showData prints the numbers. title is the heading. A slice is \"name\" : number.",
  "site.primer.mermaid.syntax.journey":
    "journey opens the path. title is the heading, section is a stage. A task is name: score: role.",
  "site.primer.mermaid.syntax.gitgraph":
    "gitGraph opens the history. commit is a commit, branch is a branch, checkout switches, merge joins.",
  "site.primer.mermaid.syntax.timeline":
    "timeline opens the scale. title is the heading, section is a period. Events follow the colon.",
  "site.primer.mermaid.syntax.sankey":
    "sankey-beta opens the flows. Each line is source,target,weight. Node names are ASCII; quote a name that contains a comma. Options are not CSV columns: set them in a config.sankey YAML header before the keyword (showValues, prefix, suffix, linkColor, nodeAlignment, width, height, useMaxWidth, nodeWidth, nodePadding, labelStyle, nodeColors).",
  "site.primer.mermaid.syntax.xychart":
    "xychart-beta opens the chart. x-axis is the categories, y-axis is the range, bar and line are series.",
  "site.primer.mermaid.syntax.block":
    "block-beta opens the blocks. columns sets how many columns. A block is id[\"label\"], a link is -->.",
  "site.primer.mermaid.syntax.c4_context":
    "C4Context opens the context. Person() and System() declare elements, Rel() is a link.",
  "site.primer.mermaid.syntax.requirement":
    "requirementDiagram opens the diagram. requirement { } is a requirement, element { } is an element, the link is satisfies.",
  "site.primer.mermaid.syntax.quadrant":
    "quadrantChart opens the quadrants. x-axis and y-axis are the axes, quadrant-1 … quadrant-4 are the names, a point is name: [x, y].",
  "site.primer.mermaid.syntax.architecture":
    "architecture-beta opens the diagram. group is a group, service is a service, a link is service:R --> L:service.",
  "site.primer.mermaid.syntax.packet":
    "packet-beta opens the packet. title is the heading. A field is a bit range and a label, for example 0-15: \"Source\".",
  "site.ext.mermaid.title": "Mermaid Ext extension",
  "site.ext.mermaid.lead":
    "Five diagram types that plain Mermaid does not have: waterfall, bubble, heatmap, org chart, and earned value. Drawn by a built-in engine, with no external services.",
  "site.ext.mermaid.note":
    "All five types are drawn by the built-in engine, with no external services. If the example below does not render in the editor, this build was made without the extension.",
  "site.ext.mermaid.type.waterfall": "Waterfall",
  "site.ext.mermaid.type.bubble": "Bubble",
  "site.ext.mermaid.type.heatmap": "Heatmap",
  "site.ext.mermaid.type.orgchart": "Org chart",
  "site.ext.mermaid.type.ev": "Earned value",
  "site.ext.mermaid.type.boxplot": "Box plot",
  "site.ext.mermaid.type.treemap": "Tree map",
  "site.ext.mermaid.type.radar": "Radar chart",
  "site.ext.mermaid.type.voronoi": "Voronoi tessellation",
  "site.ext.mermaid.type.clustered": "Clustered bar chart",
  "site.ext.mermaid.desc.waterfall":
    "How a starting value turns into a total through + and − steps. Absolute columns start with =, several scenarios are declared with series. Axis breaks, black-and-white mode (mono and mono invert) and custom colours are supported.",
  "site.ext.mermaid.desc.bubble":
    "Three dimensions at once: x, y, and bubble size. Optionally BCG quadrants and color groups.",
  "site.ext.mermaid.desc.heatmap":
    "A value matrix with a color scale. Scale ranges are explicit, an empty cell (two separators in a row) is drawn gray.",
  "site.ext.mermaid.desc.orgchart":
    "A reporting tree with explicit edges: solid is the main line, dotted -.-> is a secondary manager. A block can set its fill (color) and its border (border, style). Several roots are gathered under an invisible root.",
  "site.ext.mermaid.desc.ev":
    "Three cumulative curves by day: planned value PV, earned value EV, and actual cost AC. Plus SV and CV deviations in the legend.",
  "site.ext.mermaid.desc.boxplot":
    "Distribution across categories: minimum, lower and upper quartiles (Q1, Q3), median, maximum, mean, and outliers. Accepts either an explicit five-number summary or raw observations (values=).",
  "site.ext.mermaid.desc.treemap":
    "Hierarchical rectangle partitioning across groups and items proportional to numeric weight, with automatic percentage shares and colour shading.",
  "site.ext.mermaid.desc.radar":
    "Compares multiple series across radial axes from a shared center, with configurable grid rings, fill opacity, and custom colours.",
  "site.ext.mermaid.desc.voronoi":
    "Geometric partitioning of a plane into convex nearest-neighbor cells with colour groups and centroid labels.",
  "site.ext.mermaid.desc.clustered":
    "Bars for multiple series across categories, side by side or stacked, with a 90-degree rotation (rotate 90), value labels, and black-and-white mode (mono, mono invert).",
  "site.ext.mermaid.syntax.waterfall":
    "waterfall opens the chart. y sets the axis. = is an absolute column, + and - are a step, and the label follows the colon.",
  "site.ext.mermaid.syntax.bubble":
    "bubble opens the chart. x, y, and size set the axes and the size. Inside data a point is name : x=, y=, size=.",
  "site.ext.mermaid.syntax.heatmap":
    "heatmap opens the map. x and y are the axis labels. Inside data a row is name : comma-separated numbers.",
  "site.ext.mermaid.syntax.orgchart":
    "orgchart opens the tree. A node is id [role\\nname] (\\n breaks the line, the box fits the text); color=#hex sets the fill, border=#hex and style=solid|dash|dot|dashdot set the border color and style. A solid edge is ->, a secondary manager is -.->.",
  "site.ext.mermaid.syntax.ev":
    "ev opens the chart. days are the days, pv is the plan, ev is earned value, ac is actual cost.",
  "site.ext.mermaid.syntax.boxplot":
    "boxplot opens the chart. Category row: Name : min=, q1=, median=, q3=, max= (or values=v1, v2, …) with optional color=#hex.",
  "site.ext.mermaid.syntax.treemap":
    "treemap opens the map. Row: Group / Item : weight [color=#hex]. labels controls value and percentage display.",
  "site.ext.mermaid.syntax.radar":
    "radar opens the chart. axes lists spoke labels, series Name : v1, v2, … defines a data series.",
  "site.ext.mermaid.syntax.voronoi":
    "voronoi opens the tessellation. Inside data a site is Name : x=, y=, group=, color=#hex.",
  "site.ext.mermaid.syntax.clustered":
    "clustered opens the chart. categories lists categories, series Name : v1, v2, … defines a series. stacked piles the series, rotate 90 turns the chart, mono and mono invert switch to black and white.",
  "site.primer.graphml.kw.graphml":
    "The document root. The GraphML namespace is required.",
  "site.primer.graphml.kw.graph":
    "The graph itself. edgedefault is directed or undirected.",
  "site.primer.graphml.kw.node": "A vertex. id must be unique.",
  "site.primer.graphml.kw.edge": "An edge. source and target refer to node ids.",
  "site.primer.graphml.kw.key": "Declares an attribute for nodes or edges.",
  "site.primer.graphml.kw.data":
    "An attribute value. The visible label lives here, not in the id.",
  "site.primer.graphml.syntax.directed":
    "graphml is the root, graph edgedefault=\"directed\" is a directed graph. node is a vertex, edge source and target is an edge, data is the label.",
  "site.primer.graphml.syntax.undirected":
    "The same shape, with edgedefault=\"undirected\": an edge only connects nodes.",
  "site.primer.wiremark.kw.wireframe":
    "One screen. The name after # is the anchor other screens link to.",
  "site.primer.wiremark.kw.flow":
    "Connects several screens. LR draws the links left to right.",
  "site.primer.wiremark.kw.stack":
    "A column or a row. gap sets the spacing, indentation sets nesting.",
  "site.primer.wiremark.kw.typography":
    "Text. h4 and body1 pick the level, the quoted string is the label.",
  "site.primer.wiremark.kw.textfield":
    "An input. The label is quoted, settings such as required are not.",
  "site.primer.wiremark.kw.button":
    "A button. contained fills it, to=#id jumps to another screen.",
  "site.primer.wiremark.syntax.wireframe":
    "Wireframe #anchor opens a screen. Stack builds a column, Typography is text, TextField is an input, Button is a button.",
  "site.primer.wiremark.syntax.flow":
    "Flow LR links screens from left to right. to=#anchor on a button jumps to another Wireframe.",
  "site.primer.d2.kw.direction":
    "Layout direction: down, right, left, or up.",
  "site.primer.d2.kw.shape":
    "Node shape: person, cylinder, class, sql_table, sequence_diagram.",
  "site.primer.d2.kw.arrow": "A link between nodes. The label follows the colon.",
  "site.primer.d2.kw.style": "Node styling: fill, stroke, and font.",
  "site.primer.d2.kw.constraint":
    "A SQL column constraint: primary_key, foreign_key, or unique.",
  "site.primer.d2.syntax.flowchart":
    "direction sets the layout. shape: person and shape: cylinder are node shapes. A link is -> with a label after the colon.",
  "site.primer.d2.syntax.sequence":
    "shape: sequence_diagram turns the block into a sequence. Participants are nested nodes, a message is ->.",
  "site.primer.d2.syntax.class":
    "shape: class turns the block into a class. Fields and methods are lines inside the block, a link is ->.",
  "site.primer.d2.syntax.er":
    "shape: sql_table turns the block into a table. constraint: primary_key and foreign_key mark keys, a link is field -> field.",
  "site.primer.d2.syntax.architecture":
    "Nested blocks group nodes. shape sets the form, -> is a labeled link.",
  "site.primer.structurizr.kw.workspace":
    "The document root: a name and a short description of the model.",
  "site.primer.structurizr.kw.person": "A person who uses the system.",
  "site.primer.structurizr.kw.softwareSystem": "A software system in the model.",
  "site.primer.structurizr.kw.container":
    "An application or data store inside a system. The third argument is the technology.",
  "site.primer.structurizr.kw.arrow":
    "Who calls whom. The relationship label is quoted.",
  "site.primer.structurizr.kw.views": "Which views to draw from the model.",
  "site.primer.structurizr.kw.autolayout":
    "Automatic view layout: tb is top to bottom, lr is left to right.",
  "site.primer.structurizr.syntax.c4_context":
    "workspace opens the document. person and softwareSystem describe the model, -> is a relationship, systemContext and autolayout build the view.",
  "site.primer.structurizr.syntax.c4_container":
    "container inside softwareSystem is an application. A container view and include * collect the containers.",
  "site.primer.structurizr.syntax.component":
    "component inside container describes a module. A component view draws that container.",
  "site.primer.structurizr.syntax.deployment":
    "deploymentEnvironment and deploymentNode describe the environment. containerInstance places a container on a node, a deployment view draws the diagram.",
  "site.stackLead": "Interface:",
  "site.hero.ctaPrimary": "Open editor without sign-up",
  "site.hero.ctaSecondary": "📲 Install on desktop / phone",
  "site.hero.trustOffline":
    "📶 Works offline: core features and the converter are available without internet.",
  "site.hero.trustAi":
    "🤖 AI & Wizard: generate diagrams from text or through a guided step-by-step flow.",
  "site.hero.trustConverter":
    "🔄 3-in-1 Converter: instant translation between PlantUML, Mermaid, and GraphML.",
  "site.hero.trustPwa":
    "💻 PWA App: install on Windows, macOS, Linux, iOS, and Android.",

  "site.pillars.title": "Everything for Diagrams-as-Code in one autonomous app",
  "site.pillars.item1.title": "🤖 Smart creation (AI & Wizard)",
  "site.pillars.item1.text":
    "Don't want to write syntax by hand? Describe your architecture in plain text for the AI assistant or answer the step-by-step Wizard questions. Get clean, valid diagram code in seconds.",
  "site.pillars.item2.title": "⚡️ Conversion & editing (Live Editor)",
  "site.pillars.item2.text":
    "A convenient online editor with instant preview. Convert PlantUML to Mermaid, Mermaid to GraphML, and back in one click. Forget compatibility issues between Notion, GitHub, and Draw.io.",
  "site.pillars.item3.title": "📲 PWA, offline mode, and storage",
  "site.pillars.item3.text":
    "Install Code2Graph as a native app on your laptop or tablet. Your work and projects are saved locally and in the cloud, so you can design architecture on a plane or without connectivity.",

  "site.deepDive.title": "Full control over your architecture documentation",
  "site.deepDive.item1.title": "🔄 Bidirectional format converter",
  "site.deepDive.item1.text":
    "Move legacy GraphML diagrams to modern Mermaid or PlantUML standards without losing links, nodes, or logical structure.",
  "site.deepDive.item2.title": "📝 Powerful live editor",
  "site.deepDive.item2.text":
    "Syntax highlighting, hints, and autocomplete. Instant rendering without delays.",
  "site.deepDive.item3.title": "☁️ Storage and local access",
  "site.deepDive.item3.text":
    "Save diagrams in a private library. Automatic PWA cache for safe offline work.",
  "site.deepDive.item4.title": "📤 One-click export",
  "site.deepDive.item4.text":
    "Download diagrams as vector (SVG, PDF) or raster (PNG). Copy ready code to the clipboard for Markdown / Confluence.",

  "site.formats.title": "One tool for all key standards",
  "site.formats.colFormat": "Format",
  "site.formats.colPurpose": "Purpose",
  "site.formats.colFeatures": "Code2Graph capabilities",
  "site.formats.plantuml.purpose": "Complex UML, sequence, class, and state diagrams",
  "site.formats.plantuml.features": "Editing, AI generation, conversion to Mermaid/GraphML",
  "site.formats.plantuml.summary":
    "Text UML for sequences, classes, states, C4, and more. Code2Graph renders it offline with @plantuml/core and the Smetana layout engine. C4 and ArchiMate diagrams use the matching PlantUML standard libraries.",
  "site.formats.mermaid.purpose": "Lightweight diagrams for GitHub, Notion, Obsidian, and Jira",
  "site.formats.mermaid.features": "Live preview, Wizard generation, export",
  "site.formats.mermaid.summary":
    "A compact diagram language for Markdown, GitHub, and notes. The editor renders Mermaid in the browser; the online mode can also use mermaid.ink.",
  "site.formats.graphml.purpose": "Topology graphs for yEd, Draw.io, and visualization systems",
  "site.formats.graphml.features": "Import, visualization, samples, conversion to code",
  "site.formats.graphml.summary":
    "An XML graph format used by yEd and other tools. Code2Graph reads GraphML and lays the graph out with dagre.",
  "site.formats.wiremark.purpose": "Hand-drawn UI wireframes inside markdown",
  "site.formats.wiremark.features": "Editing, live preview, sample screens",
  "site.formats.wiremark.summary":
    "Text wireframes that look like a sketch. Preview in the app is drawn by @wiremark/core.",
  "site.formats.d2.purpose": "Modern diagrams: architecture, sequence, classes, and SQL",
  "site.formats.d2.features": "Editing, offline preview, samples for the selected language",
  "site.formats.d2.summary":
    "A modern diagram language for architecture, sequences, classes, and SQL. The offline preview is compiled by @d2lang/d2.",
  "site.formats.structurizr.purpose": "C4 architecture as code: context, containers, components, deployment",
  "site.formats.structurizr.features": "Editing, offline C4 preview, samples for the selected language",
  "site.formats.structurizr.summary":
    "C4 architecture as code: landscape, context, containers, components, and deployment. The editor keeps the Structurizr DSL and draws views with PlantUML C4.",

  "site.audience.title": "Speeds up the whole engineering team",
  "site.audience.architect.title": "🏛 Software architects",
  "site.audience.architect.item1": "Quickly sketch C4 models and conceptual diagrams with AI.",
  "site.audience.architect.item2": "Bring all company documentation to a single standard.",
  "site.audience.dev.title": "👨‍💻 Developers and team leads",
  "site.audience.dev.item1": "Create sequence diagrams while designing tasks.",
  "site.audience.dev.item2": "Treat diagrams as code, store them in Git, and edit offline.",
  "site.audience.writer.title": "📝 Technical writers and business analysts",
  "site.audience.writer.item1": "Use the step-by-step Wizard to describe business processes.",
  "site.audience.writer.item2":
    "Easily convert diagrams for different platforms (Notion/Confluence).",

  "site.gettingStarted.title": "Start in 10 seconds — no complex setup",
  "site.gettingStarted.browser.title": "Option A: In the browser",
  "site.gettingStarted.browser.text":
    "Just open Code2Graph.ru and start creating or converting diagrams right away.",
  "site.gettingStarted.pwa.title": "Option B: As a PWA app",
  "site.gettingStarted.pwa.text":
    "Click Install app in the browser address bar or on the landing page. Code2Graph will appear on your desktop or phone home screen.",

  "site.faq.title": "Frequently asked questions",
  "site.faq.q1": "What is a PWA and how does offline mode work?",
  "site.faq.a1":
    "A Progressive Web App lets you use the website like a regular program on your device. After the first load, the app is cached locally so you can convert, edit, and view diagrams without internet.",
  "site.faq.q2": "Does AI generation work offline?",
  "site.faq.a2":
    "Manual editing, format conversion, the step-by-step Wizard, and storage work offline. AI requests require a network connection.",
  "site.faq.q3": "Can I convert PlantUML diagrams to Mermaid without data loss?",
  "site.faq.a3":
    "Yes. Our built-in converter translates syntax and nodes to preserve the logic of the original diagram.",
  "site.faq.q4": "Is it safe to store diagrams in Code2Graph?",
  "site.faq.a4":
    "Absolutely. Diagrams are saved locally in your browser / PWA app, and with an account they are securely stored in your private cloud.",

  "site.finalCta.title": "Your Swiss Army knife for Diagrams-as-Code",
  "site.finalCta.text":
    "Generate with AI, edit, convert, and store PlantUML, Mermaid, and GraphML diagrams in one place. Available right now on any device.",
  "site.finalCta.primary": "Open Code2Graph",
  "site.finalCta.secondary": "📲 Install PWA",

  "site.featureOffline": "Works offline and via file://",
  "site.featureFormats": "PlantUML · Mermaid · GraphML",
  "site.featureAi": "AI diagram generation and editing",
  "site.featureLibrary": "Cloud diagram library",
  "site.featureLlmLocal": "BYOK LLM keys stay in your browser",
  "site.loginTitle": "Sign in",
  "site.loginSubtitle": "Personal account and cloud library",
  "site.registerTitle": "Sign up",
  "site.registerSubtitle": "Create an account on the Code2Graph server",
  "site.accountTitle": "Account",
  "site.staticModeTitle": "Local edition",
  "site.staticModeText":
    "This build runs without a server or database: diagrams stay in your browser. Sign-in and the cloud library are available on the server edition.",
  "site.username": "Username",
  "site.password": "Password",
  "site.passwordConfirm": "Confirm password",
  "site.rememberMe": "Remember me",
  "site.loginSubmit": "Sign in",
  "site.registerSubmit": "Create account",
  "site.logout": "Sign out",
  "site.openEditor": "Open editor",
  "site.backHome": "Back to home",
  "site.mcp.title": "MCP for agents",
  "site.mcp.connected": "Connected",
  "site.mcp.disconnected": "Not connected",
  "site.mcp.lead":
    "An agent describes a diagram in words. Code2Graph picks the language and returns source and an image for PlantUML, Mermaid, GraphML, WireMark, D2, or Structurizr.",
  "site.mcp.pointPlan": "plan_diagram chooses the language and diagram type.",
  "site.mcp.pointGenerate": "generate_diagram returns the diagram source and an image.",
  "site.mcp.exampleCaption":
    "A generate_diagram result is source the editor can open, plus a rendered image of the diagram.",
  "site.mcp.exampleSource": "Source",
  "site.mcp.exampleImage": "Image",
  "site.mcp.pointLanguages": "The same six languages as the editor and the wizard.",
  "site.mcp.openPage": "How to connect MCP",
  "site.mcp.pageTitle": "Code2Graph MCP",
  "site.mcp.summary":
    "The MCP server lets Cursor and other agents ask Code2Graph for a diagram. It chooses a language from the request and returns source plus an image of the diagram.",
  "site.mcp.toolsTitle": "Tools",
  "site.mcp.toolList": "languages on the site and the diagram types each one accepts.",
  "site.mcp.toolPlan": "language and type for a sentence, without source.",
  "site.mcp.toolGenerate":
    "diagram source and an image. With CODE2GRAPH_API_URL the source comes from the server; otherwise the same scaffold is built locally. The picture is a separate block: Kroki draws PlantUML, D2, and Structurizr, mermaid.ink draws Mermaid, and GraphML and WireMark are drawn locally.",
  "site.mcp.connectTitle": "Connect in Cursor",
  "site.mcp.connectText":
    "Run the script from a checkout of this repository. Replace the path with your checkout. Leave the URL empty to generate locally, or point it at the server edition.",
  "site.mcp.source": "MCP package in the repository",
  "site.mcp.apiTitle": "Server API",
  "site.mcp.apiText":
    "The server edition exposes these routes. If AGENT_API_TOKEN is set, send Authorization: Bearer with the same value as CODE2GRAPH_API_TOKEN.",
  "site.mcp.apiFormats": "languages and types",
  "site.mcp.apiPlan": "choose a language",
  "site.mcp.apiScaffold": "language, type, and source",
  "site.mcp.staticNote":
    "GitHub Pages is a static editor and does not serve /api/agent. The API runs on the server edition, for example www.code2graph.ru.",
  "site.noAccount": "No account?",
  "site.hasAccount": "Already have an account?",
  "site.role": "Role",
  "site.loginError": "Invalid username or password",
  "site.registerError": "Registration failed",
  "site.registerDisabled": "Registration is disabled by the administrator",
  "site.registerStatusError":
    "Could not check server status. Verify your connection and try again.",
  "site.registerMismatch": "Passwords do not match",
  "site.registerRequired": "Fill in all fields",
  "site.welcomeUser": "Signed in as {username}",
  "site.versionHint": "Site version — compare after an update or page reload",
  "site.footer.links": "Project links",
  "site.license.title": "License",
  "site.license.summary":
    "Source-available under the Prosperity Public License 3.0.0. Free for non-commercial use.",
  "site.license.commercial":
    "Commercial use is free during a 30-day trial; a paid license is required afterwards.",
  "site.license.read": "Read license",
  "site.license.commercialLink": "Commercial license",
} as const satisfies LocaleMessages;
