import type { AppLocale } from "@/constants/i18n";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { LocaleKey } from "@/locales/types";

/**
 * Short public cheat sheet for the language page.
 * Types are the diagrams a reader meets first. Keywords are the words
 * inside those diagrams, each with a snippet that can be pasted.
 */

export interface LocalizedExample {
  readonly ru: string;
  readonly en: string;
}

export interface LanguagePrimerType {
  readonly id: string;
  readonly titleKey: LocaleKey;
  readonly summaryKey: LocaleKey;
  readonly example: LocalizedExample;
}

export interface LanguagePrimerKeyword {
  readonly id: string;
  readonly token: string;
  readonly hintKey: LocaleKey;
  readonly example: LocalizedExample;
}

export interface LanguagePrimer {
  readonly types: readonly LanguagePrimerType[];
  readonly keywords: readonly LanguagePrimerKeyword[];
}

function lines(...rows: readonly string[]): string {
  return rows.join("\n");
}

function same(text: string): LocalizedExample {
  return { ru: text, en: text };
}

function both(ru: string, en: string): LocalizedExample {
  return { ru, en };
}

export function primerExample(
  snippet: LocalizedExample,
  locale: AppLocale,
): string {
  return snippet[locale];
}

const PLANTUML_PRIMER: LanguagePrimer = {
  types: [
    {
      id: "sequence",
      titleKey: "llm.wizard.type.sequence",
      summaryKey: "llm.wizard.typeDesc.sequence",
      example: both(
        lines(
          "@startuml",
          'actor "Покупатель" as User',
          'participant "API" as API',
          "User -> API : Заказ",
          "API --> User : Чек",
          "@enduml",
        ),
        lines(
          "@startuml",
          'actor "Customer" as User',
          'participant "API" as API',
          "User -> API : Order",
          "API --> User : Receipt",
          "@enduml",
        ),
      ),
    },
    {
      id: "class",
      titleKey: "llm.wizard.type.class",
      summaryKey: "llm.wizard.typeDesc.class",
      example: both(
        lines(
          "@startuml",
          "class User {",
          "  +id",
          "  +login()",
          "}",
          "class Order {",
          "  +total",
          "}",
          'User "1" --> "*" Order : оформляет',
          "@enduml",
        ),
        lines(
          "@startuml",
          "class User {",
          "  +id",
          "  +login()",
          "}",
          "class Order {",
          "  +total",
          "}",
          'User "1" --> "*" Order : places',
          "@enduml",
        ),
      ),
    },
    {
      id: "activity",
      titleKey: "llm.wizard.type.activity",
      summaryKey: "llm.wizard.typeDesc.activity",
      example: both(
        lines(
          "@startuml",
          "start",
          "if (Оплачено?) then (да)",
          "  :Отправить заказ;",
          "else (нет)",
          "  :Показать ошибку;",
          "endif",
          "stop",
          "@enduml",
        ),
        lines(
          "@startuml",
          "start",
          "if (Paid?) then (yes)",
          "  :Ship the order;",
          "else (no)",
          "  :Show an error;",
          "endif",
          "stop",
          "@enduml",
        ),
      ),
    },
    {
      id: "state",
      titleKey: "llm.wizard.type.state",
      summaryKey: "llm.wizard.typeDesc.state",
      example: both(
        lines(
          "@startuml",
          "[*] --> Ожидание",
          "Ожидание --> Работа : старт",
          "Работа --> [*]",
          "@enduml",
        ),
        lines(
          "@startuml",
          "[*] --> Idle",
          "Idle --> Active : start",
          "Active --> [*]",
          "@enduml",
        ),
      ),
    },
    {
      id: "usecase",
      titleKey: "llm.wizard.type.usecase",
      summaryKey: "llm.wizard.typeDesc.usecase",
      example: both(
        lines(
          "@startuml",
          "left to right direction",
          'actor "Покупатель" as User',
          'usecase "Войти" as SignIn',
          "User --> SignIn",
          "@enduml",
        ),
        lines(
          "@startuml",
          "left to right direction",
          'actor "Customer" as User',
          'usecase "Sign in" as SignIn',
          "User --> SignIn",
          "@enduml",
        ),
      ),
    },
    {
      id: "c4_context",
      titleKey: "llm.wizard.type.c4_context",
      summaryKey: "llm.wizard.typeDesc.c4_context",
      example: both(
        lines(
          "@startuml",
          "!include ./plantuml-lib/C4/C4_Context.puml",
          'Person(user, "Покупатель", "Оформляет заказ")',
          'System(shop, "Магазин", "Принимает заказы")',
          'Rel(user, shop, "Использует")',
          "@enduml",
        ),
        lines(
          "@startuml",
          "!include ./plantuml-lib/C4/C4_Context.puml",
          'Person(user, "Customer", "Places an order")',
          'System(shop, "Shop", "Takes orders")',
          'Rel(user, shop, "Uses")',
          "@enduml",
        ),
      ),
    },
  ],
  keywords: [
    {
      id: "startuml",
      token: "@startuml",
      hintKey: "site.primer.plantuml.kw.startuml",
      example: same(lines("@startuml", "Bob -> Alice", "@enduml")),
    },
    {
      id: "participant",
      token: "participant",
      hintKey: "site.primer.plantuml.kw.participant",
      example: both(
        'participant "Веб" as Web',
        'participant "Web" as Web',
      ),
    },
    {
      id: "arrow",
      token: "->",
      hintKey: "site.primer.plantuml.kw.arrow",
      example: both("User -> API : Заказ", "User -> API : Order"),
    },
    {
      id: "alt",
      token: "alt",
      hintKey: "site.primer.plantuml.kw.alt",
      example: both(
        lines("alt ошибка", "  API --> Web : 402", "else оплачено", "  API --> Web : 200", "end"),
        lines("alt failed", "  API --> Web : 402", "else paid", "  API --> Web : 200", "end"),
      ),
    },
    {
      id: "note",
      token: "note",
      hintKey: "site.primer.plantuml.kw.note",
      example: both(
        "note right of API : Проверить токен",
        "note right of API : Check the token",
      ),
    },
    {
      id: "if",
      token: "if",
      hintKey: "site.primer.plantuml.kw.if",
      example: both(
        lines("if (Оплачено?) then (да)", "  :Отправить;", "else (нет)", "  :Ошибка;", "endif"),
        lines("if (Paid?) then (yes)", "  :Ship;", "else (no)", "  :Error;", "endif"),
      ),
    },
    {
      id: "skinparam",
      token: "skinparam",
      hintKey: "site.primer.plantuml.kw.skinparam",
      example: same("skinparam backgroundColor white"),
    },
  ],
};

