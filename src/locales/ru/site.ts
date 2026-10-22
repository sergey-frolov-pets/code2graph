import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "Diagrams-as-Code Studio",
  "site.nav.features": "Возможности",
  "site.nav.converter": "Конвертер & ИИ",
  "site.nav.pwa": "PWA / Оффлайн",
  "site.nav.formats": "Форматы",
  "site.nav.faq": "FAQ",
  "site.nav.mcp": "MCP",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "PWA-студия для PlantUML, Mermaid, GraphML, WireMark, D2 и Structurizr. MCP для агентов возвращает исходник и изображение.",
  "site.landingCtaApp": "Открыть редактор",
  "site.landingCtaInstallPwa": "📲 Установить PWA",
  "site.landingCtaRegister": "Регистрация",
  "site.landingCtaLogin": "Вход",
  "site.landingCtaTryFree": "Попробовать бесплатно",
  "site.landingCtaDemo": "Демо",

  "site.hero.title": "Текстовые диаграммы в браузере",
  "site.hero.subtitle":
    "Пишите схему и сразу смотрите её. PlantUML, Mermaid, GraphML, WireMark, D2 и Structurizr — в том числе без интернета. Агенту MCP отдаёт исходник и изображение.",
  "site.offlineNote": "Редактирование и просмотр работают без сети.",
  "site.languages.title": "Языки",
  "site.language.sites": "Сайты",
  "site.language.libraries": "Библиотеки в приложении",
  "site.language.types": "Основные типы",
  "site.language.diagramTypes": "Типы диаграмм",
  "site.language.keywords": "Ключевые слова",
  "site.language.example": "Пример",
  "site.primer.graphml.type.directed.title": "Направленный граф",
  "site.primer.graphml.type.directed.summary":
    "Рёбра идут от источника к цели. Так Code2Graph рисует GraphML по умолчанию.",
  "site.primer.graphml.type.undirected.title": "Ненаправленный граф",
  "site.primer.graphml.type.undirected.summary":
    "Рёбра только соединяют узлы, без направления.",
  "site.primer.wiremark.type.flow.title": "Связанные экраны",
  "site.primer.wiremark.type.flow.summary":
    "Несколько макетов в одном файле и переходы to=#якорь между ними.",
  "site.primer.plantuml.kw.startuml":
    "Пара @startuml и @enduml открывает и закрывает диаграмму.",
  "site.primer.plantuml.kw.participant":
    "Именованный участник на линии жизни. as задаёт короткое имя.",
  "site.primer.plantuml.kw.arrow": "Сообщение: -> к участнику, --> ответ.",
  "site.primer.plantuml.kw.alt":
    "Взаимоисключающие ветки. else — вторая ветка, end закрывает блок.",
  "site.primer.plantuml.kw.note": "Заметка слева, справа или над участниками.",
  "site.primer.plantuml.kw.if":
    "Развилка в активности: then и else, закрывается endif.",
  "site.primer.plantuml.kw.skinparam":
    "Общий параметр оформления, например цвет фона.",
  "site.primer.mermaid.kw.participant":
    "Участник последовательности. as подменяет видимую подпись.",
  "site.primer.mermaid.kw.arrow":
    "Сообщение: ->> сплошная стрелка, -->> пунктирный ответ.",
  "site.primer.mermaid.kw.alt":
    "Ветки последовательности. else — другая ветка, end закрывает блок.",
  "site.primer.mermaid.kw.note": "Заметка справа от участника или над несколькими.",
  "site.primer.mermaid.kw.subgraph": "Группа узлов в блок-схеме. Закрывается end.",
  "site.primer.mermaid.kw.class": "Класс с полями и методами внутри classDiagram.",
  "site.primer.mermaid.kw.section": "Группа задач на диаграмме Ганта.",
  "site.primer.graphml.kw.graphml":
    "Корень документа. Пространство имён GraphML обязательно.",
  "site.primer.graphml.kw.graph":
    "Сам граф. edgedefault — directed или undirected.",
  "site.primer.graphml.kw.node": "Вершина. id должен быть уникальным.",
  "site.primer.graphml.kw.edge": "Ребро. source и target ссылаются на id узлов.",
  "site.primer.graphml.kw.key": "Объявление атрибута для узлов или рёбер.",
  "site.primer.graphml.kw.data":
    "Значение атрибута. Видимая подпись лежит здесь, не в id.",
  "site.primer.wiremark.kw.wireframe":
    "Один экран. Имя после # — якорь для переходов.",
  "site.primer.wiremark.kw.flow":
    "Связывает несколько экранов. LR рисует связи слева направо.",
  "site.primer.wiremark.kw.stack":
    "Колонка или ряд. gap задаёт промежуток, отступ — вложенность.",
  "site.primer.wiremark.kw.typography":
    "Текст. h4 и body1 — уровень, строка в кавычках — надпись.",
  "site.primer.wiremark.kw.textfield":
    "Поле ввода. Подпись в кавычках, настройки вроде required — без кавычек.",
  "site.primer.wiremark.kw.button":
    "Кнопка. contained заливает её, to=#id ведёт на другой экран.",
  "site.primer.d2.kw.direction":
    "Направление раскладки: down, right, left или up.",
  "site.primer.d2.kw.shape":
    "Форма узла: person, cylinder, class, sql_table, sequence_diagram.",
  "site.primer.d2.kw.arrow": "Связь между узлами. Подпись пишется после двоеточия.",
  "site.primer.d2.kw.style": "Оформление узла: заливка, обводка, шрифт.",
  "site.primer.d2.kw.constraint":
    "Ограничение колонки SQL: primary_key, foreign_key или unique.",
  "site.primer.structurizr.kw.workspace":
    "Корень документа: имя и короткое описание модели.",
  "site.primer.structurizr.kw.person": "Человек, который пользуется системой.",
  "site.primer.structurizr.kw.softwareSystem": "Программная система в модели.",
  "site.primer.structurizr.kw.container":
    "Приложение или хранилище внутри системы. Третий аргумент — технология.",
  "site.primer.structurizr.kw.arrow":
    "Кто к кому обращается. Подпись отношения — в кавычках.",
  "site.primer.structurizr.kw.views": "Какие виды нарисовать из модели.",
  "site.primer.structurizr.kw.autolayout":
    "Автораскладка вида: tb сверху вниз или lr слева направо.",
  "site.stackLead": "Интерфейс:",
  "site.hero.ctaPrimary": "Открыть редактор без регистрации",
  "site.hero.ctaSecondary": "📲 Установить на ПК / Смартфон",
  "site.hero.trustOffline":
    "📶 Работает оффлайн: все базовые функции и конвертер доступны без интернета.",
  "site.hero.trustAi":
    "🤖 AI & Wizard: генерация схем по текстовому описанию или через пошаговый Мастер.",
  "site.hero.trustConverter":
    "🔄 3-in-1 Конвертер: мгновенный перевод между PlantUML, Mermaid и GraphML.",
  "site.hero.trustPwa":
    "💻 PWA Приложение: установка на Windows, macOS, Linux, iOS и Android.",

  "site.pillars.title": "Всё для Diagrams-as-Code в одном автономном приложении",
  "site.pillars.item1.title": "🤖 Умное создание (AI & Wizard)",
  "site.pillars.item1.text":
    "Не хотите писать синтаксис вручную? Опишите архитектуру обычным текстом для ИИ-ассистента или ответьте на вопросы пошагового Мастера. Вы получите чистый, валидный код диаграммы за считанные секунды.",
  "site.pillars.item2.title": "⚡️ Конвертация и Редактирование (Live Editor)",
  "site.pillars.item2.text":
    "Удобный онлайн-редактор с мгновенным предпросмотром. В один клик переводите схемы из PlantUML в Mermaid, из Mermaid в GraphML и обратно. Забудьте о проблемах совместимости между Notion, GitHub и Draw.io.",
  "site.pillars.item3.title": "📲 PWA, Оффлайн-режим и Хранилище",
  "site.pillars.item3.text":
    "Установите Code2Graph как нативное приложение на ваш ноутбук или планшет. Ваша работа и проекты сохраняются локально и в облаке, позволяя проектировать архитектуру даже в самолёте или при отсутствии связи.",

  "site.deepDive.title": "Полный контроль над вашей архитектурной документацией",
  "site.deepDive.item1.title": "🔄 Двунаправленный конвертер форматов",
  "site.deepDive.item1.text":
    "Переносите старые схемы GraphML в современные стандарты Mermaid или PlantUML. Без потери связей, узлов и логической структуры.",
  "site.deepDive.item2.title": "📝 Мощный Live-редактор",
  "site.deepDive.item2.text":
    "Подсветка синтаксиса, подсказки и автодополнение. Мгновенный рендеринг без задержек.",
  "site.deepDive.item3.title": "☁️ Хранение и локальный доступ",
  "site.deepDive.item3.text":
    "Сохраняйте диаграммы в приватном хранилище. Автоматическое сохранение кэша в PWA для безопасной оффлайн-работы.",
  "site.deepDive.item4.title": "📤 Экспорт в один клик",
  "site.deepDive.item4.text":
    "Скачивайте схемы в векторном формате (SVG, PDF) или растре (PNG). Копируйте готовый код в буфер обмена для вставки в Markdown / Confluence.",

  "site.formats.title": "Единый инструмент для всех ключевых стандартов",
  "site.formats.colFormat": "Формат",
  "site.formats.colPurpose": "Назначение",
  "site.formats.colFeatures": "Возможности в Code2Graph",
  "site.formats.plantuml.purpose": "Сложные UML, Sequence, Class и State диаграммы",
  "site.formats.plantuml.features": "Редактирование, AI-генерация, конвертация в Mermaid/GraphML",
  "site.formats.plantuml.summary":
    "Текстовый UML: последовательности, классы, состояния, C4 и другие схемы. В приложении рисуется офлайн через @plantuml/core и раскладку Smetana. C4 и ArchiMate подключают соответствующие стандартные библиотеки PlantUML.",
  "site.formats.mermaid.purpose": "Легковесные схемы для GitHub, Notion, Obsidian и Jira",
  "site.formats.mermaid.features": "Живой просмотр, генерация через Мастер, экспорт",
  "site.formats.mermaid.summary":
    "Компактный язык диаграмм для Markdown, GitHub и заметок. Редактор рисует Mermaid в браузере, онлайн-режим может использовать mermaid.ink.",
  "site.formats.graphml.purpose": "Графы с топологией для yEd, Draw.io и виз-систем",
  "site.formats.graphml.features": "Импорт, визуализация, примеры, конвертация в код",
  "site.formats.graphml.summary":
    "XML-формат графов, который используют yEd и другие инструменты. Code2Graph читает GraphML и раскладывает граф библиотекой dagre.",
  "site.formats.wiremark.purpose": "Вайрфреймы интерфейса в стиле наброска, прямо в тексте",
  "site.formats.wiremark.features": "Редактирование, живой просмотр, примеры экранов",
  "site.formats.wiremark.summary":
    "Текстовые вайрфреймы в виде наброска. Просмотр в приложении рисует @wiremark/core.",
  "site.formats.d2.purpose": "Современные схемы: архитектура, sequence, классы и SQL",
  "site.formats.d2.features": "Редактирование, оффлайн-просмотр, примеры выбранного языка",
  "site.formats.d2.summary":
    "Современный язык схем: архитектура, последовательности, классы и SQL. Оффлайн-просмотр собирает @d2lang/d2.",
  "site.formats.structurizr.purpose": "Архитектура C4 как код: контекст, контейнеры, компоненты, развёртывание",
  "site.formats.structurizr.features": "Редактирование, оффлайн-просмотр C4, примеры выбранного языка",
  "site.formats.structurizr.summary":
    "Архитектура C4 как код: ландшафт, контекст, контейнеры, компоненты и развёртывание. Редактор хранит Structurizr DSL и рисует виды через PlantUML C4.",

  "site.audience.title": "Ускоряет работу всей технической команды",
  "site.audience.architect.title": "🏛 Архитекторы ПО",
  "site.audience.architect.item1": "Быстро набрасывайте C4-модели и концептуальные схемы через ИИ.",
  "site.audience.architect.item2": "Приводите всю документацию компании к единому стандарту.",
  "site.audience.dev.title": "👨‍💻 Разработчики и Тимлиды",
  "site.audience.dev.item1": "Создавайте Sequence-диаграммы во время проектирования задач.",
  "site.audience.dev.item2":
    "Работайте с диаграммами как с кодом, храните их в Git и редактируйте оффлайн.",
  "site.audience.writer.title": "📝 Технические писатели и Системные аналитики",
  "site.audience.writer.item1": "Пользуйтесь пошаговым Мастером для описания бизнес-процессов.",
  "site.audience.writer.item2":
    "Легко конвертируйте схемы под требования разных платформ (Notion/Confluence).",

  "site.gettingStarted.title": "Начните за 10 секунд — без сложных установок",
  "site.gettingStarted.browser.title": "Вариант А: Прямо в браузере",
  "site.gettingStarted.browser.text":
    "Просто откройте Code2Graph.ru и сразу начинайте создавать или конвертировать диаграммы.",
  "site.gettingStarted.pwa.title": "Вариант Б: Как PWA-приложение",
  "site.gettingStarted.pwa.text":
    "Нажмите кнопку «Установить приложение» в адресной строке браузера или на лендинге. Code2Graph появится на вашем рабочем столе или главном экране смартфона.",

  "site.faq.title": "Часто задаваемые вопросы",
  "site.faq.q1": "Что такое PWA и как работает оффлайн-режим?",
  "site.faq.a1":
    "PWA (Progressive Web App) позволяет использовать веб-сайт как обычную программу на вашем устройстве. После первой загрузки веб-приложение сохраняется на диск и вы сможете конвертировать, редактировать и просматривать диаграммы даже без подключения к интернету.",
  "site.faq.q2": "Работает ли AI-генерация без интернета?",
  "site.faq.a2":
    "Ручное редактирование, конвертация форматов, пошаговый Мастер и хранилище работают оффлайн. Для отправки запросов к ИИ требуется подключение к сети.",
  "site.faq.q3": "Можно ли конвертировать диаграммы PlantUML в Mermaid без потери данных?",
  "site.faq.a3":
    "Да! Наш встроенный алгоритм конвертации транслирует синтаксис и узлы так, чтобы полностью сохранить логику исходной схемы.",
  "site.faq.q4": "Безопасно ли хранить схемы в Code2Graph?",
  "site.faq.a4":
    "Абсолютно. Ваши диаграммы сохраняются локально в вашем браузере / PWA-приложении, а при использовании аккаунта — надёжно шифруются в личном облаке.",

  "site.finalCta.title": "Ваш универсальный швейцарский нож для Diagrams-as-Code",
  "site.finalCta.text":
    "Генерируйте с помощью ИИ, редактируйте, конвертируйте и сохраняйте диаграммы PlantUML, Mermaid и GraphML в одном месте. Доступно прямо сейчас на любом устройстве.",
  "site.finalCta.primary": "Открыть Code2Graph",
  "site.finalCta.secondary": "📲 Установить PWA",

  "site.featureOffline": "Работает офлайн и с file://",
  "site.featureFormats": "PlantUML · Mermaid · GraphML",
  "site.featureAi": "AI: генерация и правка диаграмм",
  "site.featureLibrary": "Облачная библиотека диаграмм",
  "site.featureLlmLocal": "BYOK-ключи LLM только в браузере",
  "site.loginTitle": "Вход",
  "site.loginSubtitle": "Личный кабинет и облачная библиотека",
  "site.registerTitle": "Регистрация",
  "site.registerSubtitle": "Создайте аккаунт на сервере Code2Graph",
  "site.accountTitle": "Личный кабинет",
  "site.staticModeTitle": "Локальная версия",
  "site.staticModeText":
    "Эта сборка работает без сервера и базы данных: диаграммы хранятся в браузере. Вход и облачная библиотека доступны на версии с сервером.",
  "site.username": "Логин",
  "site.password": "Пароль",
  "site.passwordConfirm": "Пароль ещё раз",
  "site.rememberMe": "Запомнить меня",
  "site.loginSubmit": "Войти",
  "site.registerSubmit": "Зарегистрироваться",
  "site.logout": "Выйти",
  "site.openEditor": "Открыть редактор",
  "site.backHome": "На главную",
  "site.mcp.title": "MCP для агентов",
  "site.mcp.lead":
    "Агент описывает диаграмму словами. Code2Graph выбирает язык и возвращает исходник и изображение PlantUML, Mermaid, GraphML, WireMark, D2 или Structurizr.",
  "site.mcp.pointPlan": "plan_diagram выбирает язык и тип диаграммы.",
  "site.mcp.pointGenerate": "generate_diagram возвращает исходник и изображение.",
  "site.mcp.exampleCaption":
    "Ответ generate_diagram — это исходник, который открывается в редакторе, и готовое изображение диаграммы.",
  "site.mcp.exampleSource": "Исходник",
  "site.mcp.exampleImage": "Изображение",
  "site.mcp.pointLanguages": "Те же шесть языков, что в редакторе и в мастере.",
  "site.mcp.openPage": "Как подключить MCP",
  "site.mcp.pageTitle": "Code2Graph MCP",
  "site.mcp.summary":
    "MCP-сервер даёт Cursor и другим агентам запросить диаграмму у Code2Graph. По тексту запроса выбирается язык, в ответ приходят исходник и изображение диаграммы.",
  "site.mcp.toolsTitle": "Инструменты",
  "site.mcp.toolList": "языки сайта и типы диаграмм для каждого.",
  "site.mcp.toolPlan": "язык и тип по фразе, без исходника.",
  "site.mcp.toolGenerate":
    "исходник и изображение. Если задан CODE2GRAPH_API_URL, исходник запрашивается на сервере, иначе шаблон собирается локально. Картинка — отдельный блок: PlantUML, D2 и Structurizr рисует Kroki, Mermaid — mermaid.ink, GraphML и WireMark — локально.",
  "site.mcp.connectTitle": "Подключение в Cursor",
  "site.mcp.connectText":
    "Запускайте скрипт из копии этого репозитория. Подставьте свой путь. Без адреса генерация локальная, с адресом — через серверную версию сайта.",
  "site.mcp.source": "Пакет MCP в репозитории",
  "site.mcp.apiTitle": "API сервера",
  "site.mcp.apiText":
    "Серверная версия отдаёт эти маршруты. Если задан AGENT_API_TOKEN, нужен заголовок Authorization: Bearer с тем же значением, что CODE2GRAPH_API_TOKEN.",
  "site.mcp.apiFormats": "языки и типы",
  "site.mcp.apiPlan": "выбор языка",
  "site.mcp.apiScaffold": "язык, тип и исходник",
  "site.mcp.staticNote":
    "GitHub Pages — статический редактор и не отдаёт /api/agent. API работает на серверной версии, например www.code2graph.ru.",
  "site.noAccount": "Нет аккаунта?",
  "site.hasAccount": "Уже есть аккаунт?",
  "site.role": "Роль",
  "site.loginError": "Неверный логин или пароль",
  "site.registerError": "Не удалось зарегистрироваться",
  "site.registerDisabled": "Регистрация отключена администратором",
  "site.registerStatusError":
    "Не удалось проверить статус сервера. Проверьте подключение и попробуйте снова.",
  "site.registerMismatch": "Пароли не совпадают",
  "site.registerRequired": "Заполните все поля",
  "site.welcomeUser": "Вы вошли как {username}",
  "site.versionHint": "Версия сайта — сравните после обновления или перезагрузки страницы",
} as const satisfies LocaleMessages;
