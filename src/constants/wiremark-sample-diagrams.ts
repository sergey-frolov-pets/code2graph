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
  login: `// Вход: вкладки, поля с иконками, предупреждение и запасной способ войти
Wireframe #login mobile
  Stack column gap=2
    Typography h4 center "Вход"
    Typography body2 center "Студия диаграмм"
    Tabs
      Tab "Вход"
      Tab "Регистрация" to=#signup
    Alert info outlined "Новый вход с этого устройства"
    TextField "Почта" startIcon=Email required placeholder="you@example.com"
    TextField "Пароль" startIcon=Lock endIcon=Visibility required
    Stack row gap=1
      Control checkbox
      Typography body1 "Запомнить меня"
      Spacer
      Link "Забыли?" href=#reset
    Button "Войти" contained fullWidth startIcon=Login to=#dashboard // основной вход
    Button "Создать аккаунт" outlined fullWidth to=#signup
    Divider dashed
    Stack row gap=1
      Chip "SSO" outlined small
      Button "Корпоративный" text small startIcon=Business
      Spacer
      Icon Language
    Typography caption center ~2 filler=lorem`,
  dashboard: `// Обзор: меню, панель, карточки с графиками и таблица
Wireframe #dashboard landscape
  Menubar
    MenuItem "Файл" icon=Save selected
    MenuItem "Правка" icon=Edit
    MenuItem "Вид"
    MenuItem "Справка" icon=Help disabled
  AppBar dense denseBackground
    Toolbar dense
      Icon Menu
      Typography h6 "Code2Graph"
      Spacer
      Icon Search
      Spacer 16px
      Stack row gap=1
        Badge "4"
        Avatar "АИ" small rounded
      Fab Add small
  Stack row 100% * gap=2
    Drawer
      List dense subheader="Разделы"
        ListItem "Главная" to=#home
        ListItem "Отчёты" to=#reports
        ListItem "Настройки" to=#settings
      Typography caption "Квота хранилища"
      Progress linear 68
      Chip "Pro" outlined small
    Stack column * * gap=2
      Stack row gap=1
        Breadcrumbs
          Link "Студия" to=#home
          Link "Отчёты" to=#reports
          Typography "Март"
        Spacer
        Button "Экспорт" outlined small startIcon=Download to=#export
      Grid cols=3 gap=2
        Card
          CardHeader "Диаграммы" subheader="За 7 дней" icon=ShowChart closeIcon=none
          CardContent
            Chart "Тренд" line 100% 110px legend series=4
          CardActions
            Button "Открыть" small to=#reports
            Chip "12" small
        Card elevation=3
          CardHeader "Форматы" subheader="Доля экспорта" icon=PieChart closeIcon=none
          CardContent
            Chart "Доли" donut 100% 110px series=3
          CardActions
            Chip "PNG" small
            Chip "SVG" outlined small
        Card elevation=0
          CardHeader "Превью" subheader="Последний пакет" icon=Image closeIcon=MoreVert
          CardContent
            Img 100% ratio=16:9
          CardActions
            Button "Скачать" small startIcon=Download
      Stack row * gap=2
        Box * * outline=solid scrollbar=vertical scrollbarValue=35 scrollbarHandle=40
          Table small
            TableHead
              TableRow
                TableCell "Название"
                TableCell "Автор"
                TableCell "Статус"
                TableCell "Просмотры" align=right
            TableBody
              TableRow
                TableCell "Вход"
                TableCell "Аня"
                TableCell "Черновик"
                TableCell "128" align=right
              TableRow selected
                TableCell "Оболочка"
                TableCell "Марк"
                TableCell "Готово"
                TableCell "860" align=right
              TableRow
                TableCell "Оплата"
                TableCell "Лена"
                TableCell "Ревью"
                TableCell "42" align=right
            TableFooter
              TableRow
                TableCell "Итого"
                TableCell "—"
                TableCell "3"
                TableCell "1030" align=right
        Box 260px * dashed background=hatch
          Typography caption "Заметка"
          Placeholder 100% 72px "Схема"
          Skeleton text 100% 14px
          Skeleton rounded 100% 48px
      Stack row gap=1
        Pagination count=5 page=2
        Spacer
        Typography caption "Стр. 2 из 5"`,
  form: `// Мастер: шаги, разные поля, шкала, оценка и календарь
Wireframe #new-account portrait
  Stack column gap=2
    Typography h4 "Новый аккаунт"
    Stack row gap=3
      Box 220px
        Stepper vertical
          Step "Профиль" completed
          Step "Доступ" active
          Step "Готово"
        Stack row gap=1
          Progress circular 60
          Typography caption "Шаг 2"
      Calendar "Март 2026" compact events value=18 today=22 weekStart=mon
    Grid cols=2 gap=2
      TextField "Имя" required
      TextField "Почта" startIcon=Email required value="you@example.com"
      TextField "Пароль" startIcon=Lock required
      TextField "Сайт" startIcon=Link error value="http://" helperText="Нужна ссылка"
    Select "Роль" value="Редактор"
      Option "Читатель" startIcon=Visibility
      Option "Редактор" startIcon=Edit selected
      Option "Владелец" startIcon=Star subtext="Полный доступ"
    TextField "О себе" multiline rows=2 filler=blocks
    TextField "Команда" filled placeholder="studio"
    Stack row gap=2
      Control radio checked
      Typography body2 "Личный"
      Control radio
      Typography body2 "Командный"
      Spacer
      Typography body2 "Насыщенность"
      Slider 65 max=100
    Stack row gap=2
      Typography body2 "Оценка шаблона"
      Rating 4
      Spacer
      ToggleButtonGroup
        ToggleButton ViewList selected
        ToggleButton ViewModule
        ToggleButton GridView
    Alert warning "Проверьте почту перед созданием"
    Stack row gap=1
      Control checkbox checked
      Typography body1 "Согласен с условиями"
    Stack row gap=2
      Button "Создать" contained to=#welcome
      Button "Черновик" outlined disabled
      ButtonGroup
        Button "День"
        Button "Неделя"
        Button "Месяц"`,
  settings: `// Настройки: список, аккордеон, нижняя навигация и диалог
Wireframe #settings mobile
  Stack column 100% * gap=2
    AppBar
      Toolbar
        Icon ArrowBack
        Typography h6 "Настройки"
        Spacer
        Icon Search
    Alert error "Удаление сотрёт диаграммы"
    List dense subheader="Аккаунт"
      ListItem "Профиль" to=#profile
      ListItem "Уведомления" to=#notifications
      ListItem "Конфиденциальность" to=#privacy
      ListItem "О приложении" to=#about
    Stack column gap=1 divider
      AccordionHeader "Оформление" expanded
      AccordionBody
        Stack row gap=1
          Control switch checked
          Typography body2 "Тёмная тема"
        Stack row gap=1
          Control switch
          Typography body2 "Компактные списки"
      AccordionHeader "Язык" disabled
    BottomNavigation value="home" showLabels
      BottomNavigationAction "Главная" icon=Home to=#home
      BottomNavigationAction "Поиск" icon=Search to=#search
      BottomNavigationAction "Профиль" icon=Person to=#profile
  Dialog sm bottom
    DialogHeader "Удалить аккаунт?"
    DialogContent
      Typography body2 "Это действие нельзя отменить."
    DialogActions
      Spacer
      Button "Отмена"
      Button "Удалить" contained startIcon=Delete`,
  flow: `// Каркас на два экрана: свой значок, фон #shell и стрелки Flow
Icons
  mark "M12 2 2 22h20z"

Flow LR

Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Icon mark
      Typography h6 "Code2Graph"
      Spacer
      Icon Notifications
      Badge "2"
      Avatar "CG"
  Stack row 100% *
    Drawer
      List dense subheader="Студия"
        ListItem "Обзор" to=#home
        ListItem "Редактор" to=#editor
        ListItem "Настройки" to=#settings
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Stack column gap=2
    Stack row
      Typography h5 "Обзор"
      Spacer
      Button "В редактор" contained to=#editor
    Grid cols=3 gap=2
      Card
        CardHeader "Доски" subheader="Открытые" icon=Dashboard closeIcon=none
        CardContent
          Typography h3 "12"
          Typography caption "на этой неделе"
      Card
        CardHeader "Правки" icon=Edit closeIcon=none
        CardContent
          Chart "Правки" column 100% 100px
      Card
        CardHeader "Сборка" icon=TableChart closeIcon=none
        CardContent
          Progress linear 40 large
          Typography caption "Публикация"
    List dense
      ListItem "Онбординг"
      ListItem "Оплата"

Wireframe #editor background=#shell anchor=#content
  Stack column 100% * gap=2
    Stack row gap=1
      Link "К обзору" to=#home
      Spacer
      Chip "Черновик" outlined small
      Button "Опубликовать" contained startIcon=CloudUpload
    Stack row * * gap=2
      Box 220px * outline=solid elevation=2
        Typography overline "Слои"
        List
          ListItem "Заголовок"
          ListItem "Схема"
          ListItem "Пометки"
        Divider
        Skeleton text 160px 12px
        Skeleton circular 32px 32px
      Box * * dashed
        Placeholder * * "Холст"
    Stack row gap=2
      Progress linear 35
      Spacer
      Snackbar "Черновик сохранён" bottomLeft`,
  product: `// Карточка товара: медиа, карта, таблица и действия
Wireframe #product w=1180 h=760
  Card
    Stack row gap=2
      Stack column 400px gap=1
        Img 100% ratio=16:9
        Stack row gap=1
          Chip "Бумага" outlined small
          Chip "A5" small background=crosshatch
          Chip "Точка" outlined small
      Map area * 300px pins=5 path compass labels icon=LocationOn
    CardContent
      Breadcrumbs ">"
        Link "Каталог" to=#catalog
        Typography "Скетчбук"
      Stack row gap=1
        Typography h4 "Скетчбук"
        Spacer
        Badge "−20%"
        Typography h5 "1 240 ₽"
      Stack row gap=1
        Rating 4 icon=Favorite emptyIcon=FavoriteBorder
        Divider vertical
        Typography body2 "128 отзывов"
      Tabs
        Tab "О товаре"
        Tab "Характеристики"
        Tab "Отзывы" to=#reviews
      Typography body2 ~2 filler=lorem
      Table small
        TableHead
          TableRow
            TableCell "Параметр"
            TableCell "Значение"
        TableBody
          TableRow
            TableCell "Обложка"
            TableCell "Крафт"
          TableRow selected
            TableCell "Страницы"
            TableCell "128"
          TableRow
            TableCell "Формат"
            TableCell "A5"
    CardActions
      ButtonGroup
        Button "1"
        Button "2"
        Button "3"
      Button "В корзину" contained large crosshatch startIcon=ShoppingCart
      Button "Подробнее" outlined to=#detail
      Spacer
      Link "В каталог" to=#catalog`,
};