const MERMAID_PRIMER: LanguagePrimer = {
  types: [
    {
      id: "flowchart",
      titleKey: "llm.wizard.type.flowchart",
      summaryKey: "llm.wizard.typeDesc.flowchart",
      example: both(
        lines(
          "flowchart TD",
          "  start([Старт]) --> check{Оплачено?}",
          "  check -->|да| ship[Отправить]",
          "  check -->|нет| fail[Ошибка]",
        ),
        lines(
          "flowchart TD",
          "  start([Start]) --> check{Paid?}",
          "  check -->|yes| ship[Ship]",
          "  check -->|no| fail[Error]",
        ),
      ),
    },
    {
      id: "sequence",
      titleKey: "llm.wizard.type.sequence",
      summaryKey: "llm.wizard.typeDesc.sequence",
      example: both(
        lines(
          "sequenceDiagram",
          "  actor User as Покупатель",
          "  participant API",
          "  User->>API: Заказ",
          "  API-->>User: Чек",
        ),
        lines(
          "sequenceDiagram",
          "  actor User as Customer",
          "  participant API",
          "  User->>API: Order",
          "  API-->>User: Receipt",
        ),
      ),
    },
    {
      id: "class",
      titleKey: "llm.wizard.type.class",
      summaryKey: "llm.wizard.typeDesc.class",
      example: both(
        lines(
          "classDiagram",
          "  class User {",
          "    +id int",
          "    +login()",
          "  }",
          "  class Order {",
          "    +total float",
          "  }",
          "  User --> Order : оформляет",
        ),
        lines(
          "classDiagram",
          "  class User {",
          "    +id int",
          "    +login()",
          "  }",
          "  class Order {",
          "    +total float",
          "  }",
          "  User --> Order : places",
        ),
      ),
    },
    {
      id: "state",
      titleKey: "llm.wizard.type.state",
      summaryKey: "llm.wizard.typeDesc.state",
      example: both(
        lines(
          "stateDiagram-v2",
          "  [*] --> Ожидание",
          "  Ожидание --> Работа : старт",
        ),
        lines(
          "stateDiagram-v2",
          "  [*] --> Idle",
          "  Idle --> Active : start",
        ),
      ),
    },
    {
      id: "er",
      titleKey: "llm.wizard.type.er",
      summaryKey: "llm.wizard.typeDesc.er",
      example: both(
        lines("erDiagram", "  USER ||--o{ ORDER : оформляет"),
        lines("erDiagram", "  USER ||--o{ ORDER : places"),
      ),
    },
    {
      id: "gantt",
      titleKey: "llm.wizard.type.gantt",
      summaryKey: "llm.wizard.typeDesc.gantt",
      example: both(
        lines(
          "gantt",
          "  title План",
          "  dateFormat YYYY-MM-DD",
          "  section Работа",
          "  Задача :a1, 2026-01-06, 3d",
        ),
        lines(
          "gantt",
          "  title Plan",
          "  dateFormat YYYY-MM-DD",
          "  section Work",
          "  Task :a1, 2026-01-06, 3d",
        ),
      ),
    },
  ],
  keywords: [
    {
      id: "participant",
      token: "participant",
      hintKey: "site.primer.mermaid.kw.participant",
      example: both(
        "participant API as Сервис",
        "participant API as Service",
      ),
    },
    {
      id: "arrow",
      token: "->>",
      hintKey: "site.primer.mermaid.kw.arrow",
      example: both("User->>API: Заказ", "User->>API: Order"),
    },
    {
      id: "alt",
      token: "alt",
      hintKey: "site.primer.mermaid.kw.alt",
      example: both(
        lines("alt ошибка", "  API-->>Web: 402", "else оплачено", "  API-->>Web: 200", "end"),
        lines("alt failed", "  API-->>Web: 402", "else paid", "  API-->>Web: 200", "end"),
      ),
    },
    {
      id: "note",
      token: "Note",
      hintKey: "site.primer.mermaid.kw.note",
      example: both(
        "Note right of API: Проверить токен",
        "Note right of API: Check the token",
      ),
    },
    {
      id: "subgraph",
      token: "subgraph",
      hintKey: "site.primer.mermaid.kw.subgraph",
      example: both(
        lines("subgraph api [Сервис]", "  A --> B", "end"),
        lines("subgraph api [Service]", "  A --> B", "end"),
      ),
    },
    {
      id: "class",
      token: "class",
      hintKey: "site.primer.mermaid.kw.class",
      example: same(lines("class User {", "  +id int", "}")),
    },
    {
      id: "section",
      token: "section",
      hintKey: "site.primer.mermaid.kw.section",
      example: both(
        lines("section Работа", "  Задача :a1, 2026-01-06, 3d"),
        lines("section Work", "  Task :a1, 2026-01-06, 3d"),
      ),
    },
  ],
};

