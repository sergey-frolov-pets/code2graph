import { APP_LINKS } from "@/constants";
import type { AppLocale } from "@/constants/i18n";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { WIREMARK_EXTRA } from "@/constants/samples/localized/other-samples";
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
    es: WIREMARK_EXTRA.es[id],
    zh: WIREMARK_EXTRA.zh[id],
    ja: WIREMARK_EXTRA.ja[id],
    hi: WIREMARK_EXTRA.hi[id],
    pt: WIREMARK_EXTRA.pt[id],
    de: WIREMARK_EXTRA.de[id],
    ar: WIREMARK_EXTRA.ar[id],
  };
}

function text(
  ru: string,
  en: string,
  rest: Record<Exclude<AppLocale, "ru" | "en">, string>,
): LocalizedSnippet {
  return { ru, en, ...rest };
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
  {
    es: `// Un marco para cada pantalla; el contenido se coloca en Anchor #content
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "Inicio" to=#home
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "Panel"
  Grid cols=3 gap=2
    Card
    Card
    Card`,
    zh: `// 所有屏幕共用一个外壳；内容放入 Anchor #content
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "首页" to=#home
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "仪表盘"
  Grid cols=3 gap=2
    Card
    Card
    Card`,
    ja: `// すべての画面で共通の外枠。内容は Anchor #content に入る
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "ホーム" to=#home
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "ダッシュボード"
  Grid cols=3 gap=2
    Card
    Card
    Card`,
    hi: `// हर स्क्रीन के लिए एक ढाँचा; सामग्री Anchor #content में आती है
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "होम" to=#home
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "डैशबोर्ड"
  Grid cols=3 gap=2
    Card
    Card
    Card`,
    pt: `// Uma moldura para todas as telas; o conteúdo entra em Anchor #content
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "Início" to=#home
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "Painel"
  Grid cols=3 gap=2
    Card
    Card
    Card`,
    de: `// Ein Rahmen für jeden Bildschirm; der Inhalt landet in Anchor #content
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "Start" to=#home
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "Übersicht"
  Grid cols=3 gap=2
    Card
    Card
    Card`,
    ar: `// إطار واحد لكل الشاشات؛ المحتوى يدخل إلى Anchor #content
Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "الرئيسية" to=#home
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Typography h4 "لوحة التحكم"
  Grid cols=3 gap=2
    Card
    Card
    Card`,
  },
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
      {
        es: `Wireframe #login mobile
  Typography h4 "Iniciar sesión"`,
        zh: `Wireframe #login mobile
  Typography h4 "登录"`,
        ja: `Wireframe #login mobile
  Typography h4 "サインイン"`,
        hi: `Wireframe #login mobile
  Typography h4 "साइन इन"`,
        pt: `Wireframe #login mobile
  Typography h4 "Entrar"`,
        de: `Wireframe #login mobile
  Typography h4 "Anmelden"`,
        ar: `Wireframe #login mobile
  Typography h4 "تسجيل الدخول"`,
      },
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
      {
        es: `Wireframe #home background=#shell
  Typography h4 "Panel"

Box background=hatch
  Typography "Zona densa"`,
        zh: `Wireframe #home background=#shell
  Typography h4 "仪表盘"

Box background=hatch
  Typography "密集区域"`,
        ja: `Wireframe #home background=#shell
  Typography h4 "ダッシュボード"

Box background=hatch
  Typography "密な領域"`,
        hi: `Wireframe #home background=#shell
  Typography h4 "डैशबोर्ड"

Box background=hatch
  Typography "सघन क्षेत्र"`,
        pt: `Wireframe #home background=#shell
  Typography h4 "Painel"

Box background=hatch
  Typography "Área densa"`,
        de: `Wireframe #home background=#shell
  Typography h4 "Übersicht"

Box background=hatch
  Typography "Dichter Bereich"`,
        ar: `Wireframe #home background=#shell
  Typography h4 "لوحة التحكم"

Box background=hatch
  Typography "منطقة كثيفة"`,
      },
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
      {
        es: `Button "Iniciar sesión" contained to=#dashboard`,
        zh: `Button "登录" contained to=#dashboard`,
        ja: `Button "サインイン" contained to=#dashboard`,
        hi: `Button "साइन इन" contained to=#dashboard`,
        pt: `Button "Entrar" contained to=#dashboard`,
        de: `Button "Anmelden" contained to=#dashboard`,
        ar: `Button "تسجيل الدخول" contained to=#dashboard`,
      },
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
      {
        es: `Stack row gap=2
  Button "Cancelar"
  Button "Guardar" contained`,
        zh: `Stack row gap=2
  Button "取消"
  Button "保存" contained`,
        ja: `Stack row gap=2
  Button "キャンセル"
  Button "保存" contained`,
        hi: `Stack row gap=2
  Button "रद्द करें"
  Button "सहेजें" contained`,
        pt: `Stack row gap=2
  Button "Cancelar"
  Button "Salvar" contained`,
        de: `Stack row gap=2
  Button "Abbrechen"
  Button "Speichern" contained`,
        ar: `Stack row gap=2
  Button "إلغاء"
  Button "حفظ" contained`,
      },
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
      {
        es: `Stack row
  Typography "Recordarme"
  Spacer
  Link "¿Olvidaste?" to=#reset`,
        zh: `Stack row
  Typography "记住我"
  Spacer
  Link "忘记了？" to=#reset`,
        ja: `Stack row
  Typography "ログインを記憶"
  Spacer
  Link "忘れた？" to=#reset`,
        hi: `Stack row
  Typography "मुझे याद रखें"
  Spacer
  Link "भूल गए?" to=#reset`,
        pt: `Stack row
  Typography "Lembrar de mim"
  Spacer
  Link "Esqueceu?" to=#reset`,
        de: `Stack row
  Typography "Angemeldet bleiben"
  Spacer
  Link "Vergessen?" to=#reset`,
        ar: `Stack row
  Typography "تذكرني"
  Spacer
  Link "نسيت؟" to=#reset`,
      },
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
      {
        es: `Typography h4 "Iniciar sesión"
Typography`,
        zh: `Typography h4 "登录"
Typography`,
        ja: `Typography h4 "サインイン"
Typography`,
        hi: `Typography h4 "साइन इन"
Typography`,
        pt: `Typography h4 "Entrar"
Typography`,
        de: `Typography h4 "Anmelden"
Typography`,
        ar: `Typography h4 "تسجيل الدخول"
Typography`,
      },
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
      {
        es: `Typography h4 "Título"
Typography body1 "Texto"
Typography caption "Leyenda"`,
        zh: `Typography h4 "标题"
Typography body1 "正文"
Typography caption "说明"`,
        ja: `Typography h4 "見出し"
Typography body1 "本文"
Typography caption "キャプション"`,
        hi: `Typography h4 "शीर्षक"
Typography body1 "पाठ"
Typography caption "कैप्शन"`,
        pt: `Typography h4 "Título"
Typography body1 "Texto"
Typography caption "Legenda"`,
        de: `Typography h4 "Überschrift"
Typography body1 "Text"
Typography caption "Beschriftung"`,
        ar: `Typography h4 "عنوان"
Typography body1 "النص"
Typography caption "تسمية"`,
      },
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
      {
        es: `TextField "Correo" outlined value="you@example.com"`,
        zh: `TextField "邮箱" outlined value="you@example.com"`,
        ja: `TextField "メール" outlined value="you@example.com"`,
        hi: `TextField "ईमेल" outlined value="you@example.com"`,
        pt: `TextField "E-mail" outlined value="you@example.com"`,
        de: `TextField "E-Mail" outlined value="you@example.com"`,
        ar: `TextField "البريد" outlined value="you@example.com"`,
      },
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
    example: text(`TextField "Имя" required`, `TextField "Name" required`, {
      es: `TextField "Nombre" required`,
      zh: `TextField "姓名" required`,
      ja: `TextField "名前" required`,
      hi: `TextField "नाम" required`,
      pt: `TextField "Nome" required`,
      de: `TextField "Name" required`,
      ar: `TextField "الاسم" required`,
    }),
  },
  {
    id: "value",
    name: "value=",
    descriptionKey: "site.wiremark.keyword.value",
    exampleIncludes: "value=",
    example: text(
      `TextField "Почта" value="you@example.com"`,
      `TextField "Email" value="you@example.com"`,
      {
        es: `TextField "Correo" value="you@example.com"`,
        zh: `TextField "邮箱" value="you@example.com"`,
        ja: `TextField "メール" value="you@example.com"`,
        hi: `TextField "ईमेल" value="you@example.com"`,
        pt: `TextField "E-mail" value="you@example.com"`,
        de: `TextField "E-Mail" value="you@example.com"`,
        ar: `TextField "البريد" value="you@example.com"`,
      },
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
      {
        es: `TextField "Sobre mí" multiline rows=4`,
        zh: `TextField "简介" multiline rows=4`,
        ja: `TextField "自己紹介" multiline rows=4`,
        hi: `TextField "परिचय" multiline rows=4`,
        pt: `TextField "Sobre mim" multiline rows=4`,
        de: `TextField "Über mich" multiline rows=4`,
        ar: `TextField "نبذة" multiline rows=4`,
      },
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
      {
        es: `Typography "Un título largo" center noWrap`,
        zh: `Typography "很长的标题" center noWrap`,
        ja: `Typography "長い見出し" center noWrap`,
        hi: `Typography "एक लंबा शीर्षक" center noWrap`,
        pt: `Typography "Um título longo" center noWrap`,
        de: `Typography "Eine lange Überschrift" center noWrap`,
        ar: `Typography "عنوان طويل" center noWrap`,
      },
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
      {
        es: `Button "Guardar" contained`,
        zh: `Button "保存" contained`,
        ja: `Button "保存" contained`,
        hi: `Button "सहेजें" contained`,
        pt: `Button "Salvar" contained`,
        de: `Button "Speichern" contained`,
        ar: `Button "حفظ" contained`,
      },
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
      {
        es: `Button "Iniciar sesión" contained to=#dashboard`,
        zh: `Button "登录" contained to=#dashboard`,
        ja: `Button "サインイン" contained to=#dashboard`,
        hi: `Button "साइन इन" contained to=#dashboard`,
        pt: `Button "Entrar" contained to=#dashboard`,
        de: `Button "Anmelden" contained to=#dashboard`,
        ar: `Button "تسجيل الدخول" contained to=#dashboard`,
      },
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
      {
        es: `Button "Detalles" outlined`,
        zh: `Button "详情" outlined`,
        ja: `Button "詳細" outlined`,
        hi: `Button "विवरण" outlined`,
        pt: `Button "Detalhes" outlined`,
        de: `Button "Details" outlined`,
        ar: `Button "التفاصيل" outlined`,
      },
    ),
  },
  {
    id: "link",
    name: "Link",
    descriptionKey: "site.wiremark.keyword.link",
    exampleIncludes: "Link",
    example: text(`Link "Назад" to=#home`, `Link "Back" to=#home`, {
      es: `Link "Atrás" to=#home`,
      zh: `Link "返回" to=#home`,
      ja: `Link "戻る" to=#home`,
      hi: `Link "वापस" to=#home`,
      pt: `Link "Voltar" to=#home`,
      de: `Link "Zurück" to=#home`,
      ar: `Link "رجوع" to=#home`,
    }),
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
      {
        es: `List
  ListItem "Perfil" to=#profile
  ListItem "Acerca de" to=#about`,
        zh: `List
  ListItem "个人资料" to=#profile
  ListItem "关于" to=#about`,
        ja: `List
  ListItem "プロフィール" to=#profile
  ListItem "アプリについて" to=#about`,
        hi: `List
  ListItem "प्रोफ़ाइल" to=#profile
  ListItem "ऐप के बारे में" to=#about`,
        pt: `List
  ListItem "Perfil" to=#profile
  ListItem "Sobre" to=#about`,
        de: `List
  ListItem "Profil" to=#profile
  ListItem "Über die App" to=#about`,
        ar: `List
  ListItem "الملف الشخصي" to=#profile
  ListItem "حول" to=#about`,
      },
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
      {
        es: `ListItem "Ajustes" to=#settings`,
        zh: `ListItem "设置" to=#settings`,
        ja: `ListItem "設定" to=#settings`,
        hi: `ListItem "सेटिंग्स" to=#settings`,
        pt: `ListItem "Configurações" to=#settings`,
        de: `ListItem "Einstellungen" to=#settings`,
        ar: `ListItem "الإعدادات" to=#settings`,
      },
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
      {
        es: `Icon Search
Button "Guardar" contained startIcon=Check`,
        zh: `Icon Search
Button "保存" contained startIcon=Check`,
        ja: `Icon Search
Button "保存" contained startIcon=Check`,
        hi: `Icon Search
Button "सहेजें" contained startIcon=Check`,
        pt: `Icon Search
Button "Salvar" contained startIcon=Check`,
        de: `Icon Search
Button "Speichern" contained startIcon=Check`,
        ar: `Icon Search
Button "حفظ" contained startIcon=Check`,
      },
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
      {
        es: `TextField "Correo" startIcon=Email`,
        zh: `TextField "邮箱" startIcon=Email`,
        ja: `TextField "メール" startIcon=Email`,
        hi: `TextField "ईमेल" startIcon=Email`,
        pt: `TextField "E-mail" startIcon=Email`,
        de: `TextField "E-Mail" startIcon=Email`,
        ar: `TextField "البريد" startIcon=Email`,
      },
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
      {
        es: `Card
  Typography h3 "Tarjeta"
  Img
  Typography`,
        zh: `Card
  Typography h3 "卡片"
  Img
  Typography`,
        ja: `Card
  Typography h3 "カード"
  Img
  Typography`,
        hi: `Card
  Typography h3 "कार्ड"
  Img
  Typography`,
        pt: `Card
  Typography h3 "Cartão"
  Img
  Typography`,
        de: `Card
  Typography h3 "Karte"
  Img
  Typography`,
        ar: `Card
  Typography h3 "بطاقة"
  Img
  Typography`,
      },
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
      {
        es: `CardContent
  Typography h5 "Nombre del producto"
  Typography ~2`,
        zh: `CardContent
  Typography h5 "产品名称"
  Typography ~2`,
        ja: `CardContent
  Typography h5 "商品名"
  Typography ~2`,
        hi: `CardContent
  Typography h5 "उत्पाद का नाम"
  Typography ~2`,
        pt: `CardContent
  Typography h5 "Nome do produto"
  Typography ~2`,
        de: `CardContent
  Typography h5 "Produktname"
  Typography ~2`,
        ar: `CardContent
  Typography h5 "اسم المنتج"
  Typography ~2`,
      },
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
      {
        es: `CardActions
  Button "Comprar" contained
  Button "Detalles" outlined`,
        zh: `CardActions
  Button "购买" contained
  Button "详情" outlined`,
        ja: `CardActions
  Button "購入" contained
  Button "詳細" outlined`,
        hi: `CardActions
  Button "खरीदें" contained
  Button "विवरण" outlined`,
        pt: `CardActions
  Button "Comprar" contained
  Button "Detalhes" outlined`,
        de: `CardActions
  Button "Kaufen" contained
  Button "Details" outlined`,
        ar: `CardActions
  Button "شراء" contained
  Button "التفاصيل" outlined`,
      },
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
      {
        es: `Stack column
  TextField "Correo"
  Button "Iniciar sesión" contained`,
        zh: `Stack column
  TextField "邮箱"
  Button "登录" contained`,
        ja: `Stack column
  TextField "メール"
  Button "サインイン" contained`,
        hi: `Stack column
  TextField "ईमेल"
  Button "साइन इन" contained`,
        pt: `Stack column
  TextField "E-mail"
  Button "Entrar" contained`,
        de: `Stack column
  TextField "E-Mail"
  Button "Anmelden" contained`,
        ar: `Stack column
  TextField "البريد"
  Button "تسجيل الدخول" contained`,
      },
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
      {
        es: `TextField "Correo" outlined
TextField label="Correo" variant=outlined`,
        zh: `TextField "邮箱" outlined
TextField label="邮箱" variant=outlined`,
        ja: `TextField "メール" outlined
TextField label="メール" variant=outlined`,
        hi: `TextField "ईमेल" outlined
TextField label="ईमेल" variant=outlined`,
        pt: `TextField "E-mail" outlined
TextField label="E-mail" variant=outlined`,
        de: `TextField "E-Mail" outlined
TextField label="E-Mail" variant=outlined`,
        ar: `TextField "البريد" outlined
TextField label="البريد" variant=outlined`,
      },
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
      {
        es: `TextField "Correo" startIcon=Email required`,
        zh: `TextField "邮箱" startIcon=Email required`,
        ja: `TextField "メール" startIcon=Email required`,
        hi: `TextField "ईमेल" startIcon=Email required`,
        pt: `TextField "E-mail" startIcon=Email required`,
        de: `TextField "E-Mail" startIcon=Email required`,
        ar: `TextField "البريد" startIcon=Email required`,
      },
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
      {
        es: `Button "Guardar" contained // envía el formulario`,
        zh: `Button "保存" contained // 提交表单`,
        ja: `Button "保存" contained // フォームを送信`,
        hi: `Button "सहेजें" contained // फ़ॉर्म भेजता है`,
        pt: `Button "Salvar" contained // envia o formulário`,
        de: `Button "Speichern" contained // sendet das Formular`,
        ar: `Button "حفظ" contained // يرسل النموذج`,
      },
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
