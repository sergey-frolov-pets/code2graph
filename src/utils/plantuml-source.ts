import type { LayoutEngine } from "@/constants";
import { resolvePlantUmlIncludes } from "@/utils/plantuml-include";
import {
  getPlantUmlStartMarker,
  usesStandalonePlantUmlStarter,
} from "@/utils/plantuml-syntax";

const PRAGMA_LAYOUT_PATTERN = /^\s*!pragma\s+layout\s+\S+/im;

/** Старый activity-синтаксис: #Color:действие; → :действие; <<#Color>> */
const DEPRECATED_ACTIVITY_COLOR_LINE_PATTERN =
  /^(\s*)#([A-Za-z][A-Za-z0-9]*):(.+;)\s*$/gm;

export function migrateDeprecatedActivityColorSyntax(source: string): string {
  return source.replace(
    DEPRECATED_ACTIVITY_COLOR_LINE_PATTERN,
    (_match, indent: string, color: string, action: string) =>
      `${indent}:${action} <<#${color}>>`,
  );
}

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

  if (usesStandalonePlantUmlStarter(trimmed)) {
    return trimmed;
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
  const migrated = migrateDeprecatedActivityColorSyntax(source);
  const withLayout = applyLayoutPragma(migrated, layout);
  return resolvePlantUmlIncludes(withLayout);
}

export function ensureDiagramWrapper(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) {
    return "@startuml\n@enduml";
  }

  if (getPlantUmlStartMarker(trimmed)) {
    return trimmed;
  }

  return `@startuml\n${trimmed}\n@enduml`;
}
