import type { AppLocale } from "@/constants/i18n";
import { getMermaidRichSample } from "@/constants/mermaid-rich-samples";
import { buildWizardDiagramSample } from "@/constants/wizard-sample-sources";
import type { SampleCatalog } from "@/languages/sample-catalog";

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
  // Расширение Mermaid Ext (src/services/mermaid/ext). Типы рисует встроенный
  // движок при __MERMAID_EXT__ = true (по умолчанию в проде). Сэмплы помечены
  // как ext-типы и на странице языка идут отдельной группой.
  "waterfall",
  "waterfallMono",
  "waterfallBreak",
  "waterfallMulti",
  "waterfallLabels",
  "waterfallNoLines",
  "waterfallThresholds",
  "bubble",
  "heatmap",
  "orgchart",
  "ev",
] as const;

export type MermaidSampleId = (typeof MERMAID_SAMPLE_IDS)[number];

/**
 * Типы, которые рисует расширение Mermaid Ext, а не штатный Mermaid.
 * Источник истины по синтаксису — docs/mermaid-ext-syntax.md.
 */
export const MERMAID_EXT_SAMPLE_IDS = [
  "waterfall",
  "waterfallMono",
  "waterfallBreak",
  "waterfallMulti",
  "waterfallLabels",
  "waterfallNoLines",
  "waterfallThresholds",
  "bubble",
  "heatmap",
  "orgchart",
  "ev",
] as const satisfies readonly MermaidSampleId[];

export type MermaidExtSampleId = (typeof MERMAID_EXT_SAMPLE_IDS)[number];

export function isMermaidExtSampleId(id: MermaidSampleId): id is MermaidExtSampleId {
  return (MERMAID_EXT_SAMPLE_IDS as readonly string[]).includes(id);
}

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
  // Mermaid Ext: у этих типов нет собственного шаблона мастера,
  // ближайший по смыслу — flowchart (дерево/шаги).
  waterfall: "flowchart",
  waterfallMono: "flowchart",
  waterfallBreak: "flowchart",
  waterfallMulti: "flowchart",
  waterfallLabels: "flowchart",
  waterfallNoLines: "flowchart",
  waterfallThresholds: "flowchart",
  bubble: "flowchart",
  heatmap: "flowchart",
  orgchart: "flowchart",
  ev: "flowchart",
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

const MERMAID_SOURCES_BY_LOCALE: Record<
  AppLocale,
  Record<HandcraftedMermaidSampleId, string>
> = {
  ru: MERMAID_SAMPLES_RU,
  en: MERMAID_SAMPLES_EN,
};

/**
 * Примеры для типов расширения Mermaid Ext.
 * Синтаксис зафиксирован в docs/mermaid-ext-syntax.md; фикстуры песочницы
 * (sandbox/fixtures/) — рабочие копии этих же примеров.
 */
