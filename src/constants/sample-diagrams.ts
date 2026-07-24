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

class User {
  +name: string
  +login()
}

class Order {
  +total: number
}

User "1" --> "*" Order : создаёт
@enduml`;

const DEFAULT_SOURCE_EN = `@startuml
!pragma layout smetana

title Class diagram example

class User {
  +name: string
  +login()
}

class Order {
  +total: number
}

User "1" --> "*" Order : creates
@enduml`;

const SAMPLE_DIAGRAMS_RU: Record<SampleDiagramId, string> = {
  classes: `@startuml
!pragma layout smetana

class Animal
class Dog
class Cat

Animal <|-- Dog
Animal <|-- Cat
@enduml`,
  sequence: `@startuml
!pragma layout smetana

actor User
participant App
database DB

User -> App : запрос
App -> DB : SELECT
DB --> App : данные
App --> User : ответ
@enduml`,
  components: `@startuml
!pragma layout smetana

package "Frontend" {
  [Vue App]
}

package "Engine" {
  [@plantuml/core]
}

[Vue App] --> [@plantuml/core] : render
@enduml`,
  state: `@startuml
!pragma layout smetana

[*] --> Idle
Idle --> Rendering : render()
Rendering --> Done : success
Rendering --> Error : failure
Done --> Idle
Error --> Idle
@enduml`,
  activity: `@startuml
!pragma layout smetana

|#E3F2FD|Клиент|
|#E8F5E9|Система|

|Клиент|
start
:Отправить запрос;
|Система|
:Обработать запрос;
:Сформировать ответ;
|Клиент|
:Получить результат;
stop
@enduml`,
  c4: `@startuml
!pragma layout smetana

title C4 — веб-приложение (контейнеры)

skinparam componentStyle rectangle
skinparam wrapWidth 220

actor "Пользователь" as user
actor "Администратор" as admin

rectangle "Клиент" as client {
  rectangle "Web UI" as web_ui {
    [Vue SPA]
    [PWA Shell]
  }
}

rectangle "Сервер" as server {
  rectangle "Backend API" as backend {
    [Auth Service]
    [Diagram Service]
  }
}

database "PostgreSQL" as db

cloud "CDN" as cdn

user --> web_ui : HTTPS
admin --> web_ui : Управление
web_ui --> backend : REST / JSON
backend --> db : SQL / TCP
web_ui ..> cdn : Статика
@enduml`,
};

const SAMPLE_DIAGRAMS_EN: Record<SampleDiagramId, string> = {
  classes: `@startuml
!pragma layout smetana

class Animal
class Dog
class Cat

Animal <|-- Dog
Animal <|-- Cat
@enduml`,
  sequence: `@startuml
!pragma layout smetana

actor User
participant App
database DB

User -> App : request
App -> DB : SELECT
DB --> App : data
App --> User : response
@enduml`,
  components: `@startuml
!pragma layout smetana

package "Frontend" {
  [Vue App]
}

package "Engine" {
  [@plantuml/core]
}

[Vue App] --> [@plantuml/core] : render
@enduml`,
  state: `@startuml
!pragma layout smetana

[*] --> Idle
Idle --> Rendering : render()
Rendering --> Done : success
Rendering --> Error : failure
Done --> Idle
Error --> Idle
@enduml`,
  activity: `@startuml
!pragma layout smetana

|#E3F2FD|Client|
|#E8F5E9|System|

|Client|
start
:Send request;
|System|
:Process request;
:Build response;
|Client|
:Receive result;
stop
@enduml`,
  c4: `@startuml
!pragma layout smetana

title C4 — web application (containers)

skinparam componentStyle rectangle
skinparam wrapWidth 220

actor "User" as user
actor "Administrator" as admin

rectangle "Client" as client {
  rectangle "Web UI" as web_ui {
    [Vue SPA]
    [PWA Shell]
  }
}

rectangle "Server" as server {
  rectangle "Backend API" as backend {
    [Auth Service]
    [Diagram Service]
  }
}

database "PostgreSQL" as db

cloud "CDN" as cdn

user --> web_ui : HTTPS
admin --> web_ui : Management
web_ui --> backend : REST / JSON
backend --> db : SQL / TCP
web_ui ..> cdn : Static assets
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
