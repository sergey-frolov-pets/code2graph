import type { AppLocale } from "@/constants/i18n";
import {
  findMermaidSampleId,
  getMermaidSampleSource,
  isMermaidSampleSource,
  type MermaidSampleId,
} from "@/constants/mermaid-sample-diagrams";
export const PLANTUML_SAMPLE_IDS = [
  "classes",
  "sequence",
  "components",
  "state",
  "activity",
  "c4",
  "gantt",
  "mindmap",
] as const;

export const SAMPLE_DIAGRAM_IDS = PLANTUML_SAMPLE_IDS;

export type PlantUmlSampleId = (typeof PLANTUML_SAMPLE_IDS)[number];
export type SampleDiagramId = PlantUmlSampleId;

export type SampleSelection =
  | { format: "plantuml"; id: PlantUmlSampleId }
  | { format: "mermaid"; id: MermaidSampleId };

export type { MermaidSampleId };
export { MERMAID_SAMPLE_IDS } from "@/constants/mermaid-sample-diagrams";

const DEFAULT_SOURCE_RU = `@startuml
' Движок раскладки Smetana (по умолчанию в vuePlantUML)
!pragma layout smetana

title Пример диаграммы классов

' Стилизация элементов по стереотипу <<interface>>
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

' Класс с публичными полями (+) и методами
class User {
  +name: string
  +email: string
  +login()
}

' Интерфейс — контракт без реализации
interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

' Реализация интерфейса (..|>) и ассоциация с кратностью
User ..|> Authenticatable
User "1" --> "*" Order : создаёт
@enduml`;

const DEFAULT_SOURCE_EN = `@startuml
' Smetana layout engine (default in vuePlantUML)
!pragma layout smetana

title Class diagram example

' Style elements by <<interface>> stereotype
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

' Class with public fields (+) and methods
class User {
  +name: string
  +email: string
  +login()
}

' Interface — contract without implementation
interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

' Interface realization (..|>) and association with multiplicity
User ..|> Authenticatable
User "1" --> "*" Order : creates
@enduml`;

const SAMPLE_DIAGRAMS_RU: Record<SampleDiagramId, string> = {
  classes: `@startuml
' Полный пример диаграммы классов: пакеты, наследование, стереотипы
!pragma layout smetana

title Диаграмма классов — полный пример

' Цвета фона и рамки для стереотипов <<interface>> и <<enum>>
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "Домен" {
  ' Абстрактный класс — нельзя инстанцировать напрямую
  abstract class Animal {
    +name: String
    +{abstract} move()
  }

  interface Feedable {
    +feed(food: String)
  }

  enum Diet {
    HERBIVORE
    CARNIVORE
    OMNIVORE
  }

  ' extends — наследование; implements — реализация интерфейса
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' Пакет со стереотипом <<Rectangle>> и цветом фона
package "Сервисы" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — паттерн одиночки; (S,#FF7700) — иконка
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' Заметки привязываются к элементу: top / right / left / bottom
note top of Animal : Базовый класс\\nвсех животных
note right of Dog : Лояльный\\nкомпаньон

' Композиция (*--), зависимость (..>), ассоциация (-->)
Dog "1" *-- "0..*" Cat : дружит с
Veterinary ..> Animal : проверяет
Dog ..> Diet : следует
@enduml`,
  sequence: `@startuml
' Диаграмма последовательности: взаимодействие во времени
!pragma layout smetana

title Диаграмма последовательности — полный пример

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' Участники: actor, participant, database; alias — короткое имя
actor Клиент as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database "БД" as db

' == Разделитель фаз (группировка сообщений) ==
== Аутентификация ==

client -> app : POST /login
activate app
app -> auth : validate(credentials)
activate auth
auth -> db : SELECT user
activate db
db --> auth : user row
deactivate db
auth --> app : token
deactivate auth

' alt — ветвление по условию (if/else)
alt Успех
  app --> client : 200 OK + JWT
else Неверные данные
  app --> client : 401 Unauthorized
end

deactivate app

== Загрузка данных ==

client -> app : GET /dashboard
activate app

' opt — необязательный фрагмент (выполняется при условии)
opt Кэш пуст
  app -> db : SELECT data
  db --> app : rows
end

' loop — повторение для каждого элемента
loop каждый элемент
  app -> app : transform(item)
end

' par — параллельные потоки сообщений
par Параллельная загрузка
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
  components: `@startuml
' Диаграмма компонентов: модули, интерфейсы и зависимости
!pragma layout smetana

title Диаграмма компонентов — полный пример

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "Клиент" #E3F2FD {
  ' [Имя] — компонент; interface — точка подключения (lollipop)
  [Vue SPA] as spa
  [Service Worker] as sw
  interface "HTTP API" as httpApi
  spa - httpApi
}

