import type { AppLocale } from "@/constants/i18n";
import type { MermaidSampleId } from "@/constants/mermaid-sample-diagrams";

const MERMAID_RICH_SAMPLE_IDS = [
  "component",
  "activity",
  "mindmap",
  "pie",
  "journey",
  "gitgraph",
  "timeline",
  "sankey",
  "xychart",
  "block",
  "c4_context",
  "requirement",
  "quadrant",
  "architecture",
  "packet",
] as const satisfies readonly MermaidSampleId[];

type MermaidRichSampleId = (typeof MERMAID_RICH_SAMPLE_IDS)[number];

const MERMAID_RICH_SAMPLES_RU: Record<MermaidRichSampleId, string> = {
  component: `C4Component
title Компоненты API
Container_Boundary(api, "API", "Java") {
  Component(orders, "Заказы", "Spring", "Создаёт заказ")
  Component(catalog, "Каталог", "Spring", "Отдаёт товары")
  ComponentDb(cache, "Кэш", "Redis", "Горячие карточки")
  ComponentQueue(events, "События", "Kafka", "Факты заказа")
}
ContainerDb(db, "База", "PostgreSQL", "Заказы и товары")
Rel(orders, catalog, "Запрашивает товар", "JSON")
Rel(orders, db, "Сохраняет", "JDBC")
Rel(catalog, cache, "Читает", "Redis")
Rel(orders, events, "Публикует", "async")`,
  activity: `flowchart LR
    %% Активность: дорожки, условия и параллельные ветки
    subgraph Клиент
      A([Старт]) --> B[Выбрать товар]
    end
    subgraph Магазин
      B --> C{В наличии?}
      C -->|да| D[Резерв]
      C -->|нет| E[Сообщить об отсутствии]
      D --> F[Оплата]
      F --> G[Чек]
    end
    subgraph Склад
      D --> H[Сборка]
      H --> I([Отгрузка])
    end
    E --> J([Стоп])
    G --> I

    classDef ok fill:#E8F5E9,stroke:#2E7D32
    classDef stop fill:#FFEBEE,stroke:#C62828
    class D,F,G,H,I ok
    class E,J stop
    linkStyle 2 stroke:#C62828,stroke-width:2px`,
  mindmap: `mindmap
  root((Code2Graph))
    Редактор
      Код
      Превью
      Темы
    Языки
      PlantUML
      Mermaid
      D2
    Экспорт
      SVG
      PNG
      Библиотека`,
  pie: `%%{init: {'theme': 'base', 'pie': {'textPosition': 0.72, 'donutHole': 0.42, 'legendPosition': 'bottom', 'highlightSlice': 'Mermaid'}, 'themeVariables': {'pie1': '#1f6feb', 'pie2': '#2da44e', 'pie3': '#8250df', 'pie4': '#bf8700', 'pie5': '#cf222e', 'pie6': '#57606a', 'pieTitleTextSize': '20px', 'pieSectionTextSize': '14px', 'pieLegendTextSize': '14px', 'pieStrokeColor': '#ffffff', 'pieStrokeWidth': '2px', 'pieOuterStrokeWidth': '3px', 'pieOuterStrokeColor': '#ffffff', 'pieOpacity': '0.9'}}}%%
pie showData
    title Доля языков в примерах
    accTitle: Доли языков в примерах
    accDescr: Круговая диаграмма доли языков в примерах Code2Graph
    "PlantUML" : 28
    "Mermaid" : 24
    "D2" : 16
    "GraphML" : 12
    "Structurizr" : 12
    "WireMark" : 8
    %% Первая строка — pie. showData необязателен: в легенде будет «Mermaid [24]», без него — только имя.
    %% Заголовок на той же строке: pie title Текст   или   pie showData title Текст
    %% Заголовок отдельной строкой: title Текст заголовка. Кавычки вокруг заголовка не нужны.
    %% Сектор: "Подпись" : число. Кавычки обязательны. Дробь пишется точкой: 10.25 (в документации — до двух знаков).
    %% Знак процента писать нельзя. Угол = значение / сумма всех значений, сумма не обязана быть 100.
    %% Отрицательное значение — ошибка. Сектор меньше 1% суммы остаётся в легенде и не рисуется дугой.
    %% Одинаковая подпись второй раз игнорируется. Секторы идут по часовой стрелке в порядке строк.
    %% Комментарий — строка %%. Строка %%{ ... }%% — это директива настройки, не комментарий.
    %% config.pie.textPosition — подпись на радиусе: 0 в центре, 1 на внешнем крае. По умолчанию 0.75.
    %% config.pie.donutHole — дырка пончика от 0 до 0.9. 0 — обычный круг.
    %% config.pie.legendPosition — top, bottom, left, right, center. По умолчанию right.
    %% config.pie.highlightSlice — точное имя сектора, который выделен. hover выделяет сектор под курсором.
    %% Свои цвета pie1..pie12 задают на теме base: pie1 красит первый сектор, pie2 — второй, и так до pie12.
    %% themeVariables: pieTitleTextSize (25px), pieTitleTextColor, pieSectionTextSize (17px), pieSectionTextColor
    %% pieLegendTextSize (17px), pieLegendTextColor, pieStrokeColor (black), pieStrokeWidth (2px)
    %% pieOuterStrokeWidth (2px), pieOuterStrokeColor (black), pieOpacity (0.7)
    %% accTitle: короткий заголовок для скринридера
    %% accDescr: описание для скринридера. Несколько строк: accDescr { текст }`,
  journey: `journey
    title Покупка в магазине
    section Выбор
      Открыть каталог: 5: Покупатель
      Сравнить товары: 3: Покупатель
    section Оплата
      Войти: 4: Покупатель
      Оплатить картой: 2: Покупатель, Банк
    section Доставка
      Получить трек: 5: Покупатель, Склад`,
  gitgraph: `gitGraph
    %% Каркас, редактор, превью и сборка
    commit id: "Scaffold"
    branch develop
    checkout develop
    commit id: "Editor"
    commit id: "Preview"
    checkout main
    merge develop
    branch release
    checkout release
    commit id: "Build"
    checkout main
    merge release`,
  timeline: `timeline
    title История Code2Graph
    section Редактор
      2024 : PlantUML офлайн
           : Превью SVG
    section Языки
      2025 : Mermaid
           : D2 и GraphML
    section Сейчас
      2026 : Structurizr
           : WireMark`,
  sankey: `sankey-beta
    %% Визит, каталог, поиск, корзина, оплата, заказ, отказ
    Visit,Catalog,80
    Visit,Search,40
    Catalog,Cart,50
    Search,Cart,25
    Cart,Payment,60
    Payment,Order,55
    Payment,Drop,5`,
  xychart: `%%{init: {'themeVariables': {'xyChart': {'plotColorPalette': '#2563eb, #f59e0b'}}}}%%
xychart-beta
    title "Заказы по месяцам"
    x-axis ["Янв", "Фев", "Мар", "Апр", "Май", "Июн"]
    y-axis "Заказы" 0 --> 120
    bar [20, 35, 40, 55, 70, 90]
    line [18, 30, 42, 50, 68, 88]
    %% plotColorPalette красит серии по порядку объявления: первый цвет — bar, второй — line
    %% Команды: xychart, xychart-beta, horizontal, vertical, title, x-axis, y-axis, bar, line, accTitle, accDescr
    %% xychart-beta horizontal — столбцы в строку; vertical — обычная ориентация, её можно не писать
    %% title "Текст заголовка"
    %% x-axis [кат, "кат с пробелом"] — категории; длина списка равна длине каждой серии
    %% x-axis "Заголовок X" [кат1, кат2] — категории с подписью оси
    %% x-axis "Заголовок X" min --> max — числовая ось X
    %% y-axis "Заголовок Y" min --> max — подпись и диапазон
    %% y-axis "Заголовок Y" — только подпись, диапазон считается по данным
    %% y-axis min --> max — диапазон без подписи
    %% bar [n, n, n] — один ряд столбцов; несколько строк bar [...] — несколько рядов
    %% bar "Имя серии" [n, n, n] — имя попадает в легенду
    %% line [n, n, n] — линия на тех же осях
    %% line "Имя серии" [n, n, n]
    %% line [n "Подпись точки", n] — подпись у точки линии, для bar подпись игнорируется
    %% accTitle: короткий заголовок для скринридера
    %% accDescr: описание для скринридера
    %% Раскраска серий: директива init, ключ themeVariables.xyChart.plotColorPalette = "#цвет1, #цвет2"
    %% Ключи темы xyChart: backgroundColor, titleColor, dataLabelColor, legendTextColor, plotColorPalette
    %% xAxisLabelColor, xAxisTitleColor, xAxisTickColor, xAxisLineColor
    %% yAxisLabelColor, yAxisTitleColor, yAxisTickColor, yAxisLineColor
    %% Ключи config.xyChart: width, height, titlePadding, titleFontSize, showTitle, showLegend
    %% legendFontSize, legendPadding, chartOrientation, plotReservedSpacePercent
    %% showDataLabel, showDataLabelOutsideBar
    %% Ключи оси xAxis и yAxis: showLabel, labelFontSize, labelPadding, showTitle, titleFontSize, titlePadding
    %% showTick, tickLength, tickWidth, showAxisLine, axisLineWidth, labelRotation`,
  block: `block-beta
    columns 3
    web["Веб"]:2
    api["API"]
    space
    db[("База")]
    queue["Очередь"]
    web --> api
    api --> db
    api --> queue`,
  c4_context: `C4Context
    title Контекст магазина
    Person(customer, "Покупатель", "Оформляет заказы")
    Person_Ext(admin, "Админ", "Ведёт каталог")
    Enterprise_Boundary(studio, "Студия") {
      System(shop, "Магазин", "Принимает заказы")
    }
    System_Ext(mail, "Почта", "Письма покупателю")
    SystemDb(bank, "Банк", "Платежи")
    Rel(customer, shop, "Оформляет заказ", "HTTPS")
    Rel(admin, shop, "Правит каталог", "HTTPS")
    Rel(shop, mail, "Отправляет письмо", "SMTP")
    Rel(shop, bank, "Списывает", "API")`,
  requirement: `requirementDiagram
    functionalRequirement orderReq {
      id: 1
      text: "Покупатель оформляет заказ"
      risk: high
      verifymethod: test
    }
    performanceRequirement speedReq {
      id: 2
      text: "Ответ каталога быстрее 200 мс"
      risk: medium
      verifymethod: analysis
    }
    interfaceRequirement payReq {
      id: 3
      text: "Оплата через банк"
      risk: low
      verifymethod: demonstration
    }
    element shop {
      type: system
    }
    element api {
      type: service
    }
    shop - satisfies -> orderReq
    api - satisfies -> speedReq
    shop - traces -> payReq
    orderReq - contains -> speedReq`,
  quadrant: `quadrantChart
    title Приоритеты релиза
    x-axis Низкая ценность --> Высокая ценность
    y-axis Низкий риск --> Высокий риск
    quadrant-1 Сделать первым
    quadrant-2 Проверить
    quadrant-3 Отложить
    quadrant-4 Быстрые победы
    Редактор: [0.85, 0.35]
    Экспорт: [0.7, 0.8]
    Темы: [0.25, 0.2]
    Офлайн: [0.4, 0.65]`,
  architecture: `architecture-beta
    group edge(cloud)["Край"]
    group core(server)["Ядро"]
    service web(internet)["Веб"] in edge
    service api(server)["API"] in core
    service db(database)["База"] in core
    service queue(disk)["Очередь"] in core
    web:R --> L:api
    api:B --> T:db
    api:R --> L:queue`,
  packet: `packet-beta
    title Заголовок заказа
    0-15: "Источник"
    16-31: "Назначение"
    32-47: "Тип"
    48-63: "Длина"
    64-95: "Сумма"`,
};