const GRAPHML_PRIMER: LanguagePrimer = {
  types: [
    {
      id: "directed",
      titleKey: "site.primer.graphml.type.directed.title",
      summaryKey: "site.primer.graphml.type.directed.summary",
      example: both(
        lines(
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
          '  <key id="label" for="node" attr.name="label" attr.type="string"/>',
          '  <graph edgedefault="directed">',
          '    <node id="user"><data key="label">Покупатель</data></node>',
          '    <node id="api"><data key="label">API</data></node>',
          '    <edge source="user" target="api"/>',
          "  </graph>",
          "</graphml>",
        ),
        lines(
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
          '  <key id="label" for="node" attr.name="label" attr.type="string"/>',
          '  <graph edgedefault="directed">',
          '    <node id="user"><data key="label">Customer</data></node>',
          '    <node id="api"><data key="label">API</data></node>',
          '    <edge source="user" target="api"/>',
          "  </graph>",
          "</graphml>",
        ),
      ),
    },
    {
      id: "undirected",
      titleKey: "site.primer.graphml.type.undirected.title",
      summaryKey: "site.primer.graphml.type.undirected.summary",
      example: same(
        lines(
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
          '  <graph edgedefault="undirected">',
          '    <node id="a"/>',
          '    <node id="b"/>',
          '    <edge source="a" target="b"/>',
          "  </graph>",
          "</graphml>",
        ),
      ),
    },
  ],
  keywords: [
    {
      id: "graphml",
      token: "graphml",
      hintKey: "site.primer.graphml.kw.graphml",
      example: same(
        '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
      ),
    },
    {
      id: "graph",
      token: "graph",
      hintKey: "site.primer.graphml.kw.graph",
      example: same('<graph edgedefault="directed">'),
    },
    {
      id: "node",
      token: "node",
      hintKey: "site.primer.graphml.kw.node",
      example: same('<node id="api"/>'),
    },
    {
      id: "edge",
      token: "edge",
      hintKey: "site.primer.graphml.kw.edge",
      example: same('<edge source="user" target="api"/>'),
    },
    {
      id: "key",
      token: "key",
      hintKey: "site.primer.graphml.kw.key",
      example: same(
        '<key id="label" for="node" attr.name="label" attr.type="string"/>',
      ),
    },
    {
      id: "data",
      token: "data",
      hintKey: "site.primer.graphml.kw.data",
      example: both(
        '<data key="label">Покупатель</data>',
        '<data key="label">Customer</data>',
      ),
    },
  ],
};

