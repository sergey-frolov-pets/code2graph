import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "Diagrams-as-Code Studio",
  "site.nav.features": "Возможности",
  "site.nav.converter": "Конвертер & ИИ",
  "site.nav.pwa": "PWA / Оффлайн",
  "site.nav.formats": "Форматы",
  "site.nav.faq": "FAQ",
  "site.nav.mcp": "MCP",
  "site.nav.github": "GitHub",
  "site.nav.discussions": "Discussions",
  "site.hero.askQuestion": "💬 Задать вопрос",
  "site.github.star": "Star",
  "site.github.starLabel": "Поставить звезду code2graph на GitHub",
  "site.hero.viewOnGithub": "Открыть на GitHub",

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
  "site.language.syntax": "Синтаксис",
  "site.language.preview": "Как выглядит: {title}",
  "site.language.previewFailed": "Пример не отрисовался",
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
  "site.primer.plantuml.syntax.sequence":
    "actor и participant задают участника, as — короткое имя. Сообщение пишется ->, ответ -->, подпись после двоеточия.",
  "site.primer.plantuml.syntax.class":
    "class открывает класс, поля и методы — внутри скобок. Связь --> с кратностью в кавычках.",
  "site.primer.plantuml.syntax.activity":
    "start и stop — начало и конец. Шаг — :текст;. Развилка: if () then (), else и endif.",
  "site.primer.plantuml.syntax.state":
    "[*] — начало и конец. Переход пишется -->, подпись события — после двоеточия.",
  "site.primer.plantuml.syntax.usecase":
    "actor и usecase объявляют актёра и сценарий. Связь — -->, направление — left to right direction.",
  "site.primer.plantuml.syntax.c4_context":
    "Person(), System() и Rel() описывают людей, систему и связь. Библиотека подключается через !include.",
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
  "site.primer.mermaid.syntax.flowchart":
    "flowchart TD задаёт направление. Узел-шаг — [текст], решение — {текст}, старт — ([текст]). Стрелка -->, подпись ветки — |да|.",
  "site.primer.mermaid.syntax.sequence":
    "sequenceDiagram открывает схему. actor и participant с as задают участника. Запрос — ->>, ответ — -->>.",
  "site.primer.mermaid.syntax.class":
    "classDiagram открывает схему. class Имя { } содержит поля +имя тип и методы. Связь — -->.",
  "site.primer.mermaid.syntax.state":
    "stateDiagram-v2 открывает схему. [*] — старт. Переход — -->, подпись — после двоеточия.",
  "site.primer.mermaid.syntax.er":
    "erDiagram открывает схему. Связь ||--o{ читается «один ко многим», роль — после двоеточия.",
  "site.primer.mermaid.syntax.gantt":
    "gantt открывает схему. title — заголовок, dateFormat — формат дат, section — группа. Задача: имя :id, дата, длительность.",
  "site.primer.mermaid.syntax.mindmap":
    "mindmap открывает схему. Корень — root((тема)). Вложенность задаётся отступом.",
  "site.primer.mermaid.syntax.pie":
    "pie showData показывает числа. title — заголовок. Сектор: \"имя\" : число.",
  "site.primer.mermaid.syntax.journey":
    "journey открывает путь. title — заголовок, section — этап. Задача: имя: оценка: роль.",
  "site.primer.mermaid.syntax.gitgraph":
    "gitGraph открывает историю. commit — коммит, branch — ветка, checkout — переключение, merge — слияние.",
  "site.primer.mermaid.syntax.timeline":
    "timeline открывает шкалу. title — заголовок, section — период. События пишутся после двоеточия.",
  "site.primer.mermaid.syntax.sankey":
    "sankey-beta открывает потоки. Каждая строка — источник,цель,вес. Имена узлов — на любом языке; запятую в имени берут в кавычки. Опции не пишут в CSV: их задают YAML-шапкой config.sankey до ключевого слова (showValues, prefix, suffix, linkColor, nodeAlignment, width, height, useMaxWidth, nodeWidth, nodePadding, labelStyle, nodeColors).",
  "site.primer.mermaid.syntax.xychart":
    "xychart-beta открывает график. x-axis — категории, y-axis — диапазон, bar и line — серии.",
  "site.primer.mermaid.syntax.block":
    "block-beta открывает блоки. columns задаёт число колонок. Блок — id[\"подпись\"], связь — -->.",
  "site.primer.mermaid.syntax.c4_context":
    "C4Context открывает контекст. Person() и System() объявляют элементы, Rel() — связь.",
  "site.primer.mermaid.syntax.requirement":
    "requirementDiagram открывает схему. Блок requirement { } описывает требование, element { } — элемент, связь — satisfies.",
  "site.primer.mermaid.syntax.quadrant":
    "quadrantChart открывает квадранты. x-axis и y-axis — оси, quadrant-1 … quadrant-4 — названия, точка — имя: [x, y].",
  "site.primer.mermaid.syntax.architecture":
    "architecture-beta открывает схему. group — группа, service — сервис, связь — сервис:R --> L:сервис.",
  "site.primer.mermaid.syntax.packet":
    "packet-beta открывает пакет. title — заголовок. Поле: диапазон бит и подпись, например 0-15: \"Источник\".",
  "site.ext.mermaid.title": "Расширение Mermaid Ext",
  "site.ext.mermaid.lead":
    "Пять типов диаграмм, которых нет в штатном Mermaid: водопад, пузырьковая, тепловая карта, оргструктура и освоенный объём. Рисуются встроенным движком без внешних сервисов.",
  "site.ext.mermaid.note":
    "Пять типов рисует встроенный движок — без внешних сервисов. Если пример ниже в редакторе не отрисовывается, значит сборка сделана без расширения.",
  "site.ext.mermaid.type.waterfall": "Водопад",
  "site.ext.mermaid.type.bubble": "Пузырьковая",
  "site.ext.mermaid.type.heatmap": "Тепловая карта",
  "site.ext.mermaid.type.orgchart": "Оргструктура",
  "site.ext.mermaid.type.ev": "Освоенный объём",
  "site.ext.mermaid.type.boxplot": "Ящик с усами (Box plot)",
  "site.ext.mermaid.type.treemap": "Древовидная карта (Tree map)",
  "site.ext.mermaid.type.radar": "Лепестковая (Radar)",
  "site.ext.mermaid.type.voronoi": "Диаграмма Вороного",
  "site.ext.mermaid.type.clustered": "Серийная диаграмма",
  "site.ext.mermaid.desc.waterfall":
    "Как начальное значение превращается в итоговое через шаги + и −. Абсолютные колонки начинаются с =, несколько сценариев задаются через series. Есть разрывы шкалы, чёрно-белый режим (mono и mono invert) и свои цвета.",
  "site.ext.mermaid.desc.bubble":
    "Три измерения сразу: x, y и размер пузыря. Опционально — квадранты BCG и группы по цвету.",
  "site.ext.mermaid.desc.heatmap":
    "Матрица значений с цветовой шкалой. Диапазоны шкалы задаются явно, пустая ячейка (два разделителя подряд) рисуется серой.",
  "site.ext.mermaid.desc.orgchart":
    "Дерево подчинённости с явными рёбрами: сплошное — основная линия, пунктирное -.-> — второй руководитель. У блока можно задать заливку (color) и границу (border, style). Несколько корней собираются под невидимый корень.",
  "site.ext.mermaid.desc.ev":
    "Три кумулятивные кривые по дням: плановый объём PV, освоенный EV и фактические затраты AC. Плюс отклонения SV и CV в легенде.",
  "site.ext.mermaid.desc.boxplot":
    "Распределение по категориям: минимум, нижний и верхний квартили (Q1, Q3), медиана, максимум, среднее и выбросы. Принимает как готовую пятёрку статистик, так и сырую выборку (values=).",
  "site.ext.mermaid.desc.treemap":
    "Иерархическое разбиение прямоугольника по группам и элементам пропорционально числовому весу с автоматическим расчётом долей в процентах и оттенков цвета.",
  "site.ext.mermaid.desc.radar":
    "Сравнение нескольких серий по осям-лучам из одного центра с настраиваемым числом колец сетки, прозрачностью заливки и палитрой.",
  "site.ext.mermaid.desc.voronoi":
    "Геометрическое разбиение плоскости на выпуклые ячейки ближайших опорных точек с поддержкой цветовых групп и подписей в центроидах.",
  "site.ext.mermaid.desc.clustered":
    "Столбцы нескольких серий по категориям: рядом или стопкой (stacked), линии поверх баров, горизонтальные уровни, разрыв шкалы, CAGR в овале, поворот на 90 градусов (rotate 90), инверсия вертикальной оси (invert y) и чёрно-белый режим (mono, mono invert).",
  "site.ext.mermaid.syntax.waterfall":
    "waterfall открывает диаграмму. y задаёт ось. = — абсолютная колонка, + и - — шаг, подпись — после двоеточия. axis y off прячет ось значений вместе с сеткой, axis x off — подписи колонок, grid off прячет только сетку. gap 12 или gap 20% задаёт просвет между барами. labels auto красит подпись контрастом к фону: внутри бара по заливке, снаружи по холсту. \\n в подписи переносит строку.",
  "site.ext.mermaid.syntax.bubble":
    "bubble открывает диаграмму. x, y и size задают оси и размер. В блоке data точка: имя : x=, y=, size=. \\n в имени переносит строку.",
  "site.ext.mermaid.syntax.heatmap":
    "heatmap открывает карту. x и y — подписи осей. В блоке data строка: имя : числа через запятую. \\n в подписи переносит строку.",
  "site.ext.mermaid.syntax.orgchart":
    "orgchart открывает дерево. Узел — id [роль\\nимя] (\\n переносит строку, блок подгоняется под текст); color=#hex задаёт заливку, border=#hex и style=solid|dash|dot|dashdot — цвет и стиль границы. Основное ребро — ->, второй руководитель — -.->.",
  "site.ext.mermaid.syntax.ev":
    "ev открывает график. days — дни, pv — план, ev — освоенный объём, ac — фактические затраты. \\n в подписи дня переносит строку.",
  "site.ext.mermaid.syntax.boxplot":
    "boxplot открывает график. Категория: Имя : min=, q1=, median=, q3=, max= (или values=ч1, ч2, …) с опциональным color=#hex. \\n в имени переносит строку.",
  "site.ext.mermaid.syntax.treemap":
    "treemap открывает карту. Строка: Группа / Элемент : вес [color=#hex]. labels задаёт вывод чисел и процентов. \\n в имени переносит строку.",
  "site.ext.mermaid.syntax.radar":
    "radar открывает диаграмму. axes — список осей через запятую, series Имя : зн1, зн2, … — значения серии. \\n в подписи переносит строку.",
  "site.ext.mermaid.syntax.voronoi":
    "voronoi открывает разбиение. В блоке data точка: Имя : x=, y=, group=, color=#hex. \\n в имени переносит строку.",
  "site.ext.mermaid.syntax.clustered":
    "series открывает график. categories — категории, series Имя : зн1, зн2, … — столбцы, имя можно опустить (`series : зн1, зн2`); пусто, «-» или null пропускает бар. line Подпись : зн1, зн2, … рисует ломаную, подпись тоже можно опустить (`line : зн1, зн2`), пропуск соединяет соседние точки, подпись справа от графика; color и style=solid|dash|dot|dashdot задают вид. line 160 \"план\" — горизонтальная линия уровня (без двоеточия). break 200 --> 700 вырезает участок шкалы. cagr считает CAGR между первым и последним баром, cagr 2, 7 — между этими барами; format, prefix и label задают овал. format=\"±0.0%\" ставит плюс только у положительного числа. Непересекающиеся стрелки стоят на одном уровне. Несколько cagr подряд относятся к одной серии. stacked складывает серии, stacked off возвращает бары рядом, rotate 90 поворачивает диаграмму. invert y при rotate 90 ставит первую категорию снизу, invert y off возвращает порядок сверху вниз. y2 \"подпись\" 0 --> 40 рисует вторую шкалу (справа, при rotate 90 — сверху), а axis=y2 у серии, ломаной или линии уровня считает её значения по этой шкале. axis y off, axis y2 off и axis x off прячут выбранную ось вместе с её сеткой. grid y2 10 рисует сетку второй шкалы. stacked area строит площади, labels sum пишет сумму частей над стопкой, gap 12 или gap 8% задаёт просвет. labels auto красит подпись контрастом к фону под ней. \\n в подписи переносит строку.",
  "site.primer.graphml.kw.graphml":
    "Корень документа. Пространство имён GraphML обязательно.",
  "site.primer.graphml.kw.graph":
    "Сам граф. edgedefault — directed или undirected.",
  "site.primer.graphml.kw.node": "Вершина. id должен быть уникальным.",
  "site.primer.graphml.kw.edge": "Ребро. source и target ссылаются на id узлов.",
  "site.primer.graphml.kw.key": "Объявление атрибута для узлов или рёбер.",
  "site.primer.graphml.kw.data":
    "Значение атрибута. Видимая подпись лежит здесь, не в id.",
  "site.primer.graphml.syntax.directed":
    "graphml — корень, graph edgedefault=\"directed\" — направленный граф. node задаёт вершину, edge source и target — ребро, data — подпись.",
  "site.primer.graphml.syntax.undirected":
    "То же устройство, но edgedefault=\"undirected\": ребро только соединяет узлы.",
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
  "site.primer.wiremark.syntax.wireframe":
    "Wireframe #якорь открывает экран. Stack собирает колонку, Typography — текст, TextField — поле, Button — кнопку.",
  "site.primer.wiremark.syntax.flow":
    "Flow LR связывает экраны слева направо. to=#якорь на кнопке ведёт на другой Wireframe.",
  "site.primer.d2.kw.direction":
    "Направление раскладки: down, right, left или up.",
  "site.primer.d2.kw.shape":
    "Форма узла: person, cylinder, class, sql_table, sequence_diagram.",
  "site.primer.d2.kw.arrow": "Связь между узлами. Подпись пишется после двоеточия.",
  "site.primer.d2.kw.style": "Оформление узла: заливка, обводка, шрифт.",
  "site.primer.d2.kw.constraint":
    "Ограничение колонки SQL: primary_key, foreign_key или unique.",
  "site.primer.d2.syntax.flowchart":
    "direction задаёт раскладку. shape: person и shape: cylinder — форма узла. Связь — -> с подписью после двоеточия.",
  "site.primer.d2.syntax.sequence":
    "shape: sequence_diagram включает последовательность. Участники — вложенные узлы, сообщение — ->.",
  "site.primer.d2.syntax.class":
    "shape: class включает класс. Поля и методы пишутся строками внутри блока, связь — ->.",
  "site.primer.d2.syntax.er":
    "shape: sql_table включает таблицу. constraint: primary_key и foreign_key помечают ключи, связь — поле -> поле.",
  "site.primer.d2.syntax.architecture":
    "Вложенные блоки группируют узлы. shape задаёт форму, -> — связь с подписью.",
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
  "site.primer.structurizr.syntax.c4_context":
    "workspace открывает документ. person и softwareSystem описывают модель, -> — отношение, systemContext и autolayout — вид.",
  "site.primer.structurizr.syntax.c4_container":
    "container внутри softwareSystem задаёт приложение. Вид container и include * собирают контейнеры.",
  "site.primer.structurizr.syntax.component":
    "component внутри container описывает модуль. Вид component рисует этот контейнер.",
  "site.primer.structurizr.syntax.deployment":
    "deploymentEnvironment и deploymentNode описывают среду. containerInstance ставит контейнер на узел, вид deployment рисует схему.",
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
    "Скачивайте схемы в векторном формате (SVG) или растре (PNG). Копируйте готовый код в буфер обмена для вставки в Markdown / Confluence.",

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
    "Абсолютно. Ваши диаграммы сохраняются локально в вашем браузере / PWA-приложении, а при использовании аккаунта — хранятся в вашей личной облачной библиотеке.",

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
  "site.mcp.connected": "Подключен",
  "site.mcp.disconnected": "Не подключен",
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
  "site.mcp.catalogTitle": "Каталог возможностей",
  "site.mcp.catalogText":
    "Каталог возможностей — /llm/ на этом же хосте. Локальный MCP читает те же описания с диска и никуда больше за синтаксисом не ходит. В ответ приходит исходник для редактора, без картинки и без внешнего рендера.",
  "site.mcp.toolCapabilities":
    "одна страница-индекс языков или одного языка, если язык задан. Тел карточек в ответе нет.",
  "site.mcp.toolSyntax":
    "одна страница синтаксиса по ключевым словам или по пути из ссылки. Соседние страницы не склеиваются.",
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
  "site.footer.links": "Ссылки проекта",
  "site.license.title": "Лицензия",
  "site.license.summary":
    "Source-available по Prosperity Public License 3.0.0. Некоммерческое использование бесплатно.",
  "site.license.commercial":
    "Коммерческое использование бесплатно в течение 30 дней, дальше нужна платная лицензия.",
  "site.license.read": "Текст лицензии",
  "site.license.commercialLink": "Коммерческая лицензия",
  "site.landing.showcaseTitle": "Смотри, нажимай, редактируй",
  "site.landing.showcaseHint": "Каждая картинка ниже открывается в редакторе",
  "site.landing.tryScenario": "Попробовать этот сценарий",
  "site.landing.openInEditor": "Открыть в редакторе",
  "site.landing.allFormats": "6 языков — один редактор",
  "site.landing.privacyTitle": "Приватно по устройству",
  "site.landing.privacyLocal": "Диаграмма рисуется в вашем браузере",
  "site.landing.privacyKey": "Ключ AI — только в вашем браузере",
  "site.landing.privacyCloud": "Облако — только со входом; AI использует сеть выбранного провайдера",
  "site.landing.platformTitle": "Везде, где вы",
  "site.landing.platformDevices": "Windows · macOS · Linux · iOS · Android",
  "site.landing.platformSame": "Браузер или установленное приложение — один редактор",
  "site.landing.platformOffline": "Без сети — тоже работает, после первой загрузки",
  "site.landing.heroAlt": "Печатается код диаграммы, и схема строится вживую",
  "site.landing.converterAlt": "Конвертация PlantUML в Mermaid в один клик, схема не меняется",
  "site.landing.mcpAlt": "Запрос AI-агенту в Cursor и готовая диаграмма в ответе",
  "site.landing.audience.developers": "Разработчики",
  "site.landing.audience.analysts": "Аналитики",
  "site.landing.audience.managers": "Менеджеры",
  "site.landing.audience.students": "Студенты",
  "site.landing.audience.vibecoders": "Вайбкодеры",
  "site.landing.usp.developers": "Sequence и C4 во время ревью — диаграмма как код, в Git и в диффе PR",
  "site.landing.usp.analysts": "Процесс без синтаксиса: Мастер задаёт вопросы — схема готова",
  "site.landing.usp.managers": "План и статус одной картинкой: Gantt и графики — в презентацию за клик",
  "site.landing.usp.students": "Схема для работы за минуту: шаблоны, подсказки, без установки",
  "site.landing.usp.vibecoders": "Агент рисует — ты правишь: MCP отдаёт Cursor исходник и картинку",
} as const satisfies LocaleMessages;