package "Рендерер" #E8F5E9 {
  ' frame — вложенная рамка внутри пакета
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "Хранилище" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' Сплошная стрелка — зависимость; пунктир (..>) — слабая связь
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  Рендер SVG
  в браузере
end note
@enduml`,
  state: `@startuml
' Диаграмма состояний: жизненный цикл и условные переходы
!pragma layout smetana

title Диаграмма состояний — условные переходы

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — начальное/конечное псевдосостояние
[*] --> Idle

' Вложенное состояние с entry-действием и описанием
state Idle {
  Idle : entry / resetTimer()
  Idle : Система ожидает
}

Idle --> Validating : submit()

' Составное состояние с внутренней логикой
state Validating {
  state "Проверка" as check
  ' choice — узел ветвления по guard-условию [valid]/[invalid]
  state c <<choice>>
  [*] --> check
  check --> c
  c --> Passed : [valid]
  c --> Failed : [invalid]
  Passed --> [*]
  Failed --> [*]
}

Validating --> Rendering : success
Validating --> Idle : cancel()

state Rendering {
  Rendering : Рендер SVG
}

Rendering --> Done : success
Rendering --> Error : failure

state Done {
  Done : entry / showPreview()
}

state Error {
  Error : entry / logError()
}

Done --> Idle : new diagram
Error --> Idle : retry

note right of Validating
  Условный переход
  через choice
end note
@enduml`,
  activity: `@startuml
' Диаграмма активности: поток работ, swimlanes и условия
!pragma layout smetana

title Диаграмма активности — стили и условия

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes (дорожки) — |цвет|Имя| задаёт зону ответственности
|#E3F2FD|Клиент|
|#E8F5E9|Редактор|
|#FFF3E0|Рендер|

start

|Клиент|
:Ввести PlantUML код;

|Редактор|
:Применить layout pragma;
' if/then/else — ветвление; <<#цвет>> после ';' — подсветка действия
if (Синтаксис верный?) then (да)
  :Подготовить источник;
else (нет)
  :Показать ошибку; <<#Pink>>
  stop
endif

|Рендер|
' fork/fork again/end fork — параллельные ветки
fork
  :Smetana layout;
fork again
  :Генерация SVG;
end fork

|Клиент|
:Отобразить превью;
:Экспорт PNG/SVG; <<#LightBlue>>

stop
@enduml`,
  c4: `@startuml
' C4-модель: архитектура системы на уровне контейнеров
!pragma layout smetana

' Подключение библиотеки C4 (файлы в public/plantuml-lib/C4/)
!include ./plantuml-lib/C4/C4_Container.puml

' Настройка внешнего вида персон и тегов элементов/связей
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — vuePlantUML (контейнеры)

' Person — пользователь; Person_Ext — внешний актор
Person(user, "Пользователь", "Создаёт и редактирует диаграммы")
Person_Ext(admin, "Администратор", "Управляет библиотекой")

