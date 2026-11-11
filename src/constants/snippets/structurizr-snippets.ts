import type { BuiltinSnippet } from "@/types/snippets";

export const STRUCTURIZR_BUILTIN_SNIPPETS: BuiltinSnippet[] = [
  {
    id: "structurizr-workspace-context",
    language: "structurizr",
    categoryId: "c4",
    titleKey: "snippets.builtin.structurizrWorkspaceContext",
    descriptionKey: "snippets.builtin.structurizrWorkspaceContextDesc",
    content: `workspace "System" "Architecture" {
    model {
        user = person "User" "Uses the platform."
        app = softwareSystem "Platform" "Core software system."
        user -> app "Uses" "HTTPS"
    }

    views {
        systemContext app "Context" {
            include *
            autolayout lr
        }
    }
}`,
  },
  {
    id: "structurizr-containers",
    language: "structurizr",
    categoryId: "c4",
    titleKey: "snippets.builtin.structurizrContainers",
    descriptionKey: "snippets.builtin.structurizrContainersDesc",
    content: `shop = softwareSystem "Shop" "Online store." {
    web = container "Web App" "Frontend SPA." "TypeScript"
    api = container "Backend API" "REST API." "Go"
    db = container "Database" "Primary store." "PostgreSQL" {
        tags "Database"
    }

    web -> api "Calls" "JSON/HTTPS"
    api -> db "Reads and writes" "SQL"
}`,
  },
  {
    id: "structurizr-components",
    language: "structurizr",
    categoryId: "components",
    titleKey: "snippets.builtin.structurizrComponents",
    descriptionKey: "snippets.builtin.structurizrComponentsDesc",
    content: `api = container "API" "Order service." "Java" {
    auth = component "Auth Controller" "Validates tokens." "Spring"
    orders = component "Order Service" "Processes orders." "Spring"
    auth -> orders "Delegates"
}`,
  },
  {
    id: "structurizr-deployment",
    language: "structurizr",
    categoryId: "architecture",
    titleKey: "snippets.builtin.structurizrDeployment",
    descriptionKey: "snippets.builtin.structurizrDeploymentDesc",
    content: `live = deploymentEnvironment "Production" {
    cluster = deploymentNode "Kubernetes" "Prod cluster" "K8s" {
        containerInstance api
    }
    dbServer = deploymentNode "DB Host" "Managed Postgres" "Cloud" {
        containerInstance db
    }
}`,
  },
  {
    id: "structurizr-dynamic-view",
    language: "structurizr",
    categoryId: "sequence",
    titleKey: "snippets.builtin.structurizrDynamicView",
    descriptionKey: "snippets.builtin.structurizrDynamicViewDesc",
    content: `dynamic shop "CheckoutFlow" "Order checkout" {
    user -> web "Submits cart"
    web -> api "POST /orders"
    api -> db "INSERT order"
    autolayout lr
}`,
  },
  {
    id: "structurizr-styles",
    language: "structurizr",
    categoryId: "styles",
    titleKey: "snippets.builtin.structurizrStyles",
    descriptionKey: "snippets.builtin.structurizrStylesDesc",
    content: `styles {
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
}`,
  },
];