const MERMAID_EXT_SAMPLES_RU: Record<MermaidExtSampleId, string> = {
  waterfall: `waterfall
%% Базовый водопад: старт, рост, падение, итог.
%% Синтаксис строк данных: <знак><число> : <подпись>
%%   =120 : Q1   абсолютное значение (старт или итог)
%%   = : Итого  «=» без числа — повтор накопленного итога
%%   +180 : Q2   приращение вверх
%%   -60 : Q3    приращение вниз
%% Остальные возможности — в примерах «разрыв шкалы», «несколько серий» и «подписи».
%% ВАЖНО: пунктирные линии между барами — это коннекторы (включены по умолчанию).
%%         Выключить: connectors off
title Выручка 2026
y "млн ₽" 0 --> 500
grid 100
=120 : Q1 старт
+180 : Q2 рост
-60 : Q3 отток
= : Итого H1
+240 : Q4
= : Итог года`,
  waterfallBreak: `waterfall
%% Разрыв шкалы: участок 300..800 ВЫРЕЗАН, чтобы мелкие шаги стали крупнее.
%% Бар, проходящий через разрыв, рисуется кусками с «зигзагом» на линии.
title Выручка с разрывом шкалы
y "млн ₽" 0 --> 1000
grid 100
break 300 --> 800 "разрыв шкалы"
=120 : Q1
+180 : Q2
+700 : Q3
= : Итог`,
  waterfallMulti: `waterfall
%% Несколько серий: у каждой группы свой базовый цвет,
%% рост — светлее на 20%, падение — темнее на 25%.
title План и факт
y "млн ₽" 0 --> 400
grid 100
series План color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : Итог
series Факт color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : Итог`,
  waterfallLabels: `waterfall
%% ПОДПИСИ И ЛИНИИ — две вещи, которых чаще всего не хватает.
%%
%% 1) ДВЕ ПОДПИСИ НА ОДНОМ БАРЕ (внутри И над) — оба флага в строке данных:
%%      +60 : Q2 inside above
%%    Порядок флагов любой, регистр не важен, флаги — на каждый бар отдельно.
%%    Для всех баров сразу:  labels both
%%    Внутри подпись белая, над баром — серая: они не мешают друг другу.
%%
%% 2) ЛИНИИ между барами — это ДИРЕКТИВА, отдельная строка (не флаг):
%%      connectors on    включить (по умолчанию включены)
%%      connectors off   выключить
%%    Пунктир идёт от рабочего края бара к следующему:
%%    рост — от верха, падение — от низа. Если уровни разные — ступенькой.
%%
%% 3) Своя подпись значения:  label="+60 млн"
%%    Без подписи вообще:      no-label
%%
%% 4) Цвета: colors total= increase= decrease=
title Подписи и линии
y "млн ₽" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside above
+60 : Q2 inside above label="+60 млн"
-25 : Q3 above
= : Итог inside above`,
  waterfallNoLines: `waterfall
%% ЛИНИИ ВЫКЛЮЧЕНЫ — тот же водопад, что в примере «подписи и линии»,
%% но без пунктирных соединителей: чистая презентационная картинка.
%%
%% Разница — одна строка:  connectors off
%% (по умолчанию линии включены, поэтому «off» нужно писать явно)
%%
%% Сравни с примером «Водопад — подписи и линии»:
%% там connectors on и те же самые данные.
title Подписи без линий
y "млн ₽" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside above
+60 : Q2 inside above label="+60 млн"
-25 : Q3 above
= : Итог inside above`,
  waterfallThresholds: `waterfall
%% ГОРИЗОНТАЛЬНЫЕ ЛИНИИ С ПРИМЕРОМ — уровень плана, цель, порог.
%%
%% Директива — ОТДЕЛЬНАЯ строка (не флаг в строке данных):
%%   line <значение> ["подпись"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "план"                 пунктир по умолчанию, цвет темы
%%   line 400 "цель" color=#cf222e   свой цвет
%%   line 250 "порог" style=dot width=1
%%
%% Линия рисуется по всей ширине графика, подпись — справа от последнего
%% бара, с вырезом под текст (линия её не перечёркивает).
%% Линий можно сколько угодно: каждая — своя строка.
title Выручка против плана
y "млн ₽" 0 --> 500
grid 100
line 350 "план"
line 400 "цель" color=#cf222e width=2
line 250 "порог" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : Итого H1
+240 : Q4
= : Итог года`,
  waterfallMono: `waterfall
%% Чёрно-белый режим: цвета не нужны, бары различаются светлотой.
%% Полезно для печати и для документов без цвета.
%% Свои цвета можно задать и здесь — они перекроют серую шкалу.
title Ч/Б режим (mono)
mono
y "млн ₽" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : Итого H1
+110 : Q4
= : Итог года`,
  bubble: `bubble
%% Демо всех возможностей bubble: оси x/y, легенда размера,
%% квадранты и их подписи, группы-цвета и размер шрифта.
%% Подписи точек выводятся целиком — переносом по словам, без «…».
title BCG матрица: подписи целиком
x "Доля рынка" 0 --> 10
y "Рост рынка, %" 0 --> 30
size "Выручка"
quadrants Звёзды, Вопросы, Дойные коровы, Собаки
mid x=5 y=12
fontsize 12
data
Продукт A : x=8.2, y=22, size=340, group=Software
Продукт B : x=2.1, y=25, size=180, group=Software
Продукт C : x=7.4, y=4, size=520, group=Hardware
Продукт D : x=1.5, y=3, size=90, group=Hardware
Продукт E : x=4.6, y=16.5, size=240, group=Software`,
  heatmap: `heatmap
title Нагрузка по дням
x Пн, Вт, Ср, Чт, Пт
y Утро, День, Вечер
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
Утро : 20, 35, 50, 30, 25
День : 60, 75, 85, 70, 55
Вечер : 40, 45, 65, 50, 35`,
  orgchart: `orgchart
Гендиректор [Генеральный директор]
Техдир [Технический директор]
Финдир [Финансовый директор]
Бэкенд [Руководитель бэкенда]
Фронтенд [Руководитель фронтенда]
Гендиректор -> Техдир
Гендиректор -> Финдир
Техдир -> Бэкенд
Техдир -> Фронтенд
Финдир -.-> Бэкенд`,
  ev: `ev
title Освоение бюджета
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
};

const MERMAID_EXT_SAMPLES_EN: Record<MermaidExtSampleId, string> = {
  waterfall: `waterfall
%% Basic waterfall: start, growth, decline, total.
%% Data rows: <sign><number> : <label>
%%   =120 : Q1   absolute value (start or total)
%%   = : H1 total  bare "=" — repeats the running total
%%   +180 : Q2   increase
%%   -60 : Q3    decrease
%% More features: samples "axis break", "multiple series", "labels".
%% NOTE: the dashed lines between bars are connectors (default on).
%%       Turn them off with: connectors off
title Revenue 2026
y "M USD" 0 --> 500
grid 100
=120 : Q1 start
+180 : Q2 growth
-60 : Q3 churn
= : H1 total
+240 : Q4
= : Year total`,
  waterfallBreak: `waterfall
%% Axis break: the 300..800 span is CUT so small steps become bigger.
%% A bar crossing the break is drawn in pieces with a zigzag on the line.
title Revenue with axis break
y "M USD" 0 --> 1000
grid 100
break 300 --> 800 "axis break"
=120 : Q1
+180 : Q2
+700 : Q3
= : Total`,
  waterfallMulti: `waterfall
%% Multiple series: each group has its own base colour,
%% increases 20% lighter, decreases 25% darker.
title Plan vs actual
y "M USD" 0 --> 400
grid 100
series Plan color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : Total
series Actual color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : Total`,
  waterfallLabels: `waterfall
%% LABELS AND LINES — the two things people miss most.
%%
%% 1) TWO LABELS ON ONE BAR (inside AND above) — write both flags in the row:
%%      +60 : Q2 inside above
%%    Flags are per-bar, order-independent, case-insensitive.
%%    For every bar at once:  labels both
%%    The inside label is white, the one above the bar is grey — they never clash.
%%
%% 2) LINES between bars are a DIRECTIVE on its own line (not a flag):
%%      connectors on    enable (on by default)
%%      connectors off   disable
%%    The dashed line runs from the working edge of a bar to the next one:
%%    growth — from the top, decline — from the bottom. Different levels
%%    are joined with a step.
%%
%% 3) Custom value label:  label="+60 M"
%%    No label at all:     no-label
%%
%% 4) Colours: colors total= increase= decrease=
title Labels and lines
y "M USD" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside above
+60 : Q2 inside above label="+60 M"
-25 : Q3 above
= : Total inside above`,
  waterfallNoLines: `waterfall
