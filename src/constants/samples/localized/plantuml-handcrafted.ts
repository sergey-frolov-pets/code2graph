import type { AppLocale } from "@/constants/i18n";
import type { HandcraftedPlantUmlSampleId } from "@/constants/plantuml-sample-diagrams";

export const PLANTUML_DEFAULT_SOURCE_EXTRA: Record<Exclude<AppLocale, "ru" | "en">, string> = {
  es: `@startuml
' Motor de layout Smetana (predeterminado en Code2Graph)
!pragma layout smetana

title Ejemplo de diagrama de clases

' Estilizar elementos según el estereotipo <<interface>>
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

' Clase con campos públicos (+) y métodos
class User {
  +name: string
  +email: string
  +login()
}

' Interfaz — contrato sin implementación
interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

' Realización de interfaz (..|>) y asociación con multiplicidad
User ..|> Authenticatable
User "1" --> "*" Order : crea
@enduml`,
  zh: `@startuml
' Smetana 布局引擎（Code2Graph 中的默认引擎）
!pragma layout smetana

title 类图示例

' 按 <<interface>> 构造型设置元素样式
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

' 带有公共字段 (+) 和方法的类
class User {
  +name: string
  +email: string
  +login()
}

' 接口 — 没有实现的契约
interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

' 接口实现 (..|>) 以及带多重性的关联
User ..|> Authenticatable
User "1" --> "*" Order : 创建
@enduml`,
  ja: `@startuml
' Smetana レイアウトエンジン（Code2Graph の既定）
!pragma layout smetana

title クラス図の例

' <<interface>> ステレオタイプで要素のスタイルを設定
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

' 公開フィールド (+) とメソッドを持つクラス
class User {
  +name: string
  +email: string
  +login()
}

' インターフェイス — 実装のない契約
interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

' インターフェイス実現 (..|>) と多重度付き関連
User ..|> Authenticatable
User "1" --> "*" Order : 作成する
@enduml`,
  hi: `@startuml
' Smetana लेआउट इंजन (Code2Graph में डिफ़ॉल्ट)
!pragma layout smetana

title वर्ग आरेख का उदाहरण

' <<interface>> स्टीरियोटाइप के अनुसार तत्वों की शैली
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

' सार्वजनिक फ़ील्ड (+) और मेथड वाला वर्ग
class User {
  +name: string
  +email: string
  +login()
}

' इंटरफ़ेस — बिना क्रियान्वयन का अनुबंध
interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

' इंटरफ़ेस प्राप्ति (..|>) और बहुलता वाली साहचर्य
User ..|> Authenticatable
User "1" --> "*" Order : बनाता है
@enduml`,
  pt: `@startuml
' Motor de layout Smetana (padrão no Code2Graph)
!pragma layout smetana

title Exemplo de diagrama de classes

' Estilizar elementos pelo estereótipo <<interface>>
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

' Classe com campos públicos (+) e métodos
class User {
  +name: string
  +email: string
  +login()
}

' Interface — contrato sem implementação
interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

' Realização de interface (..|>) e associação com multiplicidade
User ..|> Authenticatable
User "1" --> "*" Order : cria
@enduml`,
  de: `@startuml
' Smetana-Layout-Engine (Standard in Code2Graph)
!pragma layout smetana

title Beispiel eines Klassendiagramms

' Elemente nach dem Stereotyp <<interface>> gestalten
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

' Klasse mit öffentlichen Feldern (+) und Methoden
class User {
  +name: string
  +email: string
  +login()
}

' Schnittstelle — Vertrag ohne Implementierung
interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

' Schnittstellenrealisierung (..|>) und Assoziation mit Multiplizität
User ..|> Authenticatable
User "1" --> "*" Order : erstellt
@enduml`,
  ar: `@startuml
' محرك التخطيط Smetana (الافتراضي في Code2Graph)
!pragma layout smetana

title مثال على مخطط أصناف

' تنسيق العناصر حسب الصورة النمطية <<interface>>
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
}

' صنف بحقول عامة (+) وطرق
class User {
  +name: string
  +email: string
  +login()
}

' واجهة — عقد بلا تنفيذ
interface Authenticatable {
  +authenticate(): boolean
}

class Order {
  +total: number
  +items: List<Item>
}

' تحقيق الواجهة (..|>) وارتباط مع التعدد
User ..|> Authenticatable
User "1" --> "*" Order : ينشئ
@enduml`,
};

