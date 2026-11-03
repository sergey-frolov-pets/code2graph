import type { AppLocale } from "@/constants/i18n";
import type { PlantUmlSampleId } from "@/constants/plantuml-sample-diagrams";

const PLANTUML_RICH_SAMPLE_IDS = [
  "c4_context",
  "er",
  "usecase",
  "deployment",
  "object",
  "timing",
  "wbs",
  "nwdiag",
  "archimate",
] as const satisfies readonly PlantUmlSampleId[];

type PlantUmlRichSampleId = (typeof PLANTUML_RICH_SAMPLE_IDS)[number];

const PLANTUML_RICH_SAMPLES_RU: Record<PlantUmlRichSampleId, string> = {
  c4_context: `@startuml
' C4 Context: люди, система и внешние зависимости
!pragma layout smetana
!include ./plantuml-lib/C4/C4_Context.puml

title Контекст Code2Graph

AddElementTag("external", $bgColor="#999999", $fontColor="#ffffff")
AddRelTag("async", $textColor="#444444", $lineStyle=DashedLine())

Enterprise_Boundary(studio, "Студия") {
  Person(author, "Автор", "Пишет и правит диаграммы")
  Person(reader, "Читатель", "Смотрит превью и экспорт")
}

System(app, "Code2Graph", "Редактор диаграмм в браузере")
System_Ext(mail, "Почта", "Письма о библиотеке", $tags="external")
SystemDb(files, "Файлы", "Локальные диаграммы")
SystemQueue(jobs, "Очередь", "Фоновый экспорт")

Rel(author, app, "Редактирует", "HTTPS")
Rel(reader, app, "Открывает пример", "HTTPS")
Rel(app, mail, "Уведомляет", "SMTP", $tags="async")
Rel_Back(app, files, "Сохраняет", "File API")
Rel_Neighbor(app, jobs, "Ставит задачу", "async", $tags="async")

SHOW_LEGEND()
@enduml`,
  er: `@startuml
' ER: сущности, ключи и разные кратности
!pragma layout smetana

title Заказы магазина

skinparam linetype ortho

entity "Покупатель" as customer {
  * id : uuid <<PK>>
  --
  email : string
  name : string
}

entity "Заказ" as order {
  * id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  status : string
  total : decimal
}

entity "Позиция" as line {
  * id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  sku : string
  qty : int
}

entity "Товар" as product {
  * sku : string <<PK>>
  --
  title : string
  price : decimal
}

customer ||--o{ order : оформляет
order ||--|{ line : содержит
product |o--o{ line : входит
@enduml`,
  usecase: `@startuml
' Варианты использования: актёры, include и extend
left to right direction

actor "Покупатель" as buyer
actor "Админ" as admin

rectangle "Магазин" {
  usecase "Оформить заказ" as order
  usecase "Оплатить" as pay
  usecase "Войти" as login
  usecase "Управлять каталогом" as catalog
  usecase "Вернуть товар" as refund
}

buyer --> order
buyer --> pay
buyer --> refund
order ..> login : include
pay ..> order : extend
refund ..> pay : include
admin --> catalog

note right of login
  Обязательный шаг
  перед заказом
end note
@enduml`,
  deployment: `@startuml
' Развёртывание: узлы, артефакты, база и облако
!pragma layout smetana

title Развёртывание магазина

cloud "CDN" as cdn {
  frame "Кэш" as cache
}

node "Кластер" as cluster {
  node "Веб" as web {
    artifact "SPA" as spa
  }
  database "PostgreSQL" as db {
    storage "Том" as volume
  }
}

cdn --> spa : статика
spa --> db : JDBC
spa --> cache : чтение
volume --> db : диск
@enduml`,
  object: `@startuml
' Объекты: поля экземпляра и связи
!pragma layout smetana

title Снимок заказа

object "Заказ #42" as order {
  status = "new"
  total = 120
}
object "Покупатель" as buyer {
  email = "a@example.com"
  city = "Москва"
}
object item
item : title = "Книга"
item : qty = 2
item : price = 60

buyer --> order : оформил
order *-- item : позиции
@enduml`,
  timing: `@startuml
' Тайминг: concise, robust, binary и clock
title Жизненный цикл запроса

concise "Запрос" as request
robust "База" as db
binary "Кэш" as cache
clock "Такт" as clk with period 50

@0
request is Idle
db is Idle
cache is 0

@100
request is Run
db is Query
cache is 1

@200
request is Done
db is Idle
cache is 0

@300
request is Idle
@enduml`,
  wbs: `@startwbs
' Иерархия работ: цвета и глубина
*[#1565C0] Code2Graph
**[#2E7D32] Редактор
*** Код
*** Превью
*** Темы
**[#E65100] Языки
*** PlantUML
*** Mermaid
*** D2
**[#6A1B9A] Экспорт
*** SVG
*** PNG
*** Библиотека
@endwbs`,
  nwdiag: `@startnwdiag
' Сеть: адреса и связи узлов
network office {
  web [address = "10.0.0.1"]
  api [address = "10.0.0.2"]
  db [address = "10.0.0.3"]
  cache [address = "10.0.0.4"]
}

network public {
  web [address = "203.0.113.10"]
  cdn [address = "203.0.113.20"]
}

web -- api
api -- db
api -- cache
web -- cdn
@endnwdiag`,
  archimate: `@startuml
' ArchiMate: бизнес, приложение и технология
!include <archimate/Archimate>
!pragma layout smetana

title Магазин — слои ArchiMate

Business_Actor(customer, "Покупатель")
Business_Process(checkout, "Оформление")
Business_Service(counter, "Касса")
Application_Component(api, "API")
Application_Service(catalog, "Каталог")
Technology_Node(cluster, "Кластер")
Technology_Service(database, "База")

Rel_Triggering(customer, checkout, "Запускает")
Rel_Flow(checkout, counter, "Оплачивает")
Rel_Serving(catalog, api, "Обслуживает")
Rel_Assignment(cluster, database, "Хранит")
Rel_Access(api, database, "Читает")
@enduml`,
};

