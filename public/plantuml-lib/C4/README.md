# C4-PlantUML (local copy)

Version: v2.14.0 — https://github.com/plantuml-stdlib/C4-PlantUML

Usage in diagrams:

```plantuml
!include ./plantuml-lib/C4/C4_Container.puml
```

Files are patched for local `!include ./...` resolution (no network required).

Icon drawings used by C4 sprites are copied next to this library:

- `openiconic.js` — OpenIconic icons (`$sprite="&folder"`)
- `office/` — `!include <office/users/users>`
- `tupadr3/devicons/` and `tupadr3/font-awesome-5/` — icon sets from the C4 samples

`scripts/copy-c4-sprites.mjs` refreshes them from the PlantUML release that matches `@plantuml/core`.
