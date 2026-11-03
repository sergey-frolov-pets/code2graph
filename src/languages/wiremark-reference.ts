import { APP_LINKS } from "@/constants";
import type { AppLocale } from "@/constants/i18n";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import {
  getWiremarkSampleSource,
  type WiremarkSampleId,
} from "@/constants/wiremark-sample-diagrams";
import type { LocaleKey } from "@/locales/types";

export type LocalizedSnippet = string | Readonly<Record<AppLocale, string>>;

export interface LanguageDiagramType {
  id: string;
  titleKey: LocaleKey;
  descriptionKey: LocaleKey;
  example: LocalizedSnippet;
}

export interface LanguageKeyword {
  id: string;
  name: string;
  descriptionKey: LocaleKey;
  example: LocalizedSnippet;
  /** A fragment that both locale examples must contain. */
  exampleIncludes: string;
}

export interface LanguageKeywordGroup {
  id: string;
  titleKey: LocaleKey;
  keywords: readonly LanguageKeyword[];
}

export interface LanguageGuide {
  typesLeadKey: LocaleKey;
  keywordsLeadKey: LocaleKey;
  componentsHref: string;
  componentsLabelKey: LocaleKey;
  iconsHref: string;
  iconsLabelKey: LocaleKey;
  diagramTypes: readonly LanguageDiagramType[];
  keywordGroups: readonly LanguageKeywordGroup[];
}

export function resolveLocalizedSnippet(
  snippet: LocalizedSnippet,
  locale: AppLocale,
): string {
  return typeof snippet === "string" ? snippet : snippet[locale];
}

function sample(id: WiremarkSampleId): LocalizedSnippet {
  return {
    ru: getWiremarkSampleSource(id, "ru"),
    en: getWiremarkSampleSource(id, "en"),
  };
}

function text(ru: string, en: string): LocalizedSnippet {
  return { ru, en };
}

const SHARED_CHROME_EXAMPLE = text(
  `// Каркас один на все экраны, содержимое встаёт в Anchor #content
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "Главная" to=#home
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "Обзор"
  Grid cols=3 gap=2
    Card
    Card
    Card`,
  `// One shell for every screen; content lands in Anchor #content
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "Home" to=#home
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "Dashboard"
  Grid cols=3 gap=2
    Card
    Card
    Card`,
);

const FRAME_KEYWORDS: readonly LanguageKeyword[] = [
  {
    id: "wireframe",
    name: "Wireframe",
    descriptionKey: "site.wiremark.keyword.wireframe",
    exampleIncludes: "Wireframe #login mobile",
    example: text(
      `Wireframe #login mobile
  Typography h4 "Вход"`,
      `Wireframe #login mobile
  Typography h4 "Sign in"`,
    ),
  },
  {
    id: "frameId",
    name: "#id",
    descriptionKey: "site.wiremark.keyword.frameId",
    exampleIncludes: "#login",
    example: "Wireframe #login mobile",
  },
  {
    id: "mobile",
    name: "mobile",
    descriptionKey: "site.wiremark.keyword.mobile",
    exampleIncludes: "mobile",
    example: "Wireframe #home mobile",
  },
  {
    id: "landscape",
    name: "landscape",
    descriptionKey: "site.wiremark.keyword.landscape",
    exampleIncludes: "landscape",
    example: "Wireframe #dashboard landscape",
  },
  {
    id: "portrait",
    name: "portrait",
    descriptionKey: "site.wiremark.keyword.portrait",
    exampleIncludes: "portrait",
    example: "Wireframe #story portrait",
  },
  {
    id: "frameSize",
    name: "w= / h=",
    descriptionKey: "site.wiremark.keyword.frameSize",
    exampleIncludes: "w=800 h=480",
    example: "Wireframe #board w=800 h=480",
  },
  {
    id: "visible",
    name: "visible",
    descriptionKey: "site.wiremark.keyword.visible",
    exampleIncludes: "visible=false",
    example: "Wireframe #shell landscape visible=false",
  },
  {
    id: "frameBackground",
    name: "background",
    descriptionKey: "site.wiremark.keyword.frameBackground",
    exampleIncludes: "background=#shell",
    example: text(
      `Wireframe #home background=#shell
  Typography h4 "Обзор"

Box background=hatch
  Typography "Плотная зона"`,
      `Wireframe #home background=#shell
  Typography h4 "Dashboard"

Box background=hatch
  Typography "Dense area"`,
    ),
  },
  {
    id: "anchor",
    name: "Anchor",
    descriptionKey: "site.wiremark.keyword.anchor",
    exampleIncludes: "Anchor #content",
    example: "Anchor #content",
  },
  {
    id: "anchorAt",
    name: "anchor=",
    descriptionKey: "site.wiremark.keyword.anchorAt",
    exampleIncludes: "anchor=#content",
    example: "Wireframe #home background=#shell anchor=#content",
  },
  {
    id: "flow",
    name: "Flow",
    descriptionKey: "site.wiremark.keyword.flow",
    exampleIncludes: "Flow LR",
    example: "Flow LR",
  },
  {
    id: "to",
    name: "to=",
    descriptionKey: "site.wiremark.keyword.to",
    exampleIncludes: "to=#dashboard",
    example: text(
      `Button "Войти" contained to=#dashboard`,
      `Button "Sign in" contained to=#dashboard`,
    ),
  },
];

