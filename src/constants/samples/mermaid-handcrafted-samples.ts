import type { HandcraftedMermaidSampleId } from "@/constants/mermaid-sample-diagrams";

export const MERMAID_SAMPLES_RU: Record<HandcraftedMermaidSampleId, string> = {
  flowchart: `flowchart TD
    %% Блок-схема: условия, подграфы и стили
    A([Старт]) --> B{Валидно?}
    B -->|да| C[Обработка]
    B -->|нет| D[Ошибка]
    C --> E{Экспорт?}
    E -->|SVG| F[Скачать SVG]
    E -->|PNG| G[Скачать PNG]
    F --> H([Готово])
    G --> H
    D --> H

    subgraph Редактор
      C
      E
    end

    classDef ok fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warn fill:#FFF3E0,stroke:#E65100,color:#BF360C
    class C,F,G ok
    class D warn
    linkStyle 0 stroke:#1565C0,stroke-width:2px
    click A "https://example.com" "Открыть"`,
  sequence: `sequenceDiagram
    %% Диаграмма последовательности: участники, alt/opt/loop
    autonumber
    actor User as Пользователь
    participant App as "Web App"
    participant API as "Library API"
    participant DB as "SQLite"

    User->>App: Открыть диаграмму
    activate App
    App->>API: GET /diagrams/:id
    activate API
    API->>DB: SELECT source
    DB-->>API: row
    API-->>App: 200 OK
    deactivate API

    alt Кэш пуст
        App->>API: sync library
        API-->>App: diagrams[]
    else Кэш актуален
        App-->>User: показать из IndexedDB
    end

    loop каждый тег
        App->>App: render tag chip
    end

    opt Оффлайн
        App-->>User: режим без сети
    end

    par Параллельно
        App->>DB: метрики
    and
        App->>API: обновить токен
    end

    Note right of App: Превью рисуется в браузере

    App-->>User: Превью SVG
    deactivate App`,
  classDiagram: `classDiagram
    %% Диаграмма классов: наследование, композиция, зависимости
    direction LR

    class Animal {
        +String name
        +move()
    }

    class Dog {
        +String breed
        +bark()
    }

    class Feedable {
        <<interface>>
        +feed(food)
    }

    class Order {
        +number total
        +addItem(item)
    }

    class Item {
        +String title
        +number price
    }

    namespace Домен {
        class Animal
        class Dog
    }

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" *-- "*" Item : содержит
    Dog --> Order : создаёт

    note for Dog "Лояльный компаньон"`,
  state: `stateDiagram-v2
    %% Диаграмма состояний: переходы и заметки
    [*] --> Idle
    Idle --> Editing : open
    Editing --> Validating : validate
    Validating --> Rendering : ok
    Validating --> Editing : errors
    Rendering --> Preview : success
    Rendering --> Error : failure
    Preview --> Idle : new diagram
    Error --> Editing : retry
    Preview --> [*] : export done

    state Validating {
        [*] --> Check
        Check --> Passed: ok
        Check --> Failed: errors
    }

    note right of Validating
        Проверка синтаксиса
        перед рендером
    end note`,
  er: `erDiagram
    %% ER-диаграмма: сущности и кратности связей
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    EMPLOYEE ||--o{ ORDER : processes

    CUSTOMER {
        string id PK
        string email
        string name
    }

    ORDER {
        string id PK
        date created_at
        string status
    }

    PRODUCT {
        string sku PK
        string title
        number price
    }`,
  gantt: `gantt
%% Календарь и шкала оси времени в Mermaid Gantt:
%% axisFormat — формат подписей дат на шкале (d3-time-format):
%%   %d.%m — день.месяц (числовой, без английских названий); %d.%m.%Y — полная дата
%%   %d / %e — номер дня месяца (01..31 / 1..31); %j — день года (001..366)
%%   %a / %A — день недели кратко / полностью (Mon / Monday)
%%   %W / %U — номер недели в году (с понедельника / с воскресенья), напр. axisFormat W%W
%%   %m — номер месяца (01..12); %b / %B — месяц кратко / полностью; %Y — год
%% tickInterval 1day | 1week | 1month | 3month — шаг делений шкалы (дни, недели, месяцы, кварталы)
%% weekday monday — начало недели с понедельника (для еженедельной сетки tickInterval 1week)
title План релиза Code2Graph
dateFormat YYYY-MM-DD
axisFormat %d.%m
excludes weekends

section Подготовка
Анализ требований     :done, a1, 2024-01-02, 5d
Прототип UI           :done, a2, after a1, 4d

section Разработка
Mermaid поддержка     :active, d1, 2024-01-15, 7d
GraphML просмотр      :d2, after d1, 5d
Тесты и i18n          :d3, after d2, 4d

section Релиз
Сборка single HTML    :r1, after d3, 2d
Публикация            :milestone, m1, after r1, 0d`,
};

