import type { AppLocale } from "@/constants/i18n";

export const D2_EXTRA: Record<
  Exclude<AppLocale, "ru" | "en">,
  Record<"flow" | "sequence" | "classes" | "sql" | "architecture", string>
> = {
  es: {
    flow: `direction: right

classes: {
  accent: {
    style: {
      fill: "#dbeafe"
      stroke: "#1d4ed8"
      stroke-width: 2
      font-color: "#0f172a"
      bold: true
      shadow: true
      border-radius: 8
    }
  }
}

caption: "Flujo de la solicitud" {
  shape: text
  near: user
  style: {
    italic: true
    underline: true
    font-size: 16
    font: mono
    text-transform: uppercase
  }
}

user: "Usuario" {
  shape: person
  class: accent
  icon: https://icons.terrastruct.com/essentials/004-picture.svg
  tooltip: "Abre la edición"
  link: https://example.com
  width: 160
  height: 120
}

api: API {
  shape: hexagon
  style.multiple: true
}

db: "Base de datos" {
  shape: cylinder
  style: {
    fill: "#fef3c7"
    stroke: "#d97706"
    opacity: 0.95
  }
}

docs: "Especificación" {
  shape: document
}

queue: "Eventos" {
  shape: queue
}

cache: "Caché" {
  shape: stored_data
}

decision: "¿Listo?" {
  shape: diamond
}

user -> api: "Solicitud" {
  style: {
    animated: true
    stroke: "#2563eb"
    stroke-dash: 4
  }
}
api -> decision: "Comprobación"
decision -> db: "Consulta"
decision -> docs: "Rechazo"
api -> queue: "Publicación"
queue -> cache: "Calentar"`,
    sequence: `direction: down

checkout: "Pago del pedido" {
  shape: sequence_diagram
  buyer: "Comprador"
  shop: "Tienda"
  pay: "Pago"
  stock: "Almacén"
  buyer -> shop: "Hacer pedido"
  shop -> pay: "Cobrar"
  pay -> shop: "Vale"
  shop -> stock: "Reservar"
  stock -> shop: "Hay existencias"
  shop -> buyer: "Recibo"
}`,
    classes: `direction: down

User: "Usuario" {
  shape: class
  +id: int
  +name: string
  #email: string
  -token: string
  +login(): bool
  +logout(): void
}

Order: "Pedido" {
  shape: class
  +id: int
  +total: float
  +addItem(name: string): void
}

User -> Order: "realiza" {
  style.animated: true
}`,
    sql: `direction: right

users: users {
  shape: sql_table
  id: int {constraint: primary_key}
  email: string {constraint: unique}
  name: string
}

orders: orders {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

users.id -> orders.user_id`,
    architecture: `direction: left

network: "Red" {
  grid-rows: 2
  grid-columns: 3
  grid-gap: 24

  web: "Sitio" {
    shape: rectangle
  }
  api: API {
    shape: hexagon
  }
  queue: "Cola" {
    shape: queue
  }
  page: "Documento" {
    shape: page
  }
  job: "Tarea" {
    shape: step
  }
  hint: "Sugerencia" {
    shape: callout
  }

  web -> api: HTTPS
  api -> queue: "Evento"
}

cloud: "Nube" {
  shape: cloud
  style.fill-pattern: dots
}
badge: "Distintivo" {
  shape: oval
}
dot: "Punto" {
  shape: circle
}
bundle: "Paquete" {
  shape: package
}
input: "Entrada" {
  shape: parallelogram
}
tile: "Baldosa" {
  shape: square
  style.double-border: true
}

network.web -> cloud: CDN
cloud -> bundle: "Estáticos"
input -> badge: "Validar"
dot -> job: "Pulso"`,
  },
  zh: {
    flow: `direction: right

classes: {
  accent: {
    style: {
      fill: "#dbeafe"
      stroke: "#1d4ed8"
      stroke-width: 2
      font-color: "#0f172a"
      bold: true
      shadow: true
      border-radius: 8
    }
  }
}

caption: "请求流程" {
  shape: text
  near: user
  style: {
    italic: true
    underline: true
    font-size: 16
    font: mono
    text-transform: uppercase
  }
}

user: "用户" {
  shape: person
  class: accent
  icon: https://icons.terrastruct.com/essentials/004-picture.svg
  tooltip: "打开编辑器"
  link: https://example.com
  width: 160
  height: 120
}

api: API {
  shape: hexagon
  style.multiple: true
}

db: "数据库" {
  shape: cylinder
  style: {
    fill: "#fef3c7"
    stroke: "#d97706"
    opacity: 0.95
  }
}

docs: "规格" {
  shape: document
}

queue: "事件" {
  shape: queue
}

cache: "缓存" {
  shape: stored_data
}

decision: "就绪？" {
  shape: diamond
}

user -> api: "请求" {
  style: {
    animated: true
    stroke: "#2563eb"
    stroke-dash: 4
  }
}
api -> decision: "检查"
decision -> db: "查询"
decision -> docs: "拒绝"
api -> queue: "发布"
queue -> cache: "预热"`,
    sequence: `direction: down

checkout: "结账" {
  shape: sequence_diagram
  buyer: "买家"
  shop: "商店"
  pay: "支付"
  stock: "仓库"
  buyer -> shop: "下单"
  shop -> pay: "扣款"
  pay -> shop: "好"
  shop -> stock: "预留"
  stock -> shop: "有货"
  shop -> buyer: "收据"
}`,
    classes: `direction: down

User: "用户" {
  shape: class
  +id: int
  +name: string
  #email: string
  -token: string
  +login(): bool
  +logout(): void
}

Order: "订单" {
  shape: class
  +id: int
  +total: float
  +addItem(name: string): void
}

User -> Order: "下单" {
  style.animated: true
}`,
    sql: `direction: right

users: users {
  shape: sql_table
  id: int {constraint: primary_key}
  email: string {constraint: unique}
  name: string
}

orders: orders {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

users.id -> orders.user_id`,
    architecture: `direction: left

network: "网络" {
  grid-rows: 2
  grid-columns: 3
  grid-gap: 24

  web: "网页" {
    shape: rectangle
  }
  api: API {
    shape: hexagon
  }
  queue: "队列" {
    shape: queue
  }
  page: "文档" {
    shape: page
  }
  job: "任务" {
    shape: step
  }
  hint: "提示" {
    shape: callout
  }

  web -> api: HTTPS
  api -> queue: "事件"
}

cloud: "云" {
  shape: cloud
  style.fill-pattern: dots
}
badge: "徽章" {
  shape: oval
}
dot: "点" {
  shape: circle
}
bundle: "资源包" {
  shape: package
}
input: "输入" {
  shape: parallelogram
}
tile: "磁贴" {
  shape: square
  style.double-border: true
}

network.web -> cloud: CDN
cloud -> bundle: "静态资源"
input -> badge: "验证"
dot -> job: "节拍"`,
  },
  ja: {
    flow: `direction: right

classes: {
  accent: {
    style: {
      fill: "#dbeafe"
      stroke: "#1d4ed8"
      stroke-width: 2
      font-color: "#0f172a"
      bold: true
      shadow: true
      border-radius: 8
    }
  }
}

caption: "リクエストの流れ" {
  shape: text
  near: user
  style: {
    italic: true
    underline: true
    font-size: 16
    font: mono
    text-transform: uppercase
  }
}

user: "ユーザー" {
  shape: person
  class: accent
  icon: https://icons.terrastruct.com/essentials/004-picture.svg
  tooltip: "編集画面を開く"
  link: https://example.com
  width: 160
  height: 120
}

api: API {
  shape: hexagon
  style.multiple: true
}

db: "データベース" {
  shape: cylinder
  style: {
    fill: "#fef3c7"
    stroke: "#d97706"
    opacity: 0.95
  }
}

docs: "仕様" {
  shape: document
}

queue: "出来事" {
  shape: queue
}

cache: "キャッシュ" {
  shape: stored_data
}

decision: "準備完了？" {
  shape: diamond
}

user -> api: "要求" {
  style: {
    animated: true
    stroke: "#2563eb"
    stroke-dash: 4
  }
}
api -> decision: "確認"
decision -> db: "照会"
decision -> docs: "拒否"
api -> queue: "公開"
queue -> cache: "予熱"`,
    sequence: `direction: down

checkout: "注文手続き" {
  shape: sequence_diagram
  buyer: "購入者"
  shop: "店舗"
  pay: "支払い"
  stock: "倉庫"
  buyer -> shop: "注文する"
  shop -> pay: "請求する"
  pay -> shop: "了解"
  shop -> stock: "確保"
  stock -> shop: "在庫あり"
  shop -> buyer: "領収書"
}`,
    classes: `direction: down

User: "ユーザー" {
  shape: class
  +id: int
  +name: string
  #email: string
  -token: string
  +login(): bool
  +logout(): void
}

Order: "注文" {
  shape: class
  +id: int
  +total: float
  +addItem(name: string): void
}

User -> Order: "注文する" {
  style.animated: true
}`,
    sql: `direction: right

users: users {
  shape: sql_table
  id: int {constraint: primary_key}
  email: string {constraint: unique}
  name: string
}

orders: orders {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

users.id -> orders.user_id`,
    architecture: `direction: left

network: "ネットワーク" {
  grid-rows: 2
  grid-columns: 3
  grid-gap: 24

  web: "ウェブ" {
    shape: rectangle
  }
  api: API {
    shape: hexagon
  }
  queue: "待ち行列" {
    shape: queue
  }
  page: "文書" {
    shape: page
  }
  job: "作業" {
    shape: step
  }
  hint: "手掛かり" {
    shape: callout
  }

  web -> api: HTTPS
  api -> queue: "出来事"
}

cloud: "雲" {
  shape: cloud
  style.fill-pattern: dots
}
badge: "標章" {
  shape: oval
}
dot: "点" {
  shape: circle
}
bundle: "一式" {
  shape: package
}
input: "入力" {
  shape: parallelogram
}
tile: "マス" {
  shape: square
  style.double-border: true
}

network.web -> cloud: CDN
cloud -> bundle: "静的素材"
input -> badge: "検証"
dot -> job: "拍"`,
  },
  hi: {
    flow: `direction: right

classes: {
  accent: {
    style: {
      fill: "#dbeafe"
      stroke: "#1d4ed8"
      stroke-width: 2
      font-color: "#0f172a"
      bold: true
      shadow: true
      border-radius: 8
    }
  }
}

caption: "अनुरोध प्रवाह" {
  shape: text
  near: user
  style: {
    italic: true
    underline: true
    font-size: 16
    font: mono
    text-transform: uppercase
  }
}

user: "उपयोगकर्ता" {
  shape: person
  class: accent
  icon: https://icons.terrastruct.com/essentials/004-picture.svg
  tooltip: "संपादन खोलता है"
  link: https://example.com
  width: 160
  height: 120
}

api: API {
  shape: hexagon
  style.multiple: true
}

db: "डेटाबेस" {
  shape: cylinder
  style: {
    fill: "#fef3c7"
    stroke: "#d97706"
    opacity: 0.95
  }
}

docs: "विनिर्देश" {
  shape: document
}

queue: "घटनाएँ" {
  shape: queue
}

cache: "कैश" {
  shape: stored_data
}

decision: "तैयार?" {
  shape: diamond
}

user -> api: "अनुरोध" {
  style: {
    animated: true
    stroke: "#2563eb"
    stroke-dash: 4
  }
}
api -> decision: "जाँच"
decision -> db: "पूछताछ"
decision -> docs: "अस्वीकार"
api -> queue: "प्रकाशन"
queue -> cache: "तैयारी"`,
    sequence: `direction: down

checkout: "ऑर्डर पूरा करना" {
  shape: sequence_diagram
  buyer: "खरीदार"
  shop: "दुकान"
  pay: "भुगतान"
  stock: "गोदाम"
  buyer -> shop: "ऑर्डर दें"
  shop -> pay: "राशि काटें"
  pay -> shop: "ठीक"
  shop -> stock: "आरक्षित करें"
  stock -> shop: "उपलब्ध"
  shop -> buyer: "रसीद"
}`,
    classes: `direction: down

User: "उपयोगकर्ता" {
  shape: class
  +id: int
  +name: string
  #email: string
  -token: string
  +login(): bool
  +logout(): void
}

Order: "ऑर्डर" {
  shape: class
  +id: int
  +total: float
  +addItem(name: string): void
}

User -> Order: "ऑर्डर करता है" {
  style.animated: true
}`,
    sql: `direction: right

users: users {
  shape: sql_table
  id: int {constraint: primary_key}
  email: string {constraint: unique}
  name: string
}

orders: orders {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

users.id -> orders.user_id`,
    architecture: `direction: left

network: "नेटवर्क" {
  grid-rows: 2
  grid-columns: 3
  grid-gap: 24

  web: "वेब" {
    shape: rectangle
  }
  api: API {
    shape: hexagon
  }
  queue: "कतार" {
    shape: queue
  }
  page: "दस्तावेज़" {
    shape: page
  }
  job: "कार्य" {
    shape: step
  }
  hint: "संकेत" {
    shape: callout
  }

  web -> api: HTTPS
  api -> queue: "घटना"
}

cloud: "बादल" {
  shape: cloud
  style.fill-pattern: dots
}
badge: "चिह्न" {
  shape: oval
}
dot: "बिंदु" {
  shape: circle
}
bundle: "संकुल" {
  shape: package
}
input: "प्रविष्टि" {
  shape: parallelogram
}
tile: "पट्टिका" {
  shape: square
  style.double-border: true
}

network.web -> cloud: CDN
cloud -> bundle: "स्थिर सामग्री"
input -> badge: "सत्यापन"
dot -> job: "स्पंद"`,
  },
  pt: {
    flow: `direction: right

classes: {
  accent: {
    style: {
      fill: "#dbeafe"
      stroke: "#1d4ed8"
      stroke-width: 2
      font-color: "#0f172a"
      bold: true
      shadow: true
      border-radius: 8
    }
  }
}

caption: "Fluxo da solicitação" {
  shape: text
  near: user
  style: {
    italic: true
    underline: true
    font-size: 16
    font: mono
    text-transform: uppercase
  }
}

user: "Usuário" {
  shape: person
  class: accent
  icon: https://icons.terrastruct.com/essentials/004-picture.svg
  tooltip: "Abre a edição"
  link: https://example.com
  width: 160
  height: 120
}

api: API {
  shape: hexagon
  style.multiple: true
}

db: "Banco de dados" {
  shape: cylinder
  style: {
    fill: "#fef3c7"
    stroke: "#d97706"
    opacity: 0.95
  }
}

docs: "Especificação" {
  shape: document
}

queue: "Eventos" {
  shape: queue
}

cache: "Memória" {
  shape: stored_data
}

decision: "Pronto?" {
  shape: diamond
}

user -> api: "Solicitação" {
  style: {
    animated: true
    stroke: "#2563eb"
    stroke-dash: 4
  }
}
api -> decision: "Verificação"
decision -> db: "Consulta"
decision -> docs: "Recusa"
api -> queue: "Publicação"
queue -> cache: "Aquecer"`,
    sequence: `direction: down

checkout: "Fechamento do pedido" {
  shape: sequence_diagram
  buyer: "Comprador"
  shop: "Loja"
  pay: "Pagamento"
  stock: "Armazém"
  buyer -> shop: "Fazer pedido"
  shop -> pay: "Cobrar"
  pay -> shop: "Certo"
  shop -> stock: "Reservar"
  stock -> shop: "Em estoque"
  shop -> buyer: "Recibo"
}`,
    classes: `direction: down

User: "Usuário" {
  shape: class
  +id: int
  +name: string
  #email: string
  -token: string
  +login(): bool
  +logout(): void
}

Order: "Pedido" {
  shape: class
  +id: int
  +total: float
  +addItem(name: string): void
}

User -> Order: "faz" {
  style.animated: true
}`,
    sql: `direction: right

users: users {
  shape: sql_table
  id: int {constraint: primary_key}
  email: string {constraint: unique}
  name: string
}

orders: orders {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

users.id -> orders.user_id`,
    architecture: `direction: left

network: "Rede" {
  grid-rows: 2
  grid-columns: 3
  grid-gap: 24

  web: "Site" {
    shape: rectangle
  }
  api: API {
    shape: hexagon
  }
  queue: "Fila" {
    shape: queue
  }
  page: "Documento" {
    shape: page
  }
  job: "Tarefa" {
    shape: step
  }
  hint: "Dica" {
    shape: callout
  }

  web -> api: HTTPS
  api -> queue: "Evento"
}

cloud: "Nuvem" {
  shape: cloud
  style.fill-pattern: dots
}
badge: "Distintivo" {
  shape: oval
}
dot: "Ponto" {
  shape: circle
}
bundle: "Pacote" {
  shape: package
}
input: "Entrada" {
  shape: parallelogram
}
tile: "Ladrilho" {
  shape: square
  style.double-border: true
}

network.web -> cloud: CDN
cloud -> bundle: "Estáticos"
input -> badge: "Validar"
dot -> job: "Pulso"`,
  },
  de: {
    flow: `direction: right

classes: {
  accent: {
    style: {
      fill: "#dbeafe"
      stroke: "#1d4ed8"
      stroke-width: 2
      font-color: "#0f172a"
      bold: true
      shadow: true
      border-radius: 8
    }
  }
}

caption: "Anfragefluss" {
  shape: text
  near: user
  style: {
    italic: true
    underline: true
    font-size: 16
    font: mono
    text-transform: uppercase
  }
}

user: "Benutzer" {
  shape: person
  class: accent
  icon: https://icons.terrastruct.com/essentials/004-picture.svg
  tooltip: "Öffnet die Bearbeitung"
  link: https://example.com
  width: 160
  height: 120
}

api: API {
  shape: hexagon
  style.multiple: true
}

db: "Datenbank" {
  shape: cylinder
  style: {
    fill: "#fef3c7"
    stroke: "#d97706"
    opacity: 0.95
  }
}

docs: "Spezifikation" {
  shape: document
}

queue: "Ereignisse" {
  shape: queue
}

cache: "Zwischenspeicher" {
  shape: stored_data
}

decision: "Bereit?" {
  shape: diamond
}

user -> api: "Anfrage" {
  style: {
    animated: true
    stroke: "#2563eb"
    stroke-dash: 4
  }
}
api -> decision: "Prüfung"
decision -> db: "Abfrage"
decision -> docs: "Ablehnung"
api -> queue: "Veröffentlichung"
queue -> cache: "Aufwärmen"`,
    sequence: `direction: down

checkout: "Bestellabschluss" {
  shape: sequence_diagram
  buyer: "Käufer"
  shop: "Laden"
  pay: "Zahlung"
  stock: "Lager"
  buyer -> shop: "Bestellung aufgeben"
  shop -> pay: "Abbuchen"
  pay -> shop: "Gut"
  shop -> stock: "Reservieren"
  stock -> shop: "Auf Lager"
  shop -> buyer: "Beleg"
}`,
    classes: `direction: down

User: "Benutzer" {
  shape: class
  +id: int
  +name: string
  #email: string
  -token: string
  +login(): bool
  +logout(): void
}

Order: "Bestellung" {
  shape: class
  +id: int
  +total: float
  +addItem(name: string): void
}

User -> Order: "erteilt" {
  style.animated: true
}`,
    sql: `direction: right

users: users {
  shape: sql_table
  id: int {constraint: primary_key}
  email: string {constraint: unique}
  name: string
}

orders: orders {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

users.id -> orders.user_id`,
    architecture: `direction: left

network: "Netz" {
  grid-rows: 2
  grid-columns: 3
  grid-gap: 24

  web: "Webseite" {
    shape: rectangle
  }
  api: API {
    shape: hexagon
  }
  queue: "Warteschlange" {
    shape: queue
  }
  page: "Dokument" {
    shape: page
  }
  job: "Aufgabe" {
    shape: step
  }
  hint: "Hinweis" {
    shape: callout
  }

  web -> api: HTTPS
  api -> queue: "Ereignis"
}

cloud: "Wolke" {
  shape: cloud
  style.fill-pattern: dots
}
badge: "Abzeichen" {
  shape: oval
}
dot: "Punkt" {
  shape: circle
}
bundle: "Paket" {
  shape: package
}
input: "Eingabe" {
  shape: parallelogram
}
tile: "Kachel" {
  shape: square
  style.double-border: true
}

network.web -> cloud: CDN
cloud -> bundle: "Statische Dateien"
input -> badge: "Prüfen"
dot -> job: "Takt"`,
  },
  ar: {
    flow: `direction: right

classes: {
  accent: {
    style: {
      fill: "#dbeafe"
      stroke: "#1d4ed8"
      stroke-width: 2
      font-color: "#0f172a"
      bold: true
      shadow: true
      border-radius: 8
    }
  }
}

caption: "تدفق الطلب" {
  shape: text
  near: user
  style: {
    italic: true
    underline: true
    font-size: 16
    font: mono
    text-transform: uppercase
  }
}

user: "المستخدم" {
  shape: person
  class: accent
  icon: https://icons.terrastruct.com/essentials/004-picture.svg
  tooltip: "يفتح المحرر"
  link: https://example.com
  width: 160
  height: 120
}

api: API {
  shape: hexagon
  style.multiple: true
}

db: "قاعدة البيانات" {
  shape: cylinder
  style: {
    fill: "#fef3c7"
    stroke: "#d97706"
    opacity: 0.95
  }
}

docs: "المواصفة" {
  shape: document
}

queue: "الأحداث" {
  shape: queue
}

cache: "ذاكرة مؤقتة" {
  shape: stored_data
}

decision: "جاهز؟" {
  shape: diamond
}

user -> api: "طلب" {
  style: {
    animated: true
    stroke: "#2563eb"
    stroke-dash: 4
  }
}
api -> decision: "تحقق"
decision -> db: "استعلام"
decision -> docs: "رفض"
api -> queue: "نشر"
queue -> cache: "إحماء"`,
    sequence: `direction: down

checkout: "إتمام الطلب" {
  shape: sequence_diagram
  buyer: "المشتري"
  shop: "المتجر"
  pay: "الدفع"
  stock: "المستودع"
  buyer -> shop: "تقديم الطلب"
  shop -> pay: "خصم المبلغ"
  pay -> shop: "حسنًا"
  shop -> stock: "حجز"
  stock -> shop: "متوفر"
  shop -> buyer: "إيصال"
}`,
    classes: `direction: down

User: "المستخدم" {
  shape: class
  +id: int
  +name: string
  #email: string
  -token: string
  +login(): bool
  +logout(): void
}

Order: "الطلب" {
  shape: class
  +id: int
  +total: float
  +addItem(name: string): void
}

User -> Order: "يُنشئ" {
  style.animated: true
}`,
    sql: `direction: right

users: users {
  shape: sql_table
  id: int {constraint: primary_key}
  email: string {constraint: unique}
  name: string
}

orders: orders {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

users.id -> orders.user_id`,
    architecture: `direction: left

network: "الشبكة" {
  grid-rows: 2
  grid-columns: 3
  grid-gap: 24

  web: "الويب" {
    shape: rectangle
  }
  api: API {
    shape: hexagon
  }
  queue: "طابور" {
    shape: queue
  }
  page: "مستند" {
    shape: page
  }
  job: "مهمة" {
    shape: step
  }
  hint: "تلميح" {
    shape: callout
  }

  web -> api: HTTPS
  api -> queue: "حدث"
}

cloud: "سحابة" {
  shape: cloud
  style.fill-pattern: dots
}
badge: "شارة" {
  shape: oval
}
dot: "نقطة" {
  shape: circle
}
bundle: "حزمة" {
  shape: package
}
input: "إدخال" {
  shape: parallelogram
}
tile: "بلاطة" {
  shape: square
  style.double-border: true
}

network.web -> cloud: CDN
cloud -> bundle: "ملفات ثابتة"
input -> badge: "تحقق"
dot -> job: "نبضة"`,
  },
};

