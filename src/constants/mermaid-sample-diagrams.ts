import type { AppLocale } from "@/constants/i18n";
import { buildWizardDiagramSample } from "@/constants/wizard-sample-sources";

export const MERMAID_SAMPLE_IDS = [
  "flowchart",
  "sequence",
  "classDiagram",
  "component",
  "activity",
  "state",
  "er",
  "gantt",
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
] as const;

export type MermaidSampleId = (typeof MERMAID_SAMPLE_IDS)[number];

export const HANDCRAFTED_MERMAID_SAMPLE_IDS = [
  "flowchart",
  "sequence",
  "classDiagram",
  "state",
  "er",
  "gantt",
] as const satisfies readonly MermaidSampleId[];

type HandcraftedMermaidSampleId = (typeof HANDCRAFTED_MERMAID_SAMPLE_IDS)[number];

export const MERMAID_SAMPLE_WIZARD_TYPES: Record<MermaidSampleId, import("@/constants/llm-wizard").WizardDiagramType> = {
  flowchart: "flowchart",
  sequence: "sequence",
  classDiagram: "class",
  component: "component",
  activity: "activity",
  state: "state",
  er: "er",
  gantt: "gantt",
  mindmap: "mindmap",
  pie: "pie",
  journey: "journey",
  gitgraph: "gitgraph",
  timeline: "timeline",
  sankey: "sankey",
  xychart: "xychart",
  block: "block",
  c4_context: "c4_context",
  requirement: "requirement",
  quadrant: "quadrant",
  architecture: "architecture",
  packet: "packet",
};

const MERMAID_SAMPLES_RU: Record<HandcraftedMermaidSampleId, string> = {
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
    class D warn`,
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

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" --> "*" Item : содержит
    Dog --> Order : создаёт`,
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
title План релиза vuePlantUML
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

const MERMAID_SAMPLES_EN: Record<HandcraftedMermaidSampleId, string> = {
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
    class D warn`,
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

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" --> "*" Item : contains
    Dog --> Order : creates`,
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
title vuePlantUML release plan
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

const MERMAID_SOURCES_BY_LOCALE: Record<
  AppLocale,
  Record<HandcraftedMermaidSampleId, string>
> = {
  ru: MERMAID_SAMPLES_RU,
  en: MERMAID_SAMPLES_EN,
};

function isHandcraftedMermaidSampleId(
  id: MermaidSampleId,
): id is HandcraftedMermaidSampleId {
  return (HANDCRAFTED_MERMAID_SAMPLE_IDS as readonly string[]).includes(id);
}

function buildMermaidSampleSource(id: MermaidSampleId, locale: AppLocale): string {
  if (isHandcraftedMermaidSampleId(id)) {
    return MERMAID_SOURCES_BY_LOCALE[locale][id];
  }

  return buildWizardDiagramSample(
    MERMAID_SAMPLE_WIZARD_TYPES[id],
    "mermaid",
    locale,
  );
}

const ALL_MERMAID_SAMPLE_SOURCES = new Set<string>();
for (const locale of ["ru", "en"] as AppLocale[]) {
  for (const id of MERMAID_SAMPLE_IDS) {
    ALL_MERMAID_SAMPLE_SOURCES.add(buildMermaidSampleSource(id, locale));
  }
}

export function getMermaidSampleSource(
  id: MermaidSampleId,
  locale: AppLocale,
): string {
  return buildMermaidSampleSource(id, locale);
}

export function findMermaidSampleId(
  source: string,
  locale: AppLocale,
): MermaidSampleId | null {
  for (const id of MERMAID_SAMPLE_IDS) {
    if (buildMermaidSampleSource(id, locale) === source) {
      return id;
    }
  }

  return null;
}

export function findMermaidSampleIdAnyLocale(
  source: string,
): MermaidSampleId | null {
  for (const locale of Object.keys(MERMAID_SOURCES_BY_LOCALE) as AppLocale[]) {
    const id = findMermaidSampleId(source, locale);
    if (id) {
      return id;
    }
  }
  return null;
}

export function isMermaidSampleSource(source: string): boolean {
  return ALL_MERMAID_SAMPLE_SOURCES.has(source);
}

export function translateMermaidSourceForLocale(
  source: string,
  fromLocale: AppLocale,
  toLocale: AppLocale,
): string | null {
  if (fromLocale === toLocale) {
    return source;
  }

  const sampleId = findMermaidSampleId(source, fromLocale);
  if (sampleId) {
    return getMermaidSampleSource(sampleId, toLocale);
  }

  return null;
}
