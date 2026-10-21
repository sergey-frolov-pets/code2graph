/**
 * Editor format ids. To add a language:
 * 1. Append its id here.
 * 2. Add a module in `src/languages/modules` and register it in `src/languages/registry.ts`.
 * 3. Add `samples.<id>.*` strings and any UI keys the module references.
 */
export const DIAGRAM_FORMATS = [
  "plantuml",
  "mermaid",
  "graphml",
  "wiremark",
  "d2",
] as const;

export type DiagramFormat = (typeof DIAGRAM_FORMATS)[number];

export function isDiagramFormat(value: string): value is DiagramFormat {
  return (DIAGRAM_FORMATS as readonly string[]).includes(value);
}
