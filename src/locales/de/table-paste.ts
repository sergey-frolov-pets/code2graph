import type { LocaleMessages } from "../types";

export const tablePasteMessages = {
  "editor.pasteTable": "Tabelle aus der Zwischenablage einfügen",
  "editor.pasteTableHistory": "Tabelle einfügen",
  "tablePaste.modalTitle": "Tabelle kann nicht aus der Zwischenablage eingefügt werden",
  "tablePaste.reasonLabel": "Was schiefgelaufen ist",
  "tablePaste.expectedLabel": "Erwartetes Tabellenformat ({type})",
  "tablePaste.columnsLabel": "Spalten:",
  "tablePaste.rulesLabel": "Umwandlungsregeln:",
  "tablePaste.sampleLabel": "Beispieltabelle zum Kopieren (Excel / Google Sheets / TSV):",
  "tablePaste.error.emptyClipboard":
    "Die Zwischenablage ist leer. Kopieren Sie einen Zellbereich aus Excel oder Google Sheets oder eine durch Tabulator oder Semikolon getrennte Tabelle.",
  "tablePaste.error.clipboardReadFailed":
    "Die Zwischenablage konnte nicht gelesen werden. Erlauben Sie den Zugriff auf die Zwischenablage im Browser und versuchen Sie es erneut.",
  "tablePaste.error.notATable":
    "Der Inhalt der Zwischenablage ist keine Tabelle (erwartet werden mindestens 2 Spalten, getrennt durch Tabulator, ';' oder '|').",
  "tablePaste.error.tooManyColumns":
    "Zu viele Spalten: In der Zwischenablage sind {actual}, dieses Diagramm erwartet {expected}.",
  "tablePaste.error.tooFewColumns":
    "Zu wenige Spalten: In der Zwischenablage sind {actual}, dieses Diagramm erwartet {expected}.",
  "tablePaste.error.tooFewColumnsMin":
    "Zu wenige Spalten: In der Zwischenablage sind {actual}, mindestens {min} sind erforderlich.",
  "tablePaste.error.tooFewRowsMin":
    "Zu wenige Zeilen: In der Zwischenablage sind {actual}, mindestens {min} Zeilen sind erforderlich.",
  "tablePaste.error.expectedColumnRange":
    "Ungültige Spaltenzahl: In der Zwischenablage sind {actual}, erwartet werden zwischen {min} und {max} Spalten.",
  "tablePaste.error.waterfallColumns":
    "Erwartet werden 2 Spalten: eine mit Textbeschriftungen und eine mit Zahlen (oder leere Zellen für Summen '=').",
  "tablePaste.error.waterfallFirstMustBeNumber":
    "Die erste Datenzeile (Zeile {row}) braucht einen numerischen Startwert ('=number'), keine leere Zelle.",
  "tablePaste.error.noNumericColumn":
    "Keine der beiden Spalten enthält Zahlen.",
  "tablePaste.error.invalidNumberAtRow":
    "Zeile {row}: Der Wert \"{value}\" ist keine gültige Zahl.",
  "tablePaste.error.negativeNotAllowedAtRow":
    "Zeile {row}: Der negative Wert \"{value}\" ist in einem Kreisdiagramm nicht zulässig.",
  "tablePaste.error.noDataRows":
    "Die kopierte Tabelle enthält keine Datenzeilen.",
  "tablePaste.type.waterfall": "Wasserfall",
  "tablePaste.type.pie": "Kreisdiagramm",
  "tablePaste.type.heatmap": "Heatmap",
  "tablePaste.type.bubble": "Blasendiagramm",
  "tablePaste.type.ev": "Fertigstellungswert (EV)",
  "tablePaste.type.boxplot": "Boxplot",
  "tablePaste.type.treemap": "Treemap",
  "tablePaste.type.radar": "Netzdiagramm",
  "tablePaste.type.voronoi": "Voronoi-Diagramm",
  "tablePaste.type.clustered": "Reihendiagramm",
  "tablePaste.type.xychart": "XY-Diagramm (Balken / Linie)",
  "tablePaste.type.quadrant": "Quadrantendiagramm",
  "tablePaste.type.sankey": "Sankey-Diagramm",
  "tablePaste.type.orgchart": "Organigramm",
  "tablePaste.type.gantt": "Gantt-Diagramm",
  "tablePaste.type.timeline": "Zeitleiste",
  "tablePaste.type.journey": "Nutzerreise",
  "tablePaste.type.packet": "Paketkopf",
  "tablePaste.type.wbs": "Projektstrukturplan (WBS)",
  "tablePaste.type.mindmap": "Mindmap",
  "tablePaste.type.nwdiag": "Netzwerkdiagramm (Nwdiag)",
  "tablePaste.type.wireframe": "WireMark-Tabelle",
  "tablePaste.expected.waterfall.columns":
    "2 Spalten in beliebiger Reihenfolge: 'Beschriftung' und 'Wert' (oder 'Wert' und 'Beschriftung').",
  "tablePaste.expected.waterfall.rules":
    "Die erste Zahl wird zum Startbalken (=N), positive Zahlen werden zu Zunahmen (+N), negative Zahlen zu Abnahmen (-N), und eine leere Zelle (oder '=') wird zur laufenden Summe (= : Beschriftung).",
  "tablePaste.expected.waterfall.headers": "Beschriftung|Wert",
  "tablePaste.expected.pie.columns":
    "2 Spalten in beliebiger Reihenfolge: 'Kategorie' und 'Nichtnegative Zahl'.",
  "tablePaste.expected.pie.rules":
    "Jede Zeile wird zu einem Segment: \"Kategorie\" : Wert.",
  "tablePaste.expected.pie.headers": "Kategorie|Anteil",
  "tablePaste.expected.heatmap.columns":
    "Matrix mindestens 2×2: Die erste Zeile enthält die Spaltenköpfe der X-Achse, die erste Spalte die Zeilenbeschriftungen der Y-Achse, die inneren Zellen enthalten Zahlen (oder sind leer).",
  "tablePaste.expected.heatmap.rules":
    "Die Zeilen x und y werden vor dem scale-Block eingefügt. Fehlt scale, wird eine Skala vom kleinsten bis zum größten Wert ergänzt, von Blau nach Rot. Leere Zellen werden zu null-Plätzen.",
  "tablePaste.expected.heatmap.headers": "Zeitraum|Mo|Di|Mi",
  "tablePaste.expected.bubble.columns":
    "4 oder 5 Spalten: 'Beschriftung', 'X (Zahl)', 'Y (Zahl)', 'Größe (Zahl)', ['Gruppe (optional)'].",
  "tablePaste.expected.bubble.rules":
    "Jede Zeile wird zu einem Blasenpunkt: Beschriftung : x=..., y=..., size=..., group=...",
  "tablePaste.expected.bubble.headers": "Produkt|X|Y|Größe|Gruppe",
  "tablePaste.expected.ev.columns":
    "4 Spalten: 'Zeitraum (Tage)', 'PV (Planwert)', 'EV (Fertigstellungswert)', 'AC (Istkosten)' (oder 4 Zeilen: days, pv, ev, ac).",
  "tablePaste.expected.ev.rules":
    "Erzeugt die Reihen days, pv, ev und ac für das Fertigstellungswertdiagramm.",
  "tablePaste.expected.ev.headers": "Zeitraum|PV|EV|AC",
  "tablePaste.expected.boxplot.columns":
    "6 Spalten ('Kategorie', 'Min', 'Q1', 'Median', 'Q3', 'Max') oder 4 oder mehr Spalten mit Rohbeobachtungen ('Kategorie', 'Stichprobe 1', 'Stichprobe 2', 'Stichprobe 3'...).",
  "tablePaste.expected.boxplot.rules":
    "Erzeugt min=..., q1=..., median=..., q3=..., max=... für Fünf-Zahlen-Zusammenfassungen oder values=... für Rohbeobachtungen.",
  "tablePaste.expected.boxplot.headers": "Kategorie|Min|Q1|Median|Q3|Max",
  "tablePaste.expected.treemap.columns":
    "2 bis 4 Spalten: 'Element | Gewicht' oder 'Gruppe | Element | Gewicht [| Farbe]'.",
  "tablePaste.expected.treemap.rules":
    "Erzeugt hierarchische Blöcke 'Gruppe / Element : Gewicht' (das Gewicht muss > 0 sein).",
  "tablePaste.expected.treemap.headers": "Gruppe|Element|Gewicht",
  "tablePaste.expected.radar.columns":
    "Matrix mit mindestens 4 Spalten: Die erste Zeile enthält die Achsennamen (mindestens 3 Achsen), die erste Spalte die Reihennamen, die inneren Zellen enthalten Zahlen.",
  "tablePaste.expected.radar.rules":
    "Erzeugt die Direktive axes aus der Kopfzeile und Zeilen 'series Name : v1, v2, ...'.",
  "tablePaste.expected.radar.headers": "Reihe|Tempo|Zuverlässigkeit|Bedienbarkeit|Sicherheit",
  "tablePaste.expected.voronoi.columns":
    "3 bis 5 Spalten: 'Standort', 'X (Zahl)', 'Y (Zahl)', ['Gruppe'], ['Farbe'].",
  "tablePaste.expected.voronoi.rules":
    "Jede Zeile wird zu einem Voronoi-Standort: Standort : x=..., y=..., group=...",
  "tablePaste.expected.voronoi.headers": "Standort|X|Y|Gruppe",
  "tablePaste.expected.clustered.columns":
    "Matrix mindestens 2×2: Die erste Spalte enthält Kategorien, die erste Zeile Reihennamen (oder transponiert, wenn die Kopfzeile mit 'Series' beginnt).",
  "tablePaste.expected.clustered.rules":
    "Erzeugt die Zeilen categories und series und behält die Direktiven rotate 90, invert y und color bei.",
  "tablePaste.expected.clustered.headers": "Kategorie|Nord|Süd|Export",
  "tablePaste.expected.xychart.columns":
    "1 oder mehr Spalten. Eine Spalte sind Zahlen für bar [Wert 1, ..., Wert n]. Zwei Spalten sind 'X-Kategorie' und 'Balkenwert'. Drei oder mehr sind 'X-Kategorie' plus je zusätzlicher Spalte eine Balkenreihe.",
  "tablePaste.expected.xychart.rules":
    "Eine Spalte ersetzt vorhandene Zeilen bar [values]. Zwei oder mehr Spalten ersetzen die x-axis und alle bar-Zeilen, mit einer Reihe bar [...] je Wertspalte. Fehlt noch eine y-axis, wird y-axis \"\" min --> max ergänzt.",
  "tablePaste.expected.xychart.headers": "Monat|Plan|Ist|Prognose",
  "tablePaste.expected.quadrant.columns":
    "3 Spalten: 'Punktbeschriftung', 'X (0..1 oder 0..100%)', 'Y (0..1 oder 0..100%)'.",
  "tablePaste.expected.quadrant.rules":
    "Koordinaten größer als 1 werden automatisch von Prozent (0..100) auf [0..1] normiert.",
  "tablePaste.expected.quadrant.headers": "Element|X|Y",
  "tablePaste.expected.sankey.columns":
    "3 Spalten: 'Quelle', 'Ziel', 'Flusswert (Zahl)'.",
  "tablePaste.expected.sankey.rules":
    "Jede Zeile wird zu einer Flusszeile: Quelle,Ziel,Wert.",
  "tablePaste.expected.sankey.headers": "Quelle|Ziel|Fluss",
  "tablePaste.expected.orgchart.columns":
    "2 oder 3 Spalten: 'Führungskraft', 'Direkt unterstellt', ['Kantenstil (dotted) oder Titel'].",
  "tablePaste.expected.orgchart.rules":
    "Erzeugt Organigramm-Knoten und durchgezogene (->) oder gepunktete (-.->) Berichtslinien.",
  "tablePaste.expected.orgchart.headers": "Führungskraft|Bericht|Verknüpfung",
  "tablePaste.expected.gantt.columns":
    "2 bis 4 Spalten: 'Aufgabe', 'Startdatum oder Dauer', ['Dauer (5d)'], ['Abschnitt'].",
  "tablePaste.expected.gantt.rules":
    "Erzeugt Gantt-Aufgabenzeilen (in Mermaid nach Abschnitt gruppiert).",
  "tablePaste.expected.gantt.headers": "Aufgabe|Start|Dauer|Abschnitt",
  "tablePaste.expected.timeline.columns":
    "2 oder 3 Spalten: 'Zeitraum / Datum', 'Ereignis', ['Abschnitt (optional)'].",
  "tablePaste.expected.timeline.rules":
    "Jede Zeile wird zu einem Zeitleisteneintrag 'Zeitraum : Ereignis'.",
  "tablePaste.expected.timeline.headers": "Zeitraum|Ereignis|Abschnitt",
  "tablePaste.expected.journey.columns":
    "2 bis 4 Spalten: 'Schritt', 'Bewertung (1–5)', ['Akteure'], ['Abschnitt'].",
  "tablePaste.expected.journey.rules":
    "Erzeugt Schritte der Nutzerreise 'Schritt: Bewertung: Akteure'.",
  "tablePaste.expected.journey.headers": "Schritt|Bewertung|Akteure|Abschnitt",
  "tablePaste.expected.packet.columns":
    "2 Spalten in beliebiger Reihenfolge: 'Bitbereich (0-15) oder Bitlänge (16)' und 'Feldname'.",
  "tablePaste.expected.packet.rules":
    "Erzeugt Paketfelder '0-15: \"Feld\"' (Bitlängen werden automatisch zu Bereichen aufsummiert).",
  "tablePaste.expected.packet.headers": "Bits|Feld",
  "tablePaste.expected.wbs.columns":
    "2 oder mehr Spalten für Hierarchieebenen: 'Ebene 1 (Wurzel)', 'Ebene 2', 'Ebene 3' und so weiter.",
  "tablePaste.expected.wbs.rules":
    "Baut einen WBS-Baum (*, **, ***) und fasst gleiche Elternzellen automatisch zusammen.",
  "tablePaste.expected.wbs.headers": "Ebene 1|Ebene 2|Ebene 3",
  "tablePaste.expected.mindmap.columns":
    "2 oder mehr Spalten für die Baumtiefe: 'Wurzel', 'Zweig', 'Unterzweig' und so weiter.",
  "tablePaste.expected.mindmap.rules":
    "Baut einen Mindmap-Baum und führt gleiche Eltern zusammen. Eingefügte Knoten ersetzen alle Kartenknoten. Legend, title, header, footer, caption, style und Kommentare bleiben erhalten.",
  "tablePaste.expected.mindmap.headers": "Wurzel|Zweig|Blatt",
  "tablePaste.expected.nwdiag.columns":
    "2 oder 3 Spalten: 'Knoten', 'IP-Adresse', ['Netzwerk (optional)'].",
  "tablePaste.expected.nwdiag.rules":
    "Gruppiert Knoten nach Netzwerk in Blöcke network { node [address = \"...\"] }.",
  "tablePaste.expected.nwdiag.headers": "Knoten|IP-Adresse|Netzwerk",
  "tablePaste.expected.wireframe.columns":
    "Beliebige Tabelle mit mindestens 2 Spalten (die erste Zeile ist die Kopfzeile, die übrigen Zeilen sind Datenzeilen).",
  "tablePaste.expected.wireframe.rules":
    "Erzeugt eine WireMark-Table-Komponente mit TableHead und TableBody (Zahlenspalten werden rechtsbündig ausgerichtet).",
  "tablePaste.expected.wireframe.headers": "Name|Autor|Status|Aufrufe",
  "tablePaste.type.powermap": "Machtkarte",
  "tablePaste.expected.powermap.columns": "Name, Rolle, Vorgesetzter, Machtrolle, Einfluss, Handlungsbedarf, Haltung, Gegenstelle und Beziehung (solid, dotted oder ein Linkname).",
  "tablePaste.expected.powermap.rules": "Jede Zeile ist eine Person. solid und dotted sind Berichtslinien. Jeder andere Name ist ein Einflusspfeil.",
  "tablePaste.expected.powermap.headers": "Name|Rolle|Vorgesetzter|Machtrolle|Einfluss|Handlung|Haltung|Gegenstelle|Beziehung",

} as const satisfies LocaleMessages;