const WIREMARK_SAMPLES_EN: Record<WiremarkSampleId, string> = {
  login: `// Sign-in: tabs, icon fields, an alert, and a second way in
Wireframe #login mobile
  Stack column gap=2
    Typography h4 center "Sign in"
    Typography body2 center "Diagram studio"
    Tabs
      Tab "Sign in"
      Tab "Create account" to=#signup
    Alert info outlined "New sign-in on this device"
    TextField "Email" startIcon=Email required placeholder="you@example.com"
    TextField "Password" startIcon=Lock endIcon=Visibility required
    Stack row gap=1
      Control checkbox
      Typography body1 "Remember me"
      Spacer
      Link "Forgot?" href=#reset
    Button "Sign in" contained fullWidth startIcon=Login to=#dashboard // primary action
    Button "Create account" outlined fullWidth to=#signup
    Divider dashed
    Stack row gap=1
      Chip "SSO" outlined small
      Button "Company" text small startIcon=Business
      Spacer
      Icon Language
    Typography caption center ~2 filler=lorem`,
  dashboard: `// Overview: menu, docked drawer, chart cards, and a table
Wireframe #dashboard landscape
  Menubar
    MenuItem "File" icon=Save selected
    MenuItem "Edit" icon=Edit
    MenuItem "View"
    MenuItem "Help" icon=Help disabled
  AppBar dense denseBackground
    Toolbar dense
      Icon Menu
      Typography h6 "Code2Graph"
      Spacer
      Icon Search
      Spacer 16px
      Stack row gap=1
        Badge "4"
        Avatar "AM" small rounded
      Fab Add small
  Stack row 100% * gap=2
    Drawer
      List dense subheader="Sections"
        ListItem "Home" to=#home
        ListItem "Reports" to=#reports
        ListItem "Settings" to=#settings
      Typography caption "Storage quota"
      Progress linear 68
      Chip "Pro" outlined small
    Stack column * * gap=2
      Stack row gap=1
        Breadcrumbs
          Link "Studio" to=#home
          Link "Reports" to=#reports
          Typography "March"
        Spacer
        Button "Export" outlined small startIcon=Download to=#export
      Grid cols=3 gap=2
        Card
          CardHeader "Diagrams" subheader="Last 7 days" icon=ShowChart closeIcon=none
          CardContent
            Chart "Trend" line 100% 110px legend series=4
          CardActions
            Button "Open" small to=#reports
            Chip "12" small
        Card elevation=3
          CardHeader "Formats" subheader="Export share" icon=PieChart closeIcon=none
          CardContent
            Chart "Share" donut 100% 110px series=3
          CardActions
            Chip "PNG" small
            Chip "SVG" outlined small
        Card elevation=0
          CardHeader "Preview" subheader="Latest pack" icon=Image closeIcon=MoreVert
          CardContent
            Img 100% ratio=16:9
          CardActions
            Button "Download" small startIcon=Download
      Stack row * gap=2
        Box * * outline=solid scrollbar=vertical scrollbarValue=35 scrollbarHandle=40
          Table small
            TableHead
              TableRow
                TableCell "Name"
                TableCell "Author"
                TableCell "Status"
                TableCell "Views" align=right
            TableBody
              TableRow
                TableCell "Sign-in"
                TableCell "Anya"
                TableCell "Draft"
                TableCell "128" align=right
              TableRow selected
                TableCell "Shell"
                TableCell "Mark"
                TableCell "Ready"
                TableCell "860" align=right
              TableRow
                TableCell "Checkout"
                TableCell "Lena"
                TableCell "Review"
                TableCell "42" align=right
            TableFooter
              TableRow
                TableCell "Total"
                TableCell "—"
                TableCell "3"
                TableCell "1030" align=right
        Box 260px * dashed background=hatch
          Typography caption "Note"
          Placeholder 100% 72px "Sketch"
          Skeleton text 100% 14px
          Skeleton rounded 100% 48px
      Stack row gap=1
        Pagination count=5 page=2
        Spacer
        Typography caption "Page 2 of 5"`,
  form: `// Wizard: steps, mixed fields, a slider, a rating, and a calendar
Wireframe #new-account portrait
  Stack column gap=2
    Typography h4 "Create account"
    Stack row gap=3
      Box 220px
        Stepper vertical
          Step "Profile" completed
          Step "Access" active
          Step "Done"
        Stack row gap=1
          Progress circular 60
          Typography caption "Step 2"
      Calendar "March 2026" compact events value=18 today=22 weekStart=mon
    Grid cols=2 gap=2
      TextField "Full name" required
      TextField "Email" startIcon=Email required value="you@example.com"
      TextField "Password" startIcon=Lock required
      TextField "Website" startIcon=Link error value="http://" helperText="Need a full URL"
    Select "Role" value="Editor"
      Option "Reader" startIcon=Visibility
      Option "Editor" startIcon=Edit selected
      Option "Owner" startIcon=Star subtext="Full access"
    TextField "Bio" multiline rows=2 filler=blocks
    TextField "Team" filled placeholder="studio"
    Stack row gap=2
      Control radio checked
      Typography body2 "Personal"
      Control radio
      Typography body2 "Team"
      Spacer
      Typography body2 "Density"
      Slider 65 max=100
    Stack row gap=2
      Typography body2 "Template score"
      Rating 4
      Spacer
      ToggleButtonGroup
        ToggleButton ViewList selected
        ToggleButton ViewModule
        ToggleButton GridView
    Alert warning "Check the email before creating the account"
    Stack row gap=1
      Control checkbox checked
      Typography body1 "I agree to the terms"
    Stack row gap=2
      Button "Create account" contained to=#welcome
      Button "Draft" outlined disabled
      ButtonGroup
        Button "Day"
        Button "Week"
        Button "Month"`,
  settings: `// Settings: list, accordion, bottom navigation, and a dialog
Wireframe #settings mobile
  Stack column 100% * gap=2
    AppBar
      Toolbar
        Icon ArrowBack
        Typography h6 "Settings"
        Spacer
        Icon Search
    Alert error "Deleting erases the diagrams"
    List dense subheader="Account"
      ListItem "Profile" to=#profile
      ListItem "Notifications" to=#notifications
      ListItem "Privacy" to=#privacy
      ListItem "About" to=#about
    Stack column gap=1 divider
      AccordionHeader "Appearance" expanded
      AccordionBody
        Stack row gap=1
          Control switch checked
          Typography body2 "Dark theme"
        Stack row gap=1
          Control switch
          Typography body2 "Compact lists"
      AccordionHeader "Language" disabled
    BottomNavigation value="home" showLabels
      BottomNavigationAction "Home" icon=Home to=#home
      BottomNavigationAction "Search" icon=Search to=#search
      BottomNavigationAction "Profile" icon=Person to=#profile
  Dialog sm bottom
    DialogHeader "Delete account?"
    DialogContent
      Typography body2 "This cannot be undone."
    DialogActions
      Spacer
      Button "Cancel"
      Button "Delete" contained startIcon=Delete`,
  flow: `// Shared shell for two screens: a custom icon, background, and Flow arrows
Icons
  mark "M12 2 2 22h20z"

Flow LR

Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Icon mark
      Typography h6 "Code2Graph"
      Spacer
      Icon Notifications
      Badge "2"
      Avatar "CG"
  Stack row 100% *
    Drawer
      List dense subheader="Studio"
        ListItem "Overview" to=#home
        ListItem "Editor" to=#editor
        ListItem "Settings" to=#settings
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Stack column gap=2
    Stack row
      Typography h5 "Overview"
      Spacer
      Button "Open editor" contained to=#editor
    Grid cols=3 gap=2
      Card
        CardHeader "Boards" subheader="Open" icon=Dashboard closeIcon=none
        CardContent
          Typography h3 "12"
          Typography caption "this week"
      Card
        CardHeader "Edits" icon=Edit closeIcon=none
        CardContent
          Chart "Edits" column 100% 100px
      Card
        CardHeader "Build" icon=TableChart closeIcon=none
        CardContent
          Progress linear 40 large
          Typography caption "Publishing"
    List dense
      ListItem "Onboarding"
      ListItem "Checkout"

Wireframe #editor background=#shell anchor=#content
  Stack column 100% * gap=2
    Stack row gap=1
      Link "Back to overview" to=#home
      Spacer
      Chip "Draft" outlined small
      Button "Publish" contained startIcon=CloudUpload
    Stack row * * gap=2
      Box 220px * outline=solid elevation=2
        Typography overline "Layers"
        List
          ListItem "Title"
          ListItem "Diagram"
          ListItem "Notes"
        Divider
        Skeleton text 160px 12px
        Skeleton circular 32px 32px
      Box * * dashed
        Placeholder * * "Canvas"
    Stack row gap=2
      Progress linear 35
      Spacer
      Snackbar "Draft saved" bottomLeft`,
  product: `// Product page: media, a map, a spec table, and actions
Wireframe #product w=1180 h=760
  Card
    Stack row gap=2
      Stack column 400px gap=1
        Img 100% ratio=16:9
        Stack row gap=1
          Chip "Paper" outlined small
          Chip "A5" small background=crosshatch
          Chip "Dot" outlined small
      Map area * 300px pins=5 path compass labels icon=LocationOn
    CardContent
      Breadcrumbs ">"
        Link "Catalog" to=#catalog
        Typography "Sketchbook"
      Stack row gap=1
        Typography h4 "Sketchbook"
        Spacer
        Badge "−20%"
        Typography h5 "$24"
      Stack row gap=1
        Rating 4 icon=Favorite emptyIcon=FavoriteBorder
        Divider vertical
        Typography body2 "128 reviews"
      Tabs
        Tab "About"
        Tab "Specs"
        Tab "Reviews" to=#reviews
      Typography body2 ~2 filler=lorem
      Table small
        TableHead
          TableRow
            TableCell "Spec"
            TableCell "Value"
        TableBody
          TableRow
            TableCell "Cover"
            TableCell "Kraft"
          TableRow selected
            TableCell "Pages"
            TableCell "128"
          TableRow
            TableCell "Size"
            TableCell "A5"
    CardActions
      ButtonGroup
        Button "1"
        Button "2"
        Button "3"
      Button "Add to cart" contained large crosshatch startIcon=ShoppingCart
      Button "Details" outlined to=#detail
      Spacer
      Link "Back to catalog" to=#catalog`,
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
