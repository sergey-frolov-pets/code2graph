[Types](./index.md) · [Shared rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# structurizr context

A context view shows people and software systems.

```
workspace "Shop" "Context" {
    model {
        customer = person "Customer" "Places orders."
        shop = softwareSystem "Shop" "Online shop."
        customer -> shop "Opens"
    }
    views {
        systemContext shop "Context" {
            include *
            autolayout lr
        }
    }
}
```
