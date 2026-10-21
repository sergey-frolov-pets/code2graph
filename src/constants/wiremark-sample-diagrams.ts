import type { AppLocale } from "@/constants/i18n";
import type { SampleCatalog } from "@/languages/sample-catalog";

export const WIREMARK_SAMPLE_IDS = [
  "login",
  "dashboard",
  "form",
  "settings",
  "flow",
  "product",
] as const;

export type WiremarkSampleId = (typeof WIREMARK_SAMPLE_IDS)[number];

const WIREMARK_SAMPLES_RU: Record<WiremarkSampleId, string> = {
  login: `// Экран входа: колонка полей, «запомнить меня» и переход дальше
Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Вход"
    TextField "Почта" startIcon=Email
    TextField "Пароль" startIcon=Lock
    Stack row
      Control checkbox
      Typography body1 "Запомнить меня"
      Spacer
      Link "Забыли?" to=#reset
    Button "Войти" contained to=#dashboard
    Divider
    Typography ~2`,
  dashboard: `// Оболочка приложения: шапка, боковое меню и сетка карточек
Wireframe #dashboard landscape
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "Главная" to=#home
        ListItem "Отчёты" to=#reports
        ListItem "Настройки" to=#settings
    Box * *
      Grid cols=3 gap=2
        Card
          Typography h3 "Диаграммы"
          Img
          Typography
        Card
          Typography h3 "Библиотека"
          Img
          Typography
        Card
          Typography h3 "Экспорт"
          Img
          Typography`,
  form: `// Форма: обязательные поля, значение, многострочный ввод и чекбокс
Wireframe #new-account mobile
  Stack column gap=2
    Typography h4 "Новый аккаунт"
    TextField "Имя" required
    TextField "Почта" startIcon=Email required value="you@example.com"
    TextField "Пароль" startIcon=Lock required
    TextField "О себе" multiline filler=blocks
    Stack row
      Control checkbox checked
      Typography body1 "Согласен с условиями"
    Button "Создать" contained to=#welcome`,
  settings: `// Список настроек: каждый пункт ведёт на свой экран
Wireframe #settings mobile
  Stack column
    AppBar
      Toolbar
        Typography h6 "Настройки"
    List
      ListItem "Профиль" to=#profile
      ListItem "Уведомления" to=#notifications
      ListItem "Конфиденциальность" to=#privacy
      ListItem "О приложении" to=#about`,
  flow: `// Два экрана в одном документе: Flow связывает их стрелкой to=#id
Flow LR

Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Вход"
    TextField "Почта" startIcon=Email
    TextField "Пароль" startIcon=Lock
    Button "Войти" contained to=#home

Wireframe #home landscape
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Typography h4 "Добро пожаловать"
  Link "Выйти" to=#login`,
  product: `// Карточка товара: медиа, текст и действия
Wireframe #product
  Card
    Img ratio=16:9
    CardContent
      Typography h5 "Название товара"
      Typography ~2
    CardActions
      Button "Купить" contained
      Button "Подробнее" variant=outlined to=#detail`,
};

const WIREMARK_SAMPLES_EN: Record<WiremarkSampleId, string> = {
  login: `// Sign-in screen: stacked fields, remember-me row, and a forward link
Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email" startIcon=Email
    TextField "Password" startIcon=Lock
    Stack row
      Control checkbox
      Typography body1 "Remember me"
      Spacer
      Link "Forgot?" to=#reset
    Button "Sign in" contained to=#dashboard
    Divider
    Typography ~2`,
  dashboard: `// App shell: header, nav rail, and a card grid
Wireframe #dashboard landscape
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Stack row 100% *
    Box 240px *
      List
        ListItem "Home" to=#home
        ListItem "Reports" to=#reports
        ListItem "Settings" to=#settings
    Box * *
      Grid cols=3 gap=2
        Card
          Typography h3 "Diagrams"
          Img
          Typography
        Card
          Typography h3 "Library"
          Img
          Typography
        Card
          Typography h3 "Export"
          Img
          Typography`,
  form: `// Form: required fields, a filled value, a textarea, and a checkbox
Wireframe #new-account mobile
  Stack column gap=2
    Typography h4 "Create account"
    TextField "Full name" required
    TextField "Email" startIcon=Email required value="you@example.com"
    TextField "Password" startIcon=Lock required
    TextField "Bio" multiline filler=blocks
    Stack row
      Control checkbox checked
      Typography body1 "I agree to the terms"
    Button "Create account" contained to=#welcome`,
  settings: `// Settings list: each row links to its own screen
Wireframe #settings mobile
  Stack column
    AppBar
      Toolbar
        Typography h6 "Settings"
    List
      ListItem "Profile" to=#profile
      ListItem "Notifications" to=#notifications
      ListItem "Privacy" to=#privacy
      ListItem "About" to=#about`,
  flow: `// Two screens in one document: Flow draws the to=#id navigation
Flow LR

Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email" startIcon=Email
    TextField "Password" startIcon=Lock
    Button "Sign in" contained to=#home

Wireframe #home landscape
  AppBar
    Toolbar
      Typography h6 "Code2Graph"
  Typography h4 "Welcome"
  Link "Sign out" to=#login`,
  product: `// Product card: media, copy, and actions
Wireframe #product
  Card
    Img ratio=16:9
    CardContent
      Typography h5 "Product name"
      Typography ~2
    CardActions
      Button "Buy" contained
      Button "Details" variant=outlined to=#detail`,
};

const WIREMARK_SOURCES_BY_LOCALE: Record<
  AppLocale,
  Record<WiremarkSampleId, string>
> = {
  ru: WIREMARK_SAMPLES_RU,
  en: WIREMARK_SAMPLES_EN,
};

const ALL_WIREMARK_SAMPLE_SOURCES = new Set<string>();
for (const locale of ["ru", "en"] as AppLocale[]) {
  for (const id of WIREMARK_SAMPLE_IDS) {
    ALL_WIREMARK_SAMPLE_SOURCES.add(WIREMARK_SOURCES_BY_LOCALE[locale][id]);
  }
}

export function getWiremarkSampleSource(
  id: WiremarkSampleId,
  locale: AppLocale,
): string {
  return WIREMARK_SOURCES_BY_LOCALE[locale][id];
}

export function findWiremarkSampleId(
  source: string,
  locale: AppLocale,
): WiremarkSampleId | null {
  for (const id of WIREMARK_SAMPLE_IDS) {
    if (WIREMARK_SOURCES_BY_LOCALE[locale][id] === source) {
      return id;
    }
  }

  return null;
}

export function isWiremarkSampleSource(source: string): boolean {
  return ALL_WIREMARK_SAMPLE_SOURCES.has(source);
}

export const wiremarkSampleCatalog: SampleCatalog = {
  ids: WIREMARK_SAMPLE_IDS,
  getSource(id, locale) {
    return getWiremarkSampleSource(id as WiremarkSampleId, locale);
  },
  findId(source, locale) {
    return findWiremarkSampleId(source, locale);
  },
  isSampleSource(source) {
    return isWiremarkSampleSource(source);
  },
};