const WIREMARK_PRIMER: LanguagePrimer = {
  types: [
    {
      id: "wireframe",
      titleKey: "llm.wizard.type.wireframe",
      summaryKey: "llm.wizard.typeDesc.wireframe",
      example: both(
        lines(
          "Wireframe #login mobile",
          "  Stack column gap=2",
          '    Typography h4 "Вход"',
          '    TextField "Почта"',
          '    Button "Войти" contained',
        ),
        lines(
          "Wireframe #login mobile",
          "  Stack column gap=2",
          '    Typography h4 "Sign in"',
          '    TextField "Email"',
          '    Button "Sign in" contained',
        ),
      ),
    },
    {
      id: "flow",
      titleKey: "site.primer.wiremark.type.flow.title",
      summaryKey: "site.primer.wiremark.type.flow.summary",
      example: both(
        lines(
          "Flow LR",
          "Wireframe #login mobile",
          '  Button "Дальше" contained to=#home',
          "Wireframe #home mobile",
          '  Typography h4 "Главная"',
        ),
        lines(
          "Flow LR",
          "Wireframe #login mobile",
          '  Button "Next" contained to=#home',
          "Wireframe #home mobile",
          '  Typography h4 "Home"',
        ),
      ),
    },
  ],
  keywords: [
    {
      id: "wireframe",
      token: "Wireframe",
      hintKey: "site.primer.wiremark.kw.wireframe",
      example: same("Wireframe #login mobile"),
    },
    {
      id: "flow",
      token: "Flow",
      hintKey: "site.primer.wiremark.kw.flow",
      example: same("Flow LR"),
    },
    {
      id: "stack",
      token: "Stack",
      hintKey: "site.primer.wiremark.kw.stack",
      example: same("Stack column gap=2"),
    },
    {
      id: "typography",
      token: "Typography",
      hintKey: "site.primer.wiremark.kw.typography",
      example: both('Typography h4 "Вход"', 'Typography h4 "Sign in"'),
    },
    {
      id: "textfield",
      token: "TextField",
      hintKey: "site.primer.wiremark.kw.textfield",
      example: both('TextField "Почта" required', 'TextField "Email" required'),
    },
    {
      id: "button",
      token: "Button",
      hintKey: "site.primer.wiremark.kw.button",
      example: both(
        'Button "Войти" contained to=#home',
        'Button "Sign in" contained to=#home',
      ),
    },
  ],
};

