import type { AppLocale } from "@/constants/i18n";

export const PLANTUML_RICH_EXTRA: Record<
  Exclude<AppLocale, "ru" | "en">,
  Record<
    | "c4_context"
    | "er"
    | "usecase"
    | "deployment"
    | "object"
    | "timing"
    | "wbs"
    | "nwdiag"
    | "archimate",
    string
  >
> = {
  es: {
    c4_context: `@startuml
' C4 Context: personas, el sistema y las dependencias externas
!pragma layout smetana
!include ./plantuml-lib/C4/C4_Context.puml

title Contexto de Code2Graph

AddElementTag("external", $bgColor="#999999", $fontColor="#ffffff")
AddRelTag("async", $textColor="#444444", $lineStyle=DashedLine())

Enterprise_Boundary(studio, "Estudio") {
  Person(author, "Autor", "Escribe y edita diagramas")
  Person(reader, "Lector", "Ve la vista previa y la exportación")
}

System(app, "Code2Graph", "Editor de diagramas en el navegador")
System_Ext(mail, "Correo", "Avisos de la biblioteca", $tags="external")
SystemDb(files, "Archivos", "Diagramas locales")
SystemQueue(jobs, "Cola", "Exportación en segundo plano")

Rel(author, app, "Edita", "HTTPS")
Rel(reader, app, "Abre un ejemplo", "HTTPS")
Rel(app, mail, "Notifica", "SMTP", $tags="async")
Rel_Back(app, files, "Guarda", "File API")
Rel_Neighbor(app, jobs, "Encola", "async", $tags="async")

SHOW_LEGEND()
@enduml`,
    er: `@startuml
' ER: entidades, claves y cardinalidades mixtas
!pragma layout smetana

title Pedidos de la tienda

skinparam linetype ortho

entity "Cliente" as customer {
  * id : uuid <<PK>>
  --
  email : string
  name : string
}

entity "Pedido" as order {
  * id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  status : string
  total : decimal
}

entity "Línea" as line {
  * id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  sku : string
  qty : int
}

entity "Producto" as product {
  * sku : string <<PK>>
  --
  title : string
  price : decimal
}

customer ||--o{ order : hace
order ||--|{ line : contiene
product |o--o{ line : incluye
@enduml`,
    usecase: `@startuml
' Casos de uso: actores, include y extend
left to right direction

actor "Comprador" as buyer
actor "Administrador" as admin

rectangle "Tienda" {
  usecase "Hacer un pedido" as order
  usecase "Pagar" as pay
  usecase "Iniciar sesión" as login
  usecase "Gestionar el catálogo" as catalog
  usecase "Devolver un artículo" as refund
}

buyer --> order
buyer --> pay
buyer --> refund
order ..> login : include
pay ..> order : extend
refund ..> pay : include
admin --> catalog

note right of login
  Paso obligatorio
  antes de un pedido
end note
@enduml`,
    deployment: `@startuml
' Despliegue: nodos, artefactos, base de datos y nube
!pragma layout smetana

title Despliegue de la tienda

cloud "CDN" as cdn {
  frame "Caché" as cache
}

node "Clúster" as cluster {
  node "Web" as web {
    artifact "SPA" as spa
  }
  database "PostgreSQL" as db {
    storage "Volumen" as volume
  }
}

cdn --> spa : estático
spa --> db : JDBC
spa --> cache : lectura
volume --> db : disco
@enduml`,
    object: `@startuml
' Objetos: campos de instancia y enlaces
!pragma layout smetana

title Instantánea del pedido

object "Pedido #42" as order {
  status = "new"
  total = 120
}
object "Comprador" as buyer {
  email = "a@example.com"
  city = "Berlín"
}
object item
item : title = "Libro"
item : qty = 2
item : price = 60

buyer --> order : realizó
order *-- item : líneas
@enduml`,
    timing: `@startuml
' Temporización: concise, robust, binary y clock
title Ciclo de vida de la solicitud

concise "Solicitud" as request
robust "Base de datos" as db
binary "Caché" as cache
clock "Pulso" as clk with period 50

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
' Desglose del trabajo: colores y profundidad
*[#1565C0] Code2Graph
**[#2E7D32] Editor
*** Código
*** Vista previa
*** Temas
**[#E65100] Lenguajes
*** PlantUML
*** Mermaid
*** D2
**[#6A1B9A] Exportación
*** SVG
*** PNG
*** Biblioteca
@endwbs`,
    nwdiag: `@startnwdiag
' Red: direcciones y enlaces
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
' ArchiMate: negocio, aplicación y tecnología
!include <archimate/Archimate>
!pragma layout smetana

title Tienda — capas de ArchiMate

Business_Actor(customer, "Cliente")
Business_Process(checkout, "Finalizar compra")
Business_Service(counter, "Caja")
Application_Component(api, "API")
Application_Service(catalog, "Catálogo")
Technology_Node(cluster, "Clúster")
Technology_Service(database, "Base de datos")

Rel_Triggering(customer, checkout, "Inicia")
Rel_Flow(checkout, counter, "Paga")
Rel_Serving(catalog, api, "Sirve")
Rel_Assignment(cluster, database, "Aloja")
Rel_Access(api, database, "Lee")
@enduml`,
  },
  zh: {
    c4_context: `@startuml
' C4 Context: 人员、系统与外部依赖
!pragma layout smetana
!include ./plantuml-lib/C4/C4_Context.puml

title Code2Graph 上下文

AddElementTag("external", $bgColor="#999999", $fontColor="#ffffff")
AddRelTag("async", $textColor="#444444", $lineStyle=DashedLine())

Enterprise_Boundary(studio, "工作室") {
  Person(author, "作者", "编写并编辑图表")
  Person(reader, "读者", "查看预览与导出")
}

System(app, "Code2Graph", "浏览器中的图表编辑器")
System_Ext(mail, "邮件", "图库通知", $tags="external")
SystemDb(files, "文件", "本地图表")
SystemQueue(jobs, "队列", "后台导出")

Rel(author, app, "编辑", "HTTPS")
Rel(reader, app, "打开示例", "HTTPS")
Rel(app, mail, "通知", "SMTP", $tags="async")
Rel_Back(app, files, "保存", "File API")
Rel_Neighbor(app, jobs, "入队", "async", $tags="async")

SHOW_LEGEND()
@enduml`,
    er: `@startuml
' ER: 实体、键与混合基数
!pragma layout smetana

title 商店订单

skinparam linetype ortho

entity "顾客" as customer {
  * id : uuid <<PK>>
  --
  email : string
  name : string
}

entity "订单" as order {
  * id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  status : string
  total : decimal
}

entity "明细" as line {
  * id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  sku : string
  qty : int
}

entity "商品" as product {
  * sku : string <<PK>>
  --
  title : string
  price : decimal
}

customer ||--o{ order : 下单
order ||--|{ line : 包含
product |o--o{ line : 列入
@enduml`,
    usecase: `@startuml
' 用例：参与者、include 与 extend
left to right direction

actor "买家" as buyer
actor "管理员" as admin

rectangle "商店" {
  usecase "下单" as order
  usecase "付款" as pay
  usecase "登录" as login
  usecase "管理目录" as catalog
  usecase "退货" as refund
}

buyer --> order
buyer --> pay
buyer --> refund
order ..> login : include
pay ..> order : extend
refund ..> pay : include
admin --> catalog

note right of login
  下单前的
  必要步骤
end note
@enduml`,
    deployment: `@startuml
' 部署：节点、制品、数据库与云
!pragma layout smetana

title 商店部署

cloud "CDN" as cdn {
  frame "缓存" as cache
}

node "集群" as cluster {
  node "网站" as web {
    artifact "SPA" as spa
  }
  database "PostgreSQL" as db {
    storage "卷" as volume
  }
}

cdn --> spa : 静态
spa --> db : JDBC
spa --> cache : 读取
volume --> db : 磁盘
@enduml`,
    object: `@startuml
' 对象：实例字段与链接
!pragma layout smetana

title 订单快照

object "订单 #42" as order {
  status = "new"
  total = 120
}
object "买家" as buyer {
  email = "a@example.com"
  city = "柏林"
}
object item
item : title = "书"
item : qty = 2
item : price = 60

buyer --> order : 已下单
order *-- item : 明细
@enduml`,
    timing: `@startuml
' 时序：concise、robust、binary 与 clock
title 请求生命周期

concise "请求" as request
robust "数据库" as db
binary "缓存" as cache
clock "节拍" as clk with period 50

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
' 工作分解：颜色与深度
*[#1565C0] Code2Graph
**[#2E7D32] 编辑器
*** 代码
*** 预览
*** 主题
**[#E65100] 语言
*** PlantUML
*** Mermaid
*** D2
**[#6A1B9A] 导出
*** SVG
*** PNG
*** 图库
@endwbs`,
    nwdiag: `@startnwdiag
' 网络：地址与链路
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
' ArchiMate：业务、应用与技术
!include <archimate/Archimate>
!pragma layout smetana

title 商店 — ArchiMate 分层

Business_Actor(customer, "顾客")
Business_Process(checkout, "结账")
Business_Service(counter, "收银台")
Application_Component(api, "API")
Application_Service(catalog, "目录")
Technology_Node(cluster, "集群")
Technology_Service(database, "数据库")

Rel_Triggering(customer, checkout, "启动")
Rel_Flow(checkout, counter, "付款")
Rel_Serving(catalog, api, "提供")
Rel_Assignment(cluster, database, "承载")
Rel_Access(api, database, "读取")
@enduml`,
  },
  ja: {
    c4_context: `@startuml
' C4 Context: 人、システム、外部依存
!pragma layout smetana
!include ./plantuml-lib/C4/C4_Context.puml

title Code2Graph のコンテキスト

AddElementTag("external", $bgColor="#999999", $fontColor="#ffffff")
AddRelTag("async", $textColor="#444444", $lineStyle=DashedLine())

Enterprise_Boundary(studio, "スタジオ") {
  Person(author, "作成者", "図を書き、編集する")
  Person(reader, "閲覧者", "プレビューと書き出しを見る")
}

System(app, "Code2Graph", "ブラウザの図エディタ")
System_Ext(mail, "メール", "ライブラリの通知", $tags="external")
SystemDb(files, "ファイル", "ローカルの図")
SystemQueue(jobs, "キュー", "バックグラウンド書き出し")

Rel(author, app, "編集する", "HTTPS")
Rel(reader, app, "サンプルを開く", "HTTPS")
Rel(app, mail, "通知する", "SMTP", $tags="async")
Rel_Back(app, files, "保存する", "File API")
Rel_Neighbor(app, jobs, "キューに入れる", "async", $tags="async")

SHOW_LEGEND()
@enduml`,
    er: `@startuml
' ER: エンティティ、キー、混合カーディナリティ
!pragma layout smetana

title 店舗の注文

skinparam linetype ortho

entity "顧客" as customer {
  * id : uuid <<PK>>
  --
  email : string
  name : string
}

entity "注文" as order {
  * id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  status : string
  total : decimal
}

entity "明細" as line {
  * id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  sku : string
  qty : int
}

entity "商品" as product {
  * sku : string <<PK>>
  --
  title : string
  price : decimal
}

customer ||--o{ order : 注文する
order ||--|{ line : 含む
product |o--o{ line : 入る
@enduml`,
    usecase: `@startuml
' ユースケース: アクター、include、extend
left to right direction

actor "購入者" as buyer
actor "管理者" as admin

rectangle "店舗" {
  usecase "注文する" as order
  usecase "支払う" as pay
  usecase "サインイン" as login
  usecase "カタログを管理" as catalog
  usecase "商品を返品" as refund
}

buyer --> order
buyer --> pay
buyer --> refund
order ..> login : include
pay ..> order : extend
refund ..> pay : include
admin --> catalog

note right of login
  注文前の
  必須の手順
end note
@enduml`,
    deployment: `@startuml
' 配置: ノード、成果物、データベース、クラウド
!pragma layout smetana

title 店舗の配置

cloud "CDN" as cdn {
  frame "キャッシュ" as cache
}

node "クラスタ" as cluster {
  node "ウェブ" as web {
    artifact "SPA" as spa
  }
  database "PostgreSQL" as db {
    storage "ボリューム" as volume
  }
}

cdn --> spa : 静的
spa --> db : JDBC
spa --> cache : 読み取り
volume --> db : ディスク
@enduml`,
    object: `@startuml
' オブジェクト: インスタンスのフィールドとリンク
!pragma layout smetana

title 注文のスナップショット

object "注文 #42" as order {
  status = "new"
  total = 120
}
object "購入者" as buyer {
  email = "a@example.com"
  city = "ベルリン"
}
object item
item : title = "本"
item : qty = 2
item : price = 60

buyer --> order : 注文した
order *-- item : 明細
@enduml`,
    timing: `@startuml
' タイミング: concise、robust、binary、clock
title リクエストのライフサイクル

concise "リクエスト" as request
robust "データベース" as db
binary "キャッシュ" as cache
clock "ティック" as clk with period 50

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
' 作業分解: 色と深さ
*[#1565C0] Code2Graph
**[#2E7D32] エディタ
*** コード
*** プレビュー
*** テーマ
**[#E65100] 言語
*** PlantUML
*** Mermaid
*** D2
**[#6A1B9A] 書き出し
*** SVG
*** PNG
*** ライブラリ
@endwbs`,
    nwdiag: `@startnwdiag
' ネットワーク: アドレスとリンク
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
' ArchiMate: ビジネス、アプリケーション、テクノロジー
!include <archimate/Archimate>
!pragma layout smetana

title 店舗 — ArchiMate のレイヤ

Business_Actor(customer, "顧客")
Business_Process(checkout, "購入手続き")
Business_Service(counter, "レジ")
Application_Component(api, "API")
Application_Service(catalog, "カタログ")
Technology_Node(cluster, "クラスタ")
Technology_Service(database, "データベース")

Rel_Triggering(customer, checkout, "開始する")
Rel_Flow(checkout, counter, "支払う")
Rel_Serving(catalog, api, "提供する")
Rel_Assignment(cluster, database, "ホストする")
Rel_Access(api, database, "読み取る")
@enduml`,
  },
  hi: {
    c4_context: `@startuml
' C4 Context: लोग, सिस्टम और बाहरी निर्भरताएँ
!pragma layout smetana
!include ./plantuml-lib/C4/C4_Context.puml

title Code2Graph का संदर्भ

AddElementTag("external", $bgColor="#999999", $fontColor="#ffffff")
AddRelTag("async", $textColor="#444444", $lineStyle=DashedLine())

Enterprise_Boundary(studio, "स्टूडियो") {
  Person(author, "लेखक", "आरेख लिखता और संपादित करता है")
  Person(reader, "पाठक", "पूर्वावलोकन और निर्यात देखता है")
}

System(app, "Code2Graph", "ब्राउज़र में आरेख संपादक")
System_Ext(mail, "मेल", "लाइब्रेरी सूचनाएँ", $tags="external")
SystemDb(files, "फ़ाइलें", "स्थानीय आरेख")
SystemQueue(jobs, "कतार", "पृष्ठभूमि निर्यात")

Rel(author, app, "संपादित करता है", "HTTPS")
Rel(reader, app, "नमूना खोलता है", "HTTPS")
Rel(app, mail, "सूचित करता है", "SMTP", $tags="async")
Rel_Back(app, files, "सहेजता है", "File API")
Rel_Neighbor(app, jobs, "कतार में डालता है", "async", $tags="async")

SHOW_LEGEND()
@enduml`,
    er: `@startuml
' ER: इकाइयाँ, कुंजियाँ और मिश्रित गणनीयता
!pragma layout smetana

title दुकान के ऑर्डर

skinparam linetype ortho

entity "ग्राहक" as customer {
  * id : uuid <<PK>>
  --
  email : string
  name : string
}

entity "ऑर्डर" as order {
  * id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  status : string
  total : decimal
}

entity "मद" as line {
  * id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  sku : string
  qty : int
}

entity "उत्पाद" as product {
  * sku : string <<PK>>
  --
  title : string
  price : decimal
}

customer ||--o{ order : देता है
order ||--|{ line : रखता है
product |o--o{ line : शामिल है
@enduml`,
    usecase: `@startuml
' उपयोग मामले: अभिनेता, include और extend
left to right direction

actor "खरीदार" as buyer
actor "प्रशासक" as admin

rectangle "दुकान" {
  usecase "ऑर्डर दें" as order
  usecase "भुगतान करें" as pay
  usecase "साइन इन" as login
  usecase "कैटलॉग प्रबंधित करें" as catalog
  usecase "वस्तु लौटाएँ" as refund
}

buyer --> order
buyer --> pay
buyer --> refund
order ..> login : include
pay ..> order : extend
refund ..> pay : include
admin --> catalog

note right of login
  ऑर्डर से पहले
  आवश्यक चरण
end note
@enduml`,
    deployment: `@startuml
' परिनियोजन: नोड, आर्टिफ़ैक्ट, डेटाबेस और क्लाउड
!pragma layout smetana

title दुकान का परिनियोजन

cloud "CDN" as cdn {
  frame "कैश" as cache
}

node "क्लस्टर" as cluster {
  node "वेब" as web {
    artifact "SPA" as spa
  }
  database "PostgreSQL" as db {
    storage "वॉल्यूम" as volume
  }
}

cdn --> spa : स्थिर
spa --> db : JDBC
spa --> cache : पठन
volume --> db : डिस्क
@enduml`,
    object: `@startuml
' ऑब्जेक्ट: इंस्टेंस फ़ील्ड और कड़ियाँ
!pragma layout smetana

title ऑर्डर का स्नैपशॉट

object "ऑर्डर #42" as order {
  status = "new"
  total = 120
}
object "खरीदार" as buyer {
  email = "a@example.com"
  city = "बर्लिन"
}
object item
item : title = "पुस्तक"
item : qty = 2
item : price = 60

buyer --> order : दिया
order *-- item : पंक्तियाँ
@enduml`,
    timing: `@startuml
' टाइमिंग: concise, robust, binary और clock
title अनुरोध का जीवनचक्र

concise "अनुरोध" as request
robust "डेटाबेस" as db
binary "कैश" as cache
clock "टिक" as clk with period 50

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
' कार्य विभाजन: रंग और गहराई
*[#1565C0] Code2Graph
**[#2E7D32] संपादक
*** कोड
*** पूर्वावलोकन
*** थीम
**[#E65100] भाषाएँ
*** PlantUML
*** Mermaid
*** D2
**[#6A1B9A] निर्यात
*** SVG
*** PNG
*** लाइब्रेरी
@endwbs`,
    nwdiag: `@startnwdiag
' नेटवर्क: पते और कड़ियाँ
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
' ArchiMate: व्यवसाय, अनुप्रयोग और तकनीक
!include <archimate/Archimate>
!pragma layout smetana

title दुकान — ArchiMate परतें

Business_Actor(customer, "ग्राहक")
Business_Process(checkout, "ऑर्डर पूरा करना")
Business_Service(counter, "काउंटर")
Application_Component(api, "API")
Application_Service(catalog, "कैटलॉग")
Technology_Node(cluster, "क्लस्टर")
Technology_Service(database, "डेटाबेस")

Rel_Triggering(customer, checkout, "शुरू करता है")
Rel_Flow(checkout, counter, "भुगतान करता है")
Rel_Serving(catalog, api, "सेवा देता है")
Rel_Assignment(cluster, database, "होस्ट करता है")
Rel_Access(api, database, "पढ़ता है")
@enduml`,
  },
  pt: {
    c4_context: `@startuml
' C4 Context: pessoas, o sistema e as dependências externas
!pragma layout smetana
!include ./plantuml-lib/C4/C4_Context.puml

title Contexto do Code2Graph

AddElementTag("external", $bgColor="#999999", $fontColor="#ffffff")
AddRelTag("async", $textColor="#444444", $lineStyle=DashedLine())

Enterprise_Boundary(studio, "Estúdio") {
  Person(author, "Autor", "Escreve e edita diagramas")
  Person(reader, "Leitor", "Vê a prévia e a exportação")
}

System(app, "Code2Graph", "Editor de diagramas no navegador")
System_Ext(mail, "E-mail", "Avisos da biblioteca", $tags="external")
SystemDb(files, "Arquivos", "Diagramas locais")
SystemQueue(jobs, "Fila", "Exportação em segundo plano")

Rel(author, app, "Edita", "HTTPS")
Rel(reader, app, "Abre um exemplo", "HTTPS")
Rel(app, mail, "Notifica", "SMTP", $tags="async")
Rel_Back(app, files, "Salva", "File API")
Rel_Neighbor(app, jobs, "Enfileira", "async", $tags="async")

SHOW_LEGEND()
@enduml`,
    er: `@startuml
' ER: entidades, chaves e cardinalidades mistas
!pragma layout smetana

title Pedidos da loja

skinparam linetype ortho

entity "Cliente" as customer {
  * id : uuid <<PK>>
  --
  email : string
  name : string
}

entity "Pedido" as order {
  * id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  status : string
  total : decimal
}

entity "Item" as line {
  * id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  sku : string
  qty : int
}

entity "Produto" as product {
  * sku : string <<PK>>
  --
  title : string
  price : decimal
}

customer ||--o{ order : faz
order ||--|{ line : contém
product |o--o{ line : inclui
@enduml`,
    usecase: `@startuml
' Casos de uso: atores, include e extend
left to right direction

actor "Comprador" as buyer
actor "Administrador" as admin

rectangle "Loja" {
  usecase "Fazer pedido" as order
  usecase "Pagar" as pay
  usecase "Entrar" as login
  usecase "Gerenciar o catálogo" as catalog
  usecase "Devolver item" as refund
}

buyer --> order
buyer --> pay
buyer --> refund
order ..> login : include
pay ..> order : extend
refund ..> pay : include
admin --> catalog

note right of login
  Etapa obrigatória
  antes de um pedido
end note
@enduml`,
    deployment: `@startuml
' Implantação: nós, artefatos, banco de dados e nuvem
!pragma layout smetana

title Implantação da loja

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

cdn --> spa : estático
spa --> db : JDBC
spa --> cache : leitura
volume --> db : disco
@enduml`,
    object: `@startuml
' Objetos: campos da instância e ligações
!pragma layout smetana

title Instantâneo do pedido

object "Pedido #42" as order {
  status = "new"
  total = 120
}
object "Comprador" as buyer {
  email = "a@example.com"
  city = "Berlim"
}
object item
item : title = "Livro"
item : qty = 2
item : price = 60

buyer --> order : fez
order *-- item : itens
@enduml`,
    timing: `@startuml
' Temporização: concise, robust, binary e clock
title Ciclo de vida da solicitação

concise "Solicitação" as request
robust "Banco de dados" as db
binary "Cache" as cache
clock "Pulso" as clk with period 50

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
' Decomposição do trabalho: cores e profundidade
*[#1565C0] Code2Graph
**[#2E7D32] Editor
*** Código
*** Prévia
*** Temas
**[#E65100] Linguagens
*** PlantUML
*** Mermaid
*** D2
**[#6A1B9A] Exportação
*** SVG
*** PNG
*** Biblioteca
@endwbs`,
    nwdiag: `@startnwdiag
' Rede: endereços e ligações
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
' ArchiMate: negócio, aplicação e tecnologia
!include <archimate/Archimate>
!pragma layout smetana

title Loja — camadas ArchiMate

Business_Actor(customer, "Cliente")
Business_Process(checkout, "Finalização")
Business_Service(counter, "Caixa")
Application_Component(api, "API")
Application_Service(catalog, "Catálogo")
Technology_Node(cluster, "Cluster")
Technology_Service(database, "Banco de dados")

Rel_Triggering(customer, checkout, "Inicia")
Rel_Flow(checkout, counter, "Paga")
Rel_Serving(catalog, api, "Atende")
Rel_Assignment(cluster, database, "Hospeda")
Rel_Access(api, database, "Lê")
@enduml`,
  },
  de: {
    c4_context: `@startuml
' C4 Context: Personen, das System und externe Abhängigkeiten
!pragma layout smetana
!include ./plantuml-lib/C4/C4_Context.puml

title Code2Graph-Kontext

AddElementTag("external", $bgColor="#999999", $fontColor="#ffffff")
AddRelTag("async", $textColor="#444444", $lineStyle=DashedLine())

Enterprise_Boundary(studio, "Studio") {
  Person(author, "Autor", "Schreibt und bearbeitet Diagramme")
  Person(reader, "Leser", "Sieht Vorschau und Export")
}

System(app, "Code2Graph", "Diagrammeditor im Browser")
System_Ext(mail, "E-Mail", "Bibliotheksbenachrichtigungen", $tags="external")
SystemDb(files, "Dateien", "Lokale Diagramme")
SystemQueue(jobs, "Warteschlange", "Export im Hintergrund")

Rel(author, app, "Bearbeitet", "HTTPS")
Rel(reader, app, "Öffnet ein Beispiel", "HTTPS")
Rel(app, mail, "Benachrichtigt", "SMTP", $tags="async")
Rel_Back(app, files, "Speichert", "File API")
Rel_Neighbor(app, jobs, "Reiht ein", "async", $tags="async")

SHOW_LEGEND()
@enduml`,
    er: `@startuml
' ER: Entitäten, Schlüssel und gemischte Kardinalitäten
!pragma layout smetana

title Shopbestellungen

skinparam linetype ortho

entity "Kunde" as customer {
  * id : uuid <<PK>>
  --
  email : string
  name : string
}

entity "Bestellung" as order {
  * id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  status : string
  total : decimal
}

entity "Position" as line {
  * id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  sku : string
  qty : int
}

entity "Produkt" as product {
  * sku : string <<PK>>
  --
  title : string
  price : decimal
}

customer ||--o{ order : aufgibt
order ||--|{ line : enthält
product |o--o{ line : umfasst
@enduml`,
    usecase: `@startuml
' Anwendungsfälle: Akteure, include und extend
left to right direction

actor "Käufer" as buyer
actor "Administrator" as admin

rectangle "Shop" {
  usecase "Bestellung aufgeben" as order
  usecase "Bezahlen" as pay
  usecase "Anmelden" as login
  usecase "Katalog verwalten" as catalog
  usecase "Artikel zurückgeben" as refund
}

buyer --> order
buyer --> pay
buyer --> refund
order ..> login : include
pay ..> order : extend
refund ..> pay : include
admin --> catalog

note right of login
  Pflichtschritt
  vor einer Bestellung
end note
@enduml`,
    deployment: `@startuml
' Bereitstellung: Knoten, Artefakte, Datenbank und Cloud
!pragma layout smetana

title Bereitstellung des Shops

cloud "CDN" as cdn {
  frame "Cache" as cache
}

node "Cluster" as cluster {
  node "Web" as web {
    artifact "SPA" as spa
  }
  database "PostgreSQL" as db {
    storage "Datenträger" as volume
  }
}

cdn --> spa : statisch
spa --> db : JDBC
spa --> cache : Lesen
volume --> db : Platte
@enduml`,
    object: `@startuml
' Objekte: Instanzfelder und Verknüpfungen
!pragma layout smetana

title Schnappschuss der Bestellung

object "Bestellung #42" as order {
  status = "new"
  total = 120
}
object "Käufer" as buyer {
  email = "a@example.com"
  city = "Berlin"
}
object item
item : title = "Buch"
item : qty = 2
item : price = 60

buyer --> order : aufgegeben
order *-- item : Positionen
@enduml`,
    timing: `@startuml
' Timing: concise, robust, binary und clock
title Lebenszyklus der Anfrage

concise "Anfrage" as request
robust "Datenbank" as db
binary "Cache" as cache
clock "Takt" as clk with period 50

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
' Projektstruktur: Farben und Tiefe
*[#1565C0] Code2Graph
**[#2E7D32] Editor
*** Code
*** Vorschau
*** Themen
**[#E65100] Sprachen
*** PlantUML
*** Mermaid
*** D2
**[#6A1B9A] Export
*** SVG
*** PNG
*** Bibliothek
@endwbs`,
    nwdiag: `@startnwdiag
' Netz: Adressen und Verbindungen
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
' ArchiMate: Geschäft, Anwendung und Technologie
!include <archimate/Archimate>
!pragma layout smetana

title Shop — ArchiMate-Schichten

Business_Actor(customer, "Kunde")
Business_Process(checkout, "Kaufabschluss")
Business_Service(counter, "Kasse")
Application_Component(api, "API")
Application_Service(catalog, "Katalog")
Technology_Node(cluster, "Cluster")
Technology_Service(database, "Datenbank")

Rel_Triggering(customer, checkout, "Startet")
Rel_Flow(checkout, counter, "Zahlt")
Rel_Serving(catalog, api, "Bedient")
Rel_Assignment(cluster, database, "Hostet")
Rel_Access(api, database, "Liest")
@enduml`,
  },
  ar: {
    c4_context: `@startuml
' C4 Context: الأشخاص والنظام والاعتمادات الخارجية
!pragma layout smetana
!include ./plantuml-lib/C4/C4_Context.puml

title سياق Code2Graph

AddElementTag("external", $bgColor="#999999", $fontColor="#ffffff")
AddRelTag("async", $textColor="#444444", $lineStyle=DashedLine())

Enterprise_Boundary(studio, "الاستوديو") {
  Person(author, "المؤلف", "يكتب المخططات ويعدلها")
  Person(reader, "القارئ", "يعرض المعاينة والتصدير")
}

System(app, "Code2Graph", "محرر مخططات في المتصفح")
System_Ext(mail, "البريد", "إشعارات المكتبة", $tags="external")
SystemDb(files, "الملفات", "مخططات محلية")
SystemQueue(jobs, "الطابور", "تصدير في الخلفية")

Rel(author, app, "يحرر", "HTTPS")
Rel(reader, app, "يفتح مثالاً", "HTTPS")
Rel(app, mail, "يُخطر", "SMTP", $tags="async")
Rel_Back(app, files, "يحفظ", "File API")
Rel_Neighbor(app, jobs, "يضيف إلى الطابور", "async", $tags="async")

SHOW_LEGEND()
@enduml`,
    er: `@startuml
' ER: الكيانات والمفاتيح والتعدديات المختلطة
!pragma layout smetana

title طلبات المتجر

skinparam linetype ortho

entity "العميل" as customer {
  * id : uuid <<PK>>
  --
  email : string
  name : string
}

entity "الطلب" as order {
  * id : uuid <<PK>>
  --
  customer_id : uuid <<FK>>
  status : string
  total : decimal
}

entity "البند" as line {
  * id : uuid <<PK>>
  --
  order_id : uuid <<FK>>
  sku : string
  qty : int
}

entity "المنتج" as product {
  * sku : string <<PK>>
  --
  title : string
  price : decimal
}

customer ||--o{ order : يُنشئ
order ||--|{ line : يحتوي
product |o--o{ line : يتضمن
@enduml`,
    usecase: `@startuml
' حالات الاستخدام: الفاعلون و include و extend
left to right direction

actor "المشتري" as buyer
actor "المدير" as admin

rectangle "المتجر" {
  usecase "إنشاء طلب" as order
  usecase "الدفع" as pay
  usecase "تسجيل الدخول" as login
  usecase "إدارة الفهرس" as catalog
  usecase "إرجاع صنف" as refund
}

buyer --> order
buyer --> pay
buyer --> refund
order ..> login : include
pay ..> order : extend
refund ..> pay : include
admin --> catalog

note right of login
  خطوة إلزامية
  قبل الطلب
end note
@enduml`,
    deployment: `@startuml
' النشر: العقد والنتاجات وقاعدة البيانات والسحابة
!pragma layout smetana

title نشر المتجر

cloud "CDN" as cdn {
  frame "التخزين المؤقت" as cache
}

node "العنقود" as cluster {
  node "الويب" as web {
    artifact "SPA" as spa
  }
  database "PostgreSQL" as db {
    storage "وحدة التخزين" as volume
  }
}

cdn --> spa : ثابت
spa --> db : JDBC
spa --> cache : قراءة
volume --> db : قرص
@enduml`,
    object: `@startuml
' الكائنات: حقول النسخة والروابط
!pragma layout smetana

title لقطة الطلب

object "الطلب #42" as order {
  status = "new"
  total = 120
}
object "المشتري" as buyer {
  email = "a@example.com"
  city = "برلين"
}
object item
item : title = "كتاب"
item : qty = 2
item : price = 60

buyer --> order : قدّم
order *-- item : البنود
@enduml`,
    timing: `@startuml
' التوقيت: concise و robust و binary و clock
title دورة حياة الطلب

concise "الطلب" as request
robust "قاعدة البيانات" as db
binary "ذاكرة التخزين المؤقت" as cache
clock "النبضة" as clk with period 50

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
' تفكيك العمل: الألوان والعمق
*[#1565C0] Code2Graph
**[#2E7D32] المحرر
*** الرمز
*** المعاينة
*** السمات
**[#E65100] اللغات
*** PlantUML
*** Mermaid
*** D2
**[#6A1B9A] التصدير
*** SVG
*** PNG
*** المكتبة
@endwbs`,
    nwdiag: `@startnwdiag
' الشبكة: العناوين والروابط
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
' ArchiMate: الأعمال والتطبيق والتقنية
!include <archimate/Archimate>
!pragma layout smetana

title المتجر — طبقات ArchiMate

Business_Actor(customer, "العميل")
Business_Process(checkout, "إتمام الشراء")
Business_Service(counter, "الصندوق")
Application_Component(api, "API")
Application_Service(catalog, "الفهرس")
Technology_Node(cluster, "العنقود")
Technology_Service(database, "قاعدة البيانات")

Rel_Triggering(customer, checkout, "يبدأ")
Rel_Flow(checkout, counter, "يدفع")
Rel_Serving(catalog, api, "يخدم")
Rel_Assignment(cluster, database, "يستضيف")
Rel_Access(api, database, "يقرأ")
@enduml`,
  },
};
