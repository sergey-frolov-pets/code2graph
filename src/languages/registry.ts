import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { d2LanguageModule } from "@/languages/modules/d2";
import { graphmlLanguageModule } from "@/languages/modules/graphml";
import { mermaidLanguageModule } from "@/languages/modules/mermaid";
import { plantumlLanguageModule } from "@/languages/modules/plantuml";
import { structurizrLanguageModule } from "@/languages/modules/structurizr";
import { wiremarkLanguageModule } from "@/languages/modules/wiremark";
import type { FormatHandler } from "@/formats/types";
import { withKeywordCompletions } from "@/languages/keyword-completion";
import type {
  DiagramFormatDefinition,
  DiagramLanguageModule,
} from "@/languages/types";

export const DIAGRAM_LANGUAGE_MODULES = [
  plantumlLanguageModule,
  mermaidLanguageModule,
  graphmlLanguageModule,
  wiremarkLanguageModule,
  d2LanguageModule,
  structurizrLanguageModule,
] as const satisfies readonly DiagramLanguageModule[];

const connectedHandlers = new Map<DiagramFormat, FormatHandler>();

// Wrap on first read. Handlers and the registry import each other through
// syntax helpers, so the raw handler binding can still be unset while this
// module is evaluating.
for (const languageModule of DIAGRAM_LANGUAGE_MODULES) {
  const readRawHandler = Object.getOwnPropertyDescriptor(
    languageModule,
    "handler",
  )?.get;

  Object.defineProperty(languageModule, "handler", {
    configurable: true,
    enumerable: true,
    get() {
      const cached = connectedHandlers.get(languageModule.id);
      if (cached) {
        return cached;
      }

      const rawHandler = readRawHandler?.call(languageModule) as
        | FormatHandler
        | undefined;
      if (!rawHandler) {
        throw new Error(
          `Diagram language "${languageModule.id}" has no format handler`,
        );
      }

      const connected = withKeywordCompletions(
        rawHandler,
        languageModule.keywords,
      );
      connectedHandlers.set(languageModule.id, connected);
      return connected;
    },
  });
}

const modulesById = Object.fromEntries(
  DIAGRAM_LANGUAGE_MODULES.map((module) => [module.id, module]),
) as Record<DiagramFormat, DiagramLanguageModule>;

export function getLanguageModule(format: DiagramFormat): DiagramLanguageModule {
  return modulesById[format];
}

export const DIAGRAM_FORMAT_DEFINITIONS = Object.fromEntries(
  DIAGRAM_LANGUAGE_MODULES.map((module) => [module.id, module.definition]),
) as Record<DiagramFormat, DiagramFormatDefinition>;

export function getDiagramFormatDefinition(
  format: DiagramFormat,
): DiagramFormatDefinition {
  return DIAGRAM_FORMAT_DEFINITIONS[format];
}

export const DIAGRAM_FILE_ACCEPT = DIAGRAM_LANGUAGE_MODULES.map(
  (module) => module.definition.accept,
).join(",");

const extensionOwners = DIAGRAM_LANGUAGE_MODULES.flatMap((module) =>
  module.definition.extensions.map((extension) => ({
    extension,
    id: module.id,
  })),
).sort((left, right) => right.extension.length - left.extension.length);

export function detectFormatFromFileName(fileName: string): DiagramFormat | null {
  const lowerName = fileName.toLowerCase();

  for (const owner of extensionOwners) {
    if (lowerName.endsWith(owner.extension)) {
      return owner.id;
    }
  }

  return null;
}

export function detectRegisteredDiagramSource(
  source: string,
): DiagramFormat | null {
  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  const ordered = [...DIAGRAM_LANGUAGE_MODULES].sort(
    (left, right) => right.detectPriority - left.detectPriority,
  );

  for (const module of ordered) {
    if (module.detectSource(trimmed)) {
      return module.id;
    }
  }

  return null;
}