const D2_PRIMER: LanguagePrimer = {
  types: [
    {
      id: "flowchart",
      titleKey: "llm.wizard.type.flowchart",
      summaryKey: "llm.wizard.typeDesc.flowchart",
      example: both(
        lines(
          "direction: right",
          'user: "Пользователь" {',
          "  shape: person",
          "}",
          'api: "API"',
          'db: "База" {',
          "  shape: cylinder",
          "}",
          'user -> api: "Запрос"',
          'api -> db: "Запрос"',
        ),
        lines(
          "direction: right",
          "user: User {",
          "  shape: person",
          "}",
          "api: API",
          "db: Database {",
          "  shape: cylinder",
          "}",
          "user -> api: Request",
          "api -> db: Query",
        ),
      ),
    },
    {
      id: "sequence",
      titleKey: "llm.wizard.type.sequence",
      summaryKey: "llm.wizard.typeDesc.sequence",
      example: both(
        lines(
          "direction: down",
          'checkout: "Оформление" {',
          "  shape: sequence_diagram",
          '  buyer: "Покупатель"',
          '  shop: "Магазин"',
          '  buyer -> shop: "Заказ"',
          "}",
        ),
        lines(
          "direction: down",
          "checkout: Checkout {",
          "  shape: sequence_diagram",
          "  buyer: Buyer",
          "  shop: Shop",
          "  buyer -> shop: Order",
          "}",
        ),
      ),
    },
    {
      id: "class",
      titleKey: "llm.wizard.type.class",
      summaryKey: "llm.wizard.typeDesc.class",
      example: both(
        lines(
          "direction: down",
          'User: "Пользователь" {',
          "  shape: class",
          "  +id: int",
          "  +login(): bool",
          "}",
          'Order: "Заказ" {',
          "  shape: class",
          "  +id: int",
          "}",
          'User -> Order: "оформляет"',
        ),
        lines(
          "direction: down",
          "User: User {",
          "  shape: class",
          "  +id: int",
          "  +login(): bool",
          "}",
          "Order: Order {",
          "  shape: class",
          "  +id: int",
          "}",
          "User -> Order: places",
        ),
      ),
    },
    {
      id: "er",
      titleKey: "llm.wizard.type.er",
      summaryKey: "llm.wizard.typeDesc.er",
      example: same(
        lines(
          "direction: right",
          "users: users {",
          "  shape: sql_table",
          "  id: int {constraint: primary_key}",
          "  name: string",
          "}",
          "orders: orders {",
          "  shape: sql_table",
          "  id: int {constraint: primary_key}",
          "  user_id: int {constraint: foreign_key}",
          "}",
          "users.id -> orders.user_id",
        ),
      ),
    },
    {
      id: "architecture",
      titleKey: "llm.wizard.type.architecture",
      summaryKey: "llm.wizard.typeDesc.architecture",
      example: both(
        lines(
          "direction: right",
          'network: "Сеть" {',
          '  web: "Веб"',
          '  api: "API" {',
          "    shape: hexagon",
          "  }",
          '  web -> api: "HTTPS"',
          "}",
        ),
        lines(
          "direction: right",
          "network: Network {",
          "  web: Web",
          "  api: API {",
          "    shape: hexagon",
          "  }",
          "  web -> api: HTTPS",
          "}",
        ),
      ),
    },
  ],
  keywords: [
    {
      id: "direction",
      token: "direction",
      hintKey: "site.primer.d2.kw.direction",
      example: same("direction: right"),
    },
    {
      id: "shape",
      token: "shape",
      hintKey: "site.primer.d2.kw.shape",
      example: both(
        lines('db: "База" {', "  shape: cylinder", "}"),
        lines("db: Database {", "  shape: cylinder", "}"),
      ),
    },
    {
      id: "arrow",
      token: "->",
      hintKey: "site.primer.d2.kw.arrow",
      example: both('user -> api: "Запрос"', "user -> api: Request"),
    },
    {
      id: "style",
      token: "style",
      hintKey: "site.primer.d2.kw.style",
      example: same(
        lines("api: API {", "  style: {", '    fill: "#E8F5E9"', "  }", "}"),
      ),
    },
    {
      id: "constraint",
      token: "constraint",
      hintKey: "site.primer.d2.kw.constraint",
      example: same("id: int {constraint: primary_key}"),
    },
  ],
};

