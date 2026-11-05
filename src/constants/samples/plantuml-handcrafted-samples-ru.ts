import type { HandcraftedPlantUmlSampleId } from "@/constants/plantuml-sample-diagrams";

export const DEFAULT_SOURCE_RU = `@startuml
' Движок раскладки Smetana (по умолчанию в Code2Graph)
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

export const DEFAULT_SOURCE_EN = `@startuml
' Smetana layout engine (default in Code2Graph)
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

export const SAMPLE_DIAGRAMS_RU: Record<HandcraftedPlantUmlSampleId, string> = {
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

title C4 — Code2Graph (контейнеры)

' Person — пользователь; Person_Ext — внешний актор
Person(user, "Пользователь", "Создаёт и редактирует диаграммы")
Person_Ext(admin, "Администратор", "Управляет библиотекой")

' System_Boundary — граница нашей системы
System_Boundary(app, "Code2Graph") {
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
' Диаграмма Ганта: календарь, задачи, зависимости, цвет, вехи и ресурсы
' project starts YYYY-MM-DD — дата старта проекта; первая задача без своей даты начинается отсюда
' language ru|en|de|ja|zh|ko — язык подписей календаря
' saturday are closed / sunday are closed — выходные не входят в рабочие дни
' YYYY-MM-DD is closed — закрыть один день; YYYY-MM-DD to YYYY-MM-DD are closed — закрыть диапазон
' YYYY-MM-DD is open — снова открыть закрытый день
' printscale|ganttscale|projectscale daily|weekly|monthly|quarterly|yearly — масштаб оси
' zoom 1.5 — крупность шкалы; today is colored in Coral — выделить сегодняшний день
' [Имя] lasts N days|weeks|months — длительность по календарю
' [Имя] requires N days — трудозатраты: закрытые дни не укорачивают неделю
' [Имя] starts YYYY-MM-DD / ends YYYY-MM-DD — абсолютные даты начала и конца
' [Имя] starts D+N — старт через N дней после начала проекта
' [Имя] starts at [Другая]'s end|start — зависимость от конца или начала
' [Имя] starts N days after|before [Другая]'s end — зависимость со сдвигом
' [Имя] ends at [Другая]'s end|start — привязать окончание к другой задаче
' then [Имя] lasts N days — следующая задача сразу после предыдущей
' [A] -> [B] — стрелка зависимости; -[dotted]-> и -[#RRGGBB]-> — стиль связи
' [Полное имя] as [Код] — псевдоним для ссылок
' and is colored in Color или StartColor/EndColor — заливка задачи
' is N% completed|complete — процент выполнения; is deleted — снятая задача
' [Веха] happens YYYY-MM-DD — веха на дату; happens at [Задача]'s end — веха в конце задачи
' displays on same row as [Имя] — нарисовать на той же строке
' pauses N days / pauses on YYYY-MM-DD — пауза внутри задачи
' on {Ресурс} и on {Ресурс:50%} — назначить ресурс и долю загрузки
' hide resources names / hide resources footbox / hide footbox — скрыть подписи ресурсов и нижнюю шкалу
' -- Фаза -- — горизонтальный разделитель групп задач
' Separator just at [Имя]'s end — вертикальный разделитель на дате задачи
' note bottom ... end note — пояснение под задачей
' Label on first column and left aligned — подписи в первой колонке (также last column, right aligned)
' [[https://example.com]] рядом с именем — ссылка на задаче

' Старт проекта и закрытые выходные
project starts 2026-01-06
saturday are closed
sunday are closed

' Задача на 5 дней с цветом полосы
[Анализ требований] lasts 5 days and is colored in LightGreen
' Старт в конце предыдущей задачи
[Прототип UI] lasts 4 days and starts at [Анализ требований]'s end
[Разработка] lasts 10 days and starts at [Прототип UI]'s end
[Тестирование] lasts 5 days and starts at [Разработка]'s end
' Веха на фиксированную дату и со своим цветом
[Релиз] happens at 2026-02-20 and is colored in Coral
@endgantt`,
  mindmap: `@startmindmap
' Mind map — полный пример возможностей PlantUML (офлайн-движок)
top to bottom direction

title Code2Graph — mind map
header Редактор диаграмм
footer Офлайн · SVG · PNG
caption Рис. 1 — демонстрация синтаксиса
legend right
  * — OrgMode
  +/-- — арифметика
  _ — без рамки
endlegend

' Корневой узел с inline-цветом
*[#1565C0] Code2Graph

' Ветка справа (+) — арифметическая нотация
+[#2E7D32] Редактор
++ Monaco
+++_ Подсветка синтаксиса
+++_ Автодополнение
+++_ Складки кода
**:Многострочный узел
Редактор и превью
в одном окне;
++ Темы оформления

' Ветка слева (--) — арифметическая нотация
--[#E65100] Форматы
--- PlantUML
---- startuml
---- startgantt
---- startmindmap
--- Mermaid
---- flowchart
---- sequenceDiagram
---- mindmap
--- GraphML

left side

' Переключение на левую сторону (left side)
--[#6A1B9A] Рендер
--- plantuml/core
--- Smetana layout
**:Превью
SVG в браузере
без сервера;

' OrgMode-синтаксис (*) с inline-цветами
*[#C62828] Экспорт
** SVG
** PNG
**_:Библиотека
Сохранение в IndexedDB
и синхронизация;

' Многострочный узел с Creole-разметкой
**:==Возможности
**жирный** и //курсив//
Моноширинный: ""code""
разделитель
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
