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

/** Activity-диаграммы не поддерживают direction; директива даёт Syntax Error */
const ACTIVITY_DIRECTION_LINE_PATTERN =
  /^\s*(?:top to bottom|left to right) direction\s*$/gim;

export function looksLikePlantUmlActivityDiagram(source: string): boolean {
  if (!/^\s*@startuml/im.test(source)) {
    return false;
  }

  if (/^\s*(class|interface|enum|actor|participant|state)\b/im.test(source)) {
    return false;
  }

  if (/^\s*\[\*\]/m.test(source)) {
    return false;
  }

  const hasStart = /^\s*start\s*$/im.test(source);
  const hasActivityAction = /^\s*:[^;]+;\s*$/m.test(source);
  const hasSwimlane = /^\s*\|[^|]+\|/m.test(source);

  return hasStart && (hasActivityAction || hasSwimlane);
}

export function stripUnsupportedActivityDirection(source: string): string {
  if (!looksLikePlantUmlActivityDiagram(source)) {
    return source;
  }

  return source.replace(ACTIVITY_DIRECTION_LINE_PATTERN, "");
}

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
  const withoutDirection = stripUnsupportedActivityDirection(migrated);
  const withLayout = applyLayoutPragma(withoutDirection, layout);
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
