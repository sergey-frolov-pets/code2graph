import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "Diagrams-as-Code Studio",
  "site.nav.features": "Features",
  "site.nav.converter": "Converter & AI",
  "site.nav.pwa": "PWA / Offline",
  "site.nav.formats": "Formats",
  "site.nav.faq": "FAQ",
  "site.nav.mcp": "MCP",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "PWA studio for PlantUML, Mermaid, and GraphML: AI, format converter, editor, and storage — on any device, even without internet.",
  "site.landingCtaApp": "Open editor",
  "site.landingCtaInstallPwa": "📲 Install PWA",
  "site.landingCtaRegister": "Sign up",
  "site.landingCtaLogin": "Sign in",
  "site.landingCtaTryFree": "Try for free",
  "site.landingCtaDemo": "Demo",

  "site.hero.title": "Text diagrams in the browser",
  "site.hero.subtitle":
    "Write a diagram and see it right away. PlantUML, Mermaid, GraphML, WireMark, D2, and Structurizr — including offline.",
  "site.offlineNote": "Editing and preview work without a network.",
  "site.languages.title": "Languages",
  "site.language.sites": "Sites",
  "site.language.libraries": "Libraries used in the app",
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
  "site.formats.graphml.features": "Import, visualization, conversion to code",
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
  "site.mcp.lead":
    "An agent describes a diagram in words. Code2Graph picks the language and returns source for PlantUML, Mermaid, GraphML, WireMark, D2, or Structurizr.",
  "site.mcp.pointPlan": "plan_diagram chooses the language and diagram type.",
  "site.mcp.pointGenerate": "generate_diagram returns the diagram source.",
  "site.mcp.pointLanguages": "The same six languages as the editor and the wizard.",
  "site.mcp.openPage": "How to connect MCP",
  "site.mcp.pageTitle": "Code2Graph MCP",
  "site.mcp.summary":
    "The MCP server lets Cursor and other agents ask Code2Graph for a diagram. It chooses a language from the request and returns source the editor can open.",
  "site.mcp.toolsTitle": "Tools",
  "site.mcp.toolList": "languages on the site and the diagram types each one accepts.",
  "site.mcp.toolPlan": "language and type for a sentence, without source.",
  "site.mcp.toolGenerate":
    "diagram source. With CODE2GRAPH_API_URL it calls the server; otherwise it builds the same scaffold locally.",
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
} as const satisfies LocaleMessages;
