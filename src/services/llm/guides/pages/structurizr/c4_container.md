[Types](./index.md) · [Shared rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# structurizr container

Containers live inside a software system.

```
workspace "Shop" "Containers" {
    model {
        shop = softwareSystem "Shop" "Online shop." {
            web = container "Web" "UI." "React"
            api = container "API" "Orders." "Java"
            web -> api "Calls"
        }
    }
    views {
        container shop "Containers" {
            include *
            autolayout lr
        }
    }
}
```