export const PLANTUML_HANDCRAFTED_EXTRA: Record<Exclude<AppLocale, "ru" | "en">, Record<HandcraftedPlantUmlSampleId, string>> = {
  es: {
    classes: `@startuml
' Ejemplo completo de diagrama de clases: paquetes, herencia y estereotipos
!pragma layout smetana

title Diagrama de clases — ejemplo completo

' Colores de fondo y borde para los estereotipos <<interface>> y <<enum>>
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "Dominio" {
  ' Clase abstracta — no se puede instanciar directamente
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

  ' extends — herencia; implements — realización de interfaz
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' Paquete con estereotipo <<Rectangle>> y color de fondo
package "Servicios" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — patrón singleton; (S,#FF7700) — icono
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' Las notas se adjuntan a los elementos: top / right / left / bottom
note top of Animal : Clase base\\nde todos los animales
note right of Dog : Compañero\\nleal

' Composición (*--), dependencia (..>), asociación (-->)
Dog "1" *-- "0..*" Cat : es amigo de
Veterinary ..> Animal : comprueba
Dog ..> Diet : sigue
@enduml`,
    sequence: `@startuml
' Diagrama de secuencia: interacciones a lo largo del tiempo
!pragma layout smetana

title Diagrama de secuencia — ejemplo completo

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' Participantes: actor, participant, database; alias — nombre corto
actor Cliente as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database BD as db

' == Separador de fases (agrupa mensajes) ==
== Autenticación ==

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

' alt — rama condicional (if/else)
alt Éxito
  app --> client : 200 OK + JWT
else Credenciales no válidas
  app --> client : 401 Unauthorized
end

deactivate app

== Carga de datos ==

client -> app : GET /dashboard
activate app

' opt — fragmento opcional (se ejecuta cuando se cumple la condición)
opt Caché vacía
  app -> db : SELECT data
  db --> app : rows
end

' loop — repetir para cada elemento
loop cada elemento
  app -> app : transform(item)
end

' par — flujos de mensajes en paralelo
par Obtención en paralelo
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
    components: `@startuml
' Diagrama de componentes: módulos, interfaces y dependencias
!pragma layout smetana

title Diagrama de componentes — ejemplo completo

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "Cliente" #E3F2FD {
  ' [Nombre] — componente. <<interface>> es un contrato; la etiqueta permanece dentro del paquete
  [Vue SPA] as spa
  [Service Worker] as sw
  component "HTTP API" <<interface>> as httpApi
}

package "Renderizador" #E8F5E9 {
  ' frame — marco anidado dentro de un paquete
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "Almacenamiento" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' Flecha continua — dependencia; punteada (..>) — vínculo débil
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  Renderizado SVG
  en el navegador
end note
@enduml`,
    state: `@startuml
' Diagrama de estados: ciclo de vida y transiciones condicionales
!pragma layout smetana

title Diagrama de estados — transiciones condicionales

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — pseudoestado inicial/final
[*] --> Idle

' Estado anidado con acción entry y descripción
state Idle {
  Idle : entry / resetTimer()
  Idle : En espera de entrada
}

Idle --> Validating : submit()

' Estado compuesto con lógica interna
state Validating {
  state "Comprobación" as check
  ' choice — nodo de ramificación con condiciones de guarda [valid]/[invalid]
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
  Rendering : Renderizar SVG
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
  Transición condicional
  mediante nodo choice
end note
@enduml`,
    activity: `@startuml
' Diagrama de actividad: flujo de trabajo, swimlanes y condiciones
!pragma layout smetana

title Diagrama de actividad — estilos y condiciones

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes — |color|Nombre| define zonas de responsabilidad
|#E3F2FD|Cliente|
|#E8F5E9|Editor|
|#FFF3E0|Renderizador|

start

|Cliente|
:Introducir código PlantUML;

|Editor|
:Aplicar layout pragma;
' if/then/else — ramificación; <<#color>> después de ';' — resalte de la acción
if (¿Sintaxis válida?) then (sí)
  :Preparar la fuente;
else (no)
  :Mostrar error; <<#Pink>>
  stop
endif

|Renderizador|
' fork/fork again/end fork — ramas paralelas
fork
  :Smetana layout;
fork again
  :Generar SVG;
end fork

|Cliente|
:Mostrar vista previa;
:Exportar PNG/SVG; <<#LightBlue>>

stop
@enduml`,
    c4: `@startuml
' Modelo C4: arquitectura del sistema a nivel de contenedores
!pragma layout smetana

' Incluir la biblioteca C4 (archivos en public/plantuml-lib/C4/)
!include ./plantuml-lib/C4/C4_Container.puml

' Configurar el contorno de las personas y las etiquetas de elementos y relaciones
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — Code2Graph (contenedores)

' Person — usuario; Person_Ext — actor externo
Person(user, "Usuario", "Crea y edita diagramas")
Person_Ext(admin, "Administrador", "Gestiona la biblioteca de diagramas")

' System_Boundary — límite de nuestro sistema
System_Boundary(app, "Code2Graph") {
  Container(spa, "SPA", "Vue 3, TypeScript", "Editor de diagramas y vista previa")
  Container(api, "Library API", "Node.js, Hono", "API REST de la biblioteca de diagramas", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "Almacena diagramas y metadatos")
  ContainerQueue(sw, "Service Worker", "PWA", "Caché y soporte offline")
}

' System_Ext — sistemas externos
System_Ext(plantuml, "PlantUML Core", "@plantuml/core en el navegador")
System_Ext(cdn, "CDN", "Recursos estáticos")

' Rel — enlace; Rel_Back — dirección inversa; $tags — estilo de la relación
Rel(user, spa, "Edita", "HTTPS")
Rel(spa, plantuml, "Renderiza", "in-process")
Rel(spa, api, "Carga la biblioteca", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "Almacena en caché", "events")
Rel(spa, cdn, "Recursos estáticos", "HTTPS")

SHOW_LEGEND()
@enduml`,
    gantt: `@startgantt
' Diagrama de Gantt: calendario, tareas, dependencias, colores, hitos y recursos
' project starts YYYY-MM-DD — inicio del proyecto; la primera tarea sin fecha propia empieza aquí
' language ru|en|de|ja|zh|ko — idioma de las etiquetas del calendario
' saturday are closed / sunday are closed — los fines de semana son días no laborables
' YYYY-MM-DD is closed — cerrar un día; YYYY-MM-DD to YYYY-MM-DD are closed — cerrar un intervalo
' YYYY-MM-DD is open — reabrir un día cerrado
' printscale|ganttscale|projectscale daily|weekly|monthly|quarterly|yearly — escala del eje de tiempo
' zoom 1.5 — zoom de visualización; today is colored in Coral — resaltar el día de hoy
' [Nombre] lasts N days|weeks|months — duración de calendario
' [Nombre] requires N days — carga de trabajo: los días cerrados no acortan una semana
' [Nombre] starts YYYY-MM-DD / ends YYYY-MM-DD — fechas absolutas de inicio y fin
' [Nombre] starts D+N — empezar N días después del inicio del proyecto
' [Nombre] starts at [Otra]'s end|start — depender del fin o del inicio de otra tarea
' [Nombre] starts N days after|before [Otra]'s end — dependencia con un retraso
' [Nombre] ends at [Otra]'s end|start — atar el fin de esta tarea a otra tarea
' then [Nombre] lasts N days — la tarea siguiente sigue a la anterior de inmediato
' [A] -> [B] — flecha de dependencia; -[dotted]-> y -[#RRGGBB]-> — estilo del enlace
' [Nombre completo] as [Código] — alias corto usado en las referencias
' and is colored in Color o StartColor/EndColor — color de la barra de la tarea
' is N% completed|complete — porcentaje de avance; is deleted — tarea descartada
' [Hito] happens YYYY-MM-DD — hito en una fecha; happens at [Tarea]'s end — hito al final de una tarea
' displays on same row as [Nombre] — dibujar en la misma fila
' pauses N days / pauses on YYYY-MM-DD — pausa dentro de una tarea
' on {Recurso} y on {Recurso:50%} — asignar un recurso y su carga
' hide resources names / hide resources footbox / hide footbox — ocultar las etiquetas de recursos y la escala inferior
' -- Fase -- — separador horizontal entre grupos de tareas
' Separator just at [Nombre]'s end — separador vertical en la fecha de una tarea
' note bottom ... end note — nota debajo de una tarea
' Label on first column and left aligned — etiquetas en la primera columna (también last column, right aligned)
' [[https://example.com]] junto a un nombre — hipervínculo en una tarea

' Inicio del proyecto y fines de semana cerrados
project starts 2026-01-06
saturday are closed
sunday are closed

' Tarea de cinco días con color de barra
[Análisis de requisitos] lasts 5 days and is colored in LightGreen
' Empieza cuando termina la tarea anterior
[Prototipo de UI] lasts 4 days and starts at [Análisis de requisitos]'s end
[Desarrollo] lasts 10 days and starts at [Prototipo de UI]'s end
[Pruebas] lasts 5 days and starts at [Desarrollo]'s end
' Hito en una fecha fija, con su propio color
[Lanzamiento] happens at 2026-02-20 and is colored in Coral
@endgantt`,
    mindmap: `@startmindmap
' Mind map — muestra completa de funciones de PlantUML (motor sin conexión)
top to bottom direction

title Code2Graph — mind map
header Editor de diagramas
footer Sin conexión · SVG · PNG
caption Fig. 1 — demostración de sintaxis
legend right
  * — OrgMode
  +/-- — aritmética
  _ — sin marco
endlegend

' Nodo raíz con color inline
*[#1565C0] Code2Graph

' Rama derecha (+) — notación aritmética
+[#2E7D32] Editor
++ Monaco
+++_ Resaltado de sintaxis
+++_ Autocompletado
+++_ Plegado de código
**:Nodo multilínea
Editor y vista previa
en una ventana;
++ Temas

' Rama izquierda (--) — notación aritmética
--[#E65100] Formatos
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

' Cambio al lado izquierdo (palabra clave left side)
--[#6A1B9A] Renderizado
--- plantuml/core
--- Smetana layout
**:Vista previa
SVG en el navegador
sin un servidor;

' Sintaxis OrgMode (*) con colores inline
*[#C62828] Exportación
** SVG
** PNG
**_:Biblioteca
Guardar en IndexedDB
y sincronizar;

' Nodo multilínea con marcado Creole
**:==Funciones
**negrita** y //cursiva//
Monoespaciado: ""code""
separador
• lista
• elementos
;

' Segunda raíz — multiroot mindmap
*[#455A64] PWA
** Service Worker
** Modo sin conexión
** Instalar en el dispositivo
@endmindmap`,
  },
  zh: {
    classes: `@startuml
' 完整的类图示例：包、继承和构造型
!pragma layout smetana

title 类图 — 完整示例

' <<interface>> 和 <<enum>> 构造型的背景色与边框色
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "领域" {
  ' 抽象类 — 不能直接实例化
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

  ' extends — 继承；implements — 接口实现
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' 带 <<Rectangle>> 构造型和背景色的包
package "服务" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — 单例模式；(S,#FF7700) — 图标
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' 注释附着于元素: top / right / left / bottom
note top of Animal : 所有动物的\\n基类
note right of Dog : 忠实的\\n伙伴

' 组合 (*--)、依赖 (..>)、关联 (-->)
Dog "1" *-- "0..*" Cat : 与之为友
Veterinary ..> Animal : 检查
Dog ..> Diet : 遵循
@enduml`,
    sequence: `@startuml
' 时序图：随时间的交互
!pragma layout smetana

title 时序图 — 完整示例

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' 参与者: actor、participant、database；alias — 短名称
actor 客户端 as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database 数据库 as db

' == 阶段分隔符（对消息分组）==
== 身份验证 ==

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

' alt — 条件分支（if/else）
alt 成功
  app --> client : 200 OK + JWT
else 凭据无效
  app --> client : 401 Unauthorized
end

deactivate app

== 数据加载 ==

client -> app : GET /dashboard
activate app

' opt — 可选片段（条件成立时执行）
opt 缓存为空
  app -> db : SELECT data
  db --> app : rows
end

' loop — 对每个元素重复
loop 每一项
  app -> app : transform(item)
end

' par — 并行消息流
par 并行获取
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
    components: `@startuml
' 组件图：模块、接口与依赖
!pragma layout smetana

title 组件图 — 完整示例

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "客户端" #E3F2FD {
  ' [名称] — 组件。<<interface>> 是契约；标签留在包内
  [Vue SPA] as spa
  [Service Worker] as sw
  component "HTTP API" <<interface>> as httpApi
}

package "渲染器" #E8F5E9 {
  ' frame — 包内的嵌套框架
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "存储" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' 实线箭头 — 依赖；虚线 (..>) — 弱链接
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  SVG 渲染
  在浏览器中
end note
@enduml`,
    state: `@startuml
' 状态图：生命周期与条件转移
!pragma layout smetana

title 状态图 — 条件转移

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — 初始/终止伪状态
[*] --> Idle

' 带 entry 动作和描述的嵌套状态
state Idle {
  Idle : entry / resetTimer()
  Idle : 等待输入
}

Idle --> Validating : submit()

' 带内部逻辑的复合状态
state Validating {
  state "检查" as check
  ' choice — 带守卫条件 [valid]/[invalid] 的分支节点
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
  Rendering : 渲染 SVG
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
  条件转移
  经由 choice 节点
end note
@enduml`,
    activity: `@startuml
' 活动图：工作流、swimlanes 和条件
!pragma layout smetana

title 活动图 — 样式与条件

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes — |颜色|名称| 定义职责区域
|#E3F2FD|客户端|
|#E8F5E9|编辑器|
|#FFF3E0|渲染器|

start

|客户端|
:输入 PlantUML 代码;

|编辑器|
:应用 layout pragma;
' if/then/else — 分支；<<#颜色>> 在 ';' 之后 — 动作高亮
if (语法有效?) then (是)
  :准备源码;
else (否)
  :显示错误; <<#Pink>>
  stop
endif

|渲染器|
' fork/fork again/end fork — 并行分支
fork
  :Smetana layout;
fork again
  :生成 SVG;
end fork

|客户端|
:显示预览;
:导出 PNG/SVG; <<#LightBlue>>

stop
@enduml`,
    c4: `@startuml
' C4 模型：容器级系统架构
!pragma layout smetana

' 引入 C4 库（文件位于 public/plantuml-lib/C4/）
!include ./plantuml-lib/C4/C4_Container.puml

' 配置人员轮廓以及元素与关系的标签
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — Code2Graph（容器）

' Person — 用户；Person_Ext — 外部参与者
Person(user, "用户", "创建并编辑图表")
Person_Ext(admin, "管理员", "管理图库")

' System_Boundary — 本系统的边界
System_Boundary(app, "Code2Graph") {
  Container(spa, "SPA", "Vue 3, TypeScript", "图表编辑器与预览")
  Container(api, "Library API", "Node.js, Hono", "图库的 REST API", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "存储图表和元数据")
  ContainerQueue(sw, "Service Worker", "PWA", "缓存与 offline 支持")
}

' System_Ext — 外部系统
System_Ext(plantuml, "PlantUML Core", "浏览器中的 @plantuml/core")
System_Ext(cdn, "CDN", "静态资源")

' Rel — 链接；Rel_Back — 反向；$tags — 关系样式
Rel(user, spa, "编辑", "HTTPS")
Rel(spa, plantuml, "渲染", "in-process")
Rel(spa, api, "加载图库", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "缓存", "events")
Rel(spa, cdn, "静态资源", "HTTPS")

SHOW_LEGEND()
@enduml`,
    gantt: `@startgantt
' 甘特图：日历、任务、依赖、颜色、里程碑和资源
' project starts YYYY-MM-DD — 项目开始；没有自身日期的第一条任务从这里开始
' language ru|en|de|ja|zh|ko — 日历标签的语言
' saturday are closed / sunday are closed — 周末是非工作日
' YYYY-MM-DD is closed — 关闭一天; YYYY-MM-DD to YYYY-MM-DD are closed — 关闭一段范围
' YYYY-MM-DD is open — 重新打开已关闭的一天
' printscale|ganttscale|projectscale daily|weekly|monthly|quarterly|yearly — 时间轴比例
' zoom 1.5 — 显示缩放; today is colored in Coral — 高亮今天
' [名称] lasts N days|weeks|months — 日历时长
' [名称] requires N days — 工作量：关闭的日子不会缩短一周
' [名称] starts YYYY-MM-DD / ends YYYY-MM-DD — 绝对的开始日期和结束日期
' [名称] starts D+N — 在项目开始后 N 天启动
' [名称] starts at [其他]'s end|start — 依赖另一任务的结束或开始
' [名称] starts N days after|before [其他]'s end — 带延迟的依赖
' [名称] ends at [其他]'s end|start — 将本任务的结束绑到另一任务
' then [名称] lasts N days — 下一任务紧接上一任务
' [A] -> [B] — 依赖箭头; -[dotted]-> 和 -[#RRGGBB]-> — 连线样式
' [全名] as [代码] — 引用中使用的短别名
' and is colored in Color 或 StartColor/EndColor — 任务条的颜色
' is N% completed|complete — 完成百分比; is deleted — 已放弃的任务
' [里程碑] happens YYYY-MM-DD — 日期上的里程碑; happens at [任务]'s end — 任务结束处的里程碑
' displays on same row as [名称] — 画在同一行
' pauses N days / pauses on YYYY-MM-DD — 任务内部的暂停
' on {资源} 和 on {资源:50%} — 分配资源及其负荷
' hide resources names / hide resources footbox / hide footbox — 隐藏资源标签和底部刻度
' -- 阶段 -- — 任务组之间的水平分隔
' Separator just at [名称]'s end — 任务日期上的垂直分隔
' note bottom ... end note — 任务下方的注释
' Label on first column and left aligned — 第一列中的标签（以及 last column, right aligned）
' [[https://example.com]] 紧挨名称 — 任务上的超链接

' 项目开始与关闭的周末
project starts 2026-01-06
saturday are closed
sunday are closed

' 带条形颜色的五天任务
[需求分析] lasts 5 days and is colored in LightGreen
' 上一任务结束时开始
[界面原型] lasts 4 days and starts at [需求分析]'s end
[开发] lasts 10 days and starts at [界面原型]'s end
[测试] lasts 5 days and starts at [开发]'s end
' 固定日期上的里程碑，带有自己的颜色
[发布] happens at 2026-02-20 and is colored in Coral
@endgantt`,
    mindmap: `@startmindmap
' Mind map — PlantUML 功能的完整展示（离线引擎）
top to bottom direction

title Code2Graph — mind map
header 图表编辑器
footer 离线 · SVG · PNG
caption 图 1 — 语法演示
legend right
  * — OrgMode
  +/-- — 算术
  _ — 无边框
endlegend

' 带 inline 颜色的根节点
*[#1565C0] Code2Graph

' 右侧分支 (+) — 算术记法
+[#2E7D32] 编辑器
++ Monaco
+++_ 语法高亮
+++_ 自动补全
+++_ 代码折叠
**:多行节点
编辑器与预览
在同一窗口;
++ 主题

' 左侧分支 (--) — 算术记法
--[#E65100] 格式
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

' 切换到左侧（left side 关键字）
--[#6A1B9A] 渲染
--- plantuml/core
--- Smetana layout
**:预览
浏览器中的 SVG
无需服务器;

' 带 inline 颜色的 OrgMode 语法 (*)
*[#C62828] 导出
** SVG
** PNG
**_:图库
保存到 IndexedDB
并同步;

' 带 Creole 标记的多行节点
**:==功能
**粗体** 和 //斜体//
等宽: ""code""
分隔线
• 列表
• 条目
;

' 第二个根 — multiroot mindmap
*[#455A64] PWA
** Service Worker
** 离线模式
** 安装到设备
@endmindmap`,
  },
  ja: {
    classes: `@startuml
' クラス図の完全な例: パッケージ、継承、ステレオタイプ
!pragma layout smetana

title クラス図 — 完全な例

' <<interface>> と <<enum>> ステレオタイプの背景色と枠線色
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "ドメイン" {
  ' 抽象クラス — 直接インスタンス化できない
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

  ' extends — 継承; implements — インターフェイス実現
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' <<Rectangle>> ステレオタイプと背景色を持つパッケージ
package "サービス" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — シングルトンパターン; (S,#FF7700) — アイコン
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' ノートは要素に付く: top / right / left / bottom
note top of Animal : すべての動物の\\n基底クラス
note right of Dog : 忠実な\\n相棒

' コンポジション (*--)、依存 (..>)、関連 (-->)
Dog "1" *-- "0..*" Cat : 友達
Veterinary ..> Animal : 検査する
Dog ..> Diet : 従う
@enduml`,
    sequence: `@startuml
' シーケンス図: 時間の経過に沿った相互作用
!pragma layout smetana

title シーケンス図 — 完全な例

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' 参加者: actor、participant、database; alias — 短い名前
actor クライアント as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database データベース as db

' == フェーズ区切り（メッセージをまとめる）==
== 認証 ==

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

' alt — 条件分岐 (if/else)
alt 成功
  app --> client : 200 OK + JWT
else 資格情報が無効
  app --> client : 401 Unauthorized
end

deactivate app

== データ読み込み ==

client -> app : GET /dashboard
activate app

' opt — 任意フラグメント（条件が成り立つときに実行）
opt キャッシュが空
  app -> db : SELECT data
  db --> app : rows
end

' loop — 各要素について繰り返す
loop 各項目
  app -> app : transform(item)
end

' par — 並列のメッセージフロー
par 並列取得
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
    components: `@startuml
' コンポーネント図: モジュール、インターフェイス、依存関係
!pragma layout smetana

title コンポーネント図 — 完全な例

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "クライアント" #E3F2FD {
  ' [名前] — コンポーネント。<<interface>> は契約。ラベルはパッケージ内に残る
  [Vue SPA] as spa
  [Service Worker] as sw
  component "HTTP API" <<interface>> as httpApi
}

package "レンダラ" #E8F5E9 {
  ' frame — パッケージ内の入れ子フレーム
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "ストレージ" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' 実線の矢印 — 依存; 点線 (..>) — 弱いリンク
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  SVG 描画
  ブラウザ内
end note
@enduml`,
    state: `@startuml
' 状態図: ライフサイクルと条件付き遷移
!pragma layout smetana

title 状態図 — 条件付き遷移

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — 開始/終了の擬似状態
[*] --> Idle

' entry アクションと説明を持つ入れ子状態
state Idle {
  Idle : entry / resetTimer()
  Idle : 入力待ち
}

Idle --> Validating : submit()

' 内部ロジックを持つ複合状態
state Validating {
  state "検査" as check
  ' choice — ガード条件 [valid]/[invalid] を持つ分岐ノード
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
  Rendering : SVG を描画
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
  条件付き遷移
  choice ノード経由
end note
@enduml`,
    activity: `@startuml
' アクティビティ図: ワークフロー、swimlanes、条件
!pragma layout smetana

title アクティビティ図 — スタイルと条件

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes — |色|名前| が責任範囲を定義する
|#E3F2FD|クライアント|
|#E8F5E9|エディタ|
|#FFF3E0|レンダラ|

start

|クライアント|
:PlantUML コードを入力;

|エディタ|
:layout pragma を適用;
' if/then/else — 分岐; ';' の後の <<#色>> — アクションの強調
if (構文は有効?) then (はい)
  :ソースを準備;
else (いいえ)
  :エラーを表示; <<#Pink>>
  stop
endif

|レンダラ|
' fork/fork again/end fork — 並列分岐
fork
  :Smetana layout;
fork again
  :SVG を生成;
end fork

|クライアント|
:プレビューを表示;
:PNG/SVG を書き出す; <<#LightBlue>>

stop
@enduml`,
    c4: `@startuml
' C4 モデル: コンテナレベルのシステムアーキテクチャ
!pragma layout smetana

' C4 ライブラリを取り込む（ファイルは public/plantuml-lib/C4/）
!include ./plantuml-lib/C4/C4_Container.puml

' 人物の輪郭と、要素および関係のタグを設定する
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — Code2Graph（コンテナ）

' Person — ユーザー; Person_Ext — 外部アクター
Person(user, "ユーザー", "図を作成し、編集する")
Person_Ext(admin, "管理者", "図のライブラリを管理する")

' System_Boundary — このシステムの境界
System_Boundary(app, "Code2Graph") {
  Container(spa, "SPA", "Vue 3, TypeScript", "図のエディタとプレビュー")
  Container(api, "Library API", "Node.js, Hono", "図ライブラリの REST API", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "図とメタデータを保存する")
  ContainerQueue(sw, "Service Worker", "PWA", "キャッシュと offline 対応")
}

' System_Ext — 外部システム
System_Ext(plantuml, "PlantUML Core", "ブラウザ内の @plantuml/core")
System_Ext(cdn, "CDN", "静的アセット")

' Rel — リンク; Rel_Back — 逆方向; $tags — 関係のスタイル
Rel(user, spa, "編集する", "HTTPS")
Rel(spa, plantuml, "描画する", "in-process")
Rel(spa, api, "ライブラリを読み込む", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "キャッシュする", "events")
Rel(spa, cdn, "静的アセット", "HTTPS")

SHOW_LEGEND()
@enduml`,
    gantt: `@startgantt
' ガントチャート: カレンダー、タスク、依存、色、マイルストーン、リソース
' project starts YYYY-MM-DD — プロジェクト開始。独自の日付がない最初のタスクはここから始まる
' language ru|en|de|ja|zh|ko — カレンダーラベルの言語
' saturday are closed / sunday are closed — 週末は非稼働日
' YYYY-MM-DD is closed — 1 日を閉じる; YYYY-MM-DD to YYYY-MM-DD are closed — 範囲を閉じる
' YYYY-MM-DD is open — 閉じた日を再び開く
' printscale|ganttscale|projectscale daily|weekly|monthly|quarterly|yearly — 時間軸のスケール
' zoom 1.5 — 表示の倍率; today is colored in Coral — 今日を強調
' [名前] lasts N days|weeks|months — カレンダー上の期間
' [名前] requires N days — 作業量: 閉じた日は一週間を短くしない
' [名前] starts YYYY-MM-DD / ends YYYY-MM-DD — 開始と終了の絶対日付
' [名前] starts D+N — プロジェクト開始の N 日後に開始
' [名前] starts at [別のタスク]'s end|start — 別のタスクの終了または開始に依存する
' [名前] starts N days after|before [別のタスク]'s end — 遅延のある依存
' [名前] ends at [別のタスク]'s end|start — このタスクの終了を別のタスクに結ぶ
' then [名前] lasts N days — 次のタスクは直前のタスクの直後に続く
' [A] -> [B] — 依存の矢印; -[dotted]-> と -[#RRGGBB]-> — リンクのスタイル
' [完全な名前] as [コード] — 参照で使う短い別名
' and is colored in Color または StartColor/EndColor — タスクバーの色
' is N% completed|complete — 完了率; is deleted — 破棄されたタスク
' [マイルストーン] happens YYYY-MM-DD — 日付上のマイルストーン; happens at [タスク]'s end — タスク終了時のマイルストーン
' displays on same row as [名前] — 同じ行に描く
' pauses N days / pauses on YYYY-MM-DD — タスク内の休止
' on {リソース} と on {リソース:50%} — リソースとその負荷を割り当てる
' hide resources names / hide resources footbox / hide footbox — リソース名と下部の目盛りを隠す
' -- フェーズ -- — タスク群のあいだの水平な区切り
' Separator just at [名前]'s end — タスクの日付にある垂直な区切り
' note bottom ... end note — タスクの下のノート
' Label on first column and left aligned — 先頭列のラベル（last column, right aligned も）
' [[https://example.com]] 名前の隣 — タスク上のハイパーリンク

' プロジェクトの開始と閉じた週末
project starts 2026-01-06
saturday are closed
sunday are closed

' バーの色付きの 5 日間のタスク
[要件分析] lasts 5 days and is colored in LightGreen
' 前のタスクが終わったときに開始
[UI プロトタイプ] lasts 4 days and starts at [要件分析]'s end
[開発] lasts 10 days and starts at [UI プロトタイプ]'s end
[テスト] lasts 5 days and starts at [開発]'s end
' 固定日のマイルストーン。独自の色付き
[リリース] happens at 2026-02-20 and is colored in Coral
@endgantt`,
    mindmap: `@startmindmap
' Mind map — PlantUML 機能の完全な紹介（オフラインエンジン）
top to bottom direction

title Code2Graph — mind map
header 図エディタ
footer オフライン · SVG · PNG
caption 図 1 — 構文の実演
legend right
  * — OrgMode
  +/-- — 算術
  _ — 枠なし
endlegend

' inline 色付きのルートノード
*[#1565C0] Code2Graph

' 右の枝 (+) — 算術記法
+[#2E7D32] エディタ
++ Monaco
+++_ 構文強調
+++_ オートコンプリート
+++_ コード折りたたみ
**:複数行ノード
エディタとプレビュー
一つのウィンドウに;
++ テーマ

' 左の枝 (--) — 算術記法
--[#E65100] 形式
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

' 左側へ切り替え（left side キーワード）
--[#6A1B9A] 描画
--- plantuml/core
--- Smetana layout
**:プレビュー
ブラウザ内の SVG
サーバーなし;

' inline 色付きの OrgMode 構文 (*)
*[#C62828] 書き出し
** SVG
** PNG
**_:ライブラリ
IndexedDB に保存
そして同期;

' Creole マークアップの複数行ノード
**:==機能
**太字** と //斜体//
等幅: ""code""
区切り
• リスト
• 項目
;

' 第二のルート — multiroot mindmap
*[#455A64] PWA
** Service Worker
** オフラインモード
** デバイスにインストール
@endmindmap`,
  },
  hi: {
    classes: `@startuml
' वर्ग आरेख का पूरा उदाहरण: पैकेज, वंशानुक्रम और स्टीरियोटाइप
!pragma layout smetana

title वर्ग आरेख — पूरा उदाहरण

' <<interface>> और <<enum>> स्टीरियोटाइप के पृष्ठभूमि और सीमा रंग
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "डोमेन" {
  ' अमूर्त वर्ग — इसका सीधा उदाहरण नहीं बनाया जा सकता
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

  ' extends — वंशानुक्रम; implements — इंटरफ़ेस प्राप्ति
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' <<Rectangle>> स्टीरियोटाइप और पृष्ठभूमि रंग वाला पैकेज
package "सेवाएँ" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — सिंगलटन पैटर्न; (S,#FF7700) — आइकन
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' टिप्पणियाँ तत्वों से जुड़ती हैं: top / right / left / bottom
note top of Animal : सभी जानवरों का\\nआधार वर्ग
note right of Dog : वफादार\\nसाथी

' संयोजन (*--), निर्भरता (..>), साहचर्य (-->)
Dog "1" *-- "0..*" Cat : मित्र है
Veterinary ..> Animal : जाँचता है
Dog ..> Diet : अनुसरण करता है
@enduml`,
    sequence: `@startuml
' अनुक्रम आरेख: समय के साथ अंतःक्रियाएँ
!pragma layout smetana

title अनुक्रम आरेख — पूरा उदाहरण

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' प्रतिभागी: actor, participant, database; alias — संक्षिप्त नाम
actor क्लाइंट as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database डेटाबेस as db

' == चरण विभाजक (संदेशों को समूहित करता है) ==
== प्रमाणीकरण ==

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

' alt — सशर्त शाखा (if/else)
alt सफलता
  app --> client : 200 OK + JWT
else अमान्य प्रमाण-पत्र
  app --> client : 401 Unauthorized
end

deactivate app

== डेटा लोड करना ==

client -> app : GET /dashboard
activate app

' opt — वैकल्पिक खंड (शर्त पूरी होने पर चलता है)
opt कैश खाली
  app -> db : SELECT data
  db --> app : rows
end

' loop — प्रत्येक तत्व के लिए दोहराएँ
loop प्रत्येक तत्व
  app -> app : transform(item)
end

' par — समानांतर संदेश प्रवाह
par समानांतर प्राप्ति
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
    components: `@startuml
' घटक आरेख: मॉड्यूल, इंटरफ़ेस और निर्भरताएँ
!pragma layout smetana

title घटक आरेख — पूरा उदाहरण

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "क्लाइंट" #E3F2FD {
  ' [नाम] — घटक। <<interface>> एक अनुबंध है; लेबल पैकेज के अंदर रहता है
  [Vue SPA] as spa
  [Service Worker] as sw
  component "HTTP API" <<interface>> as httpApi
}

package "रेंडरर" #E8F5E9 {
  ' frame — पैकेज के अंदर का नेस्टेड फ़्रेम
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "भंडारण" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' ठोस तीर — निर्भरता; बिंदीदार (..>) — कमज़ोर कड़ी
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  SVG रेंडरिंग
  ब्राउज़र में
end note
@enduml`,
    state: `@startuml
' अवस्था आरेख: जीवन-चक्र और सशर्त संक्रमण
!pragma layout smetana

title अवस्था आरेख — सशर्त संक्रमण

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — प्रारंभिक/अंतिम छद्म-अवस्था
[*] --> Idle

' entry क्रिया और विवरण वाली नेस्टेड अवस्था
state Idle {
  Idle : entry / resetTimer()
  Idle : इनपुट की प्रतीक्षा
}

Idle --> Validating : submit()

' आंतरिक तर्क वाली संयुक्त अवस्था
state Validating {
  state "जाँच" as check
  ' choice — गार्ड शर्तों [valid]/[invalid] वाला शाखा नोड
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
  Rendering : SVG रेंडर करें
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
  सशर्त संक्रमण
  choice नोड के माध्यम से
end note
@enduml`,
    activity: `@startuml
' गतिविधि आरेख: कार्यप्रवाह, swimlanes और शर्तें
!pragma layout smetana

title गतिविधि आरेख — शैलियाँ और शर्तें

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes — |रंग|नाम| जिम्मेदारी क्षेत्र निर्धारित करता है
|#E3F2FD|क्लाइंट|
|#E8F5E9|संपादक|
|#FFF3E0|रेंडरर|

start

|क्लाइंट|
:PlantUML कोड दर्ज करें;

|संपादक|
:layout pragma लागू करें;
' if/then/else — शाखन; ';' के बाद <<#रंग>> — क्रिया का हाइलाइट
if (वाक्य-विन्यास मान्य?) then (हाँ)
  :स्रोत तैयार करें;
else (नहीं)
  :त्रुटि दिखाएँ; <<#Pink>>
  stop
endif

|रेंडरर|
' fork/fork again/end fork — समानांतर शाखाएँ
fork
  :Smetana layout;
fork again
  :SVG उत्पन्न करें;
end fork

|क्लाइंट|
:पूर्वावलोकन दिखाएँ;
:PNG/SVG निर्यात करें; <<#LightBlue>>

stop
@enduml`,
    c4: `@startuml
' C4 मॉडल: कंटेनर स्तर पर सिस्टम वास्तुकला
!pragma layout smetana

' C4 लाइब्रेरी शामिल करें (फ़ाइलें public/plantuml-lib/C4/ में)
!include ./plantuml-lib/C4/C4_Container.puml

' व्यक्ति की रूपरेखा तथा तत्व और संबंध के टैग कॉन्फ़िगर करें
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — Code2Graph (कंटेनर)

' Person — उपयोगकर्ता; Person_Ext — बाहरी अभिनेता
Person(user, "उपयोगकर्ता", "आरेख बनाता और संपादित करता है")
Person_Ext(admin, "प्रशासक", "आरेख लाइब्रेरी प्रबंधित करता है")

' System_Boundary — हमारी प्रणाली की सीमा
System_Boundary(app, "Code2Graph") {
  Container(spa, "SPA", "Vue 3, TypeScript", "आरेख संपादक और पूर्वावलोकन")
  Container(api, "Library API", "Node.js, Hono", "आरेख लाइब्रेरी के लिए REST API", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "आरेख और मेटाडेटा संग्रहीत करता है")
  ContainerQueue(sw, "Service Worker", "PWA", "कैश और offline समर्थन")
}

' System_Ext — बाहरी प्रणालियाँ
System_Ext(plantuml, "PlantUML Core", "ब्राउज़र में @plantuml/core")
System_Ext(cdn, "CDN", "स्थिर संसाधन")

' Rel — कड़ी; Rel_Back — विपरीत दिशा; $tags — संबंध की शैली
Rel(user, spa, "संपादित करता है", "HTTPS")
Rel(spa, plantuml, "रेंडर करता है", "in-process")
Rel(spa, api, "लाइब्रेरी लोड करता है", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "कैश करता है", "events")
Rel(spa, cdn, "स्थिर संसाधन", "HTTPS")

SHOW_LEGEND()
@enduml`,
    gantt: `@startgantt
' गैंट चार्ट: कैलेंडर, कार्य, निर्भरताएँ, रंग, मील के पत्थर और संसाधन
' project starts YYYY-MM-DD — परियोजना आरंभ; अपनी तिथि के बिना पहला कार्य यहीं से शुरू होता है
' language ru|en|de|ja|zh|ko — कैलेंडर लेबल की भाषा
' saturday are closed / sunday are closed — सप्ताहांत कार्य-दिवस नहीं होते
' YYYY-MM-DD is closed — एक दिन बंद करें; YYYY-MM-DD to YYYY-MM-DD are closed — एक सीमा बंद करें
' YYYY-MM-DD is open — बंद दिन को फिर खोलें
' printscale|ganttscale|projectscale daily|weekly|monthly|quarterly|yearly — समय अक्ष का पैमाना
' zoom 1.5 — प्रदर्शन ज़ूम; today is colored in Coral — आज को चिह्नित करें
' [नाम] lasts N days|weeks|months — कैलेंडर अवधि
' [नाम] requires N days — कार्यभार: बंद दिन सप्ताह को छोटा नहीं करते
' [नाम] starts YYYY-MM-DD / ends YYYY-MM-DD — आरंभ और अंत की निरपेक्ष तिथियाँ
' [नाम] starts D+N — परियोजना आरंभ के N दिन बाद शुरू
' [नाम] starts at [अन्य]'s end|start — किसी अन्य कार्य के अंत या आरंभ पर निर्भर
' [नाम] starts N days after|before [अन्य]'s end — विलंब वाली निर्भरता
' [नाम] ends at [अन्य]'s end|start — इस कार्य का अंत दूसरे कार्य से बाँधें
' then [नाम] lasts N days — अगला कार्य पिछले के तुरंत बाद आता है
' [A] -> [B] — निर्भरता का तीर; -[dotted]-> और -[#RRGGBB]-> — कड़ी की शैली
' [पूरा नाम] as [कोड] — संदर्भों में प्रयुक्त संक्षिप्त उपनाम
' and is colored in Color या StartColor/EndColor — कार्य पट्टी का रंग
' is N% completed|complete — पूर्णता प्रतिशत; is deleted — छोड़ दिया गया कार्य
' [मील का पत्थर] happens YYYY-MM-DD — किसी तिथि पर मील का पत्थर; happens at [कार्य]'s end — कार्य के अंत पर मील का पत्थर
' displays on same row as [नाम] — उसी पंक्ति पर बनाएँ
' pauses N days / pauses on YYYY-MM-DD — कार्य के भीतर विराम
' on {संसाधन} और on {संसाधन:50%} — संसाधन और उसका भार असाइन करें
' hide resources names / hide resources footbox / hide footbox — संसाधन लेबल और निचला पैमाना छिपाएँ
' -- चरण -- — कार्य समूहों के बीच क्षैतिज विभाजक
' Separator just at [नाम]'s end — कार्य की तिथि पर ऊर्ध्वाधर विभाजक
' note bottom ... end note — कार्य के नीचे टिप्पणी
' Label on first column and left aligned — पहले स्तंभ में लेबल (साथ ही last column, right aligned)
' [[https://example.com]] नाम के बगल में — कार्य पर हाइपरलिंक

' परियोजना का आरंभ और बंद सप्ताहांत
project starts 2026-01-06
saturday are closed
sunday are closed

' पट्टी के रंग के साथ पाँच दिन का कार्य
[आवश्यकता विश्लेषण] lasts 5 days and is colored in LightGreen
' पिछला कार्य समाप्त होने पर आरंभ
[UI प्रोटोटाइप] lasts 4 days and starts at [आवश्यकता विश्लेषण]'s end
[विकास] lasts 10 days and starts at [UI प्रोटोटाइप]'s end
[परीक्षण] lasts 5 days and starts at [विकास]'s end
' निश्चित तिथि पर मील का पत्थर, अपने रंग के साथ
[रिलीज़] happens at 2026-02-20 and is colored in Coral
@endgantt`,
    mindmap: `@startmindmap
' Mind map — PlantUML सुविधाओं का पूरा प्रदर्शन (ऑफ़लाइन इंजन)
top to bottom direction

title Code2Graph — mind map
header आरेख संपादक
footer ऑफ़लाइन · SVG · PNG
caption चित्र 1 — वाक्य-विन्यास का प्रदर्शन
legend right
  * — OrgMode
  +/-- — अंकगणित
  _ — बिना चौखट
endlegend

' inline रंग वाला मूल नोड
*[#1565C0] Code2Graph

' दाईं शाखा (+) — अंकगणितीय संकेतन
+[#2E7D32] संपादक
++ Monaco
+++_ वाक्य-विन्यास हाइलाइट
+++_ स्वतःपूर्ण
+++_ कोड मोड़ना
**:बहुपंक्ति नोड
संपादक और पूर्वावलोकन
एक ही विंडो में;
++ थीम

' बाईं शाखा (--) — अंकगणितीय संकेतन
--[#E65100] प्रारूप
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

' बाईं ओर बदलें (left side कीवर्ड)
--[#6A1B9A] रेंडर
--- plantuml/core
--- Smetana layout
**:पूर्वावलोकन
ब्राउज़र में SVG
बिना सर्वर;

' inline रंगों वाला OrgMode वाक्य-विन्यास (*)
*[#C62828] निर्यात
** SVG
** PNG
**_:लाइब्रेरी
IndexedDB में सहेजें
और सिंक;

' Creole मार्कअप वाला बहुपंक्ति नोड
**:==सुविधाएँ
**मोटा** और //तिरछा//
मोनोस्पेस: ""code""
विभाजक
• सूची
• मदें
;

' दूसरा मूल — multiroot mindmap
*[#455A64] PWA
** Service Worker
** ऑफ़लाइन मोड
** डिवाइस पर स्थापित करें
@endmindmap`,
  },
  pt: {
    classes: `@startuml
' Exemplo completo de diagrama de classes: pacotes, herança e estereótipos
!pragma layout smetana

title Diagrama de classes — exemplo completo

' Cores de fundo e de borda para os estereótipos <<interface>> e <<enum>>
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "Domínio" {
  ' Classe abstrata — não pode ser instanciada diretamente
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

  ' extends — herança; implements — realização de interface
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' Pacote com estereótipo <<Rectangle>> e cor de fundo
package "Serviços" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — padrão singleton; (S,#FF7700) — ícone
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' As notas se anexam aos elementos: top / right / left / bottom
note top of Animal : Classe base\\nde todos os animais
note right of Dog : Companheiro\\nleal

' Composição (*--), dependência (..>), associação (-->)
Dog "1" *-- "0..*" Cat : é amigo de
Veterinary ..> Animal : verifica
Dog ..> Diet : segue
@enduml`,
    sequence: `@startuml
' Diagrama de sequência: interações ao longo do tempo
!pragma layout smetana

title Diagrama de sequência — exemplo completo

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' Participantes: actor, participant, database; alias — nome curto
actor Cliente as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database BD as db

' == Separador de fases (agrupa mensagens) ==
== Autenticação ==

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

' alt — ramo condicional (if/else)
alt Sucesso
  app --> client : 200 OK + JWT
else Credenciais inválidas
  app --> client : 401 Unauthorized
end

deactivate app

== Carregamento de dados ==

client -> app : GET /dashboard
activate app

' opt — fragmento opcional (executado quando a condição se cumpre)
opt Cache vazio
  app -> db : SELECT data
  db --> app : rows
end

' loop — repetir para cada item
loop cada item
  app -> app : transform(item)
end

' par — fluxos de mensagens em paralelo
par Busca em paralelo
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
    components: `@startuml
' Diagrama de componentes: módulos, interfaces e dependências
!pragma layout smetana

title Diagrama de componentes — exemplo completo

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "Cliente" #E3F2FD {
  ' [Nome] — componente. <<interface>> é um contrato; o rótulo permanece dentro do pacote
  [Vue SPA] as spa
  [Service Worker] as sw
  component "HTTP API" <<interface>> as httpApi
}

package "Renderizador" #E8F5E9 {
  ' frame — quadro aninhado dentro de um pacote
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "Armazenamento" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' Seta contínua — dependência; pontilhada (..>) — vínculo fraco
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  Renderização SVG
  no navegador
end note
@enduml`,
    state: `@startuml
' Diagrama de estados: ciclo de vida e transições condicionais
!pragma layout smetana

title Diagrama de estados — transições condicionais

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — pseudoestado inicial/final
[*] --> Idle

' Estado aninhado com ação entry e descrição
state Idle {
  Idle : entry / resetTimer()
  Idle : Aguardando entrada
}

Idle --> Validating : submit()

' Estado composto com lógica interna
state Validating {
  state "Verificação" as check
  ' choice — nó de ramificação com condições de guarda [valid]/[invalid]
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
  Rendering : Renderizar SVG
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
  Transição condicional
  via nó choice
end note
@enduml`,
    activity: `@startuml
' Diagrama de atividade: fluxo de trabalho, swimlanes e condições
!pragma layout smetana

title Diagrama de atividade — estilos e condições

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes — |cor|Nome| define zonas de responsabilidade
|#E3F2FD|Cliente|
|#E8F5E9|Editor|
|#FFF3E0|Renderizador|

start

|Cliente|
:Inserir código PlantUML;

|Editor|
:Aplicar layout pragma;
' if/then/else — ramificação; <<#cor>> após ';' — destaque da ação
if (Sintaxe válida?) then (sim)
  :Preparar a fonte;
else (não)
  :Mostrar erro; <<#Pink>>
  stop
endif

|Renderizador|
' fork/fork again/end fork — ramos paralelos
fork
  :Smetana layout;
fork again
  :Gerar SVG;
end fork

|Cliente|
:Mostrar prévia;
:Exportar PNG/SVG; <<#LightBlue>>

stop
@enduml`,
    c4: `@startuml
' Modelo C4: arquitetura do sistema no nível de contêineres
!pragma layout smetana

' Incluir a biblioteca C4 (arquivos em public/plantuml-lib/C4/)
!include ./plantuml-lib/C4/C4_Container.puml

' Configurar o contorno das pessoas e as marcas de elementos e relacionamentos
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — Code2Graph (contêineres)

' Person — usuário; Person_Ext — ator externo
Person(user, "Usuário", "Cria e edita diagramas")
Person_Ext(admin, "Administrador", "Gerencia a biblioteca de diagramas")

' System_Boundary — limite do nosso sistema
System_Boundary(app, "Code2Graph") {
  Container(spa, "SPA", "Vue 3, TypeScript", "Editor de diagramas e prévia")
  Container(api, "Library API", "Node.js, Hono", "API REST da biblioteca de diagramas", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "Armazena diagramas e metadados")
  ContainerQueue(sw, "Service Worker", "PWA", "Cache e suporte offline")
}

' System_Ext — sistemas externos
System_Ext(plantuml, "PlantUML Core", "@plantuml/core no navegador")
System_Ext(cdn, "CDN", "Recursos estáticos")

' Rel — ligação; Rel_Back — direção inversa; $tags — estilo do relacionamento
Rel(user, spa, "Edita", "HTTPS")
Rel(spa, plantuml, "Renderiza", "in-process")
Rel(spa, api, "Carrega a biblioteca", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "Armazena em cache", "events")
Rel(spa, cdn, "Recursos estáticos", "HTTPS")

SHOW_LEGEND()
@enduml`,
    gantt: `@startgantt
' Gráfico de Gantt: calendário, tarefas, dependências, cores, marcos e recursos
' project starts YYYY-MM-DD — início do projeto; a primeira tarefa sem data própria começa aqui
' language ru|en|de|ja|zh|ko — idioma dos rótulos do calendário
' saturday are closed / sunday are closed — fins de semana não são dias úteis
' YYYY-MM-DD is closed — fechar um dia; YYYY-MM-DD to YYYY-MM-DD are closed — fechar um intervalo
' YYYY-MM-DD is open — reabrir um dia fechado
' printscale|ganttscale|projectscale daily|weekly|monthly|quarterly|yearly — escala do eixo do tempo
' zoom 1.5 — zoom da exibição; today is colored in Coral — destacar hoje
' [Nome] lasts N days|weeks|months — duração de calendário
' [Nome] requires N days — carga de trabalho: dias fechados não encurtam uma semana
' [Nome] starts YYYY-MM-DD / ends YYYY-MM-DD — datas absolutas de início e fim
' [Nome] starts D+N — começar N dias após o início do projeto
' [Nome] starts at [Outra]'s end|start — depender do fim ou do início de outra tarefa
' [Nome] starts N days after|before [Outra]'s end — dependência com atraso
' [Nome] ends at [Outra]'s end|start — prender o fim desta tarefa a outra tarefa
' then [Nome] lasts N days — a tarefa seguinte vem logo após a anterior
' [A] -> [B] — seta de dependência; -[dotted]-> e -[#RRGGBB]-> — estilo do vínculo
' [Nome completo] as [Código] — alias curto usado nas referências
' and is colored in Color ou StartColor/EndColor — cor da barra da tarefa
' is N% completed|complete — percentual concluído; is deleted — tarefa descartada
' [Marco] happens YYYY-MM-DD — marco em uma data; happens at [Tarefa]'s end — marco no fim de uma tarefa
' displays on same row as [Nome] — desenhar na mesma linha
' pauses N days / pauses on YYYY-MM-DD — pausa dentro de uma tarefa
' on {Recurso} e on {Recurso:50%} — atribuir um recurso e sua carga
' hide resources names / hide resources footbox / hide footbox — ocultar os rótulos de recursos e a escala inferior
' -- Fase -- — separador horizontal entre grupos de tarefas
' Separator just at [Nome]'s end — separador vertical na data de uma tarefa
' note bottom ... end note — nota sob uma tarefa
' Label on first column and left aligned — rótulos na primeira coluna (também last column, right aligned)
' [[https://example.com]] ao lado de um nome — hiperlink em uma tarefa

' Início do projeto e fins de semana fechados
project starts 2026-01-06
saturday are closed
sunday are closed

' Tarefa de cinco dias com cor da barra
[Análise de requisitos] lasts 5 days and is colored in LightGreen
' Começa quando a tarefa anterior termina
[Protótipo de UI] lasts 4 days and starts at [Análise de requisitos]'s end
[Desenvolvimento] lasts 10 days and starts at [Protótipo de UI]'s end
[Testes] lasts 5 days and starts at [Desenvolvimento]'s end
' Marco em uma data fixa, com a própria cor
[Lançamento] happens at 2026-02-20 and is colored in Coral
@endgantt`,
    mindmap: `@startmindmap
' Mind map — amostra completa de recursos do PlantUML (motor offline)
top to bottom direction

title Code2Graph — mind map
header Editor de diagramas
footer Sem conexão · SVG · PNG
caption Fig. 1 — demonstração de sintaxe
legend right
  * — OrgMode
  +/-- — aritmética
  _ — sem moldura
endlegend

' Nó raiz com cor inline
*[#1565C0] Code2Graph

' Ramo à direita (+) — notação aritmética
+[#2E7D32] Editor
++ Monaco
+++_ Realce de sintaxe
+++_ Autocompletar
+++_ Dobra de código
**:Nó de várias linhas
Editor e prévia
em uma janela;
++ Temas

' Ramo à esquerda (--) — notação aritmética
--[#E65100] Formatos
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

' Mudar para o lado esquerdo (palavra-chave left side)
--[#6A1B9A] Renderização
--- plantuml/core
--- Smetana layout
**:Prévia
SVG no navegador
sem um servidor;

' Sintaxe OrgMode (*) com cores inline
*[#C62828] Exportação
** SVG
** PNG
**_:Biblioteca
Salvar no IndexedDB
e sincronizar;

' Nó multilinha com marcação Creole
**:==Recursos
**negrito** e //itálico//
Monoespaçado: ""code""
separador
• lista
• itens
;

' Segunda raiz — multiroot mindmap
*[#455A64] PWA
** Service Worker
** Modo offline
** Instalar no dispositivo
@endmindmap`,
  },
  de: {
    classes: `@startuml
' Vollständiges Klassendiagramm: Pakete, Vererbung, Stereotypen
!pragma layout smetana

title Klassendiagramm — vollständiges Beispiel

' Hintergrund- und Rahmenfarben für die Stereotypen <<interface>> und <<enum>>
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "Domäne" {
  ' Abstrakte Klasse — kann nicht direkt instanziiert werden
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

  ' extends — Vererbung; implements — Schnittstellenrealisierung
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' Paket mit Stereotyp <<Rectangle>> und Hintergrundfarbe
package "Dienste" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — Singleton-Muster; (S,#FF7700) — Symbol
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' Notizen hängen an Elementen: top / right / left / bottom
note top of Animal : Basisklasse\\naller Tiere
note right of Dog : Treuer\\nBegleiter

' Komposition (*--), Abhängigkeit (..>), Assoziation (-->)
Dog "1" *-- "0..*" Cat : befreundet mit
Veterinary ..> Animal : prüft
Dog ..> Diet : folgt
@enduml`,
    sequence: `@startuml
' Sequenzdiagramm: Interaktionen im Zeitverlauf
!pragma layout smetana

title Sequenzdiagramm — vollständiges Beispiel

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' Teilnehmer: actor, participant, database; alias — Kurzname
actor Client as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database Datenbank as db

' == Phasentrenner (gruppiert Nachrichten) ==
== Authentifizierung ==

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

' alt — bedingte Verzweigung (if/else)
alt Erfolg
  app --> client : 200 OK + JWT
else Ungültige Anmeldedaten
  app --> client : 401 Unauthorized
end

deactivate app

== Daten laden ==

client -> app : GET /dashboard
activate app

' opt — optionales Fragment (wird ausgeführt, wenn die Bedingung gilt)
opt Cache leer
  app -> db : SELECT data
  db --> app : rows
end

' loop — für jedes Element wiederholen
loop jedes Element
  app -> app : transform(item)
end

' par — parallele Nachrichtenflüsse
par Paralleler Abruf
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
    components: `@startuml
' Komponentendiagramm: Module, Schnittstellen und Abhängigkeiten
!pragma layout smetana

title Komponentendiagramm — vollständiges Beispiel

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "Client" #E3F2FD {
  ' [Name] — Komponente. <<interface>> ist ein Vertrag; die Beschriftung bleibt im Paket
  [Vue SPA] as spa
  [Service Worker] as sw
  component "HTTP API" <<interface>> as httpApi
}

package "Darstellung" #E8F5E9 {
  ' frame — verschachtelter Rahmen innerhalb eines Pakets
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "Speicher" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' Durchgezogener Pfeil — Abhängigkeit; punktiert (..>) — schwache Verbindung
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  SVG-Darstellung
  im Browser
end note
@enduml`,
    state: `@startuml
' Zustandsdiagramm: Lebenszyklus und bedingte Übergänge
!pragma layout smetana

title Zustandsdiagramm — bedingte Übergänge

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — Anfangs-/Endpseudozustand
[*] --> Idle

' Verschachtelter Zustand mit entry-Aktion und Beschreibung
state Idle {
  Idle : entry / resetTimer()
  Idle : Wartet auf Eingabe
}

Idle --> Validating : submit()

' Zusammengesetzter Zustand mit interner Logik
state Validating {
  state "Prüfung" as check
  ' choice — Verzweigungsknoten mit Guard-Bedingungen [valid]/[invalid]
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
  Rendering : SVG darstellen
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
  Bedingter Übergang
  über einen choice-Knoten
end note
@enduml`,
    activity: `@startuml
' Aktivitätsdiagramm: Arbeitsablauf, swimlanes und Bedingungen
!pragma layout smetana

title Aktivitätsdiagramm — Stile und Bedingungen

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes — |Farbe|Name| legt Verantwortungsbereiche fest
|#E3F2FD|Client|
|#E8F5E9|Editor|
|#FFF3E0|Darstellung|

start

|Client|
:PlantUML-Code eingeben;

|Editor|
:layout pragma anwenden;
' if/then/else — Verzweigung; <<#Farbe>> nach ';' — Hervorhebung der Aktion
if (Syntax gültig?) then (ja)
  :Quelle vorbereiten;
else (nein)
  :Fehler anzeigen; <<#Pink>>
  stop
endif

|Darstellung|
' fork/fork again/end fork — parallele Zweige
fork
  :Smetana layout;
fork again
  :SVG erzeugen;
end fork

|Client|
:Vorschau anzeigen;
:PNG/SVG exportieren; <<#LightBlue>>

stop
@enduml`,
    c4: `@startuml
' C4-Modell: Systemarchitektur auf Container-Ebene
!pragma layout smetana

' C4-Bibliothek einbinden (Dateien in public/plantuml-lib/C4/)
!include ./plantuml-lib/C4/C4_Container.puml

' Umriss der Personen sowie Element- und Beziehungstags konfigurieren
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — Code2Graph (Container)

' Person — Benutzer; Person_Ext — externer Akteur
Person(user, "Benutzer", "Erstellt und bearbeitet Diagramme")
Person_Ext(admin, "Administrator", "Verwaltet die Diagrammbibliothek")

' System_Boundary — Grenze unseres Systems
System_Boundary(app, "Code2Graph") {
  Container(spa, "SPA", "Vue 3, TypeScript", "Diagrammeditor und Vorschau")
  Container(api, "Library API", "Node.js, Hono", "REST-API für die Diagrammbibliothek", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "Speichert Diagramme und Metadaten")
  ContainerQueue(sw, "Service Worker", "PWA", "Zwischenspeicher und offline-Unterstützung")
}

' System_Ext — externe Systeme
System_Ext(plantuml, "PlantUML Core", "@plantuml/core im Browser")
System_Ext(cdn, "CDN", "Statische Ressourcen")

' Rel — Verbindung; Rel_Back — Gegenrichtung; $tags — Stil der Beziehung
Rel(user, spa, "Bearbeitet", "HTTPS")
Rel(spa, plantuml, "Stellt dar", "in-process")
Rel(spa, api, "Lädt die Bibliothek", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "Zwischenspeichert", "events")
Rel(spa, cdn, "Statische Ressourcen", "HTTPS")

SHOW_LEGEND()
@enduml`,
    gantt: `@startgantt
' Gantt-Diagramm: Kalender, Aufgaben, Abhängigkeiten, Farben, Meilensteine und Ressourcen
' project starts YYYY-MM-DD — Projektstart; die erste Aufgabe ohne eigenes Datum beginnt hier
' language ru|en|de|ja|zh|ko — Sprache der Kalenderbeschriftungen
' saturday are closed / sunday are closed — Wochenenden sind arbeitsfreie Tage
' YYYY-MM-DD is closed — einen Tag schließen; YYYY-MM-DD to YYYY-MM-DD are closed — einen Bereich schließen
' YYYY-MM-DD is open — einen geschlossenen Tag wieder öffnen
' printscale|ganttscale|projectscale daily|weekly|monthly|quarterly|yearly — Skala der Zeitachse
' zoom 1.5 — Anzeigezoom; today is colored in Coral — den heutigen Tag hervorheben
' [Name] lasts N days|weeks|months — Kalenderdauer
' [Name] requires N days — Arbeitsaufwand: geschlossene Tage verkürzen eine Woche nicht
' [Name] starts YYYY-MM-DD / ends YYYY-MM-DD — absolute Start- und Enddaten
' [Name] starts D+N — Start N Tage nach dem Projektbeginn
' [Name] starts at [Andere]'s end|start — vom Ende oder Anfang einer anderen Aufgabe abhängen
' [Name] starts N days after|before [Andere]'s end — Abhängigkeit mit Verzögerung
' [Name] ends at [Andere]'s end|start — das Ende dieser Aufgabe an eine andere Aufgabe binden
' then [Name] lasts N days — die nächste Aufgabe folgt unmittelbar auf die vorherige
' [A] -> [B] — Abhängigkeitspfeil; -[dotted]-> und -[#RRGGBB]-> — Stil der Verbindung
' [Vollständiger Name] as [Kürzel] — kurzer Alias für Verweise
' and is colored in Color oder StartColor/EndColor — Farbe des Aufgabenbalkens
' is N% completed|complete — Fertigstellungsgrad; is deleted — verworfene Aufgabe
' [Meilenstein] happens YYYY-MM-DD — Meilenstein an einem Datum; happens at [Aufgabe]'s end — Meilenstein am Ende einer Aufgabe
' displays on same row as [Name] — in derselben Zeile zeichnen
' pauses N days / pauses on YYYY-MM-DD — Pause innerhalb einer Aufgabe
' on {Ressource} und on {Ressource:50%} — eine Ressource und ihre Auslastung zuweisen
' hide resources names / hide resources footbox / hide footbox — Ressourcenbeschriftungen und die untere Skala ausblenden
' -- Phase -- — waagerechter Trenner zwischen Aufgabengruppen
' Separator just at [Name]'s end — senkrechter Trenner an einem Aufgabendatum
' note bottom ... end note — Notiz unter einer Aufgabe
' Label on first column and left aligned — Beschriftungen in der ersten Spalte (auch last column, right aligned)
' [[https://example.com]] neben einem Namen — Hyperlink an einer Aufgabe

' Projektstart und geschlossene Wochenenden
project starts 2026-01-06
saturday are closed
sunday are closed

' Fünftägige Aufgabe mit Balkenfarbe
[Anforderungsanalyse] lasts 5 days and is colored in LightGreen
' Beginn, wenn die vorherige Aufgabe endet
[UI-Prototyp] lasts 4 days and starts at [Anforderungsanalyse]'s end
[Entwicklung] lasts 10 days and starts at [UI-Prototyp]'s end
[Testen] lasts 5 days and starts at [Entwicklung]'s end
' Meilenstein an einem festen Datum, mit eigener Farbe
[Freigabe] happens at 2026-02-20 and is colored in Coral
@endgantt`,
    mindmap: `@startmindmap
' Mind map — vollständige Vorstellung der PlantUML-Funktionen (Offline-Engine)
top to bottom direction

title Code2Graph — mind map
header Diagrammeditor
footer Offline · SVG · PNG
caption Abb. 1 — Syntaxvorführung
legend right
  * — OrgMode
  +/-- — Arithmetik
  _ — ohne Rahmen
endlegend

' Wurzelknoten mit Inline-Farbe
*[#1565C0] Code2Graph

' Rechter Zweig (+) — arithmetische Notation
+[#2E7D32] Editor
++ Monaco
+++_ Syntaxhervorhebung
+++_ Autovervollständigung
+++_ Codefaltung
**:Mehrzeiliger Knoten
Editor und Vorschau
in einem Fenster;
++ Themen

' Linker Zweig (--) — arithmetische Notation
--[#E65100] Formate
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

' Wechsel zur linken Seite (Schlüsselwort left side)
--[#6A1B9A] Darstellung
--- plantuml/core
--- Smetana layout
**:Vorschau
SVG im Browser
ohne Server;

' OrgMode-Syntax (*) mit Inline-Farben
*[#C62828] Export
** SVG
** PNG
**_:Bibliothek
In IndexedDB speichern
und synchronisieren;

' Mehrzeiliger Knoten mit Creole-Markup
**:==Funktionen
**fett** und //kursiv//
Festbreite: ""code""
Trenner
• Liste
• Einträge
;

' Zweite Wurzel — multiroot mindmap
*[#455A64] PWA
** Service Worker
** Offlinemodus
** Auf dem Gerät installieren
@endmindmap`,
  },
  ar: {
    classes: `@startuml
' مثال كامل لمخطط أصناف: الحزم والوراثة والصور النمطية
!pragma layout smetana

title مخطط أصناف — مثال كامل

' ألوان الخلفية والإطار للصورتين النمطيتين <<interface>> و <<enum>>
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "النطاق" {
  ' صنف مجرد — لا يمكن إنشاء نسخة منه مباشرة
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

  ' extends — وراثة؛ implements — تحقيق الواجهة
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' حزمة بالصورة النمطية <<Rectangle>> ولون خلفية
package "الخدمات" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — نمط المفرد؛ (S,#FF7700) — أيقونة
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' تُرفق الملاحظات بالعناصر: top / right / left / bottom
note top of Animal : الصنف الأساس\\nلكل الحيوانات
note right of Dog : رفيق\\nوفيّ

' تركيب (*--)، اعتماد (..>)، ارتباط (-->)
Dog "1" *-- "0..*" Cat : صديق لـ
Veterinary ..> Animal : يفحص
Dog ..> Diet : يتبع
@enduml`,
    sequence: `@startuml
' مخطط تسلسل: تفاعلات عبر الزمن
!pragma layout smetana

title مخطط تسلسل — مثال كامل

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' المشاركون: actor و participant و database؛ alias — اسم قصير
actor العميل as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database "قاعدة بيانات" as db

' == فاصل المراحل (يجمّع الرسائل) ==
== المصادقة ==

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

' alt — فرع شرطي (if/else)
alt نجاح
  app --> client : 200 OK + JWT
else بيانات اعتماد غير صالحة
  app --> client : 401 Unauthorized
end

deactivate app

== تحميل البيانات ==

client -> app : GET /dashboard
activate app

' opt — جزء اختياري (يُنفَّذ عند تحقق الشرط)
opt الذاكرة المؤقتة فارغة
  app -> db : SELECT data
  db --> app : rows
end

' loop — التكرار لكل عنصر
loop كل عنصر
  app -> app : transform(item)
end

' par — تدفقات رسائل متوازية
par جلب متوازٍ
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
    components: `@startuml
' مخطط مكوّنات: وحدات وواجهات واعتمادات
!pragma layout smetana

title مخطط مكوّنات — مثال كامل

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "العميل" #E3F2FD {
  ' [الاسم] — مكوّن. <<interface>> عقد؛ يبقى العنوان داخل الحزمة
  [Vue SPA] as spa
  [Service Worker] as sw
  component "HTTP API" <<interface>> as httpApi
}

package "العارض" #E8F5E9 {
  ' frame — إطار متداخل داخل الحزمة
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "التخزين" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' سهم متصل — اعتماد؛ منقّط (..>) — ارتباط ضعيف
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  تصيير SVG
  في المتصفح
end note
@enduml`,
    state: `@startuml
' مخطط حالات: دورة الحياة والانتقالات الشرطية
!pragma layout smetana

title مخطط حالات — انتقالات شرطية

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — حالة زائفة ابتدائية/نهائية
[*] --> Idle

' حالة متداخلة مع إجراء entry ووصف
state Idle {
  Idle : entry / resetTimer()
  Idle : في انتظار الإدخال
}

Idle --> Validating : submit()

' حالة مركّبة بمنطق داخلي
state Validating {
  state "فحص" as check
  ' choice — عقدة تفرع بشروط حراسة [valid]/[invalid]
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
  Rendering : تصيير SVG
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
  انتقال شرطي
  عبر عقدة choice
end note
@enduml`,
    activity: `@startuml
' مخطط نشاط: سير العمل و swimlanes والشروط
!pragma layout smetana

title مخطط نشاط — الأنماط والشروط

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes — |لون|اسم| يحدد مناطق المسؤولية
|#E3F2FD|العميل|
|#E8F5E9|المحرر|
|#FFF3E0|العارض|

start

|العميل|
:إدخال شيفرة PlantUML;

|المحرر|
:تطبيق layout pragma;
' if/then/else — تفرع؛ <<#لون>> بعد ';' — إبراز الإجراء
if (الصياغة صالحة?) then (نعم)
  :إعداد المصدر;
else (لا)
  :إظهار الخطأ; <<#Pink>>
  stop
endif

|العارض|
' fork/fork again/end fork — فروع متوازية
fork
  :Smetana layout;
fork again
  :توليد SVG;
end fork

|العميل|
:إظهار المعاينة;
:تصدير PNG/SVG; <<#LightBlue>>

stop
@enduml`,
    c4: `@startuml
' نموذج C4: معمارية النظام على مستوى الحاويات
!pragma layout smetana

' تضمين مكتبة C4 (الملفات في public/plantuml-lib/C4/)
!include ./plantuml-lib/C4/C4_Container.puml

' ضبط محيط الأشخاص ووسوم العناصر والعلاقات
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — Code2Graph (الحاويات)

' Person — مستخدم؛ Person_Ext — فاعل خارجي
Person(user, "مستخدم", "ينشئ المخططات ويحررها")
Person_Ext(admin, "مدير", "يدير مكتبة المخططات")

' System_Boundary — حد نظامنا
System_Boundary(app, "Code2Graph") {
  Container(spa, "SPA", "Vue 3, TypeScript", "محرر المخططات والمعاينة")
  Container(api, "Library API", "Node.js, Hono", "واجهة REST لمكتبة المخططات", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "يخزّن المخططات والبيانات الوصفية")
  ContainerQueue(sw, "Service Worker", "PWA", "التخزين المؤقت ودعم offline")
}

' System_Ext — أنظمة خارجية
System_Ext(plantuml, "PlantUML Core", "@plantuml/core في المتصفح")
System_Ext(cdn, "CDN", "أصول ثابتة")

' Rel — رابط؛ Rel_Back — الاتجاه العكسي؛ $tags — نمط العلاقة
Rel(user, spa, "يحرر", "HTTPS")
Rel(spa, plantuml, "يصيّر", "in-process")
Rel(spa, api, "يحمّل المكتبة", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "يخزّن مؤقتًا", "events")
Rel(spa, cdn, "أصول ثابتة", "HTTPS")

SHOW_LEGEND()
@enduml`,
    gantt: `@startgantt
' مخطط غانت: التقويم والمهام والاعتمادات والألوان والمعالم والموارد
' project starts YYYY-MM-DD — بداية المشروع؛ المهمة الأولى بلا تاريخ خاص بها تبدأ من هنا
' language ru|en|de|ja|zh|ko — لغة تسميات التقويم
' saturday are closed / sunday are closed — عطلة نهاية الأسبوع أيام غير عمل
' YYYY-MM-DD is closed — إغلاق يوم; YYYY-MM-DD to YYYY-MM-DD are closed — إغلاق نطاق
' YYYY-MM-DD is open — إعادة فتح يوم مغلق
' printscale|ganttscale|projectscale daily|weekly|monthly|quarterly|yearly — مقياس محور الزمن
' zoom 1.5 — تكبير العرض; today is colored in Coral — إبراز اليوم
' [اسم] lasts N days|weeks|months — المدة التقويمية
' [اسم] requires N days — عبء العمل: الأيام المغلقة لا تقصّر الأسبوع
' [اسم] starts YYYY-MM-DD / ends YYYY-MM-DD — تاريخا البداية والنهاية المطلقان
' [اسم] starts D+N — البدء بعد N أيام من بداية المشروع
' [اسم] starts at [أخرى]'s end|start — الاعتماد على نهاية مهمة أخرى أو بدايتها
' [اسم] starts N days after|before [أخرى]'s end — اعتماد مع تأخير
' [اسم] ends at [أخرى]'s end|start — ربط نهاية هذه المهمة بمهمة أخرى
' then [اسم] lasts N days — المهمة التالية تلي السابقة مباشرة
' [A] -> [B] — سهم الاعتماد; -[dotted]-> و -[#RRGGBB]-> — نمط الرابط
' [الاسم الكامل] as [رمز] — اسم مستعار قصير يُستخدم في المراجع
' and is colored in Color أو StartColor/EndColor — لون شريط المهمة
' is N% completed|complete — نسبة الإنجاز; is deleted — مهمة مستبعدة
' [معلم] happens YYYY-MM-DD — معلم في تاريخ; happens at [مهمة]'s end — معلم عند نهاية مهمة
' displays on same row as [اسم] — الرسم في الصف نفسه
' pauses N days / pauses on YYYY-MM-DD — توقف مؤقت داخل مهمة
' on {مورد} و on {مورد:50%} — تعيين مورد وعبء عمله
' hide resources names / hide resources footbox / hide footbox — إخفاء تسميات الموارد والمقياس السفلي
' -- مرحلة -- — فاصل أفقي بين مجموعات المهام
' Separator just at [اسم]'s end — فاصل رأسي في تاريخ المهمة
' note bottom ... end note — ملاحظة تحت مهمة
' Label on first column and left aligned — تسميات في العمود الأول (وكذلك last column, right aligned)
' [[https://example.com]] بجانب الاسم — رابط تشعبي على مهمة

' بداية المشروع وعطلات نهاية الأسبوع المغلقة
project starts 2026-01-06
saturday are closed
sunday are closed

' مهمة من خمسة أيام بلون الشريط
[تحليل المتطلبات] lasts 5 days and is colored in LightGreen
' البدء عند انتهاء المهمة السابقة
[نموذج الواجهة] lasts 4 days and starts at [تحليل المتطلبات]'s end
[التطوير] lasts 10 days and starts at [نموذج الواجهة]'s end
[الاختبار] lasts 5 days and starts at [التطوير]'s end
' معلم في تاريخ ثابت، بلونه الخاص
[الإصدار] happens at 2026-02-20 and is colored in Coral
@endgantt`,
    mindmap: `@startmindmap
' Mind map — عرض كامل لقدرات PlantUML (محرك دون اتصال)
top to bottom direction

title Code2Graph — mind map
header محرر المخططات
footer دون اتصال · SVG · PNG
caption الشكل 1 — عرض الصياغة
legend right
  * — OrgMode
  +/-- — حساب
  _ — بلا إطار
endlegend

' عقدة جذر بلون inline
*[#1565C0] Code2Graph

' فرع أيمن (+) — ترميز حسابي
+[#2E7D32] المحرر
++ Monaco
+++_ إبراز الصياغة
+++_ إكمال تلقائي
+++_ طي الشيفرة
**:عقدة متعددة الأسطر
المحرر والمعاينة
في نافذة واحدة;
++ السمات

' فرع أيسر (--) — ترميز حسابي
--[#E65100] التنسيقات
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

' التبديل إلى الجانب الأيسر (كلمة left side)
--[#6A1B9A] العرض
--- plantuml/core
--- Smetana layout
**:معاينة
SVG في المتصفح
دون خادم;

' صياغة OrgMode (*) بألوان inline
*[#C62828] التصدير
** SVG
** PNG
**_:المكتبة
الحفظ في IndexedDB
والمزامنة;

' عقدة متعددة الأسطر بترميز Creole
**:==الميزات
**عريض** و //مائل//
أحادي المسافة: ""code""
فاصل
• قائمة
• عناصر
;

' جذر ثانٍ — multiroot mindmap
*[#455A64] PWA
** Service Worker
** وضع دون اتصال
** التثبيت على الجهاز
@endmindmap`,
  },
};