const LAYOUT_KEYWORDS: readonly LanguageKeyword[] = [
  {
    id: "stack",
    name: "Stack",
    descriptionKey: "site.wiremark.keyword.stack",
    exampleIncludes: "Stack column gap=2",
    example: "Stack column gap=2",
  },
  {
    id: "column",
    name: "column",
    descriptionKey: "site.wiremark.keyword.column",
    exampleIncludes: "column",
    example: "Stack column gap=2",
  },
  {
    id: "row",
    name: "row",
    descriptionKey: "site.wiremark.keyword.row",
    exampleIncludes: "Stack row",
    example: text(
      `Stack row gap=2
  Button "Отмена"
  Button "Сохранить" contained`,
      `Stack row gap=2
  Button "Cancel"
  Button "Save" contained`,
    ),
  },
  {
    id: "gap",
    name: "gap=",
    descriptionKey: "site.wiremark.keyword.gap",
    exampleIncludes: "gap=2",
    example: "Stack column gap=2",
  },
  {
    id: "box",
    name: "Box",
    descriptionKey: "site.wiremark.keyword.box",
    exampleIncludes: "Box 240px *",
    example: "Box 240px *",
  },
  {
    id: "grid",
    name: "Grid",
    descriptionKey: "site.wiremark.keyword.grid",
    exampleIncludes: "Grid cols=3 gap=2",
    example: `Grid cols=3 gap=2
  Card
  Card
  Card`,
  },
  {
    id: "cols",
    name: "cols=",
    descriptionKey: "site.wiremark.keyword.cols",
    exampleIncludes: "cols=3",
    example: "Grid cols=3",
  },
  {
    id: "spacer",
    name: "Spacer",
    descriptionKey: "site.wiremark.keyword.spacer",
    exampleIncludes: "Spacer",
    example: text(
      `Stack row
  Typography "Запомнить меня"
  Spacer
  Link "Забыли?" to=#reset`,
      `Stack row
  Typography "Remember me"
  Spacer
  Link "Forgot?" to=#reset`,
    ),
  },
  {
    id: "divider",
    name: "Divider",
    descriptionKey: "site.wiremark.keyword.divider",
    exampleIncludes: "Divider",
    example: "Divider",
  },
  {
    id: "sizing",
    name: "240px / % / *",
    descriptionKey: "site.wiremark.keyword.sizing",
    exampleIncludes: "Box 240px *",
    example: `Box 240px *
Box 100% 30%
Box * *
Stack row
  Box 1
  Box 2`,
  },
];

const TEXT_KEYWORDS: readonly LanguageKeyword[] = [
  {
    id: "typography",
    name: "Typography",
    descriptionKey: "site.wiremark.keyword.typography",
    exampleIncludes: "Typography",
    example: text(
      `Typography h4 "Вход"
Typography`,
      `Typography h4 "Sign in"
Typography`,
    ),
  },
  {
    id: "typeVariant",
    name: "h4 / body1",
    descriptionKey: "site.wiremark.keyword.typeVariant",
    exampleIncludes: "body1",
    example: text(
      `Typography h4 "Заголовок"
Typography body1 "Текст"
Typography caption "Подпись"`,
      `Typography h4 "Heading"
Typography body1 "Body"
Typography caption "Caption"`,
    ),
  },
  {
    id: "textField",
    name: "TextField",
    descriptionKey: "site.wiremark.keyword.textField",
    exampleIncludes: "TextField",
    example: text(
      `TextField "Почта" outlined value="you@example.com"`,
      `TextField "Email" outlined value="you@example.com"`,
    ),
  },
  {
    id: "fillerAmount",
    name: "~N",
    descriptionKey: "site.wiremark.keyword.fillerAmount",
    exampleIncludes: "~2",
    example: `Typography h4 ~4w
Typography ~2
Typography ___`,
  },
  {
    id: "fillerStyle",
    name: "filler=",
    descriptionKey: "site.wiremark.keyword.fillerStyle",
    exampleIncludes: "filler=lorem",
    example: `Wireframe #screen filler=squiggle
  Typography ~2
  Typography body1 filler=lorem`,
  },
  {
    id: "required",
    name: "required",
    descriptionKey: "site.wiremark.keyword.required",
    exampleIncludes: "required",
    example: text(`TextField "Имя" required`, `TextField "Name" required`),
  },
  {
    id: "value",
    name: "value=",
    descriptionKey: "site.wiremark.keyword.value",
    exampleIncludes: "value=",
    example: text(
      `TextField "Почта" value="you@example.com"`,
      `TextField "Email" value="you@example.com"`,
    ),
  },
  {
    id: "multiline",
    name: "multiline",
    descriptionKey: "site.wiremark.keyword.multiline",
    exampleIncludes: "multiline rows=4",
    example: text(
      `TextField "О себе" multiline rows=4`,
      `TextField "Bio" multiline rows=4`,
    ),
  },
  {
    id: "noWrap",
    name: "noWrap",
    descriptionKey: "site.wiremark.keyword.noWrap",
    exampleIncludes: "noWrap",
    example: text(
      `Typography "Длинный заголовок" center noWrap`,
      `Typography "A long heading" center noWrap`,
    ),
  },
];

