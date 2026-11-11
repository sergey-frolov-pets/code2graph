import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "Diagrams-as-Code-Studio",
  "site.nav.features": "Funktionen",
  "site.nav.converter": "Konverter und KI",
  "site.nav.pwa": "PWA / Offline",
  "site.nav.formats": "Formate",
  "site.nav.faq": "FAQ",
  "site.nav.mcp": "MCP",
  "site.nav.github": "GitHub",
  "site.nav.discussions": "Diskussionen",
  "site.hero.askQuestion": "💬 Frage stellen",
  "site.github.star": "Star",
  "site.github.starLabel": "code2graph auf GitHub mit einem Stern versehen",
  "site.hero.viewOnGithub": "Auf GitHub ansehen",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "PWA-Studio für PlantUML, Mermaid, GraphML, WireMark, D2 und Structurizr. MCP für Agenten liefert den Diagrammquelltext und ein Bild.",
  "site.landingCtaApp": "Editor öffnen",
  "site.landingCtaInstallPwa": "📲 PWA installieren",
  "site.landingCtaRegister": "Registrieren",
  "site.landingCtaLogin": "Anmelden",
  "site.landingCtaTryFree": "Kostenlos testen",
  "site.landingCtaDemo": "Demo",

  "site.hero.title": "Textdiagramme im Browser",
  "site.hero.subtitle":
    "Schreiben Sie ein Diagramm und sehen Sie es sofort. PlantUML, Mermaid, GraphML, WireMark, D2 und Structurizr — auch offline. MCP gibt einem Agenten den Quelltext und ein Bild.",
  "site.offlineNote": "Bearbeitung und Vorschau funktionieren ohne Netz.",
  "site.languages.title": "Sprachen",
  "site.language.sites": "Websites",
  "site.language.libraries": "In der App genutzte Bibliotheken",
  "site.language.types": "Wichtige Diagrammtypen",
  "site.language.diagramTypes": "Diagrammtypen",
  "site.language.keywords": "Schlüsselwörter",
  "site.language.example": "Beispiel",
  "site.language.syntax": "Syntax",
  "site.language.preview": "So sieht es aus: {title}",
  "site.language.previewFailed": "Das Beispiel konnte nicht gezeichnet werden",
  "site.primer.graphml.type.directed.title": "Gerichteter Graph",
  "site.primer.graphml.type.directed.summary":
    "Kanten laufen von einer Quelle zu einem Ziel. So zeichnet Code2Graph GraphML standardmäßig.",
  "site.primer.graphml.type.undirected.title": "Ungerichteter Graph",
  "site.primer.graphml.type.undirected.summary":
    "Kanten verbinden nur Knoten, ohne Richtung.",
  "site.primer.wiremark.type.flow.title": "Verknüpfte Bildschirme",
  "site.primer.wiremark.type.flow.summary":
    "Mehrere Wireframes in einer Datei, mit Sprüngen to=#anchor dazwischen.",
  "site.primer.plantuml.kw.startuml":
    "@startuml und @enduml öffnen und schließen das Diagramm.",
  "site.primer.plantuml.kw.participant":
    "Eine benannte Lebenslinie. as gibt ihr einen kurzen Alias.",
  "site.primer.plantuml.kw.arrow": "Eine Nachricht: -> zu einem Teilnehmer, --> für die Antwort.",
  "site.primer.plantuml.kw.alt":
    "Sich ausschließende Zweige. else ist der andere Zweig, end schließt den Block.",
  "site.primer.plantuml.kw.note": "Eine Notiz links, rechts oder über Teilnehmern.",
  "site.primer.plantuml.kw.if":
    "Eine Aktivitätsentscheidung: then und else, geschlossen mit endif.",
  "site.primer.plantuml.kw.skinparam":
    "Eine gemeinsame Stileinstellung, etwa die Hintergrundfarbe.",
  "site.primer.plantuml.syntax.sequence":
    "actor und participant benennen eine Lebenslinie, as ist der kurze Alias. Eine Nachricht ist ->, eine Antwort ist -->, und die Beschriftung folgt dem Doppelpunkt.",
  "site.primer.plantuml.syntax.class":
    "class öffnet eine Klasse; Felder und Methoden stehen in den geschweiften Klammern. Eine Verknüpfung ist --> mit Multiplizität in Anführungszeichen.",
  "site.primer.plantuml.syntax.activity":
    "start und stop sind die Enden. Ein Schritt ist :text;. Eine Entscheidung ist if () then (), else und endif.",
  "site.primer.plantuml.syntax.state":
    "[*] ist Anfang und Ende. Ein Übergang ist -->, und die Ereignisbeschriftung folgt dem Doppelpunkt.",
  "site.primer.plantuml.syntax.usecase":
    "actor und usecase deklarieren den Akteur und den Fall. Die Verknüpfung ist -->, die Richtung ist left to right direction.",
  "site.primer.plantuml.syntax.c4_context":
    "Person(), System() und Rel() beschreiben Personen, das System und eine Verknüpfung. Die Bibliothek wird mit !include eingebunden.",
  "site.primer.mermaid.kw.participant":
    "Ein Sequenzteilnehmer. as ersetzt die sichtbare Beschriftung.",
  "site.primer.mermaid.kw.arrow":
    "Eine Nachricht: ->> ist ein durchgezogener Pfeil, -->> eine gepunktete Antwort.",
  "site.primer.mermaid.kw.alt":
    "Sequenzzweige. else ist der andere Zweig, end schließt den Block.",
  "site.primer.mermaid.kw.note": "Eine Notiz rechts von einem Teilnehmer oder über mehreren.",
  "site.primer.mermaid.kw.subgraph": "Eine Gruppe von Flussdiagrammknoten. Schließen Sie sie mit end.",
  "site.primer.mermaid.kw.class": "Eine Klasse mit Feldern und Methoden in classDiagram.",
  "site.primer.mermaid.kw.section": "Eine Aufgabengruppe in einem Gantt-Diagramm.",
  "site.primer.mermaid.syntax.flowchart":
    "flowchart TD setzt die Richtung. Ein Schritt ist [text], eine Entscheidung ist {text}, ein Start ist ([text]). Ein Pfeil ist -->, eine Zweigbeschriftung ist |yes|.",
  "site.primer.mermaid.syntax.sequence":
    "sequenceDiagram öffnet das Diagramm. actor und participant mit as benennen eine Lebenslinie. Eine Anfrage ist ->>, eine Antwort ist -->>.",
  "site.primer.mermaid.syntax.class":
    "classDiagram öffnet das Diagramm. class Name { } enthält Felder +name type und Methoden. Eine Verknüpfung ist -->.",
  "site.primer.mermaid.syntax.state":
    "stateDiagram-v2 öffnet das Diagramm. [*] ist der Start. Ein Übergang ist -->, und die Beschriftung folgt dem Doppelpunkt.",
  "site.primer.mermaid.syntax.er":
    "erDiagram öffnet das Diagramm. ||--o{ liest sich als eins-zu-viele, und die Rolle folgt dem Doppelpunkt.",
  "site.primer.mermaid.syntax.gantt":
    "gantt öffnet das Diagramm. title ist die Überschrift, dateFormat das Datumsformat, section eine Gruppe. Eine Aufgabe ist name :id, date, duration.",
  "site.primer.mermaid.syntax.mindmap":
    "mindmap öffnet die Karte. Die Wurzel ist root((topic)). Die Einrückung setzt die Verschachtelung.",
  "site.primer.mermaid.syntax.pie":
    "pie showData gibt die Zahlen aus. title ist die Überschrift. Ein Segment ist \"name\" : number.",
  "site.primer.mermaid.syntax.journey":
    "journey öffnet den Weg. title ist die Überschrift, section eine Stufe. Eine Aufgabe ist name: score: role.",
  "site.primer.mermaid.syntax.gitgraph":
    "gitGraph öffnet die Historie. commit ist ein Commit, branch ein Branch, checkout wechselt, merge führt zusammen.",
  "site.primer.mermaid.syntax.timeline":
    "timeline öffnet die Skala. title ist die Überschrift, section ein Zeitraum. Ereignisse folgen dem Doppelpunkt.",
  "site.primer.mermaid.syntax.sankey":
    "sankey-beta öffnet die Flüsse. Jede Zeile ist source,target,weight. Knotennamen sind ASCII; einen Namen mit Komma in Anführungszeichen setzen. Optionen sind keine CSV-Spalten: Setzen Sie sie in einem YAML-Kopf config.sankey vor dem Schlüsselwort (showValues, prefix, suffix, linkColor, nodeAlignment, width, height, useMaxWidth, nodeWidth, nodePadding, labelStyle, nodeColors).",
  "site.primer.mermaid.syntax.xychart":
    "xychart-beta öffnet das Diagramm. x-axis sind die Kategorien, y-axis der Bereich, bar und line sind Reihen.",
  "site.primer.mermaid.syntax.block":
    "block-beta öffnet die Blöcke. columns setzt die Spaltenzahl. Ein Block ist id[\"label\"], eine Verknüpfung ist -->.",
  "site.primer.mermaid.syntax.c4_context":
    "C4Context öffnet den Kontext. Person() und System() deklarieren Elemente, Rel() ist eine Verknüpfung.",
  "site.primer.mermaid.syntax.requirement":
    "requirementDiagram öffnet das Diagramm. requirement { } ist eine Anforderung, element { } ein Element, die Verknüpfung ist satisfies.",
  "site.primer.mermaid.syntax.quadrant":
    "quadrantChart öffnet die Quadranten. x-axis und y-axis sind die Achsen, quadrant-1 … quadrant-4 die Namen, ein Punkt ist name: [x, y].",
  "site.primer.mermaid.syntax.architecture":
    "architecture-beta öffnet das Diagramm. group ist eine Gruppe, service ein Dienst, eine Verknüpfung ist service:R --> L:service.",
  "site.primer.mermaid.syntax.packet":
    "packet-beta öffnet das Paket. title ist die Überschrift. Ein Feld ist ein Bitbereich und eine Beschriftung, zum Beispiel 0-15: \"Quelle\".",
  "site.ext.mermaid.title": "Erweiterung Mermaid Ext",
  "site.ext.mermaid.lead":
    "Fünf Diagrammtypen, die Mermaid allein nicht hat: Wasserfall, Blasen, Heatmap, Organigramm und Fertigstellungswert. Gezeichnet von einer eingebauten Engine, ohne externe Dienste.",
  "site.ext.mermaid.note":
    "Alle fünf Typen zeichnet die eingebaute Engine, ohne externe Dienste. Wenn das Beispiel unten im Editor nicht erscheint, wurde dieser Build ohne die Erweiterung erstellt.",
  "site.ext.mermaid.type.waterfall": "Wasserfall",
  "site.ext.mermaid.type.bubble": "Blasen",
  "site.ext.mermaid.type.heatmap": "Heatmap",
  "site.ext.mermaid.type.orgchart": "Organigramm",
  "site.ext.mermaid.type.ev": "Fertigstellungswert",
  "site.ext.mermaid.type.boxplot": "Boxplot",
  "site.ext.mermaid.type.treemap": "Treemap",
  "site.ext.mermaid.type.radar": "Netzdiagramm",
  "site.ext.mermaid.type.voronoi": "Voronoi-Zerlegung",
  "site.ext.mermaid.type.clustered": "Reihendiagramm",
  "site.ext.mermaid.desc.waterfall":
    "Wie ein Startwert über Schritte + und − zur Summe wird. Absolute Spalten beginnen mit =, mehrere Szenarien werden mit series deklariert. Achsenunterbrechungen, Schwarz-Weiß-Modus (mono und mono invert) und eigene Farben werden unterstützt.",
  "site.ext.mermaid.desc.bubble":
    "Drei Dimensionen zugleich: x, y und Blasengröße. Optional BCG-Quadranten und Farbgruppen.",
  "site.ext.mermaid.desc.heatmap":
    "Eine Wertematrix mit Farbskala. Skalenbereiche sind ausdrücklich gesetzt, eine leere Zelle (zwei Trennzeichen hintereinander) wird grau gezeichnet.",
  "site.ext.mermaid.desc.orgchart":
    "Ein Berichtsbaum mit ausdrücklichen Kanten: durchgezogen ist die Hauptlinie, gepunktet -.-> eine zweite Führungskraft. Ein Block kann seine Füllung (color) und seinen Rand (border, style) setzen. Mehrere Wurzeln werden unter einer unsichtbaren Wurzel gesammelt.",
  "site.ext.mermaid.desc.ev":
    "Drei kumulierte Kurven nach Tag: Planwert PV, Fertigstellungswert EV und Istkosten AC. Dazu die Abweichungen SV und CV in der Legende.",
  "site.ext.mermaid.desc.boxplot":
    "Verteilung über Kategorien: Minimum, unteres und oberes Quartil (Q1, Q3), Median, Maximum, Mittelwert und Ausreißer. Nimmt entweder eine ausdrückliche Fünf-Zahlen-Zusammenfassung oder Rohbeobachtungen (values=) an.",
  "site.ext.mermaid.desc.treemap":
    "Hierarchische Rechteckaufteilung über Gruppen und Elemente im Verhältnis zum Zahlengewicht, mit automatischen Prozentanteilen und Farbabstufung.",
  "site.ext.mermaid.desc.radar":
    "Vergleicht mehrere Reihen über radiale Achsen von einem gemeinsamen Mittelpunkt, mit einstellbaren Gitterringen, Fülldeckkraft und eigenen Farben.",
  "site.ext.mermaid.desc.voronoi":
    "Geometrische Aufteilung einer Ebene in konvexe Zellen der nächsten Nachbarn, mit Farbgruppen und Beschriftungen der Schwerpunkte.",
  "site.ext.mermaid.desc.clustered":
    "Balken mehrerer Reihen über Kategorien, nebeneinander oder gestapelt, mit überlagerten Linien, waagerechten Niveaus, einer Achsenunterbrechung, CAGR-Hinweisen, einer Drehung um 90 Grad (rotate 90), einer umgedrehten Hochachse (invert y) und Schwarz-Weiß-Modus (mono, mono invert).",
  "site.ext.mermaid.syntax.waterfall":
    "waterfall öffnet das Diagramm. y setzt die Achse. = ist eine absolute Spalte, + und - sind ein Schritt, und die Beschriftung folgt dem Doppelpunkt. \\n in einer Beschriftung bricht die Zeile um.",
  "site.ext.mermaid.syntax.bubble":
    "bubble öffnet das Diagramm. x, y und size setzen die Achsen und die Größe. In data ist ein Punkt name : x=, y=, size=. \\n in einem Namen bricht die Zeile um.",
  "site.ext.mermaid.syntax.heatmap":
    "heatmap öffnet die Karte. x und y sind die Achsenbeschriftungen. In data ist eine Zeile name : kommagetrennte Zahlen. \\n in einer Beschriftung bricht die Zeile um.",
  "site.ext.mermaid.syntax.orgchart":
    "orgchart öffnet den Baum. Ein Knoten ist id [role\\nname] (\\n bricht die Zeile um, der Kasten passt sich dem Text an); color=#hex setzt die Füllung, border=#hex und style=solid|dash|dot|dashdot setzen Randfarbe und Stil. Eine durchgezogene Kante ist ->, eine zweite Führungskraft ist -.->.",
  "site.ext.mermaid.syntax.ev":
    "ev öffnet das Diagramm. days sind die Tage, pv der Plan, ev der Fertigstellungswert, ac die Istkosten. \\n in einer Tagesbeschriftung bricht die Zeile um.",
  "site.ext.mermaid.syntax.boxplot":
    "boxplot öffnet das Diagramm. Kategorienzeile: Name : min=, q1=, median=, q3=, max= (oder values=v1, v2, …) mit optionalem color=#hex. \\n in einem Namen bricht die Zeile um.",
  "site.ext.mermaid.syntax.treemap":
    "treemap öffnet die Karte. Zeile: Gruppe / Element : weight [color=#hex]. labels steuert die Anzeige von Wert und Prozent. \\n in einem Namen bricht die Zeile um.",
  "site.ext.mermaid.syntax.radar":
    "radar öffnet das Diagramm. axes listet die Speichenbeschriftungen, series Name : v1, v2, … definiert eine Datenreihe. \\n in einer Beschriftung bricht die Zeile um.",
  "site.ext.mermaid.syntax.voronoi":
    "voronoi öffnet die Zerlegung. In data ist ein Standort Name : x=, y=, group=, color=#hex. \\n in einem Namen bricht die Zeile um.",
  "site.ext.mermaid.syntax.clustered":
    "series öffnet das Diagramm. categories listet die Kategorien auf, series Name : v1, v2, … zeichnet Balken, und der Name darf entfallen (`series : v1, v2`); eine leere Stelle, \"-\" oder null lässt einen Balken aus. line Label : v1, v2, … zeichnet eine Linie, und die Beschriftung darf entfallen (`line : v1, v2`) (eine ausgelassene Stelle verbindet die Punkte auf beiden Seiten), die Beschriftung steht rechts neben der Grafik; color und style=solid|dash|dot|dashdot legen den Strich fest. line 160 \"plan\" zeichnet ein waagerechtes Niveau (ohne Doppelpunkt). break 200 --> 700 schneidet einen Abschnitt aus der Achse. cagr ist die CAGR vom ersten Balken bis zum letzten, cagr 2, 7 verbindet diese Balken; format, prefix und label steuern das Oval. format=\"±0.0%\" setzt ein Plus nur, wenn der Wert positiv ist. Pfeile, die sich nicht überlappen, teilen sich eine Ebene. Aufeinanderfolgende cagr-Zeilen gelten für eine Reihe. stacked stapelt die Reihen, stacked off stellt die Balken nebeneinander, rotate 90 dreht das Diagramm. invert y zusammen mit rotate 90 setzt die erste Kategorie nach unten, und invert y off stellt die Reihenfolge von oben nach unten wieder her. y2 \"Beschriftung\" 0 --> 40 zeichnet eine zweite Skala (rechts, bei rotate 90 oben), und axis=y2 bindet eine Serie, Linie oder Ebene daran. \\n in einer Beschriftung bricht die Zeile um.",
  "site.primer.graphml.kw.graphml":
    "Die Dokumentwurzel. Der GraphML-Namensraum ist erforderlich.",
  "site.primer.graphml.kw.graph":
    "Der Graph selbst. edgedefault ist directed oder undirected.",
  "site.primer.graphml.kw.node": "Ein Knoten. id muss eindeutig sein.",
  "site.primer.graphml.kw.edge": "Eine Kante. source und target verweisen auf Knoten-ids.",
  "site.primer.graphml.kw.key": "Deklariert ein Attribut für Knoten oder Kanten.",
  "site.primer.graphml.kw.data":
    "Ein Attributwert. Die sichtbare Beschriftung steht hier, nicht in der id.",
  "site.primer.graphml.syntax.directed":
    "graphml ist die Wurzel, graph edgedefault=\"directed\" ist ein gerichteter Graph. node ist ein Knoten, edge source und target eine Kante, data die Beschriftung.",
  "site.primer.graphml.syntax.undirected":
    "Dieselbe Form, mit edgedefault=\"undirected\": Eine Kante verbindet nur Knoten.",
  "site.primer.wiremark.kw.wireframe":
    "Ein Bildschirm. Der Name nach # ist der Anker, auf den andere Bildschirme verlinken.",
  "site.primer.wiremark.kw.flow":
    "Verbindet mehrere Bildschirme. LR zeichnet die Verknüpfungen von links nach rechts.",
  "site.primer.wiremark.kw.stack":
    "Eine Spalte oder eine Zeile. gap setzt den Abstand, die Einrückung die Verschachtelung.",
  "site.primer.wiremark.kw.typography":
    "Text. h4 und body1 wählen die Ebene, die Zeichenkette in Anführungszeichen ist die Beschriftung.",
  "site.primer.wiremark.kw.textfield":
    "Eine Eingabe. Die Beschriftung steht in Anführungszeichen, Einstellungen wie required nicht.",
  "site.primer.wiremark.kw.button":
    "Eine Schaltfläche. contained füllt sie, to=#id springt zu einem anderen Bildschirm.",
  "site.primer.wiremark.syntax.wireframe":
    "Wireframe #anchor öffnet einen Bildschirm. Stack baut eine Spalte, Typography ist Text, TextField eine Eingabe, Button eine Schaltfläche.",
  "site.primer.wiremark.syntax.flow":
    "Flow LR verknüpft Bildschirme von links nach rechts. to=#anchor an einer Schaltfläche springt zu einem anderen Wireframe.",
  "site.primer.d2.kw.direction":
    "Layoutrichtung: down, right, left oder up.",
  "site.primer.d2.kw.shape":
    "Knotenform: person, cylinder, class, sql_table, sequence_diagram.",
  "site.primer.d2.kw.arrow": "Eine Verknüpfung zwischen Knoten. Die Beschriftung folgt dem Doppelpunkt.",
  "site.primer.d2.kw.style": "Knotenstil: fill, stroke und font.",
  "site.primer.d2.kw.constraint":
    "Eine SQL-Spaltbedingung: primary_key, foreign_key oder unique.",
  "site.primer.d2.syntax.flowchart":
    "direction setzt das Layout. shape: person und shape: cylinder sind Knotenformen. Eine Verknüpfung ist -> mit einer Beschriftung nach dem Doppelpunkt.",
  "site.primer.d2.syntax.sequence":
    "shape: sequence_diagram macht den Block zu einer Sequenz. Teilnehmer sind verschachtelte Knoten, eine Nachricht ist ->.",
  "site.primer.d2.syntax.class":
    "shape: class macht den Block zu einer Klasse. Felder und Methoden sind Zeilen im Block, eine Verknüpfung ist ->.",
  "site.primer.d2.syntax.er":
    "shape: sql_table macht den Block zu einer Tabelle. constraint: primary_key und foreign_key markieren Schlüssel, eine Verknüpfung ist field -> field.",
  "site.primer.d2.syntax.architecture":
    "Verschachtelte Blöcke gruppieren Knoten. shape setzt die Form, -> ist eine beschriftete Verknüpfung.",
  "site.primer.structurizr.kw.workspace":
    "Die Dokumentwurzel: ein Name und eine kurze Beschreibung des Modells.",
  "site.primer.structurizr.kw.person": "Eine Person, die das System nutzt.",
  "site.primer.structurizr.kw.softwareSystem": "Ein Softwaresystem im Modell.",
  "site.primer.structurizr.kw.container":
    "Eine Anwendung oder ein Datenspeicher in einem System. Das dritte Argument ist die Technologie.",
  "site.primer.structurizr.kw.arrow":
    "Wer wen aufruft. Die Beziehungsbeschriftung steht in Anführungszeichen.",
  "site.primer.structurizr.kw.views": "Welche Ansichten aus dem Modell gezeichnet werden.",
  "site.primer.structurizr.kw.autolayout":
    "Automatisches Ansichtslayout: tb ist von oben nach unten, lr von links nach rechts.",
  "site.primer.structurizr.syntax.c4_context":
    "workspace öffnet das Dokument. person und softwareSystem beschreiben das Modell, -> ist eine Beziehung, systemContext und autolayout bauen die Ansicht.",
  "site.primer.structurizr.syntax.c4_container":
    "container innerhalb von softwareSystem ist eine Anwendung. Eine Container-Ansicht und include * sammeln die Container.",
  "site.primer.structurizr.syntax.component":
    "component innerhalb von container beschreibt ein Modul. Eine Komponentenansicht zeichnet diesen Container.",
  "site.primer.structurizr.syntax.deployment":
    "deploymentEnvironment und deploymentNode beschreiben die Umgebung. containerInstance setzt einen Container auf einen Knoten, eine Deployment-Ansicht zeichnet das Diagramm.",
  "site.stackLead": "Oberfläche:",
  "site.hero.ctaPrimary": "Editor ohne Registrierung öffnen",
  "site.hero.ctaSecondary": "📲 Auf Desktop oder Smartphone installieren",
  "site.hero.trustOffline":
    "📶 Funktioniert offline: Kernfunktionen und der Konverter sind ohne Internet verfügbar.",
  "site.hero.trustAi":
    "🤖 KI und Assistent: Diagramme aus Text oder in einem geführten Ablauf erzeugen.",
  "site.hero.trustConverter":
    "🔄 3-in-1-Konverter: sofortige Umwandlung zwischen PlantUML, Mermaid und GraphML.",
  "site.hero.trustPwa":
    "💻 PWA-App: Installation unter Windows, macOS, Linux, iOS und Android.",

  "site.pillars.title": "Alles für Diagrams-as-Code in einer eigenständigen App",
  "site.pillars.item1.title": "🤖 Intelligentes Erstellen (KI und Assistent)",
  "site.pillars.item1.text":
    "Sie möchten die Syntax nicht von Hand schreiben? Beschreiben Sie Ihre Architektur in Klartext für den KI-Assistenten oder beantworten Sie die Fragen des schrittweisen Assistenten. Sauberer, gültiger Diagrammcode entsteht in Sekunden.",
  "site.pillars.item2.title": "⚡️ Umwandlung und Bearbeitung (Live-Editor)",
  "site.pillars.item2.text":
    "Ein komfortabler Online-Editor mit sofortiger Vorschau. Wandeln Sie PlantUML in Mermaid, Mermaid in GraphML und zurück um — mit einem Klick. Schluss mit Kompatibilitätsproblemen zwischen Notion, GitHub und Draw.io.",
  "site.pillars.item3.title": "📲 PWA, Offline-Modus und Speicher",
  "site.pillars.item3.text":
    "Installieren Sie Code2Graph als native App auf Laptop oder Tablet. Arbeit und Projekte bleiben lokal und in der Cloud, sodass Sie Architektur im Flugzeug oder ohne Verbindung entwerfen können.",

  "site.deepDive.title": "Volle Kontrolle über Ihre Architekturdokumentation",
  "site.deepDive.item1.title": "🔄 Konverter in beide Richtungen",
  "site.deepDive.item1.text":
    "Überführen Sie ältere GraphML-Diagramme in moderne Mermaid- oder PlantUML-Standards, ohne Verknüpfungen, Knoten oder die logische Struktur zu verlieren.",
  "site.deepDive.item2.title": "📝 Leistungsfähiger Live-Editor",
  "site.deepDive.item2.text":
    "Syntaxhervorhebung, Hinweise und Autovervollständigung. Sofortige Darstellung ohne Wartezeit.",
  "site.deepDive.item3.title": "☁️ Speicher und lokaler Zugriff",
  "site.deepDive.item3.text":
    "Speichern Sie Diagramme in einer privaten Bibliothek. Automatischer PWA-Zwischenspeicher für sicheres Arbeiten offline.",
  "site.deepDive.item4.title": "📤 Export mit einem Klick",
  "site.deepDive.item4.text":
    "Laden Sie Diagramme als Vektor (SVG) oder Raster (PNG) herunter. Kopieren Sie fertigen Code in die Zwischenablage für Markdown / Confluence.",

  "site.formats.title": "Ein Werkzeug für alle wichtigen Standards",
  "site.formats.colFormat": "Format",
  "site.formats.colPurpose": "Zweck",
  "site.formats.colFeatures": "Fähigkeiten von Code2Graph",
  "site.formats.plantuml.purpose": "Komplexe UML-, Sequenz-, Klassen- und Zustandsdiagramme",
  "site.formats.plantuml.features": "Bearbeitung, KI-Erzeugung, Umwandlung nach Mermaid/GraphML",
  "site.formats.plantuml.summary":
    "Text-UML für Sequenzen, Klassen, Zustände, C4 und mehr. Code2Graph stellt sie offline mit @plantuml/core und der Layout-Engine Smetana dar. C4- und ArchiMate-Diagramme nutzen die passenden PlantUML-Standardbibliotheken.",
  "site.formats.mermaid.purpose": "Leichte Diagramme für GitHub, Notion, Obsidian und Jira",
  "site.formats.mermaid.features": "Live-Vorschau, Erzeugung mit dem Assistenten, Export",
  "site.formats.mermaid.summary":
    "Eine kompakte Diagrammsprache für Markdown, GitHub und Notizen. Der Editor stellt Mermaid im Browser dar; der Online-Modus kann auch mermaid.ink nutzen.",
  "site.formats.graphml.purpose": "Topologiegraphen für yEd, Draw.io und Visualisierungssysteme",
  "site.formats.graphml.features": "Import, Visualisierung, Beispiele, Umwandlung in Code",
  "site.formats.graphml.summary":
    "Ein XML-Graphformat, das yEd und andere Werkzeuge nutzen. Code2Graph liest GraphML und legt den Graph mit dagre aus.",
  "site.formats.wiremark.purpose": "Handgezeichnete UI-Wireframes in Markdown",
  "site.formats.wiremark.features": "Bearbeitung, Live-Vorschau, Beispielbildschirme",
  "site.formats.wiremark.summary":
    "Text-Wireframes, die wie eine Skizze aussehen. Die Vorschau in der App zeichnet @wiremark/core.",
  "site.formats.d2.purpose": "Moderne Diagramme: Architektur, Sequenz, Klassen und SQL",
  "site.formats.d2.features": "Bearbeitung, Offline-Vorschau, Beispiele für die gewählte Sprache",
  "site.formats.d2.summary":
    "Eine moderne Diagrammsprache für Architektur, Sequenzen, Klassen und SQL. Die Offline-Vorschau kompiliert @d2lang/d2.",
  "site.formats.structurizr.purpose": "C4-Architektur als Code: Kontext, Container, Komponenten, Deployment",
  "site.formats.structurizr.features": "Bearbeitung, Offline-C4-Vorschau, Beispiele für die gewählte Sprache",
  "site.formats.structurizr.summary":
    "C4-Architektur als Code: Landschaft, Kontext, Container, Komponenten und Deployment. Der Editor behält die Structurizr DSL und zeichnet Ansichten mit PlantUML C4.",

  "site.audience.title": "Beschleunigt das ganze Entwicklungsteam",
  "site.audience.architect.title": "🏛 Softwarearchitekten",
  "site.audience.architect.item1": "C4-Modelle und Konzeptdiagramme schnell mit KI skizzieren.",
  "site.audience.architect.item2": "Die gesamte Unternehmensdokumentation auf einen Standard bringen.",
  "site.audience.dev.title": "👨‍💻 Entwickler und Teamleitungen",
  "site.audience.dev.item1": "Sequenzdiagramme schon beim Entwurf von Aufgaben erstellen.",
  "site.audience.dev.item2": "Diagramme als Code behandeln, in Git ablegen und offline bearbeiten.",
  "site.audience.writer.title": "📝 Technische Redaktion und Business-Analysten",
  "site.audience.writer.item1": "Den schrittweisen Assistenten nutzen, um Geschäftsprozesse zu beschreiben.",
  "site.audience.writer.item2":
    "Diagramme leicht für verschiedene Plattformen umwandeln (Notion/Confluence).",

  "site.gettingStarted.title": "Start in 10 Sekunden — ohne aufwendige Einrichtung",
  "site.gettingStarted.browser.title": "Variante A: Im Browser",
  "site.gettingStarted.browser.text":
    "Öffnen Sie einfach Code2Graph.ru und legen Sie sofort mit dem Erstellen oder Umwandeln von Diagrammen los.",
  "site.gettingStarted.pwa.title": "Variante B: Als PWA-App",
  "site.gettingStarted.pwa.text":
    "Klicken Sie in der Adresszeile des Browsers oder auf der Startseite auf App installieren. Code2Graph erscheint auf dem Desktop oder dem Startbildschirm des Telefons.",

  "site.faq.title": "Häufige Fragen",
  "site.faq.q1": "Was ist eine PWA und wie funktioniert der Offline-Modus?",
  "site.faq.a1":
    "Eine Progressive Web App lässt die Website wie ein gewöhnliches Programm auf dem Gerät nutzen. Nach dem ersten Laden liegt die App lokal im Zwischenspeicher, sodass Sie Diagramme ohne Internet umwandeln, bearbeiten und ansehen können.",
  "site.faq.q2": "Funktioniert die KI-Erzeugung offline?",
  "site.faq.a2":
    "Manuelle Bearbeitung, Formatumwandlung, der schrittweise Assistent und der Speicher funktionieren offline. KI-Anfragen brauchen eine Netzverbindung.",
  "site.faq.q3": "Kann ich PlantUML-Diagramme ohne Datenverlust nach Mermaid umwandeln?",
  "site.faq.a3":
    "Ja. Der eingebaute Konverter überträgt Syntax und Knoten, damit die Logik des ursprünglichen Diagramms erhalten bleibt.",
  "site.faq.q4": "Ist es sicher, Diagramme in Code2Graph zu speichern?",
  "site.faq.a4":
    "Ja. Diagramme werden lokal in Ihrem Browser bzw. in der PWA gespeichert, und mit einem Konto liegen sie sicher in Ihrer privaten Cloud.",

  "site.finalCta.title": "Ihr Schweizer Taschenmesser für Diagrams-as-Code",
  "site.finalCta.text":
    "Erzeugen Sie mit KI, bearbeiten, wandeln und speichern Sie Diagramme in PlantUML, Mermaid und GraphML an einem Ort. Sofort auf jedem Gerät verfügbar.",
  "site.finalCta.primary": "Code2Graph öffnen",
  "site.finalCta.secondary": "📲 PWA installieren",

  "site.featureOffline": "Funktioniert offline und über file://",
  "site.featureFormats": "PlantUML · Mermaid · GraphML",
  "site.featureAi": "KI-Erzeugung und -Bearbeitung von Diagrammen",
  "site.featureLibrary": "Cloud-Diagrammbibliothek",
  "site.featureLlmLocal": "BYOK-LLM-Schlüssel bleiben in Ihrem Browser",
  "site.loginTitle": "Anmelden",
  "site.loginSubtitle": "Persönliches Konto und Cloud-Bibliothek",
  "site.registerTitle": "Registrieren",
  "site.registerSubtitle": "Ein Konto auf dem Code2Graph-Server erstellen",
  "site.accountTitle": "Konto",
  "site.staticModeTitle": "Lokale Ausgabe",
  "site.staticModeText":
    "Dieser Build läuft ohne Server und ohne Datenbank: Diagramme bleiben in Ihrem Browser. Anmeldung und Cloud-Bibliothek gibt es in der Serverausgabe.",
  "site.username": "Benutzername",
  "site.password": "Passwort",
  "site.passwordConfirm": "Passwort bestätigen",
  "site.rememberMe": "Angemeldet bleiben",
  "site.loginSubmit": "Anmelden",
  "site.registerSubmit": "Konto erstellen",
  "site.logout": "Abmelden",
  "site.openEditor": "Editor öffnen",
  "site.backHome": "Zur Startseite",
  "site.mcp.title": "MCP für Agenten",
  "site.mcp.connected": "Verbunden",
  "site.mcp.disconnected": "Nicht verbunden",
  "site.mcp.lead":
    "Ein Agent beschreibt ein Diagramm in Worten. Code2Graph wählt die Sprache und liefert Quelltext und Bild für PlantUML, Mermaid, GraphML, WireMark, D2 oder Structurizr.",
  "site.mcp.pointPlan": "plan_diagram wählt Sprache und Diagrammtyp.",
  "site.mcp.pointGenerate": "generate_diagram liefert den Diagrammquelltext und ein Bild.",
  "site.mcp.exampleCaption":
    "Ein Ergebnis von generate_diagram ist Quelltext, den der Editor öffnen kann, plus ein gerendertes Bild des Diagramms.",
  "site.mcp.exampleSource": "Quelltext",
  "site.mcp.exampleImage": "Bild",
  "site.mcp.pointLanguages": "Dieselben sechs Sprachen wie Editor und Assistent.",
  "site.mcp.openPage": "So verbinden Sie MCP",
  "site.mcp.pageTitle": "Code2Graph MCP",
  "site.mcp.summary":
    "Der MCP-Server lässt Cursor und andere Agenten Code2Graph nach einem Diagramm fragen. Er wählt aus der Anfrage eine Sprache und liefert den Quelltext plus ein Bild des Diagramms.",
  "site.mcp.toolsTitle": "Werkzeuge",
  "site.mcp.toolList": "Sprachen der Website und die Diagrammtypen, die jede annimmt.",
  "site.mcp.toolPlan": "Sprache und Typ für einen Satz, ohne Quelltext.",
  "site.mcp.toolGenerate":
    "Diagrammquelltext und ein Bild. Mit CODE2GRAPH_API_URL kommt der Quelltext vom Server; sonst wird dasselbe Gerüst lokal gebaut. Das Bild ist ein eigener Block: Kroki zeichnet PlantUML, D2 und Structurizr, mermaid.ink zeichnet Mermaid, GraphML und WireMark werden lokal gezeichnet.",
  "site.mcp.connectTitle": "In Cursor verbinden",
  "site.mcp.connectText":
    "Führen Sie das Skript aus einem Checkout dieses Repositorys aus. Ersetzen Sie den Pfad durch Ihren Checkout. Lassen Sie die URL leer, um lokal zu erzeugen, oder zeigen Sie auf die Serverausgabe.",
  "site.mcp.source": "MCP-Paket im Repository",
  "site.mcp.apiTitle": "Server-API",
  "site.mcp.apiText":
    "Die Serverausgabe stellt diese Routen bereit. Wenn AGENT_API_TOKEN gesetzt ist, senden Sie Authorization: Bearer mit demselben Wert wie CODE2GRAPH_API_TOKEN.",
  "site.mcp.apiFormats": "Sprachen und Typen",
  "site.mcp.apiPlan": "eine Sprache wählen",
  "site.mcp.apiScaffold": "Sprache, Typ und Quelltext",
  "site.mcp.staticNote":
    "GitHub Pages ist ein statischer Editor und stellt /api/agent nicht bereit. Die API läuft auf der Serverausgabe, zum Beispiel www.code2graph.ru.",
  "site.mcp.catalogTitle": "Katalog der Möglichkeiten",
  "site.mcp.catalogText":
    "Der Katalog liegt unter /llm/ auf demselben Host. Der lokale MCP-Prozess liest dieselben Seiten von der Festplatte und fragt für die Syntax keinen anderen Server. Die Antwort ist der Quelltext für den Editor, ohne Bild und ohne externen Renderer.",
  "site.mcp.toolCapabilities":
    "eine Indexseite der Sprachen oder einer Sprache, wenn die Sprache gesetzt ist. Kartentexte fehlen.",
  "site.mcp.toolSyntax":
    "eine Syntaxseite nach Schlüsselwörtern oder nach einem Pfad aus einem vorherigen Link. Verlinkte Seiten werden nicht zusammengefügt.",
  "site.noAccount": "Noch kein Konto?",
  "site.hasAccount": "Sie haben bereits ein Konto?",
  "site.role": "Rolle",
  "site.loginError": "Benutzername oder Passwort ungültig",
  "site.registerError": "Registrierung fehlgeschlagen",
  "site.registerDisabled": "Die Registrierung ist vom Administrator deaktiviert",
  "site.registerStatusError":
    "Der Serverstatus konnte nicht geprüft werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
  "site.registerMismatch": "Die Passwörter stimmen nicht überein",
  "site.registerRequired": "Füllen Sie alle Felder aus",
  "site.welcomeUser": "Angemeldet als {username}",
  "site.versionHint": "Website-Version — nach einer Aktualisierung oder einem Neuladen vergleichen",
  "site.footer.links": "Projektlinks",
  "site.license.title": "Lizenz",
  "site.license.summary":
    "Quelltext verfügbar unter der Prosperity Public License 3.0.0. Kostenlos für die nicht kommerzielle Nutzung.",
  "site.license.commercial":
    "Die kommerzielle Nutzung ist während einer 30-tägigen Testphase kostenlos; danach ist eine kostenpflichtige Lizenz erforderlich.",
  "site.license.read": "Lizenz lesen",
  "site.license.commercialLink": "Kommerzielle Lizenz",
  "site.landing.showcaseTitle": "Ansehen, anklicken, bearbeiten",
  "site.landing.showcaseHint": "Jedes Bild unten öffnet sich im Editor",
  "site.landing.tryScenario": "Dieses Szenario testen",
  "site.landing.openInEditor": "Im Editor öffnen",
  "site.landing.allFormats": "6 Sprachen — ein Editor",
  "site.landing.privacyTitle": "Privat auf Ihrem Gerät",
  "site.landing.privacyLocal": "Diagramme entstehen in Ihrem Browser",
  "site.landing.privacyKey": "Ihr KI-Schlüssel bleibt in Ihrem Browser",
  "site.landing.privacyCloud": "Cloud nur mit Konto; KI nutzt das Netz Ihres Anbieters",
  "site.landing.platformTitle": "Überall, wo Sie arbeiten",
  "site.landing.platformDevices": "Windows · macOS · Linux · iOS · Android",
  "site.landing.platformSame": "Browser oder installierte App — derselbe Editor",
  "site.landing.platformOffline": "Offline nutzbar nach dem ersten Laden",
  "site.landing.heroAlt": "Diagrammcode wird getippt und das Diagramm entsteht live",
  "site.landing.converterAlt": "PlantUML per Klick zu Mermaid, das Diagramm bleibt gleich",
  "site.landing.mcpAlt": "KI-Agent in Cursor fragen und ein fertiges Diagramm erhalten",
  "site.landing.audience.developers": "Entwickler",
  "site.landing.audience.analysts": "Analysten",
  "site.landing.audience.managers": "Manager",
  "site.landing.audience.students": "Studierende",
  "site.landing.audience.vibecoders": "Vibe-Coder",
  "site.landing.usp.developers": "Sequenz und C4 im Review — Diagramm als Code, in Git und im PR-Diff",
  "site.landing.usp.analysts": "Prozess ohne Syntax: Der Assistent fragt, das Diagramm ist fertig",
  "site.landing.usp.managers": "Plan und Status in einem Bild: Gantt und Charts per Klick in die Folien",
  "site.landing.usp.students": "Ein Diagramm in einer Minute: Vorlagen, Tipps, keine Installation",
  "site.landing.usp.vibecoders": "Der Agent zeichnet, Sie bearbeiten: MCP gibt Cursor Quelle und Bild",
} as const satisfies LocaleMessages;
