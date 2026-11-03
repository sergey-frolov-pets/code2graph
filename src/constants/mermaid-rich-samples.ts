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
  pie: `pie showData
    title Доля языков в примерах
    "PlantUML" : 28
    "Mermaid" : 24
    "D2" : 16
    "GraphML" : 12
    "Structurizr" : 12
    "WireMark" : 8`,
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
  xychart: `xychart-beta
    title "Заказы по месяцам"
    x-axis ["Янв", "Фев", "Мар", "Апр", "Май", "Июн"]
    y-axis "Заказы" 0 --> 120
    bar [20, 35, 40, 55, 70, 90]
    line [18, 30, 42, 50, 68, 88]`,
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
  pie: `pie showData
    title Share of sample languages
    "PlantUML" : 28
    "Mermaid" : 24
    "D2" : 16
    "GraphML" : 12
    "Structurizr" : 12
    "WireMark" : 8`,
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
  xychart: `xychart-beta
    title "Orders by month"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Orders" 0 --> 120
    bar [20, 35, 40, 55, 70, 90]
    line [18, 30, 42, 50, 68, 88]`,
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