const STRUCTURIZR_PRIMER: LanguagePrimer = {
  types: [
    {
      id: "c4_context",
      titleKey: "llm.wizard.type.c4_context",
      summaryKey: "llm.wizard.typeDesc.c4_context",
      example: both(
        lines(
          'workspace "Магазин" "Покупка" {',
          "    model {",
          '        customer = person "Покупатель" "Оформляет заказы."',
          '        shop = softwareSystem "Магазин" "Принимает заказы."',
          '        customer -> shop "Оформляет заказ"',
          "    }",
          "    views {",
          '        systemContext shop "Context" {',
          "            include *",
          "            autolayout lr",
          "        }",
          "    }",
          "}",
        ),
        lines(
          'workspace "Shop" "Checkout" {',
          "    model {",
          '        customer = person "Customer" "Places orders."',
          '        shop = softwareSystem "Shop" "Takes orders."',
          '        customer -> shop "Places an order"',
          "    }",
          "    views {",
          '        systemContext shop "Context" {',
          "            include *",
          "            autolayout lr",
          "        }",
          "    }",
          "}",
        ),
      ),
    },
    {
      id: "c4_container",
      titleKey: "llm.wizard.type.c4_container",
      summaryKey: "llm.wizard.typeDesc.c4_container",
      example: both(
        lines(
          'workspace "Магазин" "Контейнеры" {',
          "    model {",
          '        customer = person "Покупатель" "Покупает товары."',
          '        shop = softwareSystem "Магазин" "Интернет-магазин." {',
          '            web = container "Веб" "Интерфейс." "React"',
          '            api = container "API" "Заказы." "Java"',
          "        }",
          '        customer -> web "Открывает сайт"',
          '        web -> api "Вызывает" "JSON/HTTPS"',
          "    }",
          "    views {",
          '        container shop "Containers" {',
          "            include *",
          "            autolayout tb",
          "        }",
          "    }",
          "}",
        ),
        lines(
          'workspace "Shop" "Containers" {',
          "    model {",
          '        customer = person "Customer" "Buys products."',
          '        shop = softwareSystem "Shop" "Online shop." {',
          '            web = container "Web" "Customer interface." "React"',
          '            api = container "API" "Orders." "Java"',
          "        }",
          '        customer -> web "Opens the site"',
          '        web -> api "Calls" "JSON/HTTPS"',
          "    }",
          "    views {",
          '        container shop "Containers" {',
          "            include *",
          "            autolayout tb",
          "        }",
          "    }",
          "}",
        ),
      ),
    },
    {
      id: "component",
      titleKey: "llm.wizard.type.component",
      summaryKey: "llm.wizard.typeDesc.component",
      example: both(
        lines(
          'workspace "Магазин" "Компоненты" {',
          "    model {",
          '        shop = softwareSystem "Магазин" "Заказы." {',
          '            api = container "API" "Сервис заказов." "Java" {',
          '                orders = component "Заказы" "Принимает заказ." "Spring"',
          '                catalog = component "Каталог" "Отдаёт товары." "Spring"',
          '                orders -> catalog "Запрашивает товар"',
          "            }",
          "        }",
          "    }",
          "    views {",
          '        component api "Components" {',
          "            include *",
          "            autolayout tb",
          "        }",
          "    }",
          "}",
        ),
        lines(
          'workspace "Shop" "Components" {',
          "    model {",
          '        shop = softwareSystem "Shop" "Orders." {',
          '            api = container "API" "Order service." "Java" {',
          '                orders = component "Orders" "Takes an order." "Spring"',
          '                catalog = component "Catalog" "Serves products." "Spring"',
          '                orders -> catalog "Loads a product"',
          "            }",
          "        }",
          "    }",
          "    views {",
          '        component api "Components" {',
          "            include *",
          "            autolayout tb",
          "        }",
          "    }",
          "}",
        ),
      ),
    },
    {
      id: "deployment",
      titleKey: "llm.wizard.type.deployment",
      summaryKey: "llm.wizard.typeDesc.deployment",
      example: both(
        lines(
          'workspace "Магазин" "Развёртывание" {',
          "    model {",
          '        shop = softwareSystem "Магазин" "Интернет-магазин." {',
          '            web = container "Веб" "Интерфейс." "React"',
          "        }",
          '        live = deploymentEnvironment "Production" {',
          '            cluster = deploymentNode "Кластер" "Kubernetes." "Kubernetes" {',
          "                containerInstance web",
          "            }",
          "        }",
          "    }",
          "    views {",
          '        deployment shop live "Deployment" {',
          "            include *",
          "            autolayout lr",
          "        }",
          "    }",
          "}",
        ),
        lines(
          'workspace "Shop" "Deployment" {',
          "    model {",
          '        shop = softwareSystem "Shop" "Online shop." {',
          '            web = container "Web" "Interface." "React"',
          "        }",
          '        live = deploymentEnvironment "Production" {',
          '            cluster = deploymentNode "Cluster" "Kubernetes." "Kubernetes" {',
          "                containerInstance web",
          "            }",
          "        }",
          "    }",
          "    views {",
          '        deployment shop live "Deployment" {',
          "            include *",
          "            autolayout lr",
          "        }",
          "    }",
          "}",
        ),
      ),
    },
  ],
  keywords: [
    {
      id: "workspace",
      token: "workspace",
      hintKey: "site.primer.structurizr.kw.workspace",
      example: both(
        'workspace "Магазин" "Покупка" { }',
        'workspace "Shop" "Checkout" { }',
      ),
    },
    {
      id: "person",
      token: "person",
      hintKey: "site.primer.structurizr.kw.person",
      example: both(
        'customer = person "Покупатель" "Оформляет заказы."',
        'customer = person "Customer" "Places orders."',
      ),
    },
    {
      id: "softwareSystem",
      token: "softwareSystem",
      hintKey: "site.primer.structurizr.kw.softwareSystem",
      example: both(
        'shop = softwareSystem "Магазин" "Принимает заказы."',
        'shop = softwareSystem "Shop" "Takes orders."',
      ),
    },
    {
      id: "container",
      token: "container",
      hintKey: "site.primer.structurizr.kw.container",
      example: both(
        'api = container "API" "Заказы." "Java"',
        'api = container "API" "Orders." "Java"',
      ),
    },
    {
      id: "arrow",
      token: "->",
      hintKey: "site.primer.structurizr.kw.arrow",
      example: both(
        'customer -> shop "Оформляет заказ"',
        'customer -> shop "Places an order"',
      ),
    },
    {
      id: "views",
      token: "views",
      hintKey: "site.primer.structurizr.kw.views",
      example: same(
        lines(
          "views {",
          '    systemContext shop "Context" {',
          "        include *",
          "    }",
          "}",
        ),
      ),
    },
    {
      id: "autolayout",
      token: "autolayout",
      hintKey: "site.primer.structurizr.kw.autolayout",
      example: same("autolayout lr"),
    },
  ],
};

export const LANGUAGE_PRIMERS: Record<DiagramFormat, LanguagePrimer> = {
  plantuml: PLANTUML_PRIMER,
  mermaid: MERMAID_PRIMER,
  graphml: GRAPHML_PRIMER,
  wiremark: WIREMARK_PRIMER,
  d2: D2_PRIMER,
  structurizr: STRUCTURIZR_PRIMER,
};
