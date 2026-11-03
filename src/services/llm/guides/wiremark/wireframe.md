# wiremark wireframe: instructions for LLM agents

You are writing a wiremark wireframe: an indented outline of component names that renders to a hand-drawn screen sketch. Emit the source only.

```wireframe
Wireframe #login mobile
  Stack column gap=2
    Typography h4 "Sign in"
    TextField "Email" type=email
    TextField "Password" type=password
    Button "Sign in" contained to=#dashboard
```

Rules:

- A line is `Component` plus optional keyless values and `key=value` pairs. Component names are PascalCase (`Stack`, `Card`, `TextField`, `Button`, `Typography`, `AppBar`, `List`, `ListItem`, `Chip`, `Icon`, `Control`, `Img`, `Box`, `Grid`, `Spacer`, `Anchor`, `Tab`, `Alert`, `Table`, `TableCell`).
- Do not invent component names. If you are unsure, use `Stack`, `Typography`, `Button`, `TextField`, or `Card`.
- Indentation is containment. Two spaces per level. Never use tabs.
- Only containers take children (`Stack`, `Card`, `Box`, `Grid`, `Wireframe`, `List`, `Table`). Children under a leaf (`Typography`, `Button`, `TextField`, `Chip`, `ListItem`) are dropped.
- Quoted text is drawn text and must be quoted: `TextField "Email"`. A bare word is a setting: `outlined`, `checked`, `gap=2`.
- Never quote a setting. `variant="outlined"` and `gap="2"` are errors.
- Keyless values may appear in any order: `TextField "Email" outlined` is the same as `TextField label="Email" variant=outlined`.
- Sizing on `Box`, `Stack`, `Grid`, `Spacer`, `Anchor`, `Card` is bare `width height` in that order: `240px`, `30%`, `*`, or a flex number. `Box 240px *` is a fixed-width, full-height rail. Do not write `width=`.
- Button variants are `text`, `outlined`, `contained`. Use `contained` for the primary action.
- Typography variants include `h4`, `body1`, `body2`. There is no `body`.
- A checkbox is `Control checkbox`. A switch is `Control switch`. Add `checked` when it is on.
- There is no `DialogTitle`, `IconButton`, `Menu`, `Container`, `Paper`, or `ListItemText`. Put the title in `Typography`, use a bare `Icon`, and quote the `ListItem` label.
- Frames: `Wireframe #id mobile` or `landscape` or `portrait`. Several frames may sit in one document.
- `to=#frame-id` makes an element a link to another frame. `visible=false` hides a shell frame. `background=#shell` paints that frame behind the current one.
- Comments are `//` to the end of the line.
- Out of scope: `style=`, `sx=`, colors, breakpoints, and x/y coordinates.
- Match the user's language in quoted UI copy.
