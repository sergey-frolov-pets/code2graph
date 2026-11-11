[Types](./index.md) · [Shared rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# structurizr deployment

A deployment view places container instances on nodes.

```
workspace "Shop" "Deployment" {
    model {
        shop = softwareSystem "Shop" "Online shop." {
            api = container "API" "Orders." "Java"
        }
        live = deploymentEnvironment "Live" {
            node = deploymentNode "Server" "Host." "Linux" {
                instance = containerInstance api
            }
        }
    }
    views {
        deployment shop "Live" "Deployment" {
            include *
            autolayout lr
        }
    }
}
```