%% LINES OFF — the very same waterfall as "labels and lines",
%% but without the dashed connectors: a clean presentation picture.
%%
%% The only difference is one line:  connectors off
%% (connectors are on by default, so "off" must be written explicitly)
%%
%% Compare with the "Waterfall — labels and lines" sample:
%% it has connectors on and exactly the same data.
title Labels without lines
y "M USD" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside above
+60 : Q2 inside above label="+60 M"
-25 : Q3 above
= : Total inside above`,
  waterfallThresholds: `waterfall
%% HORIZONTAL LINES WITH A LABEL — plan level, target, threshold.
%%
%% The directive lives on its OWN line (not a flag in a data row):
%%   line <value> ["label"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "plan"                 dashed by default, theme colour
%%   line 400 "target" color=#cf222e custom colour
%%   line 250 "threshold" style=dot width=1
%%
%% A line spans the whole plot, its label sits to the right of the last bar
%% with a knockout so the line never strikes through the text.
%% As many lines as you like — one line each.
title Revenue vs plan
y "M USD" 0 --> 500
grid 100
line 350 "plan"
line 400 "target" color=#cf222e width=2
line 250 "threshold" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : H1 total
+240 : Q4
= : Year total`,
  waterfallMono: `waterfall
%% Black-and-white mode: no colours needed, bars differ by lightness.
%% Handy for print and for documents without colour.
%% Custom colours still work here — they override the grey scale.
title Mono mode (black & white)
mono
y "M USD" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : H1 total
+110 : Q4
= : Year total`,
  bubble: `bubble
%% Demo of every bubble feature: x/y axes, size legend, quadrants
%% and their labels, colour groups and font size.
%% Point labels are never truncated — they wrap by words, no "…".
title BCG matrix: full labels
x "Market share" 0 --> 10
y "Market growth, %" 0 --> 30
size "Revenue"
quadrants Stars, Question marks, Cash cows, Dogs
mid x=5 y=12
fontsize 12
data
Product A : x=8.2, y=22, size=340, group=Software
Product B : x=2.1, y=25, size=180, group=Software
Product C : x=7.4, y=4, size=520, group=Hardware
Product D : x=1.5, y=3, size=90, group=Hardware
Product E : x=4.6, y=16.5, size=240, group=Software`,
  heatmap: `heatmap
title Load by day
x Mon, Tue, Wed, Thu, Fri
y Morning, Day, Evening
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
Morning : 20, 35, 50, 30, 25
Day : 60, 75, 85, 70, 55
Evening : 40, 45, 65, 50, 35`,
  orgchart: `orgchart
CEO [Chief executive officer]
CTO [Chief technology officer]
CFO [Chief financial officer]
Backend [Head of backend]
Frontend [Head of frontend]
CEO -> CTO
CEO -> CFO
CTO -> Backend
CTO -> Frontend
CFO -.-> Backend`,
  ev: `ev
title Budget earned value
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
};

