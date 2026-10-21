import type { AppLocale } from "@/constants/i18n";
import type { SampleCatalog } from "@/languages/sample-catalog";

export const STRUCTURIZR_SAMPLE_IDS = [
  "context",
  "containers",
  "components",
  "deployment",
] as const;

export type StructurizrSampleId = (typeof STRUCTURIZR_SAMPLE_IDS)[number];

const STRUCTURIZR_SAMPLES_RU: Record<StructurizrSampleId, string> = {
  context: `workspace "Интернет-магазин" "Покупка товаров" {

    model {
        customer = person "Покупатель" "Оформляет заказы."
        shop = softwareSystem "Магазин" "Принимает и обрабатывает заказы."
        mail = softwareSystem "Почта" "Отправляет письма покупателю."

        customer -> shop "Оформляет заказ"
        shop -> mail "Отправляет письмо"
    }

    views {
        systemContext shop "Context" {
            include *
            autolayout lr
        }
    }
}`,
  containers: `workspace "Магазин" "Контейнеры интернет-магазина" {

    model {
        customer = person "Покупатель" "Покупает товары."
        shop = softwareSystem "Магазин" "Интернет-магазин." {
            web = container "Веб-приложение" "Интерфейс покупателя." "React"
            api = container "API" "Заказы и каталог." "Java"
            db = container "База" "Заказы и товары." "PostgreSQL" {
                tags "Database"
            }
        }

        customer -> web "Открывает сайт" "HTTPS"
        web -> api "Вызывает" "JSON/HTTPS"
        api -> db "Читает и пишет" "JDBC"
    }

    views {
        container shop "Containers" {
            include *
            autolayout lr
        }
    }
}`,
  components: `workspace "Магазин" "Компоненты API" {

    model {
        shop = softwareSystem "Магазин" "Интернет-магазин." {
            api = container "API" "Сервис заказов." "Java" {
                orders = component "Заказы" "Создаёт заказ." "Spring Bean"
                catalog = component "Каталог" "Отдаёт товары." "Spring Bean"

                orders -> catalog "Запрашивает товар"
            }
            db = container "База" "Хранит заказы." "PostgreSQL" {
                tags "Database"
            }
        }

        orders -> db "Сохраняет заказ" "JDBC"
    }

    views {
        component api "Components" {
            include *
            autolayout tb
        }
    }
}`,
  deployment: `workspace "Магазин" "Развёртывание" {

    model {
        shop = softwareSystem "Магазин" "Интернет-магазин." {
            web = container "Веб" "Интерфейс покупателя." "React"
            db = container "База" "Хранит заказы." "PostgreSQL" {
                tags "Database"
            }
        }

        live = deploymentEnvironment "Production" {
            cluster = deploymentNode "Кластер" "Kubernetes-кластер." "Kubernetes" {
                containerInstance web
                dbNode = deploymentNode "База данных" "Узел PostgreSQL." "VM" {
                    containerInstance db
                }
            }
        }
    }

    views {
        deployment shop live "Deployment" {
            include *
            autolayout lr
        }
    }
}`,
};

const STRUCTURIZR_SAMPLES_EN: Record<StructurizrSampleId, string> = {
  context: `workspace "Online shop" "Buying products" {

    model {
        customer = person "Customer" "Places orders."
        shop = softwareSystem "Shop" "Takes and fulfills orders."
        mail = softwareSystem "Mail" "Sends messages to the customer."

        customer -> shop "Places an order"
        shop -> mail "Sends a message"
    }

    views {
        systemContext shop "Context" {
            include *
            autolayout lr
        }
    }
}`,
  containers: `workspace "Shop" "Containers of the online shop" {

    model {
        customer = person "Customer" "Buys products."
        shop = softwareSystem "Shop" "Online shop." {
            web = container "Web application" "Customer interface." "React"
            api = container "API" "Orders and catalog." "Java"
            db = container "Database" "Orders and products." "PostgreSQL" {
                tags "Database"
            }
        }

        customer -> web "Opens the site" "HTTPS"
        web -> api "Calls" "JSON/HTTPS"
        api -> db "Reads and writes" "JDBC"
    }

    views {
        container shop "Containers" {
            include *
            autolayout lr
        }
    }
}`,
  components: `workspace "Shop" "API components" {

    model {
        shop = softwareSystem "Shop" "Online shop." {
            api = container "API" "Order service." "Java" {
                orders = component "Orders" "Creates an order." "Spring Bean"
                catalog = component "Catalog" "Returns products." "Spring Bean"

                orders -> catalog "Requests a product"
            }
            db = container "Database" "Stores orders." "PostgreSQL" {
                tags "Database"
            }
        }

        orders -> db "Saves the order" "JDBC"
    }

    views {
        component api "Components" {
            include *
            autolayout tb
        }
    }
}`,
  deployment: `workspace "Shop" "Deployment" {

    model {
        shop = softwareSystem "Shop" "Online shop." {
            web = container "Web" "Customer interface." "React"
            db = container "Database" "Stores orders." "PostgreSQL" {
                tags "Database"
            }
        }

        live = deploymentEnvironment "Production" {
            cluster = deploymentNode "Cluster" "Kubernetes cluster." "Kubernetes" {
                containerInstance web
                dbNode = deploymentNode "Database node" "PostgreSQL node." "VM" {
                    containerInstance db
                }
            }
        }
    }

    views {
        deployment shop live "Deployment" {
            include *
            autolayout lr
        }
    }
}`,
};

const STRUCTURIZR_SOURCES_BY_LOCALE: Record<
  AppLocale,
  Record<StructurizrSampleId, string>
> = {
  ru: STRUCTURIZR_SAMPLES_RU,
  en: STRUCTURIZR_SAMPLES_EN,
};

const ALL_STRUCTURIZR_SAMPLE_SOURCES = new Set<string>();
for (const locale of ["ru", "en"] as AppLocale[]) {
  for (const id of STRUCTURIZR_SAMPLE_IDS) {
    ALL_STRUCTURIZR_SAMPLE_SOURCES.add(STRUCTURIZR_SOURCES_BY_LOCALE[locale][id]);
  }
}

export function getStructurizrSampleSource(
  id: StructurizrSampleId,
  locale: AppLocale,
): string {
  return STRUCTURIZR_SOURCES_BY_LOCALE[locale][id];
}

export function findStructurizrSampleId(
  source: string,
  locale: AppLocale,
): StructurizrSampleId | null {
  for (const id of STRUCTURIZR_SAMPLE_IDS) {
    if (STRUCTURIZR_SOURCES_BY_LOCALE[locale][id] === source) {
      return id;
    }
  }

  return null;
}

export function isStructurizrSampleSource(source: string): boolean {
  return ALL_STRUCTURIZR_SAMPLE_SOURCES.has(source);
}

export const structurizrSampleCatalog: SampleCatalog = {
  ids: STRUCTURIZR_SAMPLE_IDS,
  getSource(id, locale) {
    return getStructurizrSampleSource(id as StructurizrSampleId, locale);
  },
  findId(source, locale) {
    return findStructurizrSampleId(source, locale);
  },
  isSampleSource(source) {
    return isStructurizrSampleSource(source);
  },
};
