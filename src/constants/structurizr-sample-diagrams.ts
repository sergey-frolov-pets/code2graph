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

    !identifiers hierarchical
    !impliedRelationships false
    !docs "https://example.com/docs"
    !adrs "https://example.com/adrs"

    model {
        properties {
            "owner" "shop"
        }

        group "Люди" {
            customer = person "Покупатель" "Оформляет заказы." {
                tags "External"
                url "https://example.com/customer"
                perspectives {
                    "role" "Покупатель"
                }
            }
        }
        shop = softwareSystem "Магазин" "Принимает и обрабатывает заказы." {
            description "Основная система"
            technology "Code2Graph"
        }
        mail = softwareSystem "Почта" "Отправляет письма покупателю."

        customer -> shop "Оформляет заказ" "HTTPS"
        shop -> mail "Отправляет письмо" "SMTP"
    }

    views {
        systemLandscape "Landscape" "Все системы" {
            include *
            autolayout lr
            title "Ландшафт"
        }
        systemContext shop "Context" "Покупка" {
            include *
            autolayout lr
            title "Контекст"
        }
        dynamic shop "Order" "Заказ" {
            customer -> shop "Оформляет заказ"
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
  containers: `workspace "Магазин" "Контейнеры интернет-магазина" {

    model {
        customer = person "Покупатель" "Покупает товары."
        shop = softwareSystem "Магазин" "Интернет-магазин." {
            group "Каналы" {
                web = container "Веб-приложение" "Интерфейс покупателя." "React" {
                    url "https://example.com/web"
                }
            }
            api = container "API" "Заказы и каталог." "Java" {
                properties {
                    "tier" "backend"
                }
            }
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
            title "Контейнеры"
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
  components: `workspace "Магазин" "Компоненты API" {

    model {
        shop = softwareSystem "Магазин" "Интернет-магазин." {
            api = container "API" "Сервис заказов." "Java" {
                group "Сервисы" {
                    orders = component "Заказы" "Создаёт заказ." "Spring Bean" {
                        url "https://example.com/orders"
                    }
                    catalog = component "Каталог" "Отдаёт товары." "Spring Bean"
                }

                orders -> catalog "Запрашивает товар" "JSON"
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
            title "Компоненты"
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
                properties {
                    "region" "eu"
                }
                gateway = infrastructureNode "Шлюз" "Входной балансировщик." "Nginx"
                containerInstance web
                shopLive = softwareSystemInstance shop
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
            title "Развёртывание"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
        }
    }
}`,
};

const STRUCTURIZR_SAMPLES_EN: Record<StructurizrSampleId, string> = {
  context: `workspace "Online shop" "Buying products" {

    !identifiers hierarchical
    !impliedRelationships false
    !docs "https://example.com/docs"
    !adrs "https://example.com/adrs"

    model {
        properties {
            "owner" "shop"
        }

        group "People" {
            customer = person "Customer" "Places orders." {
                tags "External"
                url "https://example.com/customer"
                perspectives {
                    "role" "Customer"
                }
            }
        }
        shop = softwareSystem "Shop" "Takes and fulfills orders." {
            description "Primary system"
            technology "Code2Graph"
        }
        mail = softwareSystem "Mail" "Sends messages to the customer."

        customer -> shop "Places an order" "HTTPS"
        shop -> mail "Sends a message" "SMTP"
    }

    views {
        systemLandscape "Landscape" "All systems" {
            include *
            autolayout lr
            title "Landscape"
        }
        systemContext shop "Context" "Buying" {
            include *
            autolayout lr
            title "Context"
        }
        dynamic shop "Order" "Checkout" {
            customer -> shop "Places an order"
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
  containers: `workspace "Shop" "Containers of the online shop" {

    model {
        customer = person "Customer" "Buys products."
        shop = softwareSystem "Shop" "Online shop." {
            group "Channels" {
                web = container "Web application" "Customer interface." "React" {
                    url "https://example.com/web"
                }
            }
            api = container "API" "Orders and catalog." "Java" {
                properties {
                    "tier" "backend"
                }
            }
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
            title "Containers"
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
  components: `workspace "Shop" "API components" {

    model {
        shop = softwareSystem "Shop" "Online shop." {
            api = container "API" "Order service." "Java" {
                group "Services" {
                    orders = component "Orders" "Creates an order." "Spring Bean" {
                        url "https://example.com/orders"
                    }
                    catalog = component "Catalog" "Returns products." "Spring Bean"
                }

                orders -> catalog "Requests a product" "JSON"
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
            title "Components"
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
                properties {
                    "region" "eu"
                }
                gateway = infrastructureNode "Gateway" "Ingress load balancer." "Nginx"
                containerInstance web
                shopLive = softwareSystemInstance shop
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
            title "Deployment"
        }

        styles {
            element "Database" {
                shape Cylinder
            }
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
