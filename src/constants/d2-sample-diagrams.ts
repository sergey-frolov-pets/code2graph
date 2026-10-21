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

user: "Пользователь" {
  shape: person
}
api: "API"
db: "База" {
  shape: cylinder
}

user -> api: "Запрос"
api -> db: "Запрос"
db -> api: "Данные"
api -> user: "Ответ"`,
  sequence: `direction: down

checkout: "Оформление заказа" {
  shape: sequence_diagram
  buyer: "Покупатель"
  shop: "Магазин"
  pay: "Оплата"
  buyer -> shop: "Заказ"
  shop -> pay: "Списать"
  pay -> shop: "Ок"
  shop -> buyer: "Чек"
}`,
  classes: `direction: down

User: "Пользователь" {
  shape: class
  +id: int
  +name: string
  +login(): bool
}

Order: "Заказ" {
  shape: class
  +id: int
  +total: float
}

User -> Order: "оформляет"`,
  sql: `direction: right

users: users {
  shape: sql_table
  id: int {constraint: primary_key}
  name: string
  email: string
}

orders: orders {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

users.id -> orders.user_id`,
  architecture: `direction: right

network: "Сеть" {
  web: "Веб"
  api: "API" {
    shape: hexagon
  }
  queue: "Очередь" {
    shape: queue
  }
  web -> api: "HTTPS"
  api -> queue: "Событие"
}`,
};

const D2_SAMPLES_EN: Record<D2SampleId, string> = {
  flow: `direction: right

user: User {
  shape: person
}
api: API
db: Database {
  shape: cylinder
}

user -> api: Request
api -> db: Query
db -> api: Rows
api -> user: Response`,
  sequence: `direction: down

checkout: Checkout {
  shape: sequence_diagram
  buyer: Buyer
  shop: Shop
  pay: Payment
  buyer -> shop: Place order
  shop -> pay: Charge
  pay -> shop: OK
  shop -> buyer: Receipt
}`,
  classes: `direction: down

User: User {
  shape: class
  +id: int
  +name: string
  +login(): bool
}

Order: Order {
  shape: class
  +id: int
  +total: float
}

User -> Order: places`,
  sql: `direction: right

users: users {
  shape: sql_table
  id: int {constraint: primary_key}
  name: string
  email: string
}

orders: orders {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
  total: decimal
}

users.id -> orders.user_id`,
  architecture: `direction: right

network: Network {
  web: Web
  api: API {
    shape: hexagon
  }
  queue: Queue {
    shape: queue
  }
  web -> api: HTTPS
  api -> queue: Event
}`,
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