const UI_KEYWORDS: readonly LanguageKeyword[] = [
  {
    id: "button",
    name: "Button",
    descriptionKey: "site.wiremark.keyword.button",
    exampleIncludes: "Button",
    example: text(
      `Button "Сохранить" contained`,
      `Button "Save" contained`,
    ),
  },
  {
    id: "contained",
    name: "contained",
    descriptionKey: "site.wiremark.keyword.contained",
    exampleIncludes: "contained",
    example: text(
      `Button "Войти" contained to=#dashboard`,
      `Button "Sign in" contained to=#dashboard`,
    ),
  },
  {
    id: "outlined",
    name: "outlined",
    descriptionKey: "site.wiremark.keyword.outlined",
    exampleIncludes: "outlined",
    example: text(
      `Button "Подробнее" outlined`,
      `Button "Details" outlined`,
    ),
  },
  {
    id: "link",
    name: "Link",
    descriptionKey: "site.wiremark.keyword.link",
    exampleIncludes: "Link",
    example: text(`Link "Назад" to=#home`, `Link "Back" to=#home`),
  },
  {
    id: "list",
    name: "List",
    descriptionKey: "site.wiremark.keyword.list",
    exampleIncludes: "List",
    example: text(
      `List
  ListItem "Профиль" to=#profile
  ListItem "О приложении" to=#about`,
      `List
  ListItem "Profile" to=#profile
  ListItem "About" to=#about`,
    ),
  },
  {
    id: "listItem",
    name: "ListItem",
    descriptionKey: "site.wiremark.keyword.listItem",
    exampleIncludes: "ListItem",
    example: text(
      `ListItem "Настройки" to=#settings`,
      `ListItem "Settings" to=#settings`,
    ),
  },
  {
    id: "appBar",
    name: "AppBar",
    descriptionKey: "site.wiremark.keyword.appBar",
    exampleIncludes: "AppBar",
    example: `AppBar
  Toolbar
    Typography h6 "Code2Graph"`,
  },
  {
    id: "toolbar",
    name: "Toolbar",
    descriptionKey: "site.wiremark.keyword.toolbar",
    exampleIncludes: "Toolbar",
    example: `Toolbar
  Icon Menu
  Typography h6 "Code2Graph"
  Spacer
  Icon Search`,
  },
  {
    id: "icon",
    name: "Icon",
    descriptionKey: "site.wiremark.keyword.icon",
    exampleIncludes: "Icon Search",
    example: text(
      `Icon Search
Button "Сохранить" contained startIcon=Check`,
      `Icon Search
Button "Save" contained startIcon=Check`,
    ),
  },
  {
    id: "startIcon",
    name: "startIcon=",
    descriptionKey: "site.wiremark.keyword.startIcon",
    exampleIncludes: "startIcon=Email",
    example: text(
      `TextField "Почта" startIcon=Email`,
      `TextField "Email" startIcon=Email`,
    ),
  },
  {
    id: "iconsBlock",
    name: "Icons",
    descriptionKey: "site.wiremark.keyword.iconsBlock",
    exampleIncludes: "Icons",
    example: `Icons
  logo "M12 2 2 22h20z"

Wireframe #home
  Icon logo`,
  },
  {
    id: "card",
    name: "Card",
    descriptionKey: "site.wiremark.keyword.card",
    exampleIncludes: "Card",
    example: text(
      `Card
  Typography h3 "Карточка"
  Img
  Typography`,
      `Card
  Typography h3 "Card"
  Img
  Typography`,
    ),
  },
  {
    id: "cardContent",
    name: "CardContent",
    descriptionKey: "site.wiremark.keyword.cardContent",
    exampleIncludes: "CardContent",
    example: text(
      `CardContent
  Typography h5 "Название"
  Typography ~2`,
      `CardContent
  Typography h5 "Product name"
  Typography ~2`,
    ),
  },
  {
    id: "cardActions",
    name: "CardActions",
    descriptionKey: "site.wiremark.keyword.cardActions",
    exampleIncludes: "CardActions",
    example: text(
      `CardActions
  Button "Купить" contained
  Button "Подробнее" outlined`,
      `CardActions
  Button "Buy" contained
  Button "Details" outlined`,
    ),
  },
  {
    id: "img",
    name: "Img",
    descriptionKey: "site.wiremark.keyword.img",
    exampleIncludes: "ratio=16:9",
    example: "Img ratio=16:9",
  },
  {
    id: "control",
    name: "Control",
    descriptionKey: "site.wiremark.keyword.control",
    exampleIncludes: "Control checkbox checked",
    example: `Control checkbox checked
Control radio
Control switch`,
  },
];

