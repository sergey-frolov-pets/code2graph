import type { AppLocale } from "@/constants/i18n";

export const SAMPLE_DIAGRAM_IDS = [
  "classes",
  "sequence",
  "components",
  "state",
  "activity",
  "c4",
] as const;

export type SampleDiagramId = (typeof SAMPLE_DIAGRAM_IDS)[number];

const DEFAULT_SOURCE_RU = `@startuml
!pragma layout smetana

title Пример диаграммы классов

skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

class User {
  +name: string
  +email: string
  +login()
}

interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

User ..|> Authenticatable
User "1" --> "*" Order : создаёт
@enduml`;

const DEFAULT_SOURCE_EN = `@startuml
!pragma layout smetana

title Class diagram example

skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

class User {
  +name: string
  +email: string
  +login()
}

interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

User ..|> Authenticatable
User "1" --> "*" Order : creates
@enduml`;

const SAMPLE_DIAGRAMS_RU: Record<SampleDiagramId, string> = {
  classes: `@startuml
!pragma layout smetana

title Диаграмма классов — полный пример

skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "Домен" {
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

  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

package "Сервисы" <<Rectangle>> #E3F2FD {
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

note top of Animal : Базовый класс\\nвсех животных
note right of Dog : Лояльный\\nкомпаньон

Dog "1" *-- "0..*" Cat : дружит с
Veterinary ..> Animal : проверяет
Dog ..> Diet : следует
@enduml`,
  sequence: `@startuml
!pragma layout smetana

title Диаграмма последовательности — полный пример

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

actor Клиент as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database "БД" as db

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

alt Успех
  app --> client : 200 OK + JWT
else Неверные данные
  app --> client : 401 Unauthorized
end

deactivate app

== Загрузка данных ==

client -> app : GET /dashboard
activate app

opt Кэш пуст
  app -> db : SELECT data
  db --> app : rows
end

loop каждый элемент
  app -> app : transform(item)
end

par Параллельная загрузка
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
  components: `@startuml
!pragma layout smetana

title Диаграмма компонентов — полный пример

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "Клиент" #E3F2FD {
  [Vue SPA] as spa
  [Service Worker] as sw
  interface "HTTP API" as httpApi
  spa - httpApi
}

package "Рендерер" #E8F5E9 {
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
!pragma layout smetana

title Диаграмма состояний — условные переходы

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

[*] --> Idle

state Idle {
  Idle : entry / resetTimer()
  Idle : Система ожидает
}

Idle --> Validating : submit()

