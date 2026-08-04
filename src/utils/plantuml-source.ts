import type { LayoutEngine } from "@/constants";
import { resolvePlantUmlIncludes } from "@/utils/plantuml-include";

const PRAGMA_LAYOUT_PATTERN = /^\s*!pragma\s+layout\s+\S+/im;

export function splitSourceLines(source: string): string[] {
  return source.split(/\r\n|\r|\n/);
}

export function applyLayoutPragma(
  source: string,
  layout: LayoutEngine,
): string {
  const pragmaLine = `!pragma layout ${layout}`;
  const trimmed = source.trim();

  if (!trimmed) {
    return `@startuml\n${pragmaLine}\n@enduml`;
  }

  if (PRAGMA_LAYOUT_PATTERN.test(trimmed)) {
    return trimmed.replace(PRAGMA_LAYOUT_PATTERN, pragmaLine);
  }

  if (trimmed.startsWith("@startuml")) {
    return trimmed.replace("@startuml", `@startuml\n${pragmaLine}`);
  }

  return `@startuml\n${pragmaLine}\n\n${trimmed}\n@enduml`;
}

export async function preparePlantUmlSource(
  source: string,
  layout: LayoutEngine,
): Promise<string> {
  const withLayout = applyLayoutPragma(source, layout);
  return resolvePlantUmlIncludes(withLayout);
}

export function ensureDiagramWrapper(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) {
    return "@startuml\n@enduml";
  }

  if (trimmed.startsWith("@startuml")) {
    return trimmed;
  }

  return `@startuml\n${trimmed}\n@enduml`;
}
