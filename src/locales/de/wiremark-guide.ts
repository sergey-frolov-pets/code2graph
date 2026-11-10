import type { LocaleMessages } from "../types";

export const wiremarkGuideMessages = {
  "site.wiremark.typesLead":
    "Bildschirmarten aus den WireMark-Leitfäden: ein Rahmen, eine App-Hülle, ein Formular, eine Einstellungsliste, eine Karte, ein Ablauf und gemeinsame Leisten.",
  "site.wiremark.keywordsLead":
    "Schlüsselwörter aus den WireMark-Leitfäden: die Wurzel des Rahmens, das Layout, der Text, die Komponenten und die Zeilenregeln. Die vollständige Komponentenliste und die Symbolgalerie stehen in der Dokumentation.",
  "site.wiremark.docsComponents": "Komponentenreferenz",
  "site.wiremark.docsIcons": "Symbolgalerie",

  "site.wiremark.type.login.title": "Anmeldebildschirm",
  "site.wiremark.type.login.text":
    "Ein Telefonrahmen. Registerkarten, Symbolfelder, ein Info-Hinweis und eine gefüllte Schaltfläche über die volle Breite, die mit to=#id einen anderen Rahmen öffnet.",
  "site.wiremark.type.dashboard.title": "App-Hülle",
  "site.wiremark.type.dashboard.text":
    "Ein Querformat-Rahmen: eine Menüleiste, eine dichte App-Leiste, eine angedockte Schublade, Diagrammkarten und eine Tabelle mit Bildlaufleiste.",
  "site.wiremark.type.form.title": "Formular",
  "site.wiremark.type.form.text":
    "Ein hoher Rahmen. Schritte, Pflichtfelder, value=, ein mehrzeiliger Bereich, eine Auswahl, ein Schieberegler, eine Bewertung, ein Kalender und das Zustimmungs-Kontrollkästchen.",
  "site.wiremark.type.settings.title": "Einstellungsliste",
  "site.wiremark.type.settings.text":
    "Eine App-Leiste, ein Fehlerhinweis, eine Zeilenliste mit to=#id, ein Akkordeon, eine untere Navigation und ein Bestätigungsdialog.",
  "site.wiremark.type.product.title": "Produktkarte",
  "site.wiremark.type.product.text":
    "Eine breite Karte. Img nutzt ratio=16:9, danach Chips, eine Karte, eine Spezifikationstabelle und CardActions mit einer Schaltflächengruppe.",
  "site.wiremark.type.flow.title": "Bildschirmablauf",
  "site.wiremark.type.flow.text":
    "Flow LR verbindet zwei Bildschirme. Eine versteckte Hülle (visible=false) wird mit background=#id hereingeholt, der Inhalt sitzt in Anchor #content. Icons deklariert ein eigenes Zeichen.",
  "site.wiremark.type.chrome.title": "Gemeinsame Leisten",
  "site.wiremark.type.chrome.text":
    "Eine Hülle mit visible=false wird nicht für sich gezeichnet. Andere Rahmen holen sie mit background=#id herein und legen ihren Inhalt in einen Anchor-Bereich mit anchor=#id.",

  "site.wiremark.group.frame": "Rahmen und Ablauf",
  "site.wiremark.group.layout": "Layout",
  "site.wiremark.group.text": "Text und Füllung",
  "site.wiremark.group.ui": "Bildschirmkomponenten",
  "site.wiremark.group.syntax": "Syntax",

  "site.wiremark.keyword.wireframe":
    "Die Wurzel eines Bildschirms. Alles, was darunter eingerückt ist, gehört zu diesem Bildschirm. Ergänzen Sie #id, damit andere Rahmen hierher verlinken können, plus eine Größenvorgabe oder sowohl w= als auch h=.",
  "site.wiremark.keyword.frameId":
    "Benennt einen Rahmen an Wireframe oder einen Bereich an Anchor. to= und background=#id treffen nur Rahmen. anchor= trifft nur Bereiche.",
  "site.wiremark.keyword.mobile": "Größenvorgabe in Telefonbreite an der Wireframe-Wurzel.",
  "site.wiremark.keyword.landscape":
    "Breite Größenvorgabe. Für eine App-Hülle oder ein Dashboard.",
  "site.wiremark.keyword.portrait": "Hohe Größenvorgabe an der Wireframe-Wurzel.",
  "site.wiremark.keyword.frameSize":
    "Eigene Rahmengröße. An der Wireframe-Wurzel sowohl w= als auch h= setzen. Die Vorgabe weglassen, wenn anchor= die Rahmengröße bestimmt.",
  "site.wiremark.keyword.visible":
    "visible=false blendet einen Rahmen im Ablaufdiagramm aus und lässt ihn weiter als Ziel von background= zu. Standard ist sichtbar.",
  "site.wiremark.keyword.frameBackground":
    "An einem Wireframe malt background=#id einen anderen Rahmen darunter. An einem gewöhnlichen Element ist background= eine Schraffur: hatch, crosshatch oder none.",
  "site.wiremark.keyword.anchor":
    "Ein unsichtbarer Bereich in einer Hülle. Ohne Größe füllt er den übrigen Platz. Geben Sie ihm #id, damit ein Vordergrundrahmen ihn ansteuern kann.",
  "site.wiremark.keyword.anchorAt":
    "Legt einen Vordergrundrahmen in einen Bereich seines Hintergrunds. Der Alias ist at=. An diesem Rahmen keine Vorgabe und kein w=/h= ergänzen. Der Anker gewinnt.",
  "site.wiremark.keyword.flow":
    "Eine Direktive auf oberster Ebene, nicht innerhalb eines Rahmens. Flow TD verläuft von oben nach unten und ist der Standard. Flow LR verläuft von links nach rechts.",
  "site.wiremark.keyword.to":
    "An jedem Element verknüpft to=#id dieses Element mit einem Rahmen. Der Navigationsgraph entsteht aus diesen Verknüpfungen. Der Alias ist href=. Ziele sind nur Rahmen.",
  "site.wiremark.keyword.stack":
    "Ordnet Kinder auf einer Achse an. Die Standardrichtung ist column. gap= (Alias von spacing=) setzt den Abstand dazwischen. Ein bloßes Stack zeichnet nichts Eigenes.",
  "site.wiremark.keyword.column":
    "Richtung von Stack ohne Schlüssel. Die Kinder stapeln sich von oben nach unten. column-reverse kehrt diese Reihenfolge um.",
  "site.wiremark.keyword.row":
    "Richtung von Stack ohne Schlüssel. Die Kinder laufen von links nach rechts. row-reverse kehrt diese Reihenfolge um.",
  "site.wiremark.keyword.gap":
    "Alias von spacing=. Der Abstand zwischen Kindern, in Abstandseinheiten. Schreiben Sie gap=2. Eine Zahl in Anführungszeichen ist ein Fehler.",
  "site.wiremark.keyword.box":
    "Ein allgemeiner Behälter. Die Werte ohne Schlüssel sind Breite, dann Höhe: Box 240px *. outline (solid, dashed, dotted) und elevation= zeichnen eine sichtbare Fläche.",
  "site.wiremark.keyword.grid":
    "Ein gleichmäßiges Raster. Die Kinder fließen in die Zellen. cols= setzt die Spaltenzahl, gap= den Abstand.",
  "site.wiremark.keyword.cols": "Spaltenzahl an Grid. Nur mit Schlüssel: cols=3.",
  "site.wiremark.keyword.spacer":
    "Ein flexibler Abstand, der die Geschwister entlang des Stapels auseinanderschiebt.",
  "site.wiremark.keyword.divider":
    "Eine waagerechte Linie ohne Eigenschaften. An Stack zeichnet das bloße Flag divider in jeder Lücke eine Linie.",
  "site.wiremark.keyword.sizing":
    "Größe nach Position: Breite, dann Höhe. 240px sind Pixel, 30% ein Anteil am freien Platz, * füllt diese Achse, und eine bloße Zahl ist ein Flex-Gewicht. width= mit Schlüssel wird abgelehnt.",
  "site.wiremark.keyword.typography":
    "Ein Textblatt. Eine Zeichenkette in Anführungszeichen sind die Wörter auf dem Bildschirm. Ohne Text zeichnet ein bloßes Typography eine Zeile Fülltext.",
  "site.wiremark.keyword.typeVariant":
    "Textrolle ohne Schlüssel: h1–h6, subtitle1, subtitle2, body1 (der Standard), body2, caption, overline oder button. Überschriften h1–h6 sind fett. caption ist gedämpft.",
  "site.wiremark.keyword.textField":
    "Ein Texteingabefeld. Die Zeichenkette in Anführungszeichen ist die Beschriftung. Varianten sind outlined (der Standard), filled und standard.",
  "site.wiremark.keyword.fillerAmount":
    "Wie viel Platzhaltertext gezeichnet wird, wenn es keine echte Beschriftung gibt. ~3 sind etwa drei Zeilen, ~5w etwa fünf Wörter, ~2l etwa zwei Zeilen. _, __ und ___ sind kurz, mittel und lang.",
  "site.wiremark.keyword.fillerStyle":
    "Das Aussehen des Platzhaltertexts: squiggle (der Standard), lorem oder blocks. Setzen Sie es an der Wireframe-Wurzel oder an einem Textelement. Farben ändert es nicht.",
  "site.wiremark.keyword.required":
    "Ein boolesches Flag. An TextField setzt es * hinter die Beschriftung.",
  "site.wiremark.keyword.value":
    "Text mit Schlüssel in einem Feld. Eine bloße Zeichenkette in Anführungszeichen ist die Beschriftung, der Inhalt muss daher value=\"...\" sein.",
  "site.wiremark.keyword.multiline":
    "Ein boolesches Flag. Es macht aus einem TextField einen Textbereich. rows=4 setzt die Höhe. Ohne rows ist ein mehrzeiliges Feld 3 Zeilen hoch.",
  "site.wiremark.keyword.noWrap":
    "Ein boolesches Flag an Typography. Die Zeile bleibt einzeilig, und der Überlauf endet mit einer Auslassung.",
  "site.wiremark.keyword.button":
    "Eine Aktion. Die Zeichenkette in Anführungszeichen ist die Beschriftung. Ein bloßes Button liest sich als Button. Varianten sind text (der Standard), outlined und contained.",
  "site.wiremark.keyword.contained":
    "Button-Variante ohne Schlüssel: eine gefüllte Schraffur, die primäre Aktion. Es gibt kein Schlüsselwort primary.",
  "site.wiremark.keyword.outlined":
    "Variante ohne Schlüssel. An Button ist es ein Rand ohne Füllung. An TextField ist outlined die Standardfassung.",
  "site.wiremark.keyword.link":
    "Ein Textlink in der Zeile. Die Zeichenkette in Anführungszeichen ist die Beschriftung. to=#id navigiert zu einem Rahmen.",
  "site.wiremark.keyword.list":
    "Ein senkrechter Stapel aus ListItem-Zeilen. dense zieht die Zeilen enger. subheader= ergänzt eine kleine Überschrift.",
  "site.wiremark.keyword.listItem":
    "Eine Zeile. Die Zeichenkette in Anführungszeichen ist die Beschriftung. to=#id macht die Zeile zu einem Link. Ein ListItem nimmt keine Kinder an.",
  "site.wiremark.keyword.appBar":
    "Die Leiste über einem Bildschirm. Sie umschließt meist eine Toolbar.",
  "site.wiremark.keyword.toolbar":
    "Eine waagerechte Zeile in einer AppBar: Titel, Symbole und Aktionen.",
  "site.wiremark.keyword.icon":
    "Ein Material-Zeichen. Icon Search und Icon \"Search\" sind derselbe Name. Ein unbekannter Name zeichnet einen Platzhalter und warnt. fontSize= oder size= ist small, medium oder large.",
  "site.wiremark.keyword.startIcon":
    "Ein Symbolname mit Schlüssel vor der Beschriftung: startIcon=Email. endIcon= zeichnet hinter die Beschriftung. Den Eigenschaftsnamen nicht in Anführungszeichen setzen.",
  "site.wiremark.keyword.iconsBlock":
    "Ein Icons-Block auf oberster Ebene, neben den Rahmen, nicht darin. Jeder Eintrag ist ein Name plus SVG-Pfaddaten. Ein Dokumentensymbol ersetzt ein eingebautes Symbol desselben Namens.",
  "site.wiremark.keyword.card":
    "Eine Fläche. Kinder ohne CardContent sind der Inhalt. to=#id macht die ganze Karte zu einem Link.",
  "site.wiremark.keyword.cardContent":
    "Der Textbereich einer Card, wenn Kopf, Medien und Aktionen getrennt sind.",
  "site.wiremark.keyword.cardActions": "Die Schaltflächenzeile am unteren Rand einer Card.",
  "site.wiremark.keyword.img":
    "Ein gekreuzter Platzhalter für ein Bild. ratio=16:9 setzt das Seitenverhältnis. src= sind Metadaten. Die Skizze zeichnet weiter den Platzhalter.",
  "site.wiremark.keyword.control":
    "Ein Kontrollkästchen, ein Optionsfeld oder ein Schalter. Control checkbox ist der Standard. checked schaltet ihn ein. Control radio und Control switch wählen die anderen Zeichen.",
  "site.wiremark.keyword.indent":
    "Einrückung ist Verschachtelung. Zwei Leerzeichen je Ebene, nur Leerzeichen. Eine tiefere Zeile ist ein Kind. Ein Tabulator ist ein Fehler.",
  "site.wiremark.keyword.quotes":
    "Eine Zeichenkette in Anführungszeichen ist Text, der gezeichnet wird, und die Anführungszeichen sind erforderlich. Ein bloßes Wort ist eine Einstellung: ein Enum, ein Flag, eine Zahl, eine Größe oder ein Symbolname. Ein Enum oder eine Zahl nie in Anführungszeichen setzen.",
  "site.wiremark.keyword.keyed":
    "key=value setzt eine benannte Eigenschaft. Ein Wert ohne Schlüssel lässt den Schlüssel weg und wird nach seinem Typ gewählt. Die Reihenfolge ist frei, außer Breite dann Höhe bei der Größe.",
  "site.wiremark.keyword.comment":
    "//-Kommentare laufen bis zum Zeilenende. # beginnt einen Anker und ist daher kein Kommentar.",
} as const satisfies LocaleMessages;