export const GRAPHML_EXTRA: Record<
  Exclude<AppLocale, "ru" | "en">,
  Record<"flow" | "decision" | "architecture" | "states" | "network", string>
> = {
  es: {
    flow: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Flujo de la solicitud de izquierda a derecha: colores de los nodos y etiquetas en las flechas opuestas</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Usuario</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Base de datos</data>
    </node>
    <edge source="user" target="api">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">Solicitud</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">Lectura</data>
    </edge>
    <edge source="db" target="api">
      <data key="color">#15803d</data>
      <data key="edgeLabel">Filas</data>
    </edge>
    <edge source="api" target="user">
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">Respuesta</data>
    </edge>
  </graph>
</graphml>`,
    decision: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Decisión de arriba abajo: rombo con ramas Sí y No en color</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="start">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Inicio</data>
    </node>
    <node id="check">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Comprobación</data>
    </node>
    <node id="ok">
      <data key="shape">rectangle</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">Hecho</data>
    </node>
    <node id="retry">
      <data key="shape">rectangle</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">Reintento</data>
    </node>
    <edge source="start" target="check">
      <data key="color">#64748b</data>
    </edge>
    <edge source="check" target="ok">
      <data key="color">#15803d</data>
      <data key="edgeLabel">Sí</data>
    </edge>
    <edge source="check" target="retry">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">No</data>
    </edge>
    <edge source="retry" target="check">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">Otra vez</data>
    </edge>
  </graph>
</graphml>`,
    architecture: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Arquitectura de izquierda a derecha, arista discontinua para el evento</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Usuario</data>
    </node>
    <node id="web">
      <data key="shape">rectangle</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">Sitio</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="queue">
      <data key="shape">rectangle</data>
      <data key="fill">#ede9fe</data>
      <data key="stroke">#7c3aed</data>
      <data key="label">Cola</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Base de datos</data>
    </node>
    <edge source="user" target="web">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">HTTPS</data>
    </edge>
    <edge source="web" target="api">
      <data key="color">#0284c7</data>
      <data key="edgeLabel">Llamada</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">Consulta</data>
    </edge>
    <edge source="api" target="queue">
      <data key="style">dashed</data>
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">Evento</data>
    </edge>
    <node id="gate">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Puerta de enlace</data>
      <data key="loc">12,40</data>
      <port name="in"/>
      <port name="out"/>
    </node>
    <hyperedge id="fanout">
      <desc>Difusión</desc>
      <endpoint node="web"/>
      <endpoint node="api"/>
      <endpoint node="queue"/>
    </hyperedge>
    <edge source="api" target="gate">
      <data key="color">#d97706</data>
      <data key="edgeLabel">Puerta de enlace</data>
    </edge>
  </graph>
</graphml>`,
    states: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Estados de derecha a izquierda, con un ciclo de retorno</desc>
  <graph edgedefault="directed" rankdir="RL">
    <node id="idle">
      <data key="shape">ellipse</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <data key="label">Inactivo</data>
    </node>
    <node id="work">
      <data key="shape">rectangle</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">En proceso</data>
    </node>
    <node id="done">
      <data key="shape">ellipse</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">Hecho</data>
    </node>
    <node id="fail">
      <data key="shape">diamond</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">Fallido</data>
    </node>
    <edge source="idle" target="work">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">Inicio</data>
    </edge>
    <edge source="work" target="done">
      <data key="color">#15803d</data>
      <data key="edgeLabel">Éxito</data>
    </edge>
    <edge source="work" target="fail">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">Fallo</data>
    </edge>
    <edge source="fail" target="idle">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">Reintento</data>
    </edge>
    <edge source="done" target="idle">
      <data key="color">#64748b</data>
      <data key="edgeLabel">Restablecer</data>
    </edge>
  </graph>
</graphml>`,
    network: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Red de arriba abajo: grupo, colores y etiquetas en los enlaces vecinos</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">Nube</data>
    </node>
    <node id="office">
      <data key="label">Oficina</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <graph id="office-graph" edgedefault="undirected">
        <node id="switch">
          <data key="shape">hexagon</data>
          <data key="fill">#ede9fe</data>
          <data key="stroke">#7c3aed</data>
          <data key="label">Conmutador</data>
        </node>
        <node id="laptop">
          <data key="shape">rectangle</data>
          <data key="fill">#dcfce7</data>
          <data key="stroke">#15803d</data>
          <data key="label">Portátil</data>
        </node>
        <node id="printer">
          <data key="shape">rectangle</data>
          <data key="fill">#ffedd5</data>
          <data key="stroke">#ea580c</data>
          <data key="label">Impresora</data>
        </node>
        <edge source="switch" target="laptop">
          <data key="color">#15803d</data>
          <data key="edgeLabel">Red local</data>
        </edge>
        <edge source="switch" target="printer">
          <data key="color">#ea580c</data>
          <data key="edgeLabel">Imprimir</data>
        </edge>
      </graph>
    </node>
    <edge source="cloud" target="switch" directed="false">
      <data key="style">dashed</data>
      <data key="color">#64748b</data>
      <data key="edgeLabel">VPN</data>
    </edge>
  </graph>
</graphml>`,
  },
  zh: {
    flow: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>请求流程从左到右：节点颜色与对向箭头上的标签</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">用户</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">数据库</data>
    </node>
    <edge source="user" target="api">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">请求</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">读取</data>
    </edge>
    <edge source="db" target="api">
      <data key="color">#15803d</data>
      <data key="edgeLabel">行</data>
    </edge>
    <edge source="api" target="user">
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">响应</data>
    </edge>
  </graph>
</graphml>`,
    decision: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>决策从上到下：菱形以及着色的是与否分支</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="start">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">开始</data>
    </node>
    <node id="check">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">检查</data>
    </node>
    <node id="ok">
      <data key="shape">rectangle</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">完成</data>
    </node>
    <node id="retry">
      <data key="shape">rectangle</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">重试</data>
    </node>
    <edge source="start" target="check">
      <data key="color">#64748b</data>
    </edge>
    <edge source="check" target="ok">
      <data key="color">#15803d</data>
      <data key="edgeLabel">是</data>
    </edge>
    <edge source="check" target="retry">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">否</data>
    </edge>
    <edge source="retry" target="check">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">再来一次</data>
    </edge>
  </graph>
</graphml>`,
    architecture: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>从左到右的架构，事件边为虚线</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">用户</data>
    </node>
    <node id="web">
      <data key="shape">rectangle</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">网页</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="queue">
      <data key="shape">rectangle</data>
      <data key="fill">#ede9fe</data>
      <data key="stroke">#7c3aed</data>
      <data key="label">队列</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">数据库</data>
    </node>
    <edge source="user" target="web">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">HTTPS</data>
    </edge>
    <edge source="web" target="api">
      <data key="color">#0284c7</data>
      <data key="edgeLabel">调用</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">查询</data>
    </edge>
    <edge source="api" target="queue">
      <data key="style">dashed</data>
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">事件</data>
    </edge>
    <node id="gate">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">网关</data>
      <data key="loc">12,40</data>
      <port name="in"/>
      <port name="out"/>
    </node>
    <hyperedge id="fanout">
      <desc>广播</desc>
      <endpoint node="web"/>
      <endpoint node="api"/>
      <endpoint node="queue"/>
    </hyperedge>
    <edge source="api" target="gate">
      <data key="color">#d97706</data>
      <data key="edgeLabel">网关</data>
    </edge>
  </graph>
</graphml>`,
    states: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>状态从右到左，带返回循环</desc>
  <graph edgedefault="directed" rankdir="RL">
    <node id="idle">
      <data key="shape">ellipse</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <data key="label">空闲</data>
    </node>
    <node id="work">
      <data key="shape">rectangle</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">处理中</data>
    </node>
    <node id="done">
      <data key="shape">ellipse</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">完成</data>
    </node>
    <node id="fail">
      <data key="shape">diamond</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">失败</data>
    </node>
    <edge source="idle" target="work">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">开始</data>
    </edge>
    <edge source="work" target="done">
      <data key="color">#15803d</data>
      <data key="edgeLabel">成功</data>
    </edge>
    <edge source="work" target="fail">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">错误</data>
    </edge>
    <edge source="fail" target="idle">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">重试</data>
    </edge>
    <edge source="done" target="idle">
      <data key="color">#64748b</data>
      <data key="edgeLabel">重置</data>
    </edge>
  </graph>
</graphml>`,
    network: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>网络从上到下：分组、颜色以及相邻链路上的标签</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">云</data>
    </node>
    <node id="office">
      <data key="label">办公室</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <graph id="office-graph" edgedefault="undirected">
        <node id="switch">
          <data key="shape">hexagon</data>
          <data key="fill">#ede9fe</data>
          <data key="stroke">#7c3aed</data>
          <data key="label">交换机</data>
        </node>
        <node id="laptop">
          <data key="shape">rectangle</data>
          <data key="fill">#dcfce7</data>
          <data key="stroke">#15803d</data>
          <data key="label">笔记本</data>
        </node>
        <node id="printer">
          <data key="shape">rectangle</data>
          <data key="fill">#ffedd5</data>
          <data key="stroke">#ea580c</data>
          <data key="label">打印机</data>
        </node>
        <edge source="switch" target="laptop">
          <data key="color">#15803d</data>
          <data key="edgeLabel">局域网</data>
        </edge>
        <edge source="switch" target="printer">
          <data key="color">#ea580c</data>
          <data key="edgeLabel">打印</data>
        </edge>
      </graph>
    </node>
    <edge source="cloud" target="switch" directed="false">
      <data key="style">dashed</data>
      <data key="color">#64748b</data>
      <data key="edgeLabel">VPN</data>
    </edge>
  </graph>
</graphml>`,
  },
  ja: {
    flow: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>リクエストの流れは左から右：節の色と向かい合う矢印のラベル</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">ユーザー</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">データベース</data>
    </node>
    <edge source="user" target="api">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">要求</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">読み取り</data>
    </edge>
    <edge source="db" target="api">
      <data key="color">#15803d</data>
      <data key="edgeLabel">行</data>
    </edge>
    <edge source="api" target="user">
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">応答</data>
    </edge>
  </graph>
</graphml>`,
    decision: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>判定は上から下：色分けしたはいといいえの枝を持つひし形</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="start">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">開始</data>
    </node>
    <node id="check">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">確認</data>
    </node>
    <node id="ok">
      <data key="shape">rectangle</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">完了</data>
    </node>
    <node id="retry">
      <data key="shape">rectangle</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">再試行</data>
    </node>
    <edge source="start" target="check">
      <data key="color">#64748b</data>
    </edge>
    <edge source="check" target="ok">
      <data key="color">#15803d</data>
      <data key="edgeLabel">はい</data>
    </edge>
    <edge source="check" target="retry">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">いいえ</data>
    </edge>
    <edge source="retry" target="check">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">もう一度</data>
    </edge>
  </graph>
</graphml>`,
    architecture: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>左から右の構成、出来事の辺は破線</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">ユーザー</data>
    </node>
    <node id="web">
      <data key="shape">rectangle</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">ウェブ</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="queue">
      <data key="shape">rectangle</data>
      <data key="fill">#ede9fe</data>
      <data key="stroke">#7c3aed</data>
      <data key="label">待ち行列</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">データベース</data>
    </node>
    <edge source="user" target="web">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">HTTPS</data>
    </edge>
    <edge source="web" target="api">
      <data key="color">#0284c7</data>
      <data key="edgeLabel">呼び出し</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">照会</data>
    </edge>
    <edge source="api" target="queue">
      <data key="style">dashed</data>
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">出来事</data>
    </edge>
    <node id="gate">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">関門</data>
      <data key="loc">12,40</data>
      <port name="in"/>
      <port name="out"/>
    </node>
    <hyperedge id="fanout">
      <desc>同報</desc>
      <endpoint node="web"/>
      <endpoint node="api"/>
      <endpoint node="queue"/>
    </hyperedge>
    <edge source="api" target="gate">
      <data key="color">#d97706</data>
      <data key="edgeLabel">関門</data>
    </edge>
  </graph>
</graphml>`,
    states: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>状態は右から左、復帰の循環あり</desc>
  <graph edgedefault="directed" rankdir="RL">
    <node id="idle">
      <data key="shape">ellipse</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <data key="label">待機</data>
    </node>
    <node id="work">
      <data key="shape">rectangle</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">処理中</data>
    </node>
    <node id="done">
      <data key="shape">ellipse</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">完了</data>
    </node>
    <node id="fail">
      <data key="shape">diamond</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">失敗</data>
    </node>
    <edge source="idle" target="work">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">開始</data>
    </edge>
    <edge source="work" target="done">
      <data key="color">#15803d</data>
      <data key="edgeLabel">成功</data>
    </edge>
    <edge source="work" target="fail">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">障害</data>
    </edge>
    <edge source="fail" target="idle">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">再試行</data>
    </edge>
    <edge source="done" target="idle">
      <data key="color">#64748b</data>
      <data key="edgeLabel">初期化</data>
    </edge>
  </graph>
</graphml>`,
    network: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>網は上から下：グループ、色、隣接する結線のラベル</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">雲</data>
    </node>
    <node id="office">
      <data key="label">事務所</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <graph id="office-graph" edgedefault="undirected">
        <node id="switch">
          <data key="shape">hexagon</data>
          <data key="fill">#ede9fe</data>
          <data key="stroke">#7c3aed</data>
          <data key="label">交換機</data>
        </node>
        <node id="laptop">
          <data key="shape">rectangle</data>
          <data key="fill">#dcfce7</data>
          <data key="stroke">#15803d</data>
          <data key="label">ノートパソコン</data>
        </node>
        <node id="printer">
          <data key="shape">rectangle</data>
          <data key="fill">#ffedd5</data>
          <data key="stroke">#ea580c</data>
          <data key="label">印刷機</data>
        </node>
        <edge source="switch" target="laptop">
          <data key="color">#15803d</data>
          <data key="edgeLabel">構内網</data>
        </edge>
        <edge source="switch" target="printer">
          <data key="color">#ea580c</data>
          <data key="edgeLabel">印刷</data>
        </edge>
      </graph>
    </node>
    <edge source="cloud" target="switch" directed="false">
      <data key="style">dashed</data>
      <data key="color">#64748b</data>
      <data key="edgeLabel">VPN</data>
    </edge>
  </graph>
</graphml>`,
  },
  hi: {
    flow: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>अनुरोध प्रवाह बाएँ से दाएँ: नोड रंग और विपरीत तीरों पर लेबल</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">उपयोगकर्ता</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">डेटाबेस</data>
    </node>
    <edge source="user" target="api">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">अनुरोध</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">पठन</data>
    </edge>
    <edge source="db" target="api">
      <data key="color">#15803d</data>
      <data key="edgeLabel">पंक्तियाँ</data>
    </edge>
    <edge source="api" target="user">
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">प्रतिक्रिया</data>
    </edge>
  </graph>
</graphml>`,
    decision: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>निर्णय ऊपर से नीचे: रंगीन हाँ और नहीं शाखाओं वाला समचतुर्भुज</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="start">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">प्रारंभ</data>
    </node>
    <node id="check">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">जाँच</data>
    </node>
    <node id="ok">
      <data key="shape">rectangle</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">पूर्ण</data>
    </node>
    <node id="retry">
      <data key="shape">rectangle</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">पुनः प्रयास</data>
    </node>
    <edge source="start" target="check">
      <data key="color">#64748b</data>
    </edge>
    <edge source="check" target="ok">
      <data key="color">#15803d</data>
      <data key="edgeLabel">हाँ</data>
    </edge>
    <edge source="check" target="retry">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">नहीं</data>
    </edge>
    <edge source="retry" target="check">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">फिर से</data>
    </edge>
  </graph>
</graphml>`,
    architecture: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>बाएँ से दाएँ वास्तुकला, घटना का किनारा टूटी रेखा</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">उपयोगकर्ता</data>
    </node>
    <node id="web">
      <data key="shape">rectangle</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">वेब</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="queue">
      <data key="shape">rectangle</data>
      <data key="fill">#ede9fe</data>
      <data key="stroke">#7c3aed</data>
      <data key="label">कतार</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">डेटाबेस</data>
    </node>
    <edge source="user" target="web">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">HTTPS</data>
    </edge>
    <edge source="web" target="api">
      <data key="color">#0284c7</data>
      <data key="edgeLabel">आह्वान</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">पूछताछ</data>
    </edge>
    <edge source="api" target="queue">
      <data key="style">dashed</data>
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">घटना</data>
    </edge>
    <node id="gate">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">प्रवेशद्वार</data>
      <data key="loc">12,40</data>
      <port name="in"/>
      <port name="out"/>
    </node>
    <hyperedge id="fanout">
      <desc>प्रसारण</desc>
      <endpoint node="web"/>
      <endpoint node="api"/>
      <endpoint node="queue"/>
    </hyperedge>
    <edge source="api" target="gate">
      <data key="color">#d97706</data>
      <data key="edgeLabel">प्रवेशद्वार</data>
    </edge>
  </graph>
</graphml>`,
    states: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>अवस्थाएँ दाएँ से बाएँ, वापसी चक्र के साथ</desc>
  <graph edgedefault="directed" rankdir="RL">
    <node id="idle">
      <data key="shape">ellipse</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <data key="label">निष्क्रिय</data>
    </node>
    <node id="work">
      <data key="shape">rectangle</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">प्रसंस्करण</data>
    </node>
    <node id="done">
      <data key="shape">ellipse</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">पूर्ण</data>
    </node>
    <node id="fail">
      <data key="shape">diamond</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">विफल</data>
    </node>
    <edge source="idle" target="work">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">प्रारंभ</data>
    </edge>
    <edge source="work" target="done">
      <data key="color">#15803d</data>
      <data key="edgeLabel">सफलता</data>
    </edge>
    <edge source="work" target="fail">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">त्रुटि</data>
    </edge>
    <edge source="fail" target="idle">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">पुनः प्रयास</data>
    </edge>
    <edge source="done" target="idle">
      <data key="color">#64748b</data>
      <data key="edgeLabel">पुनर्स्थापना</data>
    </edge>
  </graph>
</graphml>`,
    network: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>जाल ऊपर से नीचे: समूह, रंग और पड़ोसी कड़ियों पर लेबल</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">बादल</data>
    </node>
    <node id="office">
      <data key="label">कार्यालय</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <graph id="office-graph" edgedefault="undirected">
        <node id="switch">
          <data key="shape">hexagon</data>
          <data key="fill">#ede9fe</data>
          <data key="stroke">#7c3aed</data>
          <data key="label">स्विच</data>
        </node>
        <node id="laptop">
          <data key="shape">rectangle</data>
          <data key="fill">#dcfce7</data>
          <data key="stroke">#15803d</data>
          <data key="label">लैपटॉप</data>
        </node>
        <node id="printer">
          <data key="shape">rectangle</data>
          <data key="fill">#ffedd5</data>
          <data key="stroke">#ea580c</data>
          <data key="label">मुद्रक</data>
        </node>
        <edge source="switch" target="laptop">
          <data key="color">#15803d</data>
          <data key="edgeLabel">स्थानीय जाल</data>
        </edge>
        <edge source="switch" target="printer">
          <data key="color">#ea580c</data>
          <data key="edgeLabel">मुद्रण</data>
        </edge>
      </graph>
    </node>
    <edge source="cloud" target="switch" directed="false">
      <data key="style">dashed</data>
      <data key="color">#64748b</data>
      <data key="edgeLabel">VPN</data>
    </edge>
  </graph>
</graphml>`,
  },
  pt: {
    flow: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Fluxo da solicitação da esquerda para a direita: cores dos nós e rótulos nas setas opostas</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Usuário</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Banco de dados</data>
    </node>
    <edge source="user" target="api">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">Solicitação</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">Leitura</data>
    </edge>
    <edge source="db" target="api">
      <data key="color">#15803d</data>
      <data key="edgeLabel">Linhas</data>
    </edge>
    <edge source="api" target="user">
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">Resposta</data>
    </edge>
  </graph>
</graphml>`,
    decision: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Decisão de cima para baixo: losango com ramos Sim e Não coloridos</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="start">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Início</data>
    </node>
    <node id="check">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Verificação</data>
    </node>
    <node id="ok">
      <data key="shape">rectangle</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">Concluído</data>
    </node>
    <node id="retry">
      <data key="shape">rectangle</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">Nova tentativa</data>
    </node>
    <edge source="start" target="check">
      <data key="color">#64748b</data>
    </edge>
    <edge source="check" target="ok">
      <data key="color">#15803d</data>
      <data key="edgeLabel">Sim</data>
    </edge>
    <edge source="check" target="retry">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">Não</data>
    </edge>
    <edge source="retry" target="check">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">De novo</data>
    </edge>
  </graph>
</graphml>`,
    architecture: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Arquitetura da esquerda para a direita, aresta tracejada para o evento</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Usuário</data>
    </node>
    <node id="web">
      <data key="shape">rectangle</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">Site</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="queue">
      <data key="shape">rectangle</data>
      <data key="fill">#ede9fe</data>
      <data key="stroke">#7c3aed</data>
      <data key="label">Fila</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Banco de dados</data>
    </node>
    <edge source="user" target="web">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">HTTPS</data>
    </edge>
    <edge source="web" target="api">
      <data key="color">#0284c7</data>
      <data key="edgeLabel">Chamada</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">Consulta</data>
    </edge>
    <edge source="api" target="queue">
      <data key="style">dashed</data>
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">Evento</data>
    </edge>
    <node id="gate">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Porta de entrada</data>
      <data key="loc">12,40</data>
      <port name="in"/>
      <port name="out"/>
    </node>
    <hyperedge id="fanout">
      <desc>Transmissão</desc>
      <endpoint node="web"/>
      <endpoint node="api"/>
      <endpoint node="queue"/>
    </hyperedge>
    <edge source="api" target="gate">
      <data key="color">#d97706</data>
      <data key="edgeLabel">Porta de entrada</data>
    </edge>
  </graph>
</graphml>`,
    states: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Estados da direita para a esquerda, com um ciclo de retorno</desc>
  <graph edgedefault="directed" rankdir="RL">
    <node id="idle">
      <data key="shape">ellipse</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <data key="label">Ocioso</data>
    </node>
    <node id="work">
      <data key="shape">rectangle</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Em processamento</data>
    </node>
    <node id="done">
      <data key="shape">ellipse</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">Concluído</data>
    </node>
    <node id="fail">
      <data key="shape">diamond</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">Falhou</data>
    </node>
    <edge source="idle" target="work">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">Início</data>
    </edge>
    <edge source="work" target="done">
      <data key="color">#15803d</data>
      <data key="edgeLabel">Sucesso</data>
    </edge>
    <edge source="work" target="fail">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">Falha</data>
    </edge>
    <edge source="fail" target="idle">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">Nova tentativa</data>
    </edge>
    <edge source="done" target="idle">
      <data key="color">#64748b</data>
      <data key="edgeLabel">Redefinir</data>
    </edge>
  </graph>
</graphml>`,
    network: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Rede de cima para baixo: grupo, cores e rótulos nos elos vizinhos</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">Nuvem</data>
    </node>
    <node id="office">
      <data key="label">Escritório</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <graph id="office-graph" edgedefault="undirected">
        <node id="switch">
          <data key="shape">hexagon</data>
          <data key="fill">#ede9fe</data>
          <data key="stroke">#7c3aed</data>
          <data key="label">Comutador</data>
        </node>
        <node id="laptop">
          <data key="shape">rectangle</data>
          <data key="fill">#dcfce7</data>
          <data key="stroke">#15803d</data>
          <data key="label">Notebook</data>
        </node>
        <node id="printer">
          <data key="shape">rectangle</data>
          <data key="fill">#ffedd5</data>
          <data key="stroke">#ea580c</data>
          <data key="label">Impressora</data>
        </node>
        <edge source="switch" target="laptop">
          <data key="color">#15803d</data>
          <data key="edgeLabel">Rede local</data>
        </edge>
        <edge source="switch" target="printer">
          <data key="color">#ea580c</data>
          <data key="edgeLabel">Imprimir</data>
        </edge>
      </graph>
    </node>
    <edge source="cloud" target="switch" directed="false">
      <data key="style">dashed</data>
      <data key="color">#64748b</data>
      <data key="edgeLabel">VPN</data>
    </edge>
  </graph>
</graphml>`,
  },
  de: {
    flow: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Anfragefluss von links nach rechts: Knotenfarben und Beschriftungen auf gegenläufigen Pfeilen</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Benutzer</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Datenbank</data>
    </node>
    <edge source="user" target="api">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">Anfrage</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">Lesen</data>
    </edge>
    <edge source="db" target="api">
      <data key="color">#15803d</data>
      <data key="edgeLabel">Zeilen</data>
    </edge>
    <edge source="api" target="user">
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">Antwort</data>
    </edge>
  </graph>
</graphml>`,
    decision: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Entscheidung von oben nach unten: Raute mit farbigen Ja- und Nein-Zweigen</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="start">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Beginn</data>
    </node>
    <node id="check">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Prüfung</data>
    </node>
    <node id="ok">
      <data key="shape">rectangle</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">Fertig</data>
    </node>
    <node id="retry">
      <data key="shape">rectangle</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">Wiederholen</data>
    </node>
    <edge source="start" target="check">
      <data key="color">#64748b</data>
    </edge>
    <edge source="check" target="ok">
      <data key="color">#15803d</data>
      <data key="edgeLabel">Ja</data>
    </edge>
    <edge source="check" target="retry">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">Nein</data>
    </edge>
    <edge source="retry" target="check">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">Nochmal</data>
    </edge>
  </graph>
</graphml>`,
    architecture: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Architektur von links nach rechts, gestrichelte Kante für das Ereignis</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">Benutzer</data>
    </node>
    <node id="web">
      <data key="shape">rectangle</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">Webseite</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="queue">
      <data key="shape">rectangle</data>
      <data key="fill">#ede9fe</data>
      <data key="stroke">#7c3aed</data>
      <data key="label">Warteschlange</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Datenbank</data>
    </node>
    <edge source="user" target="web">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">HTTPS</data>
    </edge>
    <edge source="web" target="api">
      <data key="color">#0284c7</data>
      <data key="edgeLabel">Aufruf</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">Abfrage</data>
    </edge>
    <edge source="api" target="queue">
      <data key="style">dashed</data>
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">Ereignis</data>
    </edge>
    <node id="gate">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">Schleuse</data>
      <data key="loc">12,40</data>
      <port name="in"/>
      <port name="out"/>
    </node>
    <hyperedge id="fanout">
      <desc>Rundsendung</desc>
      <endpoint node="web"/>
      <endpoint node="api"/>
      <endpoint node="queue"/>
    </hyperedge>
    <edge source="api" target="gate">
      <data key="color">#d97706</data>
      <data key="edgeLabel">Schleuse</data>
    </edge>
  </graph>
</graphml>`,
    states: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Zustände von rechts nach links, mit einem Rückkehrzyklus</desc>
  <graph edgedefault="directed" rankdir="RL">
    <node id="idle">
      <data key="shape">ellipse</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <data key="label">Untätig</data>
    </node>
    <node id="work">
      <data key="shape">rectangle</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">In Bearbeitung</data>
    </node>
    <node id="done">
      <data key="shape">ellipse</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">Fertig</data>
    </node>
    <node id="fail">
      <data key="shape">diamond</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">Fehlgeschlagen</data>
    </node>
    <edge source="idle" target="work">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">Beginn</data>
    </edge>
    <edge source="work" target="done">
      <data key="color">#15803d</data>
      <data key="edgeLabel">Erfolg</data>
    </edge>
    <edge source="work" target="fail">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">Fehler</data>
    </edge>
    <edge source="fail" target="idle">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">Wiederholen</data>
    </edge>
    <edge source="done" target="idle">
      <data key="color">#64748b</data>
      <data key="edgeLabel">Zurücksetzen</data>
    </edge>
  </graph>
</graphml>`,
    network: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>Netz von oben nach unten: Gruppe, Farben und Beschriftungen an benachbarten Verbindungen</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">Wolke</data>
    </node>
    <node id="office">
      <data key="label">Büro</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <graph id="office-graph" edgedefault="undirected">
        <node id="switch">
          <data key="shape">hexagon</data>
          <data key="fill">#ede9fe</data>
          <data key="stroke">#7c3aed</data>
          <data key="label">Verteiler</data>
        </node>
        <node id="laptop">
          <data key="shape">rectangle</data>
          <data key="fill">#dcfce7</data>
          <data key="stroke">#15803d</data>
          <data key="label">Notebook</data>
        </node>
        <node id="printer">
          <data key="shape">rectangle</data>
          <data key="fill">#ffedd5</data>
          <data key="stroke">#ea580c</data>
          <data key="label">Drucker</data>
        </node>
        <edge source="switch" target="laptop">
          <data key="color">#15803d</data>
          <data key="edgeLabel">Lokalnetz</data>
        </edge>
        <edge source="switch" target="printer">
          <data key="color">#ea580c</data>
          <data key="edgeLabel">Drucken</data>
        </edge>
      </graph>
    </node>
    <edge source="cloud" target="switch" directed="false">
      <data key="style">dashed</data>
      <data key="color">#64748b</data>
      <data key="edgeLabel">VPN</data>
    </edge>
  </graph>
</graphml>`,
  },
  ar: {
    flow: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>تدفق الطلب من اليسار إلى اليمين: ألوان العقد وتسميات الأسهم المتقابلة</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">المستخدم</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">قاعدة البيانات</data>
    </node>
    <edge source="user" target="api">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">طلب</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">قراءة</data>
    </edge>
    <edge source="db" target="api">
      <data key="color">#15803d</data>
      <data key="edgeLabel">صفوف</data>
    </edge>
    <edge source="api" target="user">
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">استجابة</data>
    </edge>
  </graph>
</graphml>`,
    decision: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>قرار من الأعلى إلى الأسفل: معين بفرعين ملوّنين نعم ولا</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="start">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">بدء</data>
    </node>
    <node id="check">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">تحقق</data>
    </node>
    <node id="ok">
      <data key="shape">rectangle</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">تم</data>
    </node>
    <node id="retry">
      <data key="shape">rectangle</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">إعادة المحاولة</data>
    </node>
    <edge source="start" target="check">
      <data key="color">#64748b</data>
    </edge>
    <edge source="check" target="ok">
      <data key="color">#15803d</data>
      <data key="edgeLabel">نعم</data>
    </edge>
    <edge source="check" target="retry">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">لا</data>
    </edge>
    <edge source="retry" target="check">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">مرة أخرى</data>
    </edge>
  </graph>
</graphml>`,
    architecture: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>بنية من اليسار إلى اليمين، حافة متقطعة للحدث</desc>
  <graph edgedefault="directed" rankdir="LR">
    <node id="user">
      <data key="shape">ellipse</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">المستخدم</data>
    </node>
    <node id="web">
      <data key="shape">rectangle</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">الويب</data>
    </node>
    <node id="api">
      <data key="shape">hexagon</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">API</data>
    </node>
    <node id="queue">
      <data key="shape">rectangle</data>
      <data key="fill">#ede9fe</data>
      <data key="stroke">#7c3aed</data>
      <data key="label">طابور</data>
    </node>
    <node id="db">
      <data key="shape">rectangle</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">قاعدة البيانات</data>
    </node>
    <edge source="user" target="web">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">HTTPS</data>
    </edge>
    <edge source="web" target="api">
      <data key="color">#0284c7</data>
      <data key="edgeLabel">استدعاء</data>
    </edge>
    <edge source="api" target="db">
      <data key="color">#d97706</data>
      <data key="edgeLabel">استعلام</data>
    </edge>
    <edge source="api" target="queue">
      <data key="style">dashed</data>
      <data key="color">#7c3aed</data>
      <data key="edgeLabel">حدث</data>
    </edge>
    <node id="gate">
      <data key="shape">diamond</data>
      <data key="fill">#fef3c7</data>
      <data key="stroke">#d97706</data>
      <data key="label">بوابة</data>
      <data key="loc">12,40</data>
      <port name="in"/>
      <port name="out"/>
    </node>
    <hyperedge id="fanout">
      <desc>بث</desc>
      <endpoint node="web"/>
      <endpoint node="api"/>
      <endpoint node="queue"/>
    </hyperedge>
    <edge source="api" target="gate">
      <data key="color">#d97706</data>
      <data key="edgeLabel">بوابة</data>
    </edge>
  </graph>
</graphml>`,
    states: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>حالات من اليمين إلى اليسار، مع دورة عودة</desc>
  <graph edgedefault="directed" rankdir="RL">
    <node id="idle">
      <data key="shape">ellipse</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <data key="label">خامل</data>
    </node>
    <node id="work">
      <data key="shape">rectangle</data>
      <data key="fill">#dbeafe</data>
      <data key="stroke">#2563eb</data>
      <data key="label">قيد المعالجة</data>
    </node>
    <node id="done">
      <data key="shape">ellipse</data>
      <data key="fill">#dcfce7</data>
      <data key="stroke">#15803d</data>
      <data key="label">تم</data>
    </node>
    <node id="fail">
      <data key="shape">diamond</data>
      <data key="fill">#fee2e2</data>
      <data key="stroke">#dc2626</data>
      <data key="label">فشل</data>
    </node>
    <edge source="idle" target="work">
      <data key="color">#2563eb</data>
      <data key="edgeLabel">بدء</data>
    </edge>
    <edge source="work" target="done">
      <data key="color">#15803d</data>
      <data key="edgeLabel">نجاح</data>
    </edge>
    <edge source="work" target="fail">
      <data key="color">#dc2626</data>
      <data key="edgeLabel">خطأ</data>
    </edge>
    <edge source="fail" target="idle">
      <data key="style">dashed</data>
      <data key="color">#d97706</data>
      <data key="edgeLabel">إعادة المحاولة</data>
    </edge>
    <edge source="done" target="idle">
      <data key="color">#64748b</data>
      <data key="edgeLabel">إعادة تعيين</data>
    </edge>
  </graph>
</graphml>`,
    network: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="shape" for="node" attr.name="shape" attr.type="string"/>
  <key id="fill" for="node" attr.name="fill" attr.type="string"/>
  <key id="stroke" for="node" attr.name="stroke" attr.type="string"/>
  <key id="edgeLabel" for="edge" attr.name="label" attr.type="string"/>
  <key id="style" for="edge" attr.name="style" attr.type="string"/>
  <key id="color" for="edge" attr.name="color" attr.type="string"/>
  <key id="loc" for="node" attr.name="loc" attr.type="string"/>
  <desc>شبكة من الأعلى إلى الأسفل: مجموعة وألوان وتسميات على الروابط المجاورة</desc>
  <graph edgedefault="directed" rankdir="TB">
    <node id="cloud">
      <data key="shape">ellipse</data>
      <data key="fill">#e0f2fe</data>
      <data key="stroke">#0284c7</data>
      <data key="label">سحابة</data>
    </node>
    <node id="office">
      <data key="label">المكتب</data>
      <data key="fill">#f1f5f9</data>
      <data key="stroke">#64748b</data>
      <graph id="office-graph" edgedefault="undirected">
        <node id="switch">
          <data key="shape">hexagon</data>
          <data key="fill">#ede9fe</data>
          <data key="stroke">#7c3aed</data>
          <data key="label">مبدّل</data>
        </node>
        <node id="laptop">
          <data key="shape">rectangle</data>
          <data key="fill">#dcfce7</data>
          <data key="stroke">#15803d</data>
          <data key="label">حاسوب محمول</data>
        </node>
        <node id="printer">
          <data key="shape">rectangle</data>
          <data key="fill">#ffedd5</data>
          <data key="stroke">#ea580c</data>
          <data key="label">طابعة</data>
        </node>
        <edge source="switch" target="laptop">
          <data key="color">#15803d</data>
          <data key="edgeLabel">شبكة محلية</data>
        </edge>
        <edge source="switch" target="printer">
          <data key="color">#ea580c</data>
          <data key="edgeLabel">طباعة</data>
        </edge>
      </graph>
    </node>
    <edge source="cloud" target="switch" directed="false">
      <data key="style">dashed</data>
      <data key="color">#64748b</data>
      <data key="edgeLabel">VPN</data>
    </edge>
  </graph>
</graphml>`,
  },
};

export const WIREMARK_EXTRA: Record<
  Exclude<AppLocale, "ru" | "en">,
  Record<"login" | "dashboard" | "form" | "settings" | "flow" | "product", string>
> = {
  es: {
    login: `// Acceso: pestañas, campos con iconos, una alerta y otra forma de entrar
Wireframe #login mobile
  Stack column gap=2
    Typography h4 center "Iniciar sesión"
    Typography body2 center "Estudio de diagramas"
    Tabs
      Tab "Iniciar sesión"
      Tab "Crear cuenta" to=#signup
    Alert info outlined "Nuevo acceso desde este dispositivo"
    TextField "Correo" startIcon=Email required placeholder="you@example.com"
    TextField "Contraseña" startIcon=Lock endIcon=Visibility required
    Stack row gap=1
      Control checkbox
      Typography body1 "Recordarme"
      Spacer
      Link "¿Olvidó?" href=#reset
    Button "Iniciar sesión" contained fullWidth startIcon=Login to=#dashboard // acción principal
    Button "Crear cuenta" outlined fullWidth to=#signup
    Divider dashed
    Stack row gap=1
      Chip "SSO" outlined small
      Button "Empresa" text small startIcon=Business
      Spacer
      Icon Language
    Typography caption center ~2 filler=lorem`,
    dashboard: `// Resumen: menú, panel fijo, tarjetas con gráficos y una tabla
Wireframe #dashboard landscape
  Menubar
    MenuItem "Archivo" icon=Save selected
    MenuItem "Editar" icon=Edit
    MenuItem "Ver"
    MenuItem "Ayuda" icon=Help disabled
  AppBar dense denseBackground
    Toolbar dense
      Icon Menu
      Typography h6 "Code2Graph"
      Spacer
      Icon Search
      Spacer 16px
      Stack row gap=1
        Badge "4"
        Avatar "MG" small rounded
      Fab Add small
  Stack row 100% * gap=2
    Drawer
      List dense subheader="Secciones"
        ListItem "Inicio" to=#home
        ListItem "Informes" to=#reports
        ListItem "Ajustes" to=#settings
      Typography caption "Cuota de almacenamiento"
      Progress linear 68
      Chip "Pro" outlined small
    Stack column * * gap=2
      Stack row gap=1
        Breadcrumbs
          Link "Estudio" to=#home
          Link "Informes" to=#reports
          Typography "Marzo"
        Spacer
        Button "Exportar" outlined small startIcon=Download to=#export
      Grid cols=3 gap=2
        Card
          CardHeader "Diagramas" subheader="Últimos 7 días" icon=ShowChart closeIcon=none
          CardContent
            Chart "Tendencia" line 100% 110px legend series=4
          CardActions
            Button "Abrir" small to=#reports
            Chip "12" small
        Card elevation=3
          CardHeader "Formatos" subheader="Cuota de exportación" icon=PieChart closeIcon=none
          CardContent
            Chart "Participación" donut 100% 110px series=3
          CardActions
            Chip "PNG" small
            Chip "SVG" outlined small
        Card elevation=0
          CardHeader "Vista previa" subheader="Último paquete" icon=Image closeIcon=MoreVert
          CardContent
            Img 100% ratio=16:9
          CardActions
            Button "Descargar" small startIcon=Download
      Stack row * gap=2
        Box * * outline=solid scrollbar=vertical scrollbarValue=35 scrollbarHandle=40
          Table small
            TableHead
              TableRow
                TableCell "Nombre"
                TableCell "Autor"
                TableCell "Estado"
                TableCell "Vistas" align=right
            TableBody
              TableRow
                TableCell "Acceso"
                TableCell "Ana"
                TableCell "Borrador"
                TableCell "128" align=right
              TableRow selected
                TableCell "Entorno"
                TableCell "Marcos"
                TableCell "Listo"
                TableCell "860" align=right
              TableRow
                TableCell "Pago"
                TableCell "Elena"
                TableCell "Revisión"
                TableCell "42" align=right
            TableFooter
              TableRow
                TableCell "Suma"
                TableCell "—"
                TableCell "3"
                TableCell "1030" align=right
        Box 260px * dashed background=hatch
          Typography caption "Nota"
          Placeholder 100% 72px "Boceto"
          Skeleton text 100% 14px
          Skeleton rounded 100% 48px
      Stack row gap=1
        Pagination count=5 page=2
        Spacer
        Typography caption "Pág. 2 de 5"`,
    form: `// Asistente: pasos, campos variados, un deslizador, una valoración y un calendario
Wireframe #new-account portrait
  Stack column gap=2
    Typography h4 "Crear cuenta"
    Stack row gap=3
      Box 220px
        Stepper vertical
          Step "Perfil" completed
          Step "Acceso" active
          Step "Hecho"
        Stack row gap=1
          Progress circular 60
          Typography caption "Paso 2"
      Calendar "Marzo 2026" compact events value=18 today=22 weekStart=mon
    Grid cols=2 gap=2
      TextField "Nombre completo" required
      TextField "Correo" startIcon=Email required value="you@example.com"
      TextField "Contraseña" startIcon=Lock required
      TextField "Sitio web" startIcon=Link error value="http://" helperText="Se necesita una URL completa"
    Select "Rol" value="Redactor"
      Option "Lector" startIcon=Visibility
      Option "Redactor" startIcon=Edit selected
      Option "Propietario" startIcon=Star subtext="Acceso completo"
    TextField "Sobre mí" multiline rows=2 filler=blocks
    TextField "Equipo" filled placeholder="studio"
    Stack row gap=2
      Control radio checked
      Typography body2 "Particular"
      Control radio
      Typography body2 "De equipo"
      Spacer
      Typography body2 "Densidad"
      Slider 65 max=100
    Stack row gap=2
      Typography body2 "Puntuación de la plantilla"
      Rating 4
      Spacer
      ToggleButtonGroup
        ToggleButton ViewList selected
        ToggleButton ViewModule
        ToggleButton GridView
    Alert warning "Compruebe el correo antes de crear la cuenta"
    Stack row gap=1
      Control checkbox checked
      Typography body1 "Acepto las condiciones"
    Stack row gap=2
      Button "Crear cuenta" contained to=#welcome
      Button "Borrador" outlined disabled
      ButtonGroup
        Button "Día"
        Button "Semana"
        Button "Mes"`,
    settings: `// Ajustes: lista, acordeón, navegación inferior y un diálogo
Wireframe #settings mobile
  Stack column 100% * gap=2
    AppBar
      Toolbar
        Icon ArrowBack
        Typography h6 "Ajustes"
        Spacer
        Icon Search
    Alert error "Eliminar borra los diagramas"
    List dense subheader="Cuenta"
      ListItem "Perfil" to=#profile
      ListItem "Notificaciones" to=#notifications
      ListItem "Privacidad" to=#privacy
      ListItem "Acerca de" to=#about
    Stack column gap=1 divider
      AccordionHeader "Apariencia" expanded
      AccordionBody
        Stack row gap=1
          Control switch checked
          Typography body2 "Tema oscuro"
        Stack row gap=1
          Control switch
          Typography body2 "Listas compactas"
      AccordionHeader "Idioma" disabled
    BottomNavigation value="home" showLabels
      BottomNavigationAction "Inicio" icon=Home to=#home
      BottomNavigationAction "Buscar" icon=Search to=#search
      BottomNavigationAction "Perfil" icon=Person to=#profile
  Dialog sm bottom
    DialogHeader "¿Eliminar la cuenta?"
    DialogContent
      Typography body2 "Esta acción no se puede deshacer."
    DialogActions
      Spacer
      Button "Cancelar"
      Button "Eliminar" contained startIcon=Delete`,
    flow: `// Entorno compartido para dos pantallas: icono propio, fondo y flechas Flow
Icons
  mark "M12 2 2 22h20z"

Flow LR

Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Icon mark
      Typography h6 "Code2Graph"
      Spacer
      Icon Notifications
      Badge "2"
      Avatar "CG"
  Stack row 100% *
    Drawer
      List dense subheader="Estudio"
        ListItem "Resumen" to=#home
        ListItem "Redactor" to=#editor
        ListItem "Ajustes" to=#settings
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Stack column gap=2
    Stack row
      Typography h5 "Resumen"
      Spacer
      Button "Abrir edición" contained to=#editor
    Grid cols=3 gap=2
      Card
        CardHeader "Tableros" subheader="Abiertos" icon=Dashboard closeIcon=none
        CardContent
          Typography h3 "12"
          Typography caption "esta semana"
      Card
        CardHeader "Ediciones" icon=Edit closeIcon=none
        CardContent
          Chart "Ediciones" column 100% 100px
      Card
        CardHeader "Compilación" icon=TableChart closeIcon=none
        CardContent
          Progress linear 40 large
          Typography caption "Publicación"
    List dense
      ListItem "Incorporación"
      ListItem "Pago"

Wireframe #editor background=#shell anchor=#content
  Stack column 100% * gap=2
    Stack row gap=1
      Link "Volver al resumen" to=#home
      Spacer
      Chip "Borrador" outlined small
      Button "Publicar" contained startIcon=CloudUpload
    Stack row * * gap=2
      Box 220px * outline=solid elevation=2
        Typography overline "Capas"
        List
          ListItem "Título"
          ListItem "Diagrama"
          ListItem "Notas"
        Divider
        Skeleton text 160px 12px
        Skeleton circular 32px 32px
      Box * * dashed
        Placeholder * * "Lienzo"
    Stack row gap=2
      Progress linear 35
      Spacer
      Snackbar "Borrador guardado" bottomLeft`,
    product: `// Página del producto: medios, un mapa, una tabla de especificaciones y acciones
Wireframe #product w=1180 h=760
  Card
    Stack row gap=2
      Stack column 400px gap=1
        Img 100% ratio=16:9
        Stack row gap=1
          Chip "Papel" outlined small
          Chip "A5" small background=crosshatch
          Chip "Punto" outlined small
      Map area * 300px pins=5 path compass labels icon=LocationOn
    CardContent
      Breadcrumbs ">"
        Link "Catálogo" to=#catalog
        Typography "Cuaderno de bocetos"
      Stack row gap=1
        Typography h4 "Cuaderno de bocetos"
        Spacer
        Badge "−20%"
        Typography h5 "24 €"
      Stack row gap=1
        Rating 4 icon=Favorite emptyIcon=FavoriteBorder
        Divider vertical
        Typography body2 "128 reseñas"
      Tabs
        Tab "Acerca del producto"
        Tab "Especificaciones"
        Tab "Reseñas" to=#reviews
      Typography body2 ~2 filler=lorem
      Table small
        TableHead
          TableRow
            TableCell "Parámetro"
            TableCell "Valor"
        TableBody
          TableRow
            TableCell "Cubierta"
            TableCell "Papel kraft"
          TableRow selected
            TableCell "Páginas"
            TableCell "128"
          TableRow
            TableCell "Tamaño"
            TableCell "A5"
    CardActions
      ButtonGroup
        Button "1"
        Button "2"
        Button "3"
      Button "Añadir al carrito" contained large crosshatch startIcon=ShoppingCart
      Button "Detalles" outlined to=#detail
      Spacer
      Link "Volver al catálogo" to=#catalog`,
  },
  zh: {
    login: `// 登录：选项卡、带图标的字段、一条警报，以及另一种进入方式
Wireframe #login mobile
  Stack column gap=2
    Typography h4 center "登录"
    Typography body2 center "图表工作室"
    Tabs
      Tab "登录"
      Tab "创建账户" to=#signup
    Alert info outlined "此设备上的新登录"
    TextField "邮箱" startIcon=Email required placeholder="you@example.com"
    TextField "密码" startIcon=Lock endIcon=Visibility required
    Stack row gap=1
      Control checkbox
      Typography body1 "记住我"
      Spacer
      Link "忘记了？" href=#reset
    Button "登录" contained fullWidth startIcon=Login to=#dashboard // 主要操作
    Button "创建账户" outlined fullWidth to=#signup
    Divider dashed
    Stack row gap=1
      Chip "SSO" outlined small
      Button "企业" text small startIcon=Business
      Spacer
      Icon Language
    Typography caption center ~2 filler=lorem`,
    dashboard: `// 概览：菜单、固定抽屉、图表卡片和表格
Wireframe #dashboard landscape
  Menubar
    MenuItem "文件" icon=Save selected
    MenuItem "编辑" icon=Edit
    MenuItem "视图"
    MenuItem "帮助" icon=Help disabled
  AppBar dense denseBackground
    Toolbar dense
      Icon Menu
      Typography h6 "Code2Graph"
      Spacer
      Icon Search
      Spacer 16px
      Stack row gap=1
        Badge "4"
        Avatar "李" small rounded
      Fab Add small
  Stack row 100% * gap=2
    Drawer
      List dense subheader="分区"
        ListItem "首页" to=#home
        ListItem "报告" to=#reports
        ListItem "设置" to=#settings
      Typography caption "存储配额"
      Progress linear 68
      Chip "Pro" outlined small
    Stack column * * gap=2
      Stack row gap=1
        Breadcrumbs
          Link "工作室" to=#home
          Link "报告" to=#reports
          Typography "三月"
        Spacer
        Button "导出" outlined small startIcon=Download to=#export
      Grid cols=3 gap=2
        Card
          CardHeader "图表" subheader="近 7 天" icon=ShowChart closeIcon=none
          CardContent
            Chart "趋势" line 100% 110px legend series=4
          CardActions
            Button "打开" small to=#reports
            Chip "12" small
        Card elevation=3
          CardHeader "格式" subheader="导出占比" icon=PieChart closeIcon=none
          CardContent
            Chart "占比" donut 100% 110px series=3
          CardActions
            Chip "PNG" small
            Chip "SVG" outlined small
        Card elevation=0
          CardHeader "预览" subheader="最新资源包" icon=Image closeIcon=MoreVert
          CardContent
            Img 100% ratio=16:9
          CardActions
            Button "下载" small startIcon=Download
      Stack row * gap=2
        Box * * outline=solid scrollbar=vertical scrollbarValue=35 scrollbarHandle=40
          Table small
            TableHead
              TableRow
                TableCell "名称"
                TableCell "作者"
                TableCell "状态"
                TableCell "浏览" align=right
            TableBody
              TableRow
                TableCell "登录"
                TableCell "安雅"
                TableCell "草稿"
                TableCell "128" align=right
              TableRow selected
                TableCell "外壳"
                TableCell "马克"
                TableCell "就绪"
                TableCell "860" align=right
              TableRow
                TableCell "结账"
                TableCell "列娜"
                TableCell "评审"
                TableCell "42" align=right
            TableFooter
              TableRow
                TableCell "合计"
                TableCell "—"
                TableCell "3"
                TableCell "1030" align=right
        Box 260px * dashed background=hatch
          Typography caption "备注"
          Placeholder 100% 72px "草图"
          Skeleton text 100% 14px
          Skeleton rounded 100% 48px
      Stack row gap=1
        Pagination count=5 page=2
        Spacer
        Typography caption "第 2 页，共 5 页"`,
    form: `// 向导：步骤、混合字段、滑块、评分和日历
Wireframe #new-account portrait
  Stack column gap=2
    Typography h4 "创建账户"
    Stack row gap=3
      Box 220px
        Stepper vertical
          Step "个人资料" completed
          Step "访问" active
          Step "完成"
        Stack row gap=1
          Progress circular 60
          Typography caption "第 2 步"
      Calendar "2026年3月" compact events value=18 today=22 weekStart=mon
    Grid cols=2 gap=2
      TextField "全名" required
      TextField "邮箱" startIcon=Email required value="you@example.com"
      TextField "密码" startIcon=Lock required
      TextField "网站" startIcon=Link error value="http://" helperText="需要完整网址"
    Select "角色" value="编辑者"
      Option "读者" startIcon=Visibility
      Option "编辑者" startIcon=Edit selected
      Option "所有者" startIcon=Star subtext="完全访问"
    TextField "简介" multiline rows=2 filler=blocks
    TextField "团队" filled placeholder="studio"
    Stack row gap=2
      Control radio checked
      Typography body2 "个人"
      Control radio
      Typography body2 "协作"
      Spacer
      Typography body2 "密度"
      Slider 65 max=100
    Stack row gap=2
      Typography body2 "模板评分"
      Rating 4
      Spacer
      ToggleButtonGroup
        ToggleButton ViewList selected
        ToggleButton ViewModule
        ToggleButton GridView
    Alert warning "创建账户前请核对邮箱"
    Stack row gap=1
      Control checkbox checked
      Typography body1 "我同意条款"
    Stack row gap=2
      Button "创建账户" contained to=#welcome
      Button "草稿" outlined disabled
      ButtonGroup
        Button "日"
        Button "周"
        Button "月"`,
    settings: `// 设置：列表、手风琴、底部导航和对话框
Wireframe #settings mobile
  Stack column 100% * gap=2
    AppBar
      Toolbar
        Icon ArrowBack
        Typography h6 "设置"
        Spacer
        Icon Search
    Alert error "删除将清除图表"
    List dense subheader="账户"
      ListItem "个人资料" to=#profile
      ListItem "通知" to=#notifications
      ListItem "隐私" to=#privacy
      ListItem "关于" to=#about
    Stack column gap=1 divider
      AccordionHeader "外观" expanded
      AccordionBody
        Stack row gap=1
          Control switch checked
          Typography body2 "深色主题"
        Stack row gap=1
          Control switch
          Typography body2 "紧凑列表"
      AccordionHeader "语言" disabled
    BottomNavigation value="home" showLabels
      BottomNavigationAction "首页" icon=Home to=#home
      BottomNavigationAction "搜索" icon=Search to=#search
      BottomNavigationAction "个人资料" icon=Person to=#profile
  Dialog sm bottom
    DialogHeader "删除账户？"
    DialogContent
      Typography body2 "此操作无法撤销。"
    DialogActions
      Spacer
      Button "取消"
      Button "删除" contained startIcon=Delete`,
    flow: `// 两个屏幕共用的外壳：自定义图标、背景和 Flow 箭头
Icons
  mark "M12 2 2 22h20z"

Flow LR

Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Icon mark
      Typography h6 "Code2Graph"
      Spacer
      Icon Notifications
      Badge "2"
      Avatar "CG"
  Stack row 100% *
    Drawer
      List dense subheader="工作室"
        ListItem "概览" to=#home
        ListItem "编辑者" to=#editor
        ListItem "设置" to=#settings
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Stack column gap=2
    Stack row
      Typography h5 "概览"
      Spacer
      Button "打开编辑器" contained to=#editor
    Grid cols=3 gap=2
      Card
        CardHeader "看板" subheader="进行中" icon=Dashboard closeIcon=none
        CardContent
          Typography h3 "12"
          Typography caption "本周"
      Card
        CardHeader "编辑次数" icon=Edit closeIcon=none
        CardContent
          Chart "编辑次数" column 100% 100px
      Card
        CardHeader "构建" icon=TableChart closeIcon=none
        CardContent
          Progress linear 40 large
          Typography caption "发布中"
    List dense
      ListItem "新手引导"
      ListItem "结账"

Wireframe #editor background=#shell anchor=#content
  Stack column 100% * gap=2
    Stack row gap=1
      Link "返回概览" to=#home
      Spacer
      Chip "草稿" outlined small
      Button "发布" contained startIcon=CloudUpload
    Stack row * * gap=2
      Box 220px * outline=solid elevation=2
        Typography overline "图层"
        List
          ListItem "标题"
          ListItem "图表"
          ListItem "注释"
        Divider
        Skeleton text 160px 12px
        Skeleton circular 32px 32px
      Box * * dashed
        Placeholder * * "画布"
    Stack row gap=2
      Progress linear 35
      Spacer
      Snackbar "草稿已保存" bottomLeft`,
    product: `// 商品页：媒体、地图、规格表和操作
Wireframe #product w=1180 h=760
  Card
    Stack row gap=2
      Stack column 400px gap=1
        Img 100% ratio=16:9
        Stack row gap=1
          Chip "纸" outlined small
          Chip "A5" small background=crosshatch
          Chip "点" outlined small
      Map area * 300px pins=5 path compass labels icon=LocationOn
    CardContent
      Breadcrumbs ">"
        Link "目录" to=#catalog
        Typography "素描本"
      Stack row gap=1
        Typography h4 "素描本"
        Spacer
        Badge "−20%"
        Typography h5 "¥168"
      Stack row gap=1
        Rating 4 icon=Favorite emptyIcon=FavoriteBorder
        Divider vertical
        Typography body2 "128 条评价"
      Tabs
        Tab "关于商品"
        Tab "规格"
        Tab "评价" to=#reviews
      Typography body2 ~2 filler=lorem
      Table small
        TableHead
          TableRow
            TableCell "参数"
            TableCell "值"
        TableBody
          TableRow
            TableCell "封面"
            TableCell "牛皮纸"
          TableRow selected
            TableCell "页数"
            TableCell "128"
          TableRow
            TableCell "尺寸"
            TableCell "A5"
    CardActions
      ButtonGroup
        Button "1"
        Button "2"
        Button "3"
      Button "加入购物车" contained large crosshatch startIcon=ShoppingCart
      Button "详情" outlined to=#detail
      Spacer
      Link "返回目录" to=#catalog`,
  },
  ja: {
    login: `// ログイン：タブ、アイコン付きフィールド、警告、もう一つの入り方
Wireframe #login mobile
  Stack column gap=2
    Typography h4 center "ログイン"
    Typography body2 center "図の工房"
    Tabs
      Tab "ログイン"
      Tab "アカウント作成" to=#signup
    Alert info outlined "この端末での新しいログイン"
    TextField "メール" startIcon=Email required placeholder="you@example.com"
    TextField "パスワード" startIcon=Lock endIcon=Visibility required
    Stack row gap=1
      Control checkbox
      Typography body1 "記憶する"
      Spacer
      Link "忘れた？" href=#reset
    Button "ログイン" contained fullWidth startIcon=Login to=#dashboard // 主な操作
    Button "アカウント作成" outlined fullWidth to=#signup
    Divider dashed
    Stack row gap=1
      Chip "SSO" outlined small
      Button "会社" text small startIcon=Business
      Spacer
      Icon Language
    Typography caption center ~2 filler=lorem`,
    dashboard: `// 概要：メニュー、固定ドロワー、グラフのカード、表
Wireframe #dashboard landscape
  Menubar
    MenuItem "ファイル" icon=Save selected
    MenuItem "編集" icon=Edit
    MenuItem "表示"
    MenuItem "ヘルプ" icon=Help disabled
  AppBar dense denseBackground
    Toolbar dense
      Icon Menu
      Typography h6 "Code2Graph"
      Spacer
      Icon Search
      Spacer 16px
      Stack row gap=1
        Badge "4"
        Avatar "山" small rounded
      Fab Add small
  Stack row 100% * gap=2
    Drawer
      List dense subheader="区分"
        ListItem "ホーム" to=#home
        ListItem "報告" to=#reports
        ListItem "設定" to=#settings
      Typography caption "保存容量"
      Progress linear 68
      Chip "Pro" outlined small
    Stack column * * gap=2
      Stack row gap=1
        Breadcrumbs
          Link "工房" to=#home
          Link "報告" to=#reports
          Typography "3月"
        Spacer
        Button "書き出し" outlined small startIcon=Download to=#export
      Grid cols=3 gap=2
        Card
          CardHeader "図" subheader="過去7日間" icon=ShowChart closeIcon=none
          CardContent
            Chart "傾向" line 100% 110px legend series=4
          CardActions
            Button "開く" small to=#reports
            Chip "12" small
        Card elevation=3
          CardHeader "形式" subheader="書き出しの割合" icon=PieChart closeIcon=none
          CardContent
            Chart "割合" donut 100% 110px series=3
          CardActions
            Chip "PNG" small
            Chip "SVG" outlined small
        Card elevation=0
          CardHeader "プレビュー" subheader="最新の一式" icon=Image closeIcon=MoreVert
          CardContent
            Img 100% ratio=16:9
          CardActions
            Button "取得" small startIcon=Download
      Stack row * gap=2
        Box * * outline=solid scrollbar=vertical scrollbarValue=35 scrollbarHandle=40
          Table small
            TableHead
              TableRow
                TableCell "名前"
                TableCell "作成者"
                TableCell "状態"
                TableCell "閲覧" align=right
            TableBody
              TableRow
                TableCell "ログイン"
                TableCell "杏奈"
                TableCell "下書き"
                TableCell "128" align=right
              TableRow selected
                TableCell "外枠"
                TableCell "誠"
                TableCell "準備完了"
                TableCell "860" align=right
              TableRow
                TableCell "会計"
                TableCell "玲奈"
                TableCell "検討"
                TableCell "42" align=right
            TableFooter
              TableRow
                TableCell "合計"
                TableCell "—"
                TableCell "3"
                TableCell "1030" align=right
        Box 260px * dashed background=hatch
          Typography caption "メモ"
          Placeholder 100% 72px "下絵"
          Skeleton text 100% 14px
          Skeleton rounded 100% 48px
      Stack row gap=1
        Pagination count=5 page=2
        Spacer
        Typography caption "5ページ中2ページ"`,
    form: `// 案内：手順、各種フィールド、スライダー、評価、カレンダー
Wireframe #new-account portrait
  Stack column gap=2
    Typography h4 "アカウント作成"
    Stack row gap=3
      Box 220px
        Stepper vertical
          Step "プロフィール" completed
          Step "アクセス" active
          Step "完了"
        Stack row gap=1
          Progress circular 60
          Typography caption "手順 2"
      Calendar "2026年3月" compact events value=18 today=22 weekStart=mon
    Grid cols=2 gap=2
      TextField "氏名" required
      TextField "メール" startIcon=Email required value="you@example.com"
      TextField "パスワード" startIcon=Lock required
      TextField "ウェブサイト" startIcon=Link error value="http://" helperText="完全なURLが必要です"
    Select "役割" value="編集者"
      Option "閲覧者" startIcon=Visibility
      Option "編集者" startIcon=Edit selected
      Option "所有者" startIcon=Star subtext="すべての権限"
    TextField "自己紹介" multiline rows=2 filler=blocks
    TextField "班" filled placeholder="studio"
    Stack row gap=2
      Control radio checked
      Typography body2 "個人"
      Control radio
      Typography body2 "共同"
      Spacer
      Typography body2 "密度"
      Slider 65 max=100
    Stack row gap=2
      Typography body2 "ひな型の評価"
      Rating 4
      Spacer
      ToggleButtonGroup
        ToggleButton ViewList selected
        ToggleButton ViewModule
        ToggleButton GridView
    Alert warning "アカウント作成前にメールを確認してください"
    Stack row gap=1
      Control checkbox checked
      Typography body1 "条項に同意します"
    Stack row gap=2
      Button "アカウント作成" contained to=#welcome
      Button "下書き" outlined disabled
      ButtonGroup
        Button "日"
        Button "週"
        Button "月"`,
    settings: `// 設定：一覧、アコーディオン、下部の移動、ダイアログ
Wireframe #settings mobile
  Stack column 100% * gap=2
    AppBar
      Toolbar
        Icon ArrowBack
        Typography h6 "設定"
        Spacer
        Icon Search
    Alert error "削除すると図が消えます"
    List dense subheader="アカウント"
      ListItem "プロフィール" to=#profile
      ListItem "通知" to=#notifications
      ListItem "プライバシー" to=#privacy
      ListItem "このアプリについて" to=#about
    Stack column gap=1 divider
      AccordionHeader "外観" expanded
      AccordionBody
        Stack row gap=1
          Control switch checked
          Typography body2 "暗いテーマ"
        Stack row gap=1
          Control switch
          Typography body2 "コンパクトな一覧"
      AccordionHeader "言語" disabled
    BottomNavigation value="home" showLabels
      BottomNavigationAction "ホーム" icon=Home to=#home
      BottomNavigationAction "検索" icon=Search to=#search
      BottomNavigationAction "プロフィール" icon=Person to=#profile
  Dialog sm bottom
    DialogHeader "アカウントを削除しますか？"
    DialogContent
      Typography body2 "この操作は元に戻せません。"
    DialogActions
      Spacer
      Button "取消"
      Button "削除" contained startIcon=Delete`,
    flow: `// 二つの画面が共有する外枠：独自アイコン、背景、Flow の矢印
Icons
  mark "M12 2 2 22h20z"

Flow LR

Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Icon mark
      Typography h6 "Code2Graph"
      Spacer
      Icon Notifications
      Badge "2"
      Avatar "CG"
  Stack row 100% *
    Drawer
      List dense subheader="工房"
        ListItem "概要" to=#home
        ListItem "編集者" to=#editor
        ListItem "設定" to=#settings
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Stack column gap=2
    Stack row
      Typography h5 "概要"
      Spacer
      Button "編集画面を開く" contained to=#editor
    Grid cols=3 gap=2
      Card
        CardHeader "板" subheader="開いている" icon=Dashboard closeIcon=none
        CardContent
          Typography h3 "12"
          Typography caption "今週"
      Card
        CardHeader "編集" icon=Edit closeIcon=none
        CardContent
          Chart "編集" column 100% 100px
      Card
        CardHeader "構築" icon=TableChart closeIcon=none
        CardContent
          Progress linear 40 large
          Typography caption "公開中"
    List dense
      ListItem "導入案内"
      ListItem "会計"

Wireframe #editor background=#shell anchor=#content
  Stack column 100% * gap=2
    Stack row gap=1
      Link "概要に戻る" to=#home
      Spacer
      Chip "下書き" outlined small
      Button "公開する" contained startIcon=CloudUpload
    Stack row * * gap=2
      Box 220px * outline=solid elevation=2
        Typography overline "層"
        List
          ListItem "題名"
          ListItem "図"
          ListItem "メモ"
        Divider
        Skeleton text 160px 12px
        Skeleton circular 32px 32px
      Box * * dashed
        Placeholder * * "描画面"
    Stack row gap=2
      Progress linear 35
      Spacer
      Snackbar "下書きを保存しました" bottomLeft`,
    product: `// 商品ページ：メディア、地図、仕様表、操作
Wireframe #product w=1180 h=760
  Card
    Stack row gap=2
      Stack column 400px gap=1
        Img 100% ratio=16:9
        Stack row gap=1
          Chip "紙" outlined small
          Chip "A5" small background=crosshatch
          Chip "点" outlined small
      Map area * 300px pins=5 path compass labels icon=LocationOn
    CardContent
      Breadcrumbs ">"
        Link "目録" to=#catalog
        Typography "写生帳"
      Stack row gap=1
        Typography h4 "写生帳"
        Spacer
        Badge "−20%"
        Typography h5 "¥3600"
      Stack row gap=1
        Rating 4 icon=Favorite emptyIcon=FavoriteBorder
        Divider vertical
        Typography body2 "128件のレビュー"
      Tabs
        Tab "商品について"
        Tab "仕様"
        Tab "評価" to=#reviews
      Typography body2 ~2 filler=lorem
      Table small
        TableHead
          TableRow
            TableCell "項目"
            TableCell "値"
        TableBody
          TableRow
            TableCell "表紙"
            TableCell "クラフト紙"
          TableRow selected
            TableCell "ページ"
            TableCell "128"
          TableRow
            TableCell "寸法"
            TableCell "A5"
    CardActions
      ButtonGroup
        Button "1"
        Button "2"
        Button "3"
      Button "カートに入れる" contained large crosshatch startIcon=ShoppingCart
      Button "詳細" outlined to=#detail
      Spacer
      Link "目録に戻る" to=#catalog`,
  },
  hi: {
    login: `// प्रवेश: टैब, चिह्न वाले क्षेत्र, एक चेतावनी और अंदर आने का दूसरा तरीका
Wireframe #login mobile
  Stack column gap=2
    Typography h4 center "प्रवेश करें"
    Typography body2 center "आरेख कार्यशाला"
    Tabs
      Tab "प्रवेश करें"
      Tab "खाता बनाएँ" to=#signup
    Alert info outlined "इस उपकरण पर नया प्रवेश"
    TextField "ईमेल" startIcon=Email required placeholder="you@example.com"
    TextField "पासवर्ड" startIcon=Lock endIcon=Visibility required
    Stack row gap=1
      Control checkbox
      Typography body1 "मुझे याद रखें"
      Spacer
      Link "भूल गए?" href=#reset
    Button "प्रवेश करें" contained fullWidth startIcon=Login to=#dashboard // मुख्य क्रिया
    Button "खाता बनाएँ" outlined fullWidth to=#signup
    Divider dashed
    Stack row gap=1
      Chip "SSO" outlined small
      Button "कंपनी" text small startIcon=Business
      Spacer
      Icon Language
    Typography caption center ~2 filler=lorem`,
    dashboard: `// अवलोकन: मेनू, टिका दराज, चार्ट कार्ड और एक तालिका
Wireframe #dashboard landscape
  Menubar
    MenuItem "फ़ाइल" icon=Save selected
    MenuItem "संपादन" icon=Edit
    MenuItem "दृश्य"
    MenuItem "सहायता" icon=Help disabled
  AppBar dense denseBackground
    Toolbar dense
      Icon Menu
      Typography h6 "Code2Graph"
      Spacer
      Icon Search
      Spacer 16px
      Stack row gap=1
        Badge "4"
        Avatar "अ" small rounded
      Fab Add small
  Stack row 100% * gap=2
    Drawer
      List dense subheader="अनुभाग"
        ListItem "मुखपृष्ठ" to=#home
        ListItem "प्रतिवेदन" to=#reports
        ListItem "समायोजन" to=#settings
      Typography caption "संग्रह सीमा"
      Progress linear 68
      Chip "Pro" outlined small
    Stack column * * gap=2
      Stack row gap=1
        Breadcrumbs
          Link "कार्यशाला" to=#home
          Link "प्रतिवेदन" to=#reports
          Typography "मार्च"
        Spacer
        Button "निर्यात" outlined small startIcon=Download to=#export
      Grid cols=3 gap=2
        Card
          CardHeader "आरेख" subheader="पिछले 7 दिन" icon=ShowChart closeIcon=none
          CardContent
            Chart "प्रवृत्ति" line 100% 110px legend series=4
          CardActions
            Button "खोलें" small to=#reports
            Chip "12" small
        Card elevation=3
          CardHeader "प्रारूप" subheader="निर्यात अंश" icon=PieChart closeIcon=none
          CardContent
            Chart "हिस्सा" donut 100% 110px series=3
          CardActions
            Chip "PNG" small
            Chip "SVG" outlined small
        Card elevation=0
          CardHeader "पूर्वावलोकन" subheader="नवीनतम संकुल" icon=Image closeIcon=MoreVert
          CardContent
            Img 100% ratio=16:9
          CardActions
            Button "डाउनलोड" small startIcon=Download
      Stack row * gap=2
        Box * * outline=solid scrollbar=vertical scrollbarValue=35 scrollbarHandle=40
          Table small
            TableHead
              TableRow
                TableCell "नाम"
                TableCell "लेखक"
                TableCell "स्थिति"
                TableCell "दृश्य" align=right
            TableBody
              TableRow
                TableCell "प्रवेश"
                TableCell "अन्या"
                TableCell "मसौदा"
                TableCell "128" align=right
              TableRow selected
                TableCell "खोल"
                TableCell "मार्क"
                TableCell "तैयार"
                TableCell "860" align=right
              TableRow
                TableCell "भुगतान"
                TableCell "लीना"
                TableCell "समीक्षा"
                TableCell "42" align=right
            TableFooter
              TableRow
                TableCell "कुल"
                TableCell "—"
                TableCell "3"
                TableCell "1030" align=right
        Box 260px * dashed background=hatch
          Typography caption "टिप्पणी"
          Placeholder 100% 72px "रेखाचित्र"
          Skeleton text 100% 14px
          Skeleton rounded 100% 48px
      Stack row gap=1
        Pagination count=5 page=2
        Spacer
        Typography caption "पृष्ठ 2 / 5"`,
    form: `// सहायक: चरण, मिश्रित क्षेत्र, स्लाइडर, अंक और कैलेंडर
Wireframe #new-account portrait
  Stack column gap=2
    Typography h4 "खाता बनाएँ"
    Stack row gap=3
      Box 220px
        Stepper vertical
          Step "प्रोफ़ाइल" completed
          Step "पहुँच" active
          Step "पूर्ण"
        Stack row gap=1
          Progress circular 60
          Typography caption "चरण 2"
      Calendar "मार्च 2026" compact events value=18 today=22 weekStart=mon
    Grid cols=2 gap=2
      TextField "पूरा नाम" required
      TextField "ईमेल" startIcon=Email required value="you@example.com"
      TextField "पासवर्ड" startIcon=Lock required
      TextField "जालस्थल" startIcon=Link error value="http://" helperText="पूरा पता चाहिए"
    Select "भूमिका" value="संपादक"
      Option "पाठक" startIcon=Visibility
      Option "संपादक" startIcon=Edit selected
      Option "स्वामी" startIcon=Star subtext="पूर्ण पहुँच"
    TextField "परिचय" multiline rows=2 filler=blocks
    TextField "दल" filled placeholder="studio"
    Stack row gap=2
      Control radio checked
      Typography body2 "व्यक्तिगत"
      Control radio
      Typography body2 "सामूहिक"
      Spacer
      Typography body2 "घनत्व"
      Slider 65 max=100
    Stack row gap=2
      Typography body2 "साँचे का अंक"
      Rating 4
      Spacer
      ToggleButtonGroup
        ToggleButton ViewList selected
        ToggleButton ViewModule
        ToggleButton GridView
    Alert warning "खाता बनाने से पहले पत्र जाँचें"
    Stack row gap=1
      Control checkbox checked
      Typography body1 "मैं शर्तों से सहमत हूँ"
    Stack row gap=2
      Button "खाता बनाएँ" contained to=#welcome
      Button "मसौदा" outlined disabled
      ButtonGroup
        Button "दिन"
        Button "सप्ताह"
        Button "महीना"`,
    settings: `// समायोजन: सूची, अकॉर्डियन, निचला नेविगेशन और एक संवाद
Wireframe #settings mobile
  Stack column 100% * gap=2
    AppBar
      Toolbar
        Icon ArrowBack
        Typography h6 "समायोजन"
        Spacer
        Icon Search
    Alert error "हटाने से आरेख मिट जाएँगे"
    List dense subheader="खाता"
      ListItem "प्रोफ़ाइल" to=#profile
      ListItem "सूचनाएँ" to=#notifications
      ListItem "गोपनीयता" to=#privacy
      ListItem "ऐप के बारे में" to=#about
    Stack column gap=1 divider
      AccordionHeader "दिखावट" expanded
      AccordionBody
        Stack row gap=1
          Control switch checked
          Typography body2 "गहरी थीम"
        Stack row gap=1
          Control switch
          Typography body2 "संक्षिप्त सूचियाँ"
      AccordionHeader "भाषा" disabled
    BottomNavigation value="home" showLabels
      BottomNavigationAction "मुखपृष्ठ" icon=Home to=#home
      BottomNavigationAction "खोज" icon=Search to=#search
      BottomNavigationAction "प्रोफ़ाइल" icon=Person to=#profile
  Dialog sm bottom
    DialogHeader "खाता हटाएँ?"
    DialogContent
      Typography body2 "इसे पूर्ववत नहीं किया जा सकता।"
    DialogActions
      Spacer
      Button "रद्द करें"
      Button "हटाएँ" contained startIcon=Delete`,
    flow: `// दो स्क्रीन का साझा खोल: अपना चिह्न, पृष्ठभूमि और Flow तीर
Icons
  mark "M12 2 2 22h20z"

Flow LR

Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Icon mark
      Typography h6 "Code2Graph"
      Spacer
      Icon Notifications
      Badge "2"
      Avatar "CG"
  Stack row 100% *
    Drawer
      List dense subheader="कार्यशाला"
        ListItem "अवलोकन" to=#home
        ListItem "संपादक" to=#editor
        ListItem "समायोजन" to=#settings
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Stack column gap=2
    Stack row
      Typography h5 "अवलोकन"
      Spacer
      Button "संपादन खोलें" contained to=#editor
    Grid cols=3 gap=2
      Card
        CardHeader "पट्टियाँ" subheader="खुले" icon=Dashboard closeIcon=none
        CardContent
          Typography h3 "12"
          Typography caption "इस सप्ताह"
      Card
        CardHeader "संपादन" icon=Edit closeIcon=none
        CardContent
          Chart "संपादन" column 100% 100px
      Card
        CardHeader "निर्माण" icon=TableChart closeIcon=none
        CardContent
          Progress linear 40 large
          Typography caption "प्रकाशन"
    List dense
      ListItem "आरंभ"
      ListItem "भुगतान"

Wireframe #editor background=#shell anchor=#content
  Stack column 100% * gap=2
    Stack row gap=1
      Link "अवलोकन पर वापस" to=#home
      Spacer
      Chip "मसौदा" outlined small
      Button "प्रकाशित करें" contained startIcon=CloudUpload
    Stack row * * gap=2
      Box 220px * outline=solid elevation=2
        Typography overline "परतें"
        List
          ListItem "शीर्षक"
          ListItem "आरेख"
          ListItem "टिप्पणियाँ"
        Divider
        Skeleton text 160px 12px
        Skeleton circular 32px 32px
      Box * * dashed
        Placeholder * * "कैनवास"
    Stack row gap=2
      Progress linear 35
      Spacer
      Snackbar "मसौदा सहेजा गया" bottomLeft`,
    product: `// उत्पाद पृष्ठ: मीडिया, मानचित्र, विनिर्देश तालिका और क्रियाएँ
Wireframe #product w=1180 h=760
  Card
    Stack row gap=2
      Stack column 400px gap=1
        Img 100% ratio=16:9
        Stack row gap=1
          Chip "कागज़" outlined small
          Chip "A5" small background=crosshatch
          Chip "बिंदु" outlined small
      Map area * 300px pins=5 path compass labels icon=LocationOn
    CardContent
      Breadcrumbs ">"
        Link "सूची" to=#catalog
        Typography "रेखाचित्र पुस्तिका"
      Stack row gap=1
        Typography h4 "रेखाचित्र पुस्तिका"
        Spacer
        Badge "−20%"
        Typography h5 "₹2000"
      Stack row gap=1
        Rating 4 icon=Favorite emptyIcon=FavoriteBorder
        Divider vertical
        Typography body2 "128 समीक्षाएँ"
      Tabs
        Tab "उत्पाद के बारे में"
        Tab "विनिर्देश"
        Tab "समीक्षाएँ" to=#reviews
      Typography body2 ~2 filler=lorem
      Table small
        TableHead
          TableRow
            TableCell "मापदंड"
            TableCell "मान"
        TableBody
          TableRow
            TableCell "आवरण"
            TableCell "क्राफ्ट कागज़"
          TableRow selected
            TableCell "पृष्ठ"
            TableCell "128"
          TableRow
            TableCell "आकार"
            TableCell "A5"
    CardActions
      ButtonGroup
        Button "1"
        Button "2"
        Button "3"
      Button "टोकरी में डालें" contained large crosshatch startIcon=ShoppingCart
      Button "विवरण" outlined to=#detail
      Spacer
      Link "सूची पर वापस" to=#catalog`,
  },
  pt: {
    login: `// Entrada: abas, campos com ícones, um alerta e outra forma de entrar
Wireframe #login mobile
  Stack column gap=2
    Typography h4 center "Entrar"
    Typography body2 center "Estúdio de diagramas"
    Tabs
      Tab "Entrar"
      Tab "Criar conta" to=#signup
    Alert info outlined "Novo acesso neste dispositivo"
    TextField "E-mail" startIcon=Email required placeholder="you@example.com"
    TextField "Senha" startIcon=Lock endIcon=Visibility required
    Stack row gap=1
      Control checkbox
      Typography body1 "Lembrar de mim"
      Spacer
      Link "Esqueceu?" href=#reset
    Button "Entrar" contained fullWidth startIcon=Login to=#dashboard // ação principal
    Button "Criar conta" outlined fullWidth to=#signup
    Divider dashed
    Stack row gap=1
      Chip "SSO" outlined small
      Button "Empresa" text small startIcon=Business
      Spacer
      Icon Language
    Typography caption center ~2 filler=lorem`,
    dashboard: `// Visão geral: menu, gaveta fixa, cartões com gráficos e uma tabela
Wireframe #dashboard landscape
  Menubar
    MenuItem "Arquivo" icon=Save selected
    MenuItem "Editar" icon=Edit
    MenuItem "Exibir"
    MenuItem "Ajuda" icon=Help disabled
  AppBar dense denseBackground
    Toolbar dense
      Icon Menu
      Typography h6 "Code2Graph"
      Spacer
      Icon Search
      Spacer 16px
      Stack row gap=1
        Badge "4"
        Avatar "AR" small rounded
      Fab Add small
  Stack row 100% * gap=2
    Drawer
      List dense subheader="Seções"
        ListItem "Início" to=#home
        ListItem "Relatórios" to=#reports
        ListItem "Configurações" to=#settings
      Typography caption "Cota de armazenamento"
      Progress linear 68
      Chip "Pro" outlined small
    Stack column * * gap=2
      Stack row gap=1
        Breadcrumbs
          Link "Estúdio" to=#home
          Link "Relatórios" to=#reports
          Typography "Março"
        Spacer
        Button "Exportar" outlined small startIcon=Download to=#export
      Grid cols=3 gap=2
        Card
          CardHeader "Diagramas" subheader="Últimos 7 dias" icon=ShowChart closeIcon=none
          CardContent
            Chart "Tendência" line 100% 110px legend series=4
          CardActions
            Button "Abrir" small to=#reports
            Chip "12" small
        Card elevation=3
          CardHeader "Formatos" subheader="Parcela da exportação" icon=PieChart closeIcon=none
          CardContent
            Chart "Participação" donut 100% 110px series=3
          CardActions
            Chip "PNG" small
            Chip "SVG" outlined small
        Card elevation=0
          CardHeader "Prévia" subheader="Pacote mais recente" icon=Image closeIcon=MoreVert
          CardContent
            Img 100% ratio=16:9
          CardActions
            Button "Baixar" small startIcon=Download
      Stack row * gap=2
        Box * * outline=solid scrollbar=vertical scrollbarValue=35 scrollbarHandle=40
          Table small
            TableHead
              TableRow
                TableCell "Nome"
                TableCell "Autor"
                TableCell "Situação"
                TableCell "Visualizações" align=right
            TableBody
              TableRow
                TableCell "Acesso"
                TableCell "Ana"
                TableCell "Rascunho"
                TableCell "128" align=right
              TableRow selected
                TableCell "Casca"
                TableCell "Marcos"
                TableCell "Pronto"
                TableCell "860" align=right
              TableRow
                TableCell "Pagamento"
                TableCell "Helena"
                TableCell "Revisão"
                TableCell "42" align=right
            TableFooter
              TableRow
                TableCell "Soma"
                TableCell "—"
                TableCell "3"
                TableCell "1030" align=right
        Box 260px * dashed background=hatch
          Typography caption "Nota"
          Placeholder 100% 72px "Esboço"
          Skeleton text 100% 14px
          Skeleton rounded 100% 48px
      Stack row gap=1
        Pagination count=5 page=2
        Spacer
        Typography caption "Pág. 2 de 5"`,
    form: `// Assistente: passos, campos variados, um controle deslizante, uma avaliação e um calendário
Wireframe #new-account portrait
  Stack column gap=2
    Typography h4 "Criar conta"
    Stack row gap=3
      Box 220px
        Stepper vertical
          Step "Perfil" completed
          Step "Acesso" active
          Step "Concluído"
        Stack row gap=1
          Progress circular 60
          Typography caption "Passo 2"
      Calendar "Março 2026" compact events value=18 today=22 weekStart=mon
    Grid cols=2 gap=2
      TextField "Nome completo" required
      TextField "E-mail" startIcon=Email required value="you@example.com"
      TextField "Senha" startIcon=Lock required
      TextField "Site" startIcon=Link error value="http://" helperText="É preciso uma URL completa"
    Select "Função" value="Redator"
      Option "Leitor" startIcon=Visibility
      Option "Redator" startIcon=Edit selected
      Option "Proprietário" startIcon=Star subtext="Acesso total"
    TextField "Sobre mim" multiline rows=2 filler=blocks
    TextField "Equipe" filled placeholder="studio"
    Stack row gap=2
      Control radio checked
      Typography body2 "Pessoal"
      Control radio
      Typography body2 "Em equipe"
      Spacer
      Typography body2 "Densidade"
      Slider 65 max=100
    Stack row gap=2
      Typography body2 "Nota do modelo"
      Rating 4
      Spacer
      ToggleButtonGroup
        ToggleButton ViewList selected
        ToggleButton ViewModule
        ToggleButton GridView
    Alert warning "Confira o e-mail antes de criar a conta"
    Stack row gap=1
      Control checkbox checked
      Typography body1 "Concordo com os termos"
    Stack row gap=2
      Button "Criar conta" contained to=#welcome
      Button "Rascunho" outlined disabled
      ButtonGroup
        Button "Dia"
        Button "Semana"
        Button "Mês"`,
    settings: `// Configurações: lista, sanfona, navegação inferior e um diálogo
Wireframe #settings mobile
  Stack column 100% * gap=2
    AppBar
      Toolbar
        Icon ArrowBack
        Typography h6 "Configurações"
        Spacer
        Icon Search
    Alert error "Excluir apaga os diagramas"
    List dense subheader="Conta"
      ListItem "Perfil" to=#profile
      ListItem "Notificações" to=#notifications
      ListItem "Privacidade" to=#privacy
      ListItem "Sobre" to=#about
    Stack column gap=1 divider
      AccordionHeader "Aparência" expanded
      AccordionBody
        Stack row gap=1
          Control switch checked
          Typography body2 "Tema escuro"
        Stack row gap=1
          Control switch
          Typography body2 "Listas compactas"
      AccordionHeader "Idioma" disabled
    BottomNavigation value="home" showLabels
      BottomNavigationAction "Início" icon=Home to=#home
      BottomNavigationAction "Pesquisar" icon=Search to=#search
      BottomNavigationAction "Perfil" icon=Person to=#profile
  Dialog sm bottom
    DialogHeader "Excluir a conta?"
    DialogContent
      Typography body2 "Esta ação não pode ser desfeita."
    DialogActions
      Spacer
      Button "Cancelar"
      Button "Excluir" contained startIcon=Delete`,
    flow: `// Casca compartilhada para duas telas: ícone próprio, fundo e setas Flow
Icons
  mark "M12 2 2 22h20z"

Flow LR

Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Icon mark
      Typography h6 "Code2Graph"
      Spacer
      Icon Notifications
      Badge "2"
      Avatar "CG"
  Stack row 100% *
    Drawer
      List dense subheader="Estúdio"
        ListItem "Visão geral" to=#home
        ListItem "Redator" to=#editor
        ListItem "Configurações" to=#settings
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Stack column gap=2
    Stack row
      Typography h5 "Visão geral"
      Spacer
      Button "Abrir edição" contained to=#editor
    Grid cols=3 gap=2
      Card
        CardHeader "Quadros" subheader="Abertos" icon=Dashboard closeIcon=none
        CardContent
          Typography h3 "12"
          Typography caption "esta semana"
      Card
        CardHeader "Edições" icon=Edit closeIcon=none
        CardContent
          Chart "Edições" column 100% 100px
      Card
        CardHeader "Compilação" icon=TableChart closeIcon=none
        CardContent
          Progress linear 40 large
          Typography caption "Publicação"
    List dense
      ListItem "Integração"
      ListItem "Pagamento"

Wireframe #editor background=#shell anchor=#content
  Stack column 100% * gap=2
    Stack row gap=1
      Link "Voltar à visão geral" to=#home
      Spacer
      Chip "Rascunho" outlined small
      Button "Publicar" contained startIcon=CloudUpload
    Stack row * * gap=2
      Box 220px * outline=solid elevation=2
        Typography overline "Camadas"
        List
          ListItem "Título"
          ListItem "Diagrama"
          ListItem "Notas"
        Divider
        Skeleton text 160px 12px
        Skeleton circular 32px 32px
      Box * * dashed
        Placeholder * * "Tela"
    Stack row gap=2
      Progress linear 35
      Spacer
      Snackbar "Rascunho salvo" bottomLeft`,
    product: `// Página do produto: mídia, um mapa, uma tabela de especificações e ações
Wireframe #product w=1180 h=760
  Card
    Stack row gap=2
      Stack column 400px gap=1
        Img 100% ratio=16:9
        Stack row gap=1
          Chip "Papel" outlined small
          Chip "A5" small background=crosshatch
          Chip "Ponto" outlined small
      Map area * 300px pins=5 path compass labels icon=LocationOn
    CardContent
      Breadcrumbs ">"
        Link "Catálogo" to=#catalog
        Typography "Caderno de esboços"
      Stack row gap=1
        Typography h4 "Caderno de esboços"
        Spacer
        Badge "−20%"
        Typography h5 "R$ 120"
      Stack row gap=1
        Rating 4 icon=Favorite emptyIcon=FavoriteBorder
        Divider vertical
        Typography body2 "128 avaliações"
      Tabs
        Tab "Sobre o produto"
        Tab "Especificações"
        Tab "Avaliações" to=#reviews
      Typography body2 ~2 filler=lorem
      Table small
        TableHead
          TableRow
            TableCell "Parâmetro"
            TableCell "Valor"
        TableBody
          TableRow
            TableCell "Capa"
            TableCell "Papel kraft"
          TableRow selected
            TableCell "Páginas"
            TableCell "128"
          TableRow
            TableCell "Tamanho"
            TableCell "A5"
    CardActions
      ButtonGroup
        Button "1"
        Button "2"
        Button "3"
      Button "Adicionar ao carrinho" contained large crosshatch startIcon=ShoppingCart
      Button "Detalhes" outlined to=#detail
      Spacer
      Link "Voltar ao catálogo" to=#catalog`,
  },
  de: {
    login: `// Anmeldung: Reiter, Felder mit Symbolen, ein Hinweis und ein zweiter Weg hinein
Wireframe #login mobile
  Stack column gap=2
    Typography h4 center "Anmelden"
    Typography body2 center "Diagrammstudio"
    Tabs
      Tab "Anmelden"
      Tab "Konto erstellen" to=#signup
    Alert info outlined "Neue Anmeldung auf diesem Gerät"
    TextField "E-Mail" startIcon=Email required placeholder="you@example.com"
    TextField "Passwort" startIcon=Lock endIcon=Visibility required
    Stack row gap=1
      Control checkbox
      Typography body1 "Angemeldet bleiben"
      Spacer
      Link "Vergessen?" href=#reset
    Button "Anmelden" contained fullWidth startIcon=Login to=#dashboard // Hauptaktion
    Button "Konto erstellen" outlined fullWidth to=#signup
    Divider dashed
    Stack row gap=1
      Chip "SSO" outlined small
      Button "Firma" text small startIcon=Business
      Spacer
      Icon Language
    Typography caption center ~2 filler=lorem`,
    dashboard: `// Übersicht: Menü, angedockte Leiste, Diagrammkarten und eine Tabelle
Wireframe #dashboard landscape
  Menubar
    MenuItem "Datei" icon=Save selected
    MenuItem "Bearbeiten" icon=Edit
    MenuItem "Ansicht"
    MenuItem "Hilfe" icon=Help disabled
  AppBar dense denseBackground
    Toolbar dense
      Icon Menu
      Typography h6 "Code2Graph"
      Spacer
      Icon Search
      Spacer 16px
      Stack row gap=1
        Badge "4"
        Avatar "MK" small rounded
      Fab Add small
  Stack row 100% * gap=2
    Drawer
      List dense subheader="Bereiche"
        ListItem "Startseite" to=#home
        ListItem "Berichte" to=#reports
        ListItem "Einstellungen" to=#settings
      Typography caption "Speicherkontingent"
      Progress linear 68
      Chip "Pro" outlined small
    Stack column * * gap=2
      Stack row gap=1
        Breadcrumbs
          Link "Atelier" to=#home
          Link "Berichte" to=#reports
          Typography "März"
        Spacer
        Button "Exportieren" outlined small startIcon=Download to=#export
      Grid cols=3 gap=2
        Card
          CardHeader "Diagramme" subheader="Letzte 7 Tage" icon=ShowChart closeIcon=none
          CardContent
            Chart "Verlauf" line 100% 110px legend series=4
          CardActions
            Button "Öffnen" small to=#reports
            Chip "12" small
        Card elevation=3
          CardHeader "Formate" subheader="Exportanteil" icon=PieChart closeIcon=none
          CardContent
            Chart "Anteil" donut 100% 110px series=3
          CardActions
            Chip "PNG" small
            Chip "SVG" outlined small
        Card elevation=0
          CardHeader "Vorschau" subheader="Neuestes Paket" icon=Image closeIcon=MoreVert
          CardContent
            Img 100% ratio=16:9
          CardActions
            Button "Herunterladen" small startIcon=Download
      Stack row * gap=2
        Box * * outline=solid scrollbar=vertical scrollbarValue=35 scrollbarHandle=40
          Table small
            TableHead
              TableRow
                TableCell "Name"
                TableCell "Autor"
                TableCell "Stand"
                TableCell "Aufrufe" align=right
            TableBody
              TableRow
                TableCell "Anmeldung"
                TableCell "Anja"
                TableCell "Entwurf"
                TableCell "128" align=right
              TableRow selected
                TableCell "Hülle"
                TableCell "Markus"
                TableCell "Bereit"
                TableCell "860" align=right
              TableRow
                TableCell "Kasse"
                TableCell "Helene"
                TableCell "Prüfung"
                TableCell "42" align=right
            TableFooter
              TableRow
                TableCell "Summe"
                TableCell "—"
                TableCell "3"
                TableCell "1030" align=right
        Box 260px * dashed background=hatch
          Typography caption "Notiz"
          Placeholder 100% 72px "Skizze"
          Skeleton text 100% 14px
          Skeleton rounded 100% 48px
      Stack row gap=1
        Pagination count=5 page=2
        Spacer
        Typography caption "Seite 2 von 5"`,
    form: `// Assistent: Schritte, gemischte Felder, ein Schieberegler, eine Bewertung und ein Kalender
Wireframe #new-account portrait
  Stack column gap=2
    Typography h4 "Konto erstellen"
    Stack row gap=3
      Box 220px
        Stepper vertical
          Step "Profil" completed
          Step "Zugriff" active
          Step "Fertig"
        Stack row gap=1
          Progress circular 60
          Typography caption "Schritt 2"
      Calendar "März 2026" compact events value=18 today=22 weekStart=mon
    Grid cols=2 gap=2
      TextField "Vollständiger Name" required
      TextField "E-Mail" startIcon=Email required value="you@example.com"
      TextField "Passwort" startIcon=Lock required
      TextField "Webseite" startIcon=Link error value="http://" helperText="Vollständige URL nötig"
    Select "Rolle" value="Redakteur"
      Option "Leser" startIcon=Visibility
      Option "Redakteur" startIcon=Edit selected
      Option "Eigentümer" startIcon=Star subtext="Voller Zugriff"
    TextField "Über mich" multiline rows=2 filler=blocks
    TextField "Gruppe" filled placeholder="studio"
    Stack row gap=2
      Control radio checked
      Typography body2 "Persönlich"
      Control radio
      Typography body2 "Gemeinsam"
      Spacer
      Typography body2 "Dichte"
      Slider 65 max=100
    Stack row gap=2
      Typography body2 "Vorlagenwertung"
      Rating 4
      Spacer
      ToggleButtonGroup
        ToggleButton ViewList selected
        ToggleButton ViewModule
        ToggleButton GridView
    Alert warning "Prüfen Sie die E-Mail vor dem Erstellen des Kontos"
    Stack row gap=1
      Control checkbox checked
      Typography body1 "Ich stimme den Bedingungen zu"
    Stack row gap=2
      Button "Konto erstellen" contained to=#welcome
      Button "Entwurf" outlined disabled
      ButtonGroup
        Button "Tag"
        Button "Woche"
        Button "Monat"`,
    settings: `// Einstellungen: Liste, Akkordeon, untere Navigation und ein Dialog
Wireframe #settings mobile
  Stack column 100% * gap=2
    AppBar
      Toolbar
        Icon ArrowBack
        Typography h6 "Einstellungen"
        Spacer
        Icon Search
    Alert error "Löschen entfernt die Diagramme"
    List dense subheader="Konto"
      ListItem "Profil" to=#profile
      ListItem "Benachrichtigungen" to=#notifications
      ListItem "Datenschutz" to=#privacy
      ListItem "Über die App" to=#about
    Stack column gap=1 divider
      AccordionHeader "Darstellung" expanded
      AccordionBody
        Stack row gap=1
          Control switch checked
          Typography body2 "Dunkles Design"
        Stack row gap=1
          Control switch
          Typography body2 "Kompakte Listen"
      AccordionHeader "Sprache" disabled
    BottomNavigation value="home" showLabels
      BottomNavigationAction "Startseite" icon=Home to=#home
      BottomNavigationAction "Suchen" icon=Search to=#search
      BottomNavigationAction "Profil" icon=Person to=#profile
  Dialog sm bottom
    DialogHeader "Konto löschen?"
    DialogContent
      Typography body2 "Dies lässt sich nicht rückgängig machen."
    DialogActions
      Spacer
      Button "Abbrechen"
      Button "Löschen" contained startIcon=Delete`,
    flow: `// Gemeinsame Hülle für zwei Bildschirme: eigenes Symbol, Hintergrund und Flow-Pfeile
Icons
  mark "M12 2 2 22h20z"

Flow LR

Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Icon mark
      Typography h6 "Code2Graph"
      Spacer
      Icon Notifications
      Badge "2"
      Avatar "CG"
  Stack row 100% *
    Drawer
      List dense subheader="Atelier"
        ListItem "Übersicht" to=#home
        ListItem "Redakteur" to=#editor
        ListItem "Einstellungen" to=#settings
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Stack column gap=2
    Stack row
      Typography h5 "Übersicht"
      Spacer
      Button "Bearbeitung öffnen" contained to=#editor
    Grid cols=3 gap=2
      Card
        CardHeader "Tafeln" subheader="Offen" icon=Dashboard closeIcon=none
        CardContent
          Typography h3 "12"
          Typography caption "diese Woche"
      Card
        CardHeader "Bearbeitungen" icon=Edit closeIcon=none
        CardContent
          Chart "Bearbeitungen" column 100% 100px
      Card
        CardHeader "Erstellung" icon=TableChart closeIcon=none
        CardContent
          Progress linear 40 large
          Typography caption "Veröffentlichung"
    List dense
      ListItem "Einführung"
      ListItem "Kasse"

Wireframe #editor background=#shell anchor=#content
  Stack column 100% * gap=2
    Stack row gap=1
      Link "Zurück zur Übersicht" to=#home
      Spacer
      Chip "Entwurf" outlined small
      Button "Veröffentlichen" contained startIcon=CloudUpload
    Stack row * * gap=2
      Box 220px * outline=solid elevation=2
        Typography overline "Ebenen"
        List
          ListItem "Titel"
          ListItem "Diagramm"
          ListItem "Notizen"
        Divider
        Skeleton text 160px 12px
        Skeleton circular 32px 32px
      Box * * dashed
        Placeholder * * "Leinwand"
    Stack row gap=2
      Progress linear 35
      Spacer
      Snackbar "Entwurf gespeichert" bottomLeft`,
    product: `// Produktseite: Medien, eine Karte, eine Spezifikationstabelle und Aktionen
Wireframe #product w=1180 h=760
  Card
    Stack row gap=2
      Stack column 400px gap=1
        Img 100% ratio=16:9
        Stack row gap=1
          Chip "Papier" outlined small
          Chip "A5" small background=crosshatch
          Chip "Punkt" outlined small
      Map area * 300px pins=5 path compass labels icon=LocationOn
    CardContent
      Breadcrumbs ">"
        Link "Katalog" to=#catalog
        Typography "Skizzenbuch"
      Stack row gap=1
        Typography h4 "Skizzenbuch"
        Spacer
        Badge "−20%"
        Typography h5 "24 €"
      Stack row gap=1
        Rating 4 icon=Favorite emptyIcon=FavoriteBorder
        Divider vertical
        Typography body2 "128 Rezensionen"
      Tabs
        Tab "Zum Produkt"
        Tab "Angaben"
        Tab "Rezensionen" to=#reviews
      Typography body2 ~2 filler=lorem
      Table small
        TableHead
          TableRow
            TableCell "Merkmal"
            TableCell "Wert"
        TableBody
          TableRow
            TableCell "Einband"
            TableCell "Kraftpapier"
          TableRow selected
            TableCell "Seiten"
            TableCell "128"
          TableRow
            TableCell "Größe"
            TableCell "A5"
    CardActions
      ButtonGroup
        Button "1"
        Button "2"
        Button "3"
      Button "In den Warenkorb" contained large crosshatch startIcon=ShoppingCart
      Button "Einzelheiten" outlined to=#detail
      Spacer
      Link "Zurück zum Katalog" to=#catalog`,
  },
  ar: {
    login: `// تسجيل الدخول: علامات تبويب وحقول بأيقونات وتنبيه وطريقة ثانية للدخول
Wireframe #login mobile
  Stack column gap=2
    Typography h4 center "تسجيل الدخول"
    Typography body2 center "استوديو المخططات"
    Tabs
      Tab "تسجيل الدخول"
      Tab "إنشاء حساب" to=#signup
    Alert info outlined "دخول جديد من هذا الجهاز"
    TextField "البريد" startIcon=Email required placeholder="you@example.com"
    TextField "كلمة المرور" startIcon=Lock endIcon=Visibility required
    Stack row gap=1
      Control checkbox
      Typography body1 "تذكرني"
      Spacer
      Link "نسيت؟" href=#reset
    Button "تسجيل الدخول" contained fullWidth startIcon=Login to=#dashboard // الإجراء الأساسي
    Button "إنشاء حساب" outlined fullWidth to=#signup
    Divider dashed
    Stack row gap=1
      Chip "SSO" outlined small
      Button "الشركة" text small startIcon=Business
      Spacer
      Icon Language
    Typography caption center ~2 filler=lorem`,
    dashboard: `// نظرة عامة: قائمة ودرج مثبت وبطاقات بمخططات وجدول
Wireframe #dashboard landscape
  Menubar
    MenuItem "ملف" icon=Save selected
    MenuItem "تحرير" icon=Edit
    MenuItem "عرض"
    MenuItem "تعليمات" icon=Help disabled
  AppBar dense denseBackground
    Toolbar dense
      Icon Menu
      Typography h6 "Code2Graph"
      Spacer
      Icon Search
      Spacer 16px
      Stack row gap=1
        Badge "4"
        Avatar "س" small rounded
      Fab Add small
  Stack row 100% * gap=2
    Drawer
      List dense subheader="الأقسام"
        ListItem "الرئيسية" to=#home
        ListItem "التقارير" to=#reports
        ListItem "الإعدادات" to=#settings
      Typography caption "حصة التخزين"
      Progress linear 68
      Chip "Pro" outlined small
    Stack column * * gap=2
      Stack row gap=1
        Breadcrumbs
          Link "الاستوديو" to=#home
          Link "التقارير" to=#reports
          Typography "مارس"
        Spacer
        Button "تصدير" outlined small startIcon=Download to=#export
      Grid cols=3 gap=2
        Card
          CardHeader "مخططات" subheader="آخر 7 أيام" icon=ShowChart closeIcon=none
          CardContent
            Chart "اتجاه" line 100% 110px legend series=4
          CardActions
            Button "فتح" small to=#reports
            Chip "12" small
        Card elevation=3
          CardHeader "التنسيقات" subheader="حصة التصدير" icon=PieChart closeIcon=none
          CardContent
            Chart "الحصة" donut 100% 110px series=3
          CardActions
            Chip "PNG" small
            Chip "SVG" outlined small
        Card elevation=0
          CardHeader "معاينة" subheader="أحدث حزمة" icon=Image closeIcon=MoreVert
          CardContent
            Img 100% ratio=16:9
          CardActions
            Button "تنزيل" small startIcon=Download
      Stack row * gap=2
        Box * * outline=solid scrollbar=vertical scrollbarValue=35 scrollbarHandle=40
          Table small
            TableHead
              TableRow
                TableCell "الاسم"
                TableCell "المؤلف"
                TableCell "الحالة"
                TableCell "المشاهدات" align=right
            TableBody
              TableRow
                TableCell "تسجيل الدخول"
                TableCell "آنيا"
                TableCell "مسودة"
                TableCell "128" align=right
              TableRow selected
                TableCell "الغلاف"
                TableCell "مارك"
                TableCell "جاهز"
                TableCell "860" align=right
              TableRow
                TableCell "الدفع"
                TableCell "لينا"
                TableCell "مراجعة"
                TableCell "42" align=right
            TableFooter
              TableRow
                TableCell "الإجمالي"
                TableCell "—"
                TableCell "3"
                TableCell "1030" align=right
        Box 260px * dashed background=hatch
          Typography caption "ملاحظة"
          Placeholder 100% 72px "مخطط تخطيطي"
          Skeleton text 100% 14px
          Skeleton rounded 100% 48px
      Stack row gap=1
        Pagination count=5 page=2
        Spacer
        Typography caption "الصفحة 2 من 5"`,
    form: `// معالج: خطوات وحقول متنوعة وشريط تمرير وتقييم وتقويم
Wireframe #new-account portrait
  Stack column gap=2
    Typography h4 "إنشاء حساب"
    Stack row gap=3
      Box 220px
        Stepper vertical
          Step "الملف الشخصي" completed
          Step "الوصول" active
          Step "تم"
        Stack row gap=1
          Progress circular 60
          Typography caption "الخطوة 2"
      Calendar "مارس 2026" compact events value=18 today=22 weekStart=mon
    Grid cols=2 gap=2
      TextField "الاسم الكامل" required
      TextField "البريد" startIcon=Email required value="you@example.com"
      TextField "كلمة المرور" startIcon=Lock required
      TextField "الموقع" startIcon=Link error value="http://" helperText="يلزم عنوان كامل"
    Select "الدور" value="المحرر"
      Option "القارئ" startIcon=Visibility
      Option "المحرر" startIcon=Edit selected
      Option "المالك" startIcon=Star subtext="وصول كامل"
    TextField "نبذة" multiline rows=2 filler=blocks
    TextField "الفريق" filled placeholder="studio"
    Stack row gap=2
      Control radio checked
      Typography body2 "شخصي"
      Control radio
      Typography body2 "جماعي"
      Spacer
      Typography body2 "الكثافة"
      Slider 65 max=100
    Stack row gap=2
      Typography body2 "درجة القالب"
      Rating 4
      Spacer
      ToggleButtonGroup
        ToggleButton ViewList selected
        ToggleButton ViewModule
        ToggleButton GridView
    Alert warning "تحقق من البريد قبل إنشاء الحساب"
    Stack row gap=1
      Control checkbox checked
      Typography body1 "أوافق على الشروط"
    Stack row gap=2
      Button "إنشاء حساب" contained to=#welcome
      Button "مسودة" outlined disabled
      ButtonGroup
        Button "يوم"
        Button "أسبوع"
        Button "شهر"`,
    settings: `// الإعدادات: قائمة وأكورديون وتنقل سفلي ومربع حوار
Wireframe #settings mobile
  Stack column 100% * gap=2
    AppBar
      Toolbar
        Icon ArrowBack
        Typography h6 "الإعدادات"
        Spacer
        Icon Search
    Alert error "الحذف يمسح المخططات"
    List dense subheader="الحساب"
      ListItem "الملف الشخصي" to=#profile
      ListItem "الإشعارات" to=#notifications
      ListItem "الخصوصية" to=#privacy
      ListItem "حول التطبيق" to=#about
    Stack column gap=1 divider
      AccordionHeader "المظهر" expanded
      AccordionBody
        Stack row gap=1
          Control switch checked
          Typography body2 "سمة داكنة"
        Stack row gap=1
          Control switch
          Typography body2 "قوائم مضغوطة"
      AccordionHeader "اللغة" disabled
    BottomNavigation value="home" showLabels
      BottomNavigationAction "الرئيسية" icon=Home to=#home
      BottomNavigationAction "بحث" icon=Search to=#search
      BottomNavigationAction "الملف الشخصي" icon=Person to=#profile
  Dialog sm bottom
    DialogHeader "حذف الحساب؟"
    DialogContent
      Typography body2 "لا يمكن التراجع عن هذا الإجراء."
    DialogActions
      Spacer
      Button "إلغاء"
      Button "حذف" contained startIcon=Delete`,
    flow: `// غلاف مشترك لشاشتين: أيقونة خاصة وخلفية وأسهم Flow
Icons
  mark "M12 2 2 22h20z"

Flow LR

Wireframe #shell landscape visible=false
  AppBar
    Toolbar
      Icon mark
      Typography h6 "Code2Graph"
      Spacer
      Icon Notifications
      Badge "2"
      Avatar "CG"
  Stack row 100% *
    Drawer
      List dense subheader="الاستوديو"
        ListItem "نظرة عامة" to=#home
        ListItem "المحرر" to=#editor
        ListItem "الإعدادات" to=#settings
    Anchor #content

Wireframe #home background=#shell anchor=#content
  Stack column gap=2
    Stack row
      Typography h5 "نظرة عامة"
      Spacer
      Button "فتح المحرر" contained to=#editor
    Grid cols=3 gap=2
      Card
        CardHeader "اللوحات" subheader="مفتوحة" icon=Dashboard closeIcon=none
        CardContent
          Typography h3 "12"
          Typography caption "هذا الأسبوع"
      Card
        CardHeader "التعديلات" icon=Edit closeIcon=none
        CardContent
          Chart "التعديلات" column 100% 100px
      Card
        CardHeader "بناء" icon=TableChart closeIcon=none
        CardContent
          Progress linear 40 large
          Typography caption "النشر"
    List dense
      ListItem "التهيئة"
      ListItem "الدفع"

Wireframe #editor background=#shell anchor=#content
  Stack column 100% * gap=2
    Stack row gap=1
      Link "العودة إلى النظرة العامة" to=#home
      Spacer
      Chip "مسودة" outlined small
      Button "نشر" contained startIcon=CloudUpload
    Stack row * * gap=2
      Box 220px * outline=solid elevation=2
        Typography overline "الطبقات"
        List
          ListItem "العنوان"
          ListItem "مخطط"
          ListItem "ملاحظات"
        Divider
        Skeleton text 160px 12px
        Skeleton circular 32px 32px
      Box * * dashed
        Placeholder * * "لوحة الرسم"
    Stack row gap=2
      Progress linear 35
      Spacer
      Snackbar "تم حفظ المسودة" bottomLeft`,
    product: `// صفحة المنتج: وسائط وخريطة وجدول مواصفات وإجراءات
Wireframe #product w=1180 h=760
  Card
    Stack row gap=2
      Stack column 400px gap=1
        Img 100% ratio=16:9
        Stack row gap=1
          Chip "ورق" outlined small
          Chip "A5" small background=crosshatch
          Chip "نقطة" outlined small
      Map area * 300px pins=5 path compass labels icon=LocationOn
    CardContent
      Breadcrumbs ">"
        Link "الكتالوج" to=#catalog
        Typography "دفتر رسم"
      Stack row gap=1
        Typography h4 "دفتر رسم"
        Spacer
        Badge "−20%"
        Typography h5 "90 ر.س"
      Stack row gap=1
        Rating 4 icon=Favorite emptyIcon=FavoriteBorder
        Divider vertical
        Typography body2 "128 مراجعة"
      Tabs
        Tab "حول المنتج"
        Tab "المواصفات"
        Tab "المراجعات" to=#reviews
      Typography body2 ~2 filler=lorem
      Table small
        TableHead
          TableRow
            TableCell "المواصفة"
            TableCell "القيمة"
        TableBody
          TableRow
            TableCell "الغلاف"
            TableCell "ورق كرافت"
          TableRow selected
            TableCell "الصفحات"
            TableCell "128"
          TableRow
            TableCell "المقاس"
            TableCell "A5"
    CardActions
      ButtonGroup
        Button "1"
        Button "2"
        Button "3"
      Button "أضف إلى السلة" contained large crosshatch startIcon=ShoppingCart
      Button "التفاصيل" outlined to=#detail
      Spacer
      Link "العودة إلى الكتالوج" to=#catalog`,
  },
};

