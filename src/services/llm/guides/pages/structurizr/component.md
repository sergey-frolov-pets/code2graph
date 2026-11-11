[Types](./index.md) · [Shared rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# structurizr component

Components live inside a container.

```
workspace "Shop" "Components" {
    model {
        shop = softwareSystem "Shop" "Online shop." {
            api = container "API" "Orders." {
                orders = component "Orders" "Creates orders."
            }
        }
    }
    views {
        component api "Components" {
            include *
            autolayout lr
        }
    }
}
```