const SYNTAX_KEYWORDS: readonly LanguageKeyword[] = [
  {
    id: "indent",
    name: "indent",
    descriptionKey: "site.wiremark.keyword.indent",
    exampleIncludes: "  TextField",
    example: text(
      `Stack column
  TextField "Почта"
  Button "Войти" contained`,
      `Stack column
  TextField "Email"
  Button "Sign in" contained`,
    ),
  },
  {
    id: "quotes",
    name: "\"...\"",
    descriptionKey: "site.wiremark.keyword.quotes",
    exampleIncludes: "variant=outlined",
    example: text(
      `TextField "Почта" outlined
TextField label="Почта" variant=outlined`,
      `TextField "Email" outlined
TextField label="Email" variant=outlined`,
    ),
  },
  {
    id: "keyed",
    name: "key=value",
    descriptionKey: "site.wiremark.keyword.keyed",
    exampleIncludes: "startIcon=Email",
    example: text(
      `TextField "Почта" startIcon=Email required`,
      `TextField "Email" startIcon=Email required`,
    ),
  },
  {
    id: "comment",
    name: "//",
    descriptionKey: "site.wiremark.keyword.comment",
    exampleIncludes: "//",
    example: text(
      `Button "Сохранить" contained // отправляет форму`,
      `Button "Save" contained // submits the form`,
    ),
  },
];

export const wiremarkLanguageGuide: LanguageGuide = {
  typesLeadKey: "site.wiremark.typesLead",
  keywordsLeadKey: "site.wiremark.keywordsLead",
  componentsHref: APP_LINKS.wiremarkComponents,
  componentsLabelKey: "site.wiremark.docsComponents",
  iconsHref: APP_LINKS.wiremarkIcons,
  iconsLabelKey: "site.wiremark.docsIcons",
  diagramTypes: [
    {
      id: "login",
      titleKey: "site.wiremark.type.login.title",
      descriptionKey: "site.wiremark.type.login.text",
      example: sample("login"),
    },
    {
      id: "dashboard",
      titleKey: "site.wiremark.type.dashboard.title",
      descriptionKey: "site.wiremark.type.dashboard.text",
      example: sample("dashboard"),
    },
    {
      id: "form",
      titleKey: "site.wiremark.type.form.title",
      descriptionKey: "site.wiremark.type.form.text",
      example: sample("form"),
    },
    {
      id: "settings",
      titleKey: "site.wiremark.type.settings.title",
      descriptionKey: "site.wiremark.type.settings.text",
      example: sample("settings"),
    },
    {
      id: "product",
      titleKey: "site.wiremark.type.product.title",
      descriptionKey: "site.wiremark.type.product.text",
      example: sample("product"),
    },
    {
      id: "flow",
      titleKey: "site.wiremark.type.flow.title",
      descriptionKey: "site.wiremark.type.flow.text",
      example: sample("flow"),
    },
    {
      id: "chrome",
      titleKey: "site.wiremark.type.chrome.title",
      descriptionKey: "site.wiremark.type.chrome.text",
      example: SHARED_CHROME_EXAMPLE,
    },
  ],
  keywordGroups: [
    {
      id: "frame",
      titleKey: "site.wiremark.group.frame",
      keywords: FRAME_KEYWORDS,
    },
    {
      id: "layout",
      titleKey: "site.wiremark.group.layout",
      keywords: LAYOUT_KEYWORDS,
    },
    {
      id: "text",
      titleKey: "site.wiremark.group.text",
      keywords: TEXT_KEYWORDS,
    },
    {
      id: "ui",
      titleKey: "site.wiremark.group.ui",
      keywords: UI_KEYWORDS,
    },
    {
      id: "syntax",
      titleKey: "site.wiremark.group.syntax",
      keywords: SYNTAX_KEYWORDS,
    },
  ],
};

export const LANGUAGE_GUIDES: Partial<Record<DiagramFormat, LanguageGuide>> = {
  wiremark: wiremarkLanguageGuide,
};