' System_Boundary — граница нашей системы
System_Boundary(app, "vuePlantUML") {
  Container(spa, "SPA", "Vue 3, TypeScript", "Редактор и превью диаграмм")
  Container(api, "Library API", "Node.js, Hono", "REST API библиотеки диаграмм", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "Хранение диаграмм и метаданных")
  ContainerQueue(sw, "Service Worker", "PWA", "Кэширование и offline")
}

' System_Ext — внешние системы
System_Ext(plantuml, "PlantUML Core", "@plantuml/core в браузере")
System_Ext(cdn, "CDN", "Статические ресурсы")

' Rel — связь; Rel_Back — обратное направление; $tags — стиль связи
Rel(user, spa, "Редактирует", "HTTPS")
Rel(spa, plantuml, "Рендерит", "in-process")
Rel(spa, api, "Загружает библиотеку", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "Кэширует", "events")
Rel(spa, cdn, "Статика", "HTTPS")

SHOW_LEGEND()
@enduml`,
  gantt: `@startgantt
' Диаграмма Ганта: задачи, зависимости и вехи
project starts 2026-01-06
saturday are closed
sunday are closed

[Анализ требований] lasts 5 days and is colored in LightGreen
[Прототип UI] lasts 4 days and starts at [Анализ требований]'s end
[Разработка] lasts 10 days and starts at [Прототип UI]'s end
[Тестирование] lasts 5 days and starts at [Разработка]'s end
[Релиз] happens at 2026-02-20 and is colored in Coral
@endgantt`,
  mindmap: `@startmindmap
' Mind map — полный пример возможностей PlantUML
top to bottom direction

title vuePlantUML — mind map
header Редактор диаграмм
footer Офлайн · SVG · PNG
caption Рис. 1 — демонстрация синтаксиса
legend right
  * — OrgMode
  +/-- — арифметика
  _ — без рамки
endlegend