export const MERMAID_SAMPLES_EN: Record<HandcraftedMermaidSampleId, string> = {
  flowchart: `flowchart TD
    %% Flowchart: conditions, subgraphs, and styles
    A([Start]) --> B{Valid?}
    B -->|yes| C[Process]
    B -->|no| D[Error]
    C --> E{Export?}
    E -->|SVG| F[Download SVG]
    E -->|PNG| G[Download PNG]
    F --> H([Done])
    G --> H
    D --> H

    subgraph Editor
      C
      E
    end

    classDef ok fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warn fill:#FFF3E0,stroke:#E65100,color:#BF360C
    class C,F,G ok
    class D warn
    linkStyle 0 stroke:#1565C0,stroke-width:2px
    click A "https://example.com" "Open"`,
  sequence: `sequenceDiagram
    %% Sequence diagram: participants, alt/opt/loop
    autonumber
    actor User
    participant App as "Web App"
    participant API as "Library API"
    participant DB as "SQLite"

    User->>App: Open diagram
    activate App
    App->>API: GET /diagrams/:id
    activate API
    API->>DB: SELECT source
    DB-->>API: row
    API-->>App: 200 OK
    deactivate API

    alt Cache empty
        App->>API: sync library
        API-->>App: diagrams[]
    else Cache fresh
        App-->>User: show from IndexedDB
    end

    loop each tag
        App->>App: render tag chip
    end

    opt Offline
        App-->>User: offline mode
    end

    par In parallel
        App->>DB: metrics
    and
        App->>API: refresh token
    end

    Note right of App: Preview is drawn in the browser

    App-->>User: SVG preview
    deactivate App`,
  classDiagram: `classDiagram
    %% Class diagram: inheritance, composition, dependencies
    direction LR

    class Animal {
        +String name
        +move()
    }

    class Dog {
        +String breed
        +bark()
    }

    class Feedable {
        <<interface>>
        +feed(food)
    }

    class Order {
        +number total
        +addItem(item)
    }

    class Item {
        +String title
        +number price
    }

    namespace Domain {
        class Animal
        class Dog
    }

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" *-- "*" Item : contains
    Dog --> Order : creates

    note for Dog "Loyal companion"`,
  state: `stateDiagram-v2
    %% State diagram: transitions and notes
    [*] --> Idle
    Idle --> Editing : open
    Editing --> Validating : validate
    Validating --> Rendering : ok
    Validating --> Editing : errors
    Rendering --> Preview : success
    Rendering --> Error : failure
    Preview --> Idle : new diagram
    Error --> Editing : retry
    Preview --> [*] : export done

    state Validating {
        [*] --> Check
        Check --> Passed: ok
        Check --> Failed: errors
    }

    note right of Validating
        Syntax check
        before render
    end note`,
  er: `erDiagram
    %% ER diagram: entities and cardinalities
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    EMPLOYEE ||--o{ ORDER : processes

    CUSTOMER {
        string id PK
        string email
        string name
    }

    ORDER {
        string id PK
        date created_at
        string status
    }

    PRODUCT {
        string sku PK
        string title
        number price
    }`,
  gantt: `gantt
%% Calendar & time axis scale options in Mermaid Gantt:
%% axisFormat — date label format on the axis (d3-time-format):
%%   %m/%d or %d.%m — numeric month/day; %Y-%m-%d — ISO date
%%   %d / %e — day of month (01..31 / 1..31); %j — day of year (001..366)
%%   %a / %A — weekday short / full (Mon / Monday)
%%   %W / %U — week number of year (Monday / Sunday start), e.g. axisFormat W%W
%%   %m — month number (01..12); %b / %B — month short / full; %Y — 4-digit year
%% tickInterval 1day | 1week | 1month | 3month — axis tick step (days, weeks, months, quarters)
%% weekday monday — start week on Monday (used with tickInterval 1week)
title Code2Graph release plan
dateFormat YYYY-MM-DD
axisFormat %m/%d
excludes weekends

section Preparation
Requirements analysis :done, a1, 2024-01-02, 5d
UI prototype          :done, a2, after a1, 4d

section Development
Mermaid support       :active, d1, 2024-01-15, 7d
GraphML view-only     :d2, after d1, 5d
Tests and i18n        :d3, after d2, 4d

section Release
Single HTML build     :r1, after d3, 2d
Publish               :milestone, m1, after r1, 0d`,
};
