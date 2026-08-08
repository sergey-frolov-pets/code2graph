# Refactoring checklist

Use this checklist after each refactoring phase or PR.

## Build & typecheck

- [ ] `npm run typecheck:all`
- [ ] `npm run test`
- [ ] `npm --prefix server run test`
- [ ] `npm run lint`
- [ ] `npm run check:i18n`
- [ ] `npm run build:release`

## E2E smoke

- [ ] `npm run test:e2e`

## Offline / single-file

- [ ] Open `release/vueplantuml.html` via `file://`
- [ ] Editor renders PlantUML preview
- [ ] Modals open and close (Escape, backdrop)
- [ ] Tooltips on long-press (mobile emulation)

## Library (if touched)

- [ ] Local library browse/upload
- [ ] Remote API health check in Settings
- [ ] Share link preview

## UI manual

- [ ] Light/dark: App, Settings, Library, Wizard
- [ ] Mobile portrait: editor/preview tabs, toolbar scroll
- [ ] Mobile landscape: toolbar does not cover editor
- [ ] Keyboard: Tab trapped in modal, Escape closes top modal
- [ ] Screen reader: modal title announced, close button labeled
- [ ] Long diagram (500+ lines): editor scroll remains smooth
- [ ] Library 100+ diagrams: list scroll acceptable

## Metrics (optional)

```bash
node scripts/refactor-metrics.mjs
```