' Стили узлов через mindmapDiagram и стереотипы
mindmapDiagram {
  .editor { BackgroundColor #E3F2FD }
  .render { BackgroundColor #E8F5E9 }
  .export { BackgroundColor #FFF3E0 }
  node { MaximumWidth 120 }
}

' Корневой узел: иконка OpenIconic + цвет
*[#1565C0] <&code> vuePlantUML

' Ветка справа (+) — арифметическая нотация
+[#2E7D32] Редактор <<editor>>
++ Monaco
+++_ Подсветка синтаксиса
+++_ Автодополнение
+++_ Складки кода
++:Многострочный узел
Редактор и превью
в одном окне;
++ Темы оформления

' Ветка слева (--) — арифметическая нотация
--[#E65100] Форматы
--- PlantUML
---- @startuml
---- @startgantt
---- @startmindmap
--- Mermaid
---- flowchart
---- sequenceDiagram
---- mindmap
--- GraphML

left side

' Переключение на левую сторону (left side)
--[#6A1B9A] Рендер
--- @plantuml/core
--- Smetana layout
---:Превью
SVG в браузере
без сервера;

' OrgMode-синтаксис (*) с inline-цветами
*[#C62828] Экспорт <<export>>
** SVG
** PNG
**_:Библиотека
Сохранение в IndexedDB
и синхронизация;

' Многострочный узел с Creole-разметкой
**:==Возможности
**жирный** и //курсив//
Моноширинный: ""code""
--разделитель--
• список
• пункты
;

' Второй корень — multiroot mindmap
*[#455A64] PWA
** Service Worker
** Оффлайн-режим
** Установка на устройство
@endmindmap`,
};

const SAMPLE_DIAGRAMS_EN: Record<SampleDiagramId, string> = {
  classes: `@startuml
' Full class diagram example: packages, inheritance, stereotypes
!pragma layout smetana

title Class diagram — full example

' Background and border colors for <<interface>> and <<enum>> stereotypes
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "Domain" {
  ' Abstract class — cannot be instantiated directly
  abstract class Animal {
    +name: String
    +{abstract} move()
  }

  interface Feedable {
    +feed(food: String)
  }

  enum Diet {
    HERBIVORE
    CARNIVORE
    OMNIVORE
  }

  ' extends — inheritance; implements — interface realization
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' Package with <<Rectangle>> stereotype and background color
package "Services" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — singleton pattern; (S,#FF7700) — icon
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' Notes attach to elements: top / right / left / bottom
note top of Animal : Base class\\nfor all animals
note right of Dog : Loyal\\ncompanion

' Composition (*--), dependency (..>), association (-->)
Dog "1" *-- "0..*" Cat : friends with
Veterinary ..> Animal : checks
Dog ..> Diet : follows
@enduml`,
  sequence: `@startuml
' Sequence diagram: interactions over time
!pragma layout smetana

title Sequence diagram — full example

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' Participants: actor, participant, database; alias — short name
actor Client as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database DB as db

' == Phase separator (groups messages) ==
== Authentication ==

client -> app : POST /login
activate app
app -> auth : validate(credentials)
activate auth
auth -> db : SELECT user
activate db
db --> auth : user row
deactivate db
auth --> app : token
deactivate auth

' alt — conditional branch (if/else)
alt Success
  app --> client : 200 OK + JWT
else Invalid credentials
  app --> client : 401 Unauthorized
end

deactivate app

== Data loading ==

client -> app : GET /dashboard
activate app

' opt — optional fragment (executed when condition holds)
opt Cache empty
  app -> db : SELECT data
  db --> app : rows
end

' loop — repeat for each item
loop each item
  app -> app : transform(item)
end

' par — parallel message flows
par Parallel fetch
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
  components: `@startuml
' Component diagram: modules, interfaces, and dependencies
!pragma layout smetana

title Component diagram — full example

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "Client" #E3F2FD {
  ' [Name] — component; interface — connection point (lollipop)
  [Vue SPA] as spa
  [Service Worker] as sw
  interface "HTTP API" as httpApi
  spa - httpApi
}

package "Renderer" #E8F5E9 {
  ' frame — nested frame inside a package
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "Storage" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' Solid arrow — dependency; dotted (..>) — weak link
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  SVG rendering
  in browser
end note
@enduml`,
  state: `@startuml
' State diagram: lifecycle and conditional transitions
!pragma layout smetana

title State diagram — conditional transitions

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — initial/final pseudostate
[*] --> Idle

' Nested state with entry action and description
state Idle {
  Idle : entry / resetTimer()
  Idle : Waiting for input
}

Idle --> Validating : submit()

' Composite state with internal logic
state Validating {
  state "Check" as check
  ' choice — branch node with guard conditions [valid]/[invalid]
  state c <<choice>>
  [*] --> check
  check --> c
  c --> Passed : [valid]
  c --> Failed : [invalid]
  Passed --> [*]
  Failed --> [*]
}

Validating --> Rendering : success
Validating --> Idle : cancel()

state Rendering {
  Rendering : Render SVG
}

Rendering --> Done : success
Rendering --> Error : failure

state Done {
  Done : entry / showPreview()
}

state Error {
  Error : entry / logError()
}

Done --> Idle : new diagram
Error --> Idle : retry

note right of Validating
  Conditional transition
  via choice node
end note
@enduml`,
  activity: `@startuml
' Activity diagram: workflow, swimlanes, and conditions
!pragma layout smetana

title Activity diagram — styles and conditions

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes — |color|Name| defines responsibility zones
|#E3F2FD|Client|
|#E8F5E9|Editor|
|#FFF3E0|Renderer|

start

|Client|
:Enter PlantUML code;

|Editor|
:Apply layout pragma;
' if/then/else — branching; <<#color>> after ';' — action highlight
if (Syntax valid?) then (yes)
  :Prepare source;
else (no)
  :Show error; <<#Pink>>
  stop
endif

|Renderer|
' fork/fork again/end fork — parallel branches
fork
  :Smetana layout;
fork again
  :Generate SVG;
end fork

|Client|
:Show preview;
:Export PNG/SVG; <<#LightBlue>>

stop
@enduml`,
  c4: `@startuml
' C4 model: system architecture at container level
!pragma layout smetana

' Include C4 library (files in public/plantuml-lib/C4/)
!include ./plantuml-lib/C4/C4_Container.puml

' Configure person outline and element/relationship tags
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — vuePlantUML (containers)

' Person — user; Person_Ext — external actor
Person(user, "User", "Creates and edits diagrams")
Person_Ext(admin, "Administrator", "Manages diagram library")

' System_Boundary — boundary of our system
System_Boundary(app, "vuePlantUML") {
  Container(spa, "SPA", "Vue 3, TypeScript", "Diagram editor and preview")
  Container(api, "Library API", "Node.js, Hono", "REST API for diagram library", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "Stores diagrams and metadata")
  ContainerQueue(sw, "Service Worker", "PWA", "Caching and offline support")
}

' System_Ext — external systems
System_Ext(plantuml, "PlantUML Core", "@plantuml/core in browser")
System_Ext(cdn, "CDN", "Static assets")

' Rel — link; Rel_Back — reverse direction; $tags — relationship style
Rel(user, spa, "Edits", "HTTPS")
Rel(spa, plantuml, "Renders", "in-process")
Rel(spa, api, "Loads library", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "Caches", "events")
Rel(spa, cdn, "Static assets", "HTTPS")

SHOW_LEGEND()
@enduml`,
  gantt: `@startgantt
' Gantt chart: tasks, dependencies, and milestones
project starts 2026-01-06
saturday are closed
sunday are closed

[Requirements analysis] lasts 5 days and is colored in LightGreen
[UI prototype] lasts 4 days and starts at [Requirements analysis]'s end
[Development] lasts 10 days and starts at [UI prototype]'s end
[Testing] lasts 5 days and starts at [Development]'s end
[Release] happens at 2026-02-20 and is colored in Coral
@endgantt`,
  mindmap: `@startmindmap
' Mind map — full PlantUML feature showcase
top to bottom direction

title vuePlantUML — mind map
header Diagram editor
footer Offline · SVG · PNG
caption Fig. 1 — syntax demonstration
legend right
  * — OrgMode
  +/-- — arithmetic
  _ — boxless
endlegend

' Node styles via mindmapDiagram and stereotypes
mindmapDiagram {
  .editor { BackgroundColor #E3F2FD }
  .render { BackgroundColor #E8F5E9 }
  .export { BackgroundColor #FFF3E0 }
  node { MaximumWidth 120 }
}

' Root node: OpenIconic icon + inline color
*[#1565C0] <&code> vuePlantUML

' Right branch (+) — arithmetic notation
+[#2E7D32] Editor <<editor>>
++ Monaco
+++_ Syntax highlighting
+++_ Autocomplete
+++_ Code folding
++:Multiline node
Editor and preview
in one window;
++ Themes

' Left branch (--) — arithmetic notation
--[#E65100] Formats
--- PlantUML
---- @startuml
---- @startgantt
---- @startmindmap
--- Mermaid
---- flowchart
---- sequenceDiagram
---- mindmap
--- GraphML

left side

' Switch to left side (left side keyword)
--[#6A1B9A] Render
--- @plantuml/core
--- Smetana layout
---:Preview
SVG in browser
without a server;

' OrgMode syntax (*) with inline colors
*[#C62828] Export <<export>>
** SVG
** PNG
**_:Library
Save to IndexedDB
and sync;

' Multiline node with Creole markup
**:==Features
**bold** and //italic//
Monospace: ""code""
--separator--
• list
• items
;

' Second root — multiroot mindmap
*[#455A64] PWA
** Service Worker
** Offline mode
** Install on device
@endmindmap`,
};

const SOURCES_BY_LOCALE: Record<AppLocale, Record<SampleDiagramId, string>> = {
  ru: SAMPLE_DIAGRAMS_RU,
  en: SAMPLE_DIAGRAMS_EN,
};

const DEFAULT_SOURCE_BY_LOCALE: Record<AppLocale, string> = {
  ru: DEFAULT_SOURCE_RU,
  en: DEFAULT_SOURCE_EN,
};

const ALL_SAMPLE_SOURCES = new Set([
  ...Object.values(SAMPLE_DIAGRAMS_RU),
  ...Object.values(SAMPLE_DIAGRAMS_EN),
  DEFAULT_SOURCE_RU,
  DEFAULT_SOURCE_EN,
]);

export function getDefaultSource(locale: AppLocale): string {
  return DEFAULT_SOURCE_BY_LOCALE[locale];
}

export function getSampleDiagramSource(
  id: PlantUmlSampleId,
  locale: AppLocale,
): string {
  return SOURCES_BY_LOCALE[locale][id];
}

export function getSampleSource(
  selection: SampleSelection,
  locale: AppLocale,
): string {
  if (selection.format === "mermaid") {
    return getMermaidSampleSource(selection.id, locale);
  }

  return getSampleDiagramSource(selection.id, locale);
}

export function findSampleDiagramId(
  source: string,
  locale: AppLocale,
): PlantUmlSampleId | null {
  const entries = Object.entries(SOURCES_BY_LOCALE[locale]) as Array<
    [SampleDiagramId, string]
  >;
  return entries.find(([, value]) => value === source)?.[0] ?? null;
}

export function findSampleDiagramIdAnyLocale(
  source: string,
): PlantUmlSampleId | null {
  for (const locale of Object.keys(SOURCES_BY_LOCALE) as AppLocale[]) {
    const id = findSampleDiagramId(source, locale);
    if (id) {
      return id;
    }
  }
  return null;
}

export function isDefaultSource(source: string): boolean {
  return source === DEFAULT_SOURCE_RU || source === DEFAULT_SOURCE_EN;
}

export function isSampleDiagramSource(source: string): boolean {
  return ALL_SAMPLE_SOURCES.has(source) || isMermaidSampleSource(source);
}

export function translateSourceForLocale(
  source: string,
  fromLocale: AppLocale,
  toLocale: AppLocale,
): string | null {
  if (fromLocale === toLocale) {
    return source;
  }

  if (isDefaultSource(source)) {
    return getDefaultSource(toLocale);
  }

  const sampleId = findSampleDiagramId(source, fromLocale);
  if (sampleId) {
    return getSampleDiagramSource(sampleId, toLocale);
  }

  const mermaidSampleId = findMermaidSampleId(source, fromLocale);
  if (mermaidSampleId) {
    return getMermaidSampleSource(mermaidSampleId, toLocale);
  }

  return null;
}

export function findAnySampleSelection(
  source: string,
  locale: AppLocale,
): SampleSelection | null {
  const plantUmlId = findSampleDiagramId(source, locale);
  if (plantUmlId) {
    return { format: "plantuml", id: plantUmlId };
  }

  const mermaidId = findMermaidSampleId(source, locale);
  if (mermaidId) {
    return { format: "mermaid", id: mermaidId };
  }

  return null;
}

export function findAnySampleSelectionAnyLocale(
  source: string,
): SampleSelection | null {
  for (const locale of Object.keys(SOURCES_BY_LOCALE) as AppLocale[]) {
    const selection = findAnySampleSelection(source, locale);
    if (selection) {
      return selection;
    }
  }
  return null;
}

export function getDefaultFileNameForSample(
  selection: SampleSelection,
  label: string,
): string {
  if (selection.format === "mermaid") {
    return `${label}.mmd`;
  }
  return `${label}.puml`;
}

/** @deprecated Use getDefaultSource(locale) */
export const DEFAULT_SOURCE = DEFAULT_SOURCE_RU;

/** @deprecated Use getSampleDiagramSource with locale */
export const SAMPLE_DIAGRAMS: Record<string, string> = Object.fromEntries(
  SAMPLE_DIAGRAM_IDS.map((id) => [id, SAMPLE_DIAGRAMS_RU[id]]),
);