export const STRUCTURIZR_EXTRA: Record<
  Exclude<AppLocale, "ru" | "en">,
  Record<"context" | "containers" | "components" | "deployment", string>
> = {
  es: {
    context: `workspace "Tienda en línea" "Compra de productos" {

    !identifiers hierarchical
    !impliedRelationships false
    !docs "https://example.com/docs"
    !adrs "https://example.com/adrs"

    model {
        properties {
            "owner" "shop"
        }

        group "Personas" {
            customer = person "Cliente" "Realiza pedidos." {
                tags "External"
                url "https://example.com/customer"
                perspectives {
                    "role" "Cliente"
                }
            }
        }
        shop = softwareSystem "Tienda" "Recibe y completa los pedidos." {
            description "Sistema principal"
            technology "Code2Graph"
        }
        mail = softwareSystem "Correo" "Envía mensajes al cliente."

        customer -> shop "Realiza un pedido" "HTTPS"
        shop -> mail "Envía un mensaje" "SMTP"
    }

    views {
        systemLandscape "Landscape" "Todos los sistemas" {
            include *
            autolayout lr
            title "Paisaje"
        }
        systemContext shop "Context" "Compra" {
            include *
            autolayout lr
            title "Contexto"
        }
        dynamic shop "Order" "Pago" {
            customer -> shop "Realiza un pedido"
        }
        filtered * "Filtered" {
            include *
        }
        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
            relationship "Relationship" {
                thickness 2
                style dashed
            }
        }
        theme "https://static.structurizr.com/themes/default/theme.json"
    }

    configuration {
        scope softwaresystem
    }
}`,
    containers: `workspace "Tienda" "Contenedores de la tienda en línea" {

    model {
        customer = person "Cliente" "Compra productos."
        shop = softwareSystem "Tienda" "Tienda en línea." {
            group "Canales" {
                web = container "Aplicación web" "Interfaz del cliente." "React" {
                    url "https://example.com/web"
                }
            }
            api = container "API" "Pedidos y catálogo." "Java" {
                properties {
                    "tier" "backend"
                }
            }
            db = container "Base de datos" "Pedidos y productos." "PostgreSQL" {
                tags "Database"
            }
        }

        customer -> web "Abre el sitio" "HTTPS"
        web -> api "Llama" "JSON/HTTPS"
        api -> db "Lee y escribe" "JDBC"
    }

    views {
        container shop "Containers" {
            include *
            autolayout lr
            title "Contenedores"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
            element "Container" {
                shape RoundedBox
            }
        }
    }
}`,
    components: `workspace "Tienda" "Componentes de la API" {

    model {
        shop = softwareSystem "Tienda" "Tienda en línea." {
            api = container "API" "Servicio de pedidos." "Java" {
                group "Servicios" {
                    orders = component "Pedidos" "Crea un pedido." "Spring Bean" {
                        url "https://example.com/orders"
                    }
                    catalog = component "Catálogo" "Devuelve los productos." "Spring Bean"
                }

                orders -> catalog "Solicita un producto" "JSON"
            }
            db = container "Base de datos" "Guarda los pedidos." "PostgreSQL" {
                tags "Database"
            }
        }

        orders -> db "Guarda el pedido" "JDBC"
    }

    views {
        component api "Components" {
            include *
            autolayout tb
            title "Componentes"
        }

        styles {
            element "Component" {
                shape Component
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
    deployment: `workspace "Tienda" "Despliegue" {

    model {
        shop = softwareSystem "Tienda" "Tienda en línea." {
            web = container "Sitio" "Interfaz del cliente." "React"
            db = container "Base de datos" "Guarda los pedidos." "PostgreSQL" {
                tags "Database"
            }
        }

        live = deploymentEnvironment "Production" {
            cluster = deploymentNode "Clúster" "Clúster de Kubernetes." "Kubernetes" {
                properties {
                    "region" "eu"
                }
                gateway = infrastructureNode "Puerta de enlace" "Equilibrador de entrada." "Nginx"
                containerInstance web
                shopLive = softwareSystemInstance shop
                dbNode = deploymentNode "Nodo de base de datos" "Nodo de PostgreSQL." "VM" {
                    containerInstance db
                }
            }
        }
    }

    views {
        deployment shop live "Deployment" {
            include *
            autolayout lr
            title "Despliegue"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
  },
  zh: {
    context: `workspace "网上商店" "购买商品" {

    !identifiers hierarchical
    !impliedRelationships false
    !docs "https://example.com/docs"
    !adrs "https://example.com/adrs"

    model {
        properties {
            "owner" "shop"
        }

        group "人员" {
            customer = person "顾客" "提交订单。" {
                tags "External"
                url "https://example.com/customer"
                perspectives {
                    "role" "顾客"
                }
            }
        }
        shop = softwareSystem "商店" "接收并履行订单。" {
            description "主系统"
            technology "Code2Graph"
        }
        mail = softwareSystem "邮件" "向顾客发送消息。"

        customer -> shop "提交订单" "HTTPS"
        shop -> mail "发送消息" "SMTP"
    }

    views {
        systemLandscape "Landscape" "所有系统" {
            include *
            autolayout lr
            title "全景"
        }
        systemContext shop "Context" "购买" {
            include *
            autolayout lr
            title "上下文"
        }
        dynamic shop "Order" "结账" {
            customer -> shop "提交订单"
        }
        filtered * "Filtered" {
            include *
        }
        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
            relationship "Relationship" {
                thickness 2
                style dashed
            }
        }
        theme "https://static.structurizr.com/themes/default/theme.json"
    }

    configuration {
        scope softwaresystem
    }
}`,
    containers: `workspace "商店" "网上商店的容器" {

    model {
        customer = person "顾客" "购买商品。"
        shop = softwareSystem "商店" "网上商店。" {
            group "渠道" {
                web = container "网页应用" "顾客界面。" "React" {
                    url "https://example.com/web"
                }
            }
            api = container "API" "订单与目录。" "Java" {
                properties {
                    "tier" "backend"
                }
            }
            db = container "数据库" "订单与商品。" "PostgreSQL" {
                tags "Database"
            }
        }

        customer -> web "打开网站" "HTTPS"
        web -> api "调用" "JSON/HTTPS"
        api -> db "读取并写入" "JDBC"
    }

    views {
        container shop "Containers" {
            include *
            autolayout lr
            title "容器"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
            element "Container" {
                shape RoundedBox
            }
        }
    }
}`,
    components: `workspace "商店" "API 组件" {

    model {
        shop = softwareSystem "商店" "网上商店。" {
            api = container "API" "订单服务。" "Java" {
                group "服务" {
                    orders = component "订单" "创建订单。" "Spring Bean" {
                        url "https://example.com/orders"
                    }
                    catalog = component "目录" "返回商品。" "Spring Bean"
                }

                orders -> catalog "请求商品" "JSON"
            }
            db = container "数据库" "存储订单。" "PostgreSQL" {
                tags "Database"
            }
        }

        orders -> db "保存订单" "JDBC"
    }

    views {
        component api "Components" {
            include *
            autolayout tb
            title "组件"
        }

        styles {
            element "Component" {
                shape Component
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
    deployment: `workspace "商店" "部署" {

    model {
        shop = softwareSystem "商店" "网上商店。" {
            web = container "网页" "顾客界面。" "React"
            db = container "数据库" "存储订单。" "PostgreSQL" {
                tags "Database"
            }
        }

        live = deploymentEnvironment "Production" {
            cluster = deploymentNode "集群" "Kubernetes 集群。" "Kubernetes" {
                properties {
                    "region" "eu"
                }
                gateway = infrastructureNode "网关" "入口负载均衡器。" "Nginx"
                containerInstance web
                shopLive = softwareSystemInstance shop
                dbNode = deploymentNode "数据库节点" "PostgreSQL 节点。" "VM" {
                    containerInstance db
                }
            }
        }
    }

    views {
        deployment shop live "Deployment" {
            include *
            autolayout lr
            title "部署"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
  },
  ja: {
    context: `workspace "ネット店舗" "商品の購入" {

    !identifiers hierarchical
    !impliedRelationships false
    !docs "https://example.com/docs"
    !adrs "https://example.com/adrs"

    model {
        properties {
            "owner" "shop"
        }

        group "人々" {
            customer = person "顧客" "注文を行います。" {
                tags "External"
                url "https://example.com/customer"
                perspectives {
                    "role" "顧客"
                }
            }
        }
        shop = softwareSystem "店舗" "注文を受けて履行します。" {
            description "中心となる仕組み"
            technology "Code2Graph"
        }
        mail = softwareSystem "郵便" "顧客にメッセージを送ります。"

        customer -> shop "注文する" "HTTPS"
        shop -> mail "メッセージを送る" "SMTP"
    }

    views {
        systemLandscape "Landscape" "すべての仕組み" {
            include *
            autolayout lr
            title "全体像"
        }
        systemContext shop "Context" "購入" {
            include *
            autolayout lr
            title "文脈"
        }
        dynamic shop "Order" "会計" {
            customer -> shop "注文する"
        }
        filtered * "Filtered" {
            include *
        }
        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
            relationship "Relationship" {
                thickness 2
                style dashed
            }
        }
        theme "https://static.structurizr.com/themes/default/theme.json"
    }

    configuration {
        scope softwaresystem
    }
}`,
    containers: `workspace "店舗" "ネット店舗のコンテナー" {

    model {
        customer = person "顧客" "商品を購入します。"
        shop = softwareSystem "店舗" "ネット店舗。" {
            group "経路" {
                web = container "ウェブアプリケーション" "顧客向け画面。" "React" {
                    url "https://example.com/web"
                }
            }
            api = container "API" "注文と目録。" "Java" {
                properties {
                    "tier" "backend"
                }
            }
            db = container "データベース" "注文と商品。" "PostgreSQL" {
                tags "Database"
            }
        }

        customer -> web "サイトを開く" "HTTPS"
        web -> api "呼び出す" "JSON/HTTPS"
        api -> db "読み書きする" "JDBC"
    }

    views {
        container shop "Containers" {
            include *
            autolayout lr
            title "コンテナー"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
            element "Container" {
                shape RoundedBox
            }
        }
    }
}`,
    components: `workspace "店舗" "API の構成要素" {

    model {
        shop = softwareSystem "店舗" "ネット店舗。" {
            api = container "API" "注文サービス。" "Java" {
                group "サービス" {
                    orders = component "注文" "注文を作成します。" "Spring Bean" {
                        url "https://example.com/orders"
                    }
                    catalog = component "目録" "商品を返します。" "Spring Bean"
                }

                orders -> catalog "商品を要求する" "JSON"
            }
            db = container "データベース" "注文を保存します。" "PostgreSQL" {
                tags "Database"
            }
        }

        orders -> db "注文を保存する" "JDBC"
    }

    views {
        component api "Components" {
            include *
            autolayout tb
            title "構成要素"
        }

        styles {
            element "Component" {
                shape Component
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
    deployment: `workspace "店舗" "配置" {

    model {
        shop = softwareSystem "店舗" "ネット店舗。" {
            web = container "ウェブ" "顧客向け画面。" "React"
            db = container "データベース" "注文を保存します。" "PostgreSQL" {
                tags "Database"
            }
        }

        live = deploymentEnvironment "Production" {
            cluster = deploymentNode "クラスター" "Kubernetes クラスター。" "Kubernetes" {
                properties {
                    "region" "eu"
                }
                gateway = infrastructureNode "関門" "入口の負荷分散装置。" "Nginx"
                containerInstance web
                shopLive = softwareSystemInstance shop
                dbNode = deploymentNode "データベース節点" "PostgreSQL 節点。" "VM" {
                    containerInstance db
                }
            }
        }
    }

    views {
        deployment shop live "Deployment" {
            include *
            autolayout lr
            title "配置"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
  },
  hi: {
    context: `workspace "ऑनलाइन दुकान" "उत्पाद खरीदना" {

    !identifiers hierarchical
    !impliedRelationships false
    !docs "https://example.com/docs"
    !adrs "https://example.com/adrs"

    model {
        properties {
            "owner" "shop"
        }

        group "लोग" {
            customer = person "ग्राहक" "ऑर्डर देता है।" {
                tags "External"
                url "https://example.com/customer"
                perspectives {
                    "role" "ग्राहक"
                }
            }
        }
        shop = softwareSystem "दुकान" "ऑर्डर लेता और पूरा करता है।" {
            description "प्राथमिक प्रणाली"
            technology "Code2Graph"
        }
        mail = softwareSystem "डाक" "ग्राहक को संदेश भेजता है।"

        customer -> shop "ऑर्डर देता है" "HTTPS"
        shop -> mail "संदेश भेजता है" "SMTP"
    }

    views {
        systemLandscape "Landscape" "सभी प्रणालियाँ" {
            include *
            autolayout lr
            title "परिदृश्य"
        }
        systemContext shop "Context" "खरीद" {
            include *
            autolayout lr
            title "संदर्भ"
        }
        dynamic shop "Order" "भुगतान" {
            customer -> shop "ऑर्डर देता है"
        }
        filtered * "Filtered" {
            include *
        }
        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
            relationship "Relationship" {
                thickness 2
                style dashed
            }
        }
        theme "https://static.structurizr.com/themes/default/theme.json"
    }

    configuration {
        scope softwaresystem
    }
}`,
    containers: `workspace "दुकान" "ऑनलाइन दुकान के कंटेनर" {

    model {
        customer = person "ग्राहक" "उत्पाद खरीदता है।"
        shop = softwareSystem "दुकान" "ऑनलाइन दुकान।" {
            group "मार्ग" {
                web = container "वेब अनुप्रयोग" "ग्राहक अंतरफलक।" "React" {
                    url "https://example.com/web"
                }
            }
            api = container "API" "ऑर्डर और सूची।" "Java" {
                properties {
                    "tier" "backend"
                }
            }
            db = container "डेटाबेस" "ऑर्डर और उत्पाद।" "PostgreSQL" {
                tags "Database"
            }
        }

        customer -> web "स्थल खोलता है" "HTTPS"
        web -> api "आह्वान" "JSON/HTTPS"
        api -> db "पढ़ता और लिखता है" "JDBC"
    }

    views {
        container shop "Containers" {
            include *
            autolayout lr
            title "कंटेनर"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
            element "Container" {
                shape RoundedBox
            }
        }
    }
}`,
    components: `workspace "दुकान" "API के घटक" {

    model {
        shop = softwareSystem "दुकान" "ऑनलाइन दुकान।" {
            api = container "API" "ऑर्डर सेवा।" "Java" {
                group "सेवाएँ" {
                    orders = component "ऑर्डर" "ऑर्डर बनाता है।" "Spring Bean" {
                        url "https://example.com/orders"
                    }
                    catalog = component "सूची" "उत्पाद लौटाता है।" "Spring Bean"
                }

                orders -> catalog "उत्पाद माँगता है" "JSON"
            }
            db = container "डेटाबेस" "ऑर्डर सहेजता है।" "PostgreSQL" {
                tags "Database"
            }
        }

        orders -> db "ऑर्डर सहेजता है" "JDBC"
    }

    views {
        component api "Components" {
            include *
            autolayout tb
            title "घटक"
        }

        styles {
            element "Component" {
                shape Component
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
    deployment: `workspace "दुकान" "परिनियोजन" {

    model {
        shop = softwareSystem "दुकान" "ऑनलाइन दुकान।" {
            web = container "वेब" "ग्राहक अंतरफलक।" "React"
            db = container "डेटाबेस" "ऑर्डर सहेजता है।" "PostgreSQL" {
                tags "Database"
            }
        }

        live = deploymentEnvironment "Production" {
            cluster = deploymentNode "गुच्छ" "Kubernetes गुच्छ।" "Kubernetes" {
                properties {
                    "region" "eu"
                }
                gateway = infrastructureNode "प्रवेशद्वार" "प्रवेश भार संतुलक।" "Nginx"
                containerInstance web
                shopLive = softwareSystemInstance shop
                dbNode = deploymentNode "डेटाबेस नोड" "PostgreSQL नोड।" "VM" {
                    containerInstance db
                }
            }
        }
    }

    views {
        deployment shop live "Deployment" {
            include *
            autolayout lr
            title "परिनियोजन"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
  },
  pt: {
    context: `workspace "Loja virtual" "Compra de produtos" {

    !identifiers hierarchical
    !impliedRelationships false
    !docs "https://example.com/docs"
    !adrs "https://example.com/adrs"

    model {
        properties {
            "owner" "shop"
        }

        group "Pessoas" {
            customer = person "Cliente" "Faz pedidos." {
                tags "External"
                url "https://example.com/customer"
                perspectives {
                    "role" "Cliente"
                }
            }
        }
        shop = softwareSystem "Loja" "Recebe e cumpre os pedidos." {
            description "Sistema principal"
            technology "Code2Graph"
        }
        mail = softwareSystem "Correio" "Envia mensagens ao cliente."

        customer -> shop "Faz um pedido" "HTTPS"
        shop -> mail "Envia uma mensagem" "SMTP"
    }

    views {
        systemLandscape "Landscape" "Todos os sistemas" {
            include *
            autolayout lr
            title "Paisagem"
        }
        systemContext shop "Context" "Compra" {
            include *
            autolayout lr
            title "Contexto"
        }
        dynamic shop "Order" "Pagamento" {
            customer -> shop "Faz um pedido"
        }
        filtered * "Filtered" {
            include *
        }
        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
            relationship "Relationship" {
                thickness 2
                style dashed
            }
        }
        theme "https://static.structurizr.com/themes/default/theme.json"
    }

    configuration {
        scope softwaresystem
    }
}`,
    containers: `workspace "Loja" "Contêineres da loja virtual" {

    model {
        customer = person "Cliente" "Compra produtos."
        shop = softwareSystem "Loja" "Loja virtual." {
            group "Canais" {
                web = container "Aplicativo web" "Interface do cliente." "React" {
                    url "https://example.com/web"
                }
            }
            api = container "API" "Pedidos e catálogo." "Java" {
                properties {
                    "tier" "backend"
                }
            }
            db = container "Banco de dados" "Pedidos e produtos." "PostgreSQL" {
                tags "Database"
            }
        }

        customer -> web "Abre o site" "HTTPS"
        web -> api "Chama" "JSON/HTTPS"
        api -> db "Lê e grava" "JDBC"
    }

    views {
        container shop "Containers" {
            include *
            autolayout lr
            title "Contêineres"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
            element "Container" {
                shape RoundedBox
            }
        }
    }
}`,
    components: `workspace "Loja" "Componentes da API" {

    model {
        shop = softwareSystem "Loja" "Loja virtual." {
            api = container "API" "Serviço de pedidos." "Java" {
                group "Serviços" {
                    orders = component "Pedidos" "Cria um pedido." "Spring Bean" {
                        url "https://example.com/orders"
                    }
                    catalog = component "Catálogo" "Devolve os produtos." "Spring Bean"
                }

                orders -> catalog "Solicita um produto" "JSON"
            }
            db = container "Banco de dados" "Armazena os pedidos." "PostgreSQL" {
                tags "Database"
            }
        }

        orders -> db "Salva o pedido" "JDBC"
    }

    views {
        component api "Components" {
            include *
            autolayout tb
            title "Componentes"
        }

        styles {
            element "Component" {
                shape Component
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
    deployment: `workspace "Loja" "Implantação" {

    model {
        shop = softwareSystem "Loja" "Loja virtual." {
            web = container "Site" "Interface do cliente." "React"
            db = container "Banco de dados" "Armazena os pedidos." "PostgreSQL" {
                tags "Database"
            }
        }

        live = deploymentEnvironment "Production" {
            cluster = deploymentNode "Agrupamento" "Agrupamento Kubernetes." "Kubernetes" {
                properties {
                    "region" "eu"
                }
                gateway = infrastructureNode "Porta de entrada" "Balanceador de entrada." "Nginx"
                containerInstance web
                shopLive = softwareSystemInstance shop
                dbNode = deploymentNode "Nó de banco de dados" "Nó do PostgreSQL." "VM" {
                    containerInstance db
                }
            }
        }
    }

    views {
        deployment shop live "Deployment" {
            include *
            autolayout lr
            title "Implantação"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
  },
  de: {
    context: `workspace "Onlineshop" "Produkte kaufen" {

    !identifiers hierarchical
    !impliedRelationships false
    !docs "https://example.com/docs"
    !adrs "https://example.com/adrs"

    model {
        properties {
            "owner" "shop"
        }

        group "Personen" {
            customer = person "Kunde" "Gibt Bestellungen auf." {
                tags "External"
                url "https://example.com/customer"
                perspectives {
                    "role" "Kunde"
                }
            }
        }
        shop = softwareSystem "Laden" "Nimmt Bestellungen an und erfüllt sie." {
            description "Hauptsystem"
            technology "Code2Graph"
        }
        mail = softwareSystem "Post" "Sendet Nachrichten an den Kunden."

        customer -> shop "Gibt eine Bestellung auf" "HTTPS"
        shop -> mail "Sendet eine Nachricht" "SMTP"
    }

    views {
        systemLandscape "Landscape" "Alle Systeme" {
            include *
            autolayout lr
            title "Landschaft"
        }
        systemContext shop "Context" "Kauf" {
            include *
            autolayout lr
            title "Kontext"
        }
        dynamic shop "Order" "Kasse" {
            customer -> shop "Gibt eine Bestellung auf"
        }
        filtered * "Filtered" {
            include *
        }
        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
            relationship "Relationship" {
                thickness 2
                style dashed
            }
        }
        theme "https://static.structurizr.com/themes/default/theme.json"
    }

    configuration {
        scope softwaresystem
    }
}`,
    containers: `workspace "Laden" "Container des Onlineshops" {

    model {
        customer = person "Kunde" "Kauft Produkte."
        shop = softwareSystem "Laden" "Onlineshop." {
            group "Kanäle" {
                web = container "Webanwendung" "Kundenoberfläche." "React" {
                    url "https://example.com/web"
                }
            }
            api = container "API" "Bestellungen und Katalog." "Java" {
                properties {
                    "tier" "backend"
                }
            }
            db = container "Datenbank" "Bestellungen und Produkte." "PostgreSQL" {
                tags "Database"
            }
        }

        customer -> web "Öffnet die Seite" "HTTPS"
        web -> api "Ruft auf" "JSON/HTTPS"
        api -> db "Liest und schreibt" "JDBC"
    }

    views {
        container shop "Containers" {
            include *
            autolayout lr
            title "Container"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
            element "Container" {
                shape RoundedBox
            }
        }
    }
}`,
    components: `workspace "Laden" "API-Komponenten" {

    model {
        shop = softwareSystem "Laden" "Onlineshop." {
            api = container "API" "Bestelldienst." "Java" {
                group "Dienste" {
                    orders = component "Bestellungen" "Erstellt eine Bestellung." "Spring Bean" {
                        url "https://example.com/orders"
                    }
                    catalog = component "Katalog" "Gibt Produkte zurück." "Spring Bean"
                }

                orders -> catalog "Fordert ein Produkt an" "JSON"
            }
            db = container "Datenbank" "Speichert Bestellungen." "PostgreSQL" {
                tags "Database"
            }
        }

        orders -> db "Speichert die Bestellung" "JDBC"
    }

    views {
        component api "Components" {
            include *
            autolayout tb
            title "Komponenten"
        }

        styles {
            element "Component" {
                shape Component
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
    deployment: `workspace "Laden" "Bereitstellung" {

    model {
        shop = softwareSystem "Laden" "Onlineshop." {
            web = container "Webseite" "Kundenoberfläche." "React"
            db = container "Datenbank" "Speichert Bestellungen." "PostgreSQL" {
                tags "Database"
            }
        }

        live = deploymentEnvironment "Production" {
            cluster = deploymentNode "Verbund" "Kubernetes-Verbund." "Kubernetes" {
                properties {
                    "region" "eu"
                }
                gateway = infrastructureNode "Schleuse" "Eingangs-Lastverteiler." "Nginx"
                containerInstance web
                shopLive = softwareSystemInstance shop
                dbNode = deploymentNode "Datenbankknoten" "PostgreSQL-Knoten." "VM" {
                    containerInstance db
                }
            }
        }
    }

    views {
        deployment shop live "Deployment" {
            include *
            autolayout lr
            title "Bereitstellung"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
  },
  ar: {
    context: `workspace "متجر على الإنترنت" "شراء المنتجات" {

    !identifiers hierarchical
    !impliedRelationships false
    !docs "https://example.com/docs"
    !adrs "https://example.com/adrs"

    model {
        properties {
            "owner" "shop"
        }

        group "الأشخاص" {
            customer = person "العميل" "يقدّم الطلبات." {
                tags "External"
                url "https://example.com/customer"
                perspectives {
                    "role" "العميل"
                }
            }
        }
        shop = softwareSystem "المتجر" "يتلقى الطلبات وينفّذها." {
            description "النظام الأساسي"
            technology "Code2Graph"
        }
        mail = softwareSystem "البريد" "يرسل رسائل إلى العميل."

        customer -> shop "يقدّم طلبًا" "HTTPS"
        shop -> mail "يرسل رسالة" "SMTP"
    }

    views {
        systemLandscape "Landscape" "كل الأنظمة" {
            include *
            autolayout lr
            title "المشهد العام"
        }
        systemContext shop "Context" "الشراء" {
            include *
            autolayout lr
            title "السياق"
        }
        dynamic shop "Order" "الدفع" {
            customer -> shop "يقدّم طلبًا"
        }
        filtered * "Filtered" {
            include *
        }
        styles {
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Database" {
                shape Cylinder
            }
            relationship "Relationship" {
                thickness 2
                style dashed
            }
        }
        theme "https://static.structurizr.com/themes/default/theme.json"
    }

    configuration {
        scope softwaresystem
    }
}`,
    containers: `workspace "المتجر" "حاويات المتجر على الإنترنت" {

    model {
        customer = person "العميل" "يشتري المنتجات."
        shop = softwareSystem "المتجر" "متجر على الإنترنت." {
            group "القنوات" {
                web = container "تطبيق ويب" "واجهة العميل." "React" {
                    url "https://example.com/web"
                }
            }
            api = container "API" "الطلبات والكتالوج." "Java" {
                properties {
                    "tier" "backend"
                }
            }
            db = container "قاعدة البيانات" "الطلبات والمنتجات." "PostgreSQL" {
                tags "Database"
            }
        }

        customer -> web "يفتح الموقع" "HTTPS"
        web -> api "يستدعي" "JSON/HTTPS"
        api -> db "يقرأ ويكتب" "JDBC"
    }

    views {
        container shop "Containers" {
            include *
            autolayout lr
            title "الحاويات"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
            element "Container" {
                shape RoundedBox
            }
        }
    }
}`,
    components: `workspace "المتجر" "مكوّنات واجهة API" {

    model {
        shop = softwareSystem "المتجر" "متجر على الإنترنت." {
            api = container "API" "خدمة الطلبات." "Java" {
                group "الخدمات" {
                    orders = component "الطلبات" "ينشئ طلبًا." "Spring Bean" {
                        url "https://example.com/orders"
                    }
                    catalog = component "الكتالوج" "يعيد المنتجات." "Spring Bean"
                }

                orders -> catalog "يطلب منتجًا" "JSON"
            }
            db = container "قاعدة البيانات" "يخزّن الطلبات." "PostgreSQL" {
                tags "Database"
            }
        }

        orders -> db "يحفظ الطلب" "JDBC"
    }

    views {
        component api "Components" {
            include *
            autolayout tb
            title "المكوّنات"
        }

        styles {
            element "Component" {
                shape Component
            }
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
    deployment: `workspace "المتجر" "النشر" {

    model {
        shop = softwareSystem "المتجر" "متجر على الإنترنت." {
            web = container "الويب" "واجهة العميل." "React"
            db = container "قاعدة البيانات" "يخزّن الطلبات." "PostgreSQL" {
                tags "Database"
            }
        }

        live = deploymentEnvironment "Production" {
            cluster = deploymentNode "عنقود" "عنقود Kubernetes." "Kubernetes" {
                properties {
                    "region" "eu"
                }
                gateway = infrastructureNode "بوابة" "موازن حمل للدخول." "Nginx"
                containerInstance web
                shopLive = softwareSystemInstance shop
                dbNode = deploymentNode "عقدة قاعدة البيانات" "عقدة PostgreSQL." "VM" {
                    containerInstance db
                }
            }
        }
    }

    views {
        deployment shop live "Deployment" {
            include *
            autolayout lr
            title "النشر"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
  },
};