const MERMAID_EXT_SOURCES_BY_LOCALE: Record<
  AppLocale,
  Record<MermaidExtSampleId, string>
> = {
  ru: MERMAID_EXT_SAMPLES_RU,
  en: MERMAID_EXT_SAMPLES_EN,
};

function isHandcraftedMermaidSampleId(
  id: MermaidSampleId,
): id is HandcraftedMermaidSampleId {
  return (HANDCRAFTED_MERMAID_SAMPLE_IDS as readonly string[]).includes(id);
}

function buildMermaidSampleSource(id: MermaidSampleId, locale: AppLocale): string {
  if (isMermaidExtSampleId(id)) {
    return MERMAID_EXT_SOURCES_BY_LOCALE[locale][id];
  }

  if (isHandcraftedMermaidSampleId(id)) {
    return MERMAID_SOURCES_BY_LOCALE[locale][id];
  }

  return (
    getMermaidRichSample(id, locale) ??
    buildWizardDiagramSample(
      MERMAID_SAMPLE_WIZARD_TYPES[id],
      "mermaid",
      locale,
    )
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

export const mermaidSampleCatalog: SampleCatalog = {
  ids: MERMAID_SAMPLE_IDS,
  getSource(id, locale) {
    return getMermaidSampleSource(id as MermaidSampleId, locale);
  },
  findId(source, locale) {
    return findMermaidSampleId(source, locale);
  },
  isSampleSource(source) {
    return isMermaidSampleSource(source);
  },
};

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