const MERMAID_RICH_SAMPLES_EN: Record<MermaidRichSampleId, string> = {
  component: `C4Component
title API components
Container_Boundary(api, "API", "Java") {
  Component(orders, "Orders", "Spring", "Creates an order")
  Component(catalog, "Catalog", "Spring", "Returns products")
  ComponentDb(cache, "Cache", "Redis", "Hot cards")
  ComponentQueue(events, "Events", "Kafka", "Order facts")
}
ContainerDb(db, "Database", "PostgreSQL", "Orders and products")
Rel(orders, catalog, "Requests a product", "JSON")
Rel(orders, db, "Saves", "JDBC")
Rel(catalog, cache, "Reads", "Redis")
Rel(orders, events, "Publishes", "async")`,
  activity: `flowchart LR
    %% Activity: lanes, decisions, and parallel branches
    subgraph Client
      A([Start]) --> B[Pick a product]
    end
    subgraph Shop
      B --> C{In stock?}
      C -->|yes| D[Reserve]
      C -->|no| E[Report missing item]
      D --> F[Payment]
      F --> G[Receipt]
    end
    subgraph Warehouse
      D --> H[Pick]
      H --> I([Ship])
    end
    E --> J([Stop])
    G --> I

    classDef ok fill:#E8F5E9,stroke:#2E7D32
    classDef stop fill:#FFEBEE,stroke:#C62828
    class D,F,G,H,I ok
    class E,J stop
    linkStyle 2 stroke:#C62828,stroke-width:2px`,
  mindmap: `mindmap
  root((Code2Graph))
    Editor
      Code
      Preview
      Themes
    Languages
      PlantUML
      Mermaid
      D2
    Export
      SVG
      PNG
      Library`,
  pie: `%%{init: {'theme': 'base', 'pie': {'textPosition': 0.72, 'donutHole': 0.42, 'legendPosition': 'bottom', 'highlightSlice': 'Mermaid'}, 'themeVariables': {'pie1': '#1f6feb', 'pie2': '#2da44e', 'pie3': '#8250df', 'pie4': '#bf8700', 'pie5': '#cf222e', 'pie6': '#57606a', 'pieTitleTextSize': '20px', 'pieSectionTextSize': '14px', 'pieLegendTextSize': '14px', 'pieStrokeColor': '#ffffff', 'pieStrokeWidth': '2px', 'pieOuterStrokeWidth': '3px', 'pieOuterStrokeColor': '#ffffff', 'pieOpacity': '0.9'}}}%%
pie showData
    title Share of sample languages
    accTitle: Share of sample languages
    accDescr: Pie chart of language shares in Code2Graph samples
    "PlantUML" : 28
    "Mermaid" : 24
    "D2" : 16
    "GraphML" : 12
    "Structurizr" : 12
    "WireMark" : 8
    %% The first line is pie. showData is optional: the legend then reads "Mermaid [24]"; without it, only the name.
    %% Title on the same line: pie title Text    or    pie showData title Text
    %% Title on its own line: title Chart title. Quotes around the title are not required.
    %% A slice is "Label" : number. Quotes are required. Decimals use a dot: 10.25 (docs: up to two places).
    %% Do not write a percent sign. The angle is value / sum of all values; the sum does not have to be 100.
    %% A negative value is an error. A slice under 1% of the sum stays in the legend and is not drawn as an arc.
    %% A repeated label is ignored. Slices run clockwise in source order.
    %% A comment is a %% line. A %%{ ... }%% line is a config directive, not a comment.
    %% config.pie.textPosition places the slice label on the radius: 0 at the center, 1 at the outer edge. Default 0.75.
    %% config.pie.donutHole is the hole ratio from 0 to 0.9. 0 is a solid pie.
    %% config.pie.legendPosition is top, bottom, left, right, or center. Default right.
    %% config.pie.highlightSlice is the exact slice label to emphasize. hover emphasizes the slice under the pointer.
    %% Custom pie1..pie12 colors apply on the base theme: pie1 fills the first slice, pie2 the second, through pie12.
    %% themeVariables: pieTitleTextSize (25px), pieTitleTextColor, pieSectionTextSize (17px), pieSectionTextColor
    %% pieLegendTextSize (17px), pieLegendTextColor, pieStrokeColor (black), pieStrokeWidth (2px)
    %% pieOuterStrokeWidth (2px), pieOuterStrokeColor (black), pieOpacity (0.7)
    %% accTitle: short title for screen readers
    %% accDescr: description for screen readers. Several lines: accDescr { text }`,
  journey: `journey
    title Shop purchase
    section Browse
      Open catalog: 5: Buyer
      Compare products: 3: Buyer
    section Pay
      Sign in: 4: Buyer
      Pay by card: 2: Buyer, Bank
    section Delivery
      Get tracking: 5: Buyer, Warehouse`,
  gitgraph: `gitGraph
    commit id: "Scaffold"
    branch develop
    checkout develop
    commit id: "Editor"
    commit id: "Preview"
    checkout main
    merge develop
    branch release
    checkout release
    commit id: "Build"
    checkout main
    merge release`,
  timeline: `timeline
    title Code2Graph history
    section Editor
      2024 : Offline PlantUML
           : SVG preview
    section Languages
      2025 : Mermaid
           : D2 and GraphML
    section Now
      2026 : Structurizr
           : WireMark`,
  sankey: `sankey-beta
    Visit,Catalog,80
    Visit,Search,40
    Catalog,Cart,50
    Search,Cart,25
    Cart,Payment,60
    Payment,Order,55
    Payment,Drop,5`,
  xychart: `%%{init: {'themeVariables': {'xyChart': {'plotColorPalette': '#2563eb, #f59e0b'}}}}%%
xychart-beta
    title "Orders by month"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Orders" 0 --> 120
    bar [20, 35, 40, 55, 70, 90]
    line [18, 30, 42, 50, 68, 88]
    %% plotColorPalette colors series in declaration order: first color is bar, second is line
    %% Commands: xychart, xychart-beta, horizontal, vertical, title, x-axis, y-axis, bar, line, accTitle, accDescr
    %% xychart-beta horizontal draws bars as rows; vertical is the default and can be omitted
    %% title "Chart title"
    %% x-axis [cat, "cat with space"] — categories; the list length matches every series
    %% x-axis "X title" [cat1, cat2] — categories with an axis title
    %% x-axis "X title" min --> max — numeric X axis
    %% y-axis "Y title" min --> max — title and range
    %% y-axis "Y title" — title only, the range is fitted to the data
    %% y-axis min --> max — range without a title
    %% bar [n, n, n] — one bar series; several bar [...] lines — several series
    %% bar "Series name" [n, n, n] — the name is shown in the legend
    %% line [n, n, n] — a line on the same axes
    %% line "Series name" [n, n, n]
    %% line [n "Point label", n] — a label on a line point; bar accepts the syntax and ignores the label
    %% accTitle: short title for screen readers
    %% accDescr: description for screen readers
    %% Series colors: init directive, themeVariables.xyChart.plotColorPalette = "#color1, #color2"
    %% xyChart theme keys: backgroundColor, titleColor, dataLabelColor, legendTextColor, plotColorPalette
    %% xAxisLabelColor, xAxisTitleColor, xAxisTickColor, xAxisLineColor
    %% yAxisLabelColor, yAxisTitleColor, yAxisTickColor, yAxisLineColor
    %% config.xyChart keys: width, height, titlePadding, titleFontSize, showTitle, showLegend
    %% legendFontSize, legendPadding, chartOrientation, plotReservedSpacePercent
    %% showDataLabel, showDataLabelOutsideBar
    %% xAxis and yAxis keys: showLabel, labelFontSize, labelPadding, showTitle, titleFontSize, titlePadding
    %% showTick, tickLength, tickWidth, showAxisLine, axisLineWidth, labelRotation`,
  block: `block-beta
    columns 3
    web["Web"]:2
    api["API"]
    space
    db[("Database")]
    queue["Queue"]
    web --> api
    api --> db
    api --> queue`,
  c4_context: `C4Context
    title Shop context
    Person(customer, "Customer", "Places orders")
    Person_Ext(admin, "Admin", "Maintains the catalog")
    Enterprise_Boundary(studio, "Studio") {
      System(shop, "Shop", "Takes orders")
    }
    System_Ext(mail, "Mail", "Customer messages")
    SystemDb(bank, "Bank", "Payments")
    Rel(customer, shop, "Places an order", "HTTPS")
    Rel(admin, shop, "Edits the catalog", "HTTPS")
    Rel(shop, mail, "Sends a message", "SMTP")
    Rel(shop, bank, "Charges", "API")`,
  requirement: `requirementDiagram
    functionalRequirement orderReq {
      id: 1
      text: "A buyer places an order"
      risk: high
      verifymethod: test
    }
    performanceRequirement speedReq {
      id: 2
      text: "Catalog responds within 200 ms"
      risk: medium
      verifymethod: analysis
    }
    interfaceRequirement payReq {
      id: 3
      text: "Payment goes through the bank"
      risk: low
      verifymethod: demonstration
    }
    element shop {
      type: system
    }
    element api {
      type: service
    }
    shop - satisfies -> orderReq
    api - satisfies -> speedReq
    shop - traces -> payReq
    orderReq - contains -> speedReq`,
  quadrant: `quadrantChart
    title Release priorities
    x-axis Low value --> High value
    y-axis Low risk --> High risk
    quadrant-1 Do first
    quadrant-2 Validate
    quadrant-3 Later
    quadrant-4 Quick wins
    Editor: [0.85, 0.35]
    Export: [0.7, 0.8]
    Themes: [0.25, 0.2]
    Offline: [0.4, 0.65]`,
  architecture: `architecture-beta
    group edge(cloud)[Edge]
    group core(server)[Core]
    service web(internet)[Web] in edge
    service api(server)[API] in core
    service db(database)[Database] in core
    service queue(disk)[Queue] in core
    web:R --> L:api
    api:B --> T:db
    api:R --> L:queue`,
  packet: `packet-beta
    title Order header
    0-15: "Source"
    16-31: "Destination"
    32-47: "Type"
    48-63: "Length"
    64-95: "Total"`,
};

const MERMAID_RICH_SAMPLES: Record<
  AppLocale,
  Record<MermaidRichSampleId, string>
> = {
  ru: MERMAID_RICH_SAMPLES_RU,
  en: MERMAID_RICH_SAMPLES_EN,
};

export function getMermaidRichSample(
  id: MermaidSampleId,
  locale: AppLocale,
): string | null {
  if (!(MERMAID_RICH_SAMPLE_IDS as readonly string[]).includes(id)) {
    return null;
  }

  return MERMAID_RICH_SAMPLES[locale][id as MermaidRichSampleId];
}
