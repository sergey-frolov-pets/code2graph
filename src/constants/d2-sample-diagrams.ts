import type { AppLocale } from "@/constants/i18n";
import type { SampleCatalog } from "@/languages/sample-catalog";

export const D2_SAMPLE_IDS = [
  "flow",
  "sequence",
  "classes",
  "sql",
  "architecture",
] as const;

export type D2SampleId = (typeof D2_SAMPLE_IDS)[number];

const D2_SAMPLES_RU: Record<D2SampleId, string> = {
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

caption: "Поток запроса" {
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

user: "Пользователь" {
  shape: person
  class: accent
  icon: https://icons.terrastruct.com/essentials/004-picture.svg
  tooltip: "Открывает редактор"
  link: https://example.com
  width: 160
  height: 120
}

api: "API" {
  shape: hexagon
  style.multiple: true
}

db: "База" {
  shape: cylinder
  style: {
    fill: "#fef3c7"
    stroke: "#d97706"
    opacity: 0.95
  }
}

docs: "Спека" {
  shape: document
}

queue: "События" {
  shape: queue
}

cache: "Кэш" {
  shape: stored_data
}

decision: "Готово?" {
  shape: diamond
}

user -> api: "Запрос" {
  style: {
    animated: true
    stroke: "#2563eb"
    stroke-dash: 4
  }
}
api -> decision: "Проверка"
decision -> db: "Запрос"
decision -> docs: "Отказ"
api -> queue: "Публикация"
queue -> cache: "Прогрев"`,
  sequence: `direction: down

checkout: "Оформление заказа" {
  shape: sequence_diagram
  buyer: "Покупатель"
  shop: "Магазин"
  pay: "Оплата"
  stock: "Склад"
  buyer -> shop: "Заказ"
  shop -> pay: "Списать"
  pay -> shop: "Ок"
  shop -> stock: "Резерв"
  stock -> shop: "Есть"
  shop -> buyer: "Чек"
}`,
  classes: `direction: down

User: "Пользователь" {
  shape: class
  +id: int
  +name: string
  #email: string
  -token: string
  +login(): bool
  +logout(): void
}

Order: "Заказ" {
  shape: class
  +id: int
  +total: float
  +addItem(name: string): void
}

User -> Order: "оформляет" {
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

network: "Сеть" {
  grid-rows: 2
  grid-columns: 3
  grid-gap: 24

  web: "Веб" {
    shape: rectangle
  }
  api: "API" {
    shape: hexagon
  }
  queue: "Очередь" {
    shape: queue
  }
  page: "Документ" {
    shape: page
  }
  job: "Задача" {
    shape: step
  }
  hint: "Подсказка" {
    shape: callout
  }

  web -> api: "HTTPS"
  api -> queue: "Событие"
}

cloud: "Облако" {
  shape: cloud
  style.fill-pattern: dots
}
badge: "Метка" {
  shape: oval
}
dot: "Точка" {
  shape: circle
}
bundle: "Пакет" {
  shape: package
}
input: "Ввод" {
  shape: parallelogram
}
tile: "Плитка" {
  shape: square
  style.double-border: true
}

network.web -> cloud: "CDN"
cloud -> bundle: "Статика"
input -> badge: "Проверка"
dot -> job: "Такт"`,
};

const D2_SAMPLES_EN: Record<D2SampleId, string> = {
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

caption: Request flow {
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

user: User {
  shape: person
  class: accent
  icon: https://icons.terrastruct.com/essentials/004-picture.svg
  tooltip: Opens the editor
  link: https://example.com
  width: 160
  height: 120
}

api: API {
  shape: hexagon
  style.multiple: true
}

db: Database {
  shape: cylinder
  style: {
    fill: "#fef3c7"
    stroke: "#d97706"
    opacity: 0.95
  }
}

docs: Spec {
  shape: document
}

queue: Events {
  shape: queue
}

cache: Cache {
  shape: stored_data
}

decision: Ready? {
  shape: diamond
}

user -> api: Request {
  style: {
    animated: true
    stroke: "#2563eb"
    stroke-dash: 4
  }
}
api -> decision: Check
decision -> db: Query
decision -> docs: Reject
api -> queue: Publish
queue -> cache: Warm`,
  sequence: `direction: down

checkout: Checkout {
  shape: sequence_diagram
  buyer: Buyer
  shop: Shop
  pay: Payment
  stock: Warehouse
  buyer -> shop: Place order
  shop -> pay: Charge
  pay -> shop: OK
  shop -> stock: Reserve
  stock -> shop: In stock
  shop -> buyer: Receipt
}`,
  classes: `direction: down

User: User {
  shape: class
  +id: int
  +name: string
  #email: string
  -token: string
  +login(): bool
  +logout(): void
}

Order: Order {
  shape: class
  +id: int
  +total: float
  +addItem(name: string): void
}

User -> Order: places {
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

network: Network {
  grid-rows: 2
  grid-columns: 3
  grid-gap: 24

  web: Web {
    shape: rectangle
  }
  api: API {
    shape: hexagon
  }
  queue: Queue {
    shape: queue
  }
  page: Document {
    shape: page
  }
  job: Job {
    shape: step
  }
  hint: Hint {
    shape: callout
  }

  web -> api: HTTPS
  api -> queue: Event
}

cloud: Cloud {
  shape: cloud
  style.fill-pattern: dots
}
badge: Badge {
  shape: oval
}
dot: Dot {
  shape: circle
}
bundle: Bundle {
  shape: package
}
input: Input {
  shape: parallelogram
}
tile: Tile {
  shape: square
  style.double-border: true
}

network.web -> cloud: CDN
cloud -> bundle: Assets
input -> badge: Validate
dot -> job: Tick`,
};

const D2_SOURCES_BY_LOCALE: Record<AppLocale, Record<D2SampleId, string>> = {
  ru: D2_SAMPLES_RU,
  en: D2_SAMPLES_EN,
};

const ALL_D2_SAMPLE_SOURCES = new Set<string>();
for (const locale of ["ru", "en"] as AppLocale[]) {
  for (const id of D2_SAMPLE_IDS) {
    ALL_D2_SAMPLE_SOURCES.add(D2_SOURCES_BY_LOCALE[locale][id]);
  }
}

export function getD2SampleSource(id: D2SampleId, locale: AppLocale): string {
  return D2_SOURCES_BY_LOCALE[locale][id];
}

export function findD2SampleId(
  source: string,
  locale: AppLocale,
): D2SampleId | null {
  for (const id of D2_SAMPLE_IDS) {
    if (D2_SOURCES_BY_LOCALE[locale][id] === source) {
      return id;
    }
  }

  return null;
}

export function isD2SampleSource(source: string): boolean {
  return ALL_D2_SAMPLE_SOURCES.has(source);
}

export const d2SampleCatalog: SampleCatalog = {
  ids: D2_SAMPLE_IDS,
  getSource(id, locale) {
    return getD2SampleSource(id as D2SampleId, locale);
  },
  findId(source, locale) {
    return findD2SampleId(source, locale);
  },
  isSampleSource(source) {
    return isD2SampleSource(source);
  },
};