const PLANTUML_RICH_SAMPLES_EN: Record<PlantUmlRichSampleId, string> = {
  c4_context: `@startuml
' C4 Context: people, the system, and external dependencies
!pragma layout smetana
!include ./plantuml-lib/C4/C4_Context.puml

title Code2Graph context

AddElementTag("external", $bgColor="#999999", $fontColor="#ffffff")
AddRelTag("async", $textColor="#444444", $lineStyle=DashedLine())

Enterprise_Boundary(studio, "Studio") {
  Person(author, "Author", "Writes and edits diagrams")
  Person(reader, "Reader", "Views preview and export")
}

System(app, "Code2Graph", "Browser diagram editor")
System_Ext(mail, "Mail", "Library notifications", $tags="external")
SystemDb(files, "Files", "Local diagrams")
SystemQueue(jobs, "Queue", "Background export")

Rel(author, app, "Edits", "HTTPS")
Rel(reader, app, "Opens a sample", "HTTPS")
Rel(app, mail, "Notifies", "SMTP", $tags="async")
Rel_Back(app, files, "Saves", "File API")
Rel_Neighbor(app, jobs, "Enqueues", "async", $tags="async")

SHOW_LEGEND()
@enduml`,
  er: `@startuml
' ER: entities, keys, and mixed cardinalities
!pragma layout smetana

title Shop orders

skinparam linetype ortho

entity "Customer" as customer {
  * id : uuid <<PK>>
  --
  email : string
  name : string
}

entity "Order" as order {
  * id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  status : string
  total : decimal
}

entity "Line" as line {
  * id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  sku : string
  qty : int
}

entity "Product" as product {
  * sku : string <<PK>>
  --
  title : string
  price : decimal
}

customer ||--o{ order : places
order ||--|{ line : contains
product |o--o{ line : includes
@enduml`,
  usecase: `@startuml
' Use cases: actors, include, and extend
left to right direction

actor "Buyer" as buyer
actor "Admin" as admin

rectangle "Shop" {
  usecase "Place order" as order
  usecase "Pay" as pay
  usecase "Sign in" as login
  usecase "Manage catalog" as catalog
  usecase "Return item" as refund
}

buyer --> order
buyer --> pay
buyer --> refund
order ..> login : include
pay ..> order : extend
refund ..> pay : include
admin --> catalog

note right of login
  Required step
  before an order
end note
@enduml`,
  deployment: `@startuml
' Deployment: nodes, artifacts, database, and cloud
!pragma layout smetana

title Shop deployment

cloud "CDN" as cdn {
  frame "Cache" as cache
}

node "Cluster" as cluster {
  node "Web" as web {
    artifact "SPA" as spa
  }
  database "PostgreSQL" as db {
    storage "Volume" as volume
  }
}

cdn --> spa : static
spa --> db : JDBC
spa --> cache : read
volume --> db : disk
@enduml`,
  object: `@startuml
' Objects: instance fields and links
!pragma layout smetana

title Order snapshot

object "Order #42" as order {
  status = "new"
  total = 120
}
object "Buyer" as buyer {
  email = "a@example.com"
  city = "Berlin"
}
object item
item : title = "Book"
item : qty = 2
item : price = 60

buyer --> order : placed
order *-- item : lines
@enduml`,
  timing: `@startuml
' Timing: concise, robust, binary, and clock
title Request lifecycle

concise "Request" as request
robust "Database" as db
binary "Cache" as cache
clock "Tick" as clk with period 50

@0
request is Idle
db is Idle
cache is 0

@100
request is Run
db is Query
cache is 1

@200
request is Done
db is Idle
cache is 0

@300
request is Idle
@enduml`,
  wbs: `@startwbs
' Work breakdown: colors and depth
*[#1565C0] Code2Graph
**[#2E7D32] Editor
*** Code
*** Preview
*** Themes
**[#E65100] Languages
*** PlantUML
*** Mermaid
*** D2
**[#6A1B9A] Export
*** SVG
*** PNG
*** Library
@endwbs`,
  nwdiag: `@startnwdiag
' Network: addresses and links
network office {
  web [address = "10.0.0.1"]
  api [address = "10.0.0.2"]
  db [address = "10.0.0.3"]
  cache [address = "10.0.0.4"]
}

network public {
  web [address = "203.0.113.10"]
  cdn [address = "203.0.113.20"]
}

web -- api
api -- db
api -- cache
web -- cdn
@endnwdiag`,
  archimate: `@startuml
' ArchiMate: business, application, and technology
!include <archimate/Archimate>
!pragma layout smetana

title Shop — ArchiMate layers

Business_Actor(customer, "Customer")
Business_Process(checkout, "Checkout")
Business_Service(counter, "Counter")
Application_Component(api, "API")
Application_Service(catalog, "Catalog")
Technology_Node(cluster, "Cluster")
Technology_Service(database, "Database")

Rel_Triggering(customer, checkout, "Starts")
Rel_Flow(checkout, counter, "Pays")
Rel_Serving(catalog, api, "Serves")
Rel_Assignment(cluster, database, "Hosts")
Rel_Access(api, database, "Reads")
@enduml`,
};

const PLANTUML_RICH_SAMPLES: Record<
  AppLocale,
  Record<PlantUmlRichSampleId, string>
> = {
  ru: PLANTUML_RICH_SAMPLES_RU,
  en: PLANTUML_RICH_SAMPLES_EN,
};

export function getPlantUmlRichSample(
  id: PlantUmlSampleId,
  locale: AppLocale,
): string | null {
  if (!(PLANTUML_RICH_SAMPLE_IDS as readonly string[]).includes(id)) {
    return null;
  }

  return PLANTUML_RICH_SAMPLES[locale][id as PlantUmlRichSampleId];
}