state Validating {
  state "Проверка" as check
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
!pragma layout smetana

title Диаграмма активности — стили и условия

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

|#E3F2FD|Клиент|
|#E8F5E9|Редактор|
|#FFF3E0|Рендер|

start

|Клиент|
:Ввести PlantUML код;

|Редактор|
:Применить layout pragma;
if (Синтаксис верный?) then (да)
  :Подготовить источник;
else (нет)
  #Pink:Показать ошибку;
  stop
endif

|Рендер|
fork
  :Smetana layout;
fork again
  :Генерация SVG;
end fork

|Клиент|
:Отобразить превью;
#LightBlue:Экспорт PNG/SVG;

stop
@enduml`,
  c4: `@startuml
!pragma layout smetana

!include ./plantuml-lib/C4/C4_Container.puml

SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — vuePlantUML (контейнеры)

Person(user, "Пользователь", "Создаёт и редактирует диаграммы")
Person_Ext(admin, "Администратор", "Управляет библиотекой")

System_Boundary(app, "vuePlantUML") {
  Container(spa, "SPA", "Vue 3, TypeScript", "Редактор и превью диаграмм")
  Container(api, "Library API", "Node.js, Hono", "REST API библиотеки диаграмм", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "Хранение диаграмм и метаданных")
  ContainerQueue(sw, "Service Worker", "PWA", "Кэширование и offline")
}

System_Ext(plantuml, "PlantUML Core", "@plantuml/core в браузере")
System_Ext(cdn, "CDN", "Статические ресурсы")

Rel(user, spa, "Редактирует", "HTTPS")
Rel(spa, plantuml, "Рендерит", "in-process")
Rel(spa, api, "Загружает библиотеку", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "Кэширует", "events")
Rel(spa, cdn, "Статика", "HTTPS")

SHOW_LEGEND()
@enduml`,
};

const SAMPLE_DIAGRAMS_EN: Record<SampleDiagramId, string> = {
  classes: `@startuml
!pragma layout smetana

title Class diagram — full example

skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "Domain" {
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

  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

package "Services" <<Rectangle>> #E3F2FD {
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

note top of Animal : Base class\\nfor all animals
note right of Dog : Loyal\\ncompanion

Dog "1" *-- "0..*" Cat : friends with
Veterinary ..> Animal : checks
Dog ..> Diet : follows
@enduml`,
  sequence: `@startuml
!pragma layout smetana

title Sequence diagram — full example

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

actor Client as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database DB as db

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

alt Success
  app --> client : 200 OK + JWT
else Invalid credentials
  app --> client : 401 Unauthorized
end

deactivate app

== Data loading ==

client -> app : GET /dashboard
activate app

opt Cache empty
  app -> db : SELECT data
  db --> app : rows
end

loop each item
  app -> app : transform(item)
end

par Parallel fetch
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
  components: `@startuml
!pragma layout smetana

title Component diagram — full example

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "Client" #E3F2FD {
  [Vue SPA] as spa
  [Service Worker] as sw
  interface "HTTP API" as httpApi
  spa - httpApi
}

package "Renderer" #E8F5E9 {
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
!pragma layout smetana

title State diagram — conditional transitions

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

[*] --> Idle

state Idle {
  Idle : entry / resetTimer()
  Idle : Waiting for input
}

Idle --> Validating : submit()

state Validating {
  state "Check" as check
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
!pragma layout smetana

title Activity diagram — styles and conditions

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

|#E3F2FD|Client|
|#E8F5E9|Editor|
|#FFF3E0|Renderer|

start

|Client|
:Enter PlantUML code;

|Editor|
:Apply layout pragma;
if (Syntax valid?) then (yes)
  :Prepare source;
else (no)
  #Pink:Show error;
  stop
endif

|Renderer|
fork
  :Smetana layout;
fork again
  :Generate SVG;
end fork

|Client|
:Show preview;
#LightBlue:Export PNG/SVG;

stop
@enduml`,
  c4: `@startuml
!pragma layout smetana

!include ./plantuml-lib/C4/C4_Container.puml

SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — vuePlantUML (containers)

Person(user, "User", "Creates and edits diagrams")
Person_Ext(admin, "Administrator", "Manages diagram library")

System_Boundary(app, "vuePlantUML") {
  Container(spa, "SPA", "Vue 3, TypeScript", "Diagram editor and preview")
  Container(api, "Library API", "Node.js, Hono", "REST API for diagram library", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "Stores diagrams and metadata")
  ContainerQueue(sw, "Service Worker", "PWA", "Caching and offline support")
}

System_Ext(plantuml, "PlantUML Core", "@plantuml/core in browser")
System_Ext(cdn, "CDN", "Static assets")

Rel(user, spa, "Edits", "HTTPS")
Rel(spa, plantuml, "Renders", "in-process")
Rel(spa, api, "Loads library", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "Caches", "events")
Rel(spa, cdn, "Static assets", "HTTPS")

SHOW_LEGEND()
@enduml`,
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
  id: SampleDiagramId,
  locale: AppLocale,
): string {
  return SOURCES_BY_LOCALE[locale][id];
}

export function findSampleDiagramId(
  source: string,
  locale: AppLocale,
): SampleDiagramId | null {
  const entries = Object.entries(SOURCES_BY_LOCALE[locale]) as Array<
    [SampleDiagramId, string]
  >;
  return entries.find(([, value]) => value === source)?.[0] ?? null;
}

export function findSampleDiagramIdAnyLocale(
  source: string,
): SampleDiagramId | null {
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
  return ALL_SAMPLE_SOURCES.has(source);
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

  return null;
}

/** @deprecated Use getDefaultSource(locale) */
export const DEFAULT_SOURCE = DEFAULT_SOURCE_RU;

/** @deprecated Use getSampleDiagramSource with locale */
export const SAMPLE_DIAGRAMS: Record<string, string> = Object.fromEntries(
  SAMPLE_DIAGRAM_IDS.map((id) => [id, SAMPLE_DIAGRAMS_RU[id]]),
);
