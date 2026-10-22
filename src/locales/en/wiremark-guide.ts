import type { LocaleMessages } from "../types";

export const wiremarkGuideMessages = {
  "site.wiremark.typesLead":
    "Screen kinds from the WireMark guides: one frame, an app shell, a form, a settings list, a card, a flow, and shared chrome.",
  "site.wiremark.keywordsLead":
    "Keywords from the WireMark guides: the frame root, layout, text, components, and the line rules. The full component list and the icon gallery are in the docs.",
  "site.wiremark.docsComponents": "Component reference",
  "site.wiremark.docsIcons": "Icon gallery",

  "site.wiremark.type.login.title": "Sign-in screen",
  "site.wiremark.type.login.text":
    "A phone frame. Tabs, icon fields, an info alert, and a contained full-width button that opens another frame with to=#id.",
  "site.wiremark.type.dashboard.title": "App shell",
  "site.wiremark.type.dashboard.text":
    "A landscape frame: a menu bar, a dense app bar, a docked drawer, chart cards, and a table with a scrollbar.",
  "site.wiremark.type.form.title": "Form",
  "site.wiremark.type.form.text":
    "A tall frame. Steps, required fields, value=, a multiline area, a select, a slider, a rating, a calendar, and the agreement checkbox.",
  "site.wiremark.type.settings.title": "Settings list",
  "site.wiremark.type.settings.text":
    "An app bar, an error alert, a list of rows with to=#id, an accordion, bottom navigation, and a confirm dialog.",
  "site.wiremark.type.product.title": "Product card",
  "site.wiremark.type.product.text":
    "A wide card. Img uses ratio=16:9, then chips, a map, a spec table, and CardActions with a button group.",
  "site.wiremark.type.flow.title": "Screen flow",
  "site.wiremark.type.flow.text":
    "Flow LR links two screens. A hidden shell (visible=false) is pulled in with background=#id, and content sits in Anchor #content. Icons declares a custom mark.",
  "site.wiremark.type.chrome.title": "Shared chrome",
  "site.wiremark.type.chrome.text":
    "A shell with visible=false is not drawn on its own. Other frames pull it in with background=#id and place their content in an Anchor region with anchor=#id.",

  "site.wiremark.group.frame": "Frame and flow",
  "site.wiremark.group.layout": "Layout",
  "site.wiremark.group.text": "Text and filler",
  "site.wiremark.group.ui": "Screen components",
  "site.wiremark.group.syntax": "Syntax",

  "site.wiremark.keyword.wireframe":
    "The root of a screen. Everything indented under it is on that screen. Add #id so other frames can link here, plus a size preset or both w= and h=.",
  "site.wiremark.keyword.frameId":
    "Names a frame on Wireframe, or a region on Anchor. to= and background=#id match frames only. anchor= matches regions only.",
  "site.wiremark.keyword.mobile": "Phone-width size preset on the Wireframe root.",
  "site.wiremark.keyword.landscape":
    "Wide size preset. Use it for an app shell or a dashboard.",
  "site.wiremark.keyword.portrait": "Tall size preset on the Wireframe root.",
  "site.wiremark.keyword.frameSize":
    "Custom frame size. On the Wireframe root set both w= and h=. Leave the preset off when anchor= sizes the frame.",
  "site.wiremark.keyword.visible":
    "visible=false hides a frame from the flow chart and still allows it as a background= target. The default is visible.",
  "site.wiremark.keyword.frameBackground":
    "On a Wireframe, background=#id paints another frame underneath. On an ordinary element, background= is a hatch: hatch, crosshatch, or none.",
  "site.wiremark.keyword.anchor":
    "An invisible region inside a shell. With no size it fills the leftover space. Give it #id so a foreground frame can target it.",
  "site.wiremark.keyword.anchorAt":
    "Places a foreground frame inside a region of its background. The alias is at=. Do not add a preset or w=/h= on that frame. The anchor wins.",
  "site.wiremark.keyword.flow":
    "A top-level directive, not inside a frame. Flow TD is top to bottom and is the default. Flow LR runs left to right.",
  "site.wiremark.keyword.to":
    "On any element, to=#id links that element to a frame. The navigation graph is built from these links. The alias is href=. Targets are frames only.",
  "site.wiremark.keyword.stack":
    "Lines children up on one axis. The default direction is column. gap= (alias of spacing=) sets the space between them. A bare Stack draws nothing of its own.",
  "site.wiremark.keyword.column":
    "Keyless Stack direction. Children stack from top to bottom. column-reverse flips that order.",
  "site.wiremark.keyword.row":
    "Keyless Stack direction. Children run from left to right. row-reverse flips that order.",
  "site.wiremark.keyword.gap":
    "Alias of spacing=. The gap between children, in spacing units. Write gap=2. A quoted number is an error.",
  "site.wiremark.keyword.box":
    "A generic container. The keyless tokens are width, then height: Box 240px *. outline (solid, dashed, dotted) and elevation= draw a visible panel.",
  "site.wiremark.keyword.grid":
    "A uniform grid. Children flow into the cells. cols= sets how many columns, gap= sets the spacing.",
  "site.wiremark.keyword.cols": "Column count on Grid. Keyed only: cols=3.",
  "site.wiremark.keyword.spacer":
    "A flexible gap that pushes its siblings apart along the stack.",
  "site.wiremark.keyword.divider":
    "A horizontal rule with no properties. On Stack, the bare flag divider draws a rule in each gap.",
  "site.wiremark.keyword.sizing":
    "Positional size: width, then height. 240px is pixels, 30% is a share of free space, * fills that axis, and a bare number is a flex weight. Keyed width= is rejected.",
  "site.wiremark.keyword.typography":
    "A text leaf. A quoted string is the words on screen. With no text, a bare Typography draws one line of filler.",
  "site.wiremark.keyword.typeVariant":
    "Keyless text role: h1–h6, subtitle1, subtitle2, body1 (the default), body2, caption, overline, or button. Headings h1–h6 are bold. caption is muted.",
  "site.wiremark.keyword.textField":
    "A text input. The quoted string is the label. Variants are outlined (the default), filled, and standard.",
  "site.wiremark.keyword.fillerAmount":
    "How much placeholder text to draw when there is no real label. ~3 is about three lines, ~5w about five words, ~2l about two lines. _, __, and ___ are short, medium, and long.",
  "site.wiremark.keyword.fillerStyle":
    "The look of placeholder text: squiggle (the default), lorem, or blocks. Set it on the Wireframe root or on one text element. It does not change colors.",
  "site.wiremark.keyword.required":
    "A boolean flag. On TextField it adds * after the label.",
  "site.wiremark.keyword.value":
    "Keyed text inside a field. A bare quoted string is the label, so the contents must be value=\"...\".",
  "site.wiremark.keyword.multiline":
    "A boolean flag. It grows a TextField into a text area. rows=4 sets the height. With no rows, a multiline field is 3 rows tall.",
  "site.wiremark.keyword.noWrap":
    "A boolean flag on Typography. The line stays single and the overflow ends with an ellipsis.",
  "site.wiremark.keyword.button":
    "An action. The quoted string is the label. A bare Button reads Button. Variants are text (the default), outlined, and contained.",
  "site.wiremark.keyword.contained":
    "Keyless Button variant: a filled hatch, the primary action. There is no primary keyword.",
  "site.wiremark.keyword.outlined":
    "Keyless variant. On Button it is a border with no fill. On TextField, outlined is the default chrome.",
  "site.wiremark.keyword.link":
    "An inline text link. The quoted string is the label. to=#id navigates to a frame.",
  "site.wiremark.keyword.list":
    "A vertical stack of ListItem rows. dense tightens the rows. subheader= adds a small heading.",
  "site.wiremark.keyword.listItem":
    "One row. The quoted string is the label. to=#id makes the row a link. A ListItem does not take children.",
  "site.wiremark.keyword.appBar":
    "The bar across the top of a screen. It usually wraps a Toolbar.",
  "site.wiremark.keyword.toolbar":
    "A horizontal row inside an AppBar: title, icons, and actions.",
  "site.wiremark.keyword.icon":
    "One Material glyph. Icon Search and Icon \"Search\" are the same name. An unknown name draws a placeholder and warns. fontSize= or size= is small, medium, or large.",
  "site.wiremark.keyword.startIcon":
    "A keyed icon name drawn before the label: startIcon=Email. endIcon= draws after the label. Do not quote the property name.",
  "site.wiremark.keyword.iconsBlock":
    "A top-level Icons block, next to the frames, not inside one. Each entry is a name plus SVG path data. A document icon overrides a built-in icon of the same name.",
  "site.wiremark.keyword.card":
    "A surface. Children without CardContent are the body. to=#id makes the whole card a link.",
  "site.wiremark.keyword.cardContent":
    "The text region of a Card when the header, media, and actions are separate.",
  "site.wiremark.keyword.cardActions": "The button row at the bottom of a Card.",
  "site.wiremark.keyword.img":
    "A crossed placeholder for a picture. ratio=16:9 sets the aspect. src= is metadata. The sketch still draws the placeholder.",
  "site.wiremark.keyword.control":
    "A checkbox, radio, or switch. Control checkbox is the default. checked turns it on. Control radio and Control switch pick the other glyphs.",
  "site.wiremark.keyword.indent":
    "Indentation is containment. Two spaces per level, spaces only. A deeper line is a child. A tab is an error.",
  "site.wiremark.keyword.quotes":
    "A quoted string is text that is drawn, and the quotes are required. A bare word is a setting: an enum, a flag, a number, a size, or an icon name. Never quote an enum or a number.",
  "site.wiremark.keyword.keyed":
    "key=value sets a named property. A keyless value leaves the key off and is chosen by its type. Order is free, except width then height for sizing.",
  "site.wiremark.keyword.comment":
    "// comments run to the end of the line. # starts an anchor, so it is not a comment.",
} as const satisfies LocaleMessages;
